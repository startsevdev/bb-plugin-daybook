import { useEffect, useMemo, useState, type ReactNode } from "react";
import { definePluginApp, experimental_useSidebarThreads, experimental_ThreadActionsContextMenu as Menu, experimental_ThreadStatusGlyph as Glyph, useSdk, type PluginThreadListProps, type PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import { dayGroup, timestamp, remaining, type Sort } from "./model";
import "./style.css";

function usePreference(key: string, fallback: string) {
  const storageKey = "bb.daybook." + key;
  const [value, update] = useState(() => {
    try { return localStorage.getItem(storageKey) ?? fallback; } catch { return fallback; }
  });
  return [value, (next: string) => {
    update(next);
    try { localStorage.setItem(storageKey, next); } catch { /* storage can be disabled */ }
  }] as const;
}

function Quotas() {
  const sdk = useSdk();
  type Usage = Awaited<ReturnType<typeof sdk.system.usageLimits>>;
  const [usage, setUsage] = useState<Usage | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const response = await sdk.system.usageLimits();
        if (live) { setUsage(response); setFailed(false); }
      } catch { if (live) { setUsage(null); setFailed(true); } }
      if (live) timer = setTimeout(refresh, 300000);
    }
    void refresh();
    return () => { live = false; clearTimeout(timer); };
  }, [sdk]);
  const accounts = Object.entries(usage ?? {}).filter(([, a]) => a.status !== "not_installed");
  return <details className="quota" open><summary>Available quota</summary>
    {!accounts.length && <small>{failed || usage ? "Quota unavailable" : "Checking quota…"}</small>}
    {accounts.map(([provider, account]) => <div key={provider}><strong>{provider}</strong>
      {account.status === "ok" && account.windows.length ? account.windows.map((w, i) => {
        const reset = Date.parse(w.resetsAt ?? "");
        return <div key={i} className="window"><div>{w.label} <b>{remaining(w.usedPercent)}% left</b></div>
          <small>{Number.isFinite(reset) ? "Resets " + new Date(reset).toLocaleString(undefined, {month:"short", day:"numeric", hour:"numeric", minute:"2-digit"}) : "Reset time unavailable"}</small></div>;
      }) : <small>{account.status === "unauthenticated" || account.status === "expired" ? "Sign in to see quota" : "Quota unavailable"}</small>}
    </div>)}</details>;
}

function Group({ id, label, cap, rows, active, row }: {id: string; label: string; cap: number; rows: PluginSidebarThread[]; active: string | null; row: (t: PluginSidebarThread) => ReactNode}) {
  const [closed, setClosed] = usePreference("closed." + id, id.startsWith("section:") ? "yes" : "no");
  const [extra, setExtra] = useState(0);
  const visible = rows.filter((t, i) => i < cap + extra || t.id === active);
  const more = Math.min(rows.length - visible.length, cap === 6 ? Infinity : cap);
  return <section><button className="heading" aria-expanded={closed !== "yes"} onClick={() => setClosed(closed === "yes" ? "no" : "yes")}>{closed === "yes" ? "▸" : "▾"} {label}</button>
    {closed !== "yes" && <>{visible.map(row)}{more > 0 && <button className="more" onClick={() => setExtra(extra + more)}>Show {more} more</button>}</>}</section>;
}

function Daybook({ activeThreadId, onNavigate }: PluginThreadListProps) {
  const state = experimental_useSidebarThreads();
  const [project, setProject] = useState("");
  const [sort, setSort] = usePreference("sort", "updated");
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  const {groups, names, recent, earlier} = useMemo(() => {
    const names = new Map(state.projects.map(p => [p.id, p.name]));
    const last = new Map<string, number>();
    const sections = new Map(state.sections.map(s => [s.id, s.name]));
    const threads = state.threads.filter(t => !t.isHidden && !t.isArchived);
    for (const t of threads) if (t.originPluginId !== "automations") last.set(t.projectId, Math.max(last.get(t.projectId) ?? 0,t.lastReadAt ?? 0,t.latestAttentionAt,t.createdAt));
    const projects = [...state.projects].sort((a,b) => a.name.localeCompare(b.name));
    const isRecent = (p: typeof projects[number]) => (last.get(p.id) ?? 0) >= now - 30 * 86400000;
    const recent = projects.filter(isRecent).sort((a,b) => last.get(b.id)! - last.get(a.id)!);
    const earlier = projects.filter(p => !isRecent(p));
    const sorted = threads.filter(t => !project || project === t.projectId).sort((a,b) => sort === "alpha" ? a.displayTitle.localeCompare(b.displayTitle) : timestamp(b,sort as Sort,now)-timestamp(a,sort as Sort,now));
    const groups = new Map<string, {id:string; label:string; cap:number; rows:PluginSidebarThread[]}>();
    for (const t of sorted) {
      let group = sort === "alpha" ? {id:"threads",label:"Threads",cap:20} : dayGroup(timestamp(t,sort as Sort,now),now);
      if (t.isPinned) group = {id:"pinned",label:"Pinned",cap:Infinity};
      else if (t.sectionId && sections.has(t.sectionId)) group = {id:"section:"+t.sectionId,label:sections.get(t.sectionId)!,cap:20};
      if (!groups.has(group.id)) groups.set(group.id,{...group,rows:[]});
      groups.get(group.id)!.rows.push(t);
    }
    groups.get("pinned")?.rows.sort((a,b) => (a.pinSortKey ?? "\uffff").localeCompare(b.pinSortKey ?? "\uffff") || (a.pinnedAt ?? 0)-(b.pinnedAt ?? 0));
    const rank = (id:string) => id === "pinned" ? 0 : id.startsWith("section:") ? 2 : 1;
    return { groups:[...groups.values()].sort((a,b) => rank(a.id)-rank(b.id)), names,recent,earlier };
  },[state.projects,state.sections,state.threads,project,sort,now]);
  const renderRow = (t:PluginSidebarThread) => <Menu key={t.id} thread={{...t, environment:t.environment?.id ? {...t.environment,id:t.environment.id} : null}}><a href={t.href} aria-current={activeThreadId === t.id ? "page" : undefined} title={t.displayTitle} onClick={e => {if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) onNavigate();}}>
    <Glyph indicator={t.indicator} size="compact"/><span>{t.displayTitle}</span>{!project && <small>{names.get(t.projectId)}</small>}</a></Menu>;
  return <div className="daybook"><div className="filters"><select aria-label="Filter by project" value={project} onChange={e => setProject(e.target.value)}><option value="">All projects</option>{[["Last 30 days",recent],["Earlier",earlier]].map(([label,items]) => {
    const list = items as typeof recent;
    return list.length > 0 && <optgroup key={String(label)} label={String(label)}>{list.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup>;
  })}</select><select aria-label="Sort threads" value={sort} onChange={e => setSort(e.target.value)}><option value="updated">Activity</option><option value="created">Created</option><option value="alpha">A–Z</option></select></div>
    <div className="days">{groups.map(g => <Group key={g.id} {...g} active={activeThreadId} row={renderRow}/>)}{!groups.length && <small>{state.status === "ready" ? "No threads here" : state.status === "loading" ? "Loading threads…" : "Threads unavailable"}</small>}</div><Quotas/></div>;
}

export default definePluginApp(app => app.slots.experimental_threadList({id:"days",title:"Daybook",description:"Threads across projects, grouped by day, with remaining quota and reset times.",component:Daybook}));
