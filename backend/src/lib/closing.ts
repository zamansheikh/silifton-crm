import { collections } from "../db.js";
import { monthOf } from "./period.js";
import { forbidden } from "./http.js";

export async function getClosedThroughMonth(): Promise<number> {
  const m = await collections.meta().findOne({ key: "accounting" });
  return m?.closedThroughMonth ?? -1;
}

export async function setClosedThroughMonth(month: number): Promise<void> {
  await collections.meta().updateOne(
    { key: "accounting" },
    { $set: { closedThroughMonth: month } },
    { upsert: true },
  );
}

export async function isClosed(date: string): Promise<boolean> {
  return monthOf(date) <= (await getClosedThroughMonth());
}

// Throw if the document's accounting period is locked.
export async function assertOpen(date: string): Promise<void> {
  if (await isClosed(date)) {
    throw forbidden("That accounting period is closed — reopen it before making changes");
  }
}
