'use client';
import { useEffect, useState } from 'react';

export default function CinemaApp() {
  const [movies, setMovies] = useState([]);
  const [activeTab, setActiveTab] = useState('ΒΑΚΟΥΡΑ');
  const [selectedDay, setSelectedDay] = useState('');
  const [availableDays, setAvailableDays] = useState([]);
  const [loading, setLoading] = useState(true);

  const cinemaTabs = ['ΒΑΚΟΥΡΑ', 'ΜΑΚΕΔΟΝΙΚΟΝ', 'ΚΟΛΟΣΣΑΙΟΝ', 'ΟΛΥΜΠΙΟΝ'];

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

  const filtered = movies
    .filter(m => m.cinema === activeTab && m.schedule[selectedDay])
    .sort((a, b) => parseInt(a.schedule[selectedDay].replace(':', '')) - parseInt(b.schedule[selectedDay].replace(':', '')));

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-10 font-sans relative overflow-x-hidden">
      
      {/* BACKGROUND BLOBS - Πιο έντονα για να φαίνεται το Blur */}
      <div className="fixed top-[-5%] left-[-5%] w-[50%] h-[50%] bg-yellow-600/20 rounded-full blur-[100px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-5%] right-[-5%] w-[50%] h-[50%] bg-zinc-600/20 rounded-full blur-[100px] pointer-events-none z-0"></div>

      <header className="max-w-3xl mx-auto py-8 md:py-12 border-b border-white/10 mb-8 md:mb-12 flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
        <div className="text-center md:text-left">
          <h1 className="text-4xl md:text-6xl font-black text-yellow-500 italic tracking-tighter leading-none drop-shadow-2xl">CINEMA SKG</h1>
          <p className="text-white/30 text-[9px] tracking-[0.4em] mt-2 font-bold uppercase">Thessaloniki Movie Experience by @alli mia selida gia tainies</p>
        </div>
      </header>

      {/* ΗΜΕΡΕΣ */}
      <div className="max-w-3xl mx-auto mb-10 relative z-10">
        <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
          {availableDays.map(day => (
            <button key={day} onClick={() => setSelectedDay(day)}
              className={`px-5 py-3 rounded-2xl text-[10px] font-black border transition-all whitespace-nowrap flex-shrink-0 ${
                selectedDay === day 
                ? 'bg-yellow-500 border-yellow-500 text-black shadow-lg scale-105' 
                : 'bg-white/5 backdrop-blur-md border-white/10 text-white/40 hover:text-white/70'
              }`}>{day}</button>
          ))}
        </div>
      </div>

      {/* CINEMA SELECTOR */}
      <div className="max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-2 mb-12 bg-white/5 backdrop-blur-xl border border-white/10 p-2 rounded-[2rem] relative z-10">
        {cinemaTabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`py-3 md:py-4 rounded-[1.5rem] text-[10px] font-black tracking-widest transition-all ${
              activeTab === tab ? 'bg-white/10 text-yellow-500 shadow-xl' : 'text-white/20 hover:text-white/50'
            }`}>{tab}</button>
        ))}
      </div>

      {/* MOVIES LIST */}
      <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 relative z-10">
        {loading ? (
          <div className="flex justify-center py-20 opacity-40 text-[10px] font-black tracking-widest uppercase animate-pulse">Συγχρονισμός...</div>
        ) : filtered.length > 0 ? (
          filtered.map((m, i) => (
            <div key={i} className="group bg-white/[0.03] backdrop-blur-xl border border-white/10 p-5 md:p-8 rounded-[2.5rem] md:rounded-[3.5rem] flex flex-col md:flex-row items-center gap-6 md:gap-10 hover:bg-white/[0.06] transition-all duration-500">
              
              <a href={m.searchUrl} target="_blank" rel="noopener" className="w-40 h-56 md:w-44 md:h-64 bg-zinc-800 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden flex-shrink-0 shadow-2xl relative block border border-white/10">
                <img src={m.image} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-1000" alt=""/>
              </a>

              <div className="flex-grow text-center md:text-left w-full">
                <div className="flex flex-col md:flex-row items-center gap-2 mb-4">
                  <p className="text-[9px] font-black text-yellow-500/60 tracking-[0.4em] italic uppercase">{m.cinema}</p>
                  <a href={m.cinemaMap} target="_blank" rel="noopener" className="text-[8px] bg-white/5 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-white/50 hover:text-yellow-500 transition-colors uppercase font-bold tracking-tighter">📍 Χάρτης</a>
                </div>
                
                <a href={m.searchUrl} target="_blank" rel="noopener" className="block mb-6 md:mb-8">
                    <h3 className="font-black text-2xl md:text-4xl leading-tight group-hover:text-yellow-500 transition-colors duration-300 drop-shadow-md">{m.title}</h3>
                </a>
                
                <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 md:gap-4">
                  <span className="bg-white text-black px-6 py-2.5 rounded-xl text-sm font-black shadow-lg">
                    {m.schedule[selectedDay]}
                  </span>
                  <a href={m.youtubeUrl} target="_blank" rel="noopener" className="px-6 py-2.5 rounded-xl text-[9px] font-black bg-white/5 backdrop-blur-md border border-white/10 text-white/50 hover:text-red-500 hover:border-red-500/30 transition-all uppercase tracking-widest">🎬 Trailer</a>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-40 opacity-10 border-4 border-dashed border-white/5 rounded-[5rem]"><p className="text-4xl md:text-6xl font-black italic uppercase">ΚΛΕΙΣΤΑ</p></div>
        )}
      </div>

      <footer className="max-w-3xl mx-auto py-20 text-center opacity-10 text-[9px] font-bold tracking-[0.5em] relative z-10">
        &copy; 2026 @alli mia selida gia tainies
      </footer>
    </div>
  );
}