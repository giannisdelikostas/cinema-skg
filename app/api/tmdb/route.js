import { NextResponse } from 'next/server';

import { ONE_DAY, findMovie, posterUrl, tmdb, tmdbConfigured } from '@/lib/tmdb';

// Το κλειδί ΔΕΝ μπαίνει στον κώδικα: Environment Variable TMDB_API_KEY στη Vercel και .env.local τοπικά.
// Η αναζήτηση και οι χειροκίνητες διορθώσεις (lib/tmdbOverrides.js) είναι στο lib/tmdb.js.

export async function GET(request) {
  if (!tmdbConfigured()) {
    console.error('Λείπει το TMDB_API_KEY από τα Environment Variables');
    return NextResponse.json({ error: 'TMDB not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title');
  const id = searchParams.get('id');

  try {
    const movieId = id || (title ? (await findMovie(title))?.id : null);
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
        poster: posterUrl(details.poster_path, 'w500'),
        // Μεγαλύτερη έκδοση για το παράθυρο πληροφοριών (καθαρή και σε οθόνες κινητών υψηλής ανάλυσης).
        posterHd: posterUrl(details.poster_path, 'w780'),
      },
      // Η Vercel κρατάει την απάντηση για 1 μέρα, οπότε κάθε ταινία ζητιέται από το TMDB σπάνια.
      { headers: { 'Cache-Control': `public, s-maxage=${ONE_DAY}, stale-while-revalidate=${ONE_DAY}` } }
    );
  } catch (error) {
    console.error('TMDB API Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
