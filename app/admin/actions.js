'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, isAdmin, passwordMatches, tokenFor } from '@/lib/adminAuth';
import { savePick } from '@/lib/hotStore';
import { movieById, posterUrl } from '@/lib/tmdb';

export async function login(_prevState, formData) {
  const password = formData.get('password');
  if (!passwordMatches(password)) {
    // μικρή καθυστέρηση ώστε να μη δοκιμάζονται εύκολα πολλοί κωδικοί
    await new Promise((r) => setTimeout(r, 800));
    return { error: 'Λάθος κωδικός' };
  }
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, tokenFor(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/admin',
    maxAge: 60 * 60 * 24 * 30, // 30 μέρες
  });
  redirect('/admin');
}

export async function logout() {
  const jar = await cookies();
  jar.delete({ name: ADMIN_COOKIE, path: '/admin' });
  redirect('/admin');
}

// Ενεργοποίηση/απενεργοποίηση μιας ταινίας στο HOT ΠΡΟΣΕΧΩΣ (και προαιρετικά σωστό TMDB id).
export async function setPick(key, on, tmdbId = null) {
  if (!(await isAdmin())) return { error: 'Δεν είστε συνδεδεμένος' };
  // Δεκτό και ολόκληρο link: "themoviedb.org/movie/1516518-otec" -> 1516518
  const id = tmdbId ? Number(String(tmdbId).match(/movie\/(\d+)/)?.[1] || String(tmdbId).match(/\d+/)?.[0]) : null;
  if (tmdbId && !id) return { error: 'Το TMDB id πρέπει να είναι αριθμός' };
  try {
    let match = null;
    if (id) {
      match = await movieById(id); // ελέγχει ότι υπάρχει
      match = { ...match, poster: posterUrl(match.posterPath, 'w185') };
    }
    await savePick(key, on, id);
    revalidatePath('/'); // η αρχική σελίδα ενημερώνεται αμέσως
    return { ok: true, match };
  } catch (error) {
    console.error('setPick:', error);
    return { error: id ? 'Δεν βρέθηκε ταινία με αυτό το TMDB id' : 'Η αποθήκευση απέτυχε' };
  }
}
