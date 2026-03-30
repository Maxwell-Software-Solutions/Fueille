export interface ChangelogEntry {
  version: string;
  date: string; // "YYYY-MM-DD"
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.0.0',
    date: '2026-03-30',
    changes: [
      'Launch: offline-first plant tracking PWA',
      'Add plants with photos and care tasks',
      'Repeating care reminders with push notifications',
      'Garden layout editor with plant markers',
      'Local AI plant identification (no internet required)',
      'Plant care library with 30 curated species',
      'Care history timeline per plant',
      'Bulk complete/snooze tasks from dashboard',
      'Data export and import (JSON backup)',
    ],
  },
];
