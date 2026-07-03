import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  RefreshCw, 
  Search, 
  Filter, 
  TrendingUp, 
  Users, 
  Info, 
  AlertCircle, 
  Clock, 
  ChevronDown, 
  Database,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  TrendingDown,
  Sparkles,
  Sheet,
  LogOut,
  LogIn,
  Github,
  Calendar,
  ChevronUp,
  ChevronsUpDown,
  LineChart as LucideLineChart,
  Save,
  Award,
  MapPin,
  BadgeCheck
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  Line,
  LineChart as RechartsLineChart,
  ComposedChart
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { parseNewSheetsData, convertValuesToCSV, parseIndonesianDate, formatIndonesianDate, parseRekapHarianCSV, parseProgresHarianCSV, FALLBACK_REKAP_HARIAN_CSV, RekapMempawahRecord, parseRekapMempawahCSV, FALLBACK_REKAP_MEMPAWA_CSV, parseCSVLine } from './parser';
import { PPLSummary, Table3Record, PPLDailyProgress, Snapshot2359 } from './types';

const DEFAULT_SPREADSHEET_ID = '1UC5Ca8EAj088IhFigDHy-106ijc0k_YGlGUHkVzU2Vs';
const REKAP_SHEET = 'rekap';
const DATA_LAMA_SHEET = 'data lama';

// Helper to get Western Indonesian Time (WIB, UTC+7)
function getCurrentWIB(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + (3600000 * 7));
}

// Calculate the elapsed days of data collection.
// June 15, 2026 is Day 1.
function getCurrentDayOfPendataan(): number {
  const startDate = new Date(2026, 5, 15); // 15 Juni 2026
  const today = getCurrentWIB();
  // Reset time fields to compare exact calendar UTC days
  const utcStart = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.floor((utcToday - utcStart) / (1000 * 60 * 60 * 24));
  const elapsed = diffDays + 1;
  return Math.max(1, elapsed);
}

// Calculate precise remaining days to Kabupaten Mempawah target buffer deadline (August 15, 2026)
function getRemainingDaysToMempawahDeadline(): number {
  const today = getCurrentWIB();
  today.setHours(0,0,0,0);
  
  const targetDate = new Date(2026, 7, 15); // 15 Agustus 2026 (7 is August in 0-indexed JS date month representation)
  targetDate.setHours(0,0,0,0);
  
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : 1;
}

// Helper to get active dynamic Indonesian date string with 23:59 WIB daily cutoff
function getWIBTargetDateStr(): string {
  const wib = getCurrentWIB();
  const h = wib.getHours();
  const m = wib.getMinutes();

  // If time exceeds 23:59 (so exactly 23:59:00 or later of standard day), we roll over to the next day
  const isAfter2359 = (h === 23 && m >= 59);

  const target = new Date(wib);
  if (isAfter2359) {
    target.setDate(target.getDate() + 1);
  }

  const d = target.getDate();
  const y = target.getFullYear();
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  return `${d} ${months[target.getMonth()]} ${y}`;
}

