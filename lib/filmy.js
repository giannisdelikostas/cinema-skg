import * as cheerio from 'cheerio';

// Η λίστα "Προσεχώς στις Αίθουσες" του filmy.gr.
// Η σελίδα είναι ένας πίνακας: γραμμές-ημερομηνίες ("19 ΝΟΕΜΒΡΙΟΥ 2026", "ΧΩΡΙΣ ΗΜΕΡΟΜΗΝΙΑ")
// και από κάτω οι ταινίες τους (αφίσα | "Ελληνικός | Original" | σκηνοθέτης | έτος).

export const FILMY_URL = 'https://www.filmy.gr/to-be-released-in-greece/';
const REVALIDATE = 6 * 60 * 60; // ξαναδιαβάζεται κάθε 6 ώρες

const MONTHS = { ΙΑΝ: 1, ΦΕΒ: 2, ΜΑΡ: 3, ΑΠΡ: 4, ΜΑΙ: 5, ΙΟΥΝ: 6, ΙΟΥΛ: 7, ΑΥΓ: 8, ΣΕΠ: 9, ΟΚΤ: 10, ΝΟΕ: 11, ΔΕΚ: 12 };
const plain = (s) => String(s).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

// "19 ΝΟΕΜΒΡΙΟΥ 2026" -> "2026-11-19", "ΧΩΡΙΣ ΗΜΕΡΟΜΗΝΙΑ" -> null
export function parseFilmyDate(text) {
  const m = plain(text).match(/(\d{1,2})\s+([Α-Ω]+)\s+(\d{4})/);
  if (!m) return null;
  const month = MONTHS[m[2].slice(0, 4)] ?? MONTHS[m[2].slice(0, 3)];
  if (!month) return null;
  return `${m[3]}-${String(month).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

const slugify = (s) =>
  plain(s)
    .toLowerCase()
    .replace(/[^a-z0-9α-ω]+/g, '-')
    .replace(/^-|-$/g, '');

export function parseFilmyPage(html) {
  const $ = cheerio.load(html);
  const films = [];
  const seen = new Set();
  let date = null;
  let dateLabel = null;

  // Το περιεχόμενο ενός κελιού. Αν είναι άδειο αλλά έχει data-original-value (το γεμίζει JavaScript
  // στον browser), διαβάζουμε από εκεί.
  const cellOf = (td) => {
    const el = $(td);
    if (el.text().trim() || el.find('img').length) return el;
    const original = el.attr('data-original-value');
    return original ? $('<div></div>').append(original) : el;
  };

  // Χωρίς "tbody": λειτουργεί και με το HTML όπως το στέλνει ο server (χωρίς JavaScript).
  $('table tr').each((_, tr) => {
    const tds = $(tr).children('td').toArray().map(cellOf);
    if (tds.length === 0) return; // γραμμή επικεφαλίδας (th)
    const first = tds[0];
    const hasImage = $(tr).find('img').length > 0 || tds.some((c) => c.find('img').length > 0);
    const firstText = plain(first.text());

    // Γραμμή ημερομηνίας: αναγνωρίζεται από το κείμενο ("19 ΝΟΕΜΒΡΙΟΥ 2026" / "ΧΩΡΙΣ ΗΜΕΡΟΜΗΝΙΑ"),
    // όχι από το colspan, που το προσθέτει JavaScript μόνο στον browser.
    if (!hasImage && (/^\d{1,2}\s+[Α-Ω]+\s+\d{4}$/.test(firstText) || /ΗΜΕΡΟΜΗΝΙΑ/.test(firstText))) {
      dateLabel = first.text().trim();
      date = parseFilmyDate(dateLabel);
      return;
    }
    if (tds.length < 2 || !dateLabel) return;

    const cell = tds[1];
    const links = cell.find('a').toArray().map((a) => ({ href: $(a).attr('href') || '', text: $(a).text().trim() }));
    const filmyUrl = links.find((l) => l.href.includes('filmy.gr/movies-database/'))?.href || null;
    const trailerUrl = links.find((l) => /youtube\.com|youtu\.be/.test(l.href))?.href || null;

    // Ο τίτλος: όλο το κείμενο του κελιού χωρίς το "Trailer |►"
    const cellCopy = cell.clone();
    cellCopy.find('a').each((_, a) => {
      if (/trailer/i.test($(a).text())) $(a).remove();
    });
    const fullTitle = cellCopy.text().replace(/\s+/g, ' ').trim();
    if (!fullTitle) return;
    const [greekTitle, ...rest] = fullTitle.split(/\s*\|\s*/);
    const originalTitle = rest.join(' | ').trim() || greekTitle;
    const year = Number(tds[3]?.text().trim()) || null;

    // Σταθερό κλειδί: δεν αλλάζει αν αλλάξει η ημερομηνία κυκλοφορίας
    const key = filmyUrl ? filmyUrl.replace(/\/$/, '').split('/').pop() : `${slugify(originalTitle)}-${year ?? ''}`;
    if (seen.has(key)) return;
    seen.add(key);

    films.push({
      key,
      greekTitle: greekTitle.trim(),
      originalTitle,
      year,
      date, // null = "ΧΩΡΙΣ ΗΜΕΡΟΜΗΝΙΑ"
      dateLabel,
      director: tds[2]?.text().replace(/\s+/g, ' ').trim() || null,
      poster: tds[0].find('img').attr('src') || $(tr).find('img').first().attr('src') || null,
      filmyUrl,
      trailerUrl,
    });
  });

  return films;
}

export async function getFilmyList() {
  const res = await fetch(FILMY_URL, {
    next: { revalidate: REVALIDATE },
    signal: AbortSignal.timeout(15000),
    // Σαν κανονικός browser, για να πάρουμε την ίδια σελίδα που βλέπει ένας επισκέπτης.
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'el-GR,el;q=0.9,en;q=0.8',
    },
  });
  if (!res.ok) throw new Error(`filmy.gr HTTP ${res.status}`);
  const html = await res.text();
  const films = parseFilmyPage(html);

  // Αν δεν βρεθεί καμία ταινία, λέμε τι ήρθε (για να φαίνεται στο /admin αντί για άδεια λίστα).
  if (films.length === 0) {
    const title = (html.match(/<title[^>]*>([^<]*)/i)?.[1] || '').trim().slice(0, 80);
    const tables = (html.match(/<table/gi) || []).length;
    const rows = (html.match(/<tr[\s>]/gi) || []).length;
    throw new Error(`διαβάστηκε η σελίδα αλλά δεν βρέθηκαν ταινίες (${Math.round(html.length / 1024)} KB, τίτλος: "${title}", πίνακες: ${tables}, γραμμές: ${rows})`);
  }
  return films;
}
