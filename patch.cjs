const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. State for Usaha Tidak Ditemukan
const stateCode = `
  // Usaha Tidak Ditemukan States
  const [usahaTidakDitemukanCSV, setUsahaTidakDitemukanCSV] = useState<string>('');
  const [usahaTablePage, setUsahaTablePage] = useState<number>(1);
  const [usahaItemsPerPage, setUsahaItemsPerPage] = useState<number>(10);
  const [selectedUsahaKecFilter, setSelectedUsahaKecFilter] = useState<string>('ALL');
  const [selectedUsahaDesaFilter, setSelectedUsahaDesaFilter] = useState<string>('ALL');
  const [selectedUsahaSlsFilter, setSelectedUsahaSlsFilter] = useState<string>('ALL');
`;
content = content.replace('  const trackerDropdownRef = useRef<HTMLDivElement>(null);', stateCode + '\n  const trackerDropdownRef = useRef<HTMLDivElement>(null);');

// 2. Fetch URLs
const fetchUrls = `
      const rekapMempawahUrl = \`https://docs.google.com/spreadsheets/d/\${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=\${encodeURIComponent('Rekap Mempawah')}\`;
      const usahaTidakDitemukanUrl = \`https://docs.google.com/spreadsheets/d/\${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=\${encodeURIComponent('Usaha Tidak Ditemukan')}\`;

      const [rekapRes, rekapHarianRes, progresHarianRes, rekapMempawahRes, usahaRes] = await Promise.all([
        fetch(rekapUrl),
        fetch(rekapHarianUrl),
        fetch(progresHarianUrl),
        fetch(rekapMempawahUrl).catch(e => {
          console.warn('Rekap Mempawah sheet fetch failed, using fallback:', e);
          return { ok: false } as Response;
        }),
        fetch(usahaTidakDitemukanUrl).catch(e => {
          console.warn('Usaha Tidak Ditemukan sheet fetch failed', e);
          return { ok: false } as Response;
        })
      ]);
`;
content = content.replace(/const rekapMempawahUrl = `https:\/\/docs\.google\.com\/spreadsheets\/d\/\$\{spreadsheetId\}\/gviz\/tq\?tqx=out:csv&sheet=\$\{encodeURIComponent\('Rekap Mempawah'\)\}`;[\s\S]*?\]\);/, fetchUrls.trim());

// 3. Handle Usaha Text
const textHandle = `
      let rekapMempawahText = FALLBACK_REKAP_MEMPAWA_CSV;

      if (rekapMempawahRes.ok) {
        const text = await rekapMempawahRes.text();
        if (!text.trim().startsWith('<!doctype')) {
          rekapMempawahText = text;
        }
      }

      let usahaText = '';
      if (usahaRes.ok) {
        const text = await usahaRes.text();
        if (!text.trim().startsWith('<!doctype')) {
          usahaText = text;
        }
      }
`;
content = content.replace(/let rekapMempawahText = FALLBACK_REKAP_MEMPAWA_CSV;[\s\S]*?\}\n/, textHandle.trim() + '\n');

// 4. Set Usaha CSV
const setCsv = `
      setRekapMempawahCSV(rekapMempawahText);
      setUsahaTidakDitemukanCSV(usahaText);
`;
content = content.replace('      setRekapMempawahCSV(rekapMempawahText);', setCsv.trim());

