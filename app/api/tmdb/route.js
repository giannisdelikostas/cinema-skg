import { NextResponse } from 'next/server';

// Το κλειδί ΔΕΝ μπαίνει πια στον κώδικα. Ορίζεται ως Environment Variable στη Vercel
// (Settings → Environment Variables → TMDB_API_KEY) και σε αρχείο .env.local για τοπικά.
const API_KEY = process.env.TMDB_API_KEY;
const TMDB = 'https://api.themoviedb.org/3';
const ONE_DAY = 60 * 60 * 24;

async function tmdb(path, params) {
  const query = new URLSearchParams({ api_key: API_KEY, ...params });
  const res = await fetch(`${TMDB}${path}?${query}`, { next: { revalidate: ONE_DAY } });
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

// Καθαρίζει έναν τίτλο για αναζήτηση, χωρίς να "κόβει" γράμματα μέσα σε λέξεις
// (το παλιό /GR/gi έκανε το "Grease" σε "ease" και το split('-') το "Spider-Man" σε "Spider").
function cleanPart(text) {
  return text
    .replace(/\b(GR|SUB|ENG)\b/gi, '')
    .replace(/(^|\s)(μεταγλ|μεταγλωττισμένη|υποτ|υποτιτλισμένη)\.?(?=\s|$)/giu, ' ')
    .split(/\s[-–—/|]\s/)[0] // μόνο διαχωριστικό με κενά γύρω του, όχι ενωτικό μέσα σε λέξη
    .replace(/\s+/g, ' ')
    .trim();
}

// Οι τίτλοι της πηγής είναι συνήθως "Ελληνικός (Original)". Ψάχνουμε πρώτα τον
// πρωτότυπο τίτλο (πιο αξιόπιστο στο TMDB) και μετά τον ελληνικό.
function searchCandidates(title) {
  const candidates = [];
  const paren = title.match(/\(([^)]+)\)\s*$/);
  if (paren) candidates.push(cleanPart(paren[1]));
  candidates.push(cleanPart(title.replace(/\([^)]*\)/g, ' ')));
  return [...new Set(candidates.filter((c) => c.length > 1))];
}

async function findMovieId(title) {
  for (const query of searchCandidates(title)) {
    const data = await tmdb('/search/movie', { query, include_adult: 'false', language: 'el-GR' });
    if (data.results?.length) return data.results[0].id;
  }
  return null;
}

export async function GET(request) {
  if (!API_KEY) {
    console.error('Λείπει το TMDB_API_KEY από τα Environment Variables');
    return NextResponse.json({ error: 'TMDB not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title');
  const id = searchParams.get('id');

  try {
    const movieId = id || (title ? await findMovieId(title) : null);
    if (!movieId) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    const details = await tmdb(`/movie/${movieId}`, { language: 'el-GR', append_to_response: 'credits' });

    // Αν λείπει η ελληνική περίληψη (συχνό σε νέες ταινίες), παίρνουμε την αγγλική.
    let overview = details.overview;
    if (!overview || overview.length < 10) {
      const en = await tmdb(`/movie/${movieId}`, { language: 'en-US' });
      overview = en.overview && en.overview.length > 10
        ? en.overview
        : 'Δεν βρέθηκε διαθέσιμη περίληψη στα Ελληνικά ή Αγγλικά.';
    }

    return NextResponse.json(
      {
        title: details.title,
        overview,
        rating: details.vote_average ? details.vote_average.toFixed(1) : '-',
        year: details.release_date ? details.release_date.split('-')[0] : '-',
        runtime: details.runtime || '-',
        genres: details.genres?.map((g) => g.name).join(', ') || '-',
        cast: details.credits?.cast?.slice(0, 4).map((c) => c.name).join(', ') || '-',
        poster: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : null,
      },
      // Η Vercel κρατάει την απάντηση για 1 μέρα, οπότε κάθε ταινία ζητιέται από το TMDB σπάνια.
      { headers: { 'Cache-Control': `public, s-maxage=${ONE_DAY}, stale-while-revalidate=${ONE_DAY}` } }
    );
  } catch (error) {
    console.error('TMDB API Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
