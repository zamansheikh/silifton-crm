// Collection accessors, indexes and first-boot seeding for the website data.
// Collection names match what the retired NestJS backend used, so the data
// already in Atlas is picked up as-is.
import type { Collection } from "mongodb";
import { getDb } from "../db.js";
import {
  CONTENT_COLLECTIONS,
  type Application,
  type ContentCollection,
  type ContentDoc,
  type Inquiry,
  type PageView,
  type SettingDoc,
} from "./types.js";
import {
  SEED_APPLICATIONS,
  SEED_CAREERS,
  SEED_INQUIRIES,
  SEED_PORTFOLIO,
  SEED_POSTS,
  SEED_SERVICES,
  SEED_TESTIMONIALS,
} from "./seed.js";

export const web = {
  content: (c: ContentCollection): Collection<ContentDoc> => getDb().collection<ContentDoc>(c),
  inquiries: () => getDb().collection<Inquiry>("inquiries"),
  applications: () => getDb().collection<Application>("applications"),
  pageViews: () => getDb().collection<PageView>("page_views"),
  settings: () => getDb().collection<SettingDoc>("settings"),
};

// Mongoose left `_id` and `__v` on every document; neither belongs in a response.
export function stripDoc<T extends object>(doc: T): Omit<T, "_id" | "__v"> {
  const { _id, __v, ...rest } = doc as T & { _id?: unknown; __v?: unknown };
  void _id;
  void __v;
  return rest as Omit<T, "_id" | "__v">;
}
export function stripAll<T extends object>(docs: T[]): Omit<T, "_id" | "__v">[] {
  return docs.map(stripDoc);
}

export async function ensureWebsiteIndexes(): Promise<void> {
  await Promise.all([
    ...CONTENT_COLLECTIONS.map((c) => web.content(c).createIndex({ id: 1 }, { unique: true })),
    web.inquiries().createIndex({ id: 1 }, { unique: true }),
    web.applications().createIndex({ id: 1 }, { unique: true }),
    web.pageViews().createIndex({ day: 1 }),
    web.pageViews().createIndex({ createdAt: 1 }),
    web.pageViews().createIndex({ visitor: 1 }),
    web.pageViews().createIndex({ path: 1 }),
    web.settings().createIndex({ key: 1 }, { unique: true }),
  ]);
}

type Rec = Record<string, unknown>;

function stamp<T extends Rec>(doc: T): T & { createdAt: Date; updatedAt: Date } {
  const now = new Date();
  return { createdAt: now, updatedAt: now, ...doc } as T & { createdAt: Date; updatedAt: Date };
}

async function seedIfEmpty(c: ContentCollection, docs: Rec[]): Promise<void> {
  const col = web.content(c);
  if ((await col.estimatedDocumentCount()) > 0 || docs.length === 0) return;
  await col.insertMany(docs.map((d) => stamp(d) as unknown as ContentDoc));
  console.log(`[website] seeded ${docs.length} ${c}`);
}

// Copy any seed-defined field a stored doc is missing (matched by id). Existing
// non-empty values always win — this only fills gaps left by older seeds.
async function backfillFromSeed(c: ContentCollection, seed: Rec[]): Promise<void> {
  const col = web.content(c);
  const byId = new Map(seed.map((s) => [String(s.id), s]));
  const items = await col.find().toArray();
  const ops: Array<{ updateOne: { filter: { id: string }; update: { $set: Rec } } }> = [];
  for (const item of items) {
    const s = byId.get(item.id);
    if (!s) continue;
    const additions: Rec = {};
    for (const [k, v] of Object.entries(s)) {
      const cur = item[k];
      if (cur === undefined || cur === null || cur === "") additions[k] = v;
    }
    if (Object.keys(additions).length) ops.push({ updateOne: { filter: { id: item.id }, update: { $set: additions } } });
  }
  if (ops.length) await col.bulkWrite(ops);
}

export async function seedWebsiteIfEmpty(): Promise<void> {
  await Promise.all([
    seedIfEmpty("services", SEED_SERVICES.map((s) => ({ ...s, id: s.num }))),
    seedIfEmpty("portfolio", SEED_PORTFOLIO as unknown as Rec[]),
    seedIfEmpty("posts", SEED_POSTS as unknown as Rec[]),
    seedIfEmpty("testimonials", SEED_TESTIMONIALS as unknown as Rec[]),
    seedIfEmpty("careers", SEED_CAREERS as unknown as Rec[]),
  ]);
  await backfillFromSeed("portfolio", SEED_PORTFOLIO as unknown as Rec[]);
  await backfillFromSeed("posts", SEED_POSTS as unknown as Rec[]);

  if ((await web.inquiries().estimatedDocumentCount()) === 0) {
    await web.inquiries().insertMany(SEED_INQUIRIES.map((i) => stamp(i) as unknown as Inquiry));
    console.log(`[website] seeded ${SEED_INQUIRIES.length} inquiries`);
  }
  if ((await web.applications().estimatedDocumentCount()) === 0) {
    await web.applications().insertMany(SEED_APPLICATIONS.map((a) => stamp(a) as unknown as Application));
    console.log(`[website] seeded ${SEED_APPLICATIONS.length} applications`);
  }
}
