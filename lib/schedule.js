import * as cheerio from 'cheerio';
import { CINEMAS } from './cinemas.js';
import { dayLabelToIso, normalizeTime, timeSortKey, todayInAthens } from './dates.js';
import { getFilmfestivalMovies } from './filmfestival.js';
import { attachTmdb } from './tmdb.js';

// Πόσο συχνά ξαναδιαβάζουμε το πρόγραμμα από την πηγή (δευτερόλεπτα).
export const SCHEDULE_REVALIDATE = 3600;

// Μόνο αν ο τίτλος είναι ΟΛΟΣ κεφαλαίος τον κάνουμε "Title Case".
// Οι τίτλοι της πηγής είναι συνήθως ήδη σωστοί και δεν τους αγγίζουμε.
function tidyTitle(raw) {
  const title = raw.replace(/\s+/g, ' ').trim();
  if (title !== title.toUpperCase()) return title;
  return title
    .toLowerCase()
    .replace(/(^|[\s(])(\p{L})/gu, (_, before, letter) => before + letter.toUpperCase());
}

// Διαβάζει τη σελίδα ενός κινηματογράφου και επιστρέφει τις ταινίες του.
// Κάθε ταινία έχει showtimes: { "2026-11-12": [{ time: "17:30", hall: "Αίθουσα 1" }, ...] }
export function parseCinemaPage(html, cinema, todayIso = todayInAthens()) {
  const $ = cheerio.load(html);
  const movies = [];

  $('article').each((_, article) => {
    const rawTitle = $(article).find('h3[itemprop="name"] a').first().text();
    if (!rawTitle.trim()) return;
    const title = tidyTitle(rawTitle);

    const img = $(article).find('img.wp-post-image').first();
    let image = img.attr('data-lazy-src') || img.attr('src') || $(article).find('img').first().attr('src') || null;
    // Η πηγή δίνει μικρό thumbnail (π.χ. -120x180.jpg). Ζητάμε την κανονική εικόνα.
    if (image) image = image.replace(/-\d+x\d+\.(jpe?g|png|webp)$/i, '.$1');

    const showtimes = {};

    // Μια ταινία μπορεί να έχει πολλούς πίνακες (έναν ανά αίθουσα). Τους διαβάζουμε όλους.
    $(article).find('table.python-table').each((_, table) => {
      const hall = $(table).find('td[colspan]').first().text().trim() || null;
      const days = $(table).find('tr.fw-700 td').map((_, td) => $(td).text().trim()).get();
      const timesRow = $(table).find('tr').last();

      timesRow.find('td').each((idx, td) => {
        const iso = days[idx] ? dayLabelToIso(days[idx], todayIso) : null;
        if (!iso) return;
        // Κάθε κελί έχει μία γραμμή ανά "slot" ("–" όταν δεν υπάρχει προβολή).
        // Κρατάμε ΟΛΕΣ τις ώρες, όχι μόνο την πρώτη.
        const text = ($(td).html() || '').replace(/<[^>]+>/g, '\n');
        const times = (text.match(/\d{1,2}[:.]\d{2}/g) || []).map(normalizeTime).filter(Boolean);
        for (const time of times) {
          (showtimes[iso] ||= []).push({ time, hall });
        }
      });
    });

    for (const iso of Object.keys(showtimes)) {
      showtimes[iso].sort((a, b) => timeSortKey(a.time) - timeSortKey(b.time));
    }
    if (Object.keys(showtimes).length === 0) return;

    movies.push({
      id: `${cinema.id}:${title}`,
      cinemaId: cinema.id,
      cinema: cinema.name,
      ticketsUrl: cinema.tickets,
      title,
      image,
      youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} trailer ελληνικα`)}`,
      showtimes,
    });
  });

  return movies;
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    next: { revalidate: SCHEDULE_REVALIDATE },
    signal: AbortSignal.timeout(15000),
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CinemaSKG/1.0; +https://cinema-skg.vercel.app)' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function fetchCinema(cinema, todayIso) {
  try {
    const movies =
      cinema.type === 'filmfestival'
        ? await getFilmfestivalMovies(cinema, todayIso, fetchHtml)
        : parseCinemaPage(await fetchHtml(cinema.source), cinema, todayIso);
    return { ok: true, movies };
  } catch (error) {
    console.error(`Αποτυχία για ${cinema.id}:`, error.message);
    return { ok: false, movies: [] };
  }
}

// Όλο το πρόγραμμα: ταινίες + λίστα ημερών. Οι 8 σελίδες διαβάζονται παράλληλα.
export async function getSchedule() {
  const todayIso = todayInAthens();
  const results = await Promise.all(CINEMAS.map((c) => fetchCinema(c, todayIso)));
  // Αφίσες υψηλής ανάλυσης από το TMDB (οι αφίσες των πηγών είναι μικρές).
  const movies = await attachTmdb(results.flatMap((r) => r.movies));

  // Αν ΟΛΕΣ οι σελίδες απέτυχαν (π.χ. η πηγή είναι down), ρίχνουμε error ώστε η Vercel
  // να συνεχίσει να σερβίρει το προηγούμενο καλό πρόγραμμα αντί για άδεια σελίδα.
  // Στο build δεν το κάνουμε, για να μη σπάει το deploy.
  if (results.every((r) => !r.ok) && process.env.NEXT_PHASE !== 'phase-production-build') {
    throw new Error('Δεν ήταν δυνατή η ανάγνωση κανενός κινηματογράφου');
  }

  const days = [...new Set(movies.flatMap((m) => Object.keys(m.showtimes)))].sort();

  return { movies, days, todayIso, updatedAt: new Date().toISOString() };
}
