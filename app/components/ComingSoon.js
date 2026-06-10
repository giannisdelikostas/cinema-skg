'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { upcomingMovies } from '../../data/upcomingMovies';

const MovieCard = ({ movie, index, viewType, onOpenModal }) => {
  const [poster, setPoster] = useState(null);

  useEffect(() => {
    const query = movie.tmdbId ? `id=${movie.tmdbId}` : `title=${encodeURIComponent(movie.title)}`;
    fetch(`/api/tmdb?${query}`)
      .then(res => res.json())
      .then(data => {
        if (data.poster) {
          setPoster(data.poster);
        }
      })
      .catch(err => console.error("TMDB Error:", err));
  }, [movie]);

  // ΕΔΩ: Η ΛΙΣΤΑ ΜΕ ΤΗ ΜΙΚΡΗ ΑΦΙΣΑ
  if (viewType === 'list') {
    return (
      <div 
        onClick={() => onOpenModal(index, poster)}
        className="flex justify-between items-center py-3 border-b border-white/5 hover:bg-white/[0.03] transition px-4 group cursor-pointer rounded-xl"
      >
        <div className="flex items-center gap-4">
          {/* Μικρή Αφίσα στη Λίστα */}
          <div className="w-10 h-14 bg-zinc-900 rounded-md overflow-hidden flex-shrink-0 border border-white/10">
            {poster ? (
              <img src={poster} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[6px] text-zinc-500 uppercase font-black text-center">...</div>
            )}
          </div>
          <span className="text-zinc-300 text-base md:text-lg font-medium group-hover:text-yellow-500 transition-colors italic">{movie.title}</span>
        </div>
        <span className="text-yellow-500 font-black text-sm bg-yellow-500/10 px-4 py-1 rounded-full italic tracking-tighter">{movie.date}</span>
      </div>
    );
  }

  // ΕΔΩ: ΤΟ SLIDER
  return (
    <div 
      onClick={() => onOpenModal(index, poster)}
      className="min-w-[170px] md:min-w-[230px] flex flex-col gap-3 group snap-start pb-6 cursor-pointer select-none"
    >
      <span className="text-yellow-500 text-[11px] font-black tracking-widest uppercase bg-yellow-500/10 w-fit px-3 py-1 rounded-lg italic">
        {movie.date}
      </span>
      <div className="aspect-[2/3] w-full bg-zinc-900 rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl group-hover:border-yellow-500/50 transition-all duration-500 relative">
        {poster ? (
          <img src={poster} alt={movie.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 pointer-events-none" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-700 text-[10px] font-black uppercase tracking-widest text-center p-6 italic">
            ΣΥΝΤΟΜΑ ΚΟΝΤΑ ΜΑΣ
          </div>
        )}
      </div>
      <h3 className="text-zinc-100 text-sm font-black leading-tight line-clamp-2 h-10 px-1 italic">{movie.title}</h3>
    </div>
  );
};

export default function ComingSoon({ onOpenModal }) {
  const [viewMode, setViewMode] = useState('slider'); 
  const scrollRef = useRef(null);
  const isDown = useRef(false);
  const startX = useRef(null);
  const scrollLeft = useRef(null);

  // Φιλτράρισμα ταινιών βάσει σημερινής ημερομηνίας
  const visibleMovies = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentYear = today.getFullYear();

    return upcomingMovies
      .map((movie, originalIndex) => ({ ...movie, originalIndex })) // Κρατάμε το σωστό index για το Modal
      .filter(movie => {
        const [day, month] = movie.date.split('/').map(Number);
        const movieReleaseDate = new Date(currentYear, month - 1, day);
        
        return movieReleaseDate >= today; // Εμφάνιση μόνο αν είναι σήμερα ή στο μέλλον
      });
  }, []);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth / 2 : scrollLeft + clientWidth / 2;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  const handleMouseDown = (e) => {
    if (viewMode === 'list') return;
    isDown.current = true;
    startX.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeft.current = scrollRef.current.scrollLeft;
  };
  const handleMouseLeave = () => { isDown.current = false; };
  const handleMouseUp = () => { isDown.current = false; };
  const handleMouseMove = (e) => {
    if (!isDown.current || viewMode === 'list') return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 2;
    scrollRef.current.scrollLeft = scrollLeft.current - walk;
  };

  return (
    <section id="coming-soon" className="mt-32 mb-20 px-6 max-w-7xl mx-auto scroll-mt-24 relative z-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6 border-b border-white/5 pb-8">
        <div>
          <h2 className="text-5xl md:text-6xl font-black text-white tracking-tighter italic uppercase">
            ΠΡΟΣΕΧΩΣ <span className="text-yellow-500 not-italic ml-2">.</span>
          </h2>
          <p className="text-white/20 text-[10px] font-black tracking-[0.4em] uppercase mt-2 italic">Οι μεγαλυτερες πρεμιερες του 2026</p>
        </div>
        <div className="flex gap-1 bg-white/5 p-1.5 rounded-2xl border border-white/5 backdrop-blur-xl">
           <button onClick={() => setViewMode('slider')} className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${viewMode === 'slider' ? 'bg-yellow-500 text-black shadow-xl' : 'text-zinc-500 hover:text-white'}`}>SLIDER</button>
           <button onClick={() => setViewMode('list')} className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${viewMode === 'list' ? 'bg-yellow-500 text-black shadow-xl' : 'text-zinc-500 hover:text-white'}`}>ΛΙΣΤΑ</button>
        </div>
      </div>

      <div className="relative group/arrows">
        {viewMode === 'slider' && (
          <>
            <button onClick={() => scroll('left')} className="absolute -left-4 md:-left-12 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/5 border border-white/10 hidden md:flex items-center justify-center hover:bg-yellow-500 hover:text-black transition-all z-20 shadow-2xl backdrop-blur-md opacity-0 group-hover/arrows:opacity-100">←</button>
            <button onClick={() => scroll('right')} className="absolute -right-4 md:-right-12 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/5 border border-white/10 hidden md:flex items-center justify-center hover:bg-yellow-500 hover:text-black transition-all z-20 shadow-2xl backdrop-blur-md opacity-0 group-hover/arrows:opacity-100">→</button>
          </>
        )}
        
        {/* Χρήση της φιλτραρισμένης λίστας visibleMovies */}
        <div 
          ref={scrollRef}
          onMouseDown={handleMouseDown} onMouseLeave={handleMouseLeave} onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}
          className={`pb-10 no-scrollbar scroll-smooth ${
            viewMode === 'slider' 
              ? `flex overflow-x-auto gap-8 snap-x ${isDown.current ? 'cursor-grabbing' : 'cursor-grab'}` 
              : 'grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2'
          }`}
        >
          {visibleMovies.map((movie) => (
            <MovieCard 
              key={movie.id} 
              movie={movie} 
              index={movie.originalIndex} 
              viewType={viewMode} 
              onOpenModal={onOpenModal} 
            />
          ))}
        </div>
      </div>
    </section>
  );
}