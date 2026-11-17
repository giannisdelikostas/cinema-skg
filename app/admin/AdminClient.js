'use client';
import { useMemo, useState, useTransition } from 'react';
import { logout, setPick } from './actions';

const plain = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function AdminClient({ items: initialItems, filmyUrl, loadError, storeReady, tmdbReady }) {
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState('all'); // all | picked
  const [query, setQuery] = useState('');
  const pickedCount = items.filter((i) => i.picked).length;

  const update = (key, patch) => setItems((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  // Ομαδοποίηση ανά ημερομηνία, με τη σειρά του filmy.gr
  const groups = useMemo(() => {
    const q = plain(query.trim());
    const visible = items.filter(
      (i) =>
        (filter === 'all' || i.picked) &&
        (!q || plain(`${i.greekTitle} ${i.originalTitle} ${i.director}`).includes(q))
    );
    const map = new Map();
    for (const i of visible) {
      if (!map.has(i.dateLabel)) map.set(i.dateLabel, []);
      map.get(i.dateLabel).push(i);
    }
    return [...map.entries()];
  }, [items, filter, query]);

  return (
    <main className="min-h-screen bg-[#050505] text-white p-4 md:p-10">
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-[900] text-yellow-500 italic tracking-tight">HOT ΠΡΟΣΕΧΩΣ</h1>
            <p className="text-white/70 mt-2 text-sm">
              Ταινίες από το <a href={filmyUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-yellow-500/50 underline-offset-4 hover:text-yellow-500">filmy.gr</a>.
              Ενεργοποίησε όσες θέλεις να φαίνονται στο site.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/#coming-soon" target="_blank" className="px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider bg-white/5 border border-white/10 hover:border-yellow-500">Δες το site ↗</a>
            <form action={logout}>
              <button className="px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider bg-white/5 border border-white/10 hover:border-red-500 cursor-pointer">Έξοδος</button>
            </form>
          </div>
        </header>

        {!storeReady && (
          <Warning>
            Δεν έχει συνδεθεί ακόμα αποθήκευση. Στη Vercel: <b>Storage → Upstash for Redis → Connect</b> στο project και μετά Redeploy.
            Μέχρι τότε οι επιλογές δεν αποθηκεύονται.
          </Warning>
        )}
        {!tmdbReady && <Warning>Λείπει το <code>TMDB_API_KEY</code>, οπότε δεν γίνεται αντιστοίχιση με το TMDB.</Warning>}
        {loadError && <Warning>Δεν ήταν δυνατή η ανάγνωση του filmy.gr ({loadError}). Δοκίμασε ξανά σε λίγο.</Warning>}

        <div className="sticky top-0 z-10 -mx-4 md:mx-0 px-4 md:px-0 py-3 bg-[#050505]/95 backdrop-blur flex flex-wrap items-center gap-3 mb-6 border-b border-white/10">
          <div className="flex rounded-xl overflow-hidden border border-white/10">
            {[['all', `Όλες (${items.length})`], ['picked', `Επιλεγμένες (${pickedCount})`]].map(([value, label]) => (
              <button key={value} onClick={() => setFilter(value)} aria-pressed={filter === value}
                className={`px-4 py-2.5 text-[11px] font-black uppercase tracking-wider cursor-pointer ${filter === value ? 'bg-yellow-500 text-black' : 'bg-white/5 text-white/70 hover:text-white'}`}>
                {label}
              </button>
            ))}
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Αναζήτηση τίτλου ή σκηνοθέτη…"
            className="flex-1 min-w-[200px] rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm outline-none focus:border-yellow-500"
          />
        </div>

        {groups.length === 0 && <p className="text-white/60 text-center py-20">Δεν βρέθηκαν ταινίες.</p>}

        <div className="space-y-10">
          {groups.map(([label, films]) => (
            <section key={label}>
              <h2 className="text-[12px] font-[900] tracking-[0.25em] uppercase text-yellow-500 mb-3">{label}</h2>
              <div className="space-y-2">
                {films.map((film) => (
                  <FilmRow key={film.key} film={film} storeReady={storeReady} onChange={(patch) => update(film.key, patch)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}

function Warning({ children }) {
  return <div className="mb-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-5 py-4 text-sm text-yellow-100 leading-relaxed">{children}</div>;
}

function FilmRow({ film, storeReady, onChange }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [tmdbInput, setTmdbInput] = useState(film.overrideId ? String(film.overrideId) : '');
  const poster = film.match?.poster || film.poster;

  const toggle = () => {
    const next = !film.picked;
    onChange({ picked: next }); // άμεση αλλαγή στην οθόνη
    setError(null);
    startTransition(async () => {
      const res = await setPick(film.key, next, next ? film.overrideId : null);
      if (res?.error) {
        onChange({ picked: !next }); // επαναφορά αν απέτυχε
        setError(res.error);
      }
    });
  };

  const saveTmdb = () => {
    setError(null);
    startTransition(async () => {
      const res = await setPick(film.key, true, tmdbInput.trim() || null);
      if (res?.error) return setError(res.error);
      onChange({ picked: true, overrideId: res.match?.id ?? null, ...(res.match ? { match: res.match } : {}) });
    });
  };

  return (
    <div className={`rounded-2xl border p-3 md:p-4 flex gap-4 transition-colors ${film.picked ? 'border-yellow-500/50 bg-yellow-500/[0.06]' : 'border-white/10 bg-white/[0.02]'}`}>
      <div className="w-14 h-20 md:w-16 md:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-900 border border-white/10">
        {poster && <img src={poster} alt="" loading="lazy" className="w-full h-full object-cover" />}
      </div>

      <div className="flex-grow min-w-0">
        <p className="font-[900] text-base md:text-lg leading-tight">{film.greekTitle}</p>
        <p className="text-white/60 text-sm mt-0.5">
          {film.originalTitle !== film.greekTitle && <>{film.originalTitle} · </>}
          {film.year}{film.director && <> · {film.director}</>}
        </p>
        <p className="text-[12px] mt-2">
          {film.match ? (
            <span className="text-white/70">
              TMDB:{' '}
              <a href={`https://www.themoviedb.org/movie/${film.match.id}`} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">
                {film.match.title}{film.match.year ? ` (${film.match.year})` : ''} ↗
              </a>
              {film.overrideId && <span className="ml-2 text-yellow-500 font-bold">✎ χειροκίνητο</span>}
            </span>
          ) : (
            <span className="text-orange-300">Δεν βρέθηκε στο TMDB: βάλε id χειροκίνητα</span>
          )}
        </p>

        {film.picked && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              value={tmdbInput}
              onChange={(e) => setTmdbInput(e.target.value)}
              placeholder="Σωστό TMDB id ή link"
              className="w-56 max-w-full rounded-lg bg-black/60 border border-white/15 px-3 py-2 text-sm outline-none focus:border-yellow-500"
            />
            <button onClick={saveTmdb} disabled={pending} className="px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider bg-white/10 hover:bg-white/20 disabled:opacity-50 cursor-pointer">
              Αποθήκευση
            </button>
          </div>
        )}
        {error && <p className="text-red-400 text-sm font-bold mt-2">{error}</p>}
      </div>

      <div className="flex-shrink-0 self-center">
        <button
          type="button"
          role="switch"
          aria-checked={film.picked}
          aria-label={`Εμφάνιση του ${film.greekTitle} στο HOT ΠΡΟΣΕΧΩΣ`}
          disabled={!storeReady}
          onClick={toggle}
          className={`relative w-14 h-8 rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${film.picked ? 'bg-yellow-500' : 'bg-white/15'} ${pending ? 'opacity-70' : ''}`}
        >
          <span className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${film.picked ? 'left-7' : 'left-1'}`} />
        </button>
      </div>
    </div>
  );
}
