// Seed content for the public website collections. Mirrors what the original
// NestJS backend seeded so a fresh database still renders a complete site.
// Only inserted when a collection is empty — never overwrites admin edits.

export const SEED_SERVICES = [
  { num: "01", title: "Product Engineering", desc: "Multi-disciplinary squads embedded with your team to ship complex software from zero to scale.", icon: "cpu", tags: ["React", "Next.js", "Node", "Go"] },
  { num: "02", title: "Cloud & Platform", desc: "Production-grade infrastructure on AWS, GCP and Azure. Observability, security, and FinOps baked in.", icon: "cloud", tags: ["Kubernetes", "Terraform", "AWS"] },
  { num: "03", title: "AI & Data", desc: "RAG pipelines, model fine-tuning, evals and data platforms that turn proprietary data into product moat.", icon: "bolt", tags: ["LLMs", "Vector DBs", "Evals"] },
  { num: "04", title: "Mobile Engineering", desc: "Native iOS, Android and cross-platform apps with sub-second cold starts and offline-first design.", icon: "phone", tags: ["Swift", "Kotlin", "RN"] },
  { num: "05", title: "Design & Research", desc: "Editorial-grade brand systems, design ops, and user research that compounds with every release.", icon: "brush", tags: ["Figma", "Tokens", "A/B"] },
  { num: "06", title: "Staff Augmentation", desc: "Senior engineers and designers integrated into your roadmap. No middlemen, no warm bodies.", icon: "users", tags: ["Senior+", "Dedicated"] },
];

