const https = require('https');
const spreadsheetId = '14L1hS4bVd8d64Z5zXWc1P0e-YhH_oD98835s6-XlCis';
const urlProgres = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('live progres')}`;
const urlRekap = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('rekap kumulatif PPL-realtime')}`;

function fetchData(url, name) {
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const lines = data.split('\n');
      console.log(`--- ${name} ---`);
      let count = 0;
      lines.forEach(line => {
        if (line.toLowerCase().includes('suci')) {
          console.log(line);
        }
        count++;
      });
      console.log(`${name}: ${count} total lines.`);
    });
  });
}

fetchData(urlProgres, 'LIVE PROGRES');
fetchData(urlRekap, 'REKAP');
