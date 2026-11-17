# Cinema SKG

Το πρόγραμμα των κινηματογράφων της Θεσσαλονίκης σε μία σελίδα — https://cinema-skg.vercel.app

## Ρύθμιση (μία φορά)

Το κλειδί του TMDB δεν είναι πια μέσα στον κώδικα.

1. **Vercel:** Project → Settings → Environment Variables → πρόσθεσε `TMDB_API_KEY` με το κλειδί σου (Production + Preview + Development) και κάνε Redeploy.
2. **Τοπικά:** αντέγραψε το `.env.example` σε `.env.local` και βάλε το κλειδί εκεί. Το `.env.local` δεν ανεβαίνει στο GitHub.

## Τοπική εκτέλεση

```bash
npm install
npm run dev
```

Άνοιξε http://localhost:3000

## Πού είναι τι

| Αρχείο | Τι κάνει |
| --- | --- |
| `lib/cinemas.js` | Η λίστα κινηματογράφων (όνομα, logo, σελίδα πηγής, link εισιτηρίων). Εδώ προσθέτεις/αφαιρείς σινεμά. |
| `lib/schedule.js` | Διαβάζει το πρόγραμμα από το thessalonikiguide.gr (παράλληλα, με cache 1 ώρας). |
| `lib/dates.js` | Ημερομηνίες/ώρες (έτος, ταξινόμηση, μεταμεσονύχτιες προβολές). |
| `app/page.js` | Φτιάχνει τη σελίδα στον server με έτοιμο το πρόγραμμα. |
| `app/components/CinemaApp.js` | Το UI (μέρες, tabs, κάρτες, modal). |
| `app/components/ComingSoon.js` | Η ενότητα «Προσεχώς». |
| `data/upcomingMovies.js` | Οι ταινίες του «Προσεχώς». Ημερομηνίες σε μορφή `YYYY-MM-DD`. |
| `app/api/tmdb/route.js` | Πληροφορίες ταινίας από το TMDB (cache 1 μέρας). |
| `app/api/movies/route.js` | Το πρόγραμμα σε JSON, αν το χρειαστείς. |
