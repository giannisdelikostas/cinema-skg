import CinemaApp from './components/CinemaApp';
import { getSchedule } from '@/lib/schedule';

// Η σελίδα φτιάχνεται στον server και ανανεώνεται το πολύ μία φορά την ώρα.
// Ο επισκέπτης βλέπει το πρόγραμμα αμέσως, χωρίς "Συγχρονισμός...".
export const revalidate = 3600;

export default async function Page() {
  const schedule = await getSchedule();
  return <CinemaApp {...schedule} />;
}
