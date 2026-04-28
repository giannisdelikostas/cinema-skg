import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title');

  if (!title) return NextResponse.json({ error: 'No title provided' }, { status: 400 });

  // Το API Key σου
  const API_KEY = '9cc00684d688a9c71e678438c5ec854f'; 

  try {
    // 1. Ψάχνουμε την ταινία
    const searchRes = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(title)}&language=el-GR`);
    const searchData = await searchRes.json();
    
    if (!searchData.results || searchData.results.length === 0) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    const movie = searchData.results[0]; // Παίρνουμε το καλύτερο αποτέλεσμα

    // 2. Ζητάμε έξτρα λεπτομέρειες (διάρκεια, είδη, ηθοποιούς)
    const detailsRes = await fetch(`https://api.themoviedb.org/3/movie/${movie.id}?api_key=${API_KEY}&language=el-GR&append_to_response=credits`);
    const detailsData = await detailsRes.json();

    // 3. Στέλνουμε πίσω ακριβώς ό,τι χρειαζόμαστε!
    return NextResponse.json({
      overview: detailsData.overview || "Δεν βρέθηκε περίληψη στα Ελληνικά.",
      rating: detailsData.vote_average ? detailsData.vote_average.toFixed(1) : "-",
      year: detailsData.release_date ? detailsData.release_date.split('-')[0] : "-",
      runtime: detailsData.runtime || "-",
      genres: detailsData.genres?.map(g => g.name).join(', ') || "-",
      cast: detailsData.credits?.cast?.slice(0, 4).map(c => c.name).join(', ') || "-",
      poster: detailsData.poster_path ? `https://image.tmdb.org/t/p/w500${detailsData.poster_path}` : null
    });
    
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}