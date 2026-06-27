export interface PPLSummary {
  pmlName: string;
  pplName: string;
  submit: number;
  draft: number;
  total: number;
  mempawahTarget?: number;
}

export interface Table3Record {
  pmlName: string;
  pplName: string;
  submit: number;
  draft: number;
  total: number;
  dateStr: string;   // e.g., "19 Juni 2026"
  date: Date;        // parsed JavaScript Date object
  mempawahTarget?: number;
}

export interface PPLDailyProgress extends Table3Record {
  dailySubmit: number; // submit - previous_submit
  dailyDraft: number;   // draft - previous_draft
  dailyTotal: number;   // total - previous_total
  isFirstDay: boolean;  // whether this is the first date entry for this PPL
}

export interface Snapshot2359 {
  id: string; // dateStr + "_" + pplName
  dateStr: string; // e.g. "21 Juni 2026"
  timestamp: string; // e.g. "2026-06-21 23:59:00 WIB"
  pmlName: string;
  pplName: string;
  submit: number;
  draft: number;
  total: number;
  mempawahTarget: number;
  isAutoSaved: boolean;
}

