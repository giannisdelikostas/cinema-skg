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

  $('table tbody tr').each((_, tr) => {
    const tds = $(tr).children('td');
    const first = tds.first();

    // Γραμμή ημερομηνίας
    if (first.attr('colspan')) {
      dateLabel = first.text().trim();
      date = parseFilmyDate(dateLabel);
      return;
    }
    if (tds.length < 2 || !dateLabel) return;

    const cell = $(tds[1]);
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
    const year = Number($(tds[3]).text().trim()) || null;

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
      director: $(tds[2]).text().replace(/\s+/g, ' ').trim() || null,
      poster: $(tds[0]).find('img').attr('src') || null,
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
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CinemaSKG/1.0; +https://cinema-skg.vercel.app)' },
  });
  if (!res.ok) throw new Error(`filmy.gr HTTP ${res.status}`);
  return parseFilmyPage(await res.text());
}
