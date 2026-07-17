import { PPLSummary, Table3Record, PPLDailyProgress } from './types';

export interface UsahaTidakDitemukanRecord {
  kecamatan: string;
  desa: string;
  sls: string;
  ppl: string;
  pml: string;
  pj: string;
  namaUsaha: string;
  source: string;
}

export function parseUsahaTidakDitemukanCSV(csv: string): UsahaTidakDitemukanRecord[] {
  if (!csv) return [];
  const lines = csv.split('\n').filter(l => l.trim() !== '');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
  
  const colIdx = {
    kecamatan: headers.findIndex(h => h.includes('kecamatan')),
    desa: headers.findIndex(h => h.includes('desa')),
    sls: headers.findIndex(h => h.includes('sls') || h.includes('nama sls')),
    ppl: headers.findIndex(h => h.includes('ppl')),
    pml: headers.findIndex(h => h.includes('pml')),
    pj: headers.findIndex(h => h.includes('pj')),
    namaUsaha: headers.findIndex(h => h.includes('nama_usaha') || h.includes('nama usaha')),
    source: headers.findIndex(h => h.includes('source')),
  };

  const records: UsahaTidakDitemukanRecord[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length < 2) continue;

    records.push({
      kecamatan: colIdx.kecamatan !== -1 ? row[colIdx.kecamatan] || '-' : '-',
      desa: colIdx.desa !== -1 ? row[colIdx.desa] || '-' : '-',
      sls: colIdx.sls !== -1 ? row[colIdx.sls] || '-' : '-',
      ppl: colIdx.ppl !== -1 ? row[colIdx.ppl] || '-' : '-',
      pml: colIdx.pml !== -1 ? row[colIdx.pml] || '-' : '-',
      pj: colIdx.pj !== -1 ? row[colIdx.pj] || '-' : '-',
      namaUsaha: colIdx.namaUsaha !== -1 ? row[colIdx.namaUsaha] || '-' : '-',
      source: colIdx.source !== -1 ? row[colIdx.source] || '-' : '-'
    });
  }
  return records;
}
// Simple but robust CSV line parser that respects double quotes
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Parses an Indonesian date string (e.g., "19 Juni 2026") into a JS Date object
export function parseIndonesianDate(dateStr: string): Date {
  const cleanStr = dateStr.trim();
  const parts = cleanStr.split(/\s+/);
  if (parts.length < 3) return new Date();
  
  const day = parseInt(parts[0], 10) || 1;
  const monthName = parts[1].toLowerCase();
  const year = parseInt(parts[2], 10) || 2026;
  
  const months: Record<string, number> = {
    januari: 0, jan: 0,
    februari: 1, feb: 1,
    maret: 2, mar: 2,
    april: 3, apr: 3,
    mei: 4,
    juni: 5, jun: 5,
    juli: 6, jul: 6,
    agustus: 7, agt: 7, ags: 7,
    september: 8, sep: 8,
    oktober: 9, okt: 9,
    november: 10, nov: 10,
    desember: 11, des: 11
  };
  
  const month = months[monthName] !== undefined ? months[monthName] : 5; // default to June (Juni)
  return new Date(year, month, day);
}

