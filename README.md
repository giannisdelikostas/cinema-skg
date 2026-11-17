# Cinema SKG

Το πρόγραμμα των κινηματογράφων της Θεσσαλονίκης σε μία σελίδα — https://cinema-skg.vercel.app

## Ρύθμιση (μία φορά)

Το κλειδί του TMDB δεν είναι πια μέσα στον κώδικα.

1. **Vercel:** Project → Settings → Environment Variables → πρόσθεσε `TMDB_API_KEY` με το κλειδί σου (Production + Preview + Development) και κάνε Redeploy.
2. **Τοπικά:** αντέγραψε το `.env.example` σε `.env.local` και βάλε το κλειδί εκεί. Το `.env.local` δεν ανεβαίνει στο GitHub.

## HOT ΠΡΟΣΕΧΩΣ από το filmy.gr (σελίδα /admin)

Στο `https://cinema-skg.vercel.app/admin` βλέπεις όλες τις ταινίες του
[filmy.gr – Προσεχώς](https://www.filmy.gr/to-be-released-in-greece/) και με ένα διακόπτη διαλέγεις
ποιες εμφανίζονται στο HOT ΠΡΟΣΕΧΩΣ. Η ημερομηνία έρχεται πάντα από το filmy (αν αλλάξει, αλλάζει και στο site)
και κάθε ταινία εξαφανίζεται μόνη της όταν κυκλοφορήσει.

Χρειάζονται (μία φορά):
1. **Αποθήκευση:** Vercel → project → **Storage** → **Upstash for Redis** (δωρεάν) → Create / Connect στο project.
   Οι μεταβλητές `KV_REST_API_URL` και `KV_REST_API_TOKEN` μπαίνουν αυτόματα.
2. **Κωδικός:** Settings → Environment Variables → `ADMIN_PASSWORD` = ο κωδικός σου.
3. **Redeploy.**

Αν το TMDB βρει λάθος ταινία, γράψε στο κουτί της το σωστό TMDB id ή απλώς επικόλλησε το link της ταινίας από το themoviedb.org.
Το `data/upcomingMovies.js` συνεχίζει να δουλεύει για ταινίες που δεν είναι στο filmy.

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
| `app/admin/` | Η σελίδα διαχείρισης του HOT ΠΡΟΣΕΧΩΣ. |
| `lib/filmy.js` | Διαβάζει τη λίστα "Προσεχώς" του filmy.gr. |
| `lib/hot.js`, `lib/hotStore.js` | Η λίστα του HOT ΠΡΟΣΕΧΩΣ και η αποθήκευση των επιλογών (Upstash). |
| `lib/tmdb.js`, `lib/tmdbOverrides.js` | Αναζήτηση στο TMDB και χειροκίνητες διορθώσεις τίτλων. |
