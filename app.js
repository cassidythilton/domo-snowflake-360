// Snow-Domo 360 Dashboard JavaScript

class SnowDomoDashboard {
    constructor() {
        this.isLiveMode = false;
        this.isDarkMode = false;
        this.currentDateRange = 30;
        this.charts = {};
        this.data = {};
        this.alerts = [];
        this.createdAlerts = [];
        this.newAlertEvents = [];
        this.querySwarmChart = null;
        this.monacoEditor = null;
        this.queryRewriteResults = [];
        this.filteredQueries = [];
        this.displayedQueries = [];
        this.queriesPerPage = 15;
        this.currentQueryPage = 1;
        
        // Dataset aliases for live data
        this.datasetAliases = {
            'OBS_OBJECT_CREDIT_COST': 'OBSOBJECTCREDITCOST',
            'OBS_DATAFLOW_RUNS': 'OBSDATAFLOWRUNS',
            'OBS_DATASET_CREDIT_COST': 'OBSDATASETCREDITCOST',
            'OBS_SNOWFLAKE_WAU': 'OBSSNOWFLAKEWAU',
            'OBS_DOMO_API_ZSCORE': 'OBSDOMOAPIZSCORE',
            'OBS_DOMO_DAILY_BYTES': 'OBSDOMODAILYBYTES',
            'OBS_DOMO_DATA_FRESHNESS': 'OBSDOMODATAFRESHNESS',
            'OBS_DOMO_CONNECTOR_HEALTH': 'OBSDOMOCONNECTORHEALTH',
            'OBS_DOMO_CONNECTOR_SLA': 'OBSDOMOCONNECTORSLA',
            'OBS_DOMO_CONNECTOR_RUNS': 'OBSDOMOCONNECTORRUNS',
            'OBS_WAREHOUSE_EVENTS': 'OBSWAREHOUSEEVENTS',
            'OBS_QUERY_FAILURE_RATE': 'OBSQUERYFAILURERATE',
            'OBS_QUERY_PERFORMANCE': 'OBSQUERYPERFORMANCE',
            'OBS_IDLE_ACTIVE_RATIO': 'OBSIDLEACTIVERATIO',
            'OBS_CREDITS_BY_WAREHOUSE': 'OBSCREDITSBYWAREHOUSE',
            'OBS_COST_PER_CREDIT': 'OBSCOSTPERCREDIT',
            'OBS_QUERY_HISTORY_LTD': 'OBSQUERYHISTORYLTD',
            'QUERY_REWRITE_RESULTS': 'QUERYREWRITERESULTS',
            'OBS_COST_VS_UTILIZATION': 'OBSCOSTVSUTILIZATION'
        };

        this.init();
    }

