# Snow-Domo 360 — Pipeline Observability for Snowflake + Domo

**A single-pane-of-glass observability dashboard that unifies Snowflake account telemetry with Domo pipeline metadata — built as a Domo custom app.**

Snow-Domo 360 gives data platform teams, FinOps practitioners, and executive stakeholders real-time visibility into cost efficiency, query performance, pipeline health, data quality, and AI-driven query optimization — all without leaving the Domo environment.

---

## The Problem

Organizations running Snowflake through Domo face a common blind spot: Snowflake's `ACCOUNT_USAGE` views and Domo's connector/DataFlow telemetry live in separate silos. Engineers toggle between Snowflake's query history UI and Domo's activity logs to answer straightforward questions:

- *"Which warehouse is burning credits with low utilization?"*
- *"Are our connector SLAs being met?"*
- *"Which queries could be rewritten for 50 %+ improvement?"*

Snow-Domo 360 eliminates that context-switching by joining both telemetry sources into a unified, interactive dashboard with seven purpose-built views and a persistent alerting system.

---

## Visual Tour

> **Note:** The screenshots below reflect dark-sidebar/light-content mode — the default theme. A full dark mode is also available via the sidebar toggle.

### Cost & Credits

Track Snowflake spend patterns and resource utilization at a glance. KPI cards show Total Spend, Daily Credits Avg, Active Warehouses, and a composite Efficiency Score. Below the hero row, a dual-axis **Credits and Cost Over Time** chart reveals when cost rises faster than credit consumption. A **Warehouse Cost Distribution** treemap and **Warehouse Utilization** bar chart provide per-warehouse context.

Further down, **Cost per Successful Row** normalizes spend against throughput, **Daily Credits by Service Type** exposes mix shifts (e.g., AI Services growing), and a **Top 10 Domo Datasets by Cost** table ranks the most expensive data assets by total USD.

| Metric | Description |
|--------|-------------|
| **Total Spend** | Aggregated USD cost over the selected period |
| **Daily Credits Avg** | Mean daily credit consumption with trend |
| **Active Warehouses** | Count of warehouses with activity |
| **Efficiency Score** | Credits consumed per 1 M rows, normalized to benchmark — lower is better |

### Performance & Reliability

Monitor query execution times and identify bottlenecks. The **bee-swarm scatter** (built with Observable Plot + D3) plots every query as an individually clickable dot — blue for fast, magenta for slow. Click any dot to open an inline details panel showing Query ID, execution time, query type, database, warehouse, and SQL text.

Below the swarm, a **P95 Query Duration Trend** line chart with an SLA threshold reference and a sortable **Slowest Connector Runs** table round out the view.

| Metric | Description |
|--------|-------------|
| **Avg Query Time** | Mean execution time across all query types |
| **Query Failure Rate** | Percentage of queries ending in error |
| **Warehouse Events** | Count of suspension / resumption events |
| **Load Efficiency** | Ratio of compute time to wall-clock time |

### Pipeline Health

Monitor data pipeline execution and freshness. The **Bytes Ingested & API Anomalies** chart overlays daily bytes with an API z-score band — values beyond ±2σ are shaded as anomalies. An **End-to-End Latency Heatmap** (dataset × day) helps spot chronic late feeds, while **Connector Success Rate** and **SLA Breaches Heatmap** break down reliability. Stale datasets get a clickable **Details** popout listing each one with hours since last refresh.

| Metric | Description |
|--------|-------------|
| **Connector Success** | % of connector runs completing without error |
| **SLA Breaches** | Count of connectors exceeding target latency |
| **Stale Datasets** | Datasets not refreshed within expected window (click for details) |
| **Daily Bytes (MB)** | Volume of data ingested per day |

### Adoption & Utilization

Analyze user adoption and platform utilization patterns. The flagship chart is the **Cost vs. Utilization Quadrant** — an interactive bubble chart that classifies each dataset into one of four quadrants:

| Quadrant | Meaning | Guidance |
|----------|---------|----------|
| **Rationalize** | High cost, low utilization | Consolidate, downsize, or deprecate |
| **Optimize & Scale** | High cost, high utilization | Tune schedules, consider auto-suspend |
| **Monitor** | Low cost, low utilization | Watch for growth before investing |
| **Best Value** | Low cost, high utilization | Keep schedules, modest scale-up if queues appear |