// Formats a JS Date object into an Indonesian date string (e.g., "19 Juni 2026")
export function formatIndonesianDate(date: Date): string {
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

export interface ParsedModel {
  table1: PPLSummary[];
  table2: PPLSummary[];
  table3: Table3Record[];
  table3Calculated: PPLDailyProgress[];
  pmlList: string[];
  pplList: { name: string; pml: string }[];
  dateList: string[]; // sorted Indonesian date strings
  duplicatePpls: Set<string>;
}

// Helper to convert double list representation from Google Sheets API to standard CSV string
export function convertValuesToCSV(values: any[][]): string {
  if (!values || values.length === 0) return '';
  return values.map(row => {
    return row.map(val => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',');
  }).join('\n');
}

// Parse combined Sheets data (rekap + data lama) with target WIB date for active rekap status
export function parseNewSheetsData(
  rekapCSV: string,
  dataLamaCSV: string,
  activeWIBDateStr: string
): ParsedModel {
  const table1: PPLSummary[] = [];
  const table3: Table3Record[] = [];
  
  // --- First pass: Detect duplicate PPL names across different PMLs ---
  const pplNameToPmls = new Map<string, Set<string>>();
  
  const registerPplPml = (ppl: string, pml: string) => {
    if (!ppl || !pml) return;
    if (!pplNameToPmls.has(ppl)) {
      pplNameToPmls.set(ppl, new Set());
    }
    pplNameToPmls.get(ppl)!.add(pml);
  };

  // Find occurrences in rekap
  const rekapLinesForScan = rekapCSV.split(/\r?\n/);
  for (let i = 1; i < rekapLinesForScan.length; i++) {
    const line = rekapLinesForScan[i].trim();
    if (!line) continue;
    const rawCols = parseCSVLine(line);
    const cols = rawCols.map(c => c.replace(/^"|"$/g, '').trim());
    if (cols.length >= 2 && cols[0] && cols[0] !== 'Nama PML' && cols[1]) {
      let pmlName = cols[0] === '#N/A' ? 'Belum Terpetakan' : cols[0];
      let pplName = cols[1] === '#N/A' ? 'Belum Terpetakan' : cols[1];
      registerPplPml(pplName, pmlName);
    }
  }

  // Find occurrences in data lama
  const dataLamaLinesForScan = dataLamaCSV.split(/\r?\n/);
  for (let i = 1; i < dataLamaLinesForScan.length; i++) {
    const line = dataLamaLinesForScan[i].trim();
    if (!line) continue;
    const rawCols = parseCSVLine(line);
    const cols = rawCols.map(c => c.replace(/^"|"$/g, '').trim());
    if (cols.length >= 2 && cols[0] && cols[0] !== 'Nama PML' && cols[1]) {
      let pmlName = cols[0] === '#N/A' ? 'Belum Terpetakan' : cols[0];
      let pplName = cols[1] === '#N/A' ? 'Belum Terpetakan' : cols[1];
      registerPplPml(pplName, pmlName);
    }
  }

  // Determine duplicate names
  const duplicatePpls = new Set<string>();
  pplNameToPmls.forEach((pmls, ppl) => {
    if (pmls.size > 1) {
      duplicatePpls.add(ppl);
    }
  });

  // Disambiguation helper
  const getDisambiguatedPplName = (ppl: string, pml: string): string => {
    if (duplicatePpls.has(ppl)) {
      return `${ppl} (${pml})`;
    }
    return ppl;
  };

  // 2. Parse rekap (holds active day's entries)
  const rekapLines = rekapCSV.split(/\r?\n/);
    // Ensure matching column indices:
    // Kolom A (index 0): Nama PML
    // Kolom B (index 1): Nama PPL
    // Kolom C (index 2): Submit
    // Kolom D (index 3): Draf
    // Kolom E (index 4): Total
    // Kolom F (index 5): Target
    
  const rekapHeaders = parseCSVLine(rekapLines[0] || '').map(c => c.replace(/^"|"$/g, '').trim().toLowerCase());
  const idxApprovedPml = rekapHeaders.findIndex(h => h.includes('approv'));
  const idxRejectedPml = rekapHeaders.findIndex(h => h.includes('reject'));

  for (let i = 1; i < rekapLines.length; i++) {
    const line = rekapLines[i].trim();
    if (!line) continue;
    
    const rawCols = parseCSVLine(line);
    const cols = rawCols.map(c => c.replace(/^"|"$/g, '').trim());

    if (cols.length >= 5 && cols[0] && cols[0] !== 'Nama PML' && cols[1]) {
      let pmlName = cols[0]; // Kolom A
      let pplName = cols[1]; // Kolom B
      if (pmlName === '#N/A') pmlName = 'Belum Terpetakan';
      if (pplName === '#N/A') pplName = 'Belum Terpetakan';
      
      const submit = parseInt(cols[2], 10) || 0; // Kolom C
      const draft = parseInt(cols[3], 10) || 0;  // Kolom D
      const total = parseInt(cols[4], 10) || 0;  // Kolom E
      const mempawahTargetValue = cols[5] ? (parseInt(cols[5], 10) || 0) : 0; // Kolom F
      const mempawahTarget = mempawahTargetValue > 0 ? mempawahTargetValue : total;
      
      const approvedPml = idxApprovedPml !== -1 && cols[idxApprovedPml] ? (parseInt(cols[idxApprovedPml], 10) || 0) : 0;
      const rejectedPml = idxRejectedPml !== -1 && cols[idxRejectedPml] ? (parseInt(cols[idxRejectedPml], 10) || 0) : 0;
      
      const disambiguatedName = getDisambiguatedPplName(pplName, pmlName);
      
      table1.push({ pmlName, pplName: disambiguatedName, submit, draft, total, mempawahTarget, approvedPml, rejectedPml });
      
      // Add active dynamic snapshot to chronological log
      table3.push({
        pmlName,
        pplName: disambiguatedName,
        submit,
        draft,
        total,
        mempawahTarget,
        approvedPml,
        rejectedPml,
        dateStr: activeWIBDateStr,
        date: parseIndonesianDate(activeWIBDateStr)
      });
    }
  }
  
  // Create a map of PPL -> mempawahTarget from rekap for historical lookup
  const pplTargetMap = new Map<string, number>();
  table1.forEach(item => {
    pplTargetMap.set(item.pplName, item.mempawahTarget || item.total);
  });
  
  // 3. Parse data lama (history archive data logs)
  const dataLamaLines = dataLamaCSV.split(/\r?\n/);
  const dataLamaHeaders = parseCSVLine(dataLamaLines[0] || '').map(c => c.replace(/^"|"$/g, '').trim().toLowerCase());
  const idxApprovLama = dataLamaHeaders.findIndex(h => h.includes('approv'));
  const idxRejectLama = dataLamaHeaders.findIndex(h => h.includes('reject'));

  for (let i = 1; i < dataLamaLines.length; i++) {
    const line = dataLamaLines[i].trim();
    if (!line) continue;
    
    const rawCols = parseCSVLine(line);
    const cols = rawCols.map(c => c.replace(/^"|"$/g, '').trim());
    
    if (cols.length >= 6 && cols[0] && cols[0] !== 'Nama PML' && cols[1] && cols[5]) {
      let pmlName = cols[0];
      let pplName = cols[1];
      if (pmlName === '#N/A') pmlName = 'Belum Terpetakan';
      if (pplName === '#N/A') pplName = 'Belum Terpetakan';
      
      const submit = parseInt(cols[2], 10) || 0;
      const draft = parseInt(cols[3], 10) || 0;
      const total = parseInt(cols[4], 10) || 0;
      const dateStr = cols[5];
      const approvedPml = idxApprovLama !== -1 && cols[idxApprovLama] ? (parseInt(cols[idxApprovLama], 10) || 0) : 0;
      const rejectedPml = idxRejectLama !== -1 && cols[idxRejectLama] ? (parseInt(cols[idxRejectLama], 10) || 0) : 0;
      
      const disambiguatedName = getDisambiguatedPplName(pplName, pmlName);
      
      // De-duplicate: If rekap is already assigned to this dateStr (e.g. today has already been pushed to data lama),
      // let the active "rekap" row take precedence and don't duplicate.
      const isDuplicate = table3.some(item => item.pplName === disambiguatedName && item.dateStr === dateStr);
      if (!isDuplicate) {
        const mempawahTarget = pplTargetMap.get(disambiguatedName) || total;
        table3.push({
          pmlName,
          pplName: disambiguatedName,
          submit,
          draft,
          total,
          mempawahTarget,
          approvedPml,
          rejectedPml,
          dateStr,
          date: parseIndonesianDate(dateStr)
        });
      }
    }
  }
  
  // Calculate daily non-accumulated delta progress for all chronological snapshots grouped by PPL
  const pplRecords: Record<string, Table3Record[]> = {};
  for (const rec of table3) {
    if (!pplRecords[rec.pplName]) {
      pplRecords[rec.pplName] = [];
    }
    pplRecords[rec.pplName].push(rec);
  }
  
  const table3Calculated: PPLDailyProgress[] = [];
  
  // Find minimum and maximum dates in the dataset
  let minTime = Number.MAX_SAFE_INTEGER;
  let maxTime = 0;
  for (const rec of table3) {
    if (rec.date.getTime() < minTime) {
      minTime = rec.date.getTime();
    }
    if (rec.date.getTime() > maxTime) {
      maxTime = rec.date.getTime();
    }
  }
  
  // Create an array of continuous date strings starting from minTime
  const allDatesList: { date: Date, dateStr: string }[] = [];
  let currTime = minTime;
  while (currTime <= maxTime) {
    const d = new Date(currTime);
    allDatesList.push({
      date: d,
      dateStr: formatIndonesianDate(d)
    });
    currTime += 24 * 60 * 60 * 1000;
  }
  
  for (const pplName in pplRecords) {
    const records = pplRecords[pplName];
    // Sort chronological progress
    records.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    let lastCumulativeRecord: Table3Record | null = null;
    let prevDailyCumulative: { submit: number, draft: number, total: number } = { submit: 0, draft: 0, total: 0 };
    
    for (let i = 0; i < allDatesList.length; i++) {
      const targetDateObj = allDatesList[i];
      const targetTime = targetDateObj.date.getTime();
      
      // Find the latest record that is ON or BEFORE the targetDate
      let currentCumulativeRecord = lastCumulativeRecord;
      for (const rec of records) {
        if (rec.date.getTime() <= targetTime) {
          currentCumulativeRecord = rec;
        } else {
          break; // Since it's sorted, we can stop
        }
      }
      
      let submit = 0, draft = 0, total = 0, mempawahTarget = 0, pmlName = "", approvedPml = 0, rejectedPml = 0;
      if (currentCumulativeRecord) {
        submit = currentCumulativeRecord.submit;
        draft = currentCumulativeRecord.draft;
        total = currentCumulativeRecord.total;
        mempawahTarget = currentCumulativeRecord.mempawahTarget || 0;
        pmlName = currentCumulativeRecord.pmlName;
        approvedPml = currentCumulativeRecord.approvedPml || 0;
        rejectedPml = currentCumulativeRecord.rejectedPml || 0;
      } else if (records.length > 0) {
        // If we haven't reached the first record yet, use the first record's static data but 0 progress
        mempawahTarget = records[0].mempawahTarget || 0;
        pmlName = records[0].pmlName;
      }
      
      let dailySubmit = 0;
      let dailyDraft = 0;
      let dailyTotal = 0;
      let dailyApprovedPml = 0;
      let dailyRejectedPml = 0;
      let isFirstDay = false;
      
      if (i === 0) {
        // For the very first historical date, we just take the raw value
        dailySubmit = submit;
        dailyDraft = draft;
        dailyTotal = total;
        dailyApprovedPml = approvedPml;
        dailyRejectedPml = rejectedPml;
        isFirstDay = true;
      } else {
        // For subsequent days, subtract the previous day's cumulative progress
        dailySubmit = Math.max(0, submit - prevDailyCumulative.submit);
        dailyDraft = Math.max(0, draft - prevDailyCumulative.draft);
        dailyTotal = Math.max(0, total - prevDailyCumulative.total);
        dailyApprovedPml = Math.max(0, approvedPml - (prevDailyCumulative.approvedPml || 0));
        dailyRejectedPml = Math.max(0, rejectedPml - (prevDailyCumulative.rejectedPml || 0));
        isFirstDay = false;
      }
      
      if (pmlName) {
        table3Calculated.push({
          pplName,
          pmlName,
          mempawahTarget,
          dateStr: targetDateObj.dateStr,
          date: targetDateObj.date,
          submit,
          draft,
          total,
          approvedPml,
          rejectedPml,
          dailySubmit,
          dailyDraft,
          dailyTotal,
          dailyApprovedPml,
          dailyRejectedPml,
          isFirstDay
        });
      }
      
      // Update for the next iteration
      prevDailyCumulative = { submit, draft, total, approvedPml, rejectedPml } as any;
      lastCumulativeRecord = currentCumulativeRecord;
    }
  }
  
  // Create unique sets and lists
  const pmlsSet = new Set<string>();
  const pplsMap = new Map<string, string>(); // PPL - PML mapping
  const datesSet = new Set<string>();
  const datesParsedMap = new Map<string, Date>();
  
  table3Calculated.forEach(rec => {
    pmlsSet.add(rec.pmlName);
    pplsMap.set(rec.pplName, rec.pmlName);
    datesSet.add(rec.dateStr);
    datesParsedMap.set(rec.dateStr, rec.date);
  });
  
  const pmlList = Array.from(pmlsSet).sort();
  const pplList = Array.from(pplsMap.entries()).map(([name, pml]) => ({ name, pml })).sort((a, b) => a.name.localeCompare(b.name));
  
  // Sort Indonesian date strings chronologically
  const dateList = Array.from(datesSet).sort((a, b) => {
    const dateA = datesParsedMap.get(a) || new Date(0);
    const dateB = datesParsedMap.get(b) || new Date(0);
    return dateA.getTime() - dateB.getTime();
  });
  return {
    table1,
    table2: [],
    table3,
    table3Calculated,
    pmlList,
    pplList,
    dateList,
    duplicatePpls
  };
}

export function parseSpreadsheetCSV(csvText: string): ParsedModel {
  // Retaining fallback signature, wrapping empty mock or simple parse
  return parseNewSheetsData(csvText, '', '21 Juni 2026');
}

export interface RekapHarianRecord {
  tanggal: string;
  pmlName: string;
  pplName: string;
  submit: number;
  draft: number;
  total: number;
  target: number;
  approvedPml?: number;
  rejectedPml?: number;
}

export function parseAnyDate(dateStr: string): Date {
  const clean = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const [y, m, d] = clean.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return parseIndonesianDate(clean);
}

export function getElapsedDaysFromStart(date: Date): number {
  const startDate = new Date(2026, 5, 15); // 15 Juni 2026
  const utcStart = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const utcDate = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((utcDate - utcStart) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
}

export function parseRekapHarianCSV(csvText: string, globalDuplicatePpls?: Set<string>): PPLDailyProgress[] {
  const lines = csvText.split(/\r?\n/);
  const rawRecords: RekapHarianRecord[] = [];
  const headers = parseCSVLine(lines[0] || '').map(c => c.replace(/^"|"$/g, '').trim().toLowerCase());
  const idxApproved = headers.findIndex(h => h.includes('approv'));
  const idxRejected = headers.findIndex(h => h.includes('reject'));

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const rawCols = parseCSVLine(line);
    const cols = rawCols.map(c => c.replace(/^"|"$/g, '').trim());
    
    // Column indices in 'rekap harian':
    // Index 0: Tanggal (e.g., "2026-06-27")
    // Index 1: Nama PML
    // Index 2: Nama PPL
    // Index 3: Submit
    // Index 4: Draf
    // Index 5: Total
    // Index 6: Target
    // Index 7: Approved PML ?
    // Index 8: Rejected PML ?
    if (cols.length >= 6 && cols[0] && cols[0] !== 'Tanggal' && cols[2]) {
      const tanggal = cols[0];
      let pmlName = cols[1] === '#N/A' ? 'Belum Terpetakan' : cols[1];
      let pplName = cols[2] === '#N/A' ? 'Belum Terpetakan' : cols[2];
      const submit = parseInt(cols[3], 10) || 0;
      const draft = parseInt(cols[4], 10) || 0;
      const total = parseInt(cols[5], 10) || 0;
      const target = parseInt(cols[6], 10) || total;
      const approvedPml = idxApproved !== -1 && cols[idxApproved] ? (parseInt(cols[idxApproved], 10) || 0) : 0;
      const rejectedPml = idxRejected !== -1 && cols[idxRejected] ? (parseInt(cols[idxRejected], 10) || 0) : 0;

      rawRecords.push({ tanggal, pmlName, pplName, submit, draft, total, target, approvedPml, rejectedPml });
    }
  }

  // Determine duplicate names (to match parseNewSheetsData's disambiguation)
  let duplicatePpls = globalDuplicatePpls;
  if (!duplicatePpls) {
    const pplNameToPmls = new Map<string, Set<string>>();
    rawRecords.forEach(r => {
      if (!pplNameToPmls.has(r.pplName)) {
        pplNameToPmls.set(r.pplName, new Set());
      }
      pplNameToPmls.get(r.pplName)!.add(r.pmlName);
    });

    duplicatePpls = new Set<string>();
    pplNameToPmls.forEach((pmls, ppl) => {
      if (pmls.size > 1) {
        duplicatePpls!.add(ppl);
      }
    });
  }

  const getDisambiguatedPplName = (ppl: string, pml: string): string => {
    if (duplicatePpls!.has(ppl)) {
      return `${ppl} (${pml})`;
    }
    return ppl;
  };

  // Group by disambiguated PPL name
  const pplGroups: Record<string, RekapHarianRecord[]> = {};
  rawRecords.forEach(r => {
    const dName = getDisambiguatedPplName(r.pplName, r.pmlName);
    if (!pplGroups[dName]) {
      pplGroups[dName] = [];
    }
    pplGroups[dName].push(r);
  });

  const result: PPLDailyProgress[] = [];

  for (const dName in pplGroups) {
    const group = pplGroups[dName];
    // Sort chronologically
    const sorted = group.map(r => {
      const parsedDate = parseAnyDate(r.tanggal);
      return {
        ...r,
        parsedDate,
        timeValue: parsedDate.getTime(),
        dateStr: formatIndonesianDate(parsedDate)
      };
    }).sort((a, b) => a.timeValue - b.timeValue);

    sorted.forEach((item, index) => {
      let dailySubmit = 0;
      let dailyDraft = 0;
      let dailyTotal = 0;
      let dailyApprovedPml = 0;
      let dailyRejectedPml = 0;
      let isFirstDay = true;

      if (index > 0) {
        const prev = sorted[index - 1];
        dailySubmit = Math.max(0, item.submit - prev.submit);
        dailyDraft = item.draft - prev.draft;
        dailyTotal = Math.max(0, item.total - prev.total);
        dailyApprovedPml = Math.max(0, (item.approvedPml || 0) - (prev.approvedPml || 0));
        dailyRejectedPml = Math.max(0, (item.rejectedPml || 0) - (prev.rejectedPml || 0));
        isFirstDay = false;
      } else {
        // First entry in our record
        const daysElapsed = getElapsedDaysFromStart(item.parsedDate);
        if (daysElapsed <= 1) {
          dailySubmit = item.submit;
          dailyDraft = item.draft;
          dailyTotal = item.total;
          dailyApprovedPml = item.approvedPml || 0;
          dailyRejectedPml = item.rejectedPml || 0;
        } else {
          // Estimate daily additions on the first recorded day to prevent huge artificial cumulative spikes
          dailySubmit = Math.round(item.submit / daysElapsed);
          dailyDraft = Math.round(item.draft / daysElapsed);
          dailyTotal = Math.round(item.total / daysElapsed);
          dailyApprovedPml = Math.round((item.approvedPml || 0) / daysElapsed);
          dailyRejectedPml = Math.round((item.rejectedPml || 0) / daysElapsed);
        }
        isFirstDay = true;
      }

      result.push({
        pplName: dName,
        pmlName: item.pmlName,
        mempawahTarget: item.target,
        dateStr: item.dateStr,
        date: item.parsedDate,
        submit: item.submit,
        draft: item.draft,
        total: item.total,
        approvedPml: item.approvedPml,
        rejectedPml: item.rejectedPml,
        dailySubmit,
        dailyDraft,
        dailyTotal,
        dailyApprovedPml,
        dailyRejectedPml,
        isFirstDay
      });
    });
  }

  return result;
}

export function parseProgresHarianCSV(csvText: string, globalDuplicatePpls: Set<string>): PPLDailyProgress[] {
  const lines = csvText.split(/\r?\n/);
  const rawRecords: RekapHarianRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const rawCols = parseCSVLine(line);
    const cols = rawCols.map(c => c.replace(/^"|"$/g, '').trim());
    
    if (cols.length >= 6 && cols[0] && cols[0] !== 'Tanggal' && cols[2]) {
      const tanggal = cols[0];
      let pmlName = cols[1] === '#N/A' ? 'Belum Terpetakan' : cols[1];
      let pplName = cols[2] === '#N/A' ? 'Belum Terpetakan' : cols[2];
      const submit = parseInt(cols[3], 10) || 0;
      const draft = parseInt(cols[4], 10) || 0;
      const total = parseInt(cols[5], 10) || 0;
      const target = parseInt(cols[6], 10) || total;
      const idxApprov = cols.findIndex((_, idx) => lines[0].split(',')[idx]?.toLowerCase().includes('approv'));
      const idxReject = cols.findIndex((_, idx) => lines[0].split(',')[idx]?.toLowerCase().includes('reject'));
      const approvedPml = idxApprov !== -1 && cols[idxApprov] ? (parseInt(cols[idxApprov], 10) || 0) : 0;
      const rejectedPml = idxReject !== -1 && cols[idxReject] ? (parseInt(cols[idxReject], 10) || 0) : 0;

      rawRecords.push({ tanggal, pmlName, pplName, submit, draft, total, target, approvedPml, rejectedPml });
    }
  }

  const getDisambiguatedPplName = (ppl: string, pml: string): string => {
    if (globalDuplicatePpls && globalDuplicatePpls.has(ppl)) {
      return `${ppl} (${pml})`;
    }
    return ppl;
  };

  const result: PPLDailyProgress[] = [];

  rawRecords.forEach(r => {
    const dName = getDisambiguatedPplName(r.pplName, r.pmlName);
    const parsedDate = parseAnyDate(r.tanggal);
    result.push({
      pplName: dName,
      pmlName: r.pmlName,
      mempawahTarget: r.target,
      dateStr: formatIndonesianDate(parsedDate),
      date: parsedDate,
      submit: 0,
      draft: 0,
      total: 0,
      approvedPml: 0,
      rejectedPml: 0,
      dailySubmit: r.submit,
      dailyDraft: r.draft,
      dailyTotal: r.total,
      dailyApprovedPml: r.approvedPml || 0,
      dailyRejectedPml: r.rejectedPml || 0,
      isFirstDay: false
    });
  });

  return result;
}

