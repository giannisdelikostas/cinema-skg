import { upcomingMovies } from '../data/upcomingMovies.js';
import { getFilmyList } from './filmy.js';
import { getPicks } from './hotStore.js';
import { posterUrl, resolveFilms } from './tmdb.js';

// Η λίστα του HOT ΠΡΟΣΕΧΩΣ για τη δημόσια σελίδα:
//  1) οι ταινίες του filmy.gr που έχεις επιλέξει στο /admin (η ημερομηνία έρχεται πάντα από το filmy)
//  2) + οι χειροκίνητες του data/upcomingMovies.js
// Ποτέ δεν "σπάει" τη σελίδα: αν κάτι αποτύχει, επιστρέφει όσα μπόρεσε.
export async function getHotMovies() {
  const manual = upcomingMovies.map((m) => ({ ...m, id: `manual-${m.id}`, source: 'manual' }));

  let picked = [];
  try {
    const picks = await getPicks();
    const keys = Object.keys(picks);
    if (keys.length) {
      const films = (await getFilmyList()).filter((f) => picks[f.key]);
      const overrides = Object.fromEntries(keys.filter((k) => picks[k].tmdbId).map((k) => [k, picks[k].tmdbId]));
      const tmdb = await resolveFilms(films, overrides);
      picked = films.map((f) => {
        const match = tmdb.get(f.key);
        return {
          id: `filmy-${f.key}`,
          source: 'filmy',
          title: f.greekTitle,
          originalTitle: f.originalTitle,
          date: f.date, // null = χωρίς ημερομηνία ακόμα
          tmdbId: match?.id ?? null,
          poster: posterUrl(match?.posterPath) || f.poster,
          trailerUrl: f.trailerUrl,
        };
      });
    }
  } catch (error) {
    console.error('HOT ΠΡΟΣΕΧΩΣ: αποτυχία filmy/επιλογών:', error.message);
  }

  // Αν μια ταινία υπάρχει και στις δύο λίστες (ίδιο TMDB id), κρατάμε την επιλογή από το filmy.
  const pickedIds = new Set(picked.map((m) => m.tmdbId).filter(Boolean));
  const merged = [...picked, ...manual.filter((m) => !m.tmdbId || !pickedIds.has(m.tmdbId))];

  // Ταξινόμηση κατά ημερομηνία· όσες δεν έχουν ημερομηνία στο τέλος.
  return merged.sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999') || a.title.localeCompare(b.title, 'el'));
}
