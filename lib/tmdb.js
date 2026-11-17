import { TMDB_OVERRIDES } from './tmdbOverrides.js';

// Κοινές συναρτήσεις για το TMDB (χρησιμοποιούνται από το /api/tmdb και από το πρόγραμμα).
// Το κλειδί ορίζεται ως Environment Variable TMDB_API_KEY (Vercel → Settings → Environment Variables).

const TMDB = 'https://api.themoviedb.org/3';
export const ONE_DAY = 60 * 60 * 24;
export const tmdbConfigured = () => Boolean(process.env.TMDB_API_KEY);

export const posterUrl = (path, size = 'w500') => (path ? `https://image.tmdb.org/t/p/${size}${path}` : null);

export async function tmdb(path, params = {}) {
  const query = new URLSearchParams({ api_key: process.env.TMDB_API_KEY, ...params });
  const res = await fetch(`${TMDB}${path}?${query}`, {
    next: { revalidate: ONE_DAY },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

const plain = (s) => String(s).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const OVERRIDES = new Map(Object.entries(TMDB_OVERRIDES).map(([title, id]) => [plain(title), id]));

// Καθαρίζει έναν τίτλο για αναζήτηση, χωρίς να "κόβει" γράμματα μέσα σε λέξεις.
function cleanPart(text) {
  return text
    .replace(/\b(GR|SUB|ENG)\b/gi, '')
    .replace(/(^|\s)(μεταγλ|μεταγλωττισμένη|υποτ|υποτιτλισμένη)\.?(?=\s|$)/giu, ' ')
    .split(/\s[-–—/|]\s/)[0] // μόνο διαχωριστικό με κενά γύρω του, όχι ενωτικό μέσα σε λέξη
    .replace(/\s+/g, ' ')
    .trim();
}

// Οι τίτλοι είναι συνήθως "Ελληνικός (Original)". Ψάχνουμε πρώτα τον πρωτότυπο τίτλο.
export function searchCandidates(title) {
  const candidates = [];
  const paren = title.match(/\(([^)]+)\)\s*$/);
  if (paren) candidates.push(cleanPart(paren[1]));
  candidates.push(cleanPart(title.replace(/\([^)]*\)/g, ' ')));
  return [...new Set(candidates.filter((c) => c.length > 1))];
}

// Βρίσκει την ταινία στο TMDB: πρώτα οι χειροκίνητες διορθώσεις, μετά αναζήτηση.
// Επιστρέφει { id, posterPath } ή null.
export async function findMovie(title) {
  const override = OVERRIDES.get(plain(title));
  if (override) {
    const details = await tmdb(`/movie/${override}`, { language: 'el-GR' });
    return { id: override, posterPath: details.poster_path || null };
  }
  for (const query of searchCandidates(title)) {
    const data = await tmdb('/search/movie', { query, include_adult: 'false', language: 'el-GR' });
    const first = data.results?.[0];
    if (first) return { id: first.id, posterPath: first.poster_path || null };
  }
  return null;
}

// Προσθέτει σε κάθε ταινία του προγράμματος tmdbId και αφίσα TMDB (αν βρεθεί).
// Κάθε τίτλος ψάχνεται μία φορά και το αποτέλεσμα κρατιέται για 1 μέρα.
export async function attachTmdb(movies) {
  if (!tmdbConfigured()) return movies;
  const titles = [...new Set(movies.map((m) => m.title))];
  const found = new Map(
    await Promise.all(
      titles.map(async (title) => {
        try {
          return [title, await findMovie(title)];
        } catch (error) {
          console.error(`TMDB: αποτυχία για "${title}":`, error.message);
          return [title, null];
        }
      })
    )
  );
  return movies.map((m) => {
    const hit = found.get(m.title);
    if (!hit) return m;
    return { ...m, tmdbId: hit.id, poster: posterUrl(hit.posterPath), posterThumb: posterUrl(hit.posterPath, 'w185') };
  });
}