export const FALLBACK_REKAP_HARIAN_CSV = `"Tanggal","Nama PML","Nama PPL","Submit","Draf","Total","Target","PJ"
"2026-06-27","Dandy","Rima Melati","62","45","107","455","Yulfi Ramanda"
"2026-06-27","Vika Rizkiani","Nurlan Wahyuni","81","52","133","449","Listio Jati Nandhiko"
"2026-06-27","Syarifah Desti Pratiwi","Risma Shayrani","58","38","96","489","Najia Helmiah"
"2026-06-27","Dandy","Nurmala","118","14","132","796","Yulfi Ramanda"
"2026-06-27","Vika Rizkiani","Guntur Tri Perkasa","83","9","92","476","Listio Jati Nandhiko"`;

export interface RekapMempawahRecord {
  kecamatan: string;
  desa: string;
  sls: string;
  pj: string;
  pplName: string;
  pmlName: string;
  submit: number;
  draft: number;
  total: number;
  target: number;
  targetPbi: number;
  open: number;
  approvedPml?: number;
  rejectedPml?: number;
  statusPercepatan?: string;
}

export const FALLBACK_REKAP_MEMPAWA_CSV = `"Kecamatan","Desa","SLS","PJ","Nama PPL","Nama PML","Submit","Draf","Total","Target"
"MEMPAWAH HILIR","TERAS","SLS 01","Yulfi Ramanda","Rima Melati","Dandy","12","5","17","50"
"MEMPAWAH HILIR","TERAS","SLS 02","Yulfi Ramanda","Rima Melati","Dandy","15","10","25","60"
"ANJONGAN","ANJONGAN MELATI","SLS 01","Listio Jati Nandhiko","Nurlan Wahyuni","Vika Rizkiani","20","8","28","80"
"ANJONGAN","ANJONGAN MELATI","SLS 02","Listio Jati Nandhiko","Nurlan Wahyuni","Vika Rizkiani","25","12","37","90"
"TOHO","TOHO BARAT","SLS 01","Najia Helmiah","Risma Shayrani","Syarifah Desti Pratiwi","18","6","24","70"`;

