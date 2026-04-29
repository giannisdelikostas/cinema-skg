import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  let originalTitle = searchParams.get('title');

  if (!originalTitle) {
    return NextResponse.json({ error: 'No title provided' }, { status: 400 });
  }

  // 1. ΠΟΛΥ ΚΑΛΟΣ ΚΑΘΑΡΙΣΜΟΣ
  // Βγάζουμε παρενθέσεις, παύλες και λέξεις κλειδιά που μπερδεύουν το TMDB
  let cleanTitle = originalTitle
    .split('(')[0]
    .split('-')[0]
    .replace(/GR/gi, '')
    .replace(/SUB/gi, '')
    .replace(/ μεταγλ\./gi, '')
    .trim();

  const API_KEY = '9cc00684d688a9c71e678438c5ec854f'; 

  try {
    // Δοκιμή 1: Αναζήτηση με τον καθαρό τίτλο
    let searchRes = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(cleanTitle)}&include_adult=false&language=el-GR`);
    let searchData = await searchRes.json();
    
    // Δοκιμή 2: Αν δεν βρει στα Ελληνικά, ψάξε γενικά (χωρίς language constraint)
    if (!searchData.results || searchData.results.length === 0) {
        searchRes = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(cleanTitle)}&include_adult=false`);
        searchData = await searchRes.json();
    }

    // Δοκιμή 3: Fallback στις πρώτες 2 λέξεις (πολύ αποτελεσματικό για μεγάλους τίτλους)
    if (!searchData.results || searchData.results.length === 0) {
        const shorterTitle = cleanTitle.split(' ').slice(0, 2).join(' ');
        searchRes = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(shorterTitle)}&include_adult=false`);
        searchData = await searchRes.json();
    }

    if (!searchData.results || searchData.results.length === 0) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    const movie = searchData.results[0];

    // Φέρνουμε λεπτομέρειες (Credits + Details)
    const detailsRes = await fetch(`https://api.themoviedb.org/3/movie/${movie.id}?api_key=${API_KEY}&language=el-GR&append_to_response=credits`);
    let detailsData = await detailsRes.json();

    // Αν η περίληψη είναι άδεια στα Ελληνικά, φέρε τα Αγγλικά
    if (!detailsData.overview || detailsData.overview.length < 10) {
      const engRes = await fetch(`https://api.themoviedb.org/3/movie/${movie.id}?api_key=${API_KEY}&language=en-US`);
      const engData = await engRes.json();
      detailsData.overview = engData.overview || "Δεν βρέθηκε περίληψη.";
    }

    return NextResponse.json({
      title: detailsData.title || cleanTitle,
      overview: detailsData.overview,
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