import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

function toTitleCase(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const cinemaData = {
  'BAKOURA': { name: 'ΒΑΚΟΥΡΑ', map: 'https://www.google.com/maps/search/?api=1&query=Βακούρα+Κινηματογράφος+Θεσσαλονίκη' },
  'MAKEDONIKON': { name: 'ΜΑΚΕΔΟΝΙΚΟΝ', map: 'https://www.google.com/maps/search/?api=1&query=Μακεδονικόν+Κινηματογράφος+Θεσσαλονίκη' },
  'KOLOSSAION': { name: 'ΚΟΛΟΣΣΑΙΟΝ', map: 'https://www.google.com/maps/search/?api=1&query=Κολοσσαίον+Κινηματογράφος+Θεσσαλονίκη' },
  'OLYMPION': { name: 'ΟΛΥΜΠΙΟΝ', map: 'https://maps.app.goo.gl/EBYrRVxNTpSDBg9d9' }
};

export async function GET() {
  const cinemas = [
    { id: 'BAKOURA', url: 'https://www.thessalonikiguide.gr/cinemas/vakoura/' },
    { id: 'MAKEDONIKON', url: 'https://www.thessalonikiguide.gr/cinemas/makedonikon/' },
    { id: 'KOLOSSAION', url: 'https://www.thessalonikiguide.gr/cinemas/kolossaion/' },
    { id: 'OLYMPION', url: 'https://www.thessalonikiguide.gr/cinemas/olympion/' }
  ];

  try {
    let allMovies = [];
    for (const cinema of cinemas) {
      const response = await fetch(cinema.url, { cache: 'no-store' });
      const html = await response.text();
      const $ = cheerio.load(html);

      $('article').each((i, el) => {
        const rawTitle = $(el).find('h3[itemprop="name"] a').text().trim();
        if (!rawTitle) return;

        const title = toTitleCase(rawTitle);
        
        // ΒΕΛΤΙΩΣΗ ΠΟΙΟΤΗΤΑΣ ΕΙΚΟΝΑΣ
        let image = $(el).find('img.wp-post-image').attr('data-lazy-src') || 
                    $(el).find('img.wp-post-image').attr('src') || 
                    $(el).find('img').attr('src');
        
        if (image) {
          // Αφαιρούμε τα patterns μεγέθους (π.χ. -150x150, -300x200) για να πάρουμε την αυθεντική εικόνα
          image = image.replace(/-(\d+)x(\d+)\.(jpg|jpeg|png|webp)$/i, '.$3');
        }

        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(title + ' ταινία')}`;
        const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' trailer ελληνικα')}`;

        let schedule = {};
        const table = $(el).find('table.python-table');
        
        if (table.length > 0) {
          const headerDays = [];
          table.find('tr.fw-700 td').each((idx, td) => {
            headerDays.push($(td).text().trim());
          });

          table.find('tr').last().find('td').each((idx, td) => {
            const cellHtml = $(td).html() || "";
            const cleanText = cellHtml.replace(/<[^>]+>/g, '\n');
            const lines = cleanText.split('\n');
            const validTime = lines.map(l => l.trim()).find(l => /\d{2}:\d{2}/.test(l));

            if (validTime && headerDays[idx]) {
              schedule[headerDays[idx]] = validTime;
            }
          });
        }

        if (Object.keys(schedule).length > 0) {
          allMovies.push({
            cinema: cinemaData[cinema.id].name,
            cinemaMap: cinemaData[cinema.id].map,
            title: title,
            image: image,
            schedule: schedule,
            searchUrl: searchUrl,
            youtubeUrl: youtubeUrl
          });
        }
      });
    }
    return NextResponse.json(allMovies);
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}