// 5. Parsing & Filtering Logic
const parseCode = `
  // Usaha Tidak Ditemukan Logic
  const parsedUsahaRecords = useMemo(() => {
    return parseUsahaTidakDitemukanCSV(usahaTidakDitemukanCSV);
  }, [usahaTidakDitemukanCSV]);

  const usahaFilters = useMemo(() => {
    const kecamatans = new Set<string>();
    const desas = new Set<string>();
    const slss = new Set<string>();
    
    parsedUsahaRecords.forEach(rec => {
      if (rec.kecamatan) kecamatans.add(rec.kecamatan);
      
      const matchKec = selectedUsahaKecFilter === 'ALL' || rec.kecamatan === selectedUsahaKecFilter;
      const matchDesa = selectedUsahaDesaFilter === 'ALL' || rec.desa === selectedUsahaDesaFilter;

      if (matchKec && rec.desa) desas.add(rec.desa);
      if (matchKec && matchDesa && rec.sls) slss.add(rec.sls);
    });
    
    return {
      kecamatans: Array.from(kecamatans).sort(),
      desas: Array.from(desas).sort(),
      slss: Array.from(slss).sort()
    };
  }, [parsedUsahaRecords, selectedUsahaKecFilter, selectedUsahaDesaFilter]);

  const filteredUsahaRecords = useMemo(() => {
    return parsedUsahaRecords.filter(rec => {
      const matchKec = selectedUsahaKecFilter === 'ALL' || rec.kecamatan === selectedUsahaKecFilter;
      const matchDesa = selectedUsahaDesaFilter === 'ALL' || rec.desa === selectedUsahaDesaFilter;
      const matchSls = selectedUsahaSlsFilter === 'ALL' || rec.sls === selectedUsahaSlsFilter;
      const matchPml = selectedPml === 'ALL' || rec.pml === selectedPml;
      const matchPpl = selectedPpl === 'ALL' || rec.ppl === selectedPpl;
      
      const matchPj = selectedMempawahPjFilter === 'ALL' || rec.pj === selectedMempawahPjFilter; 

      return matchKec && matchDesa && matchSls && matchPml && matchPpl && matchPj;
    });
  }, [parsedUsahaRecords, selectedUsahaKecFilter, selectedUsahaDesaFilter, selectedUsahaSlsFilter, selectedPml, selectedPpl, selectedMempawahPjFilter]);

  const paginatedUsahaRecords = useMemo(() => {
    const startIndex = (usahaTablePage - 1) * usahaItemsPerPage;
    return filteredUsahaRecords.slice(startIndex, startIndex + usahaItemsPerPage);
  }, [filteredUsahaRecords, usahaTablePage, usahaItemsPerPage]);

  const totalUsahaPages = useMemo(() => {
    return Math.ceil(filteredUsahaRecords.length / usahaItemsPerPage) || 1;
  }, [filteredUsahaRecords, usahaItemsPerPage]);
`;
content = content.replace('  // Chart data: Geo progress grouped by kecamatan or desa', parseCode + '\n  // Chart data: Geo progress grouped by kecamatan or desa');


