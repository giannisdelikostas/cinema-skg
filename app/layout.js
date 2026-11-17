import { Inter } from "next/font/google";
import "./globals.css";

// Μία γραμματοσειρά, φορτωμένη από το Next (χωρίς @import), με ελληνικούς χαρακτήρες.
const inter = Inter({
  subsets: ["latin", "greek"],
  display: "swap",
});

export const metadata = {
  title: "Cinema SKG | Οδηγός Ταινιών",
  description: "Δείτε το πρόγραμμα των κινηματογράφων της Θεσσαλονίκης σε πραγματικό χρόνο.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="el" className={`${inter.className} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
