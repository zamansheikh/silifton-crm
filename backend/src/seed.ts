// Seed the MongoDB database with Silifton's sample data.
// Run: npm run seed   (clears existing collections, then inserts fresh)
import { connect, collections, ensureIndexes, closeDb } from "./db.js";
import { hashPassword } from "./lib/auth.js";
import { syncAll } from "./lib/ledger.js";
import { CHART_OF_ACCOUNTS } from "./data/coa.js";
import {
  TEAM,
  CLIENTS,
  PROJECTS,
  TASKS,
  TIME_ENTRIES,
  ACTIVITY,
  INVOICES,
  EXPENSES,
  ASSETS,
  DEFAULT_PASSWORD,
} from "./data/seed-data.js";
import type { TeamMember, TimeEntry, ActivityItem } from "./types.js";

async function run() {
  console.log("→ Connecting to MongoDB…");
  await connect();

  console.log("→ Clearing existing collections…");
  await Promise.all([
    collections.team().deleteMany({}),
    collections.clients().deleteMany({}),
    collections.projects().deleteMany({}),
    collections.tasks().deleteMany({}),
    collections.time().deleteMany({}),
    collections.activity().deleteMany({}),
    collections.invoices().deleteMany({}),
    collections.comments().deleteMany({}),
    collections.timers().deleteMany({}),
    collections.expenses().deleteMany({}),
    collections.accounts().deleteMany({}),
    collections.journal().deleteMany({}),
    collections.assets().deleteMany({}),
    collections.shares().deleteMany({}),
    collections.recon().deleteMany({}),
    collections.meta().deleteMany({}),
    collections.audit().deleteMany({}),
  ]);

  console.log("→ Hashing passwords + inserting team…");
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);
  const members: TeamMember[] = TEAM.map((m) => ({
    ...m,
    passwordHash,
    createdAt: new Date(),
  }));
  await collections.team().insertMany(members);

  console.log("→ Inserting clients, projects, invoices, expenses…");
  await collections.clients().insertMany(CLIENTS);
  await collections.projects().insertMany(PROJECTS);
  await collections.invoices().insertMany(INVOICES);
  await collections.expenses().insertMany(EXPENSES.map((e) => ({ ...e, createdAt: new Date() })));
  await collections.assets().insertMany(ASSETS.map((a) => ({ ...a, createdAt: new Date() })));

  console.log("→ Inserting tasks…");
  const SUBTASK_TITLES = [
    "Design the approach",
    "Implement core logic + tests",
    "Add config + overrides",
    "Edge cases + error states",
    "Load-test against shadow traffic",
    "Roll out behind a flag",
    "Docs + handoff notes",
    "Final QA pass",
    "Stakeholder review",
    "Ship to production",
  ];
  const tasks = TASKS.map((t, i) => ({
    ...t,
    // Materialise the count-based subtasks into a real checklist.
    checklist: Array.from({ length: t.subtasks }, (_, j) => ({
      id: `${t.id}-st${j + 1}`,
      title: SUBTASK_TITLES[j % SUBTASK_TITLES.length],
      done: j < t.done,
    })),
    order: i,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
  await collections.tasks().insertMany(tasks);

  console.log("→ Inserting time entries + activity…");
  const time: TimeEntry[] = TIME_ENTRIES.map((t, i) => ({
    ...t,
    id: `TE-${String(i + 1).padStart(4, "0")}`,
    createdAt: new Date(),
  }));
  await collections.time().insertMany(time);
  const activity: ActivityItem[] = ACTIVITY.map((a, i) => ({
    ...a,
    id: `ACT-${String(i + 1).padStart(4, "0")}`,
  }));
  await collections.activity().insertMany(activity);

  console.log("→ Seeding sample comments…");
  const sampleComments = [
    { task: "TSK-241", author: "jk", body: "Have we picked a rate-limiting algo? Sliding window vs token bucket — both have tradeoffs for the burst traffic Helio sees in payday windows.", min: 5760 },
    { task: "TSK-241", author: "mr", body: "Going sliding window for now — closer to actual user perception. Token bucket can come later if we need more flex.", min: 4320 },
    { task: "TSK-241", author: "an", body: "Made it configurable per-route in the middleware. PR ready: silifton/helio#487.", min: 2880 },
    { task: "TSK-241", author: "to", body: "Reviewed. Two small notes inline on the bucket config naming. Otherwise LGTM.", min: 360 },
    { task: "TSK-481", author: "an", body: "HIPAA checklist is mostly green — waiting on the audit-log retention sign-off.", min: 600 },
  ];
  await collections.comments().insertMany(
    sampleComments.map((c, i) => ({
      id: `CMT-${String(i + 1).padStart(4, "0")}`,
      task: c.task,
      author: c.author,
      body: c.body,
      createdAt: new Date(Date.now() - c.min * 60 * 1000),
    })),
  );
  // Keep task.comments counts honest with what we just inserted.
  for (const taskId of ["TSK-241", "TSK-481"]) {
    const count = await collections.comments().countDocuments({ task: taskId });
    await collections.tasks().updateOne({ id: taskId }, { $set: { comments: count } });
  }

  console.log("→ Inserting chart of accounts + posting ledger…");
  await collections.accounts().insertMany(CHART_OF_ACCOUNTS);
  const posted = await syncAll("mr");

  console.log("→ Ensuring indexes…");
  await ensureIndexes();
  void posted;

  const counts = {
    team: await collections.team().countDocuments(),
    clients: await collections.clients().countDocuments(),
    projects: await collections.projects().countDocuments(),
    tasks: await collections.tasks().countDocuments(),
    time: await collections.time().countDocuments(),
    activity: await collections.activity().countDocuments(),
    invoices: await collections.invoices().countDocuments(),
    expenses: await collections.expenses().countDocuments(),
    accounts: await collections.accounts().countDocuments(),
    journal: await collections.journal().countDocuments(),
    assets: await collections.assets().countDocuments(),
  };
  console.log("✓ Seed complete:", counts);
  console.log(`\n  Login → admin@silifton.com / ${DEFAULT_PASSWORD}\n`);

  await closeDb();
}

run().catch((err) => {
  console.error("✗ Seed failed:", err);
  process.exit(1);
});
