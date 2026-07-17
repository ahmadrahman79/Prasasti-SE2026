const fs = require('fs');
let text = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /<div className=\"col-span-12 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden mt-6 mb-4 flex flex-col\">([\s\S]*?)<div className=\"overflow-x-auto\">/;
const newHeader = `
          <div className="col-span-12 bg-white rounded-lg border border-slate-200 flex flex-col shadow-2xs overflow-hidden mt-6 mb-4">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase flex items-center gap-2">
                  <Database size={15} className="text-red-600" />
                  Usaha Tidak Ditemukan (Updated 16 Juli 2026)
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">Daftar usaha yang dilaporkan tidak ditemukan di lapangan.</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-200/60">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Filter Kecamatan:</span>
                  <SearchableSelect 
                    value={selectedUsahaKecFilter}
                    onChange={val => {
                      setSelectedUsahaKecFilter(val);
                      setSelectedUsahaDesaFilter('ALL');
                      setSelectedUsahaSlsFilter('ALL');
                      setUsahaTablePage(1);
                    }}
                    placeholder="Pilih Kecamatan..."
                    options={[
                      { label: "Semua Kecamatan", value: "ALL" },
                      ...usahaFilters.kecamatans.map(k => ({ label: k, value: k }))
                    ]}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Filter Desa:</span>
                  <SearchableSelect 
                    value={selectedUsahaDesaFilter}
                    onChange={val => {
                      setSelectedUsahaDesaFilter(val);
                      setSelectedUsahaSlsFilter('ALL');
                      setUsahaTablePage(1);
                    }}
                    placeholder="Pilih Desa..."
                    options={[
                      { label: "Semua Desa", value: "ALL" },
                      ...usahaFilters.desas.map(d => ({ label: d, value: d }))
                    ]}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Filter SLS:</span>
                  <SearchableSelect 
                    value={selectedUsahaSlsFilter}
                    onChange={val => {
                      setSelectedUsahaSlsFilter(val);
                      setUsahaTablePage(1);
                    }}
                    placeholder="Pilih SLS..."
                    options={[
                      { label: "Semua SLS", value: "ALL" },
                      ...usahaFilters.slss.map(s => ({ label: s, value: s }))
                    ]}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Tampilkan Baris:</span>
                  <SearchableSelect
                    value={String(usahaItemsPerPage)}
                    onChange={(val) => {
                      setUsahaItemsPerPage(Number(val));
                      setUsahaTablePage(1);
                    }}
                    placeholder="Pilih baris..."
                    options={[
                      { label: "10 Baris", value: "10" },
                      { label: "25 Baris", value: "25" },
                      { label: "50 Baris", value: "50" },
                      { label: "100 Baris", value: "100" }
                    ]}
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
`;

if(regex.test(text)){
  text = text.replace(regex, newHeader.trimStart());
  fs.writeFileSync('src/App.tsx', text, 'utf-8');
  console.log('Success');
} else {
  console.log('Regex did not match');
}
