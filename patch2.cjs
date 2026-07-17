const fs = require('fs');
let text = fs.readFileSync('src/App.tsx', 'utf-8');
text = text.replace(
  'setRekapMempawahCSV(rekapMempawahText);\n      setUsahaTidakDitemukanCSV(usahaText);',
  `let usahaText = '';
      if (usahaRes && usahaRes.ok) { 
        const txt = await usahaRes.text(); 
        if (!txt.trim().startsWith('<!doctype')) usahaText = txt; 
      }
      setRekapMempawahCSV(rekapMempawahText);
      setUsahaTidakDitemukanCSV(usahaText);`
);
fs.writeFileSync('src/App.tsx', text, 'utf-8');