// 6. UI Table Injection
const uiTable = `

          {/* Tabel Usaha Tidak Ditemukan */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden mt-6 mb-4 flex flex-col">
            <div className="bg-gradient-to-r from-red-600 to-rose-500 p-4 shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-white font-black flex items-center gap-2">
                  <Database size={18} />
                  Usaha Tidak Ditemukan (Updated 16 Juli 2026)
                </h3>
                <p className="text-red-100 text-xs mt-1">Daftar usaha yang dilaporkan tidak ditemukan di lapangan.</p>
              </div>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <select 
                  className="bg-white/10 text-white border border-white/20 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-white/30 font-semibold"
                  value={selectedUsahaKecFilter}
                  onChange={e => {
                    setSelectedUsahaKecFilter(e.target.value);
                    setSelectedUsahaDesaFilter('ALL');
                    setSelectedUsahaSlsFilter('ALL');
                    setUsahaTablePage(1);
                  }}
                >
                  <option value="ALL" className="text-slate-800">Semua Kecamatan</option>
                  {usahaFilters.kecamatans.map(k => <option key={k} value={k} className="text-slate-800">{k}</option>)}
                </select>

                <select 
                  className="bg-white/10 text-white border border-white/20 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-white/30 font-semibold disabled:opacity-50"
                  value={selectedUsahaDesaFilter}
                  onChange={e => {
                    setSelectedUsahaDesaFilter(e.target.value);
                    setSelectedUsahaSlsFilter('ALL');
                    setUsahaTablePage(1);
                  }}
                  disabled={selectedUsahaKecFilter === 'ALL'}
                >
                  <option value="ALL" className="text-slate-800">Semua Desa</option>
                  {usahaFilters.desas.map(d => <option key={d} value={d} className="text-slate-800">{d}</option>)}
                </select>

                <select 
                  className="bg-white/10 text-white border border-white/20 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-white/30 font-semibold disabled:opacity-50"
                  value={selectedUsahaSlsFilter}
                  onChange={e => {
                    setSelectedUsahaSlsFilter(e.target.value);
                    setUsahaTablePage(1);
                  }}
                  disabled={selectedUsahaDesaFilter === 'ALL'}
                >
                  <option value="ALL" className="text-slate-800">Semua SLS</option>
                  {usahaFilters.slss.map(s => <option key={s} value={s} className="text-slate-800">{s}</option>)}
                </select>

                <select
                  className="bg-white/10 text-white border border-white/20 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-white/30 font-semibold"
                  value={usahaItemsPerPage}
                  onChange={(e) => {
                    setUsahaItemsPerPage(Number(e.target.value));
                    setUsahaTablePage(1);
                  }}
                >
                  <option value={10} className="text-slate-800">10 Baris</option>
                  <option value={25} className="text-slate-800">25 Baris</option>
                  <option value={50} className="text-slate-800">50 Baris</option>
                  <option value={100} className="text-slate-800">100 Baris</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-3 whitespace-nowrap border-r border-slate-100">Kecamatan</th>
                    <th className="p-3 whitespace-nowrap border-r border-slate-100">Desa</th>
                    <th className="p-3 border-r border-slate-100">Nama SLS</th>
                    <th className="p-3 border-r border-slate-100">PPL</th>
                    <th className="p-3 border-r border-slate-100">PML</th>
                    <th className="p-3 border-r border-slate-100">PJ</th>
                    <th className="p-3 border-r border-slate-100">Nama Usaha</th>
                    <th className="p-3 border-r border-slate-100">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {paginatedUsahaRecords.length > 0 ? (
                    paginatedUsahaRecords.map((item, idx) => (
                      <tr key={idx} className="hover:bg-rose-50/30 transition-colors">
                        <td className="p-3 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-100 text-xs">{item.kecamatan}</td>
                        <td className="p-3 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-100 text-xs">{item.desa}</td>
                        <td className="p-3 border-r border-slate-100 font-medium text-slate-800 text-xs leading-tight">{item.sls}</td>
                        <td className="p-3 whitespace-nowrap text-xs text-slate-700 border-r border-slate-100">{item.ppl}</td>
                        <td className="p-3 whitespace-nowrap text-xs text-slate-700 border-r border-slate-100">{item.pml}</td>
                        <td className="p-3 whitespace-nowrap text-xs text-slate-600 border-r border-slate-100">{item.pj}</td>
                        <td className="p-3 font-black text-rose-700 text-xs border-r border-slate-100">{item.namaUsaha}</td>
                        <td className="p-3 text-[10px] text-slate-500 max-w-[150px] truncate" title={item.source}>{item.source}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="text-center p-8 text-slate-400 font-sans text-sm">
                        Tidak ada data usaha tidak ditemukan yang cocok dengan filter penelusuran.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredUsahaRecords.length > 0 && (
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500 font-semibold">
                <div className="text-slate-500">
                  Menampilkan <span className="text-slate-800 font-bold">{(usahaTablePage - 1) * usahaItemsPerPage + 1}</span> - <span className="text-slate-800 font-bold">{Math.min(usahaTablePage * usahaItemsPerPage, filteredUsahaRecords.length)}</span> dari <span className="text-slate-800 font-bold">{filteredUsahaRecords.length}</span> baris data
                </div>
                <div className="flex gap-1.5 shrink-0 animate-fade-in">
                  <button
                    disabled={usahaTablePage === 1}
                    onClick={() => setUsahaTablePage(prev => Math.max(1, prev - 1))}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-600 hover:text-slate-800 font-bold transition-all disabled:cursor-not-allowed cursor-pointer flex items-center shadow-sm"
                  >
                    Sebelumnya
                  </button>
                  <div className="flex items-center px-2 text-blue-800 font-sans font-bold text-[12px]">
                    Halaman {usahaTablePage} / {totalUsahaPages}
                  </div>
                  <button
                    disabled={usahaTablePage === totalUsahaPages}
                    onClick={() => setUsahaTablePage(prev => Math.min(totalUsahaPages, prev + 1))}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-600 hover:text-slate-800 font-bold transition-all disabled:cursor-not-allowed cursor-pointer flex items-center shadow-sm"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </div>

`;
content = content.replace('        {/* Sourced directly from \'rekap harian\' Google Sheet instead of Firebase. */}', uiTable + '\n        {/* Sourced directly from \'rekap harian\' Google Sheet instead of Firebase. */}');

fs.writeFileSync('src/App.tsx', content, 'utf-8');
console.log('Patch complete.');
