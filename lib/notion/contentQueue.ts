import 'server-only';
import { createPage, prop, NotionError } from '@/lib/notion/client';

// Writing drafts into the Skyline Notion workspace.
//
// The databases live under the "Skyline Cycle Terminal" project page. Their IDs
// are not secrets — they identify a row store, and reaching it still requires
// NOTION_TOKEN plus an explicit share — so they sit here rather than in env,
// where they would be one more thing to configure per environment and to get
// silently wrong.
//
// Nothing here posts anything. Every row lands as a Draft for a person to edit
// and publish by hand, which is why no X API credentials appear anywhere in
// this path.

export const DB = {
  contentQueue:   'a08c1225697e4fa1a5db2f041055d88b',
  chartRotation:  '5adf07b05ba643469362a3c723204449',
  automationRuns: '31023970c45c44ba96ef936d5d27b442',
} as const;

export type Channel = 'X Daily' | 'X Road to 1M' | 'Newsletter' | 'YouTube Script';
export type Job =
  | 'Daily X Post' | 'Weekly Newsletter' | 'Road to 1M Weekly'
  | 'Video Script Draft' | 'Daily Snapshot' | 'EDGAR Pull' | 'Alert Check';
export type Outcome = 'Success' | 'Failed' | 'Skipped' | 'Partial';

export type Draft = {
  title:        string;
  channel:      Channel;
  body:         string;
  /** ISO date the post is intended for, e.g. "2026-08-30". */
  scheduledFor: string;
  chartUsed?:   string | null;
  scoreAtBuild?: number | null;
  notes?:       string | null;
};

/** Creates one Content Queue row with status Draft. Returns the new page id. */
export async function createDraft(d: Draft): Promise<string> {
  return createPage(DB.contentQueue, {
    Title:            prop.title(d.title),
    Channel:          prop.select(d.channel),
    Status:           prop.select('Draft'),
    'Scheduled For':  prop.date(d.scheduledFor),
    Body:             prop.richText(d.body),
    'Chart Used':     prop.richText(d.chartUsed),
    'Score At Build': prop.number(d.scoreAtBuild),
    Origin:           prop.select('Automated'),
    Notes:            prop.richText(d.notes),
  });
}

export type RunLog = {
  job:      Job;
  outcome:  Outcome;
  /** ISO date the run happened, in the schedule's own timezone. */
  ranAt:    string;
  detail:   string;
  /** Content Queue page ids this run produced. */
  produced?: string[];
};

/**
 * Records one job execution.
 *
 * Never throws. A run log that takes down the run it is describing is worse
 * than no run log, and the caller has already done the useful work by the time
 * this is reached.
 */
export async function logRun(r: RunLog): Promise<void> {
  try {
    await createPage(DB.automationRuns, {
      Run:       prop.title(`${r.job} · ${r.ranAt}`),
      Job:       prop.select(r.job),
      Outcome:   prop.select(r.outcome),
      'Ran At':  prop.date(r.ranAt),
      Detail:    prop.richText(r.detail),
      Produced:  prop.relation(r.produced ?? []),
    });
  } catch (err) {
    console.error('[notion] run log failed:', err instanceof NotionError ? err.message : err);
  }
}
