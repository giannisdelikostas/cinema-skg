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
  'APOLLON': { 
    name: 'ΑΠΟΛΛΩΝ', 
    map: 'https://maps.app.goo.gl/apollon',
    tickets: 'https://www.more.com/gr-el/tickets/cinemas/therina-cinema/apollon/'
  },
  'NATALI': { 
    name: 'ΝΑΤΑΛΙ', 
    map: 'https://maps.app.goo.gl/natali',
    tickets: 'https://www.more.com/gr-el/tickets/cinemas/therina-cinema/natali/'
  },
  'ELLINIS': { 
    name: 'ΕΛΛΗΝΙΣ', 
    map: 'https://maps.app.goo.gl/ellinis',
    tickets: 'https://www.more.com/gr-el/tickets/cinemas/therina-cinema/ellinis-1-2/'
  },
  'ALEX': { 
    name: 'CINE ΑΛΕΞ', 
    map: 'https://maps.app.goo.gl/alex',
    tickets: 'https://www.more.com/gr-el/tickets/cinema/cine-alex-1/'
  },
  'BAKOURA': { 
    name: 'ΒΑΚΟΥΡΑ', 
    map: 'https://www.google.com/maps/search/?api=1&query=Βακούρα+Κινηματογράφος+Θεσσαλονίκη',
    tickets: 'https://www.more.com/gr-el/tickets/cinema/kinimatografos-bakoura/'
  },
  'MAKEDONIKON': { 
    name: 'ΜΑΚΕΔΟΝΙΚΟΝ', 
    map: 'https://www.google.com/maps/search/?api=1&query=Μακεδονικόν+Κινηματογράφος+Θεσσαλονίκη',
    tickets: 'https://www.more.com/gr-el/tickets/cinema/festival/kinimatografos-makedonikon/'
  },
  'KOLOSSAION': { 
    name: 'ΚΟΛΟΣΣΑΙΟΝ', 
    map: 'https://www.google.com/maps/search/?api=1&query=Κολοσσαίον+Κινηματογράφος+Θεσσαλονίκη',
    tickets: 'https://www.more.com/gr-el/tickets/cinema/kinimatografos-kolossaion/'
  },
  'OLYMPION': { 
    name: 'ΟΛΥΜΠΙΟΝ', 
    map: 'https://maps.app.goo.gl/EBYrRVxNTpSDBg9d9',
    tickets: 'https://www.more.com/gr-el/venues/filmfestival/'
  }
};

export async function GET() {
  const cinemas = [
    { id: 'APOLLON', url: 'https://www.thessalonikiguide.gr/cinemas/apollon/' },
    { id: 'NATALI', url: 'https://www.thessalonikiguide.gr/cinemas/natali/' },
    { id: 'ELLINIS', url: 'https://www.thessalonikiguide.gr/cinemas/ellinis/' },
    { id: 'ALEX', url: 'https://www.thessalonikiguide.gr/cinemas/cine-alex/' },
    { id: 'BAKOURA', url: 'https://www.thessalonikiguide.gr/cinemas/vakoura/' },
    { id: 'MAKEDONIKON', url: 'https://www.thessalonikiguide.gr/cinemas/makedonikon/' },
    { id: 'KOLOSSAION', url: 'https://www.thessalonikiguide.gr/cinemas/kolossaion/' },
    { id: 'OLYMPION', url: 'https://www.thessalonikiguide.gr/cinemas/olympion/' }
  ];

  let allMovies = [];

  for (const cinema of cinemas) {
    try {
      const response = await fetch(cinema.url, { cache: 'no-store' });
      const html = await response.text();
      const $ = cheerio.load(html);

      $('article').each((i, el) => {
        const rawTitle = $(el).find('h3[itemprop="name"] a').text().trim();
        if (!rawTitle) return;

        const title = toTitleCase(rawTitle);
        
        let image = $(el).find('img.wp-post-image').attr('data-lazy-src') || 
                    $(el).find('img.wp-post-image').attr('src') || 
                    $(el).find('img').attr('src');
        
        if (image) {
          image = image.replace(/-(\d+)x(\d+)\.(jpg|jpeg|png|webp)$/i, '.$3');
        }

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
            ticketsUrl: cinemaData[cinema.id].tickets,
            title: title,
            image: image,
            schedule: schedule,
            youtubeUrl: youtubeUrl
          });
        }
      });

    } catch (error) {
      console.error(`Αποτυχία για ${cinema.id}:`, error);
    }
  }

  return NextResponse.json(allMovies);
}