    // Create Alert modal lifecycle
    openCreateAlertModal() {
        const modal = document.getElementById('createAlertModal');
        if (!modal) return;
        modal.classList.remove('hidden');
        // Populate datasets (Mock from seed; Live from placeholder later)
        const dsSelect = document.getElementById('alertDatasets');
        dsSelect.innerHTML = '';
        const list = this.isLiveMode ? (this.liveDatasets || []) : (this.mockDatasets || []);
        list.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name; opt.textContent = name; dsSelect.appendChild(opt);
        });
        // Initialize SQL editor (Monaco or textarea)
        const editorContainer = document.getElementById('sqlEditor');
        editorContainer.innerHTML = '';
        this.createAlertEditor = this.createMonacoEditor(editorContainer, '-- Write a SQL query that returns rows when the alert should fire', false);
        // Add inline Cortex prompt area under header button
        const cortexBtn = document.getElementById('cortexBtn');
        if (cortexBtn && !document.getElementById('cortexPromptArea')) {
            const area = document.createElement('div');
            area.id = 'cortexPromptArea';
            area.className = 'mt-2 hidden';
            area.innerHTML = `
                <div class="border border-gray-200 rounded-lg p-2 bg-gray-50">
                    <label class="text-xs text-gray-600">Describe the rule</label>
                    <div class="flex items-center gap-2 mt-1">
                        <textarea id="cortexPrompt" class="input flex-1" rows="2" placeholder="e.g., configure an alert on Retail Product Catalog when table exceeds SLA"></textarea>
                        <button id="cortexGenerate" class="btn btn-secondary whitespace-nowrap">
                          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2v20M2 12h20"/></svg>
                          Generate
                        </button>
                    </div>
                    <div id="cortexStatus" class="text-[11px] text-gray-500 mt-1 hidden">Generating SQL…</div>
                    <div id="cortexError" class="text-[11px] text-red-600 mt-1 hidden">Generation failed. Retry.</div>
                </div>`;
            editorContainer.parentElement.insertBefore(area, editorContainer);
            document.getElementById('cortexBtn').addEventListener('click', () => {
                area.classList.toggle('hidden');
            });
            document.getElementById('cortexGenerate').addEventListener('click', async () => {
                const status = document.getElementById('cortexStatus');
                const err = document.getElementById('cortexError');
                status.classList.remove('hidden'); err.classList.add('hidden');
                try {
                    const prompt = document.getElementById('cortexPrompt').value;
                    const sql = await this.generateSQLWithCortex(prompt);
                    if (this.createAlertEditor) {
                        this.createAlertEditor.setValue(sql);
                        this.validateCreateAlertForm();
                    }
                } catch (_) {
                    err.classList.remove('hidden');
                } finally {
                    status.classList.add('hidden');
                }
            });
        }
        this.validateCreateAlertForm();
        // Focus trap: focus first input
        setTimeout(() => document.getElementById('alertName')?.focus(), 0);
    }

    closeCreateAlertModal() {
        const modal = document.getElementById('createAlertModal');
        if (!modal) return;
        modal.classList.add('hidden');
        this.createAlertEditor = null;
        this.pendingAlertDraft = null;
    }

    handleCancelCreateAlert() {
        const name = (document.getElementById('alertName').value || '').trim();
        const sql = this.createAlertEditor ? this.createAlertEditor.getValue() : '';
        const hasChanges = name.length > 0 || (sql && sql.trim().length > 0);
        if (hasChanges) {
            if (!confirm('Discard changes?')) return;
        }
        this.closeCreateAlertModal();
    }

    validateCreateAlertForm() {
        const nameEl = document.getElementById('alertName');
        const dsEl = document.getElementById('alertDatasets');
        const levelEl = document.getElementById('alertLevel');
        const name = (nameEl.value || '').trim();
        const datasets = Array.from(dsEl.selectedOptions).map(o => o.value);
        const level = levelEl.value;
        const nameValid = name.length >= 3 && name.length <= 80 && !this.createdAlerts.some(a => a.name.toLowerCase() === name.toLowerCase());
        document.getElementById('alertNameError').classList.toggle('hidden', nameValid);
        const dsValid = datasets.length > 0;
        document.getElementById('alertDatasetsError').classList.toggle('hidden', dsValid);
        const levelValid = !!level;
        document.getElementById('alertLevelError').classList.toggle('hidden', levelValid);
        const sql = this.createAlertEditor ? this.createAlertEditor.getValue() : '';
        const sqlValid = !!sql && sql.trim().length > 0;
        document.getElementById('sqlError').classList.toggle('hidden', sqlValid);
        document.getElementById('saveCreateAlert').disabled = !(nameValid && dsValid && levelValid && sqlValid);
        return { name, datasets, level, sqlValid };
    }

    async handleSaveCreateAlert() {
        const nameEl = document.getElementById('alertName');
        const descEl = document.getElementById('alertDesc');
        const dsEl = document.getElementById('alertDatasets');
        const levelEl = document.getElementById('alertLevel');
        const sql = this.createAlertEditor ? this.createAlertEditor.getValue() : '';
        const datasets = Array.from(dsEl.selectedOptions).map(o => o.value);
        const level = levelEl.value;
        const levelLabel = level.charAt(0).toUpperCase() + level.slice(1);

        // Persist (Mock: in-memory)
        const newAlert = {
            id: 'mock_' + Math.random().toString(36).slice(2, 9),
            name: (nameEl.value || '').trim(),
            description: (descEl.value || '').trim(),
            datasets,
            sql,
            level,
            levelLabel,
            status: 'implementing',
            createdBy: 'You',
            createdOn: new Date()
        };
        this.createdAlerts.unshift(newAlert);
        this.renderAlerts();

        // Close modal and toast equivalent via console (non-blocking)
        this.closeCreateAlertModal();
        console.log(`Implementing alert '${newAlert.name}' …`);

        // Simulate implementing and activation after 2–3s
        setTimeout(() => {
            newAlert.status = 'active';
            this.renderAlerts();
            // Evaluate mock firing: basic keyword simulation or simple boolean
            try {
                const fired = /error|fail|duplicate|orphan|anomal/i.test(newAlert.sql);
                if (fired) {
                    this.newAlertEvents.unshift({ ts: Date.now(), name: newAlert.name, count: Math.floor(Math.random()*5)+1 });
                    this.renderAlerts();
                }
            } catch (_) {}
        }, 2000 + Math.random()*1000);
    }

    // Cortex stub for generating SQL from natural language
    async generateSQLWithCortex(prompt) {
        await new Promise(r => setTimeout(r, 900));
        // Simple stubbed responses tailored to Snowflake
        const samples = [
            "SELECT dataset, count(*) AS duplicate_count FROM records GROUP BY dataset HAVING duplicate_count > 0;",
            "SELECT * FROM quality_checks WHERE orphan_rate > 0.05;",
            "SELECT dataset, run_id, error_message FROM pipeline_runs WHERE status = 'FAILED';"
        ];
        return samples[Math.floor(Math.random()*samples.length)];
    }
    init() {
        this.setupEventListeners();
        this.generateMockData();
        this.generateQueryRewriteData();
        this.renderDashboard();
        this.generateAlerts();
        this.setupTooltips();
        this.initializeMonacoEditor();
        this.initializeTheme();
    }

    // Initialize theme from localStorage or default to light
    initializeTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.isDarkMode = savedTheme === 'dark';
        this.applyTheme();
    }

    // Apply theme to document
    applyTheme() {
        if (this.isDarkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        
        // Update toggle button
        const themeToggle = document.getElementById('themeToggle');
        const icon = themeToggle.querySelector('.theme-toggle-icon');
        const text = themeToggle.querySelector('.theme-toggle-text');
        
        if (this.isDarkMode) {
            icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>';
            text.textContent = 'Light Mode';
        } else {
            icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>';
            text.textContent = 'Dark Mode';
        }
        
        localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
    }

    // Toggle theme
    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        this.applyTheme();
        
        // Re-render charts to apply theme colors
        setTimeout(() => {
            this.renderDashboard();
        }, 100);
    }

    // SQL Auto-formatting function
    formatSQL(sql) {
        if (!sql) return '';
        
        // SQL keywords to uppercase
        const keywords = [
            'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'OUTER', 'LEFT', 'RIGHT', 'FULL',
            'ON', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'IS', 'NULL',
            'GROUP', 'BY', 'HAVING', 'ORDER', 'ASC', 'DESC', 'LIMIT', 'OFFSET',
            'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE',
            'ALTER', 'DROP', 'INDEX', 'VIEW', 'PROCEDURE', 'FUNCTION', 'TRIGGER',
            'UNION', 'ALL', 'DISTINCT', 'AS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
            'IF', 'IFNULL', 'COALESCE', 'CAST', 'CONVERT', 'SUBSTRING', 'TRIM',
            'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'DATE', 'TIME', 'TIMESTAMP',
            'WITH', 'MATERIALIZED', 'CTE', 'RECURSIVE'
        ];
        
        let formatted = sql;
        
        // Apply keyword formatting
        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            formatted = formatted.replace(regex, keyword.toUpperCase());
        });
        
        // Clean up whitespace and apply indentation
        formatted = formatted
            .replace(/\s+/g, ' ') // Normalize spaces
            .replace(/,\s*/g, ',\n    ') // Comma formatting
            .replace(/\bFROM\b/g, '\nFROM')
            .replace(/\bWHERE\b/g, '\nWHERE')
            .replace(/\bAND\b/g, '\n    AND')
            .replace(/\bOR\b/g, '\n    OR')
            .replace(/\bJOIN\b/g, '\nJOIN')
            .replace(/\bLEFT JOIN\b/g, '\nLEFT JOIN')
            .replace(/\bRIGHT JOIN\b/g, '\nRIGHT JOIN')
            .replace(/\bINNER JOIN\b/g, '\nINNER JOIN')
            .replace(/\bOUTER JOIN\b/g, '\nOUTER JOIN')
            .replace(/\bGROUP BY\b/g, '\nGROUP BY')
            .replace(/\bORDER BY\b/g, '\nORDER BY')
            .replace(/\bHAVING\b/g, '\nHAVING')
            .replace(/\bWITH\b/g, '\nWITH')
            .trim();
        
        return formatted;
    }

    // Helper method for exponential distribution
    exponentialRandom() {
        return -Math.log(1 - Math.random());
    }

    setupEventListeners() {
        // Tab switching with navigation
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Data mode toggle
        document.getElementById('dataToggle').addEventListener('click', () => {
            this.toggleDataMode();
        });

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Date range change
        document.getElementById('dateRange').addEventListener('change', (e) => {
            this.currentDateRange = parseInt(e.target.value);
            this.refreshData();
        });

        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshData();
        });

        // Sidebar toggle
        document.getElementById('closeSidebar').addEventListener('click', () => {
            this.toggleSidebar();
        });

        // Show more alerts
        document.getElementById('showMoreAlerts').addEventListener('click', () => {
            this.showMoreAlerts();
        });
        // Recommendations collapse toggle with session memory
        const recsToggle = document.getElementById('recsToggle');
        if (recsToggle) {
            const recsState = sessionStorage.getItem('recsCollapsed') === 'true';
            const recsSection = document.getElementById('recsSection');
            if (recsState) {
                recsSection.style.display = 'none';
                recsToggle.textContent = 'Show';
            }
            recsToggle.addEventListener('click', () => {
                const hidden = recsSection.style.display === 'none';
                recsSection.style.display = hidden ? '' : 'none';
                recsToggle.textContent = hidden ? 'Hide' : 'Show';
                sessionStorage.setItem('recsCollapsed', (!hidden).toString());
            });
        }

        // Query Details Modal handling
        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('modalBackdrop').addEventListener('click', () => {
            this.closeModal();
        });

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                this.closeCreateAlertModal();
            }
        });

        // Query optimization filters
        document.getElementById('actionFilter').addEventListener('change', () => {
            this.filterQueries();
        });

        document.getElementById('improvementFilter').addEventListener('change', () => {
            this.filterQueries();
        });

        document.getElementById('sortBy').addEventListener('change', () => {
            this.filterQueries();
        });

        document.getElementById('searchQueries').addEventListener('input', () => {
            this.filterQueries();
        });

        document.getElementById('loadMoreQueries').addEventListener('click', () => {
            this.loadMoreQueries();
        });

        // Cortex button inside Create Alert modal
        const cortexBtn = document.getElementById('cortexBtn');
        if (cortexBtn) {
            cortexBtn.addEventListener('click', async () => {
                const nl = prompt('Describe the alert rule (natural language):', 'Notify when duplicate primary keys exceed 0.5%');
                if (!nl) return;
                const btn = cortexBtn;
                const original = btn.textContent;
                btn.textContent = 'Generating SQL…';
                btn.disabled = true;
                try {
                    const sql = await this.generateSQLWithCortex(nl);
                    if (this.createAlertEditor) {
                        this.createAlertEditor.setValue(sql);
                        this.validateCreateAlertForm();
                    }
                } catch (e) {
                    alert('Failed to generate SQL. Please try again.');
                } finally {
                    btn.textContent = original;
                    btn.disabled = false;
                }
            });
        }
        // Create Alert modal events
        document.getElementById('newAlertBtn').addEventListener('click', () => this.openCreateAlertModal());
        document.getElementById('createAlertBackdrop').addEventListener('click', () => this.closeCreateAlertModal());
        document.getElementById('closeCreateAlert').addEventListener('click', () => this.closeCreateAlertModal());
        document.getElementById('cancelCreateAlert').addEventListener('click', () => this.handleCancelCreateAlert());
        document.getElementById('saveCreateAlert').addEventListener('click', () => this.handleSaveCreateAlert());

        ['alertName','alertDatasets','alertLevel'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => this.validateCreateAlertForm());
            document.getElementById(id).addEventListener('change', () => this.validateCreateAlertForm());
        });
    }

    generateMockData() {
        // Seeded dataset names used across charts for Mock mode
        this.mockDatasets = [
            'HHS_NPI_Registry','Transaction Fraud Recommendation','Retail Product Catalog','Website Analytics Sessions',
            'IoT Device Telemetry','Marketing Campaign Attribution','Customer 360 Master','Order Line Items',
            'Payments Settlement','Support Tickets','Warehouse Inventory','Log Events Aggregated'
        ];
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - (this.currentDateRange * 24 * 60 * 60 * 1000));
        // Generate date array
        const dates = [];
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            dates.push(new Date(d));
        }

        // Data Quality mock datasets
        // Coverage anomalies (ROWS_LOADED with z-score) - more realistic anomaly patterns
        this.data.dataCoverage = [];
        const dqDatasets = ['USER_ACTIVITY', 'SALES_DATA', 'MARKETING_EVENTS'];
        dates.forEach((date, dateIndex) => {
            dqDatasets.forEach((ds, dsIndex) => {
                // Base average varies by dataset
                const baseAvg = [25000, 45000, 35000][dsIndex];
                const avgRows30d = baseAvg + (Math.sin(dateIndex * 0.1) * 5000); // Seasonal variation
                
                // Most points are normal (z-score between -1.5 and 1.5)
                let z = (Math.random() - 0.5) * 3; // Normal range
                
                // Inject specific anomalies (5% chance of strong anomaly)
                if (Math.random() < 0.05) {
                    z = (Math.random() > 0.5 ? 1 : -1) * (2.5 + Math.random() * 2); // Strong anomaly
                } else if (Math.random() < 0.15) {
                    z = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 0.5); // Mild anomaly
                }
                
                // Calculate actual rows with some noise
                const variation = z * (avgRows30d * 0.2);
                const rows = Math.max(1000, Math.round(avgRows30d + variation + (Math.random() - 0.5) * 2000));
                
                this.data.dataCoverage.push({ 
                    RUN_DATE: date, 
                    DATASET: ds, 
                    ROWS_LOADED: rows, 
                    AVG_ROWS_30D: Math.round(avgRows30d), 
                    ZSCORE_ROWS_LOADED: parseFloat(z.toFixed(2))
                });
            });
        });

        // Completeness (NULL_PCT_* and DUP_PK_COUNT)
        this.data.dataCompleteness = dqDatasets.map(ds => {
            const base = { AS_OF_DATE: new Date(), DATASET: ds, ROW_COUNT: Math.floor(Math.random()*100000)+5000, DUP_PK_COUNT: Math.random()<0.3?Math.floor(Math.random()*50):0 };
            ['EMAIL','PHONE','ADDRESS','CUSTOMER_ID','ORDER_DATE'].forEach(col => base[`NULL_PCT_${col}`] = +(Math.random()*15).toFixed(1));
            return base;
        });

        // Accuracy (rule violations over days)
        this.data.dataAccuracy = [];
        const rules = ['EMAIL_FORMAT','PHONE_LENGTH','POSITIVE_AMOUNT','FUTURE_DATE','VALID_STATUS'];
        dates.forEach(date => {
            rules.forEach(rule => {
                this.data.dataAccuracy.push({ RUN_TS: date, RULE_ID: rule, TABLE_FQN: 'DB.SCHEMA.TABLE', RULE_DESC: rule, VIOLATIONS: Math.floor(Math.random()*100) });
            });
        });

        // Consistency (orphan rows by check)
        this.data.dataConsistency = ['FK_CUSTOMERS_ORDERS','FK_ORDERS_PRODUCTS','FK_USERS_ADDRESSES','FK_PRODUCTS_CATEGORIES','FK_ORDERS_PAYMENTS']
            .map(name => ({ AS_OF_DATE: new Date(), CHECK_NAME: name, ORPHAN_ROWS: Math.floor(Math.random()*500) }));

        // Schema drift (latest 50 changes)
        this.data.schemaDrift = Array.from({length:50}).map(() => ({
            CHANGE_DATE: new Date(Date.now()-Math.floor(Math.random()*30)*86400000),
            CHANGE_TYPE: ['ADDED','REMOVED','MODIFIED'][Math.floor(Math.random()*3)],
            TABLE_CATALOG: 'PRODUCTION',
            TABLE_SCHEMA: ['SALES','MARKETING','FINANCE','OPERATIONS'][Math.floor(Math.random()*4)],
            TABLE_NAME: ['CUSTOMERS','ORDERS','PRODUCTS','TRANSACTIONS','USERS'][Math.floor(Math.random()*5)],
            COLUMN_NAME: ['EMAIL','PHONE','ADDRESS','CREATED_AT','UPDATED_AT','STATUS','AMOUNT'][Math.floor(Math.random()*7)],
            DATA_TYPE: ['VARCHAR(255)','INTEGER','TIMESTAMP','BOOLEAN','DECIMAL(10,2)'][Math.floor(Math.random()*5)]
        })).sort((a,b) => b.CHANGE_DATE - a.CHANGE_DATE);

        // OBS_COST_PER_CREDIT
        this.data.costPerCredit = [];
        dates.forEach(date => {
            ['WAREHOUSE_METERING', 'AI_SERVICES', 'SNOWPARK_CONTAINER_SERVICES'].forEach(serviceType => {
                this.data.costPerCredit.push({
                    USAGE_DATE: date,
                    SERVICE_TYPE: serviceType,
                    CREDITS: Math.random() * 50 + 10,
                    SPEND_USD: Math.random() * 50 + 10
                });
            });
        });

        // Minimal successful rows throughput to power Cost/Row efficiency
        // Create a synthetic successful rows series aligned by date
        this.data.successfulRows = [];
        dates.forEach(date => {
            // Simulate some days with no loads to respect the requirement to ignore zero-row days
            const rowsLoaded = Math.random() > 0.15 ? Math.floor(Math.random() * 900000 + 10000) : 0;
            this.data.successfulRows.push({
                RUN_DATE: date,
                ROWS_LOADED: rowsLoaded
            });
        });

        // OBS_CREDITS_BY_WAREHOUSE
        this.data.creditsByWarehouse = [];
        const warehouses = ['DOMO_SINGLE_NODE', 'DOMO_WRITEBACK_WAREHOUSE', 'SALES_INTELLIGENCE_WH', 'AD4_DEMO_SMALL_INDEX'];
        dates.forEach(date => {
            warehouses.forEach(warehouse => {
                if (Math.random() > 0.3) { // Some warehouses don't run every day
                    this.data.creditsByWarehouse.push({
                        WAREHOUSE_NAME: warehouse,
                        USAGE_DATE: date,
                        CREDITS: Math.random() * 10 + 1,
                        SPEND_USD: Math.random() * 10 + 1
                    });
                }
            });
        });

        // OBS_IDLE_ACTIVE_RATIO
        this.data.idleActiveRatio = warehouses.map(warehouse => ({
            WAREHOUSE_NAME: warehouse,
            AVG_RUNNING_LOAD: Math.random() * 0.1,
            AVG_QUEUED_LOAD: Math.random() * 0.01,
            ACTIVE_PCT: Math.random() * 0.3 + 0.7,
            QUEUED_PCT: Math.random() * 0.1
        }));

        // OBS_QUERY_PERFORMANCE
        this.data.queryPerformance = dates.map(date => ({
            USAGE_DATE: date,
            P95_EXEC_SEC: Math.random() * 1 + 0.2,
            AVG_EXEC_SEC: Math.random() * 0.1 + 0.02
        }));

        // OBS_QUERY_FAILURE_RATE
        this.data.queryFailureRate = dates.map(date => {
            const totalQueries = Math.floor(Math.random() * 20000) + 30000;
            const failedQueries = Math.floor(totalQueries * (Math.random() * 0.02 + 0.005));
            return {
                USAGE_DATE: date,
                FAILED_QUERIES: failedQueries,
                TOTAL_QUERIES: totalQueries,
                FAILURE_RATE: failedQueries / totalQueries
            };
        });

        // OBS_WAREHOUSE_EVENTS
        this.data.warehouseEvents = [];
        dates.forEach(date => {
            warehouses.forEach(warehouse => {
                const eventsCount = Math.floor(Math.random() * 5);
                for (let i = 0; i < eventsCount; i++) {
                    const eventTime = new Date(date.getTime() + Math.random() * 24 * 60 * 60 * 1000);
                    this.data.warehouseEvents.push({
                        EVENT_TS: eventTime,
                        WAREHOUSE_NAME: warehouse,
                        EVENT_NAME: ['SUSPEND_WAREHOUSE', 'RESUME_WAREHOUSE', 'RESIZE_WAREHOUSE'][Math.floor(Math.random() * 3)],
                        EVENT_REASON: ['WAREHOUSE_AUTOSUSPEND', 'WAREHOUSE_AUTORESUME', 'USER_REQUEST'][Math.floor(Math.random() * 3)],
                        EVENT_STATE: 'STARTED'
                    });
                }
            });
        });

        // OBS_DOMO_CONNECTOR_HEALTH
        const connectors = ['Raidar Accounts', 'SALESFORCE.ACCOUNTS.WILDCAT', 'rootCauseRecord', 'forecastRecord'];
        this.data.connectorHealth = [];
        dates.forEach(date => {
            connectors.forEach(connector => {
                this.data.connectorHealth.push({
                    RUN_DATE: date,
                    CONNECTOR: connector,
                    SUCCESS_PCT: Math.random() * 0.1 + 0.9,
                    SLA_BREACHES: Math.floor(Math.random() * 10),
                    AVG_RUNTIME_SEC: Math.random() * 3600 + 30
                });
            });
        });

        // OBS_DOMO_DATA_FRESHNESS
        this.data.dataFreshness = [
            { DATASET: 'SALESFORCE.ACCOUNTS.WILDCAT', HOURS_SINCE_LAST_RUN: Math.floor(Math.random() * 48) },
            { DATASET: 'SNOWFLAKE.SALESFORCE.ACCOUNT.COBRA', HOURS_SINCE_LAST_RUN: Math.floor(Math.random() * 24) },
            { DATASET: 'Raidar Accounts', HOURS_SINCE_LAST_RUN: Math.floor(Math.random() * 72) },
            { DATASET: 'forecastRecord', HOURS_SINCE_LAST_RUN: Math.floor(Math.random() * 400) },
            { DATASET: 'rootCauseRecord', HOURS_SINCE_LAST_RUN: Math.floor(Math.random() * 400) }
        ];

        // OBS_RECORD_FRESHNESS (per-day source → warehouse lag by dataset)
        const freshnessDatasets = this.data.dataFreshness.map(d => d.DATASET);
        this.data.recordFreshness = [];
        dates.forEach(date => {
            freshnessDatasets.forEach(ds => {
                const hoursBehind = Math.max(0, Math.round(Math.random() * 72));
                const sourceTs = new Date(date.getTime() - hoursBehind * 60 * 60 * 1000);
                this.data.recordFreshness.push({
                    DATASET: ds,
                    AS_OF_DATE: date,
                    MAX_SOURCE_TS: sourceTs,
                    HOURS_BEHIND_NOW: hoursBehind
                });
            });
        });



        // OBS_DATASET_CREDIT_COST
        this.data.datasetCreditCost = [
            { DATASET_NAME: 'HHS_NPI_Registry', CREDITS: 0.00718, COST_USD: 0.00718 },
            { DATASET_NAME: 'Transaction Fraud Recommendation', CREDITS: 0.03666, COST_USD: 0.03666 },
            { DATASET_NAME: 'AI Chat Sessions', CREDITS: 0.00537, COST_USD: 0.00537 },
            { DATASET_NAME: 'AI Services', CREDITS: 0.013536, COST_USD: 0.013536 },
            { DATASET_NAME: 'SNOWFLAKE.SALESFORCE.ACCOUNT.COBRA', CREDITS: 1.354891, COST_USD: 1.354891 }
        ].map(item => ({
            ...item,
            CREDITS: item.CREDITS * (0.5 + Math.random()),
            COST_USD: item.COST_USD * (0.5 + Math.random())
        }));

        // OBS_COST_VS_UTILIZATION - using same dataset names as cost data
        this.data.costVsUtilization = [
            'HHS_NPI_Registry', 'Transaction Fraud Recommendation', 'AI Chat Sessions', 
            'AI Services', 'SNOWFLAKE.SALESFORCE.ACCOUNT.COBRA', 'User_Activity_Events',
            'Salesforce_Connector_Runs', 'Marketing_Campaign_Data', 'Customer_Support_Tickets',
            'Product_Usage_Analytics', 'Financial_Transactions', 'Inventory_Management',
            'Employee_Performance_Data', 'Supply_Chain_Logistics', 'Web_Analytics_Data'
        ].map(dataset => {
            const baseRuns = Math.floor(Math.random() * 50) + 10;
            const baseCost = Math.random() * 15 + 0.5;
            const baseBytesGB = Math.random() * 500 + 10;
            const successPct = Math.random() * 30 + 70; // 70-100% success rate
            
            return {
                DATASET: dataset,
                COST_USD: parseFloat(baseCost.toFixed(2)),
                BYTES_LOADED: Math.floor(baseBytesGB * 1e9), // Convert GB to bytes
                RUNS: baseRuns,
                SUCCESS_PCT: parseFloat(successPct.toFixed(1))
            };
        });

        // OBS_SNOWFLAKE_WAU
        this.data.snowflakeWAU = [
            { ISO_WEEK: 'I25Y-IW30', WAU: 115 },
            { ISO_WEEK: 'I25Y-IW31', WAU: 119 },
            { ISO_WEEK: 'I25Y-IW32', WAU: 123 }
        ];

        // OBS_DOMO_DAILY_BYTES
        this.data.dailyBytes = dates.map(date => ({
            RUN_DATE: date,
            AVG_BYTES_INSERTED: Math.random() * 500000 + 800000
        }));

        // OBS_DOMO_API_ZSCORE - more realistic anomaly patterns
        this.data.apiZscore = dates.map((date, index) => {
            // Most values are in normal range (-2 to +2)
            let zscore = (Math.random() - 0.5) * 4;
            
            // Inject some anomalies (8% chance)
            if (Math.random() < 0.08) {
                zscore = (Math.random() > 0.5 ? 1 : -1) * (2.5 + Math.random() * 2.5);
            }
            
            // Base API calls with some variation
            const baseApiCalls = 2800 + (Math.sin(index * 0.15) * 400);
            const apiCalls = Math.max(1000, Math.round(baseApiCalls + zscore * 200));
            
            return {
            RUN_DATE: date,
                API_CALLS: apiCalls,
                ZSCORE: parseFloat(zscore.toFixed(2))
            };
        });

        // OBS_DOMO_CONNECTOR_RUNS (with derived metrics for slowest runs table)
        this.data.connectorRuns = [];
        dates.forEach(date => {
            connectors.forEach(connector => {
                const runsCount = Math.floor(Math.random() * 5) + 1;
                for (let i = 0; i < runsCount; i++) {
                    const hh = Math.floor(Math.random() * 1); // keep under an hour for realism
                    const mm = Math.floor(Math.random() * 59);
                    const ss = Math.floor(Math.random() * 59);
                    const runTime = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
                    const totalSeconds = hh * 3600 + mm * 60 + ss || Math.floor(Math.random() * 300) + 60;
                    const updatedRows = Math.floor(Math.random() * 20000) + 200;
                    const bytesInserted = Math.floor(Math.random() * 5_000_000) + 50_000;
                    this.data.connectorRuns.push({
                        'Data Source Name': connector,
                        Status: Math.random() > 0.05 ? 'SUCCESS' : 'FAILURE',
                        'Updated Rows': updatedRows,
                        'Bytes Inserted': bytesInserted,
                        'Total API Calls': Math.floor(Math.random() * 50) + 5,
                        'Created At': date,
                        'Run Time': runTime,
                        'Run Time Seconds': totalSeconds,
                        'Rows Per Second': +(updatedRows / totalSeconds).toFixed(2),
                        'Bytes Per Second': +(bytesInserted / totalSeconds).toFixed(2),
                        'Start Time': new Date(date.getTime() - totalSeconds * 1000)
                    });
                }
            });
        });

        // OBS_QUERY_HISTORY_LTD
        this.data.queryHistory = [];
        const queryTypes = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'ALTER_SESSION', 'CREATE'];
        const databases = ['DOMO', 'COBRA_DEMO_DB', 'TEST_DB', 'INTEGRATIONTESTS', 'CLOUD_DATATRANSFORM_DEV3'];
        const queryWarehouses = ['DOMO_SINGLE_NODE', 'DOMO_WRITEBACK_WAREHOUSE', 'SALES_INTELLIGENCE_WH'];
        
        for (let i = 0; i < 700; i++) {
            const queryId = `01bb${Math.random().toString(36).substr(2, 4)}-0613-${Math.random().toString(36).substr(2, 4)}-0000-ad0d3e${Math.random().toString(36).substr(2, 6)}`;
            const queryType = queryTypes[Math.floor(Math.random() * queryTypes.length)];
            const database = databases[Math.floor(Math.random() * databases.length)];
            const warehouse = queryWarehouses[Math.floor(Math.random() * queryWarehouses.length)];
            
            let queryText = '';
            switch (queryType) {
                case 'SELECT':
                    queryText = `SELECT * FROM "${database}"."SCHEMA"."TABLE_${Math.floor(Math.random() * 100)}"`;
                    break;
                case 'INSERT':
                    queryText = `INSERT INTO "${database}"."SCHEMA"."TABLE_${Math.floor(Math.random() * 100)}" VALUES (...)`;
                    break;
                case 'UPDATE':
                    queryText = `UPDATE "${database}"."SCHEMA"."TABLE_${Math.floor(Math.random() * 100)}" SET column = value`;
                    break;
                case 'DELETE':
                    queryText = `DELETE FROM "${database}"."SCHEMA"."TABLE_${Math.floor(Math.random() * 100)}" WHERE condition`;
                    break;
                case 'ALTER_SESSION':
                    queryText = 'ALTER SESSION SET QUERY_TAG = \'{"source":"domo"}\'';
                    break;
                case 'CREATE':
                    queryText = `CREATE TABLE "${database}"."SCHEMA"."NEW_TABLE_${Math.floor(Math.random() * 100)}" AS SELECT...`;
                    break;
            }

            this.data.queryHistory.push({
                QUERY_ID: queryId,
                QUERY_TEXT: queryText,
                DATABASE_NAME: database,
                QUERY_TYPE: queryType,
                WAREHOUSE_NAME: warehouse,
                QUERY_TAG: Math.random() > 0.7 ? `{"datasourceId":"${Math.random().toString(36)}","source":"domo","userId":"${Math.floor(Math.random() * 1000000000)}"}` : null,
                TOTAL_ELAPSED_TIME: Math.floor(this.exponentialRandom() * 5000) + 10 // Exponential distribution for realistic query times
            });
        }

        // Sort by elapsed time for better visualization
        this.data.queryHistory.sort((a, b) => b.TOTAL_ELAPSED_TIME - a.TOTAL_ELAPSED_TIME);
    }

    generateQueryRewriteData() {
        const queryTemplates = [
            {
                orig: `select 
    table_catalog,
    table_schema,
    table_name,
    row_count,
    to_timestamp(convert_timezone('utc', last_altered)) as last_altered,
    table_type
from "datashare_linkup_aws_us_east_1_linkup_dca9bb60".information_schema.tables
where 
    (
        is_transient = 'no'
        or is_transient is null
    )
    and table_type in ('base table', 'view', 'materialized view')
    and table_schema = 'linkup'
    and table_name in (
        'core_ticker_analytics', 'pit_company_reference', 'onet_taxonomy_2019',
        'core_company_analytics', 'job_descriptions', 'job_records', 'company_ticker_reference',
        'company_scrape_log'
    )`,
                rewrite: `SELECT 
    table_catalog,
    table_schema,
    table_name,
    row_count,
    TO_TIMESTAMP(CONVERT_TIMEZONE('UTC', last_altered)) AS last_altered,
    table_type
FROM "datashare_linkup_aws_us_east_1_linkup_dca9bb60".information_schema.tables
WHERE (is_transient = 'NO' OR is_transient IS NULL)
    AND table_type IN ('BASE TABLE', 'VIEW', 'MATERIALIZED VIEW')
    AND table_schema = 'LINKUP'
    AND table_name IN (
        'CORE_TICKER_ANALYTICS',
        'PIT_COMPANY_REFERENCE',
        'ONET_TAXONOMY_2019',
        'CORE_COMPANY_ANALYTICS',
        'JOB_DESCRIPTIONS',
        'JOB_RECORDS',
        'COMPANY_TICKER_REFERENCE',
        'COMPANY_SCRAPE_LOG'
    )
WITH MATERIALIZED VIEW`,
                rationale: "Optimized query structure with proper formatting, uppercase keywords, and added MATERIALIZED VIEW hint for frequently accessed metadata queries. Improved readability and performance."
            },
            {
                orig: `select 
    date_trunc(?, convert_timezone(?, start_time)) as start_time,
    entity_id,
    name,
    service_type,
    sum(credits_used) as credits_used,
    sum(credits_used_compute) as credits_compute,
    sum(credits_used_cloud_services) as credits_cloud
from 
    snowflake.account_usage.metering_history
where
    start_time >= convert_timezone(?, ?, to_timestamp_ltz(?, 'auto'))
    and start_time < convert_timezone(?, ?, to_timestamp_ltz(?, 'auto'))
group by 
    1, 2, 3, 4`,
                rewrite: `SELECT 
    DATE_TRUNC(?, CONVERT_TIMEZONE(?, start_time)) AS start_time,
    entity_id,
    name,
    service_type,
    SUM(credits_used) AS credits_used,
    SUM(credits_used_compute) AS credits_compute,
    SUM(credits_used_cloud_services) AS credits_cloud
FROM SNOWFLAKE.ACCOUNT_USAGE.METERING_HISTORY
WHERE start_time >= CONVERT_TIMEZONE(?, ?, TO_TIMESTAMP_LTZ(?, 'AUTO'))
    AND start_time < CONVERT_TIMEZONE(?, ?, TO_TIMESTAMP_LTZ(?, 'AUTO'))
GROUP BY 1, 2, 3, 4
WITH RESULT_CACHE`,
                rationale: "Enhanced with proper SQL formatting, uppercase keywords, and result caching for frequently accessed account usage data. Improved query plan efficiency and readability."
            },
            {
                orig: `select 
    *
from 
    "datashare_linkup_aws_us_east_1_linkup_dca9bb60".public.diamonds
where 
    price > 5000
    and carat > 1.0
    and cut = 'premium'
order by price desc
limit 100`,
                rewrite: `SELECT 
    carat,
    cut,
    color,
    clarity,
    depth,
    table_pct,
    price,
    x,
    y,
    z
FROM "datashare_linkup_aws_us_east_1_linkup_dca9bb60".public.diamonds
WHERE price > 5000 
    AND carat > 1.0 
    AND cut = 'PREMIUM'
ORDER BY price DESC
LIMIT 100`,
                rationale: "Replaced SELECT * with explicit column selection to reduce data transfer and improve performance. Added proper formatting with uppercase keywords and optimized WHERE clause structure."
            },
            {
                orig: `select customer_id, order_date, total_amount from orders where order_date between '2024-01-01' and '2024-12-31' and status in ('completed', 'shipped') order by order_date`,
                rewrite: `SELECT 
    customer_id,
    order_date,
    total_amount
FROM orders
WHERE order_date BETWEEN '2024-01-01' AND '2024-12-31'
    AND status IN ('COMPLETED', 'SHIPPED')
ORDER BY order_date
WITH INDEX_HINT(idx_order_date_status)`,
                rationale: "Improved formatting with proper indentation and uppercase keywords. Added index hint for better performance on date range and status filtering."
            },
            {
                orig: `select count(*) as total_users, avg(age) as avg_age from users where created_date > dateadd(month, -6, current_date()) and country in ('usa', 'canada') group by country`,
                rewrite: `SELECT 
    country,
    COUNT(*) AS total_users,
    AVG(age) AS avg_age,
    MEDIAN(age) AS median_age
FROM users
WHERE created_date > DATEADD(MONTH, -6, CURRENT_DATE())
    AND country IN ('USA', 'CANADA')
GROUP BY country
ORDER BY total_users DESC`,
                rationale: "Enhanced with better column organization, added median calculation for more comprehensive statistics, and proper sorting. Improved readability with uppercase keywords."
            }
        ];

        this.queryRewriteResults = [];
        
        for (let i = 0; i < 47; i++) {
            const template = queryTemplates[Math.floor(Math.random() * queryTemplates.length)];
            const queryId = `01bb${Math.random().toString(36).substr(2, 4)}-0613-${Math.random().toString(36).substr(2, 4)}-0000-ad0d3e${Math.random().toString(36).substr(2, 6)}`;
            
            // Generate realistic performance metrics
            const baseMs = Math.floor(Math.random() * 15000) + 500; // 500ms to 15.5s
            const improvementFactor = Math.random() * 0.7 + 0.1; // 10% to 80% improvement
            const testMs = Math.floor(baseMs * (1 - improvementFactor));
            const pctMs = parseFloat(((baseMs - testMs) / baseMs * 100).toFixed(1));
            
            const baseBytes = Math.floor(Math.random() * 500000000) + 10000; // 10KB to 500MB
            const bytesImprovementFactor = Math.random() * 0.6 + 0.1; // 10% to 70% improvement
            const testBytes = Math.floor(baseBytes * (1 - bytesImprovementFactor));
            const pctBytes = parseFloat(((baseBytes - testBytes) / baseBytes * 100).toFixed(1));
            
            // Generate credits and savings
            const testCreditsCloud = parseFloat((Math.random() * 2 + 0.1).toFixed(6));
            const estUsdSavings = parseFloat((testCreditsCloud * pctMs / 100).toFixed(2));
            
            // Determine action based on improvement
            let action;
            if (pctMs >= 25) action = 'ADOPT';
            else if (pctMs >= 5) action = 'BENCH_TEST';
            else action = 'IGNORE';
            
            const runDate = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Last 7 days
            
            this.queryRewriteResults.push({
                QUERY_ID: queryId,
                ORIG_SQL: template.orig,
                REWRITE_SQL: template.rewrite,
                BASE_MS: baseMs,
                TEST_MS: testMs,
                PCT_MS: pctMs,
                BASE_BYTES: baseBytes,
                TEST_BYTES: testBytes,
                PCT_BYTES: pctBytes,
                SCORE: parseFloat((pctMs * 0.7 + pctBytes * 0.3).toFixed(1)),
                ACTION: action,
                RUN_DTS: runDate.toISOString(),
                START_TIME: runDate.toISOString(),
                WAREHOUSE_NAME: ['DOMO_SINGLE_NODE', 'DOMO_WRITEBACK_WAREHOUSE', 'SALES_INTELLIGENCE_WH'][Math.floor(Math.random() * 3)],
                USER_NAME: ['analyst@domo.com', 'developer@domo.com', 'admin@domo.com'][Math.floor(Math.random() * 3)],
                BASE_ELAPSED_MS: baseMs,
                BASE_BYTES_SCANNED: baseBytes,
                LLM_RATIONALE: template.rationale,
                LLM_EST_ELAPSED_PCT: Math.floor(pctMs),
                LLM_EST_BYTES_PCT: Math.floor(pctBytes),
                LLM_RISKS: "Low risk optimization. No functional changes to query logic. Thoroughly tested for compatibility.",
                TEST_ELAPSED_MS: testMs,
                TEST_BYTES_SCANNED: testBytes,
                TEST_CREDITS_CLOUD: testCreditsCloud,
                PCT_ELAPSED_IMPR: pctMs,
                PCT_BYTES_IMPR: pctBytes,
                USD_PER_CREDIT: 1,
                EST_USD_SAVINGS: estUsdSavings,
                DECISION: action === 'ADOPT' ? 'RECOMMENDED' : action === 'BENCH_TEST' ? 'EVALUATE' : 'SKIP',
                ERROR_MSG: null,
                PCT_CREDITS_IMPR: pctMs
            });
        }
        
        // Sort by improvement descending
        this.queryRewriteResults.sort((a, b) => b.PCT_MS - a.PCT_MS);
        this.filteredQueries = [...this.queryRewriteResults];
    }

    async loadLiveData() {
        if (typeof domo === 'undefined') {
            console.warn('Domo SDK not available');
            return;
        }

        try {
            const promises = Object.entries(this.datasetAliases).map(async ([key, alias]) => {
                try {
                    const rows = await domo.get(`/data/v1/${alias}`);
                    console.log(`Fetched ${rows.length} rows for ${key}`);
                    return [key, rows];
                } catch (error) {
                    console.error(`Error fetching ${key}:`, error);
                    return [key, []];
                }
            });

            const results = await Promise.all(promises);
            
            results.forEach(([key, data]) => {
                switch(key) {
                    case 'OBS_COST_PER_CREDIT':
                        this.data.costPerCredit = data;
                        break;
                    case 'OBS_CREDITS_BY_WAREHOUSE':
                        this.data.creditsByWarehouse = data;
                        break;
                    case 'OBS_IDLE_ACTIVE_RATIO':
                        this.data.idleActiveRatio = data;
                        break;
                    case 'OBS_QUERY_PERFORMANCE':
                        this.data.queryPerformance = data;
                        break;
                    case 'OBS_QUERY_FAILURE_RATE':
                        this.data.queryFailureRate = data;
                        break;
                    case 'OBS_WAREHOUSE_EVENTS':
                        this.data.warehouseEvents = data;
                        break;
                    case 'OBS_DOMO_CONNECTOR_HEALTH':
                        this.data.connectorHealth = data;
                        break;
                    case 'OBS_DOMO_DATA_FRESHNESS':
                        this.data.dataFreshness = data;
                        break;
                    case 'OBS_DATASET_CREDIT_COST':
                        this.data.datasetCreditCost = data;
                        break;
                    case 'OBS_SNOWFLAKE_WAU':
                        this.data.snowflakeWAU = data;
                        break;
                    case 'OBS_DOMO_DAILY_BYTES':
                        this.data.dailyBytes = data;
                        break;
                    case 'OBS_DOMO_API_ZSCORE':
                        this.data.apiZscore = data;
                        break;
                    case 'OBS_DOMO_CONNECTOR_RUNS':
                        this.data.connectorRuns = data;
                        break;
                    case 'OBS_QUERY_HISTORY_LTD':
                        this.data.queryHistory = data;
                        break;
                    case 'QUERY_REWRITE_RESULTS':
                        this.queryRewriteResults = data;
                        this.filteredQueries = [...data];
                        break;
                    case 'OBS_COST_VS_UTILIZATION':
                        this.data.costVsUtilization = data;
                        break;
                }
            });

        } catch (error) {
            console.error('Error loading live data:', error);
        }
    }

    async toggleDataMode() {
        const button = document.getElementById('dataToggle');
        const modeIndicator = document.getElementById('dataMode');
        button.classList.add('loading');
        
        if (this.isLiveMode) {
            this.isLiveMode = false;
            button.textContent = 'Switch to Live';
            modeIndicator.textContent = 'Mock Data';
            modeIndicator.className = 'px-2 py-1 rounded-full text-xs font-medium bg-orange-500 text-white';
            this.generateMockData();
            this.generateQueryRewriteData();
        } else {
            this.isLiveMode = true;
            button.textContent = 'Switch to Mock';
            modeIndicator.textContent = 'Live Data';
            modeIndicator.className = 'px-2 py-1 rounded-full text-xs font-medium bg-green-500 text-white';
            await this.loadLiveData();
        }
        
        button.classList.remove('loading');
        this.renderDashboard();
        this.generateAlerts();
        this.filterQueries();
    }

    async refreshData() {
        if (this.isLiveMode) {
            await this.loadLiveData();
        } else {
            this.generateMockData();
            this.generateQueryRewriteData();
        }
        this.renderDashboard();
        this.generateAlerts();
        this.filterQueries();
    }

    switchTab(tabName) {
        // Update navigation buttons
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`tab-${tabName}`).classList.add('active');

        // Update page title and description
        const titles = {
            'cost': {
                title: 'Cost & Credits',
                description: 'Monitor spend patterns and resource utilization'
            },
            'performance': {
                title: 'Performance & Reliability',
                description: 'Track query performance and system reliability metrics'
            },
            'pipeline': {
                title: 'Pipeline Health',
                description: 'Monitor connector performance and data freshness'
            },
            'adoption': {
                title: 'Adoption & Utilization',
                description: 'Analyze user engagement and platform adoption'
            },
            'optimization': {
                title: 'AI Query Optimization',
                description: 'Leverage Claude 4 Sonnet to optimize query performance and reduce costs'
            },
            'quality': {
                title: 'Data Quality',
                description: 'Monitor data completeness, accuracy, and consistency across pipelines'
            }
        };

        const pageTitle = document.getElementById('pageTitle');
        const pageDescription = pageTitle.nextElementSibling;
        
        if (titles[tabName]) {
            pageTitle.textContent = titles[tabName].title;
            pageDescription.textContent = titles[tabName].description;
        }

        // Render charts for the active tab
        this.renderTabCharts(tabName);
    }

    // Initialize Monaco Editor
    async initializeMonacoEditor() {
        if (typeof require !== 'undefined') {
            require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.34.1/min/vs' } });
            
            require(['vs/editor/editor.main'], () => {
                // Monaco is loaded and ready
                console.log('Monaco Editor loaded successfully');
            });
        }
    }

    // Create Monaco Editor instance with professional configuration
    createMonacoEditor(container, value, isReadOnly = false) {
        if (typeof monaco === 'undefined') {
            // Fallback to simple textarea if Monaco isn't available
            const textarea = document.createElement('textarea');
            textarea.value = this.formatSQL(value);
            textarea.readOnly = isReadOnly;
            textarea.className = 'w-full h-full font-mono border-0 resize-none focus:outline-none';
            textarea.style.backgroundColor = isReadOnly ? '#f9fafb' : '#22262e';
            textarea.style.color = isReadOnly ? '#374151' : '#d4d4d4';
            textarea.style.fontSize = '10px';
            textarea.style.lineHeight = '1.3';
            textarea.style.padding = '12px';
            textarea.style.height = '280px';
            textarea.style.fontFamily = 'JetBrains Mono, Fira Code, Monaco, Consolas, monospace';
            container.appendChild(textarea);
            return {
                getValue: () => textarea.value,
                setValue: (val) => { textarea.value = this.formatSQL(val); },
                dispose: () => { textarea.remove(); },
                getAction: (id) => ({ run: () => {} })
            };
        }

        const formattedValue = this.formatSQL(value);
        
        // Create custom theme for the editor
        monaco.editor.defineTheme('customDark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'keyword.sql', foreground: 'd8c462' },
                { token: 'string.sql', foreground: '7ebc65' },
                { token: 'comment', foreground: '6b7280' },
                { token: 'number', foreground: 'd02666' },
                { token: 'operator.sql', foreground: '00bda3' },
                { token: 'identifier', foreground: 'ffffff' },
                { token: 'delimiter', foreground: '9841b6' }
            ],
            colors: {
                'editor.background': '#22262e',
                'editor.foreground': '#ffffff',
                'editor.lineHighlightBackground': '#d8c46205',
                'editor.selectionBackground': '#9841b620',
                'editorCursor.foreground': '#d8c462',
                'editorLineNumber.foreground': '#6b7280',
                'editorLineNumber.activeForeground': '#d8c462'
            }
        });
        
        const editor = monaco.editor.create(container, {
            value: formattedValue,
            language: 'sql',
            theme: isReadOnly ? (this.isDarkMode ? 'vs-dark' : 'vs') : 'customDark',
            readOnly: isReadOnly,
            minimap: { 
                enabled: false
            },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            lineNumbers: 'on',
            fontSize: 10,
            lineHeight: 13,
            fontFamily: 'JetBrains Mono, Fira Code, Monaco, Consolas, monospace',
            fontLigatures: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: true,
            smoothScrolling: true,
            folding: true,
            foldingStrategy: 'indentation',
            showFoldingControls: 'always',
            unfoldOnClickAfterEndOfLine: true,
            contextmenu: true,
            mouseWheelZoom: true,
            quickSuggestions: {
                other: true,
                comments: false,
                strings: false
            },
            parameterHints: {
                enabled: true,
                cycle: true
            },
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
            tabCompletion: 'on',
            wordBasedSuggestions: true,
            snippetSuggestions: 'inline',
            selectOnLineNumbers: true,
            roundedSelection: false,
            renderWhitespace: 'selection',
            renderControlCharacters: false,
            renderIndentGuides: true,
            renderLineHighlight: 'line',
            codeLens: true,
            hideCursorInOverviewRuler: false,
            scrollbar: {
                useShadows: false,
                verticalHasArrows: false,
                horizontalHasArrows: false,
                vertical: 'visible',
                horizontal: 'visible',
                verticalScrollbarSize: 6,
                horizontalScrollbarSize: 6,
                arrowSize: 30
            },
            padding: {
                top: 24,
                bottom: 8
            }
        });

        // Set the container height
        container.style.height = '280px';
        editor.layout();

        // Add format document command
        editor.addAction({
            id: 'format-sql',
            label: 'Format SQL',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF],
            precondition: null,
            keybindingContext: null,
            contextMenuGroupId: 'modification',
            contextMenuOrder: 1.5,
            run: (ed) => {
                const currentValue = ed.getValue();
                const formatted = this.formatSQL(currentValue);
                ed.setValue(formatted);
            }
        });

        return editor;
    }

    // Bee Swarm Chart Implementation
    createBeeSwarm(data, options) {
        if (typeof Plot === 'undefined' || typeof d3 === 'undefined') {
            console.warn('Plot or d3 not available for bee swarm chart');
            return null;
        }

        try {
            const gap = options.gap != null ? options.gap : 1;
            const ticks = options.ticks != null ? options.ticks : 50;
            
            const dots = Plot.dot(data, options);
            const render = dots.render;
            const self = this;
            
            dots.render = function () {
                const g = render.apply(this, arguments);
                const circles = d3.select(g).selectAll("circle");
                circles.attr('class', 'point');

                const nodes = [];
                const [cx, cy, x, y, forceX, forceY] =
                    options.direction === "x"
                        ? ["cx", "cy", "x", "y", d3.forceX, d3.forceY]
                        : ["cy", "cx", "y", "x", d3.forceY, d3.forceX];
                        
                for (const c of circles) {
                    nodes.push({
                        x: +c.getAttribute(cx),
                        y: +c.getAttribute(cy),
                        r: +c.getAttribute("r")
                    });
                }
                
                if (options.dynamic) {
                    const update = function() {
                        circles.attr(cx, (_, i) => nodes[i].x).attr(cy, (_, i) => nodes[i].y);
                    };
                    
                    const force = d3
                        .forceSimulation(nodes)
                        .force("x", forceX((d) => d[x]).strength(0.8))
                        .force("y", forceY((d) => d[y]).strength(0.05))
                        .force(
                            "collide",
                            d3.forceCollide()
                                .radius((d) => d.r + gap)
                                .iterations(3)
                        )
                        .tick(ticks)
                        .stop();
                        
                    update();
                    force.on("tick", update).restart();
                }
                
                circles.on("click", function(ev, index) {
                    self.selectQueryPoint(ev, data[index], circles);
                });

                // Don't auto-select first point - wait for user interaction
                
                return g;
            };
            
            return dots;
        } catch (error) {
            console.error('Error in createBeeSwarm:', error);
            return null;
        }
    }

    selectQueryPoint(ev, row, circles) {
        const selectedClass = 'selected';
        const point = ev.target;
        const pointSize = 4;
        
        // Remove selection from all points
        circles.each(function() {
            this.classList.remove(selectedClass);
            this.setAttribute('r', pointSize);
        });
        
        // Select current point
        point.classList.add(selectedClass);
        point.setAttribute('r', pointSize * 1.5);
        point.parentElement.appendChild(point);

        this.showQueryDetails(row);
    }

    showQueryDetails(queryData) {
        const modal = document.getElementById('queryModal');
        const detailsContainer = document.getElementById('queryDetails');
        
        detailsContainer.innerHTML = '';
        
        const details = [
            { label: 'Query ID', value: queryData.QUERY_ID },
            { label: 'Execution Time', value: `${queryData.TOTAL_ELAPSED_TIME}ms` },
            { label: 'Query Type', value: queryData.QUERY_TYPE },
            { label: 'Database', value: queryData.DATABASE_NAME },
            { label: 'Warehouse', value: queryData.WAREHOUSE_NAME },
            { label: 'Query Text', value: queryData.QUERY_TEXT }
        ];
        
        details.forEach(detail => {
            const detailDiv = document.createElement('div');
            detailDiv.className = 'mb-4';
            
            const label = document.createElement('label');
            label.className = 'block text-sm font-semibold text-gray-700 mb-1';
            label.textContent = detail.label;
            
            const value = document.createElement('div');
            if (detail.label === 'Query Text') {
                value.className = 'text-sm text-gray-900 bg-gray-50 p-3 rounded-lg font-mono max-h-32 overflow-y-auto';
            } else {
                value.className = 'text-sm text-gray-900';
            }
            value.textContent = detail.value || 'N/A';
            
            detailDiv.appendChild(label);
            detailDiv.appendChild(value);
            detailsContainer.appendChild(detailDiv);
        });
        
        modal.classList.remove('hidden');
    }

    closeModal() {
        const modal = document.getElementById('queryModal');
        modal.classList.add('hidden');
    }

    renderQuerySwarmChart() {
        if (!this.data.queryHistory || this.data.queryHistory.length === 0) {
            console.warn('No query history data available');
            return;
        }

        // Check if required libraries are loaded
        if (typeof Plot === 'undefined' || typeof d3 === 'undefined') {
            console.warn('Plot or d3 libraries not loaded, skipping bee swarm chart');
            const container = document.getElementById('querySwarmChart');
            if (container) {
                container.innerHTML = '<div class="flex items-center justify-center h-64 text-gray-500"><p>Chart libraries loading...</p></div>';
            }
            return;
        }

        const container = document.getElementById('querySwarmChart');
        if (!container) return;
        
        // Clear previous chart
        container.innerHTML = '';
        
        // Prepare data for bee swarm
        const swarmData = this.data.queryHistory.slice(0, 500); // Limit for performance
        
        try {
            const beeSwarmMark = this.createBeeSwarm(swarmData, {
                x: (d) => d.TOTAL_ELAPSED_TIME,
                fill: (d) => d.TOTAL_ELAPSED_TIME,
                r: 4,
                gap: 0.5,
                ticks: 2,
                dynamic: true,
                title: (d) => `${d.QUERY_TYPE}: ${d.TOTAL_ELAPSED_TIME}ms`
            });

            if (!beeSwarmMark) {
                throw new Error('Failed to create bee swarm mark');
            }

            const chart = Plot.plot({
                marks: [beeSwarmMark],
                color: {
                    type: "linear",
                    range: ["#249EDC", "#A62A92"],
                    interpolate: "hsl",
                    legend: true,
                    label: "Execution Time (ms) →"
                },
                height: 300,
                width: container.offsetWidth - 40,
                marginLeft: 50,
                marginRight: 50,
                marginTop: 20,
                marginBottom: 60
            });
            
            container.appendChild(chart);
            this.querySwarmChart = chart;
        } catch (error) {
            console.error('Error creating bee swarm chart:', error);
            container.innerHTML = '<div class="flex items-center justify-center h-64 text-gray-500"><p>Interactive chart unavailable - using fallback</p></div>';
            
            // Fallback: Simple scatter plot using ApexCharts
            this.renderFallbackQueryChart(container, swarmData);
        }
    }

    // Fallback chart using ApexCharts
    renderFallbackQueryChart(container, data) {
        container.innerHTML = '<div id="fallbackQueryChart" style="height: 300px;"></div>';
        
        const chartData = data.map((item, index) => ({
            x: item.TOTAL_ELAPSED_TIME,
            y: Math.random() * 10, // Random y-position for scatter effect
            queryData: item
        }));

        const fallbackChart = new ApexCharts(document.getElementById('fallbackQueryChart'), {
            series: [{
                name: 'Query Performance',
                data: chartData
            }],
            chart: {
                type: 'scatter',
                height: 300,
                fontFamily: 'Inter, sans-serif',
                events: {
                    markerClick: (event, chartContext, { dataPointIndex }) => {
                        this.showQueryDetails(chartData[dataPointIndex].queryData);
                    }
                }
            },
            xaxis: {
                title: { text: 'Execution Time (ms)', style: { color: '#6b7280' } },
                labels: { style: { colors: '#6b7280', fontSize: '12px' } }
            },
            yaxis: {
                show: false
            },
            colors: ['#56CCF2'],
            markers: {
                size: 6,
                strokeWidth: 2,
                strokeColors: '#ffffff',
                hover: { size: 8 }
            },
            grid: { strokeDashArray: 3, borderColor: '#e5e7eb' },
            tooltip: {
                custom: ({ dataPointIndex }) => {
                    const item = chartData[dataPointIndex].queryData;
                    return `<div class="p-3">
                        <div class="font-semibold">${item.QUERY_TYPE}</div>
                        <div class="text-sm">${item.TOTAL_ELAPSED_TIME}ms</div>
                        <div class="text-xs text-gray-500">${item.DATABASE_NAME}</div>
                    </div>`;
                }
            }
        });

        fallbackChart.render();
    }

    renderDashboard() {
        this.updateKPIs();
        this.renderTabCharts('cost'); // Default tab
        
        // Ensure cost tab is active on initial load
        const activeTab = document.querySelector('.nav-item.active');
        if (!activeTab || activeTab.dataset.tab !== 'cost') {
            this.switchTab('cost');
        }
    }

    updateKPIs() {
        // Cost & Credits KPIs
        const totalSpend = this.data.costPerCredit.reduce((sum, item) => sum + item.SPEND_USD, 0);
        document.getElementById('totalSpend').textContent = `$${totalSpend.toFixed(2)}`;

        const avgCredits = this.data.costPerCredit.reduce((sum, item) => sum + item.CREDITS, 0) / this.currentDateRange;
        document.getElementById('avgCredits').textContent = avgCredits.toFixed(1);

        const activeWarehouses = new Set(this.data.creditsByWarehouse.map(item => item.WAREHOUSE_NAME)).size;
        document.getElementById('activeWarehouses').textContent = activeWarehouses;

        const avgActiveRatio = this.data.idleActiveRatio.reduce((sum, item) => sum + item.ACTIVE_PCT, 0) / this.data.idleActiveRatio.length;
        document.getElementById('efficiencyScore').textContent = `${(avgActiveRatio * 100).toFixed(1)}%`;

        // Performance KPIs
        const avgP95 = this.data.queryPerformance.reduce((sum, item) => sum + item.P95_EXEC_SEC, 0) / this.data.queryPerformance.length;
        document.getElementById('p95QueryTime').textContent = `${avgP95.toFixed(2)}s`;

        const avgFailureRate = this.data.queryFailureRate.reduce((sum, item) => sum + item.FAILURE_RATE, 0) / this.data.queryFailureRate.length;
        document.getElementById('queryFailureRate').textContent = `${(avgFailureRate * 100).toFixed(1)}%`;

        const todayEvents = this.data.warehouseEvents.filter(event => {
            const today = new Date();
            const eventDate = new Date(event.EVENT_TS);
            return eventDate.toDateString() === today.toDateString();
        }).length;
        document.getElementById('warehouseEvents').textContent = todayEvents;

        document.getElementById('loadEfficiency').textContent = `${(avgActiveRatio * 100).toFixed(1)}%`;

        // Pipeline KPIs
        const avgConnectorSuccess = this.data.connectorHealth.reduce((sum, item) => sum + item.SUCCESS_PCT, 0) / this.data.connectorHealth.length;
        document.getElementById('connectorSuccess').textContent = `${(avgConnectorSuccess * 100).toFixed(1)}%`;

        const totalSLABreaches = this.data.connectorHealth.reduce((sum, item) => sum + item.SLA_BREACHES, 0);
        document.getElementById('slaBreaches').textContent = totalSLABreaches;

        const staleDatasets = this.data.dataFreshness.filter(item => item.HOURS_SINCE_LAST_RUN > 24).length;
        document.getElementById('staleDatasets').textContent = staleDatasets;

        const avgDailyBytes = this.data.dailyBytes.reduce((sum, item) => sum + item.AVG_BYTES_INSERTED, 0) / this.data.dailyBytes.length;
        document.getElementById('dailyBytes').textContent = Math.round(avgDailyBytes / 1048576); // Convert to MB

        // Adoption KPIs
        const latestWAU = this.data.snowflakeWAU[this.data.snowflakeWAU.length - 1]?.WAU || 0;
        document.getElementById('weeklyActiveUsers').textContent = latestWAU;

        document.getElementById('activeDatasets').textContent = this.data.datasetCreditCost.length;

        const activeConnectors = new Set(this.data.connectorHealth.map(item => item.CONNECTOR)).size;
        document.getElementById('activeConnectors').textContent = activeConnectors;

        const costPerUser = totalSpend / latestWAU;
        document.getElementById('costPerUser').textContent = `$${costPerUser.toFixed(2)}`;

        // Query Optimization KPIs
        if (this.queryRewriteResults.length > 0) {
            document.getElementById('totalQueriesAnalyzed').textContent = this.queryRewriteResults.length;
            
            const avgImprovement = this.queryRewriteResults
                .filter(q => q.ACTION !== 'IGNORE')
                .reduce((sum, q) => sum + q.PCT_MS, 0) / 
                this.queryRewriteResults.filter(q => q.ACTION !== 'IGNORE').length;
            document.getElementById('avgPerformanceImprovement').textContent = `${avgImprovement.toFixed(1)}%`;
            
            const totalSavings = this.queryRewriteResults
                .filter(q => q.ACTION === 'ADOPT')
                .reduce((sum, q) => sum + q.EST_USD_SAVINGS, 0);
            document.getElementById('estimatedCreditsSaved').textContent = totalSavings.toFixed(1);
            
            const adoptionRate = this.queryRewriteResults.filter(q => q.ACTION === 'ADOPT').length / 
                                this.queryRewriteResults.length * 100;
            document.getElementById('adoptionRate').textContent = `${adoptionRate.toFixed(1)}%`;
        }
    }

    renderTabCharts(tabName) {
        switch(tabName) {
            case 'cost':
                this.renderCostCharts();
                break;
            case 'performance':
                this.renderPerformanceCharts();
                break;
            case 'pipeline':
                this.renderPipelineCharts();
                break;
            case 'adoption':
                this.renderAdoptionCharts();
                break;
            case 'quality':
                this.renderQualityCharts();
                break;
            case 'optimization':
                this.renderOptimizationCharts();
                break;
        }
    }

    renderOptimizationCharts() {
        // Performance Improvement Distribution - Compact
        const improvementRanges = [
            { range: '0-10%', count: 0 },
            { range: '10-25%', count: 0 },
            { range: '25-50%', count: 0 },
            { range: '50-75%', count: 0 },
            { range: '75%+', count: 0 }
        ];

        this.queryRewriteResults.forEach(query => {
            const improvement = query.PCT_MS;
            if (improvement < 10) improvementRanges[0].count++;
            else if (improvement < 25) improvementRanges[1].count++;
            else if (improvement < 50) improvementRanges[2].count++;
            else if (improvement < 75) improvementRanges[3].count++;
            else improvementRanges[4].count++;
        });

        this.charts.improvementDistributionChart = new ApexCharts(document.querySelector("#improvementDistributionChart"), {
            series: [{
                name: 'Queries',
                data: improvementRanges.map(range => range.count)
            }],
            chart: {
                type: 'bar',
                height: 140,
                fontFamily: 'Inter, sans-serif',
                toolbar: { show: false }
            },
            xaxis: {
                categories: improvementRanges.map(range => range.range),
                labels: { 
                    style: { colors: this.isDarkMode ? '#9ca3af' : '#6b7280', fontSize: '9px' }
                }
            },
            yaxis: {
                labels: { 
                    style: { colors: this.isDarkMode ? '#9ca3af' : '#6b7280', fontSize: '9px' }
                }
            },
            colors: ['#56CCF2'],
            plotOptions: {
                bar: {
                    borderRadius: 2,
                    dataLabels: { position: 'top' }
                }
            },
            dataLabels: { 
                enabled: true,
                style: { fontSize: '9px', colors: [this.isDarkMode ? '#e5e7eb' : '#374151'] }
            },
            grid: { 
                strokeDashArray: 3, 
                borderColor: this.isDarkMode ? '#374151' : '#e5e7eb',
                show: true
            },
            theme: {
                mode: this.isDarkMode ? 'dark' : 'light'
            }
        });
        this.charts.improvementDistributionChart.render();

        // Action Breakdown - Compact
        const actionCounts = {
            ADOPT: this.queryRewriteResults.filter(q => q.ACTION === 'ADOPT').length,
            BENCH_TEST: this.queryRewriteResults.filter(q => q.ACTION === 'BENCH_TEST').length,
            IGNORE: this.queryRewriteResults.filter(q => q.ACTION === 'IGNORE').length
        };

        this.charts.actionBreakdownChart = new ApexCharts(document.querySelector("#actionBreakdownChart"), {
            series: Object.values(actionCounts),
            chart: {
                type: 'donut',
                height: 140,
                fontFamily: 'Inter, sans-serif'
            },
            labels: Object.keys(actionCounts),

            colors: ['#95CBEE', '#A62A92', '#9ca3af'], 
            plotOptions: {
                pie: {
                    donut: {
                        size: '60%',
                        labels: {
                            show: true,
                            total: {
                                show: true,
                                label: 'Total',
                                formatter: () => this.queryRewriteResults.length.toString(),
                                style: {
                                    fontSize: '11px',
                                    color: this.isDarkMode ? '#e5e7eb' : '#374151'
                                }
                            }
                        }
                    }
                }
            },
            dataLabels: {
                enabled: true,
                formatter: (val) => `${val.toFixed(0)}%`,
                style: {
                    fontSize: '9px',
                    colors: [this.isDarkMode ? '#e5e7eb' : '#374151']
                }
            },
            legend: { 
                show: false
            },
            theme: {
                mode: this.isDarkMode ? 'dark' : 'light'
            }
        });
        this.charts.actionBreakdownChart.render();

        // Savings Over Time - Compact
        const savingsByDate = {};
        this.queryRewriteResults.forEach(query => {
            const date = new Date(query.RUN_DTS).toISOString().split('T')[0];
            if (!savingsByDate[date]) savingsByDate[date] = 0;
            if (query.ACTION === 'ADOPT') {
                savingsByDate[date] += query.EST_USD_SAVINGS;
            }
        });

        const sortedDates = Object.keys(savingsByDate).sort();
        
        this.charts.savingsOverTimeChart = new ApexCharts(document.querySelector("#savingsOverTimeChart"), {
            series: [{
                name: 'Est. Savings',
                data: sortedDates.map(date => ({
                    x: date,
                    y: savingsByDate[date]
                }))
            }],
            chart: {
                type: 'area',
                height: 140,
                fontFamily: 'Inter, sans-serif',
                toolbar: { show: false }
            },
            stroke: { curve: 'smooth', width: 2 },
            colors: ['#9841b6'],
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.7,
                    opacityTo: 0.3,
                    stops: [0, 90, 100]
                }
            },
            dataLabels: { enabled: false },
            grid: { 
                strokeDashArray: 3, 
                borderColor: this.isDarkMode ? '#374151' : '#e5e7eb',
                show: true
            },
            xaxis: {
                type: 'datetime',
                labels: { 
                    style: { colors: this.isDarkMode ? '#9ca3af' : '#6b7280', fontSize: '9px' }
                }
            },
            yaxis: {
                labels: { 
                    style: { colors: this.isDarkMode ? '#9ca3af' : '#6b7280', fontSize: '9px' },
                    formatter: (val) => `${val.toFixed(0)}`
                }
            },
            theme: {
                mode: this.isDarkMode ? 'dark' : 'light'
            }
        });
        this.charts.savingsOverTimeChart.render();
    }

    renderCostCharts() {
        // Daily Credits by Service Type (Full Width Stacked Area)
        const creditsByService = this.aggregateByServiceType();
        this.charts.creditsChart = new ApexCharts(document.querySelector("#creditsChart"), {
            series: creditsByService.series,
            chart: { 
                type: 'area', 
                height: 320, 
                stacked: true, 
                animations: { enabled: true },
                toolbar: { show: false },
                fontFamily: 'Inter, sans-serif'
            },
            xaxis: { 
                categories: creditsByService.categories,
                labels: { style: { colors: '#6b7280', fontSize: '12px' } }
            },
            yaxis: {
                labels: { style: { colors: '#6b7280', fontSize: '12px' } }
            },
            colors: ['#56CCF2', '#2F80ED', '#1E3A8A', '#3730A3', '#4C1D95'],
            stroke: { curve: 'smooth', width: 2 },
            fill: { 
                opacity: 0.8,
                type: 'gradient',
                gradient: {
                    opacityFrom: 0.6,
                    opacityTo: 0.8,
                }
            },
            dataLabels: { enabled: false },
            grid: { strokeDashArray: 3, borderColor: '#e5e7eb' },
            legend: { 
                position: 'top',
                horizontalAlign: 'right',
                labels: { colors: '#374151' }
            }
        });
        this.charts.creditsChart.render();

        // Warehouse Cost Distribution (Treemap)
        const warehouseCosts = this.aggregateWarehouseCosts();
        this.charts.warehouseTreemap = new ApexCharts(document.querySelector("#warehouseTreemap"), {
            series: [{ data: warehouseCosts }],
            chart: { 
                type: 'treemap', 
                height: 320,
                fontFamily: 'Inter, sans-serif'
            },
            colors: ['#56CCF2'],
            plotOptions: {
                treemap: {
                    enableShades: true,
                    shadeIntensity: 0.5,
                    reverseNegativeShade: true,
                    colorScale: {
                        ranges: [{
                            from: 0,
                            to: 50,
                            color: '#bfdbfe'
                        }, {
                            from: 50,
                            to: 100,
                            color: '#56CCF2'
                        }, {
                            from: 100,
                            to: 200,
                            color: '#2F80ED'
                        }]
                    }
                }
            },
            dataLabels: {
                enabled: true,
                style: { fontSize: '12px', fontWeight: 600 }
            }
        });
        this.charts.warehouseTreemap.render();

        // Warehouse Utilization (Horizontal Bar)
        this.charts.utilizationChart = new ApexCharts(document.querySelector("#utilizationChart"), {
            series: [{
                name: 'Active %',
                data: this.data.idleActiveRatio.map(item => (item.ACTIVE_PCT * 100).toFixed(1))
            }, {
                name: 'Queued %',
                data: this.data.idleActiveRatio.map(item => (item.QUEUED_PCT * 100).toFixed(1))
            }],
            chart: { 
                type: 'bar', 
                height: 320,
                fontFamily: 'Inter, sans-serif'
            },
            plotOptions: { 
                bar: { 
                    horizontal: true,
                    barHeight: '70%',
                    dataLabels: { position: 'top' }
                } 
            },
            xaxis: { 
                categories: this.data.idleActiveRatio.map(item => item.WAREHOUSE_NAME),
                labels: { style: { colors: '#6b7280', fontSize: '11px' } }
            },
            yaxis: {
                labels: { style: { colors: '#6b7280', fontSize: '11px' } }
            },
            colors: ['#A62A92', '#259EDC'],
            dataLabels: { enabled: false },
            grid: { strokeDashArray: 3, borderColor: '#e5e7eb' },
            legend: { 
                position: 'top',
                horizontalAlign: 'right',
                labels: { colors: '#374151' }
            }
        });
        this.charts.utilizationChart.render();

        // Dataset Cost Table
        this.renderDatasetCostTable();

        // Cost per Successful Row (Efficiency)
        // Ensure this chart renders alongside other Cost & Credits visuals
        this.renderCostPerRowLine();
    }

    // Cost efficiency = total spend / total successful rows, by day
    renderCostPerRowLine() {
        try {
            const costsByDate = {};
            (this.data.costPerCredit || []).forEach(item => {
                const key = new Date(item.USAGE_DATE).toISOString().split('T')[0];
                costsByDate[key] = (costsByDate[key] || 0) + (item.SPEND_USD || 0);
            });

            const rowsByDate = {};
            (this.data.successfulRows || []).forEach(item => {
                const key = new Date(item.RUN_DATE).toISOString().split('T')[0];
                rowsByDate[key] = (rowsByDate[key] || 0) + (item.ROWS_LOADED || 0);
            });

            const allDates = Array.from(new Set([
                ...Object.keys(costsByDate),
                ...Object.keys(rowsByDate)
            ])).sort();

            const seriesData = allDates
                .filter(d => rowsByDate[d] > 0)
                .map(d => ({
                    x: d,
                    y: costsByDate[d] / rowsByDate[d],
                    cost: costsByDate[d] || 0,
                    rows: rowsByDate[d] || 0
                }));

            // Guard: if we still have no points, show friendly empty state
            if (!seriesData.length) {
                const el = document.querySelector('#costPerRowLine');
                if (el) {
                    el.innerHTML = '<div class="h-full flex items-center justify-center text-gray-500">No cost/row data for the selected period</div>';
                }
                return;
            }

            const chart = new ApexCharts(document.querySelector('#costPerRowLine'), {
                series: [{ name: 'Cost per Row ($)', data: seriesData }],
                chart: { type: 'line', height: 320, fontFamily: 'Inter, sans-serif', toolbar: { show: false } },
                stroke: { curve: 'smooth', width: 3 },
                markers: { size: 4 },
                xaxis: { type: 'datetime', labels: { style: { colors: '#6b7280', fontSize: '12px' } } },
                yaxis: {
                    title: { text: 'Cost per Row ($)', style: { color: '#6b7280' } },
                    labels: { style: { colors: '#6b7280', fontSize: '12px' }, formatter: v => '$' + (v ?? 0).toFixed(4) }
                },
                colors: ['#259EDC'],
                fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.9, stops: [0, 90, 100] } },
                dataLabels: { enabled: false },
                grid: { strokeDashArray: 3, borderColor: '#e5e7eb' },
                legend: { position: 'top', horizontalAlign: 'right', labels: { colors: '#374151' } },
                tooltip: {
                    custom: ({ dataPointIndex }) => {
                        const d = seriesData[dataPointIndex];
                        if (!d) return '';
                        return `\
<div class="p-3">\
  <div class="font-medium">${new Date(d.x).toLocaleDateString()}</div>\
  <div class="text-sm text-gray-600 mt-1">\
    Total Cost: $${(d.cost || 0).toLocaleString()}<br/>\
    Total Rows: ${(d.rows || 0).toLocaleString()}<br/>\
    Cost per Row: $${(d.y || 0).toFixed(4)}\
  </div>\
</div>`;
                    }
                }
            });
            chart.render();
            this.charts.costPerRowLine = chart;
        } catch (err) {
            console.error('Error rendering Cost per Row chart:', err);
            const el = document.querySelector('#costPerRowLine');
            if (el) {
                el.innerHTML = '<div class="h-full flex items-center justify-center text-gray-500">Error rendering chart</div>';
            }
        }
    }

    renderPerformanceCharts() {
        // P95 Query Duration Trend (Full Width)
        this.charts.queryPerformanceChart = new ApexCharts(document.querySelector("#queryPerformanceChart"), {
            series: [{
                name: 'P95 Execution Time',
                data: this.data.queryPerformance.map(item => ({
                    x: item.USAGE_DATE,
                    y: item.P95_EXEC_SEC
                }))
            }],
            chart: { 
                type: 'line', 
                height: 320,
                fontFamily: 'Inter, sans-serif',
                toolbar: { show: false }
            },
            stroke: { curve: 'smooth', width: 3 },
            colors: ['#56CCF2'],
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.7,
                    opacityTo: 0.9,
                    stops: [0, 90, 100]
                }
            },
            dataLabels: { enabled: false },
            grid: { strokeDashArray: 3, borderColor: '#e5e7eb' },
            xaxis: { type: 'datetime', labels: { style: { colors: '#6b7280', fontSize: '12px' } } },
            yaxis: { title: { text: 'Seconds', style: { color: '#6b7280' } }, labels: { style: { colors: '#6b7280', fontSize: '12px' } } },
            annotations: { yaxis: [{ y: 1.0, borderColor: '#f59e0b', borderWidth: 2, strokeDashArray: 5, label: { text: 'SLA Threshold (1.0s)', style: { color: '#259EDC', background: '#fef3c7' } } }] }
        });
        this.charts.queryPerformanceChart.render();

        // Throughput Trend Evolution (Rows/sec & Bytes/sec)
        this.renderThroughputTrendChart();

        // Query Failure Rate Trend
        this.charts.failureRateChart = new ApexCharts(document.querySelector("#failureRateChart"), {
            series: [{ name: 'Failure Rate %', data: this.data.queryFailureRate.map(item => ({ x: item.USAGE_DATE, y: (item.FAILURE_RATE * 100).toFixed(2) })) }],
            chart: { type: 'bar', height: 320, fontFamily: 'Inter, sans-serif' },
            colors: ['#A62A92'],
            plotOptions: { bar: { borderRadius: 4, dataLabels: { position: 'top' } } },
            dataLabels: { enabled: false },
            grid: { strokeDashArray: 3, borderColor: '#e5e7eb' },
            xaxis: { type: 'datetime', labels: { style: { colors: '#6b7280', fontSize: '12px' } } },
            yaxis: { title: { text: 'Failure Rate (%)', style: { color: '#6b7280' } }, labels: { style: { colors: '#6b7280', fontSize: '12px' } } }
        });
        this.charts.failureRateChart.render();

        // Warehouse Events Timeline
        const eventData = this.processWarehouseEvents();
        this.charts.warehouseEventsChart = new ApexCharts(document.querySelector("#warehouseEventsChart"), {
            series: eventData.series,
            chart: { type: 'scatter', height: 320, fontFamily: 'Inter, sans-serif' },
            markers: { size: 3 },
            xaxis: { type: 'datetime', labels: { style: { colors: '#6b7280', fontSize: '12px' } } },
            yaxis: { categories: eventData.warehouses, labels: { style: { colors: '#6b7280', fontSize: '11px' } } },
            colors: ['#A62A92', '#A07AC0', '#99CCEE'],
            grid: { strokeDashArray: 3, borderColor: '#e5e7eb' },
            legend: { position: 'top', labels: { colors: '#374151' } }
        });
        this.charts.warehouseEventsChart.render();

        // Query Performance Bee Swarm Chart
        this.renderQuerySwarmChart();

        // Top Slowest Connector Runs Table
        try {
            const slowestRuns = (this.data.connectorRuns || [])
                .filter(run => run.Status === 'SUCCESS' && Number.isFinite(run['Run Time Seconds']))
                .sort((a, b) => b['Run Time Seconds'] - a['Run Time Seconds'])
                .slice(0, 15);
            const container = document.getElementById('slowRunsTable');
            if (!container) return;
            let html = `
                <div class=\"overflow-auto h-full\">\n                  <table class=\"min-w-full\">\n                    <thead class=\"bg-gray-50 sticky top-0\">\n                      <tr>\n                        <th class=\"px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider\">Dataset</th>\n                        <th class=\"px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider\">Run Start</th>\n                        <th class=\"px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider\">Run Time (s)</th>\n                        <th class=\"px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider\">Rows/sec</th>\n                        <th class=\"px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider\">Bytes/sec</th>\n                      </tr>\n                    </thead>\n                    <tbody class=\"bg-white divide-y divide-gray-200\">`;
            slowestRuns.forEach(run => {
                html += `\n                  <tr class=\"hover:bg-gray-50\">\n                    <td class=\"px-3 py-2 text-sm text-gray-900\">${run['Data Source Name']}</td>\n                    <td class=\"px-3 py-2 text-sm text-gray-500\">${new Date(run['Start Time']).toLocaleString()}</td>\n                    <td class=\"px-3 py-2 text-sm font-mono text-gray-900\">${(run['Run Time Seconds']||0).toLocaleString()}</td>\n                    <td class=\"px-3 py-2 text-sm font-mono text-gray-900\">${(run['Rows Per Second']||0).toLocaleString()}</td>\n                    <td class=\"px-3 py-2 text-sm font-mono text-gray-900\">${(run['Bytes Per Second']||0).toLocaleString()}</td>\n                  </tr>`;
            });
            html += '</tbody></table></div>';
            container.innerHTML = html;
        } catch (e) {
            console.error('Error rendering slow runs table:', e);
            const container = document.getElementById('slowRunsTable');
            if (container) container.innerHTML = '<div class=\"h-full flex items-center justify-center text-gray-500\">Table unavailable</div>';
        }
    }
    renderQualityCharts() {
        try { this.renderCoverageAnomaliesChart(); } catch(e){ console.error(e); }
        try { this.renderNullsAndDupesTable(); } catch(e){ console.error(e); }
        try { this.renderOrphanRateBar(); } catch(e){ console.error(e); }
        try { this.renderSchemaDriftLog(); } catch(e){ console.error(e); }
    }

    renderCoverageAnomaliesChart() {
        const container = document.querySelector('#coverageAnomaliesChart');
        if (!container) return;
        
        // Organize data by dataset and create normal vs anomaly series
        const byDataset = {};
        (this.data.dataCoverage || []).forEach(r => {
            (byDataset[r.DATASET] ||= []).push({ 
                x: r.RUN_DATE, 
                y: r.ROWS_LOADED, 
                z: r.ZSCORE_ROWS_LOADED, 
                avg: r.AVG_ROWS_30D,
                isAnomaly: Math.abs(r.ZSCORE_ROWS_LOADED) >= 2
            });
        });
        
        const datasets = Object.keys(byDataset).slice(0,3);
        const series = [];
        
        // Create scatter series for each dataset - normal points
        datasets.forEach((ds, index) => {
            const normalPoints = byDataset[ds].filter(p => !p.isAnomaly);
            const anomalyPoints = byDataset[ds].filter(p => p.isAnomaly);
            
            // Normal data points (small markers)
            if (normalPoints.length > 0) {
                series.push({
                    name: ds,
                    type: 'scatter',
                    data: normalPoints.map(p => ({ x: p.x, y: p.y }))
                });
            }
            
            // Anomaly points (slightly larger, different style)
            if (anomalyPoints.length > 0) {
                series.push({
                    name: `${ds} Anomalies`,
                    type: 'scatter',
                    data: anomalyPoints.map(p => ({ 
                        x: p.x, 
                        y: p.y,
                        fillColor: '#ef4444',
                        strokeColor: '#dc2626'
                    }))
                });
            }
        });
        
        const chart = new ApexCharts(container, {
            series,
            chart: { 
                type: 'scatter', 
                height: 320,
                fontFamily: 'Inter, sans-serif', 
                toolbar: { show: false },
                zoom: { enabled: true, type: 'xy' }
            },
            markers: {
                size: [3, 3, 3, 5, 5, 5], // Small for normal, slightly larger for anomalies
                strokeWidth: [0, 0, 0, 1, 1, 1],
                hover: { size: [5, 5, 5, 7, 7, 7] }
            },
            xaxis: { 
                type: 'datetime',
                labels: { 
                    style: { colors: '#6b7280', fontSize: '11px' },
                    formatter: function(val) {
                        return new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }
                }
            },
            yaxis: { 
                title: { text: 'Rows Loaded', style: { color: '#6b7280' } }, 
                labels: { 
                    style: { colors: '#6b7280', fontSize: '11px' },
                    formatter: function(val) {
                        return val >= 1000 ? (val/1000).toFixed(1) + 'K' : val.toFixed(0);
                    }
                }
            },
            colors: ['#259EDC', '#56CCF2', '#A62A92', '#ef4444', '#ef4444', '#ef4444'],
            dataLabels: { enabled: false },
            grid: { 
                strokeDashArray: 3, 
                borderColor: '#e5e7eb',
                xaxis: { lines: { show: true } },
                yaxis: { lines: { show: true } }
            },
            legend: { 
                position: 'top',
                horizontalAlign: 'right', 
                labels: { colors: '#374151' },
                markers: { width: 8, height: 8 }
            },
            tooltip: {
                custom: function({ series, seriesIndex, dataPointIndex, w }) {
                    const data = w.globals.initialSeries[seriesIndex].data[dataPointIndex];
                    const isAnomaly = w.globals.seriesNames[seriesIndex].includes('Anomalies');
                    const date = new Date(data.x).toLocaleDateString();
                    const value = data.y.toLocaleString();
                    
                    return `<div class="px-3 py-2 bg-white border rounded shadow-lg">
                        <div class="font-semibold">${w.globals.seriesNames[seriesIndex]}</div>
                        <div class="text-sm text-gray-600">${date}</div>
                        <div class="text-sm">Rows: ${value}</div>
                        ${isAnomaly ? '<div class="text-xs text-red-600 font-medium">⚠️ Anomaly Detected</div>' : ''}
                    </div>`;
                }
            }
        });
        
        chart.render();
        this.charts.coverageAnomaliesChart = chart;
    }

    renderNullsAndDupesTable() {
        const container = document.getElementById('nullsAndDupesTable');
        if (!container) return;
        const issues = [];
        (this.data.dataCompleteness || []).forEach(item => {
            if (item.DUP_PK_COUNT > 0) issues.push({ column: 'PRIMARY_KEY', dataset: item.DATASET, issue: 'Duplicates', value: item.DUP_PK_COUNT, rowCount: item.ROW_COUNT, severity: item.DUP_PK_COUNT>10?'high':'medium' });
            Object.keys(item).forEach(k => {
                if (k.startsWith('NULL_PCT_') && item[k] > 5) issues.push({ column: k.replace('NULL_PCT_',''), dataset: item.DATASET, issue: 'High Null Rate', value: item[k], rowCount: item.ROW_COUNT, severity: item[k]>10?'high':'medium' });
            });
        });
        const top15 = issues.sort((a,b) => (a.severity==='high'?1:0) < (b.severity==='high'?1:0) ? 1 : (b.value - a.value)).slice(0,15);
        let html = `
          <div class="overflow-x-auto"><table class="min-w-full"><thead><tr class="border-b border-gray-200">
            <th class="text-left py-3 px-4 font-semibold text-gray-900">Column</th>
            <th class="text-left py-3 px-4 font-semibold text-gray-900">Dataset</th>
            <th class="text-left py-3 px-4 font-semibold text-gray-900">Issue</th>
            <th class="text-left py-3 px-4 font-semibold text-gray-900">Value</th>
            <th class="text-left py-3 px-4 font-semibold text-gray-900">Row Count</th>
          </tr></thead><tbody class="divide-y divide-gray-100">`;
        top15.forEach(i => {
            const badge = i.severity==='high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800';
            const val = i.issue==='Duplicates' ? i.value : `${i.value.toFixed(1)}%`;
            html += `<tr class="hover:bg-gray-50"><td class="py-3 px-4 text-sm text-gray-900">${i.column}</td>
              <td class="py-3 px-4 text-sm text-gray-900">${i.dataset}</td>
              <td class="py-3 px-4 text-sm"><span class="px-2 py-1 text-xs rounded-full ${badge}">${i.issue}</span></td>
              <td class="py-3 px-4 text-sm font-mono text-gray-900">${val}</td>
              <td class="py-3 px-4 text-sm font-mono text-gray-500">${i.rowCount.toLocaleString()}</td></tr>`;
        });
        html += '</tbody></table></div>';
        container.innerHTML = html;
    }



    renderOrphanRateBar() {
        const container = document.getElementById('orphanRateBar');
        if (!container) return;
        const top = (this.data.dataConsistency || []).sort((a,b)=>b.ORPHAN_ROWS - a.ORPHAN_ROWS).slice(0,10);
        const chart = new ApexCharts(container, {
            series: [{ name: 'Orphan Rows', data: top.map(i => ({ x: i.CHECK_NAME.replace('FK_',''), y: i.ORPHAN_ROWS })) }],
            chart: { type: 'bar', height: 320, fontFamily: 'Inter, sans-serif' },
            plotOptions: { bar: { horizontal: false, borderRadius: 4 } },
            xaxis: { labels: { style: { colors: '#6b7280', fontSize: '10px' }, rotate: -45 } },
            yaxis: { title: { text: 'Orphan Count', style: { color: '#6b7280' } }, labels: { style: { colors: '#6b7280', fontSize: '11px' } } },
            colors: ['#259EDC'], dataLabels: { enabled: false }, grid: { strokeDashArray: 3, borderColor: '#e5e7eb' }
        });
        chart.render();
        this.charts.orphanRateBar = chart;
    }

    renderSchemaDriftLog() {
        const container = document.getElementById('schemaDriftLog');
        if (!container) return;
        let html = '<div class="overflow-x-auto"><table class="min-w-full"><thead><tr class="border-b border-gray-200">'+
            '<th class="text-left py-3 px-4 font-semibold text-gray-900">Date</th>'+ 
            '<th class="text-left py-3 px-4 font-semibold text-gray-900">Change</th>'+ 
            '<th class="text-left py-3 px-4 font-semibold text-gray-900">Schema</th>'+ 
            '<th class="text-left py-3 px-4 font-semibold text-gray-900">Table</th>'+ 
            '<th class="text-left py-3 px-4 font-semibold text-gray-900">Column</th>'+ 
            '<th class="text-left py-3 px-4 font-semibold text-gray-900">Type</th>'+ 
            '</tr></thead><tbody class="divide-y divide-gray-100" id="schemaDriftBody">';
        (this.data.schemaDrift || []).forEach(item => {
            const cls = item.CHANGE_TYPE==='ADDED'?'bg-green-100 text-green-800': item.CHANGE_TYPE==='REMOVED'?'bg-red-100 text-red-800':'bg-blue-100 text-blue-800';
            html += `<tr class="hover:bg-gray-50" data-schema="${item.TABLE_SCHEMA}" data-table="${item.TABLE_NAME}">`+
                `<td class="py-3 px-4 text-sm text-gray-500">${new Date(item.CHANGE_DATE).toLocaleDateString()}</td>`+
                `<td class="py-3 px-4 text-sm"><span class="px-2 py-1 text-xs rounded-full ${cls}">${item.CHANGE_TYPE}</span></td>`+
                `<td class="py-3 px-4 text-sm text-gray-900">${item.TABLE_SCHEMA}</td>`+
                `<td class="py-3 px-4 text-sm text-gray-900">${item.TABLE_NAME}</td>`+
                `<td class="py-3 px-4 text-sm font-mono text-gray-900">${item.COLUMN_NAME}</td>`+
                `<td class="py-3 px-4 text-sm font-mono text-gray-500">${item.DATA_TYPE}</td></tr>`;
        });
        html += '</tbody></table></div>';
        container.innerHTML = html;
        const filterInput = document.getElementById('schemaDriftFilter');
        if (filterInput) {
            filterInput.addEventListener('input', (e) => {
                const val = e.target.value.toLowerCase();
                document.querySelectorAll('#schemaDriftBody tr').forEach(tr => {
                    const schema = tr.dataset.schema.toLowerCase();
                    const table = tr.dataset.table.toLowerCase();
                    const text = tr.textContent.toLowerCase();
                    tr.style.display = (schema.includes(val) || table.includes(val) || text.includes(val)) ? '' : 'none';
                });
            });
        }
    }

    // Build data for throughput trend using existing dailyBytes as base
    buildThroughputSeries() {
        const dates = [...new Set(this.data.dailyBytes.map(d => new Date(d.RUN_DATE).toISOString().split('T')[0]))].sort();
        const rowsPerSec = [];
        const bytesPerSec = [];
        const rowsValues = [];
        const bytesValues = [];
        dates.forEach(date => {
            // Synthesize rows/sec loosely proportional to bytes
            const bytesItem = this.data.dailyBytes.find(x => new Date(x.RUN_DATE).toISOString().split('T')[0] === date);
            const bytes = bytesItem ? bytesItem.AVG_BYTES_INSERTED : 0;
            const rows = bytes > 0 ? Math.max(50, Math.round(bytes / (1024 * 1024))) : Math.round(Math.random() * 500 + 100);
            const rps = rows / (24 * 60 * 60);
            const bps = bytes / (24 * 60 * 60);
            rowsPerSec.push({ x: date, y: parseFloat(rps.toFixed(2)) });
            bytesPerSec.push({ x: date, y: parseFloat(bps.toFixed(2)) });
            rowsValues.push(rps);
            bytesValues.push(bps);
        });

        // 30-day medians
        const median = (arr) => {
            const s = [...arr].sort((a, b) => a - b);
            const mid = Math.floor(s.length / 2);
            return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
        };
        const rowsMed = median(rowsValues);
        const bytesMed = median(bytesValues);
        const rowsMedian = dates.map(d => ({ x: d, y: parseFloat(rowsMed.toFixed(2)) }));
        const bytesMedian = dates.map(d => ({ x: d, y: parseFloat(bytesMed.toFixed(2)) }));

        return { dates, rowsPerSec, bytesPerSec, rowsMedian, bytesMedian };
    }

    renderThroughputTrendChart() {
        const container = document.querySelector('#throughputTrendChart');
        if (!container) return;
        try {
            const seriesData = this.buildThroughputSeries();
            const chart = new ApexCharts(container, {
                series: [
                    { name: 'Rows/sec', type: 'line', data: seriesData.rowsPerSec },
                    { name: 'Bytes/sec', type: 'line', data: seriesData.bytesPerSec },
                    { name: 'Rows/sec Median (30d)', type: 'line', data: seriesData.rowsMedian },
                    { name: 'Bytes/sec Median (30d)', type: 'line', data: seriesData.bytesMedian }
                ],
                chart: { type: 'line', height: 320, fontFamily: 'Inter, sans-serif', toolbar: { show: false } },
                stroke: { width: [2, 2, 1, 1], curve: 'smooth' },
                colors: ['#56CCF2', '#2F80ED', '#a3d5ff', '#7ec8ff'],
                xaxis: { type: 'datetime', labels: { style: { colors: '#6b7280', fontSize: '12px' } } },
                yaxis: [{
                    title: { text: 'Rows/sec', style: { color: '#6b7280' } },
                    labels: { style: { colors: '#6b7280', fontSize: '12px' } }
                }, {
                    opposite: true,
                    title: { text: 'Bytes/sec', style: { color: '#6b7280' } },
                    labels: { style: { colors: '#6b7280', fontSize: '12px' } }
                }],
                dataLabels: { enabled: false },
                grid: { strokeDashArray: 3, borderColor: '#e5e7eb' },
                legend: { position: 'top', horizontalAlign: 'right', labels: { colors: '#374151' } }
            });
            chart.render();
            this.charts.throughputTrend = chart;
        } catch (e) {
            console.error('Error rendering throughput trend:', e);
            container.innerHTML = '<div class="h-full flex items-center justify-center text-gray-500">Unable to render throughput trend</div>';
        }
    }

    renderPipelineCharts() {
        // Bytes Ingested & API Anomalies (Full Width)
        this.charts.bytesApiChart = new ApexCharts(document.querySelector("#bytesApiChart"), {
            series: [{
                name: 'Bytes Ingested (MB)',
                type: 'area',
                yAxisIndex: 0,
                data: this.data.dailyBytes.map(item => ({
                    x: item.RUN_DATE,
                    y: parseFloat((item.AVG_BYTES_INSERTED / 1048576).toFixed(2))
                }))
            }, {
                name: 'API Z-Score',
                type: 'scatter',
                yAxisIndex: 1,
                data: this.data.apiZscore.map(item => ({
                    x: item.RUN_DATE,
                    y: parseFloat(item.ZSCORE.toFixed(2))
                }))
            }],
            chart: { 
                height: 320,
                fontFamily: 'Inter, sans-serif',
                toolbar: { show: false }
            },
            stroke: { 
                curve: 'smooth',
                width: [3, 0]
            },
            markers: {
                size: [0, 4],
                strokeWidth: [0, 1],
                strokeColors: ['transparent', '#95CBEE'],
                hover: { size: [0, 6] }
            },
            fill: {
                type: ['gradient', 'solid'],
                gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.3,
                    opacityTo: 0.3,
                }
            },
            colors: ['#A62A92', '#95CBEE'],
            dataLabels: { enabled: false },
            grid: { strokeDashArray: 3, borderColor: '#e5e7eb' },
            xaxis: {
                type: 'datetime',
                labels: { style: { colors: '#6b7280', fontSize: '12px' } }
            },
            yaxis: [{
                title: { text: 'Bytes (MB)', style: { color: '#6b7280' } },
                labels: { style: { colors: '#6b7280', fontSize: '12px' } }
            }, {
                opposite: true,
                title: { text: 'Z-Score', style: { color: '#6b7280' } },
                labels: { style: { colors: '#6b7280', fontSize: '12px' } }
            }],
            legend: { 
                position: 'top',
                horizontalAlign: 'right',
                labels: { colors: '#374151' }
            },
            annotations: {
                yaxis: [{
                    y: 2,
                    y2: -2,
                    yAxisIndex: 1,
                    borderColor: '#10b981',
                    fillColor: '#d1fae5',
                    opacity: 0.2,
                    label: { 
                        text: 'Normal Range (±2σ)', 
                        style: { 
                            color: '#059669', 
                            background: '#d1fae5',
                            fontSize: '11px',
                            fontWeight: 'bold'
                        },
                        position: 'right',
                        offsetX: -20,
                        offsetY: -10
                    }
                }, {
                    y: 3,
                    yAxisIndex: 1,
                    borderColor: '#f59e0b',
                    strokeDashArray: 3,
                    label: { 
                        text: 'Alert Threshold', 
                        style: { 
                            color: '#d97706',
                            fontSize: '11px',
                            fontWeight: '500',
                            background: '#fef3c7',
                            padding: '4px 8px',
                            borderRadius: '4px'
                        },
                        position: 'right',
                        offsetX: -15,
                        offsetY: 10
                    }
                }, {
                    y: -3,
                    yAxisIndex: 1,
                    borderColor: '#f59e0b',
                    strokeDashArray: 3
                }]
            }
        });
        this.charts.bytesApiChart.render();

        // Connector Success Rate (Donut)
        const successData = this.aggregateConnectorSuccess();
        this.charts.connectorSuccessChart = new ApexCharts(document.querySelector("#connectorSuccessChart"), {
            series: [parseFloat(successData.success), parseFloat(successData.failure)],
            chart: { 
                type: 'donut', 
                height: 320,
                fontFamily: 'Inter, sans-serif'
            },
            labels: ['Success', 'Failure'],
            colors: ['#95CBEE', '#A62A92'],
            plotOptions: {
                pie: {
                    donut: {
                        size: '65%',
                        labels: {
                            show: true,
                            total: {
                                show: true,
                                label: 'Success Rate',
                                formatter: () => `${successData.success}%`
                            }
                        }
                    }
                }
            },
            dataLabels: {
                enabled: true,
                formatter: (val) => `${val.toFixed(1)}%`
            },
            legend: { 
                position: 'bottom',
                labels: { colors: '#374151' }
            }
        });
        this.charts.connectorSuccessChart.render();

        // SLA Breaches Heatmap
        const slaData = this.processSLABreaches();
        this.charts.slaHeatmapChart = new ApexCharts(document.querySelector("#slaHeatmapChart"), {
            series: slaData.series,
            chart: { 
                type: 'heatmap', 
                height: 320,
                fontFamily: 'Inter, sans-serif'
            },
            xaxis: { 
                categories: slaData.dates,
                labels: { style: { colors: '#6b7280', fontSize: '11px' } }
            },
            yaxis: {
                labels: { style: { colors: '#6b7280', fontSize: '11px' } }
            },
            colors: ['#56CCF2'],
            colorScale: {
                ranges: [{
                    from: 0,
                    to: 0,
                    color: '#56CCF2',
                    name: 'No Breaches'
                }, {
                    from: 1,
                    to: 5,
                    color: '#2F80ED',
                    name: 'Low'
                }, {
                    from: 6,
                    to: 10,
                    color: '#1E3A8A',
                    name: 'High'
                }]
            },
            dataLabels: { enabled: false },
            grid: { show: false }
        });
        this.charts.slaHeatmapChart.render();

        // Data Freshness Table
        this.renderFreshnessTable();

        // E2E Latency Heatmap
        this.renderE2ELatencyHeatmap();
    }

    renderAdoptionCharts() {
        // Weekly Active Users Trend (Full Width)
        this.charts.wauTrendChart = new ApexCharts(document.querySelector("#wauTrendChart"), {
        series: [{
            name: 'Weekly Active Users',
            data: this.data.snowflakeWAU.map(item => ({
            x: item.ISO_WEEK,
            y: item.WAU
            }))
        }],
        chart: { 
            type: 'bar', 
            height: 320,
            fontFamily: 'Inter, sans-serif',
            toolbar: { show: false }
        },

        // Solid color bars, no outline
        colors: ['#259EDC'],
        fill: { type: 'solid', opacity: 1 },
        stroke: { show: false, width: 0 },

        // (Optional) bar styling
        plotOptions: {
            bar: {
            columnWidth: '55%',
            borderRadius: 4
            }
        },

        dataLabels: { enabled: false },
        grid: { strokeDashArray: 1, borderColor: '#ffffff' },
        xaxis: {
            labels: { style: { colors: '#6b7280', fontSize: '12px' } }
        },
        yaxis: {
            title: { text: 'Active Users', style: { color: '#6b7280' } },
            labels: { style: { colors: '#6b7280', fontSize: '12px' } }
        }
        });
        this.charts.wauTrendChart.render();

        // Top 5 Connectors by Rows (Full Width)
        const topConnectors = this.getTopConnectorsByRows();
        this.charts.topConnectorsChart = new ApexCharts(document.querySelector("#topConnectorsChart"), {
        series: topConnectors.series,
        chart: { 
            type: 'line', 
            height: 320,
            fontFamily: 'Inter, sans-serif',
            toolbar: { show: false }
        },
        stroke: { curve: 'smooth', width: 3 },
        colors: ['#A62A92', '#259EDC', '#95CBEE', '#F2A44E', '#F2A44E'],
        dataLabels: { enabled: false },
        grid: { strokeDashArray: 3, borderColor: '#e5e7eb' },
        xaxis: { 
            categories: topConnectors.dates,
            labels: { style: { colors: '#6b7280', fontSize: '12px' } }
        },
        yaxis: {
            title: { text: 'Rows Ingested', style: { color: '#6b7280' } },
            labels: { 
            style: { colors: '#6b7280', fontSize: '12px' },
            formatter: (val) => val.toLocaleString()
            }
        },
        legend: { 
            position: 'top',
            horizontalAlign: 'right',
            labels: { colors: '#374151' }
        },
        markers: {
            size: 2,          // smaller dots
            strokeWidth: 1,   // thinner outline
            hover: { sizeOffset: 1 }
        }
        });
        this.charts.topConnectorsChart.render();


        // Credits vs Users Correlation (Scatter)
        const correlationData = this.processCreditsUsersCorrelation();
        this.charts.creditsUsersChart = new ApexCharts(document.querySelector("#creditsUsersChart"), {
            series: [{ name: 'Warehouses', data: correlationData }],
            chart: { 
                type: 'scatter', 
                height: 320,
                fontFamily: 'Inter, sans-serif'
            },
            xaxis: { 
                title: { text: 'Weekly Active Users', style: { color: '#259EDC' } },
                labels: { style: { colors: '#259EDC', fontSize: '12px' } }
            },
            yaxis: { 
                title: { text: 'Credits Consumed', style: { color: '#259EDC' } },
                labels: { style: { colors: '#259EDC', fontSize: '12px' } }
            },
            colors: ['#259EDC'],
            markers: {
                size: 8,
                strokeWidth: 2,
                strokeColors: '#ffffff',
                hover: { size: 10 }
            },
            grid: { strokeDashArray: 3, borderColor: '#e5e7eb' }
        });
        this.charts.creditsUsersChart.render();

        // Dataset Cost Distribution (Horizontal Bar)
        this.charts.datasetCostChart = new ApexCharts(document.querySelector("#datasetCostChart"), {
            series: [{
                data: this.data.datasetCreditCost
                    .sort((a, b) => b.COST_USD - a.COST_USD)
                    .slice(0, 8)
                    .map(item => ({
                        x: item.DATASET_NAME.length > 25 ? 
                            item.DATASET_NAME.substring(0, 25) + '...' : 
                            item.DATASET_NAME,
                        y: item.COST_USD
                    }))
            }],
            chart: { 
                type: 'bar', 
                height: 320,
                fontFamily: 'Inter, sans-serif'
            },
            plotOptions: { 
                bar: { 
                    horizontal: true,
                    borderRadius: 4,
                    dataLabels: { position: 'top' }
                } 
            },
            colors: ['#259EDC'],
            dataLabels: { 
                enabled: true,
                formatter: (val) => `${val.toFixed(3)}`,
                style: { fontSize: '11px', colors: ['#374151'] }
            },
            grid: { strokeDashArray: 3, borderColor: '#e5e7eb' },
            xaxis: {
                title: { text: 'Cost (USD)', style: { color: '#6b7280' } },
                labels: { 
                    style: { colors: '#6b7280', fontSize: '12px' },
                    formatter: (val) => `${val.toFixed(2)}`
                }
            },
            yaxis: {
                labels: { style: { colors: '#6b7280', fontSize: '11px' } }
            }
        });
        this.charts.datasetCostChart.render();

        // Cost vs Utilization Quadrant Chart
        this.renderCostUtilQuadrantChart();
    }

    renderCostUtilQuadrantChart() {
        const container = document.querySelector('#costUtilQuadrantChart');
        if (!container) {
            console.warn('Cost vs Utilization container not found');
            return;
        }

        try {
            // Check if data exists
            if (!this.data.costVsUtilization || !Array.isArray(this.data.costVsUtilization)) {
                console.warn('Cost vs Utilization data not available:', this.data.costVsUtilization);
                container.innerHTML = '<div class="h-full flex items-center justify-center text-gray-500">No cost vs utilization data available</div>';
                return;
            }

            console.log('Cost vs Utilization data:', this.data.costVsUtilization);

            // Transform data: util_gb = bytes_loaded / 1e9
            const transformedData = this.data.costVsUtilization.map(item => ({
                dataset: item.DATASET,
                cost_usd: item.COST_USD,
                util_gb: item.BYTES_LOADED / 1e9,
                runs: item.RUNS,
                success_pct: item.SUCCESS_PCT
            })).filter(item => item.cost_usd > 0 && item.util_gb > 0); // Handle nulls/empties

            if (transformedData.length === 0) {
                container.innerHTML = '<div class="h-full flex items-center justify-center text-gray-500">No cost vs utilization data available</div>';
                return;
            }

            // Calculate medians for quadrant lines
            const utilValues = transformedData.map(d => d.util_gb).sort((a, b) => a - b);
            const costValues = transformedData.map(d => d.cost_usd).sort((a, b) => a - b);
            const x_med = this.calculateMedian(utilValues);
            const y_med = this.calculateMedian(costValues);

            // Prepare series data with color scaling by success_pct
            const seriesData = transformedData.map(item => ({
                x: parseFloat(item.util_gb.toFixed(2)),
                y: parseFloat(item.cost_usd.toFixed(2)),
                z: parseInt(item.runs), // bubble size
                dataset: item.dataset,
                success_pct: item.success_pct
            }));

            const chart = new ApexCharts(container, {
                series: [{
                    name: 'Datasets',
                    data: seriesData
                }],
                chart: {
                    type: 'bubble',
                    height: 320,
                    fontFamily: 'Inter, sans-serif',
                    toolbar: { show: false },
                    zoom: { enabled: true },
                    events: {
                        mounted: (chartContext, config) => {
                            // Add quadrant background colors after chart renders
                            this.addQuadrantBackgrounds(chartContext, x_med, y_med, utilValues, costValues);
                        },
                        updated: (chartContext, config) => {
                            // Re-add backgrounds on updates
                            this.addQuadrantBackgrounds(chartContext, x_med, y_med, utilValues, costValues);
                        }
                    }
                },
                xaxis: {
                    title: { text: 'Domo Dataset Utilization (GB)', style: { color: '#6b7280' } },
                    labels: { 
                        style: { colors: '#6b7280', fontSize: '12px' },
                        formatter: (val) => val?.toFixed(1) || '0'
                    }
                },
                yaxis: {
                    title: { text: 'Cost (USD)', style: { color: '#6b7280' } },
                    labels: { 
                        style: { colors: '#6b7280', fontSize: '12px' },
                        formatter: (val) => `$${val?.toFixed(2) || '0'}`
                    }
                },
                colors: ['#259EDC'], // Default color, overridden by fillColor
                dataLabels: { enabled: false },
                grid: { strokeDashArray: 3, borderColor: '#e5e7eb' },
                legend: { show: false },
                annotations: {
                    xaxis: [{
                        x: x_med,
                        borderColor: '#6b7280',
                        strokeDashArray: 5,
                        label: { 
                            text: `Median Util: ${x_med.toFixed(1)}GB`,
                            style: { 
                                color: '#374151', 
                                fontSize: '10px',
                                background: '#ffffff',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                padding: '2px 6px'
                            },
                            position: 'top',
                            offsetY: -10
                        }
                    }],
                    yaxis: [{
                        y: y_med,
                        borderColor: '#6b7280',
                        strokeDashArray: 5,
                        label: { 
                            text: `Median Cost: $${y_med.toFixed(2)}`,
                            style: { 
                                color: '#374151', 
                                fontSize: '10px',
                                background: '#ffffff',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                padding: '2px 6px'
                            },
                            position: 'right',
                            offsetX: 10
                        }
                    }],
                    // Quadrant text labels positioned manually
                    points: [
                        // Best Value (bottom right quadrant) - Light Blue
                        {
                            x: x_med + (Math.max(...utilValues) - x_med) * 0.5,
                            y: Math.min(...costValues) + (y_med - Math.min(...costValues)) * 0.5,
                            marker: { size: 0 },
                            label: {
                                text: 'Best Value',
                                style: { 
                                    background: 'rgba(135, 206, 235, 0.9)', 
                                    color: '#1e40af', 
                                    fontSize: '12px', 
                                    fontWeight: 'bold',
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(135, 206, 235, 1)'
                                }
                            }
                        },
                        // Optimize & Scale (top right quadrant) - Light Orange
                        {
                            x: x_med + (Math.max(...utilValues) - x_med) * 0.5,
                            y: y_med + (Math.max(...costValues) - y_med) * 0.5,
                            marker: { size: 0 },
                            label: {
                                text: 'Optimize & Scale',
                                style: { 
                                    background: 'rgba(255, 193, 122, 0.9)', 
                                    color: '#ea580c', 
                                    fontSize: '12px', 
                                    fontWeight: 'bold',
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(255, 193, 122, 1)'
                                }
                            }
                        },
                        // Monitor (bottom left quadrant) - Light Purple
                        {
                            x: Math.min(...utilValues) + (x_med - Math.min(...utilValues)) * 0.5,
                            y: Math.min(...costValues) + (y_med - Math.min(...costValues)) * 0.5,
                            marker: { size: 0 },
                            label: {
                                text: 'Monitor',
                                style: { 
                                    background: 'rgba(168, 85, 247, 0.2)', 
                                    color: '#7c3aed', 
                                    fontSize: '12px', 
                                    fontWeight: 'bold',
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(168, 85, 247, 0.5)'
                                }
                            }
                        },
                        // Rationalize (top left quadrant) - Light Pink
                        {
                            x: Math.min(...utilValues) + (x_med - Math.min(...utilValues)) * 0.5,
                            y: y_med + (Math.max(...costValues) - y_med) * 0.5,
                            marker: { size: 0 },
                            label: {
                                text: 'Rationalize',
                                style: { 
                                    background: 'rgba(237, 137, 157, 0.3)', 
                                    color: '#be185d', 
                                    fontSize: '12px', 
                                    fontWeight: 'bold',
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(237, 137, 157, 0.6)'
                                }
                            }
                        }
                    ]
                },
                tooltip: {
                    custom: ({ dataPointIndex }) => {
                        const data = transformedData[dataPointIndex];
                        
                        // Determine quadrant based on data point position relative to medians
                        let quadrant = '';
                        let quadrantInfo = {};
                        
                        if (data.util_gb >= x_med && data.cost_usd < y_med) {
                            quadrant = 'Best Value';
                            quadrantInfo = {
                                description: 'high util, low cost',
                                why: 'You move a lot of data for comparatively little spend.',
                                action: 'Keep schedules; consider modest scale-up if queues appear.',
                                watch: 'Cost-per-GB and failure rate stay flat or improving.',
                                color: '#1e40af'
                            };
                        } else if (data.util_gb >= x_med && data.cost_usd >= y_med) {
                            quadrant = 'Optimize & Scale';
                            quadrantInfo = {
                                description: 'high util, high cost',
                                why: 'Heavy, business-critical pipelines that also drive spend.',
                                action: 'Tune queries, caching, pruning; right-size warehouses; checkpoint long runs.',
                                watch: 'Cost-per-GB trend should decline after changes.',
                                color: '#ea580c'
                            };
                        } else if (data.util_gb < x_med && data.cost_usd < y_med) {
                            quadrant = 'Monitor';
                            quadrantInfo = {
                                description: 'low util, low cost',
                                why: 'Light workloads with minimal impact.',
                                action: 'Keep but reduce frequency or batch; tag as "low priority."',
                                watch: 'If utilization grows, reassess for optimization or scaling.',
                                color: '#7c3aed'
                            };
                        } else {
                            quadrant = 'Rationalize';
                            quadrantInfo = {
                                description: 'low util, high cost',
                                why: 'Poor ROI—expensive but little throughput.',
                                action: 'Consolidate datasets, downsize/auto-suspend warehouses, or deprecate.',
                                watch: 'Move left/down within 1–2 cycles, or retire.',
                                color: '#be185d'
                            };
                        }
                        
                        return `
                        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; font-family: Inter, sans-serif; max-width: 340px;">
                            <div style="font-weight: 600; color: #111827; margin-bottom: 8px;">${data.dataset}</div>
                            <div style="font-size: 12px; color: #6b7280; line-height: 1.4; margin-bottom: 10px;">
                                <div style="margin-bottom: 3px;"><span style="color: #374151; font-weight: 500;">Cost:</span> $${data.cost_usd.toFixed(2)}</div>
                                <div style="margin-bottom: 3px;"><span style="color: #374151; font-weight: 500;">Utilization:</span> ${data.util_gb.toFixed(1)} GB</div>
                                <div style="margin-bottom: 3px;"><span style="color: #374151; font-weight: 500;">Runs:</span> ${data.runs}</div>
                                <div><span style="color: #374151; font-weight: 500;">Success Rate:</span> <span style="color: ${this.getSuccessColor(data.success_pct)}; font-weight: 600;">${data.success_pct.toFixed(1)}%</span></div>
                            </div>
                            <div style="border-top: 1px solid #e5e7eb; padding-top: 8px;">
                                <div style="font-weight: 600; color: ${quadrantInfo.color}; margin-bottom: 6px; font-size: 13px;">
                                    ${quadrant} (${quadrantInfo.description})
                                </div>
                                <div style="color: #374151; font-size: 11px; margin-bottom: 4px; line-height: 1.3;">
                                    <strong>Why:</strong> ${quadrantInfo.why}
                                </div>
                                <div style="color: #374151; font-size: 11px; margin-bottom: 4px; line-height: 1.3;">
                                    <strong>Action:</strong> ${quadrantInfo.action}
                                </div>
                                <div style="color: #374151; font-size: 11px; line-height: 1.3;">
                                    <strong>Watch:</strong> ${quadrantInfo.watch}
                                </div>
                            </div>
                        </div>`;
                    }
                }
            });

            chart.render();
            this.charts.costUtilQuadrantChart = chart;

        } catch (e) {
            console.error('Error rendering cost vs utilization chart:', e);
            container.innerHTML = '<div class="h-full flex items-center justify-center text-gray-500">Chart unavailable</div>';
        }
    }

    // Helper method to calculate median
    calculateMedian(values) {
        if (!values || values.length === 0) return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 
            ? (sorted[mid - 1] + sorted[mid]) / 2 
            : sorted[mid];
    }

    // Helper method to add quadrant background colors
    addQuadrantBackgrounds(chartContext, x_med, y_med, utilValues, costValues) {
        try {
            const chartEl = chartContext.el;
            // Prefer the grid group so transforms match gridlines/annotations exactly
            const gridGroup = chartEl.querySelector('g.apexcharts-grid');
            const plotArea = chartEl.querySelector('.apexcharts-inner');
            const targetGroup = gridGroup || plotArea;

            if (!targetGroup) return;

            // Remove existing quadrant backgrounds
            const existingBgs = targetGroup.querySelectorAll('.quadrant-bg');
            existingBgs.forEach(bg => bg.remove());

            // Get chart dimensions and bounds from globals
            const w = chartContext.w;
            const gridRect = {
                x: w.globals.translateX || 0,
                y: w.globals.translateY || 0,
                width: w.globals.gridWidth,
                height: w.globals.gridHeight
            };

            if (!gridRect.width || !gridRect.height) return;

            // Coordinates relative to the group we are inserting into.
            // If we draw inside the grid group, do NOT add the inner translate offsets.
            const isGrid = !!gridGroup;
            const baseX = isGrid ? 0 : gridRect.x;
            const baseY = isGrid ? 0 : gridRect.y;

            // Use ApexCharts' computed axis extents to ensure perfect alignment
            const xMin = w.globals.minX;
            const xMax = w.globals.maxX;
            const yMin = w.globals.minY;
            const yMax = w.globals.maxY;

            // Guard against divide-by-zero
            if (xMax === xMin || yMax === yMin) return;

            // Calculate relative positions using ApexCharts' domain (no extra padding)
            const xMedRel = (x_med - xMin) / (xMax - xMin);
            const yMedRel = (y_med - yMin) / (yMax - yMin);

            // Convert to pixel coordinates (SVG y-axis is inverted)
            const xMedPx = baseX + (xMedRel * gridRect.width);
            const yMedPx = baseY + ((1 - yMedRel) * gridRect.height);

            // Define quadrant boundaries using proper grid coordinates
            const gridLeft = baseX;
            const gridRight = baseX + gridRect.width;
            const gridTop = baseY;
            const gridBottom = baseY + gridRect.height;

            const quadrants = [
                // Bottom-left: Monitor (Purple) - Low util, Low cost
                {
                    x: gridLeft,
                    y: yMedPx,
                    width: xMedPx - gridLeft,
                    height: gridBottom - yMedPx,
                    color: 'rgba(168, 85, 247, 0.1)'
                },
                // Bottom-right: Best Value (Blue) - High util, Low cost
                {
                    x: xMedPx,
                    y: yMedPx,
                    width: gridRight - xMedPx,
                    height: gridBottom - yMedPx,
                    color: 'rgba(135, 206, 235, 0.2)'
                },
                // Top-left: Rationalize (Pink) - Low util, High cost
                {
                    x: gridLeft,
                    y: gridTop,
                    width: xMedPx - gridLeft,
                    height: yMedPx - gridTop,
                    color: 'rgba(237, 137, 157, 0.15)'
                },
                // Top-right: Optimize & Scale (Orange) - High util, High cost
                {
                    x: xMedPx,
                    y: gridTop,
                    width: gridRight - xMedPx,
                    height: yMedPx - gridTop,
                    color: 'rgba(255, 193, 122, 0.2)'
                }
            ];

            // Create SVG rectangles for quadrant backgrounds
            quadrants.forEach((quad) => {
                if (quad.width > 0 && quad.height > 0) {
                    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    rect.setAttribute('x', quad.x);
                    rect.setAttribute('y', quad.y);
                    rect.setAttribute('width', quad.width);
                    rect.setAttribute('height', quad.height);
                    rect.setAttribute('fill', quad.color);
                    rect.setAttribute('class', 'quadrant-bg');
                    rect.style.pointerEvents = 'none';
                    
                    // Insert behind existing grid elements for precise alignment
                    targetGroup.insertBefore(rect, targetGroup.firstChild);
                }
            });

        } catch (error) {
            console.warn('Could not add quadrant backgrounds:', error);
        }
    }

    // Helper method to get color based on success percentage
    getSuccessColor(successPct) {
        if (successPct >= 95) return '#059669'; // Green for excellent
        if (successPct >= 85) return '#0891b2'; // Teal for good
        if (successPct >= 75) return '#7c3aed'; // Purple for fair
        return '#dc2626'; // Red for poor
    }

    // Data processing methods
    aggregateByServiceType() {
        const serviceTypes = ['WAREHOUSE_METERING', 'AI_SERVICES', 'SNOWPARK_CONTAINER_SERVICES'];
        const dates = [...new Set(this.data.costPerCredit.map(item => 
            new Date(item.USAGE_DATE).toISOString().split('T')[0]
        ))].sort();

        const series = serviceTypes.map(serviceType => ({
            name: serviceType,
            data: dates.map(date => {
                const dayData = this.data.costPerCredit.filter(item => 
                    new Date(item.USAGE_DATE).toISOString().split('T')[0] === date && 
                    item.SERVICE_TYPE === serviceType
                );
                return dayData.reduce((sum, item) => sum + item.CREDITS, 0);
            })
        }));

        return { series, categories: dates };
    }

    aggregateWarehouseCosts() {
        const warehouseTotals = {};
        this.data.creditsByWarehouse.forEach(item => {
            if (!warehouseTotals[item.WAREHOUSE_NAME]) {
                warehouseTotals[item.WAREHOUSE_NAME] = 0;
            }
            warehouseTotals[item.WAREHOUSE_NAME] += item.SPEND_USD;
        });

        return Object.entries(warehouseTotals).map(([name, cost]) => ({
            x: name,
            y: cost.toFixed(2)
        }));
    }

    processWarehouseEvents() {
        const warehouses = [...new Set(this.data.warehouseEvents.map(e => e.WAREHOUSE_NAME))];
        const eventTypes = ['SUSPEND_WAREHOUSE', 'RESUME_WAREHOUSE', 'RESIZE_WAREHOUSE'];
        
        const series = eventTypes.map(eventType => ({
            name: eventType,
            data: this.data.warehouseEvents
                .filter(e => e.EVENT_NAME === eventType)
                .map(e => ({
                    x: new Date(e.EVENT_TS).getTime(),
                    y: warehouses.indexOf(e.WAREHOUSE_NAME)
                }))
        }));

        return { series, warehouses };
    }

    aggregateConnectorSuccess() {
        const totalRuns = this.data.connectorRuns.length;
        const successfulRuns = this.data.connectorRuns.filter(run => run.Status === 'SUCCESS').length;
        
        return {
            success: (successfulRuns / totalRuns * 100).toFixed(1),
            failure: ((totalRuns - successfulRuns) / totalRuns * 100).toFixed(1)
        };
    }

    processSLABreaches() {
        const connectors = [...new Set(this.data.connectorHealth.map(item => item.CONNECTOR))];
        const dates = [...new Set(this.data.connectorHealth.map(item => 
            new Date(item.RUN_DATE).toISOString().split('T')[0]
        ))].sort();

        const series = connectors.map(connector => ({
            name: connector,
            data: dates.map(date => {
                const dayData = this.data.connectorHealth.find(item => 
                    item.CONNECTOR === connector && 
                    new Date(item.RUN_DATE).toISOString().split('T')[0] === date
                );
                return dayData ? dayData.SLA_BREACHES : 0;
            })
        }));

        return { series, dates };
    }

    processCreditsUsersCorrelation() {
        const latestWAU = this.data.snowflakeWAU[this.data.snowflakeWAU.length - 1]?.WAU || 100;
        
        return this.data.creditsByWarehouse
            .reduce((acc, item) => {
                const existing = acc.find(x => x.warehouse === item.WAREHOUSE_NAME);
                if (existing) {
                    existing.credits += item.CREDITS;
                } else {
                    acc.push({ warehouse: item.WAREHOUSE_NAME, credits: item.CREDITS });
                }
                return acc;
            }, [])
            .map(item => ({
                x: latestWAU + (Math.random() - 0.5) * 20,
                y: item.credits
            }));
    }

    getTopConnectorsByRows() {
        const connectorTotals = {};
        const dates = [...new Set(this.data.connectorRuns.map(item => 
            new Date(item['Created At']).toISOString().split('T')[0]
        ))].sort();

        this.data.connectorRuns.forEach(run => {
            const connector = run['Data Source Name'];
            if (!connectorTotals[connector]) {
                connectorTotals[connector] = {};
            }
            const date = new Date(run['Created At']).toISOString().split('T')[0];
            if (!connectorTotals[connector][date]) {
                connectorTotals[connector][date] = 0;
            }
            connectorTotals[connector][date] += run['Updated Rows'];
        });

        const topConnectors = Object.entries(connectorTotals)
            .map(([name, data]) => ({
                name,
                total: Object.values(data).reduce((sum, val) => sum + val, 0)
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        const series = topConnectors.map(connector => ({
            name: connector.name,
            data: dates.map(date => connectorTotals[connector.name][date] || 0)
        }));

        return { series, dates };
    }

    renderDatasetCostTable() {
        const tbody = document.getElementById('datasetCostBody');
        tbody.innerHTML = '';
        
        this.data.datasetCreditCost
            .sort((a, b) => b.COST_USD - a.COST_USD)
            .slice(0, 10)
            .forEach((item, index) => {
                const trend = Math.random() > 0.5 ? 'up' : 'down';
                const trendColor = trend === 'up' ? 'text-green-600' : 'text-red-600';
                const trendIcon = trend === 'up' ? '↗' : '↘';
                const trendValue = `${trend === 'up' ? '+' : '-'}${(Math.random() * 10 + 1).toFixed(1)}%`;
                
                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-50 transition-colors';
                row.innerHTML = `
                    <td class="py-4 px-4">
                        <div class="flex items-center">
                            <div class="w-8 h-8 rounded-lg flex items-center justify-center mr-3"
                            style="background: linear-gradient(135deg, #95CBEE, #259EDC);"">
                                <span class="text-white text-xs font-bold">${index + 1}</span>
                            </div>
                            <span class="font-medium text-gray-900">${item.DATASET_NAME}</span>
                        </div>
                    </td>
                    <td class="py-4 px-4 text-gray-700 font-mono">${item.CREDITS.toFixed(6)}</td>
                    <td class="py-4 px-4 text-gray-900 font-semibold">${item.COST_USD.toFixed(6)}</td>
                    <td class="py-4 px-4">
                        <span class="${trendColor} font-medium text-sm">
                            ${trendIcon} ${trendValue}
                        </span>
                    </td>
                `;
                tbody.appendChild(row);
            });
    }

    renderFreshnessTable() {
        const tbody = document.getElementById('freshnessBody');
        tbody.innerHTML = '';
        
        (this.data.dataFreshness || []).forEach(item => {
            const row = document.createElement('tr');
            const status = item.HOURS_SINCE_LAST_RUN > 24 ? 'error' : 
                          item.HOURS_SINCE_LAST_RUN > 12 ? 'warning' : 'success';
            const statusText = item.HOURS_SINCE_LAST_RUN > 24 ? 'Stale' : 
                             item.HOURS_SINCE_LAST_RUN > 12 ? 'Warning' : 'Fresh';
            
            const lastUpdate = new Date(Date.now() - (item.HOURS_SINCE_LAST_RUN * 60 * 60 * 1000));
            
            row.className = 'hover:bg-gray-50 transition-colors';
            row.innerHTML = `
                <td class="py-4 px-4">
                    <div class="flex items-center">
                        <div class="w-3 h-3 rounded-full mr-3 ${
                            status === 'success' ? 'bg-green-400' : 
                            status === 'warning' ? 'bg-yellow-400' : 'bg-red-400'
                        }"></div>
                        <span class="font-medium text-gray-900">${item.DATASET}</span>
                    </div>
                </td>
                <td class="py-4 px-4 text-gray-700 font-mono">${item.HOURS_SINCE_LAST_RUN}h</td>
                <td class="py-4 px-4">
                    <span class="status-${status}">${statusText}</span>
                </td>
                <td class="py-4 px-4 text-gray-500 text-sm">${lastUpdate.toLocaleString()}</td>
            `;
            tbody.appendChild(row);
        });
    }

    // Prepare heatmap buckets and tooltip data from recordFreshness
    prepareLatencyHeatmapData() {
        const bucketHours = (h) => {
            if (h <= 6) return { label: '0-6h', value: 1 };
            if (h <= 12) return { label: '6-12h', value: 2 };
            if (h <= 24) return { label: '12-24h', value: 3 };
            if (h <= 48) return { label: '24-48h', value: 4 };
            return { label: '48h+', value: 5 };
        };

        const seriesMap = {};
        const tooltipMap = {};
        (this.data.recordFreshness || []).forEach(row => {
            const ds = row.DATASET;
            const dateKey = new Date(row.AS_OF_DATE).toISOString().split('T')[0];
            const bucket = bucketHours(row.HOURS_BEHIND_NOW);
            if (!seriesMap[ds]) { seriesMap[ds] = []; tooltipMap[ds] = []; }
            seriesMap[ds].push({ x: dateKey, y: bucket.value });
            tooltipMap[ds].push({ dataset: ds, date: dateKey, hoursBehind: row.HOURS_BEHIND_NOW, sourceTs: row.MAX_SOURCE_TS, bucket: bucket.label });
        });
        const series = Object.keys(seriesMap).map(k => ({ name: k, data: seriesMap[k] }));
        const tooltipData = Object.keys(tooltipMap).map(k => tooltipMap[k]);
        return { series, tooltipData };
    }

    renderE2ELatencyHeatmap() {
        const container = document.querySelector('#e2eLatencyHeatmap');
        if (!container) return;
        try {
            const heatmapData = this.prepareLatencyHeatmapData();
            const chart = new ApexCharts(container, {
                series: heatmapData.series,
                chart: { type: 'heatmap', height: 320, fontFamily: 'Inter, sans-serif' },
                colors: ['#56CCF2'],
                xaxis: { type: 'datetime', labels: { style: { colors: '#6b7280', fontSize: '11px' } } },
                yaxis: { labels: { style: { colors: '#6b7280', fontSize: '11px' } } },
                dataLabels: { enabled: false },
                grid: { borderColor: '#e5e7eb' },
                tooltip: {
                    custom: ({ seriesIndex, dataPointIndex }) => {
                        const d = heatmapData.tooltipData[seriesIndex]?.[dataPointIndex];
                        if (!d) return '';
                        return `\
<div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); font-family: Inter, sans-serif;">\
  <div style="font-weight: 600; color: #111827; font-size: 14px; margin-bottom: 8px;">${d.dataset}</div>\
  <div style="font-size: 12px; color: #6b7280; line-height: 1.4;">\
    <div style="margin-bottom: 3px;"><span style="color: #374151; font-weight: 500;">Date:</span> ${new Date(d.date).toLocaleDateString()}</div>\
    <div style="margin-bottom: 3px;"><span style="color: #374151; font-weight: 500;">Hours Behind:</span> <span style="color: ${d.hoursBehind > 24 ? '#dc2626' : d.hoursBehind > 12 ? '#f59e0b' : '#059669'}; font-weight: 600;">${d.hoursBehind}h</span></div>\
    <div style="margin-bottom: 3px;"><span style="color: #374151; font-weight: 500;">Source TS:</span> ${new Date(d.sourceTs).toLocaleString()}</div>\
    <div><span style="color: #374151; font-weight: 500;">Bucket:</span> <span style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${d.bucket}</span></div>\
  </div>\
</div>`;
                    }
                }
            });
            chart.render();
            this.charts.e2eLatencyHeatmap = chart;
        } catch (e) {
            console.error('Error rendering E2E heatmap:', e);
            container.innerHTML = '<div class="h-full flex items-center justify-center text-gray-500">Heatmap unavailable</div>';
        }
    }



    // Query Optimization Methods
    filterQueries() {
        const actionFilter = document.getElementById('actionFilter').value;
        const improvementFilter = parseFloat(document.getElementById('improvementFilter').value);
        const sortBy = document.getElementById('sortBy').value;
        const searchQuery = document.getElementById('searchQueries').value.toLowerCase();

        let filtered = [...this.queryRewriteResults];

        // Apply filters
        if (actionFilter) {
            filtered = filtered.filter(query => query.ACTION === actionFilter);
        }

        if (improvementFilter > 0) {
            filtered = filtered.filter(query => query.PCT_MS >= improvementFilter);
        }

        if (searchQuery) {
            filtered = filtered.filter(query => 
                query.ORIG_SQL.toLowerCase().includes(searchQuery) ||
                query.REWRITE_SQL.toLowerCase().includes(searchQuery) ||
                query.QUERY_ID.toLowerCase().includes(searchQuery)
            );
        }

        // Apply sorting
        switch(sortBy) {
            case 'improvement_desc':
                filtered.sort((a, b) => b.PCT_MS - a.PCT_MS);
                break;
            case 'improvement_asc':
                filtered.sort((a, b) => a.PCT_MS - b.PCT_MS);
                break;
            case 'savings_desc':
                filtered.sort((a, b) => b.EST_USD_SAVINGS - a.EST_USD_SAVINGS);
                break;
            case 'date_desc':
                filtered.sort((a, b) => new Date(b.RUN_DTS) - new Date(a.RUN_DTS));
                break;
        }

        this.filteredQueries = filtered;
        this.currentQueryPage = 1;
        this.updateResultsInfo();
        this.renderQueryComparisons();
    }

    updateResultsInfo() {
        const resultsCount = document.getElementById('resultsCount');
        const displayedCount = Math.min(this.currentQueryPage * this.queriesPerPage, this.filteredQueries.length);
        resultsCount.textContent = `Showing ${displayedCount} of ${this.filteredQueries.length} query optimizations`;
    }

    renderQueryComparisons() {
        const container = document.getElementById('queryComparisonList');
        const startIndex = (this.currentQueryPage - 1) * this.queriesPerPage;
        const endIndex = startIndex + this.queriesPerPage;
        const queriesToShow = this.filteredQueries.slice(startIndex, endIndex);

        if (this.currentQueryPage === 1) {
            container.innerHTML = '';
        }

        queriesToShow.forEach(query => {
            const queryElement = this.createQueryComparisonElement(query);
            container.appendChild(queryElement);
        });

        // Update load more button
        const loadMoreBtn = document.getElementById('loadMoreQueries');
        if (endIndex >= this.filteredQueries.length) {
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.style.display = 'block';
        }
    }

    createQueryComparisonElement(query) {
        const container = document.createElement('div');
        container.className = 'query-comparison-container';

        const headerId = `header-${query.QUERY_ID}`;
        const detailsId = `details-${query.QUERY_ID}`;

        container.innerHTML = `
            <div class="query-comparison-header" id="${headerId}">
                <div class="query-summary">
                    <div class="query-meta">
                        <div class="query-id">${query.QUERY_ID.substring(0, 12)}...</div>
                        <div class="query-metrics">
                            <div class="metric-item">
                                <div class="metric-value improvement">${query.PCT_MS.toFixed(1)}%</div>
                                <div class="metric-label">Performance</div>
                            </div>
                            <div class="metric-item">
                                <div class="metric-value improvement">${query.PCT_BYTES.toFixed(1)}%</div>
                                <div class="metric-label">Bytes Saved</div>
                            </div>
                            <div class="metric-item">
                                <div class="metric-value">${query.BASE_MS}ms</div>
                                <div class="metric-label">Original</div>
                            </div>
                            <div class="metric-item">
                                <div class="metric-value improvement">${query.TEST_MS}ms</div>
                                <div class="metric-label">Optimized</div>
                            </div>
                            <div class="metric-item">
                                <div class="metric-value improvement">${query.EST_USD_SAVINGS.toFixed(2)}</div>
                                <div class="metric-label">Savings</div>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-4">
                        <span class="action-badge action-${query.ACTION.toLowerCase()}">${query.ACTION}</span>
                        <svg class="w-5 h-5 expand-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </div>
                </div>
            </div>
            <div class="query-details" id="${detailsId}">
                <div class="query-comparison-grid">
                    <div class="query-panel">
                        <div class="query-panel-header">
                            <div class="query-panel-title">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                                Original Query
                            </div>
                            <div class="query-panel-subtitle">${query.BASE_MS}ms execution</div>
                        </div>
                        <div class="code-viewer">${query.ORIG_SQL}</div>
                    </div>
                    <div class="query-panel">
                        <div class="query-panel-header">
                            <div class="query-panel-title">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                                </svg>
                                Optimized Query
                            </div>
                            <div class="query-panel-subtitle">${query.TEST_MS}ms execution</div>
                        </div>
                        <div class="code-editor-container" id="editor-${query.QUERY_ID}"></div>
                        <div class="query-actions">
                            <button class="btn btn-primary run-test-btn" data-query-id="${query.QUERY_ID}">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                Run Test
                            </button>
                            <button class="btn btn-secondary copy-query-btn" data-query-id="${query.QUERY_ID}">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                                </svg>
                                Copy Query
                            </button>
                            ${query.ACTION === 'ADOPT' ? `
                            <button class="btn btn-success deploy-btn" data-query-id="${query.QUERY_ID}">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                Deploy Optimization
                            </button>
                            ` : ''}
                        </div>
                        <div id="test-results-${query.QUERY_ID}" class="test-results" style="display: none;">
                            <div class="test-results-header">Test Results</div>
                            <div class="test-metrics">
                                <div class="test-metric">
                                    <div class="test-metric-value" id="test-time-${query.QUERY_ID}">--</div>
                                    <div class="test-metric-label">Execution Time</div>
                                </div>
                                <div class="test-metric">
                                    <div class="test-metric-value" id="test-improvement-${query.QUERY_ID}">--</div>
                                    <div class="test-metric-label">Improvement</div>
                                </div>
                                <div class="test-metric">
                                    <div class="test-metric-value" id="test-status-${query.QUERY_ID}">--</div>
                                    <div class="test-metric-label">Status</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="performance-comparison">
                    <div class="performance-metric">
                        <div class="performance-metric-value improvement">${query.PCT_MS.toFixed(1)}%</div>
                        <div class="performance-metric-label">Performance Improvement</div>
                    </div>
                    <div class="performance-metric">
                        <div class="performance-metric-value improvement">${query.PCT_BYTES.toFixed(1)}%</div>
                        <div class="performance-metric-label">Bytes Reduction</div>
                    </div>
                    <div class="performance-metric">
                        <div class="performance-metric-value">${query.TEST_CREDITS_CLOUD.toFixed(3)}</div>
                        <div class="performance-metric-label">Credits Used</div>
                    </div>
                    <div class="performance-metric">
                        <div class="performance-metric-value improvement">${query.EST_USD_SAVINGS.toFixed(2)}</div>
                        <div class="performance-metric-label">Estimated Savings</div>
                    </div>
                    <div class="performance-metric">
                        <div class="performance-metric-value">${query.WAREHOUSE_NAME}</div>
                        <div class="performance-metric-label">Warehouse</div>
                    </div>
                    <div class="performance-metric">
                        <div class="performance-metric-value">${new Date(query.RUN_DTS).toLocaleDateString()}</div>
                        <div class="performance-metric-label">Analysis Date</div>
                    </div>
                </div>

                ${query.LLM_RATIONALE ? `
                <div class="llm-rationale">
                    <div class="llm-rationale-header">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                        </svg>
                        <span class="llm-rationale-title">Claude 4 Sonnet Analysis</span>
                    </div>
                    <div class="llm-rationale-content">${query.LLM_RATIONALE}</div>
                </div>
                ` : ''}
            </div>
        `;

        // Add event listeners
        const header = container.querySelector(`#${headerId}`);
        header.addEventListener('click', () => {
            this.toggleQueryDetails(query.QUERY_ID);
        });

        return container;
    }

    toggleQueryDetails(queryId) {
        const header = document.getElementById(`header-${queryId}`);
        const details = document.getElementById(`details-${queryId}`);
        const icon = header.querySelector('.expand-icon');

        if (details.classList.contains('expanded')) {
            details.classList.remove('expanded');
            header.classList.remove('expanded');
            icon.classList.remove('expanded');
        } else {
            details.classList.add('expanded');
            header.classList.add('expanded');
            icon.classList.add('expanded');
            
            // Initialize Monaco editor for this query if not already done
            this.initializeQueryEditor(queryId);
            this.setupQueryActions(queryId);
        }
    }

    initializeQueryEditor(queryId) {
        const editorContainer = document.getElementById(`editor-${queryId}`);
        if (editorContainer.querySelector('.monaco-editor') || editorContainer.querySelector('textarea')) {
            return; // Already initialized
        }

        const query = this.queryRewriteResults.find(q => q.QUERY_ID === queryId);
        if (!query) return;

        const editor = this.createMonacoEditor(editorContainer, query.REWRITE_SQL, false);
        
        // Store editor reference
        if (!this.monacoEditors) this.monacoEditors = {};
        this.monacoEditors[queryId] = editor;
    }

    setupQueryActions(queryId) {
        const runTestBtn = document.querySelector(`[data-query-id="${queryId}"].run-test-btn`);
        const copyQueryBtn = document.querySelector(`[data-query-id="${queryId}"].copy-query-btn`);
        const deployBtn = document.querySelector(`[data-query-id="${queryId}"].deploy-btn`);

        if (runTestBtn && !runTestBtn.hasAttribute('data-listener-added')) {
            runTestBtn.addEventListener('click', () => this.runQueryTest(queryId));
            runTestBtn.setAttribute('data-listener-added', 'true');
        }

        if (copyQueryBtn && !copyQueryBtn.hasAttribute('data-listener-added')) {
            copyQueryBtn.addEventListener('click', () => this.copyQuery(queryId));
            copyQueryBtn.setAttribute('data-listener-added', 'true');
        }

        if (deployBtn && !deployBtn.hasAttribute('data-listener-added')) {
            deployBtn.addEventListener('click', () => this.deployOptimization(queryId));
            deployBtn.setAttribute('data-listener-added', 'true');
        }
    }

    async runQueryTest(queryId) {
        const runTestBtn = document.querySelector(`[data-query-id="${queryId}"].run-test-btn`);
        const testResults = document.getElementById(`test-results-${queryId}`);
        const testTime = document.getElementById(`test-time-${queryId}`);
        const testImprovement = document.getElementById(`test-improvement-${queryId}`);
        const testStatus = document.getElementById(`test-status-${queryId}`);

        // Show loading state
        runTestBtn.disabled = true;
        runTestBtn.innerHTML = `
            <svg class="w-4 h-4 spinner" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            Running Test...
        `;
        testResults.style.display = 'block';
        testStatus.innerHTML = '<span class="query-status status-running">Running</span>';

        try {
            // Get the current query from the editor
            const editor = this.monacoEditors && this.monacoEditors[queryId];
            const currentQuery = editor ? editor.getValue() : '';
            
            // Simulate query execution with realistic timing
            await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
            
            // Generate realistic test results
            const originalQuery = this.queryRewriteResults.find(q => q.QUERY_ID === queryId);
            const variation = 0.8 + Math.random() * 0.4; // 80% to 120% of expected performance
            const testTimeMs = Math.floor(originalQuery.TEST_MS * variation);
            const actualImprovement = ((originalQuery.BASE_MS - testTimeMs) / originalQuery.BASE_MS * 100);
            
            testTime.textContent = `${testTimeMs}ms`;
            testImprovement.textContent = `${actualImprovement.toFixed(1)}%`;
            testImprovement.className = 'test-metric-value ' + (actualImprovement > 0 ? 'improvement' : 'warning');
            
            // Determine status based on performance
            let status = 'success';
            let statusText = 'Success';
            if (actualImprovement < 0) {
                status = 'error';
                statusText = 'Slower';
            } else if (actualImprovement < 5) {
                status = 'warning';
                statusText = 'Marginal';
            }
            
            testStatus.innerHTML = `<span class="query-status status-${status}">${statusText}</span>`;

        } catch (error) {
            testStatus.innerHTML = '<span class="query-status status-error">Error</span>';
            testTime.textContent = 'Failed';
            testImprovement.textContent = '--';
        } finally {
            // Reset button
            runTestBtn.disabled = false;
            runTestBtn.innerHTML = `
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Run Test
            `;
        }
    }

    async copyQuery(queryId) {
        const copyBtn = document.querySelector(`[data-query-id="${queryId}"].copy-query-btn`);
        const editor = this.monacoEditors && this.monacoEditors[queryId];
        const queryText = editor ? editor.getValue() : '';

        try {
            await navigator.clipboard.writeText(queryText);
            
            // Show success feedback
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = `
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Copied!
            `;
            copyBtn.className = 'btn btn-success copy-query-btn';
            
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
                copyBtn.className = 'btn btn-secondary copy-query-btn';
            }, 2000);
            
        } catch (error) {
            console.error('Failed to copy query:', error);
        }
    }

    async deployOptimization(queryId) {
        const deployBtn = document.querySelector(`[data-query-id="${queryId}"].deploy-btn`);
        
        // Show confirmation dialog (in a real app, this would be a proper modal)
        if (!confirm('Are you sure you want to deploy this optimization? This will replace the original query in your system.')) {
            return;
        }

        // Show loading state
        deployBtn.disabled = true;
        deployBtn.innerHTML = `
            <svg class="w-4 h-4 spinner" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            Deploying...
        `;

        try {
            // Simulate deployment
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Show success state
            deployBtn.innerHTML = `
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Deployed Successfully
            `;
            deployBtn.className = 'btn btn-success deploy-btn';
            
            // Generate a success alert
            this.alerts.unshift({
                type: 'info',
                title: 'Optimization Deployed',
                description: `Query optimization for ${queryId.substring(0, 16)}... has been successfully deployed`,
                timestamp: new Date(),
                metric: 'optimization'
            });
            
            this.renderAlerts();
            
        } catch (error) {
            deployBtn.innerHTML = `
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
                Deployment Failed
            `;
            deployBtn.className = 'btn btn-danger deploy-btn';
        }
    }

    loadMoreQueries() {
        this.currentQueryPage++;
        this.renderQueryComparisons();
        this.updateResultsInfo();
    }

    generateAlerts() {
        this.alerts = [];

        // Cost surge detection
        const dailySpends = this.data.costPerCredit.reduce((acc, item) => {
            const date = new Date(item.USAGE_DATE).toISOString().split('T')[0];
            if (!acc[date]) acc[date] = 0;
            acc[date] += item.SPEND_USD;
            return acc;
        }, {});

        const spends = Object.values(dailySpends);
        const mean = spends.reduce((sum, val) => sum + val, 0) / spends.length;
        const variance = spends.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / spends.length;
        const stdDev = Math.sqrt(variance);

        Object.entries(dailySpends).forEach(([date, spend]) => {
            if (spend > mean + 3 * stdDev) {
                this.alerts.push({
                    type: 'critical',
                    title: 'Cost Surge Detected',
                    description: `Daily spend of ${spend.toFixed(2)} exceeds threshold by ${((spend - mean) / stdDev).toFixed(1)}σ`,
                    timestamp: new Date(date),
                    metric: 'cost'
                });
            }
        });

        // Idle waste detection
        this.data.idleActiveRatio.forEach(warehouse => {
            if (warehouse.QUEUED_PCT > 0.7) {
                this.alerts.push({
                    type: 'warning',
                    title: 'High Queue Time',
                    description: `${warehouse.WAREHOUSE_NAME} has ${(warehouse.QUEUED_PCT * 100).toFixed(1)}% queued time`,
                    timestamp: new Date(),
                    metric: 'performance'
                });
            }
        });

        // Query performance alerts
        const p95Values = this.data.queryPerformance.map(item => item.P95_EXEC_SEC);
        const p95Median = p95Values.sort((a, b) => a - b)[Math.floor(p95Values.length / 2)];
        const p95Variance = p95Values.reduce((sum, val) => sum + Math.pow(val - p95Median, 2), 0) / p95Values.length;
        const p95StdDev = Math.sqrt(p95Variance);

        this.data.queryPerformance.forEach(item => {
            if (item.P95_EXEC_SEC > p95Median + 2 * p95StdDev) {
                this.alerts.push({
                    type: 'warning',
                    title: 'Slow Query Spike',
                    description: `P95 execution time of ${item.P95_EXEC_SEC.toFixed(2)}s exceeds normal range`,
                    timestamp: new Date(item.USAGE_DATE),
                    metric: 'performance'
                });
            }
        });

        // Query failure spikes
        this.data.queryFailureRate.forEach(item => {
            if (item.FAILURE_RATE > 0.05) {
                this.alerts.push({
                    type: 'critical',
                    title: 'High Query Failure Rate',
                    description: `Failure rate of ${(item.FAILURE_RATE * 100).toFixed(1)}% exceeds 5% threshold`,
                    timestamp: new Date(item.USAGE_DATE),
                    metric: 'performance'
                });
            }
        });

        // Connector SLA breaches
        this.data.connectorHealth.forEach(item => {
            if (item.SLA_BREACHES > 0) {
                this.alerts.push({
                    type: 'warning',
                    title: 'Connector SLA Breach',
                    description: `${item.CONNECTOR} had ${item.SLA_BREACHES} SLA breaches`,
                    timestamp: new Date(item.RUN_DATE),
                    metric: 'pipeline'
                });
            }
        });

        // Stale datasets
        this.data.dataFreshness.forEach(item => {
            if (item.HOURS_SINCE_LAST_RUN > 12) {
                this.alerts.push({
                    type: 'info',
                    title: 'Stale Dataset',
                    description: `${item.DATASET} hasn't been updated for ${item.HOURS_SINCE_LAST_RUN} hours`,
                    timestamp: new Date(),
                    metric: 'pipeline'
                });
            }
        });

        // API anomalies
        this.data.apiZscore.forEach(item => {
            if (Math.abs(item.ZSCORE) >= 3) {
                this.alerts.push({
                    type: 'warning',
                    title: 'API Call Anomaly',
                    description: `API calls (${item.API_CALLS}) show unusual pattern (z-score: ${item.ZSCORE.toFixed(2)})`,
                    timestamp: new Date(item.RUN_DATE),
                    metric: 'pipeline'
                });
            }
        });

        // Query optimization opportunities
        if (this.queryRewriteResults.length > 0) {
            const highImpactQueries = this.queryRewriteResults.filter(q => q.PCT_MS > 70 && q.ACTION === 'ADOPT');
            if (highImpactQueries.length > 0) {
                this.alerts.push({
                    type: 'critical',
                    title: 'High-Impact Optimizations Available',
                    description: `${highImpactQueries.length} queries show >50% performance improvement potential`,
                    timestamp: new Date(),
                    metric: 'optimization'
                });
            }

            const totalSavings = this.queryRewriteResults
                .filter(q => q.ACTION === 'ADOPT')
                .reduce((sum, q) => sum + q.EST_USD_SAVINGS, 0);
            
            if (totalSavings > 100) {
                this.alerts.push({
                    type: 'info',
                    title: 'Significant Cost Savings Available',
                    description: `Implementing recommended optimizations could save ${totalSavings.toFixed(2)}`,
                    timestamp: new Date(),
                    metric: 'optimization'
                });
            }
        }

        // Sort alerts by timestamp (newest first)
        this.alerts.sort((a, b) => b.timestamp - a.timestamp);
        
        this.renderAlerts();
    }

    renderAlerts() {
        // Recommendations list (existing)
        const alertsList = document.getElementById('alertsList');
        if (alertsList) {
            alertsList.innerHTML = '';
            const visibleAlerts = this.alerts.slice(0, 5);
            visibleAlerts.forEach(alert => {
                const el = document.createElement('div');
                el.className = `p-3 bg-white border border-gray-200 rounded-lg fade-in`;
                el.innerHTML = `
                    <div class="text-sm font-medium text-gray-900">${alert.title}</div>
                    <div class="text-xs text-gray-600">${alert.description}</div>
                    <div class="text-[11px] text-gray-400">${alert.timestamp.toLocaleString()}</div>`;
                alertsList.appendChild(el);
            });
            const showMoreButton = document.getElementById('showMoreAlerts');
            if (showMoreButton) showMoreButton.style.display = this.alerts.length > 5 ? 'block' : 'none';
        }

        // Created Alerts table
        const createdTbody = document.getElementById('createdAlertsList');
        if (createdTbody) {
            createdTbody.innerHTML = '';
            this.createdAlerts.forEach(a => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="py-1 pr-2 font-medium text-gray-900">${a.name}</td>
                    <td class="py-1 pr-2 text-gray-700">${a.levelLabel}</td>
                    <td class="py-1 pr-2 text-gray-600">${a.datasets.join(', ')}</td>
                    <td class="py-1 pr-2 text-gray-700">${a.status === 'implementing' ? '<span class=\"spinner\" aria-live=\"polite\" aria-label=\"Implementing\"></span> Implementing' : a.status === 'active' ? 'Active' : 'Failed'}</td>`;
                createdTbody.appendChild(tr);
            });
        }

        // New Alerts activity
        const activity = document.getElementById('newAlertsList');
        const badge = document.getElementById('newAlertsBadge');
        if (activity && badge) {
            activity.innerHTML = '';
            this.newAlertEvents.forEach(evt => {
                const item = document.createElement('div');
                item.className = 'p-2 border border-gray-200 rounded-lg bg-white';
                item.innerHTML = `
                    <div class="flex items-center justify-between">
                        <div class="text-[11px] text-gray-500">${new Date(evt.ts).toLocaleString()}</div>
                        <button class="text-[11px] text-brand-700 hover:underline" data-view-results="${evt.id || ''}">View results</button>
                    </div>
                    <div class="text-xs text-gray-800"><span class="font-semibold">${evt.name}</span> fired • ${evt.count} matches</div>`;
                activity.appendChild(item);
            });
            badge.textContent = String(this.newAlertEvents.length);
            activity.querySelectorAll('[data-view-results]').forEach(btn => {
                btn.addEventListener('click', () => this.openResultsModal());
            });
        }
    }

    // Simple modal to show mock results and allow Deploy
    openResultsModal() {
        const modalId = 'alertResultsModal';
        let modal = document.getElementById(modalId);
        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'fixed inset-0 z-50';
            modal.innerHTML = `
            <div class="absolute inset-0 bg-black bg-opacity-40"></div>
            <div class="absolute inset-0 flex items-center justify-center p-4">
              <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
                <div class="flex items-center justify-between p-4 border-b border-gray-200">
                  <h3 class="text-lg font-semibold text-gray-900">Alert Results</h3>
                  <button id="closeResults" class="text-gray-400 hover:text-gray-600" aria-label="Close">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>
                <div class="p-4 space-y-3">
                  <div class="text-xs text-gray-500">Showing latest mock matches</div>
                  <div class="overflow-x-auto border border-gray-200 rounded-lg">
                    <table class="min-w-full text-[12px]">
                      <thead class="bg-gray-50 text-gray-600">
                        <tr><th class="text-left py-1.5 px-2">Dataset</th><th class="text-left py-1.5 px-2">Timestamp</th><th class="text-left py-1.5 px-2">Reason</th></tr>
                      </thead>
                      <tbody id="resultsBody"></tbody>
                    </table>
                  </div>
                </div>
                <div class="p-4 border-t border-gray-200 flex items-center justify-end gap-2">
                  <button id="deployAlert" class="btn btn-primary">Deploy</button>
                </div>
              </div>
            </div>`;
            document.body.appendChild(modal);
        }
        const body = modal.querySelector('#resultsBody');
        body.innerHTML = '';
        // mock rows
        const rows = Array.from({length: 3}).map(() => ({
            dataset: this.mockDatasets[Math.floor(Math.random()*this.mockDatasets.length)],
            ts: new Date().toLocaleString(),
            reason: 'Mock rule matched (example)'
        }));
        rows.forEach(r => {
            const tr = document.createElement('tr');
            tr.className = 'odd:bg-white even:bg-gray-50';
            tr.innerHTML = `<td class="py-1.5 px-2">${r.dataset}</td><td class="py-1.5 px-2">${r.ts}</td><td class="py-1.5 px-2">${r.reason}</td>`;
            body.appendChild(tr);
        });
        modal.classList.remove('hidden');
        modal.querySelector('#closeResults').onclick = () => modal.classList.add('hidden');
        modal.querySelector('#deployAlert').onclick = () => {
            // Promote most recent created alert to Active if exists
            const pending = this.createdAlerts.find(a => a.status !== 'active');
            if (pending) {
                pending.status = 'active';
                this.renderAlerts();
            }
            modal.classList.add('hidden');
        };
    }

    showMoreAlerts() {
        const alertsList = document.getElementById('alertsList');
        const hiddenAlerts = this.alerts.slice(5);
        
        hiddenAlerts.forEach(alert => {
            const alertElement = document.createElement('div');
            alertElement.className = `alert-item alert-${alert.type} fade-in`;
            alertElement.innerHTML = `
                <div class="alert-title">${alert.title}</div>
                <div class="alert-description">${alert.description}</div>
                <div class="alert-timestamp">${alert.timestamp.toLocaleString()}</div>
            `;
            alertsList.appendChild(alertElement);
        });

        document.getElementById('showMoreAlerts').style.display = 'none';
    }

    toggleSidebar() {
        const sidebar = document.getElementById('alertsSidebar');
        sidebar.classList.toggle('sidebar-collapsed');
    }

    setupTooltips() {
        const tooltip = document.getElementById('tooltip');
        const tooltipContent = tooltip.querySelector('.tooltip-content');

        document.querySelectorAll('[data-tooltip]').forEach(element => {
            element.addEventListener('mouseenter', (e) => {
                const text = e.target.getAttribute('data-tooltip');
                tooltipContent.textContent = text;
                tooltip.classList.add('visible');
                
                const rect = e.target.getBoundingClientRect();
                tooltip.style.left = rect.left + 'px';
                tooltip.style.top = (rect.top - tooltip.offsetHeight - 10) + 'px';
            });

            element.addEventListener('mouseleave', () => {
                tooltip.classList.remove('visible');
            });
        });
    }
}

// Initialize dashboard when DOM is loaded and libraries are available
document.addEventListener('DOMContentLoaded', () => {
    // Wait for libraries to load
    function waitForLibraries() {
        if (typeof ApexCharts !== 'undefined' && 
            (typeof domo !== 'undefined' || typeof window.domo !== 'undefined')) {
            window.dashboard = new SnowDomoDashboard();
        } else {
            setTimeout(waitForLibraries, 100);
        }
    }
    
    waitForLibraries();
});