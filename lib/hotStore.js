// Αποθήκευση των επιλογών του HOT ΠΡΟΣΕΧΩΣ στο Upstash Redis (μέσω του REST API του, χωρίς επιπλέον πακέτο).
// Τα στοιχεία σύνδεσης μπαίνουν αυτόματα από τη Vercel όταν συνδέσεις το Upstash στο project
// (Storage → Upstash for Redis). Υποστηρίζονται και τα δύο ονόματα που χρησιμοποιεί η Vercel.

const KEY = 'cinema-skg:hot-picks';

function config() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

export const storeConfigured = () => Boolean(config());

async function command(args) {
  const cfg = config();
  if (!cfg) throw new Error('Το Upstash δεν έχει συνδεθεί');
  const res = await fetch(cfg.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(`Upstash: ${data.error || res.status}`);
  return data.result;
}

// { [filmyKey]: { tmdbId: number|null, addedAt: string } }
export async function getPicks() {
  if (!storeConfigured()) return {};
  try {
    const raw = await command(['GET', KEY]);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error('Αποτυχία ανάγνωσης επιλογών:', error.message);
    return {};
  }
}

// on=true: προσθήκη/ενημέρωση, on=false: αφαίρεση
export async function savePick(key, on, tmdbId = null) {
  const picks = await getPicks();
  if (on) {
    picks[key] = { tmdbId: tmdbId || null, addedAt: picks[key]?.addedAt || new Date().toISOString() };
  } else {
    delete picks[key];
  }
  await command(['SET', KEY, JSON.stringify(picks)]);
  return picks;
}
