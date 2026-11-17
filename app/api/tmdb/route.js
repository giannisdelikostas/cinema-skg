import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title');
  const id = searchParams.get('id');
  const API_KEY = '9cc00684d688a9c71e678438c5ec854f';

  try {
    let movieId = id;

    // 1. Αν δεν έχουμε ID, ψάχνουμε με βάση τον τίτλο
    if (!movieId && title) {
      // Κρατάμε το δικό σου logic για καθαρισμό τίτλου από GR, SUB, κτλ.
      let cleanTitle = title
        .split('(')[0]
        .split('-')[0]
        .replace(/GR/gi, '')
        .replace(/SUB/gi, '')
        .replace(/ μεταγλ\./gi, '')
        .trim();

      const searchRes = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(cleanTitle)}&include_adult=false&language=el-GR`
      );
      const searchData = await searchRes.json();
      
      if (searchData.results && searchData.results.length > 0) {
        movieId = searchData.results[0].id;
      }
    }

    if (!movieId) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    // 2. Φέρνουμε τις λεπτομέρειες στα Ελληνικά (primary language)
    const detailsRes = await fetch(
      `https://api.themoviedb.org/3/movie/${movieId}?api_key=${API_KEY}&language=el-GR&append_to_response=credits`
    );
    let detailsData = await detailsRes.json();

    // 3. FALLBACK Logic: Αν η ελληνική περίληψη λείπει ή είναι πολύ μικρή (κάτω από 10 χαρακτήρες)
    // Αυτό συμβαίνει συχνά στις νέες ταινίες (Coming Soon)
    if (!detailsData.overview || detailsData.overview.length < 10) {
      const engRes = await fetch(
        `https://api.themoviedb.org/3/movie/${movieId}?api_key=${API_KEY}&language=en-US`
      );
      const engData = await engRes.json();
      
      // Αν βρει αγγλική περίληψη τη βάζουμε, αλλιώς αφήνουμε το μήνυμα "Δεν βρέθηκε..."
      detailsData.overview = (engData.overview && engData.overview.length > 10) 
        ? engData.overview 
        : "Δεν βρέθηκε διαθέσιμη περίληψη στα Ελληνικά ή Αγγλικά.";
    }

    return NextResponse.json({
      title: detailsData.title,
      overview: detailsData.overview,
      rating: detailsData.vote_average ? detailsData.vote_average.toFixed(1) : "-",
      year: detailsData.release_date ? detailsData.release_date.split('-')[0] : "-",
      runtime: detailsData.runtime || "-",
      // Τα είδη (genres) θα έρθουν στα ελληνικά λόγω του αρχικού fetch
      genres: detailsData.genres?.map(g => g.name).join(', ') || "-",
      cast: detailsData.credits?.cast?.slice(0, 4).map(c => c.name).join(', ') || "-",
      poster: detailsData.poster_path ? `https://image.tmdb.org/t/p/w500${detailsData.poster_path}` : null
    });

  } catch (error) {
    console.error("TMDB API Error:", error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}