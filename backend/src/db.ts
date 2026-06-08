import { MongoClient, type Db, type Collection } from "mongodb";
import { env } from "./env.js";
import type {
  TeamMember,
  Client,
  Project,
  Task,
  TimeEntry,
  ActivityItem,
  Invoice,
  ActiveTimer,
  TaskComment,
  ProjectFile,
  Expense,
  Account,
  JournalEntry,
  AuditEntry,
  MetaDoc,
  FixedAsset,
  ReconMark,
  ShareLink,
} from "./types.js";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connect(): Promise<Db> {
  if (db) return db;
  client = new MongoClient(env.mongoUri, {
    serverSelectionTimeoutMS: 15000,
  });
  await client.connect();
  db = client.db(env.mongoDb);
  return db;
}

export function getDb(): Db {
  if (!db) throw new Error("DB not connected — call connect() first");
  return db;
}

export async function closeDb(): Promise<void> {
  if (client) await client.close();
  client = null;
  db = null;
}

// Typed collection accessors. We store our string `id` on documents and keep
// Mongo's `_id` internal; responses strip `_id`.
export const collections = {
  team: () => getDb().collection<TeamMember>("team"),
  clients: () => getDb().collection<Client>("clients"),
  projects: () => getDb().collection<Project>("projects"),
  tasks: () => getDb().collection<Task>("tasks"),
  time: () => getDb().collection<TimeEntry>("time_entries"),
  activity: () => getDb().collection<ActivityItem>("activity"),
  invoices: () => getDb().collection<Invoice>("invoices"),
  timers: () => getDb().collection<ActiveTimer>("timers"),
  comments: () => getDb().collection<TaskComment>("comments"),
  files: () => getDb().collection<ProjectFile>("files"),
  expenses: () => getDb().collection<Expense>("expenses"),
  accounts: () => getDb().collection<Account>("accounts"),
  journal: () => getDb().collection<JournalEntry>("journal"),
  audit: () => getDb().collection<AuditEntry>("audit_log"),
  meta: () => getDb().collection<MetaDoc>("meta"),
  assets: () => getDb().collection<FixedAsset>("assets"),
  recon: () => getDb().collection<ReconMark>("recon"),
  shares: () => getDb().collection<ShareLink>("shares"),
};

export type Collections = typeof collections;

// Ensure unique indexes on our business `id` keys.
export async function ensureIndexes(): Promise<void> {
  await Promise.all([
    collections.team().createIndex({ id: 1 }, { unique: true }),
    collections.team().createIndex({ email: 1 }, { unique: true }),
    collections.clients().createIndex({ id: 1 }, { unique: true }),
    collections.projects().createIndex({ id: 1 }, { unique: true }),
    collections.tasks().createIndex({ id: 1 }, { unique: true }),
    collections.invoices().createIndex({ id: 1 }, { unique: true }),
    collections.timers().createIndex({ person: 1 }, { unique: true }),
    collections.comments().createIndex({ task: 1 }),
    collections.comments().createIndex({ id: 1 }, { unique: true }),
    collections.files().createIndex({ project: 1 }),
    collections.files().createIndex({ id: 1 }, { unique: true }),
    collections.expenses().createIndex({ id: 1 }, { unique: true }),
    collections.expenses().createIndex({ category: 1 }),
    collections.accounts().createIndex({ code: 1 }, { unique: true }),
    collections.journal().createIndex({ id: 1 }, { unique: true }),
    collections.journal().createIndex({ source: 1, sourceId: 1 }),
    collections.audit().createIndex({ at: -1 }),
    collections.meta().createIndex({ key: 1 }, { unique: true }),
    collections.assets().createIndex({ id: 1 }, { unique: true }),
    collections.recon().createIndex({ account: 1, entryId: 1 }, { unique: true }),
    collections.shares().createIndex({ token: 1 }, { unique: true }),
  ]);
}

// Strip Mongo internals from a doc (or array of docs) before returning to client.
export function clean<T extends object>(doc: T): Omit<T, "_id"> {
  const { _id, ...rest } = doc as T & { _id?: unknown };
  void _id;
  return rest as Omit<T, "_id">;
}
export function cleanAll<T extends object>(docs: T[]): Omit<T, "_id">[] {
  return docs.map(clean);
}