Hover any bubble for AI-generated **Why / Action / Watch** guidance.

| Metric | Description |
|--------|-------------|
| **Weekly Active Users** | Unique users executing queries in the trailing 7 days |
| **Active Datasets** | Datasets queried or refreshed in the period |
| **Active Connectors** | Connectors with at least one run |
| **Cost per User** | Total spend ÷ WAU — a unit-economics lens |

### Data Quality

Monitor data quality metrics, schema drift, and anomalies. The **Schema Drift → Null Regression Matrix** is a heatmap showing null-rate changes across columns from −7 to +2 days relative to a schema change event — letting you pinpoint which column adds, removes, or modifications caused regressions. A ranked **Lift (pp) vs. Baseline** table surfaces the largest percentage-point increases. **Coverage Anomalies** plots row-count z-scores across datasets, and a **Schema Drift Log** provides a filterable event timeline.

| Metric | Description |
|--------|-------------|
| **Data Completeness** | % of datasets with null rate below threshold |
| **Rule Violations** | Count of data accuracy rule violations |
| **Schema Changes** | Column adds / removes / modifies in trailing week |
| **Consistency Score** | Referential integrity check pass rate |
| **Orphan Rate** | Orphan rows as % of total — click for per-check breakdown |

### Data Lineage

A visual DAG (directed acyclic graph) traces data from source to derived datasets. Nodes are color-coded by domain:

| Domain | Color | Description |
|--------|-------|-------------|
| **Account Usage** | Blue | Snowflake system tables |
| **Domo Telemetry** | Light blue | Connector & DataFlow stats |
| **Business Systems** | Orange | Source data tables |
| **Derived / OBS** | Purple | Analytics & observability |
| **Optimizer** | Pink | Query performance tools |

Filter by domain, toggle Sources Only / Derived Only, and search by table name. Zoom, pan, and save/export the graph.

### AI Query Optimization

AI-powered query rewrite recommendations with side-by-side comparison. Each query card shows original vs. optimized SQL in syntax-highlighted Monaco editors, with an optional **Show Diff** toggle for unified diff highlighting. Per-query metrics include compilation time, execution time, total elapsed time, bytes scanned, improvement %, bytes saved, and estimated USD savings.

The view opens with summary KPI cards — **Total Queries Analyzed**, **Avg Improvement**, **Est. Credits Saved**, **Adoption Rate** — followed by a **Performance Distribution** histogram, **Action Breakdown** donut, and **Savings Timeline** area chart.

| Feature | Detail |
|---------|--------|
| **Side-by-side editors** | Monaco with custom dark theme, read-only, SQL syntax highlighting |
| **Diff view** | Toggle to see inline insertions (green) and deletions (red) |
| **Action classification** | ADOPT / BENCH_TEST / IGNORE per query |
| **Copy & Run Test** | One-click copy or simulated test execution |
| **Filters** | Min improvement %, sort by date / improvement / savings, full-text search |

### Alerting System

A persistent right-hand panel available on Performance, Adoption, and Cost views.

- **Created Alerts table** — user-defined alerts with name, severity, target datasets, and live status
- **Live Alerts feed** — real-time alert cards (Credit Usage Spike, Query Timeout, Failed Data Load, Security Alert, Storage Capacity Warning) with severity color-coding and timestamps
- **"NEW" badge treatment** — recently triggered alerts get a distinctive blue border + badge
- **+ New Alert modal** — create custom alerts with:
  - Manual SQL editor (Monaco) or AI-assisted SQL generation (powered by Cortex)
  - Dataset selector with search
  - Severity levels (Info / Warning / Critical)
  - Test, preview results, and deploy workflow
