'use client';
import { useEffect, useState } from 'react';

const cleanGreek = (str) => {
  if (!str) return '';
  return str.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
};

export default function CinemaApp() {
  const [movies, setMovies] = useState([]);
  const [activeTab, setActiveTab] = useState('ΑΠΟΛΛΩΝ');
  const [selectedDay, setSelectedDay] = useState('');
  const [availableDays, setAvailableDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(null);
  const [tmdbInfo, setTmdbInfo] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  const cinemaTabs = [
    { name: 'ΑΠΟΛΛΩΝ', logo: '/logo-apollon.png' },
    { name: 'ΝΑΤΑΛΙ', logo: '/logo-natali.png' },
    { name: 'ΕΛΛΗΝΙΣ', logo: '/logo-ellinis.png' },
    { name: 'CINE ΑΛΕΞ', logo: '/logo-alex.png' },
    { name: 'ΟΛΥΜΠΙΟΝ', logo: '/logo-olympion.png' },
    { name: 'ΒΑΚΟΥΡΑ', logo: '/logo-bakoura.png' },
    { name: 'ΜΑΚΕΔΟΝΙΚΟΝ', logo: '/logo-makedonikon.png' },
    { name: 'ΚΟΛΟΣΣΑΙΟΝ', logo: '/logo-kolossaion.png' }
  ];

  const filteredMovies = movies
    .filter(m => m.cinema === activeTab && m.schedule[selectedDay])
    .sort((a, b) => {
        const timeA = a.schedule[selectedDay].split(':')[0].padStart(2, '0');
        const timeB = b.schedule[selectedDay].split(':')[0].padStart(2, '0');
        return timeA.localeCompare(timeB);
    });

  useEffect(() => {
    setHasMounted(true);
    fetch('/api/movies')
      .then(res => res.json())
      .then(data => {
        setMovies(data);
        const daysSet = new Set();
        data.forEach(m => Object.keys(m.schedule).forEach(d => daysSet.add(d)));
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const currentYear = new Date().getFullYear();

        const sorted = Array.from(daysSet).sort((a, b) => {
          const partsA = a.split(' ')[1].split('/');
          const partsB = b.split(' ')[1].split('/');
          return new Date(currentYear, partsA[1] - 1, partsA[0]) - new Date(currentYear, partsB[1] - 1, partsB[0]);
        }).filter(day => {
          const parts = day.split(' ')[1].split('/');
          return new Date(currentYear, parts[1] - 1, parts[0]) >= now;
        });

        setAvailableDays(sorted);
        const elDays = ['Κυ', 'Δε', 'Τρ', 'Τε', 'Πε', 'Πα', 'Σα'];
        const todayStr = `${elDays[now.getDay()]} ${now.getDate()}/${now.getMonth() + 1}`;
        setSelectedDay(sorted.includes(todayStr) ? todayStr : sorted[0]);
        setLoading(false);
      });
  }, []);

  if (!hasMounted) return null;

  const fetchTMDB = async (title) => {
    setModalLoading(true);
    setTmdbInfo(null);
    try {
      const res = await fetch(`/api/tmdb?title=${encodeURIComponent(title)}`);
      const data = await res.json();
      if (res.ok) setTmdbInfo(data);
      else setTmdbInfo({ error: true });
    } catch (e) { setTmdbInfo({ error: true }); }
    setModalLoading(false);
  };

  const openInfoModal = (index) => {
    setCurrentIndex(index);
    setIsModalOpen(true);
    fetchTMDB(filteredMovies[index].title);
  };

  const navigateModal = (direction) => {
    let newIndex = currentIndex + direction;
    if (newIndex < 0) newIndex = filteredMovies.length - 1;
    if (newIndex >= filteredMovies.length) newIndex = 0;
    setCurrentIndex(newIndex);
    fetchTMDB(filteredMovies[newIndex].title);
  };

  const getCurrentCinemaLogo = (cinemaName) => cinemaTabs.find(tab => tab.name === cinemaName)?.logo || '';

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-10 font-inter relative overflow-x-hidden selection:bg-yellow-500 selection:text-black">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        body { font-family: 'Inter', sans-serif; letter-spacing: -0.02em; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
      
      <div className="fixed top-[-10%] left-[-10%] w-[60%] h-[60%] bg-yellow-600/10 rounded-full blur-[120px] pointer-events-none z-0"></div>

      <header className="max-w-3xl mx-auto py-16 md:py-24 border-b border-white/5 mb-12 text-center relative z-10">
        <h1 className="text-6xl md:text-8xl font-[900] text-yellow-500 italic tracking-tighter mb-4">{cleanGreek('Cinema SKG')}</h1>
        <p className="text-white/40 text-[10px] md:text-[12px] tracking-[0.4em] font-bold mb-2">{cleanGreek('Ολη η Θεσσαλονικη στη μεγαλη οθονη')}</p>
        <p className="text-white/20 text-[9px] tracking-[0.2em] font-medium italic">
          by <a href="https://www.instagram.com/alli.mia.selida.gia.tainies/" target="_blank" rel="noopener" className="text-white/40 hover:text-yellow-500 transition-all underline decoration-yellow-500/20 underline-offset-8 cursor-pointer">alli mia selida gia tainies</a>
        </p>
      </header>

      {/* Days Selector */}
      <div className="max-w-4xl mx-auto mb-10 relative z-10">
        <div className="flex overflow-x-auto gap-3 pb-4 no-scrollbar">
          {availableDays.map(day => (
            <button key={day} onClick={() => setSelectedDay(day)}
              className={`px-6 py-4 rounded-[1.5rem] text-[11px] font-[900] border transition-all whitespace-nowrap flex-shrink-0 cursor-pointer uppercase tracking-wider ${
                selectedDay === day 
                ? 'bg-yellow-500 border-yellow-500 text-black shadow-lg scale-105' 
                : 'bg-white/5 border-white/10 text-white/40 hover:text-white/80'
              }`}>{cleanGreek(day)}</button>
          ))}
        </div>
      </div>

      {/* Cinema Tabs - ΕΠΑΝΑΦΟΡΑ ΣΕ screenshot_60 στυλ */}
      <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-2 mb-16 bg-white/5 backdrop-blur-2xl border border-white/10 p-2 rounded-[2.5rem] md:rounded-full relative z-10">
        {cinemaTabs.map(tab => (
          <button key={tab.name} onClick={() => setActiveTab(tab.name)}
            className={`py-4 px-6 rounded-full text-[10px] font-[900] tracking-[0.15em] transition-all flex items-center justify-center md:justify-start gap-3 cursor-pointer uppercase ${
              activeTab === tab.name ? 'bg-white/10 text-yellow-500 shadow-xl border border-white/10' : 'text-white/30 hover:text-white/60 border border-transparent'
            }`}>
                <img src={tab.logo} alt="" className="w-8 h-8 rounded-full object-cover border border-white/10"/>
                <span>{cleanGreek(tab.name)}</span>
            </button>
        ))}
      </div>

      {/* Movie List */}
      <div className="max-w-3xl mx-auto space-y-8 relative z-10">
        {loading ? (
          <div className="flex justify-center py-24 opacity-40 text-[11px] font-black tracking-[0.5em] animate-pulse">{cleanGreek('Συγχρονισμος...')}</div>
        ) : filteredMovies.length > 0 ? (
          filteredMovies.map((m, i) => (
            <div key={i} className="group bg-white/[0.02] border border-white/10 p-6 md:p-10 rounded-[3rem] md:rounded-[4rem] flex flex-col md:flex-row items-center gap-8 md:gap-12 hover:bg-white/[0.05] transition-all duration-700 relative overflow-hidden">
              <div className="flex md:hidden flex-col items-center mb-2 text-center w-full">
                <img src={getCurrentCinemaLogo(m.cinema)} alt="" className="w-12 h-12 rounded-full object-cover border border-white/10 mb-3"/>
                <p className="text-[10px] font-black text-yellow-500 tracking-[0.3em] italic uppercase mb-1">{cleanGreek(m.cinema)}</p>
                <p className="text-white font-[900] text-3xl tracking-tighter mb-4">{m.schedule[selectedDay]}</p>
              </div>
              <div className="w-48 h-64 md:w-52 md:h-72 bg-zinc-900 rounded-[2.5rem] md:rounded-[3rem] overflow-hidden flex-shrink-0 shadow-2xl relative border border-white/10 cursor-pointer" onClick={() => openInfoModal(i)}>
                <img src={m.image} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-[1.5s]" alt=""/>
              </div>
              <div className="flex-grow text-center md:text-left w-full">
                <div className="hidden md:flex items-center gap-4 mb-6 bg-white/5 p-5 rounded-full border border-white/5 max-w-fit mx-auto md:mx-0">
                  <img src={getCurrentCinemaLogo(m.cinema)} alt="" className="w-12 h-12 rounded-full object-cover border border-white/10"/>
                  <div className="flex items-center gap-4">
                    <p className="text-[10px] font-black text-yellow-500 tracking-[0.3em] italic uppercase leading-none">{cleanGreek(m.cinema)}</p>
                    <p className="text-white font-[900] text-2xl tracking-tighter leading-none">{m.schedule[selectedDay]}</p>
                  </div>
                </div>
                <h3 onClick={() => openInfoModal(i)} className="font-[900] text-4xl leading-[1.1] group-hover:text-yellow-500 transition-colors duration-500 mb-8 cursor-pointer tracking-tight">{m.title}</h3>
                <div className="flex flex-row justify-center md:justify-start items-center gap-2 md:gap-4 w-full">
                  <a href={m.youtubeUrl} target="_blank" rel="noopener" className="flex-1 md:flex-none text-center px-2 md:px-7 py-3.5 rounded-2xl text-[9px] md:text-[10px] font-black bg-white/5 border border-white/10 text-white/50 hover:text-red-500 transition-all cursor-pointer uppercase tracking-wider">{cleanGreek('Trailer')}</a>
                  <button onClick={() => openInfoModal(i)} className="flex-1 md:flex-none text-center px-2 md:px-7 py-3.5 rounded-2xl text-[9px] md:text-[10px] font-black bg-blue-500/5 border border-blue-500/10 text-blue-400/70 hover:bg-blue-500 hover:text-black transition-all cursor-pointer uppercase tracking-wider">{cleanGreek('Info')}</button>
                  {m.ticketsUrl && (
                    <a href={m.ticketsUrl} target="_blank" rel="noopener" className="flex-1 md:flex-none text-center px-2 md:px-7 py-3.5 rounded-2xl text-[9px] md:text-[10px] font-black bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500 hover:text-black transition-all cursor-pointer uppercase tracking-wider">{cleanGreek('Tickets')}</a>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-48 opacity-10 border-4 border-dashed border-white/5 rounded-[5rem] flex flex-col items-center gap-4">
              <p className="text-5xl md:text-7xl font-[900] italic uppercase tracking-tighter">{cleanGreek('Κλειστα')}</p>
          </div>
        )}
      </div>

      <footer className="max-w-3xl mx-auto py-32 text-center relative z-10">
        <div className="opacity-20 text-[10px] font-black tracking-[0.6em] mb-6">© {new Date().getFullYear()} {cleanGreek('Cinema SKG')}</div>
        <a href="https://www.instagram.com/alli.mia.selida.gia.tainies/" target="_blank" rel="noopener" className="opacity-20 hover:opacity-100 hover:text-yellow-500 transition-all text-[11px] font-[900] tracking-widest uppercase border border-white/5 px-6 py-3 rounded-full hover:bg-white/5">alli mia selida gia tainies</a>
      </footer>

      {/* MODAL - ΕΠΑΝΑΦΟΡΑ ΣΕ screenshot_61 στυλ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/95 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)}>
          <button onClick={(e) => { e.stopPropagation(); navigateModal(-1); }} className="fixed left-4 md:left-10 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-yellow-500 hover:text-black transition-all z-[110] cursor-pointer">←</button>
          <button onClick={(e) => { e.stopPropagation(); navigateModal(1); }} className="fixed right-4 md:right-10 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-yellow-500 hover:text-black transition-all z-[110] cursor-pointer">→</button>

          <div className="flex min-h-full items-center justify-center p-4 md:p-6 cursor-default">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-[3rem] p-8 md:p-12 max-w-lg w-full relative shadow-2xl my-8 overflow-hidden" onClick={e => e.stopPropagation()}>
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 bg-white/5 w-12 h-12 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-black transition-all font-bold z-20 cursor-pointer text-xl">✕</button>
              
              <div className="flex flex-col items-center mb-8 text-center">
                <img src={getCurrentCinemaLogo(activeTab)} alt="" className="w-14 h-14 rounded-full border border-white/10 object-cover shadow-lg mb-4" />
                <p className="text-yellow-500 font-[900] tracking-[0.2em] italic text-xs leading-none mb-2">{cleanGreek(activeTab)}</p>
                <p className="text-white font-[900] text-2xl tracking-tighter leading-none">{filteredMovies[currentIndex]?.schedule[selectedDay]}</p>
              </div>

              {/* ΧΡΗΣΗ ΤΗΣ m.image ΓΙΑ ΣΥΝΕΠΕΙΑ (ΟΠΩΣ screenshot_48) */}
              <div className="w-full max-w-[260px] mx-auto mb-8 rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl aspect-[2/3] relative">
                  <img src={filteredMovies[currentIndex]?.image} alt="movie poster" className="absolute inset-0 w-full h-full object-cover"/>
              </div>

              <h2 className="text-3xl md:text-4xl font-[900] text-yellow-500 mb-10 leading-tight tracking-tight italic text-center mx-auto max-w-[90%]">{filteredMovies[currentIndex]?.title}</h2>
              
              {modalLoading ? (
                <div className="py-24 text-center text-white/20 animate-pulse text-[11px] font-black tracking-[0.5em]">{cleanGreek('Φορτωση...')}</div>
              ) : tmdbInfo?.error ? (
                <div className="py-24 text-center text-red-400/40 text-[11px] font-black tracking-[0.5em] border border-red-500/10 rounded-[2rem]">{cleanGreek('Δεν βρεθηκαν πληροφοριες')}</div>
              ) : tmdbInfo ? (
                <div className="space-y-8 text-white/80 animate-in slide-in-from-bottom-4 duration-500">
                  <div className="grid grid-cols-2 gap-y-8 gap-x-4 border-y border-white/5 py-8">
                        <div className="flex flex-col items-center text-center px-2">
                            <span className="text-white/60 uppercase text-[9px] font-[900] tracking-[0.15em] mb-2">{cleanGreek('Βαθμολογια')}</span>
                            <div className="flex items-center gap-1.5">
                               <span className="text-yellow-500 text-lg">★</span>
                               <span className="text-yellow-500 font-black text-xl leading-none">{tmdbInfo.rating}</span>
                            </div>
                        </div>
                        <div className="flex flex-col items-center text-center px-2 border-l border-white/5">
                            <span className="text-white/60 uppercase text-[9px] font-[900] tracking-[0.15em] mb-2">{cleanGreek('Ετος')}</span>
                            <span className="font-bold text-white text-lg">{tmdbInfo.year}</span>
                        </div>
                        <div className="flex flex-col items-center text-center px-2 border-t border-white/5 pt-8">
                            <span className="text-white/60 uppercase text-[9px] font-[900] tracking-[0.15em] mb-2">{cleanGreek('Διαρκεια')}</span>
                            <span className="font-bold text-white text-lg">{tmdbInfo.runtime}′</span>
                        </div>
                        <div className="flex flex-col items-center text-center px-2 border-l border-t border-white/5 pt-8">
                            <span className="text-white/60 uppercase text-[9px] font-[900] tracking-[0.15em] mb-2">{cleanGreek('Ειδος')}</span>
                            <span className="font-medium text-white/90 text-[12px] leading-tight italic line-clamp-2">{tmdbInfo.genres}</span>
                        </div>
                  </div>

                  <div className="bg-white/[0.02] p-7 rounded-[2.5rem] border border-white/5">
                    <p className="text-yellow-500/40 uppercase text-[10px] font-black tracking-[0.3em] mb-4 text-center">{cleanGreek('Περιληψη')}</p>
                    <p className="leading-relaxed text-[15px] text-white/80 font-medium italic text-center">"{tmdbInfo.overview}"</p>
                  </div>

                  <div className="bg-white/[0.02] p-7 rounded-[2.5rem] border border-white/5">
                    <p className="text-yellow-500/40 uppercase text-[10px] font-black tracking-[0.3em] mb-4 text-center">{cleanGreek('Πρωταγωνιστουν')}</p>
                    <p className="text-[14px] text-white/70 font-semibold text-center">{tmdbInfo.cast}</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}