import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { marked } from 'marked';

// Loads the /learn guides from content/learn/*.md at build time.
//
// The frontmatter parser below is deliberately strict rather than a full YAML
// implementation: this project emits the frontmatter itself (see the migration
// in docs/learn-and-free-surface-scope.md), so the format is fixed and known.
// The obvious alternative, gray-matter, pulls in js-yaml 3.x which carries a
// known high-severity advisory — not worth it for a format we control.
//
// If frontmatter ever needs to accept arbitrary author-written YAML, replace
// this with a real parser rather than extending it.

const CONTENT_DIR = join(process.cwd(), 'content', 'learn');

export type LearnArticle = {
  title:       string;
  slug:        string;
  metaTitle:   string;
  description: string;
  keyword:     string;
  secondary:   string[];
  order:       number;
  pillar:      boolean;
  updated:     string;
};

export type LearnArticleWithBody = LearnArticle & {
  html:           string;
  readingMinutes: number;
};

type Scalar = string | number | boolean;

function parseScalar(raw: string): Scalar {
  const v = raw.trim();
  if (v.startsWith('"')) return JSON.parse(v) as string;
  if (v === 'true') return true;
  if (v === 'false') return false;
  const n = Number(v);
  return Number.isFinite(n) && v !== '' ? n : v;
}

function parseFrontmatter(source: string): { data: Record<string, Scalar | string[]>; body: string } {
  const lines = source.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') {
    throw new Error('learn: file is missing opening frontmatter delimiter');
  }
  const end = lines.indexOf('---', 1);
  if (end === -1) {
    throw new Error('learn: file is missing closing frontmatter delimiter');
  }

  const data: Record<string, Scalar | string[]> = {};
  let listKey: string | null = null;

  for (const line of lines.slice(1, end)) {
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && listKey) {
      (data[listKey] as string[]).push(parseScalar(item[1]) as string);
      continue;
    }

    const kv = line.match(/^([A-Za-z][\w]*):\s*(.*)$/);
    if (!kv) continue;

    const [, key, rest] = kv;
    if (rest.trim() === '') {
      listKey = key;
      data[key] = [];
    } else if (rest.trim() === '[]') {
      listKey = null;
      data[key] = [];
    } else {
      listKey = null;
      data[key] = parseScalar(rest);
    }
  }

  return { data, body: lines.slice(end + 1).join('\n') };
}

function toArticle(data: Record<string, Scalar | string[]>, fallbackSlug: string): LearnArticle {
  return {
    title:       String(data.title ?? fallbackSlug),
    slug:        String(data.slug ?? fallbackSlug),
    metaTitle:   String(data.metaTitle ?? data.title ?? fallbackSlug),
    description: String(data.description ?? ''),
    keyword:     String(data.keyword ?? ''),
    secondary:   Array.isArray(data.secondary) ? data.secondary : [],
    order:       typeof data.order === 'number' ? data.order : 99,
    pillar:      data.pillar === true,
    updated:     String(data.updated ?? ''),
  };
}

function readSlugs(): string[] {
  return readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''));
}

/** All guides, pillar first, then cluster order. */
export function getAllArticles(): LearnArticle[] {
  return readSlugs()
    .map((slug) => {
      const { data } = parseFrontmatter(readFileSync(join(CONTENT_DIR, `${slug}.md`), 'utf8'));
      return toArticle(data, slug);
    })
    .sort((a, b) => a.order - b.order);
}

export function getArticle(slug: string): LearnArticleWithBody | null {
  if (!readSlugs().includes(slug)) return null;

  const raw = readFileSync(join(CONTENT_DIR, `${slug}.md`), 'utf8');
  const { data, body } = parseFrontmatter(raw);

  const words = body.split(/\s+/).filter(Boolean).length;

  return {
    ...toArticle(data, slug),
    html:           marked.parse(body, { async: false, gfm: true }),
    readingMinutes: Math.max(1, Math.round(words / 220)),
  };
}

/**
 * Siblings to link sideways to, per the content-hub rule that every guide links
 * up to the pillar and across to 1–2 neighbours. Picks the adjacent guides in
 * cluster order, skipping the pillar (which is already linked separately).
 */
export function getRelated(slug: string, count = 2): LearnArticle[] {
  const all = getAllArticles().filter((a) => !a.pillar);
  const i = all.findIndex((a) => a.slug === slug);
  if (i === -1) return all.slice(0, count);

  const after  = all.slice(i + 1);
  const before = all.slice(0, i).reverse();
  return [...after, ...before].slice(0, count);
}

export function getPillar(): LearnArticle | null {
  return getAllArticles().find((a) => a.pillar) ?? null;
}
