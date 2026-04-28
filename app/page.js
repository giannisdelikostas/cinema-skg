'use client';
import { useEffect, useState } from 'react';

export default function CinemaApp() {
  const [movies, setMovies] = useState([]);
  const [activeTab, setActiveTab] = useState('ΟΛΥΜΠΙΟΝ');
  const [selectedDay, setSelectedDay] = useState('');
  const [availableDays, setAvailableDays] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedMovie, setSelectedMovie] = useState(null);
  const [tmdbInfo, setTmdbInfo] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  const cinemaTabs = [
    { name: 'ΟΛΥΜΠΙΟΝ', logo: '/logo-olympion.png' },
    { name: 'ΒΑΚΟΥΡΑ', logo: '/logo-bakoura.png' },
    { name: 'ΜΑΚΕΔΟΝΙΚΟΝ', logo: '/logo-makedonikon.png' },
    { name: 'ΚΟΛΟΣΣΑΙΟΝ', logo: '/logo-kolossaion.png' }
  ];

  const sortAndFilterDays = (daysArray) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return daysArray
      .filter(day => {
        const parts = day.split(' ')[1].split('/');
        const dayDate = new Date(2026, parts[1] - 1, parts[0]);
        return dayDate >= now;
      })
      .sort((a, b) => {
        const partsA = a.split(' ')[1].split('/');
        const partsB = b.split(' ')[1].split('/');
        return new Date(2026, partsA[1] - 1, partsA[0]) - new Date(2026, partsB[1] - 1, partsB[0]);
      });
  };

  useEffect(() => {
    fetch('/api/movies')
      .then(res => res.json())
      .then(data => {
        setMovies(data);
        const daysSet = new Set();
        data.forEach(m => Object.keys(m.schedule).forEach(d => daysSet.add(d)));
        const filteredDays = sortAndFilterDays(Array.from(daysSet));
        setAvailableDays(filteredDays);
        const now = new Date();
        const elDays = ['Κυ', 'Δε', 'Τρ', 'Τε', 'Πε', 'Πα', 'Σα'];
        const todayStr = `${elDays[now.getDay()]} ${now.getDate()}/${now.getMonth() + 1}`;
        setSelectedDay(filteredDays.includes(todayStr) ? todayStr : filteredDays[0]);
        setLoading(false);
      });
  }, []);

  const openInfoModal = async (movieTitle) => {
    setSelectedMovie(movieTitle);
    setIsModalOpen(true);
    setTmdbInfo(null);
    setModalLoading(true);

    try {
      const res = await fetch(`/api/tmdb?title=${encodeURIComponent(movieTitle)}`);
      if (res.ok) {
        const data = await res.json();
        setTmdbInfo(data);
      } else {
        setTmdbInfo({ error: true });
      }
    } catch (e) {
      setTmdbInfo({ error: true });
    }
    setModalLoading(false);
  };

  const filtered = movies
    .filter(m => m.cinema === activeTab && m.schedule[selectedDay])
    .sort((a, b) => parseInt(a.schedule[selectedDay].replace(':', '')) - parseInt(b.schedule[selectedDay].replace(':', '')));

  const getCurrentCinemaLogo = (cinemaName) => {
    return cinemaTabs.find(tab => tab.name === cinemaName)?.logo || '';
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-10 font-sans relative overflow-x-hidden">
      
      <div className="fixed top-[-5%] left-[-5%] w-[50%] h-[50%] bg-yellow-600/20 rounded-full blur-[100px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-5%] right-[-5%] w-[50%] h-[50%] bg-zinc-600/20 rounded-full blur-[100px] pointer-events-none z-0"></div>

      {/* --- CENTERED HEADER --- */}
      <header className="max-w-3xl mx-auto py-12 md:py-16 border-b border-white/10 mb-12 flex flex-col justify-center items-center text-center relative z-10">
        <h1 className="text-5xl md:text-7xl font-black text-yellow-500 italic tracking-tighter leading-none drop-shadow-2xl mb-4">CINEMA SKG</h1>
        <p className="text-white/40 text-[10px] md:text-[11px] tracking-[0.3em] font-bold uppercase mb-2">ΟΛΗ Η ΘΕΣΣΑΛΟΝΙΚΗ ΣΤΗ ΜΕΓΑΛΗ ΟΘΟΝΗ</p>
        <p className="text-white/20 text-[9px] tracking-[0.2em] font-medium uppercase">
          by <a href="https://www.instagram.com/alli.mia.selida.gia.tainies/" target="_blank" rel="noopener" className="text-white/40 hover:text-yellow-500 transition-colors underline decoration-yellow-500/30 underline-offset-4 cursor-pointer">alli mia selida gia tainies</a>
        </p>
      </header>

      {/* Days Selector */}
      <div className="max-w-3xl mx-auto mb-10 relative z-10">
        <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
          {availableDays.map(day => (
            <button key={day} onClick={() => setSelectedDay(day)}
              className={`px-5 py-3 rounded-2xl text-[10px] font-black border transition-all whitespace-nowrap flex-shrink-0 cursor-pointer ${
                selectedDay === day 
                ? 'bg-yellow-500 border-yellow-500 text-black shadow-lg scale-105' 
                : 'bg-white/5 backdrop-blur-md border-white/10 text-white/40 hover:text-white/70'
              }`}>{day}</button>
          ))}
        </div>
      </div>

      {/* Cinema Tabs */}
      <div className="max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-2 mb-12 bg-white/5 backdrop-blur-xl border border-white/10 p-2 rounded-[2rem] md:rounded-full relative z-10 overflow-hidden">
        {cinemaTabs.map(tab => (
          <button key={tab.name} onClick={() => setActiveTab(tab.name)}
            className={`py-3 md:py-3 px-4 rounded-full text-[9px] font-black tracking-widest transition-all flex items-center justify-center md:justify-start gap-3 cursor-pointer ${
              activeTab === tab.name 
              ? 'bg-white/10 text-yellow-500 shadow-xl' 
              : 'text-white/20 hover:text-white/50'
            }`}>
                <img src={tab.logo} alt={tab.name} className="w-7 h-7 rounded-full object-cover border border-white/10 shadow-md flex-shrink-0"/>
                <span className="leading-none">{tab.name}</span>
            </button>
        ))}
      </div>

      {/* Movie List */}
      <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 relative z-10">
        {loading ? (
          <div className="flex justify-center py-20 opacity-40 text-[10px] font-black tracking-widest uppercase animate-pulse">Συγχρονισμός...</div>
        ) : filtered.length > 0 ? (
          filtered.map((m, i) => (
            <div key={i} className="group bg-white/[0.03] backdrop-blur-xl border border-white/10 p-5 md:p-8 rounded-[2.5rem] md:rounded-[3.5rem] flex flex-col md:flex-row items-center gap-6 md:gap-10 hover:bg-white/[0.06] transition-all duration-500 relative">
              <div className="w-40 h-56 md:w-44 md:h-64 bg-zinc-800 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden flex-shrink-0 shadow-2xl relative block border border-white/10 cursor-pointer" onClick={() => openInfoModal(m.title)}>
                <img src={m.image} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-1000" alt=""/>
              </div>
              <div className="flex-grow text-center md:text-left w-full">
                <div className="flex flex-col md:flex-row items-center gap-3 mb-5 bg-white/5 p-3 rounded-full border border-white/5 max-w-fit mx-auto md:mx-0">
                  <img src={getCurrentCinemaLogo(m.cinema)} alt={m.cinema} className="w-8 h-8 rounded-full object-cover border border-white/10 flex-shrink-0"/>
                  <div className="flex items-center gap-2">
                    <p className="text-[9px] font-black text-yellow-500 tracking-[0.4em] italic uppercase leading-none">{m.cinema}</p>
                    <a href={m.cinemaMap} target="_blank" rel="noopener" className="text-[8px] bg-white/5 border border-white/10 px-3 py-1 rounded-full text-white/50 hover:text-yellow-500 transition-colors uppercase font-bold tracking-tighter leading-none cursor-pointer">📍 Χάρτης</a>
                  </div>
                </div>
                <h3 onClick={() => openInfoModal(m.title)} className="font-black text-2xl md:text-4xl leading-tight group-hover:text-yellow-500 transition-colors duration-300 drop-shadow-md mb-6 md:mb-8 cursor-pointer">{m.title}</h3>
                <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 md:gap-4">
                  <span className="bg-white text-black px-6 py-2.5 rounded-xl text-sm font-black shadow-lg">{m.schedule[selectedDay]}</span>
                  <a href={m.youtubeUrl} target="_blank" rel="noopener" className="px-6 py-2.5 rounded-xl text-[9px] font-black bg-white/5 backdrop-blur-md border border-white/10 text-white/50 hover:text-red-500 hover:border-red-500/30 transition-all uppercase tracking-widest leading-none cursor-pointer">🎬 Trailer</a>
                  <button onClick={() => openInfoModal(m.title)} className="px-6 py-2.5 rounded-xl text-[9px] font-black bg-blue-500/10 backdrop-blur-md border border-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-black transition-all uppercase tracking-widest leading-none cursor-pointer">ℹ️ Info</button>
                  {m.ticketsUrl && (
                    <a href={m.ticketsUrl} target="_blank" rel="noopener" className="px-6 py-2.5 rounded-xl text-[9px] font-black bg-green-500/10 backdrop-blur-md border border-green-500/20 text-green-400 hover:bg-green-500 hover:text-black transition-all uppercase tracking-widest leading-none shadow-[0_0_15px_rgba(34,197,94,0.1)] cursor-pointer">🎟️ Εισιτηρια</a>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-40 opacity-10 border-4 border-dashed border-white/5 rounded-[5rem]"><p className="text-4xl md:text-6xl font-black italic uppercase">ΚΛΕΙΣΤΑ</p></div>
        )}
      </div>

      {/* --- UPDATED FOOTER --- */}
      <footer className="max-w-3xl mx-auto py-24 text-center relative z-10">
        <div className="opacity-30 text-[9px] font-bold tracking-[0.5em] uppercase mb-4">
          &copy; 2026 By <a href="https://www.instagram.com/alli.mia.selida.gia.tainies/" target="_blank" rel="noopener" 
           className="opacity-100 hover:opacity-100 hover:text-yellow-500 transition-all text-[10px] font-white tracking-widest uppercase cursor-pointer">
          alli mia selida gia tainies
        </a>
        </div>
      </footer>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-default" onClick={() => setIsModalOpen(false)}>
          <div className="bg-[#111] border border-white/10 rounded-[2rem] p-6 md:p-8 max-w-lg w-full relative shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 bg-white/10 w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-black transition-colors font-bold z-10 cursor-pointer">✕</button>
            <h2 className="text-2xl font-black text-yellow-500 mb-6 pr-8 leading-tight drop-shadow-lg">{selectedMovie}</h2>
            {modalLoading ? (
              <div className="py-10 text-center text-white/40 animate-pulse text-xs font-black tracking-widest uppercase">Αναζητηση στο TMDB...</div>
            ) : tmdbInfo?.error ? (
              <div className="py-10 text-center text-red-400/50 text-xs font-black tracking-widest uppercase">Δεν βρεθηκαν επιπλεον πληροφοριες.</div>
            ) : tmdbInfo ? (
              <div className="space-y-5 text-sm text-white/80 mt-2">
                <div className="flex gap-5 mb-6">
                   {tmdbInfo.poster && <img src={tmdbInfo.poster} alt="poster" className="w-28 rounded-xl shadow-lg border border-white/10 object-cover flex-shrink-0"/>}
                   <div className="flex flex-col justify-center space-y-3">
                      <p><span className="text-white/40 uppercase text-[10px] font-black tracking-widest mr-2">ΒΑΘΜΟΛΟΓΙΑ:</span><span className="text-yellow-500 font-bold">★ {tmdbInfo.rating}/10</span></p>
                      <p><span className="text-white/40 uppercase text-[10px] font-black tracking-widest mr-2">ΕΤΟΣ:</span> {tmdbInfo.year}</p>
                      <p><span className="text-white/40 uppercase text-[10px] font-black tracking-widest mr-2">ΔΙΑΡΚΕΙΑ:</span> {tmdbInfo.runtime} λεπτά</p>
                      <p><span className="text-white/40 uppercase text-[10px] font-black tracking-widest mr-2">ΕΙΔΟΣ:</span> <span className="text-xs">{tmdbInfo.genres}</span></p>
                   </div>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <p className="text-white/40 uppercase text-[10px] font-black tracking-widest mb-2">ΠΕΡΙΛΗΨΗ</p>
                  <p className="leading-relaxed text-xs text-white/70">{tmdbInfo.overview}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <p className="text-white/40 uppercase text-[10px] font-black tracking-widest mb-2">ΗΘΟΠΟΙΟΙ</p>
                  <p className="text-xs text-white/70">{tmdbInfo.cast}</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}