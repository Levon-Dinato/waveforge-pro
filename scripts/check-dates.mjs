import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
function curlGet(url) {
  const r = spawnSync('curl.exe', ['-s', '--max-time', '20', url], { encoding: 'utf8', maxBuffer: 100 * 1024 * 1024 });
  return r.stdout || '';
}
const genres = [{ id: '17', label: 'Dance' }, { id: '7', label: 'Electronic' }];
const countries = ['fr', 'us', 'gb', 'de'];
const yearCounts = {};
let total2026 = 0, totalOld = 0;
for (const c of countries) {
  for (const g of genres) {
    const url = `https://itunes.apple.com/${c}/rss/topsongs/limit=100/genre=${g.id}/explicit=true/json`;
    try {
      const j = JSON.parse(curlGet(url));
      const entries = j?.feed?.entry || [];
      for (const e of entries) {
        const dateStr = e?.['im:releaseDate']?.label || '';
        const year = dateStr.slice(0, 4) || '?';
        yearCounts[year] = (yearCounts[year] || 0) + 1;
        if (year >= '2026') total2026++; else totalOld++;
      }
    } catch (err) { console.log('ERR', c, g.label, err.message); }
  }
}
console.log('YEARS', JSON.stringify(yearCounts));
console.log('2026+:', total2026, '| older:', totalOld);
appendFileSync('check-dates.txt', 'YEARS ' + JSON.stringify(yearCounts) + '\n2026+: ' + total2026 + ' | older: ' + totalOld + '\n');