- **Recommendations section** — AI-generated operational suggestions (e.g., "High Cost Warehouse Detected")

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Domo Platform                         │
│                                                              │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────┐   │
│  │  Snowflake   │    │   Domo       │    │  Domo Custom   │   │
│  │  Account     │───▶│  Writeback   │───▶│   App (this)   │   │
│  │  Usage Views │    │  Connector   │    │                │   │
│  └─────────────┘    └──────────────┘    │  index.html    │   │
│                                         │  app.js        │   │
│  ┌─────────────┐    ┌──────────────┐    │  app.css       │   │
│  │  Domo       │    │  DataFlow /  │    │  manifest.json │   │
│  │  Connector  │───▶│  ETL Layer   │───▶│                │   │
│  │  Telemetry  │    │  (OBS_*)     │    └────────────────┘   │
│  └─────────────┘    └──────────────┘                         │
│                                                              │
│  ┌─────────────┐    ┌──────────────┐                         │
│  │  LLM Query  │    │  Query       │                         │
│  │  Optimizer   │───▶│  Rewrite     │                         │
│  │  (Claude)    │    │  Results DS  │                         │
│  └─────────────┘    └──────────────┘                         │
└──────────────────────────────────────────────────────────────┘
```

### Data Pipeline

| Layer | Source | Alias Pattern | Purpose |
|-------|--------|---------------|---------|
| **Account Usage** | `SNOWFLAKE.ACCOUNT_USAGE.*` | `OBS_QUERY_PERFORMANCE`, `OBS_CREDITS_BY_WAREHOUSE`, etc. | Credit consumption, query history, warehouse events |
| **Domo Telemetry** | Domo Activity Log, Connector API | `OBS_DOMO_CONNECTOR_HEALTH`, `OBS_DOMO_DAILY_BYTES`, etc. | Connector runs, SLA tracking, API z-scores |
| **Derived / OBS** | DataFlow transforms | `OBS_COST_PER_CREDIT`, `OBS_IDLE_ACTIVE_RATIO`, etc. | Aggregated observability metrics |
| **Optimizer** | LLM-powered rewrite engine | `QUERY_REWRITE_RESULTS` | AI query optimization recommendations |

### Tech Stack

| Component | Technology |
|-----------|-----------|
| **Runtime** | Domo Custom App (Brick) via `ryuu.js` SDK |
| **Charting** | [ApexCharts](https://apexcharts.com/) — line, area, bar, treemap, donut, heatmap |
| **Statistical Viz** | [Observable Plot](https://observablehq.com/plot/) + [D3.js](https://d3js.org/) — bee-swarm scatter, z-score bands |
| **Code Editor** | [Monaco Editor](https://microsoft.github.io/monaco-editor/) — SQL syntax highlighting, diff view |
| **Data Lineage** | D3.js force-directed graph with domain-based node coloring |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) + custom design system (`app.css`) |
| **Fonts** | Inter (UI), JetBrains Mono (code / metrics) |
| **AI Engine** | Claude (Anthropic) for query rewrite analysis; Cortex for alert SQL generation |

---

## Dataset Aliases & Manifest

The `manifest.json` declares 25 dataset bindings. When deploying to your Domo instance, replace the placeholder `dataSetId` values with your actual dataset IDs:

| Alias | Description |
|-------|-------------|
| `QUERYREWRITERESULTS` | AI query rewrite output with original SQL, optimized SQL, and performance deltas |
| `OBSOBJECTCREDITCOST` | Object-level credit attribution |
| `OBSDATAFLOWRUNS` | DataFlow execution history |
| `OBSDATASETCREDITCOST` | Per-dataset credit cost rollup |
| `OBSSNOWFLAKEWAU` | Weekly active users from Snowflake |
| `OBSDOMOAPIZSCORE` | API call volume with z-score anomaly detection |
| `OBSDOMODAILYBYTES` | Daily bytes ingested via Domo connectors |
| `OBSDOMODATAFRESHNESS` | Dataset freshness / staleness tracking |
| `OBSDOMOCONNECTORHEALTH` | Connector success rates |
| `OBSDOMOCONNECTORSLA` | Connector SLA compliance |
| `OBSDOMOCONNECTORRUNS` | Individual connector run records |
| `OBSWAREHOUSEEVENTS` | Warehouse suspend / resume events |
| `OBSQUERYFAILURERATE` | Query failure rate by warehouse / database |
| `OBSQUERYPERFORMANCE` | Query-level execution metrics |
| `OBSIDLEACTIVERATIO` | Warehouse idle vs. active time |
| `OBSCREDITSBYWAREHOUSE` | Daily credit usage by warehouse |
| `OBSCOSTPERCREDIT` | Cost per credit by service type |
| `OBSPIPELINETHROUGHPUT` | Rows/sec and bytes/sec throughput |
| `OBSRECORDFRESHNESS` | Record-level freshness tracking |
| `OBSDATACOVERAGE` | Row count anomalies with z-scores |
| `OBSDATACOMPLETENESS` | Column-level null percentages |
| `OBSDATAACCURACY` | Rule-based data validation results |
| `OBSDATACONSISTENCY` | Referential integrity checks |
| `OBSSCHEMADRIFT` | Schema change detection log |
| `OBSCOSTVSUTILIZATION` | Cost vs. utilization quadrant data |

---

## Getting Started

### Prerequisites

- A [Domo](https://www.domo.com/) instance with the Custom Apps (Bricks) feature enabled
- A Snowflake account with `ACCOUNT_USAGE` access granted to the Domo service role
- The observability datasets (listed above) created and populated via DataFlows or connectors

### Deployment

1. **Clone this repo:**
   ```bash
   git clone https://github.com/cassidythilton/domo-snowflake-360.git
   cd domo-snowflake-360
   ```

2. **Update `manifest.json`:**
   Replace placeholder dataset IDs with your actual Domo dataset IDs for each alias.

3. **Publish to Domo:**
   Use the [Domo CLI](https://developer.domo.com/portal/1xve14v7nkj2c-command-line-interface) or the App Studio to upload:
   ```bash
   domo login
   domo publish
   ```

4. **Configure filters:**
   The dashboard supports global filtering by time period (30 / 60 / 90 / 180 days), warehouse, database, and schema — all via the header controls.

### Mock Data Mode

The app ships with a comprehensive mock data generator for demos and development. Toggle between **Mock Data** and **Live** mode using the switch in the sidebar footer. Mock mode generates realistic data distributions including:

- Exponential query-time distributions
- Seasonal patterns in credit usage
- Z-score anomalies for pipeline monitoring
- Randomized schema drift events correlated with null-rate regressions
- Synthetic cost-vs.-utilization quadrant data with AI-generated guidance

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Single HTML / JS / CSS app** | Domo Bricks run in a sandboxed iframe — no build step, no bundler, minimal deployment friction |
| **Mock-first development** | Every chart works offline with statistically realistic synthetic data; flip to live with one click |
| **Monaco Editor for SQL** | Matches the mental model of analysts accustomed to VS Code or Snowsight |
| **Bee-swarm over histogram** | Preserves individual query identity; click any dot to inspect query ID, SQL text, warehouse, and timing |
| **Quadrant chart for Cost vs. Utilization** | Enables instant triage — Rationalize · Optimize & Scale · Monitor · Best Value — with AI-generated Why / Action / Watch guidance per bubble |
| **Alerting as a first-class panel** | Persistent sidebar keeps operational awareness without obscuring analysis |
| **Dark mode** | Full theme toggle with CSS custom properties; respects analyst preference for low-light environments |
| **SRI hashes on Domo SDK** | The `ryuu.js` script tag includes a `sha384` integrity attribute to guard against CDN tampering |

---

## File Structure

```
├── index.html         # Main HTML shell — navigation, tab containers, metric cards, chart placeholders
├── app.js             # Dashboard class — data generation, live data loading, chart rendering, alerting
├── app.css            # Design system — metric cards, code editors, alerts, tooltips, responsive layout
├── manifest.json      # Domo app manifest — dataset bindings and app metadata
├── thumbnail.png      # App store thumbnail
└── README.md          # This file
```

---

## Security & Privacy Notes

- **No credentials or secrets** are stored in this repository
- All dataset IDs in `manifest.json` are **placeholders** (`00000000-…`) — replace with your environment-specific IDs before deployment
- Mock email addresses use `@example.com` domains
- SQL templates in the query optimization module use **generic sample identifiers**
- No real Snowflake account names, warehouse names, or internal schema references are present
- The app runs entirely within Domo's sandboxed iframe — no external API calls beyond CDN-hosted libraries (Tailwind, ApexCharts, D3, Monaco, Observable Plot)
- The Domo SDK (`ryuu.js`) is loaded with [Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity) (SRI) to prevent supply-chain attacks
- `localStorage` stores only the theme preference (`light` / `dark`); no sensitive data is persisted client-side

---

## License

This project is provided as-is for demonstration and reference purposes. See your Domo license agreement for terms governing Custom App deployment.

---

*Built with Domo Bricks, Snowflake Account Usage, ApexCharts, D3.js, Observable Plot, and Monaco Editor.*