const SearchableSelect = ({ 
  options, 
  value, 
  onChange, 
  placeholder 
}: { 
  options: { label: string; value: string }[], 
  value: string, 
  onChange: (val: string) => void, 
  placeholder: string 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    return options.filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()));
  }, [options, search]);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        className="bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 hover:border-emerald-400 cursor-pointer flex justify-between items-center w-full min-h-[26px]"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setSearch("");
        }}
      >
        <span className="truncate pr-2">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown size={12} className={`text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded shadow-lg overflow-hidden">
          <div className="p-1.5 border-b border-slate-100 bg-slate-50">
            <input 
              type="text" 
              className="w-full px-2 py-1 text-xs border border-slate-200 rounded outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 bg-white"
              placeholder="Cari..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto overscroll-contain">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div 
                  key={opt.value}
                  className={`px-2 py-1.5 text-xs cursor-pointer hover:bg-emerald-50 transition-colors ${opt.value === value ? 'bg-emerald-50/50 font-bold text-emerald-700' : 'text-slate-700'}`}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                >
                  {opt.label}
                </div>
              ))
            ) : (
              <div className="px-2 py-3 text-xs text-slate-500 text-center italic">Tidak ditemukan</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const FALLBACK_REKAP_CSV = `"Nama PML","Nama PPL","Submit","Draf","Total","Target"
"Sulis Tri Handayani","Eva Lutfianti","68","22","90","450"
"Sulis Tri Handayani","Sri Ratna Dewi","56","0","56","440"
"Sulis Tri Handayani","Suci Pratiwi","23","25","48","450"
"Sulis Tri Handayani","Laras Nanda Julita","38","1","39","400"
"Sulis Tri Handayani","Arie Maulana","19","0","19","440"
"Sulis Tri Handayani","Fuulanah Aniskurlillah","17","3","20","440"
"Sulis Tri Handayani","Nafisah Ismatul Faizah","11","1","12","450"
"Sulis Tri Handayani","Triesna Dinda Saputra","21","22","43","440"
"Ridha Nur Mitha","Dwi Febrianti","31","3","34","450"
"Ridha Nur Mitha","Bagus Setiawan","29","18","47","450"
"Ridha Nur Mitha","Vivi Yatul Islamiah","40","15","55","440"
"Ridha Nur Mitha","Rika","35","18","53","440"
"Ridha Nur Mitha","Tri Ramadianti","39","36","75","450"
"Ridha Nur Mitha","Muhammad Fredi Ramschie, St","50","10","60","450"
"Ridha Nur Mitha","Ismail","23","1","24","440"
"Ridha Nur Mitha","Ridhawati","16","21","37","440"`;

const FALLBACK_DATA_LAMA_CSV = `"Nama PML","Nama PPL","Submit","Draf","Total","Tanggal update"
"Sulis Tri Handayani","Arie Maulana","13","0","13","19 Juni 2026"
"Sulis Tri Handayani","Arie Maulana","17","0","17","20 Juni 2026"
"Sulis Tri Handayani","Arie Maulana","19","0","19","21 Juni 2026"
"Ridha Nur Mitha","Bagus Setiawan","24","10","34","19 Juni 2026"
"Ridha Nur Mitha","Bagus Setiawan","28","14","42","20 Juni 2026"
"Ridha Nur Mitha","Bagus Setiawan","29","18","47","21 Juni 2026"
"Ridha Nur Mitha","Dwi Febrianti","26","1","27","19 Juni 2026"
"Ridha Nur Mitha","Dwi Febrianti","28","1","29","20 Juni 2026"
"Ridha Nur Mitha","Dwi Febrianti","31","3","34","21 Juni 2026"
"Sulis Tri Handayani","Eva Lutfianti","37","15","52","19 Juni 2026"
"Sulis Tri Handayani","Eva Lutfianti","54","27","81","20 Juni 2026"
"Sulis Tri Handayani","Eva Lutfianti","68","22","90","21 Juni 2026"
"Sulis Tri Handayani","Fuulanah Aniskurlillah","10","2","12","19 Juni 2026"
"Sulis Tri Handayani","Fuulanah Aniskurlillah","14","2","16","20 Juni 2026"
"Sulis Tri Handayani","Fuulanah Aniskurlillah","17","3","20","21 Juni 2026"
"Ridha Nur Mitha","Ismail","11","0","11","19 Juni 2026"
"Ridha Nur Mitha","Ismail","11","0","11","20 Juni 2026"
"Ridha Nur Mitha","Ismail","23","1","24","21 Juni 2026"
"Sulis Tri Handayani","Laras Nanda Julita","21","0","21","19 Juni 2026"
"Sulis Tri Handayani","Laras Nanda Julita","32","0","32","20 Juni 2026"
"Sulis Tri Handayani","Laras Nanda Julita","38","1","39","21 Juni 2026"
"Ridha Nur Mitha","Muhammad Fredi Ramschie, St","16","3","19","19 Juni 2026"
"Ridha Nur Mitha","Muhammad Fredi Ramschie, St","17","29","46","20 Juni 2026"
"Ridha Nur Mitha","Muhammad Fredi Ramschie, St","50","10","60","21 Juni 2026"
"Sulis Tri Handayani","Nafisah Ismatul Faizah","8","1","9","19 Juni 2026"
"Sulis Tri Handayani","Nafisah Ismatul Faizah","9","1","10","20 Juni 2026"
"Sulis Tri Handayani","Nafisah Ismatul Faizah","11","1","12","21 Juni 2026"
"Ridha Nur Mitha","Ridhawati","8","3","11","19 Juni 2026"
"Ridha Nur Mitha","Ridhawati","6","10","16","20 Juni 2026"
"Ridha Nur Mitha","Ridhawati","16","21","37","21 Juni 2026"
"Ridha Nur Mitha","Rika","20","15","35","19 Juni 2026"
"Ridha Nur Mitha","Rika","23","12","35","20 Juni 2026"
"Ridha Nur Mitha","Rika","35","18","53","21 Juni 2026"
"Sulis Tri Handayani","Sri Ratna Dewi","29","0","29","19 Juni 2026"
"Sulis Tri Handayani","Sri Ratna Dewi","43","0","43","20 Juni 2026"
"Sulis Tri Handayani","Sri Ratna Dewi","56","0","56","21 Juni 2026"
"Sulis Tri Handayani","Suci Pratiwi","24","3","27","19 Juni 2026"
"Sulis Tri Handayani","Suci Pratiwi","23","13","36","20 Juni 2026"
"Sulis Tri Handayani","Suci Pratiwi","23","25","48","21 Juni 2026"
"Ridha Nur Mitha","Tri Ramadianti","18","23","41","19 Juni 2026"
"Ridha Nur Mitha","Tri Ramadianti","16","20","36","20 Juni 2026"
"Ridha Nur Mitha","Tri Ramadianti","39","36","75","21 Juni 2026"
"Sulis Tri Handayani","Triesna Dinda Saputra","2","14","16","19 Juni 2026"
"Sulis Tri Handayani","Triesna Dinda Saputra","21","21","42","20 Juni 2026"
"Sulis Tri Handayani","Triesna Dinda Saputra","21","22","43","21 Juni 2026"
"Ridha Nur Mitha","Vivi Yatul Islamiah","23","11","34","19 Juni 2026"
"Ridha Nur Mitha","Vivi Yatul Islamiah","27","26","53","20 Juni 2026"
"Ridha Nur Mitha","Vivi Yatul Islamiah","40","15","55","21 Juni 2026"`;

export default function App() {
  // App data states
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => {
    return localStorage.getItem('custom_spreadsheet_id') || DEFAULT_SPREADSHEET_ID;
  });
  const [isEditingSheetId, setIsEditingSheetId] = useState<boolean>(false);
  const [sheetIdInput, setSheetIdInput] = useState<string>(spreadsheetId);

  const [rekapCSV, setRekapCSV] = useState<string>(FALLBACK_REKAP_CSV);
  const [rekapHarianCSV, setRekapHarianCSV] = useState<string>(FALLBACK_REKAP_HARIAN_CSV);
  const [progresHarianCSV, setProgresHarianCSV] = useState<string>(FALLBACK_REKAP_HARIAN_CSV);
  const [rekapMempawahCSV, setRekapMempawahCSV] = useState<string>(FALLBACK_REKAP_MEMPAWA_CSV);
  const [dataLamaCSV, setDataLamaCSV] = useState<string>(FALLBACK_DATA_LAMA_CSV);
  const [isLiveLoading, setIsLiveLoading] = useState<boolean>(false);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [lastUpdate, setLastUpdate] = useState<string>('2026-06-21 23:59:00');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Clock for real-time WIB displays

  const [currentWIBTime, setCurrentWIBTime] = useState<Date>(getCurrentWIB());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentWIBTime(getCurrentWIB());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filters State
  const [selectedPml, setSelectedPml] = useState<string>('ALL');
  const [selectedPpl, setSelectedPpl] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [bottomTablePage, setBottomTablePage] = useState<number>(1);
  const [bottomTableSortConfig, setBottomTableSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' | null }>({ key: '', direction: null });
  const [pmlTablePage, setPmlTablePage] = useState<number>(1);
  const [pmlTableSortConfig, setPmlTableSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' | null }>({ key: '', direction: null });
  const [dailyLogPage, setDailyLogPage] = useState<number>(1);
  const [targetTrackerPpl, setTargetTrackerPpl] = useState<string>('');
  const [localPplFilter, setLocalPplFilter] = useState<string>('');
  const [leaderSortKey, setLeaderSortKey] = useState<'submit' | 'draft'>('submit');
  const [leaderSortDir, setLeaderSortDir] = useState<'asc' | 'desc'>('desc');
  const [isTrackerDropdownOpen, setIsTrackerDropdownOpen] = useState<boolean>(false);
  const [trackerSearchInput, setTrackerSearchInput] = useState<string>('');
  const [trackerPage, setTrackerPage] = useState<number>(1);
  const [trackerItemsPerPage, setTrackerItemsPerPage] = useState<number>(3);

  // PJ and Rekap Mempawah Table Filter States
  const [selectedPjFilter, setSelectedPjFilter] = useState<string>('ALL');
  const [pjSortColumn, setPjSortColumn] = useState<string>('progress'); // 'pj' | 'submit' | 'draft' | 'total' | 'target' | 'progress'
  const [pjSortDirection, setPjSortDirection] = useState<'asc' | 'desc'>('desc');
  const [pjItemsPerPage, setPjItemsPerPage] = useState<number>(10);
  
  const [selectedMempawahPjFilter, setSelectedMempawahPjFilter] = useState<string>('ALL');
  const [selectedMempawahDesaFilter, setSelectedMempawahDesaFilter] = useState<string>('ALL');
  const [selectedMempawahKecFilter, setSelectedMempawahKecFilter] = useState<string>('ALL');
  const [selectedMempawahSlsFilter, setSelectedMempawahSlsFilter] = useState<string>('ALL');
  const [mempawahSortColumn, setMempawahSortColumn] = useState<string>('progress'); // 'pj' | 'kecamatan' | 'desa' | 'sls' | 'submit' | 'draft' | 'total' | 'target' | 'progress'
  const [mempawahSortDirection, setMempawahSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination pages
  const [pjTablePage, setPjTablePage] = useState<number>(1);
  const [mempawahTablePage, setMempawahTablePage] = useState<number>(1);

  const trackerDropdownRef = useRef<HTMLDivElement>(null);

  // Click outside tracker dropdown to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (trackerDropdownRef.current && !trackerDropdownRef.current.contains(event.target as Node)) {
        setIsTrackerDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Reset tracker page to 1 when PML selection changes
  useEffect(() => {
    setTrackerPage(1);
    setTrackerSearchInput('');
  }, [selectedPml]);

  // UI Table Tab Tab
  const [tableTab, setTableTab] = useState<'daily' | 'cumulative'>('daily');
  const [leaderboardTab, setLeaderboardTab] = useState<'most' | 'least'>('most');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState<boolean>(false);

  // Reset bottomTable and pmlTable page to 1 when active PML/PPL filters change
  useEffect(() => {
    setBottomTablePage(1);
    setPmlTablePage(1);
  }, [selectedPml, selectedPpl]);

  useEffect(() => {
    setDailyLogPage(1);
  }, [selectedPml, selectedPpl, selectedDate, searchQuery, tableTab]);


  // System operates in fully public mode without Google Sign-In requirement as requested.

  // Fetch method for Google Sheets (rekap, rekap harian, Progres Harian, and Rekap Mempawah)
  const fetchSheetData = async (silent = false) => {
    if (!silent) {
       setIsLiveLoading(true);
    }
    setErrorMsg(null);

    try {
      const rekapUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(REKAP_SHEET)}`;
      const rekapHarianUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('rekap harian')}`;
      const progresHarianUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('Progres Harian')}`;
      const rekapMempawahUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('Rekap Mempawah')}`;

      const [rekapRes, rekapHarianRes, progresHarianRes, rekapMempawahRes] = await Promise.all([
        fetch(rekapUrl),
        fetch(rekapHarianUrl),
        fetch(progresHarianUrl),
        fetch(rekapMempawahUrl).catch(e => {
          console.warn("Rekap Mempawah sheet fetch failed, using fallback:", e);
          return { ok: false } as Response;
        })
      ]);

      if (!rekapRes.ok) {
        throw new Error("Gagal mengunduh spreadsheet 'rekap'. Aturlah izin pelihat menjadi 'Siapa saja yang memiliki link'.");
      }
      if (!rekapHarianRes.ok) {
        throw new Error("Gagal mengunduh spreadsheet 'rekap harian'. Aturlah izin pelihat menjadi 'Siapa saja yang memiliki link'.");
      }
      if (!progresHarianRes.ok) {
        throw new Error("Gagal mengunduh spreadsheet 'Progres Harian'. Aturlah izin pelihat menjadi 'Siapa saja yang memiliki link'.");
      }

      const rekapText = await rekapRes.text();
      const rekapHarianText = await rekapHarianRes.text();
      const progresHarianText = await progresHarianRes.text();
      let rekapMempawahText = FALLBACK_REKAP_MEMPAWA_CSV;

      if (rekapMempawahRes.ok) {
        const text = await rekapMempawahRes.text();
        if (!text.trim().startsWith('<!doctype')) {
          rekapMempawahText = text;
        }
      }

      if (
        rekapText.trim().startsWith('<!doctype') || 
        rekapHarianText.trim().startsWith('<!doctype') || 
        progresHarianText.trim().startsWith('<!doctype')
      ) {
        throw new Error("Akses dibatasi ke spreadsheet privat. Pastikan Google Sheet dapat diakses publik ('Siapa saja yang memiliki link').");
      }

      setRekapCSV(rekapText);
      setRekapHarianCSV(rekapHarianText);
      setProgresHarianCSV(progresHarianText);
      setRekapMempawahCSV(rekapMempawahText);
      setDataLamaCSV(""); // Set data lama to empty as requested (only use rekap)
      setIsLive(true);

      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const datestamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      setLastUpdate(datestamp);
    } catch (err: any) {
      console.error("Live fetch error:", err);
      setErrorMsg(`Sinkronisasi Gagal: ${err.message || 'Koneksi bermasalah'}`);
    } finally {
      setIsLiveLoading(false);
    }
  };

  // Trigger fetch when spreadsheetId changes
  useEffect(() => {
    fetchSheetData();
  }, [spreadsheetId]);

  // Set up auto-refresh timer (30 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSheetData(true);
    }, 1800000);
    return () => clearInterval(interval);
  }, [spreadsheetId]);

  // Parsed combined Sheets (rekap + data lama)
  const parsedData = useMemo(() => {
    const activeWIBDate = getWIBTargetDateStr();
    return parseNewSheetsData(rekapCSV, dataLamaCSV, activeWIBDate);
  }, [rekapCSV, dataLamaCSV]);

  // Removed Firestore snapshot state and auto-save harian system as requested by user.

  // Handle PML filter change
  const handlePmlChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedPml(val);
    setSelectedPpl('ALL'); // Reset PPL selection to avoid mismatch
  };

  // Filter list of PPL dynamically depending on selected PML
  const filteredPplList = useMemo(() => {
    if (selectedPml === 'ALL') {
      return parsedData.pplList;
    }
    return parsedData.pplList.filter(item => item.pml === selectedPml);
  }, [selectedPml, parsedData.pplList]);

  // Synchronously initialize the default PPL for the Mempawah tracker card and sync with the active PML selection
  useEffect(() => {
    if (parsedData.pplList.length > 0) {
      if (!targetTrackerPpl) {
        setTargetTrackerPpl(parsedData.pplList[0].name);
      } else if (selectedPml !== 'ALL') {
        const pplsInPml = parsedData.pplList.filter(item => item.pml === selectedPml);
        const currentStillValid = pplsInPml.some(item => item.name === targetTrackerPpl);
        if (!currentStillValid && pplsInPml.length > 0) {
          setTargetTrackerPpl(pplsInPml[0].name);
        }
      }
    }
  }, [parsedData.pplList, targetTrackerPpl, selectedPml]);

  // Specifically use parsed 'rekap harian' Google Sheet for daily progress calculations
  // Then append live today data from parsedData.table1
  const table3Calculated = useMemo(() => {
    const historical = parseRekapHarianCSV(rekapHarianCSV);
    const activeDateStr = getWIBTargetDateStr();
    const activeDateObj = parseIndonesianDate(activeDateStr);
    
    // Group historical by pplName to find their latest record
    const latestPerPpl = new Map<string, PPLDailyProgress>();
    historical.forEach(rec => {
      const existing = latestPerPpl.get(rec.pplName);
      if (!existing || rec.date.getTime() > existing.date.getTime()) {
        latestPerPpl.set(rec.pplName, rec);
      }
    });

    const liveRecords: PPLDailyProgress[] = [];
    
    parsedData.table1.forEach(livePpl => {
      const latestHist = latestPerPpl.get(livePpl.pplName);
      
      if (latestHist) {
        if (latestHist.dateStr !== activeDateStr) {
          const dailySubmit = Math.max(0, livePpl.submit - latestHist.submit);
          const dailyDraft = livePpl.draft - latestHist.draft;
          const dailyTotal = Math.max(0, livePpl.total - latestHist.total);
          
          liveRecords.push({
            pplName: livePpl.pplName,
            pmlName: livePpl.pmlName,
            mempawahTarget: livePpl.mempawahTarget || livePpl.total,
            dateStr: `${activeDateStr} (Live)`,
            date: activeDateObj,
            submit: livePpl.submit,
            draft: livePpl.draft,
            total: livePpl.total,
            dailySubmit,
            dailyDraft,
            dailyTotal,
            isFirstDay: false
          });
        }
      } else {
        liveRecords.push({
          pplName: livePpl.pplName,
          pmlName: livePpl.pmlName,
          mempawahTarget: livePpl.mempawahTarget || livePpl.total,
          dateStr: `${activeDateStr} (Live)`,
          date: activeDateObj,
          submit: livePpl.submit,
          draft: livePpl.draft,
          total: livePpl.total,
          dailySubmit: livePpl.submit,
          dailyDraft: livePpl.draft,
          dailyTotal: livePpl.total,
          isFirstDay: true
        });
      }
    });

    return [...historical, ...liveRecords];
  }, [rekapHarianCSV, parsedData.table1]);

  // Use parsed 'progres harian' Google Sheet for Apresiasi Bintang Progres Teraktif
  const progresHarianCalculated = useMemo(() => {
    return parseProgresHarianCSV(progresHarianCSV);
  }, [progresHarianCSV]);



  // Combined and sorted date list from rekap harian + Progres Harian + active date from Google Sheets rekap
  const dateList = useMemo(() => {
    const datesSet = new Set<string>();
    
    // Add dates from rekap harian
    table3Calculated.forEach(rec => {
      if (rec.dateStr) datesSet.add(rec.dateStr);
    });

    const datesArray = Array.from(datesSet);
    // Add active date from rekap
    const activeDate = getWIBTargetDateStr();
    datesSet.add(activeDate);
    
    return Array.from(datesSet).sort((a, b) => {
      return parseIndonesianDate(b).getTime() - parseIndonesianDate(a).getTime();
    });
  }, [table3Calculated]);

  // Apply selectors (PML, PPL, Date, Search Query) to the calculated daily deltas from rekap harian for the bottom comparative log table
  const processedRecords = useMemo(() => {
    let records = [...table3Calculated];

    // Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      records = records.filter(item => 
        item.pplName.toLowerCase().includes(query) || 
        item.pmlName.toLowerCase().includes(query)
      );
    }

    // PML filter
    if (selectedPml !== 'ALL') {
      records = records.filter(item => item.pmlName === selectedPml);
    }

    // PPL filter
    if (selectedPpl !== 'ALL') {
      records = records.filter(item => item.pplName === selectedPpl);
    }

    // Date filter
    if (selectedDate !== 'ALL') {
      records = records.filter(item => item.dateStr === selectedDate);
    }

    // Sort Chronologically descending
    records.sort((a, b) => b.date.getTime() - a.date.getTime());

    return records;
  }, [table3Calculated, selectedPml, selectedPpl, selectedDate, searchQuery]);

  // Paginated daily logs
  const paginatedProcessedRecords = useMemo(() => {
    const startIndex = (dailyLogPage - 1) * 10;
    return processedRecords.slice(startIndex, startIndex + 10);
  }, [processedRecords, dailyLogPage]);

  const totalDailyLogPages = useMemo(() => {
    return Math.ceil(processedRecords.length / 10) || 1;
  }, [processedRecords]);

  // Metrics KPI calculations
  const metricsKPIs = useMemo(() => {
    let totalCumSubmit = 0;
    let totalCumDraft = 0;
    let totalCumTotal = 0;
    let totalCumMempawahTarget = 0;
    let pplCount = 0;

    // "Akumulasi Progres Target ambil data dari sheet rekap"
    // For overall cumulative values, we ALWAYS use the rekap Google Sheet (parsedData.table1)
    const activePpls = parsedData.table1.filter(rec => {
      if (selectedPml !== 'ALL' && rec.pmlName !== selectedPml) return false;
      if (selectedPpl !== 'ALL' && rec.pplName !== selectedPpl) return false;
      return true;
    });
    activePpls.forEach(rec => {
      totalCumSubmit += rec.submit;
      totalCumDraft += rec.draft;
      totalCumTotal += rec.total;
      totalCumMempawahTarget += rec.mempawahTarget || rec.total;
    });
    pplCount = activePpls.length;

    // "Total Submit (Hari Ini / Filter) ambil data dari sheet rekap harian"
    let totalDailySubmit = 0;
    let totalDailyTotal = 0;

    const dailyFiltered = table3Calculated.filter(rec => {
      if (selectedPml !== 'ALL' && rec.pmlName !== selectedPml) return false;
      if (selectedPpl !== 'ALL' && rec.pplName !== selectedPpl) return false;
      if (selectedDate !== 'ALL' && rec.dateStr !== selectedDate) return false;
      return true;
    });

    dailyFiltered.forEach(rec => {
      totalDailySubmit += rec.dailySubmit;
      totalDailyTotal += rec.dailyTotal;
    });

    // "Total Draft (Hari Ini) ambil data dari sheet rekap harian"
    // Find the date for the draft calculation
    const activeDraftDate = selectedDate === 'ALL' ? (
      table3Calculated.length > 0 ? (() => {
        let maxTime = -1;
        let maxStr = '';
        table3Calculated.forEach(rec => {
          const t = rec.date.getTime();
          if (t > maxTime) {
            maxTime = t;
            maxStr = rec.dateStr;
          }
        });
        return maxStr;
      })() : ''
    ) : selectedDate;

    let totalDailyDraft = 0;
    if (activeDraftDate) {
      const dailyDraftFiltered = table3Calculated.filter(rec => {
        if (selectedPml !== 'ALL' && rec.pmlName !== selectedPml) return false;
        if (selectedPpl !== 'ALL' && rec.pplName !== selectedPpl) return false;
        if (rec.dateStr !== activeDraftDate) return false;
        return true;
      });
      dailyDraftFiltered.forEach(rec => {
        totalDailyDraft += rec.dailyDraft;
      });
    }

    return {
      cumSubmit: totalCumSubmit,
      cumDraft: totalCumDraft,
      cumTotal: totalCumTotal,
      cumMempawahTarget: totalCumMempawahTarget,
      dailySubmit: totalDailySubmit,
      dailyDraft: totalDailyDraft,
      dailyTotal: totalDailyTotal,
      pplCount: pplCount || 1
    };
  }, [parsedData.table1, table3Calculated, selectedPml, selectedPpl, selectedDate]);

  // Find most active PPL based on average daily submits (using Google Sheets rekap cumulative submit)
  // "PPL Paling Aktif (Submit) ambil data dari sheet rekap"
  const mostActivePpl = useMemo(() => {
    let topName = "Tidak ada";
    let topAvg = 0;
    let topSum = 0;

    const elapsedDays = getCurrentDayOfPendataan();

    parsedData.table1.forEach(rec => {
      const avg = rec.submit / elapsedDays;
      if (avg > topAvg) {
        topAvg = avg;
        topName = rec.pplName;
        topSum = rec.submit;
      }
    });

    return {
      name: topName,
      submits: topSum,
      avg: parseFloat(topAvg.toFixed(2)),
      initials: topName.split(' ').map(p => p.charAt(0)).join('').substring(0, 2).toUpperCase()
    };
  }, [parsedData.table1]);

  // Chart data: Tren harian grouped by date
  // "Tren Progres Harian (Non-Akumulasi) ambil data dari sheet rekap harian"
  const trendChartData = useMemo(() => {
    const dates: Record<string, { dateStr: string; dateObj: Date; SUBMIT: number; DRAFT: number }> = {};
    
    table3Calculated.forEach(rec => {
      if (selectedPml !== 'ALL' && rec.pmlName !== selectedPml) return;
      if (selectedPpl !== 'ALL' && rec.pplName !== selectedPpl) return;

      if (!dates[rec.dateStr]) {
        dates[rec.dateStr] = {
          dateStr: rec.dateStr,
          dateObj: rec.date,
          SUBMIT: 0,
          DRAFT: 0
        };
      }
      dates[rec.dateStr].SUBMIT += rec.dailySubmit;
      dates[rec.dateStr].DRAFT += rec.dailyDraft;
    });

    return Object.values(dates).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  }, [table3Calculated, selectedPml, selectedPpl]);

  // Find the latest available date from rekap harian CSV
  const latestRekapHarianDate = useMemo(() => {
    if (table3Calculated.length === 0) return '';
    let maxTime = -1;
    let maxStr = '';
    table3Calculated.forEach(rec => {
      const t = rec.date.getTime();
      if (t > maxTime) {
        maxTime = t;
        maxStr = rec.dateStr;
      }
    });
    return maxStr;
  }, [table3Calculated]);

  // Find the latest available date from rekap harian CSV
  const latestProgresHarianDate = useMemo(() => {
    if (progresHarianCalculated.length === 0) return '';
    let maxTime = 0;
    let maxStr = '';
    progresHarianCalculated.forEach(rec => {
      const t = rec.date.getTime();
      if (t > maxTime) {
        maxTime = t;
        maxStr = rec.dateStr;
      }
    });
    return maxStr;
  }, [progresHarianCalculated]);

  const activeProgresHarianDate = useMemo(() => {
    return selectedDate === 'ALL' ? latestProgresHarianDate : selectedDate;
  }, [selectedDate, latestProgresHarianDate]);

  // Leaders data on activeProgresHarianDate from sheet Progres Harian (ignoring selectedPml filter as requested)
  // "Apresiasi Bintang Progres Teraktif Hari Ini ambil data dari sheet Progres Harian"
  const leadersData = useMemo(() => {
    if (!activeProgresHarianDate) return [];
    const list = progresHarianCalculated.filter(rec => rec.dateStr === activeProgresHarianDate);
    return list.map(rec => ({
      name: rec.pplName,
      pmlName: rec.pmlName,
      submit: rec.dailySubmit,
      draft: rec.dailyDraft,
      total: rec.dailyTotal
    }));
  }, [progresHarianCalculated, activeProgresHarianDate]);

  const sortedLeaders = useMemo(() => {
    return [...leadersData].sort((a, b) => {
      const valA = leaderSortKey === 'submit' ? a.submit : a.draft;
      const valB = leaderSortKey === 'submit' ? b.submit : b.draft;
      if (leaderSortDir === 'desc') {
        return valB - valA || b.submit - a.submit;
      } else {
        return valA - valB || a.submit - b.submit;
      }
    });
  }, [leadersData, leaderSortKey, leaderSortDir]);

  const filteredLeaders = useMemo(() => {
    if (!localPplFilter.trim()) return sortedLeaders;
    const query = localPplFilter.toLowerCase().trim();
    return sortedLeaders.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.pmlName.toLowerCase().includes(query)
    );
  }, [sortedLeaders, localPplFilter]);

  // Live PPL sidebar list stats representation - sorted by average daily submits
  const livePplList = useMemo(() => {
    const elapsedDays = getCurrentDayOfPendataan();
    const list = parsedData.table1
      .filter(rec => selectedPml === 'ALL' || rec.pmlName === selectedPml)
      .map(rec => {
        const submitAvg = parseFloat((rec.submit / elapsedDays).toFixed(2));
        return {
          name: rec.pplName,
          pmlName: rec.pmlName,
          submit: rec.submit,
          draft: rec.draft,
          days: elapsedDays,
          submitAvg
        };
      });

    return list.sort((a, b) => b.submitAvg - a.submitAvg || b.submit - a.submit);
  }, [parsedData.table1, selectedPml]);

  // Handle local searching of PPL within the Detail Per PPL card
  const filteredLivePplList = useMemo(() => {
    if (!localPplFilter.trim()) return livePplList;
    const query = localPplFilter.toLowerCase().trim();
    return livePplList.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.pmlName.toLowerCase().includes(query)
    );
  }, [livePplList, localPplFilter]);

  // Helper mapping: PPL to PJ from Rekap Harian
  const pplToPjMap = useMemo(() => {
    const map = new Map<string, string>();
    const lines = rekapHarianCSV.split(/\r?\n/);
    if (lines.length > 0) {
      // Basic headers detection
      const firstLine = lines[0].trim();
      let pplCol = 2;
      let pjCol = 7;
      try {
        const rawHeaders = parseCSVLine(firstLine);
        const headers = rawHeaders.map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
        const idxPpl = headers.findIndex(h => h.includes('ppl') || h.includes('petugas') || h.includes('nama ppl'));
        const idxPj = headers.findIndex(h => h.includes('pj') || h.includes('penanggung'));
        if (idxPpl !== -1) pplCol = idxPpl;
        if (idxPj !== -1) pjCol = idxPj;
      } catch (e) {
        console.warn("Error parsing header for pplToPjMap, using indices:", e);
      }
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        // Simple splitter, taking care of quotes
        const cols = parseCSVLine(line).map(c => c.replace(/^"|"$/g, '').trim());
        if (cols.length > Math.max(pplCol, pjCol)) {
          const ppl = cols[pplCol];
          const pj = cols[pjCol];
          if (ppl && pj) {
            // Store lowercased and trimmed to avoid casing/spacing mismatches
            map.set(ppl.trim().toLowerCase(), pj);
          }
        }
      }
    }
    return map;
  }, [rekapHarianCSV]);

  // Helper mapping: PPL to PJ from Rekap (if PJ column exists in Rekap)
  const pplToPjFromRekapMap = useMemo(() => {
    const map = new Map<string, string>();
    const lines = rekapCSV.split(/\r?\n/);
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      let pplCol = -1;
      let pjCol = -1;
      try {
        const rawHeaders = parseCSVLine(firstLine);
        const headers = rawHeaders.map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
        pplCol = headers.findIndex(h => h.includes('ppl') || h.includes('petugas') || h.includes('nama ppl'));
        pjCol = headers.findIndex(h => h.includes('pj') || h.includes('penanggung'));
      } catch (e) {
        console.warn("Error parsing header for pplToPjFromRekapMap:", e);
      }
      
      if (pplCol !== -1 && pjCol !== -1) {
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const cols = parseCSVLine(line).map(c => c.replace(/^"|"$/g, '').trim());
          if (cols.length > Math.max(pplCol, pjCol)) {
            const ppl = cols[pplCol];
            const pj = cols[pjCol];
            if (ppl && pj) {
              // Store lowercased and trimmed to avoid casing/spacing mismatches
              map.set(ppl.trim().toLowerCase(), pj);
            }
          }
        }
      }
    }
    return map;
  }, [rekapCSV]);

  // PJ Table Records calculated from rekapCSV data (aggregated by PJ)
  const pjTableRecords = useMemo(() => {
    const map = new Map<string, { pj: string; submit: number; draft: number; total: number; target: number }>();
    
    parsedData.table1.forEach(ppl => {
      const pplKeyExact = ppl.pplName.trim().toLowerCase();
      
      // Extract base PPL name without disambiguation suffix (e.g. "Amir (Budi)" -> "Amir")
      let pplKeyBase = pplKeyExact;
      const parenIndex = pplKeyExact.indexOf('(');
      if (parenIndex !== -1) {
        pplKeyBase = pplKeyExact.substring(0, parenIndex).trim();
      }
      
      // Attempt lookups (First try exact match, then try base name match)
      let pj = pplToPjFromRekapMap.get(pplKeyExact) || 
               pplToPjFromRekapMap.get(pplKeyBase) || 
               pplToPjMap.get(pplKeyExact) || 
               pplToPjMap.get(pplKeyBase);
               
      // Backup partial matches (fuzzy matching for slight name mismatches)
      if (!pj) {
        for (const [key, value] of pplToPjFromRekapMap.entries()) {
          if (key.includes(pplKeyBase) || pplKeyBase.includes(key)) {
            pj = value;
            break;
          }
        }
      }
      if (!pj) {
        for (const [key, value] of pplToPjMap.entries()) {
          if (key.includes(pplKeyBase) || pplKeyBase.includes(key)) {
            pj = value;
            break;
          }
        }
      }

      // Final normalization of PJ name
      if (!pj || pj === '#N/A' || pj === '-' || pj.trim() === '' || !isNaN(Number(pj))) {
        pj = "Belum Terpetakan";
      } else {
        pj = pj.trim();
      }
      
      const current = map.get(pj) || { pj, submit: 0, draft: 0, total: 0, target: 0 };
      
      current.submit += ppl.submit;
      current.draft += ppl.draft;
      current.total += ppl.total;
      current.target += ppl.mempawahTarget || ppl.total;
      
      map.set(pj, current);
    });
    
    return Array.from(map.values()).sort((a, b) => a.pj.localeCompare(b.pj));
  }, [parsedData.table1, pplToPjFromRekapMap, pplToPjMap]);

  const uniquePjsList = useMemo(() => {
    const pjs = new Set<string>();
    pjTableRecords.forEach(rec => {
      if (rec.pj) pjs.add(rec.pj);
    });
    return Array.from(pjs).sort();
  }, [pjTableRecords]);

  const filteredPjRecords = useMemo(() => {
    let records = pjTableRecords;
    if (selectedPjFilter !== 'ALL') {
      records = records.filter(rec => rec.pj === selectedPjFilter);
    }
    
    records = [...records].sort((a, b) => {
      let valA: any = a[pjSortColumn as keyof typeof a];
      let valB: any = b[pjSortColumn as keyof typeof b];
      
      if (pjSortColumn === 'progress') {
        valA = a.target > 0 ? (a.submit / a.target) : 0;
        valB = b.target > 0 ? (b.submit / b.target) : 0;
      }
      
      if (valA < valB) return pjSortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return pjSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return records;
  }, [pjTableRecords, selectedPjFilter, pjSortColumn, pjSortDirection]);

  const pjTableTotals = useMemo(() => {
    let submit = 0;
    let draft = 0;
    let total = 0;
    let target = 0;
    filteredPjRecords.forEach(rec => {
      submit += rec.submit;
      draft += rec.draft;
      total += rec.total;
      target += rec.target;
    });
    const progress = target > 0 ? parseFloat(((submit / target) * 100).toFixed(1)) : 0;
    return { submit, draft, total, target, progress };
  }, [filteredPjRecords]);

  // Rekap Mempawah Table parsed records
  const parsedMempawahRecords = useMemo(() => {
    return parseRekapMempawahCSV(rekapMempawahCSV);
  }, [rekapMempawahCSV]);

  // Unique filters for Rekap Mempawah
  const mempawahFilters = useMemo(() => {
    const pjs = new Set<string>();
    const desas = new Set<string>();
    const kecamatans = new Set<string>();
    const slss = new Set<string>();
    
    parsedMempawahRecords.forEach(rec => {
      if (rec.pj) pjs.add(rec.pj);
      if (rec.kecamatan) kecamatans.add(rec.kecamatan);
      
      // Hierarchical filtering logic
      const matchKec = selectedMempawahKecFilter === 'ALL' || rec.kecamatan === selectedMempawahKecFilter;
      const matchDesa = selectedMempawahDesaFilter === 'ALL' || rec.desa === selectedMempawahDesaFilter;

      if (matchKec && rec.desa) desas.add(rec.desa);
      if (matchKec && matchDesa && rec.sls) slss.add(rec.sls);
    });
    
    return {
      pjs: Array.from(pjs).sort(),
      desas: Array.from(desas).sort(),
      kecamatans: Array.from(kecamatans).sort(),
      slss: Array.from(slss).sort()
    };
  }, [parsedMempawahRecords, selectedMempawahKecFilter, selectedMempawahDesaFilter]);

  const filteredMempawahRecords = useMemo(() => {
    let records = parsedMempawahRecords.filter(rec => {
      const matchPj = selectedMempawahPjFilter === 'ALL' || rec.pj === selectedMempawahPjFilter;
      const matchDesa = selectedMempawahDesaFilter === 'ALL' || rec.desa === selectedMempawahDesaFilter;
      const matchKec = selectedMempawahKecFilter === 'ALL' || rec.kecamatan === selectedMempawahKecFilter;
      const matchSls = selectedMempawahSlsFilter === 'ALL' || rec.sls === selectedMempawahSlsFilter;
      return matchPj && matchDesa && matchKec && matchSls;
    });

    records = [...records].sort((a, b) => {
      let valA: any = a[mempawahSortColumn as keyof typeof a];
      let valB: any = b[mempawahSortColumn as keyof typeof b];
      
      if (mempawahSortColumn === 'progress') {
        valA = a.target > 0 ? (a.submit / a.target) : 0;
        valB = b.target > 0 ? (b.submit / b.target) : 0;
      }
      
      if (valA < valB) return mempawahSortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return mempawahSortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return records;
  }, [parsedMempawahRecords, selectedMempawahPjFilter, selectedMempawahDesaFilter, selectedMempawahKecFilter, selectedMempawahSlsFilter, mempawahSortColumn, mempawahSortDirection]);

  const mempawahTotals = useMemo(() => {
    let submit = 0;
    let draft = 0;
    let total = 0;
    let target = 0;
    let open = 0;
    filteredMempawahRecords.forEach(rec => {
      submit += rec.submit;
      draft += rec.draft;
      total += rec.total;
      target += rec.target;
      open += rec.open;
    });
    const progress = target > 0 ? parseFloat(((submit / target) * 100).toFixed(1)) : 0;
    return { submit, draft, total, target, open, progress };
  }, [filteredMempawahRecords]);

  // Mempawah Table pagination
  const MEMPAWAH_ITEMS_PER_PAGE = 10;
  const totalMempawahPages = Math.ceil(filteredMempawahRecords.length / MEMPAWAH_ITEMS_PER_PAGE) || 1;
  const paginatedMempawahRecords = useMemo(() => {
    const start = (mempawahTablePage - 1) * MEMPAWAH_ITEMS_PER_PAGE;
    return filteredMempawahRecords.slice(start, start + MEMPAWAH_ITEMS_PER_PAGE);
  }, [filteredMempawahRecords, mempawahTablePage]);

  // Reset page when Mempawah filters or sorting change
  useEffect(() => {
    setMempawahTablePage(1);
  }, [selectedMempawahPjFilter, selectedMempawahDesaFilter, selectedMempawahKecFilter, selectedMempawahSlsFilter, mempawahSortColumn, mempawahSortDirection]);

  // Helper to count SLS per PPL based on parsed Mempawah records
  const pplSlsCounts = useMemo(() => {
    const counts: Record<string, Set<string>> = {};
    parsedMempawahRecords.forEach(rec => {
      if (!counts[rec.pplName]) counts[rec.pplName] = new Set();
      counts[rec.pplName].add(`${rec.kecamatan}_${rec.desa}_${rec.sls}`);
    });
    const res: Record<string, number> = {};
    for (const [ppl, slsSet] of Object.entries(counts)) {
      res[ppl] = slsSet.size;
    }
    return res;
  }, [parsedMempawahRecords]);

  type PMLGroupItem = { pplName: string; submit: number; draft: number; total: number; progress: number; mempawahTarget: number; slsCount: number; cumulativeTarget: number; open: number };

  // Dynamic PML Groups for bottom recap comparison card tables
  const pmlGroups = useMemo<Record<string, PMLGroupItem[]>>(() => {
    const groups: Record<string, PMLGroupItem[]> = {};
    const elapsedDays = getCurrentDayOfPendataan();
    
    // Group table data by PML name from rekap data (parsedData.table1)
    parsedData.table1.forEach(rec => {
      if (!groups[rec.pmlName]) {
        groups[rec.pmlName] = [];
      }
      const recMempawahTarget = rec.mempawahTarget || rec.total;
      const expectedCumulative = Math.ceil((recMempawahTarget / 62) * elapsedDays);
      groups[rec.pmlName].push({
        pplName: rec.pplName,
        submit: rec.submit,
        draft: rec.draft,
        total: rec.total,
        mempawahTarget: recMempawahTarget,
        open: recMempawahTarget - (rec.submit + rec.draft),
        slsCount: pplSlsCounts[rec.pplName] || 0,
        cumulativeTarget: expectedCumulative,
        progress: recMempawahTarget > 0 ? parseFloat(((rec.submit / recMempawahTarget) * 100).toFixed(1)) : 0
      });
    });

    return groups;
  }, [parsedData.table1, pplSlsCounts]);

  // Calculate Sub Totals for each PML group
  const pmlSubTotals = useMemo(() => {
    const totals: Record<string, { submit: number; draft: number; total: number; mempawahTarget: number; progress: number; open: number }> = {};
    (Object.entries(pmlGroups) as [string, PMLGroupItem[]][]).forEach(([pmlName, list]) => {
      let subSubmit = 0;
      let subDraft = 0;
      let subTotal = 0;
      let subMempawahTarget = 0;
      let subOpen = 0;
      list.forEach(item => {
        subSubmit += item.submit;
        subDraft += item.draft;
        subTotal += item.total;
        subMempawahTarget += item.mempawahTarget || item.total;
        subOpen += item.open;
      });
      totals[pmlName] = {
        submit: subSubmit,
        draft: subDraft,
        total: subTotal,
        mempawahTarget: subMempawahTarget,
        open: subOpen,
        progress: subMempawahTarget > 0 ? parseFloat(((subSubmit / subMempawahTarget) * 100).toFixed(1)) : 0
      };
    });
    return totals;
  }, [pmlGroups]);

  // Combine and sort data for the unified bottom table, filtered dynamically by selectedPml
  const bottomTableData = useMemo(() => {
    const list: { pmlName: string; pplName: string; submit: number; draft: number; total: number; progress: number; mempawahTarget: number; open: number }[] = [];
    (Object.entries(pmlGroups) as [string, PMLGroupItem[]][]).forEach(([pmlName, ppls]) => {
      if (selectedPml !== 'ALL' && pmlName !== selectedPml) {
        return;
      }
      ppls.forEach(ppl => {
        list.push({
          pmlName,
          ...ppl
        });
      });
    });
    
    // Sort logic
    if (bottomTableSortConfig.key && bottomTableSortConfig.direction) {
      list.sort((a, b) => {
        let valA: any = a[bottomTableSortConfig.key as keyof typeof a];
        let valB: any = b[bottomTableSortConfig.key as keyof typeof b];
        
        if (typeof valA === 'string' && typeof valB === 'string') {
          return bottomTableSortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        } else if (typeof valA === 'number' && typeof valB === 'number') {
          return bottomTableSortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }
        return 0;
      });
    } else {
      // Default sort by PML Name, then by PPL Name
      list.sort((a, b) => a.pmlName.localeCompare(b.pmlName) || a.pplName.localeCompare(b.pplName));
    }
    return list;
  }, [pmlGroups, selectedPml, bottomTableSortConfig]);

  // Combine and sort data for the new Per PML table
  const pmlTableData = useMemo(() => {
    const list: { pmlName: string; submit: number; draft: number; total: number; progress: number; mempawahTarget: number; open: number }[] = [];
    (Object.entries(pmlSubTotals)).forEach(([pmlName, totals]) => {
      if (selectedPml !== 'ALL' && pmlName !== selectedPml) {
        return;
      }
      list.push({
        pmlName,
        ...totals
      });
    });
    
    // Sort logic
    if (pmlTableSortConfig.key && pmlTableSortConfig.direction) {
      list.sort((a, b) => {
        let valA: any = a[pmlTableSortConfig.key as keyof typeof a];
        let valB: any = b[pmlTableSortConfig.key as keyof typeof b];
        
        if (typeof valA === 'string' && typeof valB === 'string') {
          return pmlTableSortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        } else if (typeof valA === 'number' && typeof valB === 'number') {
          return pmlTableSortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }
        return 0;
      });
    } else {
      // Default sort by PML Name
      list.sort((a, b) => a.pmlName.localeCompare(b.pmlName));
    }
    return list;
  }, [pmlSubTotals, selectedPml, pmlTableSortConfig]);

  // Paginated PML table data
  const paginatedPmlTableData = useMemo(() => {
    const startIndex = (pmlTablePage - 1) * 10;
    return pmlTableData.slice(startIndex, startIndex + 10);
  }, [pmlTableData, pmlTablePage]);

  const totalPmlTablePages = useMemo(() => {
    return Math.ceil(pmlTableData.length / 10) || 1;
  }, [pmlTableData]);

  // Paginated bottom table data
  const paginatedBottomTableData = useMemo(() => {
    const startIndex = (bottomTablePage - 1) * 10;
    return bottomTableData.slice(startIndex, startIndex + 10);
  }, [bottomTableData, bottomTablePage]);

  const totalBottomTablePages = useMemo(() => {
    return Math.ceil(bottomTableData.length / 10) || 1;
  }, [bottomTableData]);

  // Target tracker helper for any selected PPL in Mempawah Deadline
  const selectedPplTrackerInfo = useMemo(() => {
    if (!targetTrackerPpl) return null;
    
    // Find in pmlGroups across all PMLs (unfiltered)
    const entries = Object.entries(pmlGroups) as [string, PMLGroupItem[]][];
    for (const [pmlName, list] of entries) {
      const found = list.find(p => p.pplName === targetTrackerPpl);
      if (found) {
        return {
          pmlName,
          pplName: found.pplName,
          submit: found.submit,
          draft: found.draft,
          total: found.total,
          progress: found.progress,
          mempawahTarget: found.mempawahTarget
        };
      }
    }
    return null;
  }, [pmlGroups, targetTrackerPpl]);

  // Calculation of target tracker data for all PPLs belonging to the active team or filtered set
  const pplsInActivePml = useMemo(() => {
    const list: {
      pmlName: string;
      pplName: string;
      submit: number;
      draft: number;
      total: number;
      progress: number;
      mempawahTarget: number;
      remainingTarget: number;
      dailyRequired: number;
      slsCount: number;
      cumulativeTarget: number;
    }[] = [];
    
    const entries = Object.entries(pmlGroups) as [string, PMLGroupItem[]][];
    const remainingDays = getRemainingDaysToMempawahDeadline();
    
    entries.forEach(([pmlName, pplList]) => {
      if (selectedPml !== 'ALL' && pmlName !== selectedPml) return;
      pplList.forEach(p => {
        const targetLimit = p.mempawahTarget || p.total || 0;
        const submitted = p.submit || 0;
        const remainingTarget = Math.max(0, targetLimit - submitted);
        const dailyRequired = remainingDays > 0 && remainingTarget > 0 ? Math.ceil(remainingTarget / remainingDays) : 0;
        list.push({
          pmlName,
          pplName: p.pplName,
          submit: submitted,
          draft: p.draft,
          total: p.total,
          progress: p.progress,
          mempawahTarget: targetLimit,
          remainingTarget,
          dailyRequired,
          slsCount: p.slsCount,
          cumulativeTarget: p.cumulativeTarget
        });
      });
    });
    
    return list.sort((a, b) => b.dailyRequired - a.dailyRequired || a.pplName.localeCompare(b.pplName));
  }, [pmlGroups, selectedPml]);

  // Active PPLs list filtered by the tracker search queries
  const filteredTrackerPpls = useMemo(() => {
    if (!trackerSearchInput.trim()) return pplsInActivePml;
    const q = trackerSearchInput.toLowerCase().trim();
    return pplsInActivePml.filter(p => 
      p.pplName.toLowerCase().includes(q) || 
      p.pmlName.toLowerCase().includes(q)
    );
  }, [pplsInActivePml, trackerSearchInput]);

  // Paginated active tracker PPLs array
  const paginatedTrackerPpls = useMemo(() => {
    const startIndex = (trackerPage - 1) * trackerItemsPerPage;
    return filteredTrackerPpls.slice(startIndex, startIndex + trackerItemsPerPage);
  }, [filteredTrackerPpls, trackerPage, trackerItemsPerPage]);

  // Total pages count for the active tracker section
  const totalTrackerPages = useMemo(() => {
    return Math.ceil(filteredTrackerPpls.length / trackerItemsPerPage) || 1;
  }, [filteredTrackerPpls, trackerItemsPerPage]);

  // Combined totals for the unified bottom table
  const bottomTableTotals = useMemo(() => {
    let submit = 0;
    let draft = 0;
    let total = 0;
    let mempawahTarget = 0;
    bottomTableData.forEach(item => {
      submit += item.submit;
      draft += item.draft;
      total += item.total;
      mempawahTarget += item.mempawahTarget || item.total;
    });
    const progress = mempawahTarget > 0 ? parseFloat(((submit / mempawahTarget) * 100).toFixed(1)) : 0;
    return { submit, draft, total, mempawahTarget, progress };
  }, [bottomTableData]);

  // Find top star PPL for each PML team based on average daily submit
  // "Apresiasi Bintang Petugas SE2026 ambil data dari sheet rekap"
  const teamStars = useMemo(() => {
    const pmlToPplSubmits: Record<string, Record<string, { totalVal: number; days: number }>> = {};
    const elapsedDays = getCurrentDayOfPendataan();
    
    parsedData.table1.forEach(rec => {
      if (!pmlToPplSubmits[rec.pmlName]) {
        pmlToPplSubmits[rec.pmlName] = {};
      }
      pmlToPplSubmits[rec.pmlName][rec.pplName] = { totalVal: rec.submit, days: elapsedDays };
    });

    const stars: { pmlName: string; pplName: string; submits: number; avg: number; initials: string }[] = [];
    Object.entries(pmlToPplSubmits).forEach(([pmlName, pplMap]) => {
      let topPpl = "";
      let maxAvg = -1;
      let totalSub = 0;
      
      Object.entries(pplMap).forEach(([pplName, data]) => {
        const avg = data.totalVal / elapsedDays;
        if (avg > maxAvg) {
          maxAvg = avg;
          topPpl = pplName;
          totalSub = data.totalVal;
        }
      });
      
      if (topPpl && maxAvg >= 0) {
        const initials = topPpl
          .split(' ')
          .filter(Boolean)
          .map(p => p.charAt(0))
          .join('')
          .substring(0, 2)
          .toUpperCase() || 'P';
          
        stars.push({
          pmlName,
          pplName: topPpl,
          submits: totalSub,
          avg: parseFloat(maxAvg.toFixed(2)),
          initials
        });
      }
    });

    // Only return top 3 stars with highest average submits
    return [...stars].sort((a, b) => b.avg - a.avg || b.submits - a.submits).slice(0, 3);
  }, [parsedData.table1]);

  // Compute live leaderboard lists (Paling Produktif vs Paling Tidak Produktif) - berdasarkan rekap
  // "Peringkat Produktivitas Petugas (Leaderboard) ambil data dari sheet rekap"
  const leaderboardList = useMemo(() => {
    const ppls: Record<string, { pplName: string; pmlName: string; submits: number; drafts: number; daysCount: number; submitsAvg: number; draftsAvg: number }> = {};
    const elapsedDays = getCurrentDayOfPendataan();
    
    parsedData.table1.forEach(rec => {
      if (selectedPml !== 'ALL' && rec.pmlName !== selectedPml) return;
      
      ppls[rec.pplName] = {
        pplName: rec.pplName,
        pmlName: rec.pmlName,
        submits: rec.submit,
        drafts: rec.draft,
        daysCount: elapsedDays,
        submitsAvg: parseFloat((rec.submit / elapsedDays).toFixed(2)),
        draftsAvg: parseFloat((rec.draft / elapsedDays).toFixed(2))
      };
    });

    const arr = Object.values(ppls);
    
    // Sort logic: priority average submits first
    const mostProductive = [...arr].sort((a, b) => b.submitsAvg - a.submitsAvg || b.draftsAvg - a.draftsAvg || b.submits - a.submits);
    const leastProductive = [...arr].sort((a, b) => a.submitsAvg - b.submitsAvg || a.draftsAvg - b.draftsAvg || a.submits - b.submits);

    return { mostProductive, leastProductive };
  }, [parsedData.table1, selectedPml]);

  // Selected list of officers for active leaderboard
  const activeLeaderboard = useMemo(() => {
    return leaderboardTab === 'most' ? leaderboardList.mostProductive : leaderboardList.leastProductive;
  }, [leaderboardList, leaderboardTab]);

  const handleBottomTableSort = (key: string) => {
    let direction: 'asc' | 'desc' | null = 'desc';
    if (bottomTableSortConfig.key === key) {
      if (bottomTableSortConfig.direction === 'desc') {
        direction = 'asc';
      } else if (bottomTableSortConfig.direction === 'asc') {
        direction = null;
      } else {
        direction = 'desc';
      }
    } else {
      direction = ['submit', 'draft', 'mempawahTarget', 'progress'].includes(key) ? 'desc' : 'asc';
    }
    setBottomTableSortConfig({ key, direction });
  };

  const renderSortIcon = (columnKey: string) => {
    if (bottomTableSortConfig.key !== columnKey || !bottomTableSortConfig.direction) return <ChevronsUpDown size={12} className="opacity-30 inline-block ml-1" />;
    if (bottomTableSortConfig.direction === 'asc') return <ChevronUp size={12} className="text-blue-600 inline-block ml-1" />;
    return <ChevronDown size={12} className="text-blue-600 inline-block ml-1" />;
  };

  const handlePmlTableSort = (key: string) => {
    let direction: 'asc' | 'desc' | null = 'desc';
    if (pmlTableSortConfig.key === key) {
      if (pmlTableSortConfig.direction === 'desc') {
        direction = 'asc';
      } else if (pmlTableSortConfig.direction === 'asc') {
        direction = null;
      } else {
        direction = 'desc';
      }
    } else {
      direction = ['submit', 'draft', 'mempawahTarget', 'progress'].includes(key) ? 'desc' : 'asc';
    }
    setPmlTableSortConfig({ key, direction });
  };

  const renderPmlSortIcon = (columnKey: string) => {
    if (pmlTableSortConfig.key !== columnKey) return <span className="text-slate-300 ml-1">↕</span>;
    if (pmlTableSortConfig.direction === 'asc') return <span className="text-blue-600 ml-1">↑</span>;
    if (pmlTableSortConfig.direction === 'desc') return <span className="text-blue-600 ml-1">↓</span>;
    return <span className="text-slate-300 ml-1">↕</span>;
  };

  const handlePjTableSort = (key: string) => {
    if (pjSortColumn === key) {
      setPjSortDirection(pjSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setPjSortColumn(key);
      setPjSortDirection(['submit', 'draft', 'total', 'target', 'progress'].includes(key) ? 'desc' : 'asc');
    }
  };

  const renderPjSortIcon = (columnKey: string) => {
    if (pjSortColumn !== columnKey) return <ChevronsUpDown size={12} className="opacity-30 inline-block ml-1" />;
    if (pjSortDirection === 'asc') return <ChevronUp size={12} className="text-indigo-600 inline-block ml-1" />;
    return <ChevronDown size={12} className="text-indigo-600 inline-block ml-1" />;
  };

  const handleMempawahTableSort = (key: string) => {
    if (mempawahSortColumn === key) {
      setMempawahSortDirection(mempawahSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setMempawahSortColumn(key);
      setMempawahSortDirection(['submit', 'draft', 'total', 'target', 'progress'].includes(key) ? 'desc' : 'asc');
    }
  };

  const renderMempawahSortIcon = (columnKey: string) => {
    if (mempawahSortColumn !== columnKey) return <ChevronsUpDown size={12} className="opacity-30 inline-block ml-1" />;
    if (mempawahSortDirection === 'asc') return <ChevronUp size={12} className="text-emerald-600 inline-block ml-1" />;
    return <ChevronDown size={12} className="text-emerald-600 inline-block ml-1" />;
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* Top Header Section */}
      <header className="sticky top-0 z-50 flex items-start sm:items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 bg-white/95 backdrop-blur-md border-b border-slate-200 shrink-0 gap-3 shadow-xs">
        {/* Logo on the left */}
        <div className="flex-shrink-0 pt-0.5 sm:pt-0">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
        </div>

        {/* Content: Title & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-2 sm:gap-3">
          
          {/* Title and Subtitle */}
          <div className="flex flex-col">
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-800 leading-tight">
              Monitoring Pendataan Lapangan Sensus Ekonomi 2026
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-500 flex items-center gap-1 font-semibold mt-0.5">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0"></span> 
              Garda BPS Kabupaten Mempawah
            </p>
          </div>

          {/* Dynamic header widgets */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Filter Toggle Button for Mobile */}
            <button
              onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
              className="xl:hidden bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1.5 rounded flex items-center justify-center transition-colors"
              title="Toggle Filters"
            >
              <Filter size={14} />
            </button>

            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 hidden xl:flex items-center gap-1 mr-1">
              <Filter size={11} /> Filter:
            </span>

            <select 
              value={selectedPml} 
              onChange={handlePmlChange}
              className="bg-white border border-slate-300 rounded px-1.5 py-1 sm:px-2 sm:py-1 text-xs outline-hidden font-medium text-slate-700 cursor-pointer hover:border-slate-400"
            >
              <option value="ALL">PML: Semua Tim</option>
              {parsedData.pmlList.map(pml => (
                <option key={pml} value={pml}>{`PML: ${pml}`}</option>
              ))}
            </select>

            {/* PPL Selector */}
            <select
              value={selectedPpl}
              onChange={(e) => setSelectedPpl(e.target.value)}
              className={`${isMobileFilterOpen ? 'block' : 'hidden'} xl:block bg-slate-50 border border-slate-300 rounded px-1.5 py-1 sm:px-2 sm:py-1 text-xs outline-hidden font-medium text-slate-700 cursor-pointer hover:border-slate-400`}
            >
              <option value="ALL">Semua PPL</option>
              {filteredPplList.map(p => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>

            {/* Date Selector */}
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={`${isMobileFilterOpen ? 'block' : 'hidden'} xl:block bg-slate-50 border border-slate-300 rounded px-1.5 py-1 sm:px-2 sm:py-1 text-xs outline-hidden font-medium text-slate-700 cursor-pointer hover:border-slate-400`}
            >
              <option value="ALL">Semua Tanggal</option>
              {dateList.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            {/* Search Input */}
            <div className={`relative ${isMobileFilterOpen ? 'block' : 'hidden'} xl:block`}>
              <input
                type="text"
                placeholder="Cari..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded pl-6 pr-2 py-1 text-xs text-slate-700 outline-hidden focus:border-blue-600 focus:bg-white w-24 sm:w-32 lg:w-48 transition-colors"
              />
              <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Reset Filters */}
            {(selectedPml !== 'ALL' || selectedPpl !== 'ALL' || selectedDate !== 'ALL' || searchQuery !== '') && (
              <button
                onClick={() => {
                  setSelectedPml('ALL');
                  setSelectedPpl('ALL');
                  setSelectedDate('ALL');
                  setSearchQuery('');
                }}
                className={`${isMobileFilterOpen ? 'block' : 'hidden'} xl:block text-[10px] sm:text-xs text-red-600 hover:text-red-700 font-semibold bg-red-50 hover:bg-red-100 rounded px-1.5 py-1 sm:px-2.5 transition-colors cursor-pointer`}
              >
                Reset
              </button>
            )}

            <button 
              onClick={() => fetchSheetData(false)}
              disabled={isLiveLoading}
              id="sync-now-btn"
              className="bg-blue-600 text-white px-2 py-1 sm:px-2.5 sm:py-1 rounded text-xs sm:text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1.5 ml-1"
            >
              <RefreshCw size={14} className={isLiveLoading ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Sync</span>
            </button>
          </div>
        </div>
      </header>

      {/* Warning banner */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-amber-50 border-b border-amber-205 text-amber-900 px-4 py-2 text-xs font-medium flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="text-amber-600" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-[10px] uppercase font-bold text-slate-500 hover:text-slate-900">
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Grid with dynamic layout spacing */}
      <main className="flex-1 p-4 grid grid-cols-12 gap-4">





        {/* KPI Bar */}
        <div className="col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Submit */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col justify-between shadow-2xs h-24">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Submit (Hari Ini / Filter)</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-green-600">
                {metricsKPIs.dailySubmit >= 0 ? `+${metricsKPIs.dailySubmit}` : metricsKPIs.dailySubmit}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">berkas dari {metricsKPIs.pplCount} PPL</span>
            </div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Kontribusi Bersih Harian
            </div>
          </div>

          {/* Card 2: Total Draft */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col justify-between shadow-2xs h-24">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Draft (Saat Ini)</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-amber-500">{metricsKPIs.cumDraft}</span>
              <span className="text-[11px] text-slate-400 font-medium">perlu re-review</span>
            </div>
            <div className="text-[10px] text-slate-450 font-semibold flex items-center gap-1 mt-1 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Diperbarui: {lastUpdate || '-'}
            </div>
          </div>

          {/* Card 3: Target Completion Progress */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col justify-between shadow-2xs h-24">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Akumulasi Progres Target</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black text-slate-800">{metricsKPIs.cumSubmit}</span>
              <span className="text-xs text-blue-600 font-extrabold bg-blue-50 px-1.5 py-0.5 rounded">
                {metricsKPIs.cumMempawahTarget > 0 ? ((metricsKPIs.cumSubmit / metricsKPIs.cumMempawahTarget) * 100).toFixed(1) : '0'}% Selesai
              </span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-blue-600 h-full transition-all duration-500" 
                style={{ width: `${metricsKPIs.cumMempawahTarget > 0 ? Math.min((metricsKPIs.cumSubmit / metricsKPIs.cumMempawahTarget) * 100, 100) : 0}%` }}
              ></div>
            </div>
          </div>
          {/* Card 4: Most Active Officer PPL */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col justify-between shadow-2xs h-24">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">PPL Paling Aktif (Submit)</span>
            <div className="flex items-center gap-2.5 mt-1">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-black text-xs shrink-0 border border-indigo-200 shadow-2xs">
                {mostActivePpl.initials}
              </div>
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-xs font-extrabold text-slate-800 truncate">{mostActivePpl.name}</span>
                <span className="text-[10px] text-green-600 font-bold">Rerata: {mostActivePpl.avg} / hari</span>
              </div>
            </div>
            <div className="text-[9px] text-indigo-500 font-bold uppercase tracking-wider mt-1">Productivity Winner</div>
          </div>
        </div>

        {/* Kabupaten Mempawah Buffer Deadline Tracker */}
        <div className="col-span-12 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] bg-red-50 border border-red-200 text-red-700 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Buffer Target Kabupaten Mempawah
                </span>
                <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-700 font-sans font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                  Deadline: 15 Agustus 2026
                </span>
              </div>
              <h2 className="text-lg font-black mt-1.5 text-slate-800 tracking-tight flex items-center gap-2">
                🎯 Pelacak Target Harian Petugas (Akselerasi Tepat Waktu)
              </h2>
              <p className="text-slate-500 text-xs mt-0.5 font-medium">Hitung mundur sisa hari kerja hingga target penyelesaian buffer tanggal 15 Agustus 2026.</p>
            </div>
            <div className="flex items-center gap-3 shrink-0 bg-slate-50 border border-slate-200 rounded-lg p-3 shadow-3xs">
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                <Calendar size={18} />
              </div>
              <div className="text-left font-sans min-w-[110px]">
                <div className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Sisa Hari Kerja</div>
                <div className="text-base font-black font-mono text-orange-600">{getRemainingDaysToMempawahDeadline()} Hari Lagi</div>
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mt-4 bg-slate-55 border border-slate-150 p-3 rounded-lg shadow-3xs">
            <div className="relative w-full md:w-72">
              <input
                type="text"
                placeholder="Cari nama PPL..."
                value={trackerSearchInput}
                onChange={(e) => {
                  setTrackerSearchInput(e.target.value);
                  setTrackerPage(1);
                }}
                className="w-full bg-white hover:bg-slate-50 focus:bg-white border border-slate-250 rounded px-2.5 py-1.5 pl-8 text-xs text-slate-800 font-bold outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500/10 transition-all shadow-3xs"
              />
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              {trackerSearchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setTrackerSearchInput('');
                    setTrackerPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-605 font-extrabold text-[10px] bg-slate-100 px-1 rounded-sm"
                >
                  Clear
                </button>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-md shadow-3xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Tampil:</span>
                <select 
                  value={trackerItemsPerPage}
                  onChange={(e) => {
                    setTrackerItemsPerPage(Number(e.target.value));
                    setTrackerPage(1);
                  }}
                  className="bg-transparent border-none text-[10px] font-black text-slate-700 outline-hidden cursor-pointer"
                >
                  <option value={3}>3 Kartu</option>
                  <option value={6}>6 Kartu</option>
                  <option value={9}>9 Kartu</option>
                  <option value={12}>12 Kartu</option>
                  <option value={50}>50 Kartu</option>
                </select>
              </div>
              <div className="bg-orange-100 text-orange-950 border border-orange-205 px-2.5 py-1 rounded-md font-sans font-extrabold text-[10px] uppercase">
                Filter PML Aktif: <span className="underline">{selectedPml === 'ALL' ? 'Semua Tim' : selectedPml}</span>
              </div>
              <div className="bg-slate-100 text-slate-750 border border-slate-220 px-2.5 py-1 rounded-md font-sans font-extrabold text-[10px] uppercase">
                Total PPL Terpilih: {filteredTrackerPpls.length} / {pplsInActivePml.length} Orang
              </div>
            </div>
          </div>

          {/* Cards Grid of all PPLs under selected/active PML team */}
          {paginatedTrackerPpls.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
              {paginatedTrackerPpls.map((ppl) => {
                const isFinished = ppl.remainingTarget === 0;
                return (
                  <div 
                    key={ppl.pplName}
                    className="bg-linear-to-b from-white to-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col justify-between shadow-3xs hover:shadow-2xs hover:border-orange-200 transition-all duration-300 relative overflow-hidden"
                  >
                    {/* Top part: Name & Supervisor PML */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="min-w-0">
                          <div className="text-sm font-black text-slate-800 tracking-tight truncate(26)" title={ppl.pplName}>{ppl.pplName}</div>
                          <div className="text-[9.5px] text-slate-450 font-bold uppercase tracking-wider mt-1 leading-none">
                            Supervisor: {ppl.pmlName}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div className="text-[7.5px] text-blue-400 font-black uppercase tracking-wider leading-none">Target Hari Ini</div>
                            <div className="text-xs font-black text-blue-600 font-mono mt-0.5">
                              {ppl.mempawahTarget > 0 ? ((ppl.cumulativeTarget / ppl.mempawahTarget) * 100).toFixed(1) : 0}%
                            </div>
                          </div>
                          <div className="text-right border-l border-slate-200 pl-3">
                            <div className="text-[7.5px] text-slate-400 font-black uppercase tracking-wider leading-none">Progres target</div>
                            <div className="text-xs font-black text-orange-600 font-mono mt-0.5">{ppl.progress}%</div>
                          </div>
                        </div>
                      </div>

                      {/* Horizontal progress bar */}
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden shadow-inner mt-2 relative">
                        <div 
                          className="absolute top-0 bottom-0 bg-blue-400/30 border-r border-blue-500 z-0"
                          style={{ width: `${ppl.mempawahTarget > 0 ? Math.min(100, (ppl.cumulativeTarget / ppl.mempawahTarget) * 100) : 0}%` }}
                        />
                        <div 
                          className="bg-linear-to-r from-orange-400 to-amber-500 h-full rounded-full transition-all duration-500 relative z-10"
                          style={{ width: `${Math.min(100, ppl.progress)}%` }}
                        />
                      </div>

                      {/* Stats Breakdowns row */}
                      <div className="grid grid-cols-3 gap-1.5 text-center mt-3">
                        <div className="bg-white p-1.5 border border-slate-150 shadow-3xs rounded-md min-w-0">
                          <div className="text-[7.5px] text-slate-400 uppercase font-black tracking-tight leading-none truncate">Total SLS</div>
                          <div className="text-xs font-black text-slate-850 font-mono mt-1">{ppl.slsCount}</div>
                        </div>
                        <div className="bg-white p-1.5 border border-slate-150 shadow-3xs rounded-md min-w-0">
                          <div className="text-[7.5px] text-slate-400 uppercase font-black tracking-tight leading-none truncate">Target Akhir</div>
                          <div className="text-xs font-black text-slate-850 font-mono mt-1">{ppl.mempawahTarget}</div>
                        </div>
                        <div className="bg-white p-1.5 border border-slate-150 shadow-3xs rounded-md min-w-0">
                          <div className="text-[7.5px] text-emerald-600 uppercase font-black tracking-tight leading-none truncate">Telah Submit</div>
                          <div className="text-xs font-black text-emerald-600 font-mono mt-1">{ppl.submit}</div>
                        </div>
                        <div className="bg-white p-1.5 border border-slate-150 shadow-3xs rounded-md min-w-0">
                          <div className="text-[7.5px] text-amber-650 uppercase font-bold tracking-tight leading-none truncate">Jumlah Draf</div>
                          <div className="text-xs font-black text-amber-500 font-mono mt-1">{ppl.draft}</div>
                        </div>
                        <div className="bg-white p-1.5 border border-slate-150 shadow-3xs rounded-md min-w-0">
                          <div className="text-[7.5px] text-red-500 uppercase font-black tracking-tight leading-none truncate">Sisa Dokumen</div>
                          <div className="text-xs font-black text-red-500 font-mono mt-1">{ppl.remainingTarget}</div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom part: Required Daily Speed limits */}
                    <div className="bg-orange-50/60 border border-orange-100 p-2.5 rounded-lg flex items-center justify-between gap-1.5 text-left mt-3.5">
                      <div className="min-w-0">
                        <span className="text-[8.5px] uppercase font-black tracking-wider text-orange-850 block">Target Submit Hari Ini</span>
                        <span className="text-[8.5px] text-slate-500 font-bold leading-normal truncate block">
                          {isFinished ? "Apresiasi Luar Biasa!" : "Minimal disubmit / hari kerja"}
                        </span>
                      </div>
                      {!isFinished ? (
                        <div className="bg-slate-900 border border-slate-850 text-white font-mono px-2.5 py-1 rounded-md text-center shadow-xs shrink-0 flex flex-col items-center justify-center">
                          <span className="text-sm font-black leading-none">{ppl.dailyRequired}</span>
                          <span className="text-[7.5px] text-slate-300 font-sans font-extrabold uppercase tracking-widest mt-0.5 leading-none">Dok / Hari</span>
                        </div>
                      ) : (
                        <div className="bg-emerald-600 text-white font-sans font-black text-[8.5px] px-2.5 py-1 rounded-md uppercase tracking-wider shrink-0 shadow-xs text-center">
                          Selesai! 🎉
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-250 mt-4">
              <span className="text-slate-400 font-bold text-center text-xs">Petugas (PPL) dalam filter PML ini tidak ditemukan atau kata kunci tidak pas.</span>
              <button 
                type="button"
                onClick={() => setTrackerSearchInput('')} 
                className="mt-2.5 text-[10px] font-black uppercase text-orange-600 hover:text-orange-700 bg-white border border-orange-200 px-3 py-1 rounded shadow-3xs cursor-pointer"
              >
                Reset Pencarian
              </button>
            </div>
          )}

          {/* Pagination Controls */}
          {totalTrackerPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-3.5 mt-5">
              <button
                type="button"
                onClick={() => setTrackerPage(prev => Math.max(1, prev - 1))}
                disabled={trackerPage === 1}
                className="px-3 py-1 text-xs font-extrabold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Sebelumnya
              </button>
              <span className="text-xs text-slate-500 font-mono font-bold">
                Halaman {trackerPage} / {totalTrackerPages}
              </span>
              <button
                type="button"
                onClick={() => setTrackerPage(prev => Math.min(totalTrackerPages, prev + 1))}
                disabled={trackerPage === totalTrackerPages}
                className="px-3 py-1 text-xs font-extrabold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Berikutnya
              </button>
            </div>
          )}
        </div>

        {/* Dynamic Team Stars Appreciation & Leaderboard Rank */}
        <div className="col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Left Column: Stack of Appreciation Cards */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            
            {/* Apresiasi Bintang Petugas SE2026 */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col shadow-2xs">
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
                <h2 className="text-xs sm:text-sm font-bold flex items-center gap-2 text-slate-800">
                  <Sparkles size={14} className="text-amber-500 fill-amber-500" />
                  Apresiasi Bintang Petugas SE2026
                </h2>
              <span className="text-[9px] bg-amber-50 text-amber-700 font-extrabold px-2 py-0.5 rounded border border-amber-100 uppercase tracking-widest">
                {selectedDate === 'ALL' ? 'Semua Tanggal' : selectedDate}
              </span>
            </div>
            
            <div className="flex-1 flex flex-col justify-center gap-3">
              {teamStars.length > 0 ? (
                teamStars.map((star) => (
                  <div key={star.pmlName} className="p-3 bg-gradient-to-r from-amber-500/5 to-yellow-500/5 border border-amber-100 rounded-lg flex items-center justify-between gap-3 relative overflow-hidden">
                    <div className="absolute right-2 top-2 text-amber-500/5 select-none pointer-events-none">
                      <Sparkles size={48} />
                    </div>
                    
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-amber-100 border-2 border-amber-200 rounded-full flex items-center justify-center text-amber-700 font-black text-xs shrink-0 shadow-2xs">
                        {star.initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider truncate">{`Tim PML: ${star.pmlName}`}</p>
                        <h4 className="text-xs font-black text-slate-850 truncate">{star.pplName}</h4>
                        <p className="text-[10px] text-slate-500 font-medium">Bintang produktivitas tim</p>
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <span className="text-[11px] bg-amber-100 text-amber-850 font-black px-2.5 py-1 rounded border border-amber-200 shadow-3xs block font-mono">
                        Rerata: {star.avg}/hari
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs font-semibold flex flex-col items-center justify-center gap-2">
                  <Sparkles size={24} className="text-slate-300" />
                  <span>Tidak ada data kontribusi untuk menghitung Bintang Tim.</span>
                </div>
              )}
            </div>
          </div>

          {/* Apresiasi Bintang Progres Teraktif Hari Ini */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col shadow-2xs h-[360px]">
            <div className="flex justify-between items-center mb-1 pb-1.5 border-b border-slate-100">
              <h2 className="text-xs sm:text-sm font-bold flex items-center gap-2 text-slate-800">
                <Sparkles size={14} className="text-orange-500 fill-orange-500" />
                Apresiasi Bintang Progres Teraktif Hari Ini
              </h2>
              <span className="text-[9px] bg-orange-50 text-orange-700 px-2 py-0.5 rounded border border-orange-100 font-black uppercase tracking-wider">
                {activeProgresHarianDate || 'Aktif'}
              </span>
            </div>

            {/* Interactive Leader sorting controls */}
            <div className="flex flex-wrap gap-1.5 my-2 bg-slate-50 p-1.5 rounded-lg border border-slate-150 justify-between items-center">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500 font-extrabold">Urut:</span>
                <button
                  type="button"
                  onClick={() => setLeaderSortKey('submit')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${leaderSortKey === 'submit' ? 'bg-orange-600 text-white shadow-3xs' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
                >
                  Submit
                </button>
                <button
                  type="button"
                  onClick={() => setLeaderSortKey('draft')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${leaderSortKey === 'draft' ? 'bg-orange-600 text-white shadow-3xs' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
                >
                  Draft
                </button>
              </div>
              <button
                type="button"
                onClick={() => setLeaderSortDir(prev => prev === 'desc' ? 'asc' : 'desc')}
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 flex items-center gap-1 cursor-pointer transition-all"
              >
                {leaderSortDir === 'desc' ? <ArrowDown size={10} className="text-orange-600" /> : <ArrowUp size={10} className="text-orange-600" />}
                <span>{leaderSortDir === 'desc' ? 'Terbanyak' : 'Terkecil'}</span>
              </button>
            </div>

            {/* Real-time search filter for PPL */}
            <div className="relative mb-2.5">
              <input 
                type="text"
                placeholder="Cari PPL..."
                value={localPplFilter}
                onChange={(e) => setLocalPplFilter(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded px-2.5 py-1.5 pl-8 text-xs text-slate-755 outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500/10 transition-all shadow-3xs"
              />
              <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              {localPplFilter && (
                <button 
                  onClick={() => setLocalPplFilter('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold font-sans text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Styled List element */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
              {filteredLeaders.length > 0 ? (
                filteredLeaders.map(ppl => (
                  <div key={ppl.name} className="p-2 bg-slate-50 border border-slate-100 rounded-md flex justify-between items-center text-xs hover:border-slate-300 transition-colors">
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="font-extrabold text-slate-800 truncate">{ppl.name}</span>
                      <span className="text-[9px] text-slate-550 font-semibold">{ppl.pmlName}</span>
                    </div>
                    <div className="text-right flex-shrink-0 font-mono font-bold text-[11px] space-x-1.5">
                      <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100">S: +{ppl.submit}</span>
                      <span className="text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">D: +{ppl.draft}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs py-6 gap-2">
                  <Search size={18} className="text-slate-300" />
                  <span>Tidak ada data pemimpin progres.</span>
                </div>
              )}
            </div>
          </div>

          </div>

          {/* Leaderboard Produktivitas Terurut */}
          <div className="lg:col-span-7 bg-white p-4 rounded-lg border border-slate-200 flex flex-col shadow-2xs">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 pb-2 border-b border-slate-100 gap-2">
              <div>
                <h2 className="text-xs sm:text-sm font-bold flex items-center gap-2 text-slate-800">
                  <TrendingUp size={14} className={leaderboardTab === 'most' ? "text-emerald-600" : "text-rose-500"} />
                  Peringkat Produktivitas Petugas (Leaderboard)
                </h2>
                <p className="text-[9px] text-slate-550 font-semibold leading-none">Berdasarkan rata-rata submit harian dalam rentang waktu filter aktif</p>
              </div>
              
              <div className="flex bg-slate-100/80 p-0.5 rounded border border-slate-200 text-[10px] font-bold shrink-0 self-end sm:self-auto">
                <button
                  onClick={() => setLeaderboardTab('most')}
                  className={`px-3 py-1 rounded cursor-pointer transition-all ${leaderboardTab === 'most' ? 'bg-white text-emerald-600 shadow-3xs border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Terproduktif 🚀
                </button>
                <button
                  onClick={() => setLeaderboardTab('least')}
                  className={`px-3 py-1 rounded cursor-pointer transition-all ${leaderboardTab === 'least' ? 'bg-white text-rose-600 shadow-3xs border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Kurang Produktif ⚠️
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[500px] space-y-1.5 pr-1 scrollbar-thin">
              {activeLeaderboard.length > 0 ? (
                activeLeaderboard.map((item, idx) => {
                  const maxSubmitsAvg = Math.max(...leaderboardList.mostProductive.map(i => i.submitsAvg), 1);
                  const pct = Math.min((item.submitsAvg / maxSubmitsAvg) * 100, 100);
                  
                  return (
                    <div key={item.pplName} className="p-2 bg-slate-50 border border-slate-100 rounded-md flex items-center justify-between gap-3 text-xs hover:border-slate-200 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="w-5 text-center font-mono font-bold text-slate-400">#{idx + 1}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between mb-1 gap-1">
                            <span className="font-extrabold text-slate-800 truncate">{item.pplName}</span>
                            <span className="text-[9px] text-slate-450 truncate font-semibold">{item.pmlName}</span>
                          </div>
                          {/* Mini Progress Bar */}
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-305 ${leaderboardTab === 'most' ? 'bg-emerald-500' : 'bg-rose-400'}`} 
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right shrink-0 pl-1 font-mono font-bold text-[11px] whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${item.submitsAvg >= 10 ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' : item.submitsAvg > 0 ? 'bg-blue-50 text-blue-700 border border-blue-150' : 'bg-slate-100 text-slate-500'}`}>
                          Avg: {item.submitsAvg}/hari
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Tidak ada data untuk menyusun peringkat.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mid Section: Full-width Charts */}
        <div className="col-span-12 bg-white p-4 rounded-lg border border-slate-200 flex flex-col shadow-2xs min-h-[360px]">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
            <h2 className="text-xs sm:text-sm font-bold flex items-center gap-2 text-slate-800">
              <span className="w-1.5 h-4 bg-blue-600 rounded-full"></span>
              Tren Progres Harian (Non-Akumulasi)
            </h2>
            <div className="flex gap-4 text-[10px] font-bold text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-green-500 rounded-xs"></span> SUBMIT
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-amber-400 rounded-xs"></span> DRAFT
              </div>
            </div>
          </div>
          
          {/* Visual Recharts Bar & Lines Chart */}
          <div className="flex-1 min-h-[260px] w-full">
            {trendChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={trendChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="dateStr" 
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: '#64748b', fontSize: 10 }} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'white', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                    labelStyle={{ fontWeight: 'bold', color: '#1e293b', fontSize: '11px' }}
                  />
                  <Legend verticalAlign="top" height={28} iconSize={8} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                  <Line name="Submit Baru (Delta)" type="monotone" dataKey="SUBMIT" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line name="Draf Baru (Delta)" type="monotone" dataKey="DRAFT" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </RechartsLineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2.5">
                <LucideLineChart size={32} className="text-slate-300" />
                <p className="text-xs font-semibold">Tidak ada data tren dalam jangkauan filter.</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section: Unified Akumulasi Table with PML Filter */}
        <div className="col-span-12 bg-white rounded-lg border border-slate-200 flex flex-col shadow-2xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-705 uppercase flex items-center gap-2">
                <Users size={15} className="text-blue-600" />
                Table Akumulasi Progres Petugas (Per PPL)
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">Informasi menyeluruh penyelesaian target untuk seluruh tim lapangan berdasarkan rekap terkini</p>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-150">
                <tr className="text-slate-500 uppercase tracking-wider font-extrabold text-[10px]">
                  <th className="p-3 pl-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleBottomTableSort('pmlName')}>
                    PML Supervisor {renderSortIcon('pmlName')}
                  </th>
                  <th className="p-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleBottomTableSort('pplName')}>
                    Nama PPL {renderSortIcon('pplName')}
                  </th>
                  <th className="p-3 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleBottomTableSort('submit')}>
                    Submit {renderSortIcon('submit')}
                  </th>
                  <th className="p-3 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleBottomTableSort('draft')}>
                    Draft {renderSortIcon('draft')}
                  </th>
                  <th className="p-3 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleBottomTableSort('mempawahTarget')}>
                    Target (Kolom F) {renderSortIcon('mempawahTarget')}
                  </th>
                  <th className="p-3 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleBottomTableSort('open')}>
                    Open {renderSortIcon('open')}
                  </th>
                  <th className="p-3 text-right pr-6 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleBottomTableSort('progress')}>
                    Progres (%) {renderSortIcon('progress')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                {paginatedBottomTableData.length > 0 ? (
                  paginatedBottomTableData.map((ppl, index) => (
                    <tr key={ppl.pplName} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-2.5 pl-4 font-sans font-bold text-slate-600">{ppl.pmlName}</td>
                      <td className="p-2.5 font-sans font-semibold text-slate-800">{ppl.pplName}</td>
                      <td className="p-2.5 text-center font-bold text-slate-800">{ppl.submit}</td>
                      <td className="p-2.5 text-center text-slate-400">{ppl.draft}</td>
                      <td className="p-2.5 text-center">{ppl.mempawahTarget}</td>
                      <td className="p-2.5 text-center font-bold text-rose-500">{ppl.open}</td>
                      <td className="p-2.5 text-right pr-6 font-bold text-blue-600">
                        <div className="inline-flex items-center gap-1.5 justify-end w-full">
                          <span className="text-[11px] font-bold text-slate-700">{ppl.progress}%</span>
                          <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden hidden sm:block">
                            <div 
                              className="bg-blue-600 h-full rounded-full"
                              style={{ width: `${Math.min(100, ppl.progress)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-sans">
                      Tidak ada data akumulasi petugas untuk filter PML terpilih.
                    </td>
                  </tr>
                )}
                
                {/* Granular Table totals row at bottom */}
                {bottomTableData.length > 0 && (
                  <tr className="bg-blue-50/40 font-bold border-t border-blue-100">
                    <td colSpan={2} className="p-3 pl-4 font-black font-sans uppercase text-slate-700">
                      TOTAL {selectedPml === 'ALL' ? 'TIM GABUNGAN' : `TIM ${selectedPml.toUpperCase()}`}
                    </td>
                    <td className="p-3 text-center font-black text-slate-800">{bottomTableTotals.submit}</td>
                    <td className="p-3 text-center font-black text-slate-400">{bottomTableTotals.draft}</td>
                    <td className="p-3 text-center text-slate-700 font-black">{bottomTableTotals.mempawahTarget}</td>
                    <td className="p-3 text-center text-rose-600 font-black">{bottomTableTotals.open}</td>
                    <td className="p-3 text-right pr-6 font-black text-blue-700 font-sans">
                      <span className="font-extrabold text-blue-700 inline-block px-1.5 py-0.5 rounded bg-blue-100/50">{bottomTableTotals.progress}%</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {bottomTableData.length > 0 && (
            <div className="p-3 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500 font-semibold">
              <div>
                Menampilkan <span className="text-slate-800 font-bold">{(bottomTablePage - 1) * 10 + 1}</span> - <span className="text-slate-800 font-bold">{Math.min(bottomTablePage * 10, bottomTableData.length)}</span> dari <span className="text-slate-800 font-bold">{bottomTableData.length}</span> petugas
              </div>
              <div className="flex gap-1.5">
                <button
                  disabled={bottomTablePage === 1}
                  onClick={() => setBottomTablePage(prev => Math.max(1, prev - 1))}
                  className="px-2.5 py-1 bg-white border border-slate-250 rounded hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-755 font-bold transition-all disabled:cursor-not-allowed cursor-pointer"
                >
                  Sebelumnya
                </button>
                <div className="flex items-center px-1 text-slate-700 font-sans font-bold text-[11px]">
                  Halaman {bottomTablePage} / {totalBottomTablePages}
                </div>
                <button
                  disabled={bottomTablePage === totalBottomTablePages}
                  onClick={() => setBottomTablePage(prev => Math.min(totalBottomTablePages, prev + 1))}
                  className="px-2.5 py-1 bg-white border border-slate-250 rounded hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-755 font-bold transition-all disabled:cursor-not-allowed cursor-pointer"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Section: Unified Akumulasi Table (Per PML) */}
        <div className="col-span-12 bg-white rounded-lg border border-slate-200 flex flex-col shadow-2xs overflow-hidden mt-4">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-705 uppercase flex items-center gap-2">
                <Users size={15} className="text-blue-600" />
                Table Akumulasi Progres Petugas (Per PML)
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">Informasi menyeluruh penyelesaian target diagregasi pada tingkat Supervisor/PML</p>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-150">
                <tr className="text-slate-500 uppercase tracking-wider font-extrabold text-[10px]">
                  <th className="p-3 pl-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handlePmlTableSort('pmlName')}>
                    PML Supervisor {renderPmlSortIcon('pmlName')}
                  </th>
                  <th className="p-3 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handlePmlTableSort('submit')}>
                    Submit {renderPmlSortIcon('submit')}
                  </th>
                  <th className="p-3 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handlePmlTableSort('draft')}>
                    Draft {renderPmlSortIcon('draft')}
                  </th>
                  <th className="p-3 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handlePmlTableSort('mempawahTarget')}>
                    Target (Kolom F) {renderPmlSortIcon('mempawahTarget')}
                  </th>
                  <th className="p-3 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handlePmlTableSort('open')}>
                    Open {renderPmlSortIcon('open')}
                  </th>
                  <th className="p-3 text-right pr-6 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handlePmlTableSort('progress')}>
                    Progres (%) {renderPmlSortIcon('progress')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                {paginatedPmlTableData.length > 0 ? (
                  paginatedPmlTableData.map((pml, index) => (
                    <tr key={pml.pmlName} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-2.5 pl-4 font-sans font-bold text-slate-600">{pml.pmlName}</td>
                      <td className="p-2.5 text-center font-bold text-slate-800">{pml.submit}</td>
                      <td className="p-2.5 text-center text-slate-400">{pml.draft}</td>
                      <td className="p-2.5 text-center">{pml.mempawahTarget}</td>
                      <td className="p-2.5 text-center font-bold text-rose-500">{pml.open}</td>
                      <td className="p-2.5 text-right pr-6 font-bold text-blue-600">
                        <div className="inline-flex items-center gap-1.5 justify-end w-full">
                          <span className="text-[11px] font-bold text-slate-700">{pml.progress}%</span>
                          <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden hidden sm:block">
                            <div 
                              className="bg-blue-600 h-full rounded-full"
                              style={{ width: `${Math.min(100, pml.progress)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                    <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-sans">
                      Tidak ada data akumulasi petugas untuk filter PML terpilih.
                    </td>
                  </tr>
                )}
                
                {/* Granular Table totals row at bottom */}
                {pmlTableData.length > 0 && (
                  <tr className="bg-blue-50/40 font-bold border-t border-blue-100">
                    <td colSpan={1} className="p-3 pl-4 font-black font-sans uppercase text-slate-700">
                      TOTAL {selectedPml === 'ALL' ? 'TIM GABUNGAN' : `TIM ${selectedPml.toUpperCase()}`}
                    </td>
                    <td className="p-3 text-center font-black text-slate-800">{bottomTableTotals.submit}</td>
                    <td className="p-3 text-center font-black text-slate-400">{bottomTableTotals.draft}</td>
                    <td className="p-3 text-center text-slate-700 font-black">{bottomTableTotals.mempawahTarget}</td>
                    <td className="p-3 text-center text-rose-600 font-black">{bottomTableTotals.open}</td>
                    <td className="p-3 text-right pr-6 font-black text-blue-700 font-sans">
                      <span className="font-extrabold text-blue-700 inline-block px-1.5 py-0.5 rounded bg-blue-100/50">{bottomTableTotals.progress}%</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {pmlTableData.length > 0 && totalPmlTablePages > 1 && (
            <div className="p-3 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500 font-semibold">
              <div>
                Menampilkan <span className="text-slate-800 font-bold">{(pmlTablePage - 1) * 10 + 1}</span> - <span className="text-slate-800 font-bold">{Math.min(pmlTablePage * 10, pmlTableData.length)}</span> dari <span className="text-slate-800 font-bold">{pmlTableData.length}</span> supervisor
              </div>
              <div className="flex gap-1.5">
                <button
                  disabled={pmlTablePage === 1}
                  onClick={() => setPmlTablePage(prev => Math.max(1, prev - 1))}
                  className="px-2.5 py-1 bg-white border border-slate-250 rounded hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-755 font-bold transition-all disabled:cursor-not-allowed cursor-pointer"
                >
                  Sebelumnya
                </button>
                <div className="flex items-center px-1 text-slate-700 font-sans font-bold text-[11px]">
                  Halaman {pmlTablePage} / {totalPmlTablePages}
                </div>
                <button
                  disabled={pmlTablePage === totalPmlTablePages}
                  onClick={() => setPmlTablePage(prev => Math.min(totalPmlTablePages, prev + 1))}
                  className="px-2.5 py-1 bg-white border border-slate-250 rounded hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-755 font-bold transition-all disabled:cursor-not-allowed cursor-pointer"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Table 1: Rekap Progres Petugas Menurut PJ */}
        <div className="col-span-12 bg-white rounded-lg border border-slate-200 flex flex-col shadow-2xs overflow-hidden mt-4">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase flex items-center gap-2">
                  <BadgeCheck size={15} className="text-indigo-600 animate-pulse" />
                  Rekap Progres Petugas Menurut PJ
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">Rekapitulasi target dan progres per petugas yang dikelompokkan berdasarkan Penanggung Jawab (PJ)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200/60">
              {/* PJ name filter */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Filter Nama PJ:</span>
                <select
                  value={selectedPjFilter}
                  onChange={(e) => { setSelectedPjFilter(e.target.value); setPjTablePage(1); }}
                  className="bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/10 outline-hidden transition-all cursor-pointer w-full"
                >
                  <option value="ALL">Semua PJ</option>
                  {uniquePjsList.map(pj => (
                    <option key={pj} value={pj}>{pj}</option>
                  ))}
                </select>
              </div>

              {/* Limit items Filter */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Tampilkan Baris:</span>
                <select
                  value={pjItemsPerPage}
                  onChange={(e) => { setPjItemsPerPage(Number(e.target.value)); setPjTablePage(1); }}
                  className="bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/10 outline-hidden transition-all cursor-pointer w-full"
                >
                  <option value={10}>10 Baris</option>
                  <option value={25}>25 Baris</option>
                  <option value={50}>50 Baris</option>
                  <option value={999999}>Semua Baris</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[11px] text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-150">
                <tr className="text-slate-500 uppercase tracking-wider font-extrabold text-[10px]">
                  <th className="p-3 pl-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handlePjTableSort('pj')}>
                    Penanggung Jawab (PJ) {renderPjSortIcon('pj')}
                  </th>
                  <th className="p-3 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handlePjTableSort('submit')}>
                    Jumlah Submit {renderPjSortIcon('submit')}
                  </th>
                  <th className="p-3 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handlePjTableSort('draft')}>
                    Jumlah Draf {renderPjSortIcon('draft')}
                  </th>
                  <th className="p-3 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handlePjTableSort('total')}>
                    Submit + Draf {renderPjSortIcon('total')}
                  </th>
                  <th className="p-3 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handlePjTableSort('target')}>
                    Jumlah Target {renderPjSortIcon('target')}
                  </th>
                  <th className="p-3 pr-4 cursor-pointer hover:bg-slate-100 transition-colors text-right" onClick={() => handlePjTableSort('progress')}>
                    Persentase Progres {renderPjSortIcon('progress')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPjRecords.length > 0 ? (
                  filteredPjRecords.slice((pjTablePage - 1) * pjItemsPerPage, pjTablePage * pjItemsPerPage).map((rec, idx) => {
                    const pct = rec.target > 0 ? parseFloat(((rec.submit / rec.target) * 100).toFixed(1)) : 0;
                    
                    return (
                      <tr key={`${rec.pj}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 pl-4 font-semibold text-slate-700">{rec.pj}</td>
                        <td className="p-3 text-center font-mono font-bold text-green-600 bg-green-50/20">{rec.submit}</td>
                        <td className="p-3 text-center font-mono font-bold text-amber-500 bg-amber-50/20">{rec.draft}</td>
                        <td className="p-3 text-center font-mono font-bold text-indigo-600 bg-indigo-50/20">{rec.total}</td>
                        <td className="p-3 text-center font-mono font-bold text-slate-500">{rec.target}</td>
                        <td className="p-3 pr-4">
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-indigo-600' : pct >= 50 ? 'bg-emerald-500' : 'bg-orange-500'}`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="font-mono font-bold text-slate-700 shrink-0 text-right w-12">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                      Tidak ada data PJ.
                    </td>
                  </tr>
                )}
                
                {filteredPjRecords.length > 0 && (
                  <tr className="bg-indigo-50/40 font-bold border-t border-indigo-100">
                    <td className="p-3 pl-4 font-black font-sans uppercase text-slate-700">
                      TOTAL GABUNGAN
                    </td>
                    <td className="p-3 text-center font-black text-green-700 font-mono">{pjTableTotals.submit}</td>
                    <td className="p-3 text-center font-black text-amber-600 font-mono">{pjTableTotals.draft}</td>
                    <td className="p-3 text-center font-black text-indigo-700 font-mono">{pjTableTotals.total}</td>
                    <td className="p-3 text-center font-black text-slate-700 font-mono">{pjTableTotals.target}</td>
                    <td className="p-3 pr-4 font-black text-indigo-700 font-sans">
                      <span className="font-extrabold text-indigo-700 inline-block px-1.5 py-0.5 rounded bg-indigo-100/50 font-mono">{pjTableTotals.progress}%</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PJ Table Pagination Footer */}
          {filteredPjRecords.length > 0 && (
            <div className="p-3 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500 font-semibold">
              <div>
                Menampilkan <span className="text-slate-800 font-bold">{(pjTablePage - 1) * pjItemsPerPage + 1}</span> - <span className="text-slate-800 font-bold">{Math.min(pjTablePage * pjItemsPerPage, filteredPjRecords.length)}</span> dari <span className="text-slate-800 font-bold">{filteredPjRecords.length}</span> PJ
              </div>
              <div className="flex gap-1.5">
                <button
                  disabled={pjTablePage === 1}
                  onClick={() => setPjTablePage(prev => Math.max(1, prev - 1))}
                  className="px-2.5 py-1 bg-white border border-slate-250 rounded hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-755 font-bold transition-all disabled:cursor-not-allowed cursor-pointer"
                >
                  Sebelumnya
                </button>
                <div className="flex items-center px-1 text-slate-700 font-sans font-bold text-[11px]">
                  Halaman {pjTablePage} / {Math.ceil(filteredPjRecords.length / pjItemsPerPage) || 1}
                </div>
                <button
                  disabled={pjTablePage === (Math.ceil(filteredPjRecords.length / pjItemsPerPage) || 1)}
                  onClick={() => setPjTablePage(prev => Math.min((Math.ceil(filteredPjRecords.length / pjItemsPerPage) || 1), prev + 1))}
                  className="px-2.5 py-1 bg-white border border-slate-250 rounded hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-755 font-bold transition-all disabled:cursor-not-allowed cursor-pointer"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Table 2: Rekap Progres Geografis */}
        <div className="col-span-12 bg-white rounded-lg border border-slate-200 flex flex-col shadow-2xs overflow-hidden mt-4">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase flex items-center gap-2">
                <MapPin size={15} className="text-emerald-600" />
                Rekap Progres Geografis
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">Detail status progres berdasarkan lokasi geografis, dari tingkat Kecamatan, Desa, hingga tingkat Satuan Lingkungan Setempat (SLS)</p>
            </div>
            
            {/* Multiple Filters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-200/60">
              {/* PJ filter */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Filter PJ:</span>
                <SearchableSelect
                  value={selectedMempawahPjFilter}
                  onChange={(val) => { setSelectedMempawahPjFilter(val); setMempawahTablePage(1); }}
                  placeholder="Pilih PJ..."
                  options={[
                    { label: "Semua PJ", value: "ALL" },
                    ...mempawahFilters.pjs.map(pj => ({ label: pj, value: pj }))
                  ]}
                />
              </div>

              {/* Kecamatan filter */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Filter Kecamatan:</span>
                <SearchableSelect
                  value={selectedMempawahKecFilter}
                  onChange={(val) => {
                    setSelectedMempawahKecFilter(val);
                    setSelectedMempawahDesaFilter('ALL');
                    setSelectedMempawahSlsFilter('ALL');
                    setMempawahTablePage(1);
                  }}
                  placeholder="Pilih Kecamatan..."
                  options={[
                    { label: "Semua Kecamatan", value: "ALL" },
                    ...mempawahFilters.kecamatans.map(kec => ({ label: kec, value: kec }))
                  ]}
                />
              </div>

              {/* Desa filter */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Filter Desa:</span>
                <SearchableSelect
                  value={selectedMempawahDesaFilter}
                  onChange={(val) => {
                    setSelectedMempawahDesaFilter(val);
                    setSelectedMempawahSlsFilter('ALL');
                    setMempawahTablePage(1);
                  }}
                  placeholder="Pilih Desa..."
                  options={[
                    { label: "Semua Desa", value: "ALL" },
                    ...mempawahFilters.desas.map(desa => ({ label: desa, value: desa }))
                  ]}
                />
              </div>

              {/* SLS filter */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Filter SLS:</span>
                <SearchableSelect
                  value={selectedMempawahSlsFilter}
                  onChange={(val) => { setSelectedMempawahSlsFilter(val); setMempawahTablePage(1); }}
                  placeholder="Pilih SLS..."
                  options={[
                    { label: "Semua SLS", value: "ALL" },
                    ...mempawahFilters.slss.map(sls => ({ label: sls, value: sls }))
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Quick Metrics Header */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 p-3 bg-emerald-50/40 border-b border-slate-100">
            <div className="p-2 bg-white border border-emerald-100 rounded-md shadow-3xs">
              <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Total Submit</span>
              <span className="text-sm font-black text-slate-800 font-mono">{mempawahTotals.submit.toLocaleString('id-ID')}</span>
            </div>
            <div className="p-2 bg-white border border-emerald-100 rounded-md shadow-3xs">
              <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Total Draf</span>
              <span className="text-sm font-black text-slate-800 font-mono">{mempawahTotals.draft.toLocaleString('id-ID')}</span>
            </div>
            <div className="p-2 bg-white border border-emerald-100 rounded-md shadow-3xs">
              <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Total Submit+Draf</span>
              <span className="text-sm font-black text-slate-800 font-mono">{mempawahTotals.total.toLocaleString('id-ID')}</span>
            </div>
            <div className="p-2 bg-white border border-emerald-100 rounded-md shadow-3xs">
              <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Total Target</span>
              <span className="text-sm font-black text-slate-800 font-mono">{mempawahTotals.target.toLocaleString('id-ID')}</span>
            </div>
            <div className="p-2 bg-white border border-emerald-100 rounded-md shadow-3xs">
              <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Total Open</span>
              <span className="text-sm font-black text-rose-600 font-mono">{mempawahTotals.open.toLocaleString('id-ID')}</span>
            </div>
            <div className="p-2 bg-white border border-emerald-100 rounded-md shadow-3xs col-span-2 sm:col-span-1">
              <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Rata Progres</span>
              <span className="text-sm font-black text-emerald-600 font-mono">{mempawahTotals.progress}%</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[11px] text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-150">
                <tr className="text-slate-500 uppercase tracking-wider font-extrabold text-[10px]">
                  <th className="p-3 pl-4 text-center w-12">No</th>
                  <th className="p-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleMempawahTableSort('kecamatan')}>
                    Kecamatan {renderMempawahSortIcon('kecamatan')}
                  </th>
                  <th className="p-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleMempawahTableSort('desa')}>
                    Desa {renderMempawahSortIcon('desa')}
                  </th>
                  <th className="p-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleMempawahTableSort('sls')}>
                    SLS {renderMempawahSortIcon('sls')}
                  </th>
                  <th className="p-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleMempawahTableSort('pj')}>
                    PJ {renderMempawahSortIcon('pj')}
                  </th>
                  <th className="p-3">Petugas (PPL)</th>
                  <th className="p-3">Pengawas (PML)</th>
                  <th className="p-3 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleMempawahTableSort('submit')}>
                    Submit {renderMempawahSortIcon('submit')}
                  </th>
                  <th className="p-3 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleMempawahTableSort('draft')}>
                    Draf {renderMempawahSortIcon('draft')}
                  </th>
                  <th className="p-3 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleMempawahTableSort('total')}>
                    Submit+Draf {renderMempawahSortIcon('total')}
                  </th>
                  <th className="p-3 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleMempawahTableSort('target')}>
                    Target {renderMempawahSortIcon('target')}
                  </th>
                  <th className="p-3 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleMempawahTableSort('open')}>
                    Open {renderMempawahSortIcon('open')}
                  </th>
                  <th className="p-3 pr-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleMempawahTableSort('progress')}>
                    Progres {renderMempawahSortIcon('progress')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedMempawahRecords.length > 0 ? (
                  paginatedMempawahRecords.map((rec, idx) => {
                    const rowNo = (mempawahTablePage - 1) * MEMPAWAH_ITEMS_PER_PAGE + idx + 1;
                    const pct = rec.target > 0 ? parseFloat(((rec.submit / rec.target) * 100).toFixed(1)) : 0;
                    
                    return (
                      <tr key={`${rec.sls}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 text-center text-slate-400 font-mono">{rowNo}</td>
                        <td className="p-3 font-semibold text-slate-700 truncate max-w-[120px]">{rec.kecamatan}</td>
                        <td className="p-3 font-semibold text-slate-700 truncate max-w-[120px]">{rec.desa}</td>
                        <td className="p-3 font-bold text-indigo-700">{rec.sls}</td>
                        <td className="p-3 font-medium text-slate-600">{rec.pj}</td>
                        <td className="p-3 font-extrabold text-slate-900">{rec.pplName}</td>
                        <td className="p-3 font-medium text-slate-600">{rec.pmlName}</td>
                        <td className="p-3 text-center font-mono font-bold text-green-600 bg-green-50/15">{rec.submit}</td>
                        <td className="p-3 text-center font-mono font-bold text-amber-500 bg-amber-50/15">{rec.draft}</td>
                        <td className="p-3 text-center font-mono font-bold text-indigo-600 bg-indigo-50/15">{rec.total}</td>
                        <td className="p-3 text-center font-mono font-bold text-slate-500">{rec.target}</td>
                        <td className="p-3 text-center font-mono font-bold text-rose-500">{rec.open}</td>
                        <td className="p-3 pr-4">
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-600' : pct >= 50 ? 'bg-teal-500' : 'bg-orange-500'}`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="font-mono font-bold text-slate-700 shrink-0 text-right w-12">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={12} className="p-8 text-center text-slate-400 font-medium">
                      Tidak ada data untuk filter wilayah yang aktif.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          <div className="p-3 bg-slate-50 border-t border-slate-150 flex justify-between items-center">
            <span className="text-[10px] text-slate-500 font-bold">
              Menampilkan {Math.min(filteredMempawahRecords.length, (mempawahTablePage - 1) * MEMPAWAH_ITEMS_PER_PAGE + 1)}-{Math.min(filteredMempawahRecords.length, mempawahTablePage * MEMPAWAH_ITEMS_PER_PAGE)} dari {filteredMempawahRecords.length} records SLS
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={mempawahTablePage === 1}
                onClick={() => setMempawahTablePage(p => Math.max(p - 1, 1))}
                className="px-3 py-1 rounded text-[10px] font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                disabled={mempawahTablePage === totalMempawahPages}
                onClick={() => setMempawahTablePage(p => Math.min(p + 1, totalMempawahPages))}
                className="px-3 py-1 rounded text-[10px] font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                Berikutnya
              </button>
            </div>
          </div>
        </div>

        {/* Global interactive delta or cumulative table log summary */}
        <div className="col-span-12 bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs mt-4">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Sheet size={13} className="text-blue-600" />
                Catatan Harian Kontribusi Lapangan Petugas
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">Log aktivitas komparatif per tanggal pengumpulan data</p>
            </div>
            
            {/* View Table Tab switcher */}
            <div className="flex bg-slate-200/60 p-0.5 rounded-lg text-xs self-start sm:self-auto shrink-0">
              <button
                onClick={() => setTableTab('daily')}
                className={`px-3 py-1 rounded font-bold transition-all cursor-pointer ${tableTab === 'daily' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Harian (Pasif Delta)
              </button>
              <button
                onClick={() => setTableTab('cumulative')}
                className={`px-3 py-1 rounded font-bold transition-all cursor-pointer ${tableTab === 'cumulative' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Kumulatif (Akumulasi)
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/55 border-b border-slate-200 text-slate-500 uppercase font-extrabold text-[10px]">
                  <th className="p-3 pl-4">Tanggal Update</th>
                  <th className="p-3">Supervisor (PML)</th>
                  <th className="p-3">Petugas (PPL)</th>
                  <th className="p-3 text-center">SUBMIT</th>
                  <th className="p-3 text-center">DRAFT</th>
                  <th className="p-3 text-center">TOTAL</th>
                  <th className="p-3 text-center pr-4">Status Siklus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                {paginatedProcessedRecords.length > 0 ? (
                  paginatedProcessedRecords.map((item, index) => {
                    const isSubmitPositive = tableTab === 'daily' ? item.dailySubmit > 0 : item.submit > 0;
                    return (
                      <tr key={`${item.pplName}-${item.dateStr}-${index}`} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 pl-4 whitespace-nowrap font-sans font-medium text-slate-600">{item.dateStr}</td>
                        <td className="p-3 whitespace-nowrap font-sans font-semibold text-slate-850">{item.pmlName}</td>
                        <td className="p-3 whitespace-nowrap font-sans font-bold text-slate-800">{item.pplName}</td>
                        
                        {/* Values toggle dynamically */}
                        {tableTab === 'daily' ? (
                          <>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <span className="font-extrabold text-green-600 font-mono">
                                  {item.dailySubmit > 0 ? `+${item.dailySubmit}` : item.dailySubmit}
                                </span>
                                {item.dailySubmit >= 10 ? (
                                  <span className="text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded font-sans font-bold whitespace-nowrap shadow-3xs">
                                    Submit Tinggi (≥10)
                                  </span>
                                ) : (
                                  <span className="text-[9px] bg-rose-100 text-rose-800 border border-rose-300 px-1.5 py-0.5 rounded font-sans font-bold whitespace-nowrap shadow-3xs">
                                    {"Submit Rendah (<10)"}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <span className={`font-extrabold font-mono ${item.dailyDraft > 0 ? 'text-amber-500' : item.dailyDraft < 0 ? 'text-slate-400' : 'text-slate-500'}`}>
                                  {item.dailyDraft > 0 ? `+${item.dailyDraft}` : item.dailyDraft}
                                </span>
                                {item.dailyDraft >= 10 ? (
                                  <span className="text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded font-sans font-bold whitespace-nowrap shadow-3xs">
                                    Draf Tinggi (≥10)
                                  </span>
                                ) : (
                                  <span className="text-[9px] bg-rose-100 text-rose-800 border border-rose-300 px-1.5 py-0.5 rounded font-sans font-bold whitespace-nowrap shadow-3xs">
                                    {"Draf Rendah (<10)"}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-center font-black text-blue-600 font-mono">
                              {item.dailyTotal > 0 ? `+${item.dailyTotal}` : item.dailyTotal}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-3 text-center font-black text-slate-700">{item.submit}</td>
                            <td className="p-3 text-center text-slate-500">{item.draft}</td>
                            <td className="p-3 text-center font-black text-slate-700">{item.total}</td>
                          </>
                        )}

                        <td className="p-3 text-center pr-4 whitespace-nowrap font-sans">
                          {item.isFirstDay ? (
                            <span className="bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded text-[9px] uppercase">Awal Siklus</span>
                          ) : (
                            <span className="bg-green-50 text-green-700 font-extrabold px-2 py-0.5 rounded text-[9px] uppercase">Unggah Aktif</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center p-8 text-slate-400 font-sans">
                      Tidak ada catatan log progres yang cocok dengan filter penelusuran.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {processedRecords.length > 0 && (
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500 font-semibold">
              <div className="text-slate-500">
                Menampilkan <span className="text-slate-800 font-bold">{(dailyLogPage - 1) * 10 + 1}</span> - <span className="text-slate-800 font-bold">{Math.min(dailyLogPage * 10, processedRecords.length)}</span> dari <span className="text-slate-800 font-bold">{processedRecords.length}</span> log aktivitas
              </div>
              <div className="flex gap-1.5 shrink-0 animate-fade-in">
                <button
                  disabled={dailyLogPage === 1}
                  onClick={() => setDailyLogPage(prev => Math.max(1, prev - 1))}
                  className="px-2.5 py-1 bg-white border border-slate-250 rounded hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-755 font-bold transition-all disabled:cursor-not-allowed cursor-pointer"
                >
                  Sebelumnya
                </button>
                <div className="flex items-center px-1 text-slate-700 font-sans font-bold text-[11px]">
                  Halaman {dailyLogPage} / {totalDailyLogPages}
                </div>
                <button
                  disabled={dailyLogPage === totalDailyLogPages}
                  onClick={() => setDailyLogPage(prev => Math.min(totalDailyLogPages, prev + 1))}
                  className="px-2.5 py-1 bg-white border border-slate-250 rounded hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-755 font-bold transition-all disabled:cursor-not-allowed cursor-pointer"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sourced directly from 'rekap harian' Google Sheet instead of Firebase. */}

      </main>

      {/* Footer Bar consistent with the design specification */}
      <footer className="bg-[#F58220] text-white px-4 py-3 flex flex-col sm:flex-row justify-between items-center text-xs shrink-0 gap-3 mt-8">
        <div className="flex flex-wrap gap-4 justify-center sm:justify-start items-center">
          <a 
            href="https://github.com/ahmadrahman79/Prasasti-SE2026"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-slate-800 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-slate-900 transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Github size={14} />
            <span>GitHub Repository</span>
          </a>
          <span className="hidden sm:inline text-white/50">•</span>
          <span className="flex items-center gap-1.5 text-white/90">
            <Clock size={12} className="text-white shrink-0" />
            <span>Alokasi Tanggal: <b className="font-bold text-white">{getWIBTargetDateStr()}</b> ({currentWIBTime.toLocaleTimeString('id-ID', { hour12: false })} WIB)</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/90">Update: <b className="font-mono text-white">{lastUpdate}</b></span>
          <div className="flex items-center gap-1.5 bg-black/10 px-2 py-1 rounded">
            <span className="w-2.5 h-2.5 bg-[#00E5FF] rounded-full animate-pulse"></span>
            <span>Otomasi Sync: <b className="text-[#00E5FF] font-bold text-[10px] uppercase tracking-wider">AKTIF (30m)</b></span>
          </div>
        </div>
      </footer>

    </div>
  );
}
