import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";

export type Sort = "updated" | "created" | "alpha";
export function dayGroup(time: number, now: number) {
  const day = new Date(time);
  const today = new Date(now);
  const serial = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const age = (serial(today) - serial(day)) / 86400000;
  if (age <= 0) return { id: "today", label: "Today", cap: Infinity };
  if (age === 1) return { id: "yesterday", label: "Yesterday", cap: Infinity };
  if (age < 7) return { id: String(serial(day)), label: day.toLocaleDateString(undefined, { month: "short", day: "numeric" }), cap: 6 };
  return { id: "older", label: "Older", cap: 20 };
}
export function timestamp(t: PluginSidebarThread, sort: Sort, now: number) {
  if (sort === "created") return t.createdAt;
  return t.status === "active" ? now : t.latestAttentionAt || t.createdAt;
}
export function remaining(used: number) {
  return Math.max(0, Math.min(100, 100 - used)).toLocaleString(undefined, {maximumFractionDigits: 1});
}
