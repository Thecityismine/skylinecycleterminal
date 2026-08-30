import 'server-only';

// Minimal Notion REST client.
//
// Deliberately not @notionhq/client. The three calls this app makes are a page
// create and two property writes; the SDK is a dependency, a bundle, and a
// version-pinning obligation for something `fetch` already does. If the surface
// grows past a handful of calls, revisit.
//
// The token is a Notion *internal integration* secret, which is not the same
// thing as any Notion connection used elsewhere. Create it at
// notion.so/my-integrations, then open each of the three databases and share
// them with that integration explicitly — an integration sees nothing in a
// workspace until a page or database is shared with it, so a missing share
// shows up as a 404 rather than a 403.

const NOTION_API = 'https://api.notion.com/v1';

// Pinned. Notion breaks response shapes between versions, and a silent upgrade
// on their side is not something this should discover in production at 09:00.
const NOTION_VERSION = '2022-06-28';

export class NotionError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'NotionError';
  }
}

function token(): string {
  const t = process.env.NOTION_TOKEN?.trim();
  if (!t) throw new NotionError('NOTION_TOKEN is not set', 0);
  return t;
}

async function notionFetch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${NOTION_API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token()}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const text = await res.text();
  if (!res.ok) {
    // Notion's error bodies are useful and small. Passing the message straight
    // through is what makes a failed run legible in the Automation Runs log
    // instead of just "500".
    throw new NotionError(`Notion ${res.status}: ${text.slice(0, 300)}`, res.status);
  }
  return JSON.parse(text) as T;
}

// ── Property builders ─────────────────────────────────────────────────────────

/** Notion rejects any rich_text element over 2000 characters. */
const RICH_TEXT_LIMIT = 2000;

export const prop = {
  title: (text: string) => ({ title: [{ text: { content: text.slice(0, RICH_TEXT_LIMIT) } }] }),

  richText: (text: string | null | undefined) =>
    text ? { rich_text: [{ text: { content: text.slice(0, RICH_TEXT_LIMIT) } }] } : { rich_text: [] },

  select: (name: string | null | undefined) => (name ? { select: { name } } : { select: null }),

  number: (n: number | null | undefined) =>
    n == null || !Number.isFinite(n) ? { number: null } : { number: n },

  /** Date-only. Notion infers the format from the string, so no time is sent. */
  date: (iso: string | null | undefined) => (iso ? { date: { start: iso } } : { date: null }),

  url: (u: string | null | undefined) => ({ url: u || null }),

  relation: (pageIds: string[]) => ({ relation: pageIds.map((id) => ({ id })) }),
};

export type NotionProps = Record<string, unknown>;

/** Creates a page in a database. Returns the new page's id. */
export async function createPage(databaseId: string, properties: NotionProps): Promise<string> {
  const json = await notionFetch<{ id: string }>('/pages', {
    parent: { database_id: databaseId },
    properties,
  });
  return json.id;
}
