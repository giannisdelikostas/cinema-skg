import { adminConfigured, isAdmin } from '@/lib/adminAuth';
import { getFilmyList, FILMY_URL } from '@/lib/filmy';
import { getPicks, storeConfigured } from '@/lib/hotStore';
import { posterUrl, resolveFilms, tmdbConfigured } from '@/lib/tmdb';
import AdminClient from './AdminClient';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin | Cinema SKG', robots: { index: false, follow: false } };

function Notice({ title, children }) {
  return (
    <main className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white/[0.03] border border-white/10 rounded-[2rem] p-8 space-y-4">
        <h1 className="text-2xl font-[900] text-yellow-500 italic">{title}</h1>
        <div className="text-white/80 leading-relaxed space-y-3 text-[15px]">{children}</div>
      </div>
    </main>
  );
}

export default async function AdminPage() {
  if (!adminConfigured()) {
    return (
      <Notice title="Χρειάζεται κωδικός">
        <p>Πρόσθεσε στη Vercel (Settings → Environment Variables) τη μεταβλητή <code className="text-yellow-500">ADMIN_PASSWORD</code> με τον κωδικό που θέλεις και κάνε Redeploy.</p>
      </Notice>
    );
  }
  if (!(await isAdmin())) return <LoginForm />;

  const [filmsResult, picks] = await Promise.all([
    getFilmyList().then((films) => ({ films })).catch((error) => ({ error: error.message, films: [] })),
    getPicks(),
  ]);
  const { films } = filmsResult;

  const overrides = Object.fromEntries(Object.entries(picks).filter(([, p]) => p.tmdbId).map(([k, p]) => [k, p.tmdbId]));
  const matches = await resolveFilms(films, overrides);

  const items = films.map((f) => {
    const m = matches.get(f.key);
    return {
      ...f,
      picked: Boolean(picks[f.key]),
      overrideId: picks[f.key]?.tmdbId ?? null,
      match: m ? { id: m.id, title: m.title, year: m.year, poster: posterUrl(m.posterPath, 'w185') } : null,
    };
  });

  return (
    <AdminClient
      items={items}
      filmyUrl={FILMY_URL}
      loadError={filmsResult.error || null}
      storeReady={storeConfigured()}
      tmdbReady={tmdbConfigured()}
    />
  );
}
