"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon, I, SectionHeader } from "@/components/primitives";
import { api, ApiError } from "@/lib/api";
import type { WebInquiry, WebOverview, WebSeries } from "@/lib/types";
import { AreaChart, Donut } from "@/components/website/charts";
import { Banner, Chip, Empty, KpiCard, Loading, PageHeader, SITE_URL, STATUS_COLOR, TableHead, pageStyle, rowStyle } from "@/components/website/ui";

const fmt = (v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(1)}K` : v.toLocaleString());
const trend = (t: number) => (t === 0 ? "—" : `${t > 0 ? "+" : ""}${t}% MoM`);

export default function WebsiteOverviewPage() {
  const [overview, setOverview] = useState<WebOverview | null>(null);
  const [series, setSeries] = useState<WebSeries | null>(null);
  const [inquiries, setInquiries] = useState<WebInquiry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.website.analytics.overview(), api.website.analytics.series(), api.website.inquiries.list()])
      .then(([o, s, q]) => {
        setOverview(o);
        setSeries(s);
        setInquiries(q);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not load website data"));
  }, []);

  const totalVisitors = overview?.visitors.reduce((a, b) => a + b, 0) ?? 0;
  const totalInquiries = overview?.inquiries.reduce((a, b) => a + b, 0) ?? 0;
  const newInquiries = inquiries.filter((q) => q.status === "New").length;

  return (
    <div style={pageStyle}>
      <PageHeader
        title="Website"
        meta={newInquiries ? `${newInquiries} new ${newInquiries === 1 ? "inquiry" : "inquiries"}` : "silifton.com"}
        actions={
          <>
            <a className="btn" href={SITE_URL} target="_blank" rel="noreferrer"><Icon d={I.globe} size={12} /> Open site</a>
            <Link className="btn" href="/website/content"><Icon d={I.edit} size={12} /> Edit content</Link>
            <Link className="btn btn-primary" href="/website/inquiries"><Icon d={I.mail} size={12} /> Inbox</Link>
          </>
        }
      />

      {error && <Banner onClose={() => setError(null)}>{error}</Banner>}
      {!overview || !series ? (
        <Loading label="Loading analytics…" />
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            {overview.kpis.map((k) => (
              <KpiCard key={k.label} label={k.label} value={fmt(k.value)} sub={trend(k.trend)} color={k.color} spark={k.spark} />
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 16 }}>
            <div className="surface" style={{ padding: "16px 18px" }}>
              <SectionHeader
                title="Traffic · 12 months"
                subtitle={`${fmt(totalVisitors)} unique visitors · ${totalInquiries} inquiries`}
                action={
                  <span style={{ display: "flex", gap: 14, fontSize: 11.5, color: "var(--text-dim)" }}>
                    <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "var(--accent)", marginRight: 6 }} />Visitors</span>
                    <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "#4F7BE6", marginRight: 6 }} />Inquiries</span>
                  </span>
                }
              />
              <div style={{ marginTop: 14 }}>
                <AreaChart series={[{ values: overview.visitors, color: "var(--accent)" }, { values: overview.inquiries, color: "#4F7BE6" }]} labels={overview.months} height={240} />
              </div>
            </div>

            <div className="surface" style={{ padding: "16px 18px" }}>
              <SectionHeader title="Traffic sources" subtitle="Last 30 days" />
              <div style={{ display: "flex", justifyContent: "center", margin: "14px 0", position: "relative" }}>
                <Donut data={overview.sources.some((s) => s.value > 0) ? overview.sources : [{ label: "No data", value: 100, color: "var(--surface-hi)" }]} size={170} />
                <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", fontFamily: "'Inter Tight', sans-serif" }}>{fmt(series.uniquesLast30)}</div>
                    <div className="mono" style={{ fontSize: 9.5, color: "var(--text-dim)", letterSpacing: 1, textTransform: "uppercase" }}>visitors</div>
                  </div>
                </div>
              </div>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                {overview.sources.every((s) => s.value === 0) ? (
                  <div style={{ fontSize: 12, color: "var(--text-dim)", textAlign: "center", padding: "8px 0" }}>No traffic recorded yet. The tracker is live on the public site.</div>
                ) : (
                  overview.sources.map((s) => (
                    <div key={s.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 12.5 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--text)" }}><span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />{s.label}</span>
                      <span className="mono" style={{ color: "var(--text-sub)" }}>{s.value}%</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <KpiCard label="Page views · 30d" value={fmt(series.totalLast30)} sub={`${series.uniquesLast30.toLocaleString()} uniques`} color="#4F7BE6" icon={<Icon d={I.eye} size={12} />} />
            <KpiCard label="Pages / visitor" value={series.avgPagesPerVisitor ? series.avgPagesPerVisitor.toFixed(1) : "—"} sub="last 30 days" color="#F5A524" icon={<Icon d={I.layers} size={12} />} />
            <KpiCard label="Bounce rate" value={series.bounceRate ? `${series.bounceRate.toFixed(1)}%` : "—"} sub="single-page visits" color="#C792EA" icon={<Icon d={I.trend} size={12} />} />
            <KpiCard label="Open inquiries" value={inquiries.filter((q) => !["Won", "Closed"].includes(q.status)).length} sub={`${newInquiries} new`} color="var(--accent)" icon={<Icon d={I.mail} size={12} />} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)", gap: 16 }}>
            <div className="surface" style={{ overflow: "hidden" }}>
              <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)" }}>
                <SectionHeader title="Latest inquiries" action={<Link href="/website/inquiries" className="btn btn-ghost" style={{ fontSize: 12 }}>View all <Icon d={I.arrow} size={11} /></Link>} />
              </div>
              <TableHead cols={["ID", "From", "Status", "Date"]} template="90px 1fr 100px 90px" />
              {inquiries.length === 0 ? (
                <Empty>No inquiries yet.</Empty>
              ) : (
                inquiries.slice(0, 6).map((q, i) => (
                  <Link key={q.id} href="/website/inquiries" className="rt-row" style={{ ...rowStyle("90px 1fr 100px 90px", i === 0), textDecoration: "none" }}>
                    <span className="mono" data-label="ID" style={{ fontSize: 11.5, color: "var(--accent-soft)" }}>{q.id}</span>
                    <div data-label="From" style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{q.name} <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>· {q.company}</span></div>
                      <div style={{ fontSize: 11.5, color: "var(--text-dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{q.subject}</div>
                    </div>
                    <div data-label="Status"><Chip label={q.status} color={STATUS_COLOR[q.status]} /></div>
                    <span className="mono" data-label="Date" style={{ fontSize: 11, color: "var(--text-dim)" }}>{q.date.slice(0, 10)}</span>
                  </Link>
                ))
              )}
            </div>

            <div className="surface" style={{ padding: "16px 18px" }}>
              <SectionHeader title="Activity" subtitle="Recent changes on the site" />
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column" }}>
                {overview.activity.length === 0 ? (
                  <Empty>No recent activity.</Empty>
                ) : (
                  overview.activity.map((a, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderTop: i ? "1px solid var(--border)" : "none" }}>
                      <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--accent)", marginTop: 6, flexShrink: 0, boxShadow: "0 0 6px var(--accent)" }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, color: "var(--text-sub)" }}><span style={{ color: "var(--text)", fontWeight: 500 }}>{a.who}</span> {a.action} <span style={{ color: "var(--text)" }}>{a.target}</span></div>
                        <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>{a.time}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
            <div className="surface" style={{ overflow: "hidden" }}>
              <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)" }}><SectionHeader title="Top pages" subtitle="Last 30 days" /></div>
              <TableHead cols={["Path", "Views", "Uniques"]} template="1fr 70px 70px" />
              {series.topPages.length === 0 ? <Empty>No page views in the last 30 days.</Empty> : series.topPages.map((p, i) => (
                <div key={p.path} className="rt-row" style={rowStyle("1fr 70px 70px", i === 0)}>
                  <span className="mono" data-label="Path" style={{ fontSize: 12, color: "var(--accent-soft)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.path}</span>
                  <span className="mono" data-label="Views" style={{ fontSize: 12, color: "var(--text)" }}>{p.views.toLocaleString()}</span>
                  <span className="mono" data-label="Uniques" style={{ fontSize: 12, color: "var(--text-sub)" }}>{p.uniques.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="surface" style={{ overflow: "hidden" }}>
              <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)" }}><SectionHeader title="Top referrers" subtitle="Last 30 days" /></div>
              <TableHead cols={["Source", "Sessions", "Bucket"]} template="1fr 80px 90px" />
              {series.topReferrers.length === 0 ? <Empty>No referred traffic yet — direct visits aren’t listed here.</Empty> : series.topReferrers.map((r, i) => (
                <div key={r.referrer} className="rt-row" style={rowStyle("1fr 80px 90px", i === 0)}>
                  <span data-label="Source" style={{ fontSize: 12.5, color: "var(--text)", wordBreak: "break-all" }}>{r.referrer}</span>
                  <span className="mono" data-label="Sessions" style={{ fontSize: 12, color: "var(--text)" }}>{r.sessions.toLocaleString()}</span>
                  <div data-label="Bucket"><Chip label={r.source} /></div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
