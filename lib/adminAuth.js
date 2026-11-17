import { createHash, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

// Απλή προστασία του /admin με κωδικό.
// Ο κωδικός ορίζεται ως Environment Variable ADMIN_PASSWORD στη Vercel.
// Το cookie δεν περιέχει τον κωδικό, μόνο ένα "αποτύπωμα" του (hash).

export const ADMIN_COOKIE = 'cinema_skg_admin';
export const adminConfigured = () => Boolean(process.env.ADMIN_PASSWORD);

export function tokenFor(password) {
  return createHash('sha256').update(`cinema-skg:${password}`).digest('hex');
}

export function passwordMatches(input) {
  if (!adminConfigured() || typeof input !== 'string') return false;
  const a = Buffer.from(tokenFor(input));
  const b = Buffer.from(tokenFor(process.env.ADMIN_PASSWORD));
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function isAdmin() {
  if (!adminConfigured()) return false;
  const jar = await cookies();
  const value = jar.get(ADMIN_COOKIE)?.value;
  return value === tokenFor(process.env.ADMIN_PASSWORD);
}
