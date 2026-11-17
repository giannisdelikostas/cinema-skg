'use client';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import ComingSoon from './ComingSoon';
import { CINEMAS } from '@/lib/cinemas';
import { athensNowKey, isoToDayLabel, isoToShortDate, timeSortKey, todayInAthens } from '@/lib/dates';

const cleanGreek = (str) => {
  if (!str) return '';
  return str.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
};

const subscribeNoop = () => () => {};
// Ενημέρωση της "τρέχουσας ώρας" κάθε 30", για να γκριζάρουν οι προβολές που ξεκίνησαν.
const subscribeMinute = (callback) => {
  const id = setInterval(callback, 30000);
  return () => clearInterval(id);
};
const ALL = 'ALL';

const logoFor = (cinemaId) => CINEMAS.find((c) => c.id === cinemaId)?.logo || '';
const nameFor = (cinemaId) => CINEMAS.find((c) => c.id === cinemaId)?.name || '';

// Οι ώρες μιας ταινίας για μια μέρα, π.χ. "18:00 · 21:15"
const timesText = (slots) => (slots || []).map((s) => s.time).join(' · ');

export default function CinemaApp({ movies, days, todayIso, hotMovies = [] }) {
  // Η σελίδα μπορεί να έχει φτιαχτεί πριν από λίγη ώρα (cache). Στον browser
  // ξαναϋπολογίζουμε το "σήμερα", ώστε μετά τα μεσάνυχτα να κρυφτεί η χθεσινή μέρα.
  // (Στο πρώτο render χρησιμοποιείται το todayIso του server, για να μην υπάρχει hydration error.)
  const today = useSyncExternalStore(subscribeNoop, () => todayInAthens(), () => todayIso);

  const visibleDays = useMemo(() => {
    const upcoming = days.filter((d) => d >= today);
    return upcoming.length ? upcoming : days;
  }, [days, today]);

  const [pickedDay, setPickedDay] = useState(null);
  const selectedDay = pickedDay && visibleDays.includes(pickedDay) ? pickedDay : visibleDays[0];

  // Κρύβουμε τους κινηματογράφους που δεν έχουν καθόλου πρόγραμμα (π.χ. θερινά τον χειμώνα).
  const cinemasWithData = useMemo(
    () => CINEMAS.filter((c) => movies.some((m) => m.cinemaId === c.id)),
    [movies]
  );
  // Το tab "ΟΛΑ" (όλοι οι κινηματογράφοι μαζί) είναι το προεπιλεγμένο.
  const [pickedTab, setPickedTab] = useState(null);
  const activeTab = pickedTab ?? ALL;
  const isAll = activeTab === ALL;

  const filteredMovies = useMemo(
    () =>
      movies
        .filter((m) => (isAll || m.cinemaId === activeTab) && m.showtimes[selectedDay])
        .sort(
          (a, b) =>
            timeSortKey(a.showtimes[selectedDay][0].time) - timeSortKey(b.showtimes[selectedDay][0].time) ||
            a.title.localeCompare(b.title, 'el')
        ),
    [movies, activeTab, isAll, selectedDay]
  );

  // Δείχνουμε την αίθουσα μόνο όταν ο κινηματογράφος έχει πάνω από μία.
  const showHalls = useMemo(() => {
    const halls = new Set(
      movies
        .filter((m) => m.cinemaId === activeTab)
        .flatMap((m) => Object.values(m.showtimes).flat().map((s) => s.hall))
        .filter(Boolean)
    );
    return halls.size > 1;
  }, [movies, activeTab]);

  // Για το "ΟΛΑ": κάθε προβολή χωριστά, ταξινομημένες κατά ώρα.
  // Όσες έχουν ήδη ξεκινήσει σήμερα πάνε στο τέλος, γκριζαρισμένες.
  const nowKey = useSyncExternalStore(subscribeMinute, athensNowKey, () => null);
  const screenings = useMemo(() => {
    if (!isAll) return { upcoming: [], started: [] };
    const all = filteredMovies
      .flatMap((movie) => movie.showtimes[selectedDay].map((slot) => ({ movie, slot })))
      .sort(
        (a, b) =>
          timeSortKey(a.slot.time) - timeSortKey(b.slot.time) || a.movie.cinema.localeCompare(b.movie.cinema, 'el')
      );
    const hasStarted = (e) => selectedDay === today && nowKey !== null && timeSortKey(e.slot.time) < nowKey;
    return { upcoming: all.filter((e) => !hasStarted(e)), started: all.filter(hasStarted) };
  }, [isAll, filteredMovies, selectedDay, today, nowKey]);

  const hasShowsOn = (cinemaId) => movies.some((m) => m.cinemaId === cinemaId && m.showtimes[selectedDay]);

  // Αν ο κινηματογράφος δεν παίζει τη μέρα που επιλέχθηκε: ποια είναι η επόμενη μέρα με προβολές;
  const nextDayForTab = useMemo(
    () =>
      visibleDays.find(
        (d) => d > selectedDay && movies.some((m) => (isAll || m.cinemaId === activeTab) && m.showtimes[d])
      ) ?? null,
    [visibleDays, selectedDay, movies, activeTab, isAll]
  );

  // ---------- Modal ----------
  // modal = { kind: 'now' | 'soon', list: [...], index }
  const [modal, setModal] = useState(null);
  const [tmdbInfo, setTmdbInfo] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const requestId = useRef(0);

  const loadTmdb = useCallback(async (item) => {
    // Κάθε αίτημα παίρνει αριθμό. Αν ο χρήστης πατήσει γρήγορα "επόμενο",
    // αγνοούμε τις παλιές απαντήσεις που φτάνουν αργότερα.
    const myId = ++requestId.current;
    setModalLoading(true);
    setTmdbInfo(null);
    let info;
    try {
      const query = item.tmdbId ? `id=${item.tmdbId}` : `title=${encodeURIComponent(item.title)}`;
      const res = await fetch(`/api/tmdb?${query}`);
      info = res.ok ? await res.json() : { error: true };
    } catch {
      info = { error: true };
    }
    if (myId !== requestId.current) return;
    setTmdbInfo(info);
    setModalLoading(false);
  }, []);

  const openModal = useCallback(
    (kind, list, index) => {
      setModal({ kind, list, index });
      loadTmdb(list[index]);
    },
    [loadTmdb]
  );

  const closeModal = useCallback(() => {
    requestId.current++;
    setModal(null);
  }, []);

  const navigateModal = useCallback(
    (direction) => {
      if (!modal) return;
      const { list } = modal;
      const index = (modal.index + direction + list.length) % list.length;
      setModal({ ...modal, index });
      loadTmdb(list[index]);
    },
    [modal, loadTmdb]
  );

  // Esc κλείνει, βελάκια αλλάζουν ταινία.
  useEffect(() => {
    if (!modal) return;
    const onKey = (e) => {
      if (e.key === 'Escape') closeModal();
      if (e.key === 'ArrowLeft') navigateModal(-1);
      if (e.key === 'ArrowRight') navigateModal(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal, closeModal, navigateModal]);

  const openInfoModal = (index) => openModal('now', filteredMovies, index);
  const openInfoForMovie = (movie) => {
    const list = isAll
      ? [...new Map([...screenings.upcoming, ...screenings.started].map((e) => [e.movie.id, e.movie])).values()]
      : filteredMovies;
    openModal('now', list, Math.max(0, list.findIndex((m) => m.id === movie.id)));
  };
  const openComingSoonModal = (list, index) => openModal('soon', list, index);

  const current = modal ? modal.list[modal.index] : null;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-10 relative overflow-x-hidden selection:bg-yellow-500 selection:text-black">
      <div className="fixed top-[-10%] left-[-10%] w-[60%] h-[60%] bg-yellow-600/10 rounded-full blur-[120px] pointer-events-none z-0"></div>

      <header className="max-w-3xl mx-auto py-16 md:py-24 border-b border-white/5 mb-12 text-center relative z-10">
        <h1 className="text-6xl md:text-8xl font-[900] text-yellow-500 italic tracking-tighter mb-4 uppercase">{cleanGreek('Cinema SKG')}</h1>
        <p className="text-white/50 text-[10px] md:text-[12px] tracking-[0.4em] font-bold mb-2 uppercase">{cleanGreek('Ολη η Θεσσαλονικη στη μεγαλη οθονη')}</p>
        <p className="text-white/60 text-[10px] tracking-[0.2em] font-medium italic">
          by <a href="https://www.instagram.com/alli.mia.selida.gia.tainies/" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-yellow-500 transition-all underline decoration-yellow-500/20 underline-offset-8 cursor-pointer">alli mia selida gia tainies</a>
        </p>
      </header>

      <div className="max-w-4xl mx-auto mb-10 relative z-10">
        <DayBar days={visibleDays} selectedDay={selectedDay} onSelect={setPickedDay} />

        <div className="flex justify-center mt-4">
          <a href="#coming-soon" className="px-6 py-3 rounded-[1.5rem] text-[11px] font-[900] bg-red-600 hover:bg-red-500 text-white transition-all whitespace-nowrap flex items-center gap-2 animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.4)] uppercase tracking-widest italic">
            🔥 HOT ΠΡΟΣΕΧΩΣ
          </a>
        </div>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-2 mb-16 bg-white/5 backdrop-blur-2xl border border-white/10 p-2 rounded-[2.5rem] md:rounded-full relative z-10">
        <button onClick={() => setPickedTab(ALL)} aria-pressed={isAll}
          className={`py-4 px-6 rounded-full text-[10px] font-[900] tracking-[0.15em] transition-all flex items-center justify-center md:justify-start gap-3 cursor-pointer uppercase ${
            isAll ? 'bg-white/10 text-yellow-500 shadow-xl border border-white/10' : 'text-white/60 hover:text-white/80 border border-transparent'
          }`}>
          <span aria-hidden="true" className="w-8 h-8 rounded-full border border-white/10 bg-yellow-500/10 flex items-center justify-center text-sm">🎬</span>
          <span>{cleanGreek('Ολα')}</span>
        </button>
        {cinemasWithData.map((tab) => {
          const hasShows = hasShowsOn(tab.id);
          return (
            <button key={tab.id} onClick={() => setPickedTab(tab.id)} aria-pressed={activeTab === tab.id}
              className={`py-4 px-6 rounded-full text-[10px] font-[900] tracking-[0.15em] transition-all flex items-center justify-center md:justify-start gap-3 cursor-pointer uppercase ${
                activeTab === tab.id
                  ? 'bg-white/10 text-yellow-500 shadow-xl border border-white/10'
                  : `${hasShows ? 'text-white/60' : 'text-white/35'} hover:text-white/80 border border-transparent`
              }`}>
              <img src={tab.logo} alt="" className={`w-8 h-8 rounded-full object-cover border border-white/10 ${hasShows ? '' : 'opacity-40'}`} />
              <span>{cleanGreek(tab.name)}</span>
            </button>
          );
        })}
      </div>

      <div className="max-w-3xl mx-auto space-y-8 relative z-10">
        {filteredMovies.length > 0 && isAll ? (
          <AllScreenings screenings={screenings} onInfo={openInfoForMovie} />
        ) : filteredMovies.length > 0 ? (
          filteredMovies.map((m, i) => {
            const slots = m.showtimes[selectedDay];
            return (
              <div key={m.id} className="group bg-white/[0.02] border border-white/10 p-6 md:p-10 rounded-[3rem] md:rounded-[4rem] flex flex-col md:flex-row items-center gap-8 md:gap-12 hover:bg-white/[0.05] transition-all duration-700 relative overflow-hidden">
                <div className="flex md:hidden flex-col items-center mb-2 text-center w-full">
                  <img src={logoFor(m.cinemaId)} alt="" className="w-12 h-12 rounded-full object-cover border border-white/10 mb-3" />
                  <p className="text-[10px] font-black text-yellow-500 tracking-[0.3em] italic uppercase mb-1">{cleanGreek(m.cinema)}</p>
                  <Showtimes slots={slots} showHalls={showHalls} className="text-3xl justify-center mb-4" />
                </div>
                <button type="button" aria-label={`Πληροφορίες για ${m.title}`} onClick={() => openInfoModal(i)}
                  className="w-48 h-64 md:w-52 md:h-72 bg-zinc-900 rounded-[2.5rem] md:rounded-[3rem] overflow-hidden flex-shrink-0 shadow-2xl relative border border-white/10 cursor-pointer">
                  {(m.poster || m.image) && <img src={m.poster || m.image} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-all duration-[1.5s]" alt={m.title} />}
                </button>
                <div className="flex-grow text-center md:text-left w-full">
                  <div className="hidden md:flex items-center gap-4 mb-6 bg-white/5 p-5 rounded-full border border-white/5 max-w-fit mx-auto md:mx-0">
                    <img src={logoFor(m.cinemaId)} alt="" className="w-12 h-12 rounded-full object-cover border border-white/10" />
                    <div className="flex items-center gap-4">
                      <p className="text-[10px] font-black text-yellow-500 tracking-[0.3em] italic uppercase leading-none">{cleanGreek(m.cinema)}</p>
                      <Showtimes slots={slots} showHalls={showHalls} className="text-2xl" />
                    </div>
                  </div>
                  <h3 className="font-[900] text-4xl leading-[1.1] mb-8 tracking-tight">
                    <button type="button" onClick={() => openInfoModal(i)} className="text-center md:text-left group-hover:text-yellow-500 transition-colors duration-500 cursor-pointer">{m.title}</button>
                  </h3>
                  <div className="flex flex-row justify-center md:justify-start items-center gap-2 md:gap-4 w-full">
                    <a href={m.youtubeUrl} target="_blank" rel="noopener noreferrer" className="flex-1 md:flex-none text-center px-2 md:px-7 py-3.5 rounded-2xl text-[9px] md:text-[10px] font-black bg-white/5 border border-white/10 text-white/60 hover:text-red-500 transition-all cursor-pointer uppercase tracking-wider">Trailer</a>
                    <button onClick={() => openInfoModal(i)} className="flex-1 md:flex-none text-center px-2 md:px-7 py-3.5 rounded-2xl text-[9px] md:text-[10px] font-black bg-blue-500/5 border border-blue-500/10 text-blue-400/80 hover:bg-blue-500 hover:text-black transition-all cursor-pointer uppercase tracking-wider">Info</button>
                    {m.ticketsUrl && (
                      <a href={m.ticketsUrl} target="_blank" rel="noopener noreferrer" className="flex-1 md:flex-none text-center px-2 md:px-7 py-3.5 rounded-2xl text-[9px] md:text-[10px] font-black bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500 hover:text-black transition-all cursor-pointer uppercase tracking-wider shadow-[0_0_20px_rgba(34,197,94,0.1)]">Tickets</a>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-32 md:py-40 border-4 border-dashed border-white/5 rounded-[5rem] flex flex-col items-center gap-8 px-6">
            <p className="opacity-40 text-4xl md:text-6xl font-[900] italic uppercase tracking-tighter">
              {cleanGreek(!movies.length ? 'Δεν υπαρχει προγραμμα' : nextDayForTab ? (selectedDay === today ? 'Χωρις προβολες σημερα' : 'Χωρις προβολες αυτη τη μερα') : 'Κλειστα')}
            </p>
            {nextDayForTab && (
              <button
                type="button"
                onClick={() => setPickedDay(nextDayForTab)}
                className="px-8 py-4 rounded-[1.5rem] text-[11px] font-[900] uppercase tracking-wider bg-yellow-500 text-black hover:bg-yellow-400 transition-all cursor-pointer shadow-lg"
              >
                {cleanGreek(`Επομενες προβολες: ${isoToDayLabel(nextDayForTab)}`)} →
              </button>
            )}
          </div>
        )}
      </div>

      <ComingSoon movies={hotMovies} today={today} onOpenModal={openComingSoonModal} />

      <footer className="max-w-3xl mx-auto py-32 text-center relative z-10">
        <div className="opacity-50 text-[10px] font-black tracking-[0.6em] mb-6 uppercase">© {today.slice(0, 4)} {cleanGreek('Cinema SKG')}</div>
        <a href="https://www.instagram.com/alli.mia.selida.gia.tainies/" target="_blank" rel="noopener noreferrer" className="opacity-40 hover:opacity-100 hover:text-yellow-500 transition-all text-[11px] font-[900] tracking-widest uppercase border border-white/5 px-6 py-3 rounded-full hover:bg-white/5">alli mia selida gia tainies</a>
      </footer>

      {modal && current && (
        <div role="dialog" aria-modal="true" aria-label={current.title}
          className="fixed inset-0 z-[100] overflow-y-auto bg-black/95 backdrop-blur-xl animate-in fade-in duration-300" onClick={closeModal}>
          {modal.list.length > 1 && (
            <>
              <button aria-label="Προηγούμενη ταινία" onClick={(e) => { e.stopPropagation(); navigateModal(-1); }} className="fixed left-4 md:left-10 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-yellow-500 hover:text-black transition-all z-[110] cursor-pointer shadow-2xl backdrop-blur-md">←</button>
              <button aria-label="Επόμενη ταινία" onClick={(e) => { e.stopPropagation(); navigateModal(1); }} className="fixed right-4 md:right-10 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-yellow-500 hover:text-black transition-all z-[110] cursor-pointer shadow-2xl backdrop-blur-md">→</button>
            </>
          )}

          <div className="flex min-h-full items-center justify-center p-4 md:p-6 cursor-default">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-[3rem] p-8 md:p-12 max-w-lg w-full relative shadow-2xl my-8 overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <button aria-label="Κλείσιμο" onClick={closeModal} className="absolute top-6 right-6 bg-white/5 w-12 h-12 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-black transition-all font-bold z-20 cursor-pointer text-xl">✕</button>

              <div className="flex flex-col items-center mb-8 text-center uppercase">
                {modal.kind === 'now' ? (
                  <>
                    <img src={logoFor(current.cinemaId)} alt="" className="w-14 h-14 rounded-full border border-white/10 object-cover shadow-lg mb-4" />
                    <p className="text-yellow-500 font-[900] tracking-[0.2em] italic text-xs leading-none mb-2">{cleanGreek(nameFor(current.cinemaId))}</p>
                    <p className="text-white font-[900] text-2xl tracking-tighter leading-none">{timesText(current.showtimes[selectedDay])}</p>
                  </>
                ) : (
                  <>
                    <p className="text-yellow-500 font-[900] tracking-[0.2em] italic text-[10px] leading-none mb-2 uppercase">Ημερομηνια Πρεμιερας</p>
                    <p className="text-white font-[900] text-3xl tracking-tighter leading-none italic">{current.date ? isoToShortDate(current.date) : 'ΣΥΝΤΟΜΑ'}</p>
                  </>
                )}
              </div>

              <div className="w-full max-w-[260px] mx-auto mb-8 rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl aspect-[2/3] relative bg-zinc-900">
                {/* Οι αφίσες της πηγής είναι μικρές. Μόλις έρθει η αφίσα του TMDB (υψηλή ανάλυση) τη δείχνουμε
                    από πάνω· μέχρι τότε (ή αν δεν βρεθεί) μένει η αρχική. */}
                {modal.kind === 'now' && (current.poster || current.image) && (
                  <img src={current.poster || current.image} alt={current.title} className="absolute inset-0 w-full h-full object-cover" />
                )}
                {!modalLoading && (tmdbInfo?.posterHd || tmdbInfo?.poster) && (
                  <img key={tmdbInfo.posterHd || tmdbInfo.poster} src={tmdbInfo.posterHd || tmdbInfo.poster} alt={current.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-500"
                    onLoad={(e) => e.currentTarget.classList.remove('opacity-0')} />
                )}
              </div>

              <h2 className="text-3xl md:text-4xl font-[900] text-yellow-500 mb-10 leading-tight tracking-tight italic text-center mx-auto max-w-[90%]">{current.title}</h2>

              {modalLoading ? (
                <div className="py-24 text-center text-white/50 animate-pulse text-[11px] font-black tracking-[0.5em] uppercase">{cleanGreek('Φορτωση...')}</div>
              ) : tmdbInfo?.error ? (
                <div className="py-24 text-center text-red-400/60 text-[11px] font-black tracking-[0.5em] border border-red-500/10 rounded-[2rem] uppercase">{cleanGreek('Δεν βρεθηκαν πληροφοριες')}</div>
              ) : tmdbInfo ? (
                <div className="space-y-8 text-white/80 animate-in slide-in-from-bottom-4 duration-500">
                  <div className="grid grid-cols-2 gap-y-8 gap-x-4 border-y border-white/5 py-8">
                    <div className="flex flex-col items-center text-center px-2">
                      <span className="text-white/70 uppercase text-[10px] font-[900] tracking-[0.15em] mb-2">{cleanGreek('Βαθμολογια')}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-yellow-500 text-lg">★</span>
                        <span className="text-yellow-500 font-black text-xl leading-none italic">
                          {tmdbInfo.rating && tmdbInfo.rating !== '-' ? tmdbInfo.rating : cleanGreek('TBD')}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center text-center px-2 border-l border-white/5">
                      <span className="text-white/70 uppercase text-[10px] font-[900] tracking-[0.15em] mb-2">{cleanGreek('Ετος')}</span>
                      <span className="font-bold text-white text-lg italic">{tmdbInfo.year}</span>
                    </div>
                    <div className="flex flex-col items-center text-center px-2 border-t border-white/5 pt-8">
                      <span className="text-white/70 uppercase text-[10px] font-[900] tracking-[0.15em] mb-2">{cleanGreek('Διαρκεια')}</span>
                      <span className="font-bold text-white text-lg italic">{tmdbInfo.runtime}′</span>
                    </div>
                    <div className="flex flex-col items-center text-center px-2 border-l border-t border-white/5 pt-8">
                      <span className="text-white/70 uppercase text-[10px] font-[900] tracking-[0.15em] mb-2">{cleanGreek('Ειδος')}</span>
                      <span className="font-medium text-white/90 text-[12px] leading-tight italic line-clamp-2">{tmdbInfo.genres}</span>
                    </div>
                  </div>

                  <div className="bg-white/[0.02] p-7 rounded-[2.5rem] border border-white/5">
                    <p className="text-yellow-500/60 uppercase text-[10px] font-black tracking-[0.3em] mb-4 text-center">{cleanGreek('Περιληψη')}</p>
                    <p className="leading-relaxed text-[15px] text-white/80 font-medium italic text-center">&ldquo;{tmdbInfo.overview}&rdquo;</p>
                  </div>

                  <div className="bg-white/[0.02] p-7 rounded-[2.5rem] border border-white/5">
                    <p className="text-yellow-500/60 uppercase text-[10px] font-black tracking-[0.3em] mb-4 text-center">{cleanGreek('Πρωταγωνιστουν')}</p>
                    <p className="text-[14px] text-white/70 font-semibold text-center italic">{tmdbInfo.cast}</p>
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

// Όλες οι προβολές της μέρας. Αν ο κινηματογράφος έχει πολλές αίθουσες, φαίνεται και η αίθουσα.
function Showtimes({ slots, showHalls, className = '' }) {
  return (
    <div className={`flex flex-wrap items-baseline gap-x-4 gap-y-1 ${className}`}>
      {slots.map((s, idx) => (
        <span key={`${s.time}-${idx}`} className="text-white font-[900] tracking-tighter leading-none whitespace-nowrap">
          {s.time}
          {showHalls && s.hall && (
            <span className="ml-1.5 text-[10px] font-bold tracking-wider text-white/60 align-middle">{s.hall.replace('Αίθουσα', 'ΑΙΘ.')}</span>
          )}
        </span>
      ))}
    </div>
  );
}

// Η μπάρα με τις μέρες: κυλάει οριζόντια, με βελάκια που εμφανίζονται μόνο όταν
// υπάρχουν κι άλλες μέρες προς εκείνη την κατεύθυνση.
function DayBar({ days, selectedDay, onSelect }) {
  const scroller = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const update = () => {
      setCanLeft(el.scrollLeft > 4);
      setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };
    const observer = new ResizeObserver(update);
    observer.observe(el);
    el.addEventListener('scroll', update, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener('scroll', update);
    };
  }, [days.length]);

  // Η επιλεγμένη μέρα έρχεται πάντα σε θέα (π.χ. όταν πατηθεί το "Επόμενες προβολές").
  useEffect(() => {
    scroller.current
      ?.querySelector('[aria-pressed="true"]')
      ?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
  }, [selectedDay]);

  const scrollBy = (direction) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.7, behavior: 'smooth' });
  };

  const arrow = 'absolute top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-zinc-900/90 border border-white/10 flex items-center justify-center text-white hover:bg-yellow-500 hover:text-black transition-all cursor-pointer shadow-2xl';

  return (
    <div className="relative">
      {canLeft && (
        <>
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#050505] to-transparent z-10" />
          <button type="button" aria-label="Προηγούμενες μέρες" onClick={() => scrollBy(-1)} className={`${arrow} left-0`}>←</button>
        </>
      )}

      <div ref={scroller} className="overflow-x-auto py-3 px-2 no-scrollbar scroll-smooth">
        {/* w-max + mx-auto: στο κέντρο όταν χωράνε, κανονικό scroll όταν δεν χωράνε */}
        <div className="flex gap-3 items-center w-max mx-auto">
        {days.map((day) => (
          <button key={day} onClick={() => onSelect(day)} aria-pressed={selectedDay === day}
            className={`px-6 py-4 rounded-[1.5rem] text-[11px] font-[900] border transition-all whitespace-nowrap flex-shrink-0 cursor-pointer uppercase tracking-wider ${
              selectedDay === day
                ? 'bg-yellow-500 border-yellow-500 text-black shadow-lg scale-105'
                : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80'
            }`}>{cleanGreek(isoToDayLabel(day))}</button>
        ))}
        </div>
      </div>

      {canRight && (
        <>
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#050505] to-transparent z-10" />
          <button type="button" aria-label="Επόμενες μέρες" onClick={() => scrollBy(1)} className={`${arrow} right-0`}>→</button>
        </>
      )}
    </div>
  );
}

// Προβολή "ΟΛΑ": όλες οι προβολές της μέρας από όλους τους κινηματογράφους, κατά ώρα.
function AllScreenings({ screenings, onInfo }) {
  const { upcoming, started } = screenings;
  return (
    <div className="space-y-3">
      {upcoming.map((e, i) => (
        <ScreeningRow key={`u-${e.movie.id}-${e.slot.time}-${i}`} entry={e} onInfo={onInfo} />
      ))}
      {started.length > 0 && (
        <>
          <p className="pt-8 pb-2 text-center text-[11px] font-[900] tracking-[0.3em] uppercase text-white/50">
            {cleanGreek('Εχουν ηδη ξεκινησει')}
          </p>
          {started.map((e, i) => (
            <ScreeningRow key={`s-${e.movie.id}-${e.slot.time}-${i}`} entry={e} onInfo={onInfo} started />
          ))}
        </>
      )}
    </div>
  );
}

function ScreeningRow({ entry, onInfo, started = false }) {
  const { movie: m, slot } = entry;
  return (
    <div className={`group flex items-center gap-4 md:gap-6 bg-white/[0.02] border border-white/10 p-3 md:p-4 rounded-[2rem] hover:bg-white/[0.05] transition-all ${started ? 'opacity-40 grayscale' : ''}`}>
      <div className="w-16 md:w-24 flex-shrink-0 text-center">
        <p className={`font-[900] tracking-tighter leading-none text-2xl md:text-4xl ${started ? 'text-white' : 'text-yellow-500'}`}>{slot.time}</p>
        {started && <p className="mt-1 text-[9px] font-black tracking-widest text-white/70 uppercase">{cleanGreek('Ξεκινησε')}</p>}
      </div>

      <button type="button" aria-label={`Πληροφορίες για ${m.title}`} onClick={() => onInfo(m)}
        className="w-14 h-20 md:w-16 md:h-24 bg-zinc-900 rounded-xl overflow-hidden flex-shrink-0 border border-white/10 cursor-pointer">
        {(m.posterThumb || m.image) && <img src={m.posterThumb || m.image} loading="lazy" alt={m.title} className="w-full h-full object-cover" />}
      </button>

      <div className="flex-grow min-w-0">
        <button type="button" onClick={() => onInfo(m)}
          className="block text-left font-[900] text-base md:text-xl leading-tight tracking-tight group-hover:text-yellow-500 transition-colors cursor-pointer">
          {m.title}
        </button>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <img src={logoFor(m.cinemaId)} alt="" className="w-5 h-5 rounded-full object-cover border border-white/10" />
          <span className="text-[10px] font-black text-yellow-500/90 tracking-[0.2em] uppercase">{cleanGreek(m.cinema)}</span>
          {slot.hall && <span className="text-[10px] font-bold text-white/60 tracking-wider uppercase">· {cleanGreek(slot.hall)}</span>}
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
        <a href={m.youtubeUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2.5 rounded-xl text-[10px] font-black bg-white/5 border border-white/10 text-white/70 hover:text-red-500 transition-all uppercase tracking-wider">Trailer</a>
        {m.ticketsUrl && (
          <a href={m.ticketsUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2.5 rounded-xl text-[10px] font-black bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500 hover:text-black transition-all uppercase tracking-wider">Tickets</a>
        )}
      </div>
      {m.ticketsUrl && (
        <a href={m.ticketsUrl} target="_blank" rel="noopener noreferrer" aria-label="Εισιτήρια"
          className="sm:hidden flex-shrink-0 w-10 h-10 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 flex items-center justify-center">🎟</a>
      )}
    </div>
  );
}