// PLACEHOLDER content — invented for the design demo. Cover images
// are royalty-free Unsplash photos. Replace via /admin or edit here.
export const SEED_PORTFOLIO = [
  {
    id: "case-01", client: "Helix Bank", industry: "Fintech",
    title: "Replatformed core onto event-driven Kotlin services",
    year: 2025, span: 8, status: "Live", thumb: "H", color: "#3DDC9A",
    metric: "$1.2B daily volume",
    image: "/portfolio/case-01-fintech.jpg",
    summary: "A nine-month replatform of a 12-year-old monolith onto event-driven Kotlin services, completed with zero customer-visible downtime.",
    body:
      "Helix Bank's core banking system processed $1.2B in daily settlement traffic on a Java monolith first shipped in 2013. Every release required a six-hour maintenance window, and new market expansions were being blocked on the platform's inability to handle multi-currency reconciliation in real time.\n\n" +
      "We embedded a squad of six — two staff engineers, an SRE, a domain modeller, and two product designers — alongside Helix's existing platform team. The first month was discovery: shadowing operations, mapping every event a transaction touched, and stress-testing the assumptions baked into the original schema.\n\n" +
      "From month two we built outward from the most-painful boundary (the settlement engine) into event-driven Kotlin services running on Kubernetes with Kafka as the spine. Each new service launched behind a feature flag, with the monolith kept as the source of truth until parity was proven by a 30-day shadow-run.\n\n" +
      "Outcome: P99 latency on settlement fell 68%, the team now ships to production five times a week, and Helix expanded into three new currencies in the quarter following cutover — the first market expansion in four years that didn't require a platform freeze.",
  },
  {
    id: "case-02", client: "Verde Health", industry: "Healthtech",
    title: "HIPAA-grade telemedicine for 14M patients",
    year: 2025, span: 4, status: "Live", thumb: "V", color: "#4F7BE6",
    metric: "14M patients",
    image: "/portfolio/case-02-healthtech.jpg",
    summary: "End-to-end telemedicine platform handling 14M patients across 200 clinics, with HIPAA-grade encryption and a sub-second clinician handoff.",
    body:
      "Verde Health was running three different patient portals across their acquired clinics — none of them HIPAA-compliant in the way the 2024 audit cycle required. The remediation work alone would have taken eighteen months. They asked us to ship a replacement instead.\n\n" +
      "We delivered an end-to-end telemedicine platform in seven months: patient onboarding, video consultation, clinician handoff, prescription writing, and post-visit charting — all flowing through a single record. Encryption is end-to-end at the application layer (so even our infrastructure operators can't read consultation notes), and every action against a patient record is signed and logged.\n\n" +
      "The clinician UI was designed in close partnership with the medical staff: every screen tested against the rule that a senior doctor under load should never need more than two clicks to reach the next patient.\n\n" +
      "At rollout 14M patient records migrated from the legacy portals over a single weekend. Compliance signed off without conditions; clinician NPS on the new tool sits at +71.",
  },
  {
    id: "case-03", client: "Atlas Logistics", industry: "Supply chain",
    title: "Real-time fleet observability across 24 countries",
    year: 2024, span: 4, status: "Live", thumb: "A", color: "#F5A524",
    metric: "24 countries",
    image: "/portfolio/case-03-logistics.jpg",
    summary: "Real-time observability over Atlas's 18,000-vehicle fleet across 24 countries, with sub-second sensor lag and ML anomaly detection.",
    body:
      "Atlas operates 18,000 commercial vehicles across 24 countries, but the legacy GPS provider had a 4-minute median latency between sensor reading and dashboard pixel. For perishable cargo and just-in-time deliveries that's a half-day's worth of preventable spoilage every week.\n\n" +
      "We built a streaming pipeline on top of MQTT and Apache Flink that brought median latency to 800ms and tail latency under five seconds — across every region with reliable cellular coverage. The dashboard was rewritten as a real-time map with vehicle, route, and cargo telemetry layered on demand.\n\n" +
      "An ML anomaly detector flags trucks deviating from their expected route, temperature envelope, or stop schedule before a dispatcher would manually catch it. Atlas reports the system pays for itself in claims-avoidance every fortnight.",
  },
  {
    id: "case-04", client: "Northwind Energy", industry: "Energy",
    title: "ML pipeline cutting grid forecasting error by 38%",
    year: 2024, span: 4, status: "Live", thumb: "N", color: "#C792EA",
    metric: "−38% error",
    image: "/portfolio/case-04-energy.jpg",
    summary: "Production ML pipeline that cut Northwind's 24-hour wind and solar generation forecast error by 38%, shifting the cost-of-service math.",
    body:
      "Northwind manages a 4.2 GW renewable portfolio across the North Sea and central Europe. Their existing 24-hour generation forecast — used to bid into day-ahead energy markets — sat at 11% mean absolute error. Every percentage point of that error cost real money in over- and under-procured backup capacity.\n\n" +
      "We built an ensemble forecasting pipeline combining numerical weather models with three years of asset-level telemetry. The pipeline runs hourly, retrains weekly, and now sits at 6.8% MAE — a 38% improvement.\n\n" +
      "Just as important as the model itself: a small evaluation harness Northwind's quant team uses to A/B test new features before they touch the production bid. The team has shipped four model improvements without our help since the engagement closed.",
  },
  {
    id: "case-05", client: "Loom Studio", industry: "Media",
    title: "Editorial CMS used by 400+ newsrooms",
    year: 2024, span: 4, status: "Live", thumb: "L", color: "#3DDC9A",
    metric: "400+ rooms",
    image: "/portfolio/case-05-media.jpg",
    summary: "Editorial CMS rebuilt from scratch — now powering 400+ newsrooms with collaborative editing, AI-assisted research, and one-click syndication.",
    body:
      "Loom's CMS had grown organically over a decade and was groaning under the weight of 400+ newsrooms hosting daily editorial workflows on it. Every desk had a different workaround for collaborative editing; AI-assisted research lived in a separate tool no one trusted.\n\n" +
      "We rebuilt the editor on a CRDT foundation (so two journalists can type into the same paragraph without losing edits), integrated a research sidecar that pulls source corroboration in-context, and shipped a syndication API that lets a publisher push the same story to 12 outlets with one click.\n\n" +
      "Rollout was staged room-by-room over four months. Adoption hit 92% by week six; the average story now takes 23% less time from pitch to publish.",
  },
];

export const SEED_TEAM = [
  { name: "Mehedi Hasan", role: "Chief Executive", initials: "MH", focus: "Strategy, Partnerships" },
  { name: "Zaman Sheikh", role: "Chief Technology Officer", initials: "ZS", focus: "Architecture, Platform" },
  { name: "Aria Mahmud", role: "Head of Design", initials: "AM", focus: "Brand, Research" },
  { name: "Tahsin Rahman", role: "VP, Engineering", initials: "TR", focus: "Mobile, Backend" },
  { name: "Sadia Karim", role: "Head of AI", initials: "SK", focus: "ML, Data" },
  { name: "Junaid Ali", role: "Director of Operations", initials: "JA", focus: "Delivery, PMO" },
];

