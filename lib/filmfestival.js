import * as cheerio from 'cheerio';
import { dayLabelToIso, normalizeTime, timeSortKey } from './dates.js';

// Πρόγραμμα του Ολύμπιον από το επίσημο site του Φεστιβάλ Κινηματογράφου (filmfestival.gr).
// Η σελίδα "Πρόγραμμα" φορτώνει με JavaScript, αλλά η λίστα ταινιών και η σελίδα κάθε ταινίας
// έχουν τις προβολές μέσα στο HTML. Άρα: 1) διαβάζουμε τη λίστα, 2) κάθε ταινία παράλληλα.

const BASE = 'https://filmfestival.gr';
export const FILMFESTIVAL_LIST_URL = `${BASE}/el/whats-on/`;

// Οι αίθουσες του κτιρίου Ολύμπιον (πλ. Αριστοτέλους). Οι υπόλοιπες αίθουσες του
// Φεστιβάλ (π.χ. στο λιμάνι) αγνοούνται.
const OLYMPION_VENUES = ['ΟΛΥΜΠΙΟΝ', 'ΠΑΥΛΟΣ ΖΑΝΝΑΣ'];

const MONTHS = { ΙΑΝ: 1, ΦΕΒ: 2, ΜΑΡ: 3, ΑΠΡ: 4, ΜΑΙ: 5, ΙΟΥΝ: 6, ΙΟΥΛ: 7, ΑΥΓ: 8, ΣΕΠ: 9, ΟΚΤ: 10, ΝΟΕ: 11, ΔΕΚ: 12 };

const plain = (s) => String(s).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

// Λίστα ταινιών -> URLs των σελίδων τους
export function parseFilmList(html) {
  const $ = cheerio.load(html);
  const urls = new Set();
  $('a[href*="/films/"]').each((_, a) => {
    const href = $(a).attr('href');
    if (!href) return;
    const url = new URL(href, BASE);
    if (/^\/el\/films\/[^/]+\/$/.test(url.pathname)) urls.add(`${BASE}${url.pathname}`);
  });
  return [...urls];
}

// "ΠΕΜ 19 ΝΟΕ, 19:15" -> { iso: "2026-11-19", time: "19:15" }
export function parseScreeningLabel(label, todayIso) {
  const match = plain(label).match(/(\d{1,2})\s+([Α-Ω]+)[^\d]*(\d{1,2}[:.]\d{2})/);
  if (!match) return null;
  const month = MONTHS[match[2]] ?? MONTHS[match[2].slice(0, 3)];
  if (!month) return null;
  const iso = dayLabelToIso(`${match[1]}/${month}`, todayIso);
  const time = normalizeTime(match[3]);
  return iso && time ? { iso, time } : null;
}

// Η σελίδα έχει και φαρδύ banner και αφίσα. Κρατάμε μόνο τις "όρθιες" εικόνες (ύψος > πλάτος)
// και διαλέγουμε τη μεγαλύτερη (π.χ. fill-340x510 αντί για fill-136x204).
function pickPoster($) {
  const candidates = [];
  $('main picture').find('img, source').each((_, el) => {
    const attrs = [$(el).attr('src'), $(el).attr('srcset'), $(el).attr('data-src'), $(el).attr('data-srcset')];
    for (const value of attrs.filter(Boolean)) {
      for (const part of value.split(',')) {
        const url = part.trim().split(/\s+/)[0];
        if (!url || /blur/.test(url)) continue;
        const size = url.match(/fill-(\d+)x(\d+)/);
        if (!size || Number(size[2]) <= Number(size[1])) continue;
        candidates.push({ url: new URL(url, BASE).href, width: Number(size[1]), jpg: /\.jpe?g$/i.test(url) });
      }
    }
  });
  candidates.sort((a, b) => b.width - a.width || Number(b.jpg) - Number(a.jpg));
  return candidates[0]?.url || $('meta[property="og:image"]').attr('content') || null;
}

// Σελίδα ταινίας -> ταινία με προβολές μόνο στο Ολύμπιον (ή null αν δεν παίζεται εκεί)
export function parseFilmPage(html, cinema, todayIso, pageUrl = '') {
  const $ = cheerio.load(html);

  const title =
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('title').text().replace(/-\s*Thessaloniki Film Festival\s*$/i, '').trim() ||
    $('main img[alt]').first().attr('alt')?.trim();
  if (!title) return null;

  const showtimes = {};
  const seen = new Set();
  // Οι προβολές υπάρχουν δύο φορές στη σελίδα (desktop + mobile), οπότε κρατάμε μοναδικές.
  $('main li').each((_, li) => {
    const venue = $(li).find('a').first().text().replace(/\s+/g, ' ').trim();
    if (!venue || !OLYMPION_VENUES.includes(plain(venue))) return;
    const parsed = parseScreeningLabel($(li).find('span').first().text(), todayIso);
    if (!parsed) return;
    const key = `${parsed.iso} ${parsed.time} ${venue}`;
    if (seen.has(key)) return;
    seen.add(key);
    (showtimes[parsed.iso] ||= []).push({ time: parsed.time, hall: venue });
  });
  if (Object.keys(showtimes).length === 0) return null;
  for (const iso of Object.keys(showtimes)) {
    showtimes[iso].sort((a, b) => timeSortKey(a.time) - timeSortKey(b.time));
  }

  const tickets = $('main a[href*="more.com"]').first().attr('href') || cinema.tickets;

  return {
    id: `${cinema.id}:${title}`,
    cinemaId: cinema.id,
    cinema: cinema.name,
    ticketsUrl: tickets,
    infoUrl: pageUrl || null,
    title,
    image: pickPoster($),
    youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} trailer ελληνικα`)}`,
    showtimes,
  };
}

// Όλο το πρόγραμμα του Ολύμπιον. fetchHtml(url) επιστρέφει το HTML (ή πετάει error).
export async function getFilmfestivalMovies(cinema, todayIso, fetchHtml) {
  const filmUrls = parseFilmList(await fetchHtml(FILMFESTIVAL_LIST_URL));
  const pages = await Promise.all(
    filmUrls.map(async (url) => {
      try {
        return parseFilmPage(await fetchHtml(url), cinema, todayIso, url);
      } catch (error) {
        console.error(`Αποτυχία για ταινία ${url}:`, error.message);
        return null;
      }
    })
  );
  return pages.filter(Boolean);
}
