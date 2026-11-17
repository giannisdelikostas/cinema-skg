// Βοηθητικά για ημερομηνίες/ώρες. Χρησιμοποιούνται και στον server και στον browser.

const TZ = 'Europe/Athens';

// Σημερινή ημερομηνία στην Ελλάδα ως "YYYY-MM-DD" (ο server της Vercel τρέχει σε UTC).
export function todayInAthens(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now);
}

function toIso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// "Πε 12/11" ή "12/11" -> "2026-11-12".
// Το έτος δεν υπάρχει στην πηγή, οπότε διαλέγουμε αυτό που φέρνει την ημερομηνία
// πιο κοντά στο σήμερα (έτσι το "1/1" στα τέλη Δεκεμβρίου πάει στη νέα χρονιά).
export function dayLabelToIso(label, todayIso = todayInAthens()) {
  const match = String(label).match(/(\d{1,2})\/(\d{1,2})/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const [ty, tm, td] = todayIso.split('-').map(Number);
  const today = Date.UTC(ty, tm - 1, td);

  let best = null;
  for (const year of [ty - 1, ty, ty + 1]) {
    const diff = Math.abs(Date.UTC(year, month - 1, day) - today);
    if (!best || diff < best.diff) best = { year, diff };
  }
  return toIso(best.year, month, day);
}

// "21.15" / "9:05" -> "21:15" / "09:05"
export function normalizeTime(raw) {
  const match = String(raw).match(/(\d{1,2})[:.](\d{2})/);
  if (!match) return null;
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

// Λεπτά για ταξινόμηση. Οι μεταμεσονύχτιες προβολές (00:00–04:59) μετράνε
// ως συνέχεια της ίδιας βραδιάς, οπότε μπαίνουν στο τέλος και όχι στην αρχή.
export function timeSortKey(time) {
  const [h, m] = time.split(':').map(Number);
  return (h < 5 ? h + 24 : h) * 60 + m;
}

const GREEK_DAYS = ['Κυ', 'Δε', 'Τρ', 'Τε', 'Πε', 'Πα', 'Σα'];

// "2026-11-12" -> "Πε 12/11" (ίδια μορφή με την πηγή)
export function isoToDayLabel(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${GREEK_DAYS[weekday]} ${d}/${m}`;
}

// "2026-12-17" -> "17/12"
export function isoToShortDate(iso) {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

// Τρέχουσα ώρα Ελλάδας σε λεπτά, για να ξέρουμε ποιες προβολές έχουν ξεκινήσει.
// Μετά τα μεσάνυχτα (00:00–04:59) επιστρέφει 0: η "βραδιά" θεωρείται ότι δεν έχει τελειώσει.
export function athensNowKey(now = new Date()) {
  const [h, m] = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .format(now)
    .split(':')
    .map(Number);
  return h < 5 ? 0 : h * 60 + m;
}