// PLACEHOLDER bodies — written as design demo. Replace via /admin or here.
export const SEED_POSTS = [
  {
    id: "p-01", title: "What we learned shipping 14 RAG systems to production",
    author: "Sadia Karim", date: "May 12, 2026", read: "9 min",
    category: "Engineering", status: "Published", views: 12480,
    excerpt: "Fourteen production RAG systems later, the bugs that surprised us most weren't in the retrieval — they were in the eval layer we kept telling ourselves we'd fix later.",
    body:
      "We have shipped 14 retrieval-augmented generation systems to production over the last two years — different domains, different scales, different models. The patterns we keep tripping over have very little to do with retrieval quality.\n\n" +
      "The eval problem. Every team starts with 'we'll add evals later'. Every team eventually has a Slack thread three weeks before launch arguing about whether a hallucination is a regression. We now refuse to ship a RAG system without a labelled eval set on day one. It's the cheapest insurance we know.\n\n" +
      "Context-window economics. The reflex 'just put more in context' has cost more than one client real money. Above 8k tokens, recall starts to degrade on most models — and your bill grows linearly. A reranker is almost always cheaper than a bigger window.\n\n" +
      "The retrieval bug that wasn't. Three of our last five 'retrieval bugs' turned out to be chunking bugs in disguise. If your documents have semantic boundaries (sections, FAQ items, function definitions), align your chunks to them. Sliding-window chunking is fine for prose, terrible for structured text.",
  },
  {
    id: "p-02", title: "Designing for trust: how we approached HIPAA-grade UX",
    author: "Aria Mahmud", date: "May 04, 2026", read: "6 min",
    category: "Design", status: "Published", views: 8210,
    excerpt: "HIPAA compliance is usually treated as a checklist. We treated it as a design constraint and it changed every screen.",
    body:
      "When we started on the Verde Health telemedicine platform, every conversation about HIPAA was about audit logs and at-rest encryption. Those matter, but they aren't what patients see. What patients see is the moment a clinician asks them to share something personal — and the platform has to either earn or break trust in that moment.\n\n" +
      "Three rules we wrote down early and kept referring to:\n\n" +
      "1. Show what's being recorded, while it's being recorded. A small persistent indicator wins over a one-time consent screen every time.\n\n" +
      "2. Make 'delete' really delete — and say so. The legal team flinched at the first draft. We pushed back. The button now reads 'Delete this visit permanently' and it does what it says.\n\n" +
      "3. Never bury who can see what. On every patient record there's a single line listing exactly which roles can read the page. It's not a popup, it's not a tooltip. It's right there at the top.\n\n" +
      "None of these are 'compliance' in the audit sense. All of them moved clinician NPS up.",
  },
  {
    id: "p-03", title: "Inside our 4-day delivery cadence",
    author: "Junaid Ali", date: "Apr 28, 2026", read: "5 min",
    category: "Culture", status: "Published", views: 5912,
    excerpt: "Most studios call themselves agile. We do something more specific — a 4-day cadence with a fixed Friday review. It's boring on purpose.",
    body:
      "Every engagement we run ships a measurable thing every four working days. Monday is scoping. Tuesday and Wednesday are build. Thursday morning is integration. Thursday afternoon is the demo with the client. Friday morning is the retro. Friday afternoon is rest.\n\n" +
      "Why four and not two-week sprints? Two reasons. First, it forces small slices — anything that doesn't fit in four days has to be cut. That's a healthy pressure. Second, the cadence is short enough that a stalled engagement becomes visible inside one cycle instead of three.\n\n" +
      "What we don't do: nightly standups, sprint planning meetings, story-point estimation. The cadence is the structure. Within it, the squad self-organises.",
  },
  {
    id: "p-04", title: "Why we built our own internal evals harness",
    author: "Sadia Karim", date: "Apr 17, 2026", read: "11 min",
    category: "Engineering", status: "Published", views: 14302,
    excerpt: "We tried four off-the-shelf eval frameworks before building our own. The one we kept does three things — none of them flashy.",
    body:
      "Off-the-shelf eval frameworks have a recurring problem: they're built around generic benchmarks. We needed something built around our clients' definition of correctness, which is rarely 'matches a reference answer'.\n\n" +
      "What our harness does:\n\n" +
      "1. Stores eval cases as plain markdown files in the repo, with the expected behaviour as a paragraph not a string. A judge model (a separate prompt, frozen) decides pass/fail.\n\n" +
      "2. Runs nightly against main and posts a diff to Slack. If a metric drops more than 2%, the PR that caused it gets flagged.\n\n" +
      "3. Lets a domain expert mark a case as 'still failing but it's OK now' — with a written justification stored next to the case. The team can't grade their own homework, but they can document a decision.\n\n" +
      "The full source is on our GitHub.",
  },
  {
    id: "p-05", title: "From contract to commit: how engagements actually start",
    author: "Mehedi Hasan", date: "Apr 02, 2026", read: "7 min",
    category: "Operations", status: "Published", views: 3408,
    excerpt: "The two weeks between 'we'd like to work with you' and the first git commit do more for the engagement than any onboarding doc.",
    body:
      "We've optimised the first two weeks of every engagement until they barely look like a setup phase.\n\n" +
      "Day 1: contract signed in the morning, the squad joins the client Slack in the afternoon. By end-of-day they have read access to the relevant repos and one open architecture question pinned in the channel.\n\n" +
      "Day 3: the squad has shadowed one production incident or one customer support call. This is non-negotiable. You can't help build a system you've only seen on slides.\n\n" +
      "Day 7: written diagnosis delivered. Three pages, in plain language. Even clients who decide not to engage further get this — it's the deliverable for the discovery phase regardless.\n\n" +
      "Day 14: first commit to production. By then the squad has earned the right to make it.",
  },
  {
    id: "p-06", title: "Field notes from rewiring a 12-year-old monolith",
    author: "Zaman Sheikh", date: "Mar 21, 2026", read: "14 min",
    category: "Engineering", status: "Draft", views: 0,
    excerpt: "What we did, what we'd do again, and the one decision we'd reverse.",
    body:
      "(Draft — published once the engagement closes.) A retrospective on the Helix Bank platform migration, what surprised us, the architectural decisions we'd repeat, and the one decision that we'd reverse if we ran the project again.",
  },
];