export function parseRekapMempawahCSV(csvText: string): RekapMempawahRecord[] {
  const lines = csvText.split(/\r?\n/);
  if (lines.length === 0) return [];
  
  // Find headers dynamically
  const firstLine = lines[0].trim();
  if (!firstLine) return [];
  const rawHeaders = parseCSVLine(firstLine);
  const headers = rawHeaders.map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
  
  // Helper for priority matching
  const findIndex = (exacts: string[], includes: string[], blacklist: string[] = []) => {
    let idx = headers.findIndex(h => exacts.includes(h));
    if (idx !== -1) return idx;
    
    idx = headers.findIndex(h => {
      const cleanH = h.replace(/[^a-z0-9]/g, '');
      return exacts.some(e => e.replace(/[^a-z0-9]/g, '') === cleanH);
    });
    if (idx !== -1) return idx;
    
    return headers.findIndex(h => {
      if (blacklist.some(b => h.includes(b))) return false;
      return includes.some(inc => h.includes(inc));
    });
  };

  const idxKec = findIndex(['kecamatan', 'kec'], ['kecamatan', 'kec']);
  const idxDesa = findIndex(['desa', 'kelurahan', 'des'], ['desa', 'kelurahan', 'des']);
  const idxSls = findIndex(['nama sls', 'sls', 'rt'], ['sls', 'rt'], ['idsub', 'idsubsls', 'id_sub']);
  const idxPj = findIndex(['pj', 'nama pj', 'penanggung jawab'], ['pj', 'penanggung']);
  const idxPpl = findIndex(['nama ppl', 'ppl', 'pplname', 'petugas'], ['ppl', 'petugas']);
  const idxPml = findIndex(['nama pml', 'pml', 'pmlname', 'pengawas'], ['pml', 'pengawas']);
  const idxSubmit = findIndex(['submit', 'jumlah submit'], ['submit'], ['idsub', 'idsubsls', 'id_sub']);
  const idxDraft = findIndex(['draf', 'draft', 'jumlah draf'], ['draf', 'draft']);
  const idxTotal = findIndex(['total', 'total submit+draf', 'total submit + draf'], ['total', 'tot']);
  const idxTarget = findIndex(['target', 'muatan prelist', 'target muatan'], ['target', 'prelist', 'muatan']);
  const idxTargetPbi = findIndex(['jumlah target pbi', 'target pbi', 'pbi'], ['pbi']);
  const idxStatusSls = findIndex(['status sls percepatan sakernas agustus', 'status sls percepatan'], ['percepatan sakernas', 'percepatan']);
  const idxApprovedPml = findIndex(['approved pml', 'approver pml', 'approved', 'approv'], ['approv']);
  const idxRejectedPml = findIndex(['rejected pml', 'rejected', 'reject'], ['reject']);

  const records: RekapMempawahRecord[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const rawCols = parseCSVLine(line);
    const cols = rawCols.map(c => c.replace(/^"|"$/g, '').trim());
    
    const kecamatan = idxKec !== -1 && cols[idxKec] ? cols[idxKec] : '';
    const desa = idxDesa !== -1 && cols[idxDesa] ? cols[idxDesa] : '';
    const sls = idxSls !== -1 && cols[idxSls] ? cols[idxSls] : '';
    const pj = idxPj !== -1 && cols[idxPj] ? cols[idxPj] : '';
    const pplName = idxPpl !== -1 && cols[idxPpl] ? cols[idxPpl] : '';
    const pmlName = idxPml !== -1 && cols[idxPml] ? cols[idxPml] : '';
    
    const submit = idxSubmit !== -1 && cols[idxSubmit] ? (parseInt(cols[idxSubmit], 10) || 0) : 0;
    const draft = idxDraft !== -1 && cols[idxDraft] ? (parseInt(cols[idxDraft], 10) || 0) : 0;
    const total = idxTotal !== -1 && cols[idxTotal] ? (parseInt(cols[idxTotal], 10) || 0) : (submit + draft);
    const target = idxTarget !== -1 && cols[idxTarget] ? (parseInt(cols[idxTarget], 10) || 0) : total;
    const targetPbi = idxTargetPbi !== -1 && cols[idxTargetPbi] ? (parseInt(cols[idxTargetPbi], 10) || 0) : 0;
    const statusSls = idxStatusSls !== -1 && cols[idxStatusSls] ? cols[idxStatusSls] : '';
    
    let statusPercepatan = '';
    const isSlsPercepatan = statusSls.toLowerCase().includes('bukan') === false && statusSls.toLowerCase().includes('percepatan');
    
    if (!isSlsPercepatan && targetPbi === 0) {
      statusPercepatan = 'Bukan SLS Percepatan';
    } else if (!isSlsPercepatan && targetPbi > 0) {
      statusPercepatan = 'Prioritas GC PBI';
    } else if (isSlsPercepatan && targetPbi === 0) {
      statusPercepatan = 'SLS Percepatan Sakernas Agustus';
    } else if (isSlsPercepatan && targetPbi > 0) {
      statusPercepatan = 'Percepatan Sakernas Agustus dan Prioritas GC PBI';
    } else {
      statusPercepatan = 'Bukan SLS Percepatan'; // default fallback
    }
    
    const approvedPml = idxApprovedPml !== -1 && cols[idxApprovedPml] ? (parseInt(cols[idxApprovedPml], 10) || 0) : 0;
    const rejectedPml = idxRejectedPml !== -1 && cols[idxRejectedPml] ? (parseInt(cols[idxRejectedPml], 10) || 0) : 0;
    
    if (kecamatan || desa || sls || pplName) {
      records.push({
        kecamatan,
        desa,
        sls,
        pj,
        pplName,
        pmlName,
        submit,
        draft,
        total,
        target,
        targetPbi,
        approvedPml,
        rejectedPml,
        statusPercepatan,
        open: Math.max(0, target - (submit + draft))
      });
    }
  }
  
  return records;
}

