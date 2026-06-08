import { Router } from "express";
import { collections, cleanAll } from "../db.js";
import { requireAuth } from "../lib/auth.js";
import { asyncHandler } from "../lib/http.js";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const me = req.user!.id;
    const [projects, tasks, time, invoices, team] = await Promise.all([
      collections.projects().find().toArray(),
      collections.tasks().find().toArray(),
      collections.time().find().toArray(),
      collections.invoices().find().toArray(),
      collections.team().find({}, { projection: { hourly: 1, id: 1 } }).toArray(),
    ]);

    const hourlyById = Object.fromEntries(team.map((t) => [t.id, t.hourly]));

    const totalMins = time.reduce((s, t) => s + t.mins, 0);
    const billableMins = time.filter((t) => t.billable).reduce((s, t) => s + t.mins, 0);
    const myMins = time.filter((t) => t.person === me).reduce((s, t) => s + t.mins, 0);
    const billableRevenue = time
      .filter((t) => t.billable)
      .reduce((s, t) => s + (t.mins / 60) * (hourlyById[t.person] ?? 13000), 0);

    const activeProjects = projects.filter((p) => p.status.label !== "Done");
    const atRisk = projects.filter((p) =>
      ["At risk", "Blocked"].includes(p.status.label),
    ).length;

    // Consolidate to BDT (the studio's functional currency) so blended KPIs are coherent.
    const bdt = (i: { amount: number; currency?: string }) =>
      i.currency === "USD" ? i.amount * 110 : i.amount;
    const revenueMTD = Math.round(
      invoices.filter((i) => i.status === "Paid" || i.status === "Sent").reduce((s, i) => s + bdt(i), 0),
    );
    const outstanding = Math.round(
      invoices.filter((i) => i.status !== "Paid").reduce((s, i) => s + bdt(i), 0),
    );

    // Today's focus: my open tasks, prioritised.
    const rank = { Critical: 0, High: 1, Medium: 2, Low: 3 } as const;
    const focus = tasks
      .filter((t) => t.assignees.includes(me) && t.status !== "done")
      .sort((a, b) => rank[a.priority] - rank[b.priority])
      .slice(0, 6);
    const focusDone = tasks.filter(
      (t) => t.assignees.includes(me) && t.status === "done",
    ).length;

    // "Live" timer = the most recently created time entry by me.
    const myEntries = time
      .filter((t) => t.person === me)
      .sort((a, b) => (b.createdAt?.getTime?.() ?? 0) - (a.createdAt?.getTime?.() ?? 0));
    const live = myEntries[0] ?? null;

    res.json({
      kpis: {
        activeProjects: activeProjects.length,
        totalProjects: projects.length,
        atRisk,
        hoursThisWeekTeam: Math.round(totalMins / 60),
        myHoursThisWeek: Math.round((myMins / 60) * 10) / 10,
        billableRate: totalMins ? Math.round((billableMins / totalMins) * 100) : 0,
        revenueMTD,
        outstanding,
        billableRevenue: Math.round(billableRevenue),
      },
      activeProjects: cleanAll(
        [...activeProjects].sort((a, b) => a.health - b.health),
      ),
      focus: cleanAll(focus),
      focusDone,
      focusTotal: focus.length + focusDone,
      live,
    });
  }),
);

export default router;