export const SEED_CAREERS = [
  { id: "j-01", title: "Senior Platform Engineer", team: "Platform", location: "Remote (GMT+0 to GMT+6)", type: "Full-time", level: "Senior", posted: "3d ago", status: "Open", applicants: 28 },
  { id: "j-02", title: "Staff Frontend Engineer", team: "Product", location: "Hybrid · Dhaka", type: "Full-time", level: "Staff", posted: "1w ago", status: "Open", applicants: 41 },
  { id: "j-03", title: "ML Engineer, Applied", team: "AI", location: "Remote (Global)", type: "Full-time", level: "Senior", posted: "1w ago", status: "Open", applicants: 64 },
  { id: "j-04", title: "Lead Product Designer", team: "Design", location: "Hybrid · Dhaka", type: "Full-time", level: "Lead", posted: "2w ago", status: "Open", applicants: 22 },
  { id: "j-05", title: "Engineering Manager, Mobile", team: "Mobile", location: "Remote (GMT+0 to GMT+6)", type: "Full-time", level: "Manager", posted: "3w ago", status: "Open", applicants: 17 },
  { id: "j-06", title: "DevRel Engineer", team: "Marketing", location: "Remote (Global)", type: "Contract", level: "Mid", posted: "4w ago", status: "Closed", applicants: 51 },
];

