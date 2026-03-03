# Snow-Domo 360

> **Pipeline Observability for Snowflake + Domo.** A single-pane-of-glass dashboard that unifies Snowflake account telemetry with Domo pipeline metadata — giving data platform teams, FinOps practitioners, and executive stakeholders real-time visibility into cost, performance, pipeline health, data quality, and AI-driven query optimization without leaving Domo.

![version](https://img.shields.io/badge/version-0.0.2-brightgreen)
![platform](https://img.shields.io/badge/platform-Domo_Custom_App-0D1117?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIi8+PC9zdmc+)
![Snowflake](https://img.shields.io/badge/Snowflake-Account_Usage-29B5E8?logo=snowflake&logoColor=white)
![Claude AI](https://img.shields.io/badge/Claude_AI-Anthropic-cc785c?logo=anthropic&logoColor=white)
![ApexCharts](https://img.shields.io/badge/ApexCharts-3.42-00E396?logo=apachecharts&logoColor=white)
![D3.js](https://img.shields.io/badge/D3.js-7.8-F9A03C?logo=d3dotjs&logoColor=white)
![Observable Plot](https://img.shields.io/badge/Observable_Plot-0.6-3b5fc0)
![Monaco Editor](https://img.shields.io/badge/Monaco_Editor-0.34-007ACC?logo=visualstudiocode&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-2.2-06B6D4?logo=tailwindcss&logoColor=white)
![Datasets](https://img.shields.io/badge/datasets-25_bindings-8B5CF6)
![Dashboard Views](https://img.shields.io/badge/views-7_tabs-E11D48)

---

## Table of Contents

1. [The Problem](#-the-problem)
2. [Visual Tour](#-visual-tour)
3. [Architecture](#-architecture)
4. [Tech Stack](#-tech-stack)
5. [Dataset Aliases & Manifest](#-dataset-aliases--manifest)
6. [Getting Started](#-getting-started)
7. [Key Design Decisions](#-key-design-decisions)
8. [File Structure](#-file-structure)
9. [Security & Privacy](#-security--privacy)
10. [License](#-license)

---

## 🎯 The Problem

Organizations running Snowflake through Domo face a common blind spot: Snowflake's `ACCOUNT_USAGE` views and Domo's connector/DataFlow telemetry live in **separate silos**. Engineers toggle between Snowflake's query history UI and Domo's activity logs to answer straightforward questions:

- *"Which warehouse is burning credits with low utilization?"*
- *"Are our connector SLAs being met?"*
- *"Which queries could be rewritten for 50%+ improvement?"*

Snow-Domo 360 eliminates that context-switching by joining both telemetry sources into a unified, interactive dashboard with **seven purpose-built views** and a **persistent alerting system**.

---

## 📸 Visual Tour

> [!NOTE]
> Screenshots reflect the default dark-sidebar / light-content theme. A full dark mode is available via the sidebar toggle.

<br>

### 💰 Cost & Credits

Track Snowflake spend patterns and resource utilization at a glance. KPI cards show **Total Spend**, **Daily Credits Avg**, **Active Warehouses**, and a composite **Efficiency Score**. A dual-axis *Credits and Cost Over Time* chart reveals when cost rises faster than credit consumption. The *Warehouse Cost Distribution* treemap and *Warehouse Utilization* bar chart provide per-warehouse context.

![Cost & Credits — KPI cards, Credits and Cost Over Time dual-axis chart, Warehouse Cost Distribution treemap, and Warehouse Utilization bar chart](screenshots/cost-credits-overview.png)

Scrolling down: *Cost per Successful Row* normalizes spend against throughput, *Daily Credits by Service Type* exposes mix shifts (e.g., AI Services growing), and *Top 10 Domo Datasets by Cost* ranks the most expensive data assets. The persistent **Alerts panel** (right) surfaces live alerts and AI recommendations.

![Cost & Credits — lower section with Alerts panel](screenshots/cost-credits-alerts.png)

| Metric | Description | Source |
|--------|-------------|--------|
| **Total Spend** | Aggregated USD cost over selected period | ![source](https://img.shields.io/badge/Snowflake-Account_Usage-29B5E8?style=flat-square&logo=snowflake&logoColor=white) |
| **Daily Credits Avg** | Mean daily credit consumption with trend | ![source](https://img.shields.io/badge/Snowflake-Account_Usage-29B5E8?style=flat-square&logo=snowflake&logoColor=white) |
| **Active Warehouses** | Count of warehouses with activity | ![source](https://img.shields.io/badge/Snowflake-Account_Usage-29B5E8?style=flat-square&logo=snowflake&logoColor=white) |
| **Efficiency Score** | Credits per 1M rows — lower is better | ![source](https://img.shields.io/badge/Derived-OBS-8B5CF6?style=flat-square) |

<br>

### ⚡ Performance & Reliability

The **bee-swarm scatter** (Observable Plot + D3) plots every query as a clickable dot — blue for fast, magenta for slow. Click any dot to open an inline *Query Details* panel showing Query ID, execution time, query type, database, warehouse, and SQL text. Below: *P95 Query Duration Trend* with an SLA threshold reference line, and a sortable *Slowest Connector Runs* table.

![Performance & Reliability — bee-swarm scatter, Query Details popout, P95 trend, Alerts panel](screenshots/performance-reliability.png)

| Metric | Description | Source |
|--------|-------------|--------|
| **Avg Query Time** | Mean execution time across all query types | ![source](https://img.shields.io/badge/Snowflake-Account_Usage-29B5E8?style=flat-square&logo=snowflake&logoColor=white) |
| **Query Failure Rate** | % of queries ending in error | ![source](https://img.shields.io/badge/Derived-OBS-8B5CF6?style=flat-square) |
| **Warehouse Events** | Suspend / resume event count | ![source](https://img.shields.io/badge/Snowflake-Account_Usage-29B5E8?style=flat-square&logo=snowflake&logoColor=white) |
| **Load Efficiency** | Compute time ÷ wall-clock time | ![source](https://img.shields.io/badge/Derived-OBS-8B5CF6?style=flat-square) |

<br>

### 🔗 Pipeline Health

*Bytes Ingested & API Anomalies* overlays daily bytes with an API z-score band — values beyond **±2σ** are shaded as anomalies. The *End-to-End Latency Heatmap* (dataset × day) spots chronic late feeds. *Connector Success Rate* and *SLA Breaches Heatmap* break down reliability. Stale datasets get a clickable **Details** popout.

![Pipeline Health — KPIs, Bytes Ingested & API Anomalies with z-score band, End-to-End Latency Heatmap](screenshots/pipeline-health.png)

| Metric | Description | Source |
|--------|-------------|--------|
| **Connector Success** | % of runs completing without error | ![source](https://img.shields.io/badge/Domo-Telemetry-60A5FA?style=flat-square) |
| **SLA Breaches** | Connectors exceeding target latency | ![source](https://img.shields.io/badge/Domo-Telemetry-60A5FA?style=flat-square) |
| **Stale Datasets** | Not refreshed within expected window | ![source](https://img.shields.io/badge/Domo-Telemetry-60A5FA?style=flat-square) |
| **Daily Bytes (MB)** | Volume ingested per day | ![source](https://img.shields.io/badge/Domo-Telemetry-60A5FA?style=flat-square) |

<br>

### 📊 Adoption & Utilization

The flagship chart is the **Cost vs. Utilization Quadrant** — an interactive bubble chart classifying each dataset into one of four quadrants. Hover any bubble for AI-generated **Why / Action / Watch** guidance.

| Quadrant | Meaning | Action |
|----------|---------|--------|
| 🔴 **Rationalize** | High cost, low utilization | Consolidate, downsize, or deprecate |
| 🟠 **Optimize & Scale** | High cost, high utilization | Tune schedules, consider auto-suspend |
| 🟡 **Monitor** | Low cost, low utilization | Watch for growth before investing |
| 🟢 **Best Value** | Low cost, high utilization | Keep schedules, modest scale-up if queues appear |

![Adoption & Utilization — Best Value tooltip with Why / Action / Watch guidance](screenshots/adoption-utilization.png)

![Adoption & Utilization — Rationalize tooltip: "Poor ROI — expensive but little throughput"](screenshots/adoption-rationalize.png)

| Metric | Description | Source |
|--------|-------------|--------|
| **Weekly Active Users** | Unique users in trailing 7 days | ![source](https://img.shields.io/badge/Snowflake-Account_Usage-29B5E8?style=flat-square&logo=snowflake&logoColor=white) |
| **Active Datasets** | Queried or refreshed in period | ![source](https://img.shields.io/badge/Domo-Telemetry-60A5FA?style=flat-square) |
| **Active Connectors** | With at least one run | ![source](https://img.shields.io/badge/Domo-Telemetry-60A5FA?style=flat-square) |
| **Cost per User** | Total spend ÷ WAU | ![source](https://img.shields.io/badge/Derived-OBS-8B5CF6?style=flat-square) |

<br>

### 🛡️ Data Quality

The **Schema Drift → Null Regression Matrix** heatmap shows null-rate changes across columns from **−7 to +2 days** relative to a schema change event — pinpointing which column adds, removes, or modifications caused regressions. *Lift (pp) vs. Baseline* ranks the largest percentage-point increases. *Coverage Anomalies* plots row-count z-scores, and a *Schema Drift Log* provides a filterable timeline.

![Data Quality — Schema Drift → Null Regression Matrix, Lift table, Coverage Anomalies](screenshots/data-quality.png)

| Metric | Description | Source |
|--------|-------------|--------|
| **Data Completeness** | % of datasets with null rate below threshold | ![source](https://img.shields.io/badge/Derived-OBS-8B5CF6?style=flat-square) |
| **Rule Violations** | Data accuracy rule violation count | ![source](https://img.shields.io/badge/Derived-OBS-8B5CF6?style=flat-square) |
| **Schema Changes** | Column adds / removes / modifies in trailing week | ![source](https://img.shields.io/badge/Derived-OBS-8B5CF6?style=flat-square) |
| **Consistency Score** | Referential integrity pass rate | ![source](https://img.shields.io/badge/Derived-OBS-8B5CF6?style=flat-square) |
| **Orphan Rate** | Orphan rows as % of total | ![source](https://img.shields.io/badge/Derived-OBS-8B5CF6?style=flat-square) |

<br>

### 🗺️ Data Lineage

An interactive **DAG** (directed acyclic graph) traces data from source to derived datasets. Nodes are color-coded by domain. Filter by domain, toggle Sources Only / Derived Only, search by table name. Zoom, pan, and export.

![Data Lineage — Interactive DAG with domain-colored nodes, filters, and legend](screenshots/data-lineage.png)

| Domain | Color | Description |
|--------|-------|-------------|
| ![domain](https://img.shields.io/badge/Account_Usage-2563EB?style=flat-square) | Blue | Snowflake system tables |
| ![domain](https://img.shields.io/badge/Domo_Telemetry-60A5FA?style=flat-square) | Light blue | Connector & DataFlow stats |
| ![domain](https://img.shields.io/badge/Business_Systems-F97316?style=flat-square) | Orange | Source data tables |
| ![domain](https://img.shields.io/badge/Derived_/_OBS-8B5CF6?style=flat-square) | Purple | Analytics & observability |
| ![domain](https://img.shields.io/badge/Optimizer-EC4899?style=flat-square) | Pink | Query performance tools |

<br>

### 🤖 AI Query Optimization

AI-powered query rewrite recommendations with side-by-side comparison. Summary KPIs — **Total Queries Analyzed**, **Avg Improvement**, **Est. Credits Saved**, **Adoption Rate** — followed by a *Performance Distribution* histogram, *Action Breakdown* donut, and *Savings Timeline* area chart.

![AI Query Optimization — KPIs, Performance Distribution, Action Breakdown, Savings Timeline](screenshots/ai-optimization-overview.png)

Each query card shows original vs. optimized SQL in syntax-highlighted **Monaco editors**. Per-query metrics include compilation time, execution time, bytes scanned, improvement %, bytes saved, and estimated USD savings.

> **Powered by** ![Claude](https://img.shields.io/badge/Claude_4_Sonnet-Anthropic-cc785c?style=flat-square&logo=anthropic&logoColor=white)

![AI Query Optimization — side-by-side Monaco editors, per-query metrics, AI Analysis](screenshots/ai-optimization-detail.png)

Toggle **Show Diff** for unified diff highlighting — insertions in green, deletions in red.

![AI Query Optimization — diff mode with inline green/red highlighting](screenshots/ai-optimization-diff.png)

| Feature | Detail | Status |
|---------|--------|--------|
| **Side-by-side editors** | Monaco with custom dark theme, read-only, SQL syntax | ![status](https://img.shields.io/badge/status-live-brightgreen?style=flat-square) |
| **Diff view** | Inline insertions (green) and deletions (red) | ![status](https://img.shields.io/badge/status-live-brightgreen?style=flat-square) |
| **Action classification** | `ADOPT` · `BENCH_TEST` · `IGNORE` per query | ![status](https://img.shields.io/badge/status-live-brightgreen?style=flat-square) |
| **Copy & Run Test** | One-click copy or simulated test execution | ![status](https://img.shields.io/badge/status-live-brightgreen?style=flat-square) |
| **Filters** | Min improvement %, sort, full-text search | ![status](https://img.shields.io/badge/status-live-brightgreen?style=flat-square) |

<br>

### 🔔 Alerting System

A persistent right-hand panel available on Performance, Adoption, and Cost views.

| Component | Description | Status |
|-----------|-------------|--------|
| **Created Alerts** | User-defined alerts with name, severity, target datasets | ![status](https://img.shields.io/badge/status-live-brightgreen?style=flat-square) |
| **Live Alerts feed** | Credit Spike · Query Timeout · Failed Load · Security · Storage | ![status](https://img.shields.io/badge/status-live-brightgreen?style=flat-square) |
| **"NEW" badge** | Blue border + badge for recently triggered alerts | ![status](https://img.shields.io/badge/status-live-brightgreen?style=flat-square) |
| **+ New Alert modal** | Monaco SQL editor or AI-assisted generation via Cortex | ![status](https://img.shields.io/badge/status-live-brightgreen?style=flat-square) |
| **Recommendations** | AI-generated operational suggestions | ![status](https://img.shields.io/badge/status-live-brightgreen?style=flat-square) |

---

## 🏗️ Architecture

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
| ![layer](https://img.shields.io/badge/Account_Usage-29B5E8?style=flat-square&logo=snowflake&logoColor=white) | `SNOWFLAKE.ACCOUNT_USAGE.*` | `OBS_QUERY_PERFORMANCE`, `OBS_CREDITS_BY_WAREHOUSE`, etc. | Credit consumption, query history, warehouse events |
| ![layer](https://img.shields.io/badge/Domo_Telemetry-60A5FA?style=flat-square) | Domo Activity Log, Connector API | `OBS_DOMO_CONNECTOR_HEALTH`, `OBS_DOMO_DAILY_BYTES`, etc. | Connector runs, SLA tracking, API z-scores |
| ![layer](https://img.shields.io/badge/Derived_/_OBS-8B5CF6?style=flat-square) | DataFlow transforms | `OBS_COST_PER_CREDIT`, `OBS_IDLE_ACTIVE_RATIO`, etc. | Aggregated observability metrics |
| ![layer](https://img.shields.io/badge/Optimizer-EC4899?style=flat-square) | LLM-powered rewrite engine | `QUERY_REWRITE_RESULTS` | AI query optimization recommendations |

---

## 🛠️ Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| **Runtime** | Domo Custom App (Brick) via `ryuu.js` SDK | ![ver](https://img.shields.io/badge/ryuu.js-4.6.0-0D1117?style=flat-square) |
| **Charting** | [ApexCharts](https://apexcharts.com/) — line, area, bar, treemap, donut, heatmap | ![ver](https://img.shields.io/badge/ApexCharts-3.42.0-00E396?style=flat-square) |
| **Statistical Viz** | [Observable Plot](https://observablehq.com/plot/) + [D3.js](https://d3js.org/) — bee-swarm, z-score bands | ![ver](https://img.shields.io/badge/D3.js-7.8.3-F9A03C?style=flat-square) ![ver](https://img.shields.io/badge/Plot-0.6.4-3b5fc0?style=flat-square) |
| **Code Editor** | [Monaco Editor](https://microsoft.github.io/monaco-editor/) — SQL highlighting, diff view | ![ver](https://img.shields.io/badge/Monaco-0.34.1-007ACC?style=flat-square) |
| **Data Lineage** | D3.js force-directed graph with domain-based node coloring | — |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) + custom design system (`app.css`) | ![ver](https://img.shields.io/badge/Tailwind-2.2.19-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white) |
| **Fonts** | Inter (UI), JetBrains Mono (code / metrics) | — |
| **AI Engine** | Claude (Anthropic) for query rewrite; Cortex for alert SQL | ![ver](https://img.shields.io/badge/Claude_4-Sonnet-cc785c?style=flat-square&logo=anthropic&logoColor=white) |

---

## 📦 Dataset Aliases & Manifest

The `manifest.json` declares **25 dataset bindings**. Replace placeholder `dataSetId` values with your actual Domo dataset IDs before deployment.

<details>
<summary><strong>Click to expand all 25 aliases</strong></summary>

<br>

| # | Alias | Description | Layer |
|---|-------|-------------|-------|
| 1 | `QUERYREWRITERESULTS` | AI query rewrite output — original SQL, optimized SQL, performance deltas | ![layer](https://img.shields.io/badge/Optimizer-EC4899?style=flat-square) |
| 2 | `OBSOBJECTCREDITCOST` | Object-level credit attribution | ![layer](https://img.shields.io/badge/Account_Usage-29B5E8?style=flat-square) |
| 3 | `OBSDATAFLOWRUNS` | DataFlow execution history | ![layer](https://img.shields.io/badge/Domo-60A5FA?style=flat-square) |
| 4 | `OBSDATASETCREDITCOST` | Per-dataset credit cost rollup | ![layer](https://img.shields.io/badge/Derived-8B5CF6?style=flat-square) |
| 5 | `OBSSNOWFLAKEWAU` | Weekly active users from Snowflake | ![layer](https://img.shields.io/badge/Account_Usage-29B5E8?style=flat-square) |
| 6 | `OBSDOMOAPIZSCORE` | API call volume with z-score anomaly detection | ![layer](https://img.shields.io/badge/Domo-60A5FA?style=flat-square) |
| 7 | `OBSDOMODAILYBYTES` | Daily bytes ingested via connectors | ![layer](https://img.shields.io/badge/Domo-60A5FA?style=flat-square) |
| 8 | `OBSDOMODATAFRESHNESS` | Dataset freshness / staleness tracking | ![layer](https://img.shields.io/badge/Domo-60A5FA?style=flat-square) |
| 9 | `OBSDOMOCONNECTORHEALTH` | Connector success rates | ![layer](https://img.shields.io/badge/Domo-60A5FA?style=flat-square) |
| 10 | `OBSDOMOCONNECTORSLA` | Connector SLA compliance | ![layer](https://img.shields.io/badge/Domo-60A5FA?style=flat-square) |
| 11 | `OBSDOMOCONNECTORRUNS` | Individual connector run records | ![layer](https://img.shields.io/badge/Domo-60A5FA?style=flat-square) |
| 12 | `OBSWAREHOUSEEVENTS` | Warehouse suspend / resume events | ![layer](https://img.shields.io/badge/Account_Usage-29B5E8?style=flat-square) |
| 13 | `OBSQUERYFAILURERATE` | Query failure rate by warehouse / database | ![layer](https://img.shields.io/badge/Derived-8B5CF6?style=flat-square) |
| 14 | `OBSQUERYPERFORMANCE` | Query-level execution metrics | ![layer](https://img.shields.io/badge/Account_Usage-29B5E8?style=flat-square) |
| 15 | `OBSIDLEACTIVERATIO` | Warehouse idle vs. active time | ![layer](https://img.shields.io/badge/Derived-8B5CF6?style=flat-square) |
| 16 | `OBSCREDITSBYWAREHOUSE` | Daily credit usage by warehouse | ![layer](https://img.shields.io/badge/Account_Usage-29B5E8?style=flat-square) |
| 17 | `OBSCOSTPERCREDIT` | Cost per credit by service type | ![layer](https://img.shields.io/badge/Derived-8B5CF6?style=flat-square) |
| 18 | `OBSPIPELINETHROUGHPUT` | Rows/sec and bytes/sec throughput | ![layer](https://img.shields.io/badge/Derived-8B5CF6?style=flat-square) |
| 19 | `OBSRECORDFRESHNESS` | Record-level freshness tracking | ![layer](https://img.shields.io/badge/Derived-8B5CF6?style=flat-square) |
| 20 | `OBSDATACOVERAGE` | Row count anomalies with z-scores | ![layer](https://img.shields.io/badge/Derived-8B5CF6?style=flat-square) |
| 21 | `OBSDATACOMPLETENESS` | Column-level null percentages | ![layer](https://img.shields.io/badge/Derived-8B5CF6?style=flat-square) |
| 22 | `OBSDATAACCURACY` | Rule-based data validation results | ![layer](https://img.shields.io/badge/Derived-8B5CF6?style=flat-square) |
| 23 | `OBSDATACONSISTENCY` | Referential integrity checks | ![layer](https://img.shields.io/badge/Derived-8B5CF6?style=flat-square) |
| 24 | `OBSSCHEMADRIFT` | Schema change detection log | ![layer](https://img.shields.io/badge/Derived-8B5CF6?style=flat-square) |
| 25 | `OBSCOSTVSUTILIZATION` | Cost vs. utilization quadrant data | ![layer](https://img.shields.io/badge/Derived-8B5CF6?style=flat-square) |

</details>

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Details |
|-------------|---------|
| ![req](https://img.shields.io/badge/Domo-Instance-0D1117?style=flat-square) | Custom Apps (Bricks) feature enabled |
| ![req](https://img.shields.io/badge/Snowflake-Account-29B5E8?style=flat-square&logo=snowflake&logoColor=white) | `ACCOUNT_USAGE` access granted to Domo service role |
| ![req](https://img.shields.io/badge/Datasets-Populated-8B5CF6?style=flat-square) | Observability datasets created via DataFlows / connectors |

### Deployment

```bash
# 1. Clone
git clone https://github.com/cassidythilton/domo-snowflake-360.git
cd domo-snowflake-360

# 2. Update manifest.json with your actual Domo dataset IDs
#    Replace all 00000000-... placeholders

# 3. Publish to Domo
domo login
domo publish
```

> [!TIP]
> The dashboard supports global filtering by **time period** (30 / 60 / 90 / 180 days), **warehouse**, **database**, and **schema** — all via the header controls.

### Mock Data Mode

Toggle between **Mock Data** and **Live** mode using the switch in the sidebar footer. Mock mode ships with a comprehensive synthetic data generator:

| Feature | Detail |
|---------|--------|
| 📈 Query-time distributions | Exponential with realistic tail behavior |
| 🌊 Credit usage patterns | Seasonal patterns with weekday/weekend variance |
| 🔍 Pipeline anomalies | Z-score anomalies injected for monitoring tests |
| 🔄 Schema drift events | Randomized column changes correlated with null regressions |
| 💡 Quadrant guidance | Synthetic cost vs. utilization data with AI Why/Action/Watch text |

---

## 💡 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Single HTML / JS / CSS** | Domo Bricks run in a sandboxed iframe — no build step, no bundler, minimal deployment friction |
| **Mock-first development** | Every chart works offline with statistically realistic synthetic data; flip to live with one click |
| **Monaco Editor for SQL** | Matches the mental model of analysts accustomed to VS Code or Snowsight |
| **Bee-swarm over histogram** | Preserves individual query identity; click any dot to inspect query ID, SQL text, warehouse, timing |
| **Quadrant chart** | Instant triage: Rationalize · Optimize & Scale · Monitor · Best Value — with AI guidance per bubble |
| **Alerting as first-class panel** | Persistent sidebar keeps operational awareness without obscuring analysis |
| **Dark mode** | Full theme toggle via CSS custom properties; respects low-light preference |
| **SRI on Domo SDK** | `ryuu.js` loaded with `sha384` integrity attribute to guard against CDN tampering |

---

## 📁 File Structure

```
snow-domo-360/
├── index.html          # HTML shell — nav, tab containers, metric cards, chart placeholders
├── app.js              # Dashboard class — data gen, live loading, charts, alerting (5,800+ LOC)
├── app.css             # Design system — cards, editors, alerts, tooltips, responsive, dark mode
├── manifest.json       # Domo manifest — 25 dataset bindings, app metadata
├── screenshots/        # 11 dashboard screenshots for documentation
│   ├── cost-credits-overview.png
│   ├── cost-credits-alerts.png
│   ├── performance-reliability.png
│   ├── pipeline-health.png
│   ├── adoption-utilization.png
│   ├── adoption-rationalize.png
│   ├── data-quality.png
│   ├── data-lineage.png
│   ├── ai-optimization-overview.png
│   ├── ai-optimization-detail.png
│   └── ai-optimization-diff.png
├── thumbnail.png       # Domo app store thumbnail
└── README.md           # ← You are here
```

---

## 🔒 Security & Privacy

> [!IMPORTANT]
> This repository has been audited for public release. No credentials, secrets, or PII are present.

| Check | Status | Detail |
|-------|--------|--------|
| Credentials / API keys | ![pass](https://img.shields.io/badge/pass-✓-brightgreen?style=flat-square) | None stored anywhere in the repo |
| Dataset IDs | ![pass](https://img.shields.io/badge/pass-✓-brightgreen?style=flat-square) | All `00000000-…` placeholders — replace before deployment |
| PII / email addresses | ![pass](https://img.shields.io/badge/pass-✓-brightgreen?style=flat-square) | Mock data uses `@example.com` domains only |
| Snowflake identifiers | ![pass](https://img.shields.io/badge/pass-✓-brightgreen?style=flat-square) | No real account names, warehouse names, or schemas |
| SQL templates | ![pass](https://img.shields.io/badge/pass-✓-brightgreen?style=flat-square) | Generic sample identifiers only |
| External calls | ![pass](https://img.shields.io/badge/pass-✓-brightgreen?style=flat-square) | Sandboxed iframe — CDN libs only (Tailwind, ApexCharts, D3, Monaco, Plot) |
| SDK integrity | ![pass](https://img.shields.io/badge/pass-✓-brightgreen?style=flat-square) | `ryuu.js` loaded with [SRI](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity) `sha384` hash |
| Local storage | ![pass](https://img.shields.io/badge/pass-✓-brightgreen?style=flat-square) | Theme preference only (`light` / `dark`) — no sensitive data |

---

## 📄 License

This project is provided as-is for demonstration and reference purposes. See your Domo license agreement for terms governing Custom App deployment.

---

<p align="center">
  <sub>Built with</sub><br><br>
  <img src="https://img.shields.io/badge/Domo-Bricks-0D1117?style=for-the-badge" alt="Domo Bricks" />
  <img src="https://img.shields.io/badge/Snowflake-Account_Usage-29B5E8?style=for-the-badge&logo=snowflake&logoColor=white" alt="Snowflake" />
  <img src="https://img.shields.io/badge/Claude-Anthropic-cc785c?style=for-the-badge&logo=anthropic&logoColor=white" alt="Claude" />
  <img src="https://img.shields.io/badge/ApexCharts-00E396?style=for-the-badge" alt="ApexCharts" />
  <img src="https://img.shields.io/badge/D3.js-F9A03C?style=for-the-badge&logo=d3dotjs&logoColor=white" alt="D3" />
  <img src="https://img.shields.io/badge/Observable_Plot-3b5fc0?style=for-the-badge" alt="Observable Plot" />
  <img src="https://img.shields.io/badge/Monaco_Editor-007ACC?style=for-the-badge&logo=visualstudiocode&logoColor=white" alt="Monaco" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind" />
</p>
