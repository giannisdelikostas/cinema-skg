import CinemaApp from './components/CinemaApp';
import { getSchedule } from '@/lib/schedule';
import { getHotMovies } from '@/lib/hot';

// Η σελίδα φτιάχνεται στον server και ανανεώνεται το πολύ μία φορά την ώρα.
// Ο επισκέπτης βλέπει το πρόγραμμα αμέσως, χωρίς "Συγχρονισμός...".
export const revalidate = 3600;

export default async function Page() {
  const [schedule, hotMovies] = await Promise.all([getSchedule(), getHotMovies()]);
  return <CinemaApp {...schedule} hotMovies={hotMovies} />;
}