export const SEED_INQUIRIES = [
  { id: "INQ-2418", name: "Daniel Okafor", company: "Meridian Capital", email: "d.okafor@meridiancap.com", subject: "Replatforming our trading interface", budget: "$250k–$500k", message: "We need a partner to rebuild our trading floor.", date: "2026-05-16T14:32:00Z", status: "New", priority: "High" },
  { id: "INQ-2417", name: "Priya Iyer", company: "Stellar Health", email: "priya@stellarhealth.io", subject: "HIPAA migration audit", budget: "$100k–$250k", message: "Audit and migration help.", date: "2026-05-16T09:14:00Z", status: "New", priority: "Medium" },
  { id: "INQ-2416", name: "Mateo Reyes", company: "Voltflow", email: "mateo@voltflow.com", subject: "AI pricing optimization", budget: "$50k–$100k", message: "Pricing model build.", date: "2026-05-15T17:48:00Z", status: "In review", priority: "Medium" },
  { id: "INQ-2415", name: "Hana Sato", company: "Origami Labs", email: "hana.sato@origami.jp", subject: "iOS app rebuild — quote needed", budget: "$100k–$250k", message: "Full iOS rebuild.", date: "2026-05-15T11:02:00Z", status: "Replied", priority: "High" },
  { id: "INQ-2414", name: "Wren Beaumont", company: "Loom Studio", email: "wren@loomstudio.co", subject: "Renewal + new module", budget: "$500k+", message: "Renewal discussion.", date: "2026-05-14T16:21:00Z", status: "Replied", priority: "Critical" },
  { id: "INQ-2413", name: "Yusuf Adekunle", company: "Atlas Logistics", email: "y.adekunle@atlas-log.com", subject: "Q3 capacity request", budget: "$250k–$500k", message: "Q3 staffing.", date: "2026-05-13T08:55:00Z", status: "Won", priority: "High" },
  { id: "INQ-2412", name: "Lina Marchetti", company: "Forte Retail", email: "lina@forte.co", subject: "POS integration consult", budget: "$50k–$100k", message: "POS work.", date: "2026-05-12T13:08:00Z", status: "Closed", priority: "Low" },
];

export const SEED_APPLICATIONS = [
  { id: "APP-1042", candidate: "Sara Chen", role: "Senior Platform Engineer", stage: "Onsite", score: 92, date: "2026-05-16", source: "Referral", email: "sara@example.com" },
  { id: "APP-1041", candidate: "Marcus Bell", role: "Staff Frontend Engineer", stage: "Tech screen", score: 88, date: "2026-05-16", source: "Careers page", email: "marcus@example.com" },
  { id: "APP-1040", candidate: "Adaeze Nnamani", role: "ML Engineer, Applied", stage: "Offer", score: 95, date: "2026-05-15", source: "Recruiter", email: "adaeze@example.com" },
  { id: "APP-1039", candidate: "Tomás Ribeiro", role: "Lead Product Designer", stage: "Portfolio review", score: 81, date: "2026-05-15", source: "Careers page", email: "tomas@example.com" },
  { id: "APP-1038", candidate: "Iris Park", role: "Engineering Manager, Mobile", stage: "Hiring manager", score: 84, date: "2026-05-14", source: "LinkedIn", email: "iris@example.com" },
  { id: "APP-1037", candidate: "Felix Wagner", role: "ML Engineer, Applied", stage: "Rejected", score: 62, date: "2026-05-14", source: "Careers page", email: "felix@example.com" },
  { id: "APP-1036", candidate: "Noor Al-Sabah", role: "Senior Platform Engineer", stage: "Tech screen", score: 79, date: "2026-05-13", source: "Referral", email: "noor@example.com" },
];

export const SEED_TESTIMONIALS = [
  { id: "t-01", quote: "Silifton rebuilt our core trading platform in nine months. The team operates more like a partner than a vendor.", author: "Daniel Okafor", role: "CTO, Meridian Capital", featured: true },
  { id: "t-02", quote: "Their AI team shipped an evals harness that finally let us release with confidence. Production hallucinations dropped 84%.", author: "Priya Iyer", role: "VP Engineering, Stellar Health", featured: true },
  { id: "t-03", quote: "The most senior bench we've worked with. No warm bodies, every engineer pulls their weight from day one.", author: "Wren Beaumont", role: "Head of Product, Loom Studio", featured: false },
  { id: "t-04", quote: "They replaced a 14-person consultancy with a 4-person squad and we shipped three times faster.", author: "Hana Sato", role: "Founder, Origami Labs", featured: true },
];

