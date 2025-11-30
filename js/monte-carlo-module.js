const MonteCarloModule = (function() {
    'use strict';
    
    const CONFIG = {
        defaultIterations: 1000,
        timeHorizon: 30,
        batchSize: 50,
        histogramBins: 20,
        colors: {
            standard: '#4a90e2', integrated: '#e74c3c', mitigated: '#16a34a',
            cascade: '#9b59b6', grid: '#e0e0e0', text: '#2c3e50',
            textLight: '#666', border: '#e0e0e0'
        }
    };
    
    let state = { isRunning: false, results: null, charts: {} };
    
    const getParameters = () => window.SharedConfig?.getParameters() || window.parameters || {
        ransomwareProb: 0.02, equipmentProb: 0.05, supplierProb: 0.01,
        cascadeDelay: 800, recoveryFactor: 3, costMultiplier: 1.0
    };
    
    const getActiveMitigations = () => {
        const mits = window.SharedConfig?.getActiveMitigations() || window.activeMitigations;
        return mits ? new Set(mits) : new Set();
    };
    
    const getMitigationConfigs = () => window.SharedConfig?.getMitigationConfigs() || window.mitigationConfigs || {
        backup: { cost: 5000, ransomwareReduction: 0.4 },
        firewall: { cost: 3000, ransomwareReduction: 0.35 },
        buffer: { cost: 15000, supplierReduction: 0.8, bufferDays: 30 },
        dual: { cost: 4000, supplierReduction: 0.5 },
        maintenance: { cost: 6000, equipmentReduction: 0.7 },
        redundancy: { cost: 25000, equipmentReduction: 0.8 }
    };
    
    function runSingleIteration(modelType, params, mitigations, mitConfigs) {
        let totalCost = 0;
        let cascadeCount = 0;
        let events = [];
        let bufferDays = mitigations.has('buffer') ? (mitConfigs.buffer?.bufferDays || 30) : 0;
        
        const baseCosts = {
            ransomware: 50000,
            equipment: 30000,
            supplier: 20000
        };
        
        const cascadeMultipliers = {
            ransomware: 2.0,   
            equipment: 1.5,    
            supplier: 1.75     
        };
        
 
        for (let day = 0; day < CONFIG.timeHorizon; day++) {
            // Ransomware event
            if (Math.random() < params.ransomwareProb) {
                let eventCost = baseCosts.ransomware * params.costMultiplier;
                
                if (modelType === 'integrated' || modelType === 'mitigated') {
                    eventCost *= cascadeMultipliers.ransomware;
                    cascadeCount += 2; 
                    
                    if (modelType === 'mitigated') {
                        if (mitigations.has('backup')) {
                            const reduction = mitConfigs.backup?.ransomwareReduction || 0.4;
                            eventCost *= (1 - reduction);
                        }
                        if (mitigations.has('firewall')) {
                            const reduction = mitConfigs.firewall?.ransomwareReduction || 0.35;
                            eventCost *= (1 - reduction);
                        }
                    }
                }
                
                totalCost += eventCost;
                events.push({ day, type: 'ransomware', cost: eventCost });
            }
            
            // Equipment failure event
            if (Math.random() < params.equipmentProb) {
                let eventCost = baseCosts.equipment * params.costMultiplier;
                
                if (modelType === 'integrated' || modelType === 'mitigated') {
                    eventCost *= cascadeMultipliers.equipment;
                    cascadeCount += 1;
                    
                    if (modelType === 'mitigated') {
                        if (mitigations.has('maintenance')) {
                            const reduction = mitConfigs.maintenance?.equipmentReduction || 0.7;
                            eventCost *= (1 - reduction);
                        }
                        if (mitigations.has('redundancy')) {
                            const reduction = mitConfigs.redundancy?.equipmentReduction || 0.8;
                            eventCost *= (1 - reduction);
                        }
                    }
                }
                
                totalCost += eventCost;
                events.push({ day, type: 'equipment', cost: eventCost });
            }
            
            // Supplier disruption event
            if (Math.random() < params.supplierProb) {
                let eventCost = baseCosts.supplier * params.costMultiplier;
                
                if (modelType === 'integrated' || modelType === 'mitigated') {
                    eventCost *= cascadeMultipliers.supplier;
                    
                    if (modelType === 'mitigated') {
                        if (mitigations.has('dual')) {
                            const reduction = mitConfigs.dual?.supplierReduction || 0.5;
                            eventCost *= (1 - reduction);
                        }
                        if (mitigations.has('buffer') && bufferDays > 0) {
                            const reduction = mitConfigs.buffer?.supplierReduction || 0.8;
                            eventCost *= (1 - reduction);
                            bufferDays--;
                        }
                    }
                }
                
                totalCost += eventCost;
                events.push({ day, type: 'supplier', cost: eventCost });
            }
        }
        
        return {
            totalCost,
            cascadeCount,
            events,
            eventCount: events.length
        };
    }
    
    async function runSimulation(iterations, progressCallback) {
        const params = getParameters();
        const mitigations = getActiveMitigations();
        const mitConfigs = getMitigationConfigs();
        
        const results = {
            standard: [],
            integrated: [],
            mitigated: [],
            cascades: [],
            eventCounts: []
        };
        
        let processed = 0;
        
        while (processed < iterations) {
            const batchEnd = Math.min(processed + CONFIG.batchSize, iterations);
            
            for (let i = processed; i < batchEnd; i++) {
                const stdResult = runSingleIteration('standard', params, mitigations, mitConfigs);
                const intResult = runSingleIteration('integrated', params, mitigations, mitConfigs);
                const mitResult = runSingleIteration('mitigated', params, mitigations, mitConfigs);
                
                results.standard.push(stdResult.totalCost);
                results.integrated.push(intResult.totalCost);
                results.mitigated.push(mitResult.totalCost);
                results.cascades.push(intResult.cascadeCount);
                results.eventCounts.push(intResult.eventCount);
            }
            
            processed = batchEnd;
            
            if (progressCallback) {
                progressCallback(processed / iterations);
            }
            
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        
        state.results = results;
        return calculateStatistics(results);
    }
    
    function calculateStatistics(results) {
        const calcStats = (arr) => {
            if (!arr || arr.length === 0) return null;
            
            const sorted = [...arr].sort((a, b) => a - b);
            const n = sorted.length;
            const sum = arr.reduce((a, b) => a + b, 0);
            const mean = sum / n;
            const variance = arr.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
            const stdDev = Math.sqrt(variance);
            
            const percentile = (p) => {
                const index = Math.ceil(p * n) - 1;
                return sorted[Math.max(0, Math.min(index, n - 1))];
            };
            
            return {
                n: n,
                mean: mean,
                stdDev: stdDev,
                min: sorted[0],
                max: sorted[n - 1],
                median: percentile(0.5),
                p5: percentile(0.05),
                p10: percentile(0.10),
                p25: percentile(0.25),
                p75: percentile(0.75),
                p90: percentile(0.90),
                p95: percentile(0.95),
                p99: percentile(0.99),

                ci95Lower: mean - 1.96 * (stdDev / Math.sqrt(n)),
                ci95Upper: mean + 1.96 * (stdDev / Math.sqrt(n))
            };
        };
        
        const stats = {
            standard: calcStats(results.standard),
            integrated: calcStats(results.integrated),
            mitigated: calcStats(results.mitigated),
            cascades: calcStats(results.cascades),
            eventCounts: calcStats(results.eventCounts),
            iterations: results.standard.length
        };
        
        if (stats.standard && stats.integrated) {
            stats.underestimationPercent = stats.standard.mean > 0 
                ? ((stats.integrated.mean - stats.standard.mean) / stats.standard.mean) * 100 
                : 0;
        }
        
        if (stats.integrated && stats.mitigated) {
            stats.mitigationEffectPercent = stats.integrated.mean > 0
                ? ((stats.mitigated.mean - stats.integrated.mean) / stats.integrated.mean) * 100
                : 0;
        }
        
        stats.valueAtRisk = {
            standard95: stats.standard?.p95 || 0,
            integrated95: stats.integrated?.p95 || 0,
            mitigated95: stats.mitigated?.p95 || 0
        };
        
        return stats;
    }
    
    function generateHistogramData(dataKey, bins = CONFIG.histogramBins) {
        if (!state.results || !state.results[dataKey]) return null;
        
        const data = state.results[dataKey];
        const min = Math.min(...data);
        const max = Math.max(...data);
        
        // Handle edge case where all values are the same
        if (min === max) {
            return {
                bins: [data.length],
                binEdges: [min, max + 1],
                frequencies: [1],
                min: min,
                max: max
            };
        }
        
        const binWidth = (max - min) / bins;
        const histogram = Array(bins).fill(0);
        const binEdges = [];
        
        for (let i = 0; i <= bins; i++) {
            binEdges.push(min + i * binWidth);
        }
        
        data.forEach(value => {
            const binIndex = Math.min(Math.floor((value - min) / binWidth), bins - 1);
            histogram[binIndex]++;
        });
        
        return {
            bins: histogram,
            binEdges: binEdges,
            frequencies: histogram.map(count => count / data.length),
            min: min,
            max: max,
            binWidth: binWidth
        };
    }
    

    
    function drawChart(canvasId, options) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        const width = canvas.width;
        const height = canvas.height;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        const padding = { top: 55, right: 30, bottom: 50, left: 70 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;
        
        if (options.title) {
            ctx.fillStyle = CONFIG.colors.text;
            ctx.font = '600 14px "Roboto", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(options.title, width / 2, 20);
        }
        
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(padding.left, padding.top, chartWidth, chartHeight);

        ctx.strokeStyle = CONFIG.colors.grid;
        ctx.lineWidth = 1;
        
        const yTicks = 5;
        for (let i = 0; i <= yTicks; i++) {
            const y = padding.top + (chartHeight / yTicks) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left + chartWidth, y);
            ctx.stroke();
        }
        
        // Draw data based on chart type
        if (options.type === 'histogram') {
            drawHistogramBars(ctx, options, padding, chartWidth, chartHeight);
        } else if (options.type === 'comparison') {
            drawComparisonBars(ctx, options, padding, chartWidth, chartHeight);
        }
        
        ctx.strokeStyle = CONFIG.colors.text;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, padding.top + chartHeight);
        ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
        ctx.stroke();
        
        if (options.xLabel) {
            ctx.fillStyle = CONFIG.colors.textLight;
            ctx.font = '500 12px "Roboto", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(options.xLabel, padding.left + chartWidth / 2, height - 10);
        }
        
        if (options.yLabel) {
            ctx.save();
            ctx.translate(15, padding.top + chartHeight / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillStyle = CONFIG.colors.textLight;
            ctx.font = '500 12px "Roboto", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(options.yLabel, 0, 0);
            ctx.restore();
        }
        
        state.charts[canvasId] = {
            canvas: canvas,
            padding: padding,
            chartWidth: chartWidth,
            chartHeight: chartHeight,
            options: options
        };
    }
    
    function drawHistogramBars(ctx, options, padding, chartWidth, chartHeight) {
        const datasets = options.datasets || [];
        if (datasets.length === 0) return;
        
        let maxCount = 0;
        datasets.forEach(ds => {
            if (ds.histogram && ds.histogram.bins) {
                maxCount = Math.max(maxCount, Math.max(...ds.histogram.bins));
            }
        });
        
        if (maxCount === 0) return;
        
        const numDatasets = datasets.length;
        const numBins = datasets[0].histogram?.bins?.length || 0;
        const groupWidth = chartWidth / numBins;
        const barWidth = (groupWidth - 4) / numDatasets;
        
        datasets.forEach((ds, dsIndex) => {
            if (!ds.histogram || !ds.histogram.bins) return;
            
            const histogram = ds.histogram;
            
            histogram.bins.forEach((count, binIndex) => {
                const barHeight = (count / maxCount) * chartHeight;
                const x = padding.left + binIndex * groupWidth + dsIndex * barWidth + 2;
                const y = padding.top + chartHeight - barHeight;
                
                const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
                gradient.addColorStop(0, ds.color);
                gradient.addColorStop(1, adjustColor(ds.color, -30));
                
                ctx.fillStyle = gradient;
                ctx.fillRect(x, y, barWidth - 1, barHeight);
                
                ctx.strokeStyle = adjustColor(ds.color, -40);
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, barWidth - 1, barHeight);
            });
        });
        
        if (datasets[0].histogram) {
            const hist = datasets[0].histogram;
            ctx.fillStyle = CONFIG.colors.textLight;
            ctx.font = '400 10px "Roboto", sans-serif';
            ctx.textAlign = 'center';
            
            const labelStep = Math.ceil(numBins / 6);
            for (let i = 0; i < numBins; i += labelStep) {
                const x = padding.left + i * groupWidth + groupWidth / 2;
                const label = formatCurrency(hist.binEdges[i], true);
                ctx.fillText(label, x, padding.top + chartHeight + 20);
            }
            const lastX = padding.left + (numBins - 1) * groupWidth + groupWidth / 2;
            ctx.fillText(formatCurrency(hist.binEdges[numBins], true), lastX, padding.top + chartHeight + 20);
        }
        
        ctx.fillStyle = CONFIG.colors.textLight;
        ctx.font = '400 10px "Roboto", sans-serif';
        ctx.textAlign = 'right';
        
        const yTicks = 5;
        for (let i = 0; i <= yTicks; i++) {
            const value = Math.round(maxCount * (1 - i / yTicks));
            const y = padding.top + (chartHeight / yTicks) * i + 4;
            ctx.fillText(value.toString(), padding.left - 8, y);
        }
        
        drawLegend(ctx, datasets, padding, chartWidth);
    }
    
    function drawComparisonBars(ctx, options, padding, chartWidth, chartHeight) {
        const data = options.data || [];
        if (data.length === 0) return;
        
        const maxValue = Math.max(...data.map(d => d.value));
        const barWidth = (chartWidth / data.length) - 20;
        
        data.forEach((item, index) => {
            const barHeight = (item.value / maxValue) * chartHeight * 0.9;
            const x = padding.left + index * (chartWidth / data.length) + 10;
            const y = padding.top + chartHeight - barHeight;
            
            const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
            gradient.addColorStop(0, item.color);
            gradient.addColorStop(1, adjustColor(item.color, -30));
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, barWidth, barHeight);
            
            ctx.fillStyle = CONFIG.colors.text;
            ctx.font = '600 12px "Roboto", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(formatCurrency(item.value), x + barWidth / 2, y - 8);
            
            ctx.fillStyle = CONFIG.colors.textLight;
            ctx.font = '500 11px "Roboto", sans-serif';
            ctx.fillText(item.label, x + barWidth / 2, padding.top + chartHeight + 20);
        });
    }
    
    function drawLegend(ctx, datasets, padding, chartWidth) {
        const legendY = padding.top - 12;
        let legendX = padding.left;
        
        ctx.font = '500 11px "Roboto", sans-serif';
        
        datasets.forEach((ds, index) => {
            ctx.fillStyle = ds.color;
            ctx.fillRect(legendX, legendY - 10, 12, 12);
            ctx.strokeStyle = adjustColor(ds.color, -30);
            ctx.lineWidth = 1;
            ctx.strokeRect(legendX, legendY - 10, 12, 12);
            
            ctx.fillStyle = CONFIG.colors.text;
            ctx.textAlign = 'left';
            ctx.fillText(ds.label, legendX + 16, legendY);
            
            legendX += ctx.measureText(ds.label).width + 35;
        });
    }
    
    // Tooltips
    
    function setupTooltips(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        const tooltip = document.getElementById('mc-tooltip');
        
        canvas.addEventListener('mousemove', (e) => {
            const chartInfo = state.charts[canvasId];
            if (!chartInfo || !chartInfo.options.datasets) return;
            
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const { padding, chartWidth, chartHeight, options } = chartInfo;
            
            if (x < padding.left || x > padding.left + chartWidth ||
                y < padding.top || y > padding.top + chartHeight) {
                tooltip.style.display = 'none';
                return;
            }
            
            const datasets = options.datasets;
            if (!datasets[0] || !datasets[0].histogram) return;
            
            const numBins = datasets[0].histogram.bins.length;
            const binIndex = Math.floor((x - padding.left) / (chartWidth / numBins));
            
            if (binIndex >= 0 && binIndex < numBins) {
                const hist = datasets[0].histogram;
                const rangeStart = hist.binEdges[binIndex];
                const rangeEnd = hist.binEdges[binIndex + 1];
                
                let tooltipContent = `<div class="mc-tooltip-title">Range: ${formatCurrency(rangeStart)} - ${formatCurrency(rangeEnd)}</div>`;
                
                datasets.forEach(ds => {
                    const count = ds.histogram.bins[binIndex];
                    const freq = (count / state.results[ds.dataKey].length * 100).toFixed(1);
                    tooltipContent += `<div class="mc-tooltip-row">
                        <span class="mc-tooltip-color" style="background:${ds.color}"></span>
                        <span class="mc-tooltip-label">${ds.label}:</span>
                        <span class="mc-tooltip-value">${count} (${freq}%)</span>
                    </div>`;
                });
                
                tooltip.innerHTML = tooltipContent;
                tooltip.style.display = 'block';
                tooltip.style.left = (e.clientX + 15) + 'px';
                tooltip.style.top = (e.clientY - 10) + 'px';
            }
        });
        
        canvas.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });
    }
    
    // UI
    
    function createUI() {
        return `
        <div class="mc-panel">
            <div class="mc-header">
                <div class="mc-header-content">
                    <h2 class="mc-title">Monte Carlo Simulation Analysis</h2>
                    <p class="mc-subtitle">Statistical distribution analysis over multiple simulation iterations</p>
                </div>
            </div>
            
            <div class="mc-info-banner">
                <div class="mc-info-icon">i</div>
                <div class="mc-info-text">
                    This analysis runs multiple iterations of the 30-day simulation to generate 
                    statistical distributions. Parameters and mitigations are synchronized with the 
                    main simulation panel. Adjust settings there before running analysis.
                </div>
            </div>
            
            <div class="mc-controls">
                <div class="mc-control-group">
                    <label class="mc-label">Number of Iterations</label>
                    <select id="mcIterations" class="mc-select">
                        <option value="100">100 (Quick Test)</option>
                        <option value="500">500 (Fast)</option>
                        <option value="1000" selected>1,000 (Recommended)</option>
                        <option value="2500">2,500 (Detailed)</option>
                        <option value="5000">5,000 (High Precision)</option>
                        <option value="10000">10,000 (Research Grade)</option>
                    </select>
                </div>
                
                <div class="mc-control-group">
                    <label class="mc-label">Current Parameters</label>
                    <div class="mc-params-display" id="mcParamsDisplay">
                        Loading parameters...
                    </div>
                </div>
                
                <div class="mc-button-group">
                    <button id="mcRunBtn" class="mc-btn mc-btn-primary" onclick="MonteCarloModule.run()">
                        Run Simulation
                    </button>
                    <button id="mcExportBtn" class="mc-btn" onclick="MonteCarloModule.exportResults()" disabled>
                        Export Results
                    </button>
                </div>
            </div>
            
            <div id="mcProgressContainer" class="mc-progress-container" style="display:none;">
                <div class="mc-progress-bar">
                    <div id="mcProgressFill" class="mc-progress-fill"></div>
                </div>
                <div class="mc-progress-text">
                    <span id="mcProgressPercent">0%</span>
                    <span id="mcProgressStatus">Initializing...</span>
                </div>
            </div>
            
            <div id="mcResultsContainer" class="mc-results" style="display:none;">
                <!-- Summary Statistics -->
                <div class="mc-section">
                    <h3 class="mc-section-title">Summary Statistics</h3>
                    <div class="mc-stats-grid">
                        <div class="mc-stat-card mc-stat-standard">
                            <div class="mc-stat-header">Standard Model</div>
                            <div class="mc-stat-value" id="mcStdMean">-</div>
                            <div class="mc-stat-label">Mean Cost</div>
                            <div class="mc-stat-detail" id="mcStdStd">-</div>
                        </div>
                        <div class="mc-stat-card mc-stat-danger">
                            <div class="mc-stat-header">Integrated Model</div>
                            <div class="mc-stat-value" id="mcIntMean">-</div>
                            <div class="mc-stat-label">Mean Cost (with cascades)</div>
                            <div class="mc-stat-detail" id="mcIntStd">-</div>
                        </div>
                        <div class="mc-stat-card mc-stat-success">
                            <div class="mc-stat-header">Mitigated Model</div>
                            <div class="mc-stat-value" id="mcMitMean">-</div>
                            <div class="mc-stat-label">Mean Cost (with controls)</div>
                            <div class="mc-stat-detail" id="mcMitStd">-</div>
                        </div>
                        <div class="mc-stat-card mc-stat-warning">
                            <div class="mc-stat-header">Cost Underestimation</div>
                            <div class="mc-stat-value" id="mcUnderest">-</div>
                            <div class="mc-stat-label">Integrated vs Standard</div>
                            <div class="mc-stat-detail">Traditional assessment gap</div>
                        </div>
                    </div>
                </div>
                
                <!-- Key Findings -->
                <div class="mc-section">
                    <h3 class="mc-section-title">Key Findings</h3>
                    <div id="mcFindings" class="mc-findings"></div>
                </div>
                
                <!-- Percentile Table -->
                <div class="mc-section">
                    <h3 class="mc-section-title">Distribution Percentiles</h3>
                    <div class="mc-table-container">
                        <table class="mc-table">
                            <thead>
                                <tr>
                                    <th>Model</th>
                                    <th>Min</th>
                                    <th>5th %ile</th>
                                    <th>25th %ile</th>
                                    <th>Median</th>
                                    <th>75th %ile</th>
                                    <th>95th %ile</th>
                                    <th>Max</th>
                                </tr>
                            </thead>
                            <tbody id="mcPercentilesBody"></tbody>
                        </table>
                    </div>
                    <p class="mc-table-note">
                        The 95th percentile represents Value at Risk (VaR) - the cost level exceeded only 5% of the time.
                    </p>
                </div>
                
                <!-- Distribution Charts -->
                <div class="mc-section">
                    <h3 class="mc-section-title">Cost Distribution Comparison</h3>
                    <div class="mc-charts-grid">
                        <div class="mc-chart-container">
                            <canvas id="mcCostChart" width="500" height="280"></canvas>
                        </div>
                        <div class="mc-chart-container">
                            <canvas id="mcCascadeChart" width="500" height="280"></canvas>
                        </div>
                    </div>
                </div>
                
                <!-- Statistical Confidence -->
                <div class="mc-section">
                    <h3 class="mc-section-title">Statistical Confidence</h3>
                    <div class="mc-confidence-grid">
                        <div class="mc-confidence-item">
                            <div class="mc-confidence-label">Sample Size (n)</div>
                            <div class="mc-confidence-value" id="mcSampleSize">-</div>
                        </div>
                        <div class="mc-confidence-item">
                            <div class="mc-confidence-label">95% CI (Standard)</div>
                            <div class="mc-confidence-value" id="mcCIStd">-</div>
                        </div>
                        <div class="mc-confidence-item">
                            <div class="mc-confidence-label">95% CI (Integrated)</div>
                            <div class="mc-confidence-value" id="mcCIInt">-</div>
                        </div>
                        <div class="mc-confidence-item">
                            <div class="mc-confidence-label">Avg Cascades/Run</div>
                            <div class="mc-confidence-value" id="mcAvgCascades">-</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Tooltip element -->
        <div id="mc-tooltip" class="mc-tooltip"></div>
        `;
    }
    
    function createStyles() {
        return `
        .mc-panel {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .mc-header {
            background: #2c3e50;
            padding: 24px 28px;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .mc-title {
            font-size: 20px;
            font-weight: 600;
            color: #ffffff;
            margin: 0 0 6px 0;
        }
        
        .mc-subtitle {
            font-size: 14px;
            color: rgba(255,255,255,0.8);
            margin: 0;
        }
        
        .mc-info-banner {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 16px 28px;
            background: #f8f9fa;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .mc-info-icon {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #0284c7;
            color: white;
            font-size: 12px;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            margin-top: 2px;
        }
        
        .mc-info-text {
            font-size: 13px;
            color: #0369a1;
            line-height: 1.5;
        }
        
        .mc-controls {
            display: flex;
            align-items: flex-end;
            gap: 24px;
            padding: 24px 28px;
            background: #f9fafb;
            border-bottom: 1px solid #e5e7eb;
            flex-wrap: wrap;
        }
        
        .mc-control-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .mc-label {
            font-size: 12px;
            font-weight: 600;
            color: #4b5563;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .mc-select {
            padding: 10px 14px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 14px;
            font-family: inherit;
            background: white;
            min-width: 180px;
            cursor: pointer;
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        
        .mc-select:hover {
            border-color: #9ca3af;
        }
        
        .mc-select:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .mc-params-display {
            font-size: 12px;
            color: #6b7280;
            font-family: 'Roboto Mono', monospace;
            background: white;
            padding: 10px 14px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            min-width: 280px;
        }
        
        .mc-button-group {
            display: flex;
            gap: 12px;
            margin-left: auto;
        }
        
        .mc-btn {
            padding: 12px 20px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 13px;
            font-weight: 500;
            font-family: inherit;
            cursor: pointer;
            transition: all 0.2s;
            background: white;
            color: #2c3e50;
        }
        
        .mc-btn:hover:not(:disabled) {
            background: #2c3e50;
            color: white;
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .mc-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .mc-btn-primary {
            background: #2c3e50;
            color: white;
            border-color: #2c3e50;
        }
        
        .mc-btn-primary:hover:not(:disabled) {
            background: #34495e;
            border-color: #34495e;
        }
        
        .mc-progress-container {
            padding: 20px 28px;
            background: #fafafa;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .mc-progress-bar {
            height: 8px;
            background: #e0e0e0;
            border-radius: 4px;
            overflow: hidden;
        }
        
        .mc-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #4a90e2, #16a34a);
            width: 0%;
            transition: width 0.3s ease;
            border-radius: 4px;
        }
        
        .mc-progress-text {
            display: flex;
            justify-content: space-between;
            margin-top: 8px;
            font-size: 13px;
        }
        
        #mcProgressPercent {
            font-weight: 600;
            color: #1f2937;
        }
        
        #mcProgressStatus {
            color: #6b7280;
        }
        
        .mc-results {
            padding: 28px;
        }
        
        .mc-section {
            margin-bottom: 32px;
        }
        
        .mc-section:last-child {
            margin-bottom: 0;
        }
        
        .mc-section-title {
            font-size: 16px;
            font-weight: 600;
            color: #2c3e50;
            margin: 0 0 16px 0;
            padding-bottom: 8px;
            border-bottom: 2px solid #e0e0e0;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .mc-stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
        }
        
        @media (max-width: 1200px) {
            .mc-stats-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }
        
        @media (max-width: 600px) {
            .mc-stats-grid {
                grid-template-columns: 1fr;
            }
        }
        
        .mc-stat-card {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            padding: 15px;
            text-align: center;
            transition: all 0.2s;
        }
        
        .mc-stat-card:hover {
            border-color: #2c3e50;
            box-shadow: 0 2px 8px rgba(44, 62, 80, 0.1);
        }
        
        .mc-stat-card.mc-stat-danger {
            background: white;
            border: 1px solid #e0e0e0;
        }
        
        .mc-stat-card.mc-stat-success {
            background: white;
            border: 1px solid #e0e0e0;
        }
        
        .mc-stat-card.mc-stat-warning {
            background: white;
            border: 1px solid #e0e0e0;
        }
        
        .mc-stat-card.mc-stat-standard {
            background: white;
            border: 1px solid #e0e0e0;
        }
        
        .mc-stat-header {
            font-size: 11px;
            font-weight: 500;
            color: #999;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }
        
        .mc-stat-value {
            font-size: 24px;
            font-weight: 600;
            color: #2c3e50;
            font-family: monospace;
            margin-bottom: 4px;
        }
        
        .mc-stat-card.mc-stat-danger .mc-stat-value {
            color: #2c3e50;
        }
        
        .mc-stat-card.mc-stat-success .mc-stat-value {
            color: #2c3e50;
        }
        
        .mc-stat-card.mc-stat-warning .mc-stat-value {
            color: #2c3e50;
        }
        
        .mc-stat-card.mc-stat-standard .mc-stat-value {
            color: #2c3e50;
        }
        
        .mc-stat-label {
            font-size: 12px;
            color: #666;
            margin-bottom: 8px;
        }
        
        .mc-stat-detail {
            font-size: 12px;
            color: #999;
            font-family: monospace;
        }
        
        .mc-findings {
            background: #fafafa;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            padding: 20px;
        }
        
        .mc-finding-item {
            padding: 12px 16px;
            margin-bottom: 12px;
            border-radius: 4px;
            font-size: 13px;
            line-height: 1.6;
            background: white;
            border: 1px solid #e0e0e0;
            color: #2c3e50;
        }
        
        .mc-finding-item:last-child {
            margin-bottom: 0;
        }
        
        .mc-finding-item.critical {
            background: white;
            border: 1px solid #e0e0e0;
            color: #2c3e50;
        }
        
        .mc-finding-item.positive {
            background: white;
            border: 1px solid #e0e0e0;
            color: #2c3e50;
        }
        
        .mc-finding-item.neutral {
            background: white;
            border: 1px solid #e0e0e0;
            color: #2c3e50;
        }
        
        .mc-table-container {
            overflow-x: auto;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
        }
        
        .mc-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }
        
        .mc-table th,
        .mc-table td {
            padding: 10px 12px;
            text-align: right;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .mc-table th {
            background: #2c3e50;
            color: white;
            font-weight: 500;
            text-align: right;
        }
        
        .mc-table th:first-child,
        .mc-table td:first-child {
            text-align: left;
            font-weight: 600;
            color: #2c3e50;
            font-family: monospace;
        }
        
        .mc-table tbody tr:hover {
            background: #fafafa;
        }
        
        .mc-table tbody tr:last-child td {
            border-bottom: none;
        }
        
        .mc-table .row-standard td:first-child {
            color: #4a90e2;
        }
        
        .mc-table .row-integrated {
            background: #fef5f5;
        }
        
        .mc-table .row-integrated td:first-child {
            color: #e74c3c;
        }
        
        .mc-table .row-mitigated {
            background: #f0fdf4;
        }
        
        .mc-table .row-mitigated td:first-child {
            color: #16a34a;
        }
        
        .mc-table-note {
            margin-top: 12px;
            font-size: 12px;
            color: #666;
            font-style: italic;
        }
        
        .mc-charts-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
        }
        
        @media (max-width: 1000px) {
            .mc-charts-grid {
                grid-template-columns: 1fr;
            }
        }
        
        .mc-chart-container {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 16px;
        }
        
        .mc-chart-container canvas {
            display: block;
            max-width: 100%;
            height: auto;
        }
        
        .mc-confidence-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
        }
        
        @media (max-width: 800px) {
            .mc-confidence-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }
        
        .mc-confidence-item {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 16px;
            text-align: center;
        }
        
        .mc-confidence-label {
            font-size: 11px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }
        
        .mc-confidence-value {
            font-size: 16px;
            font-weight: 600;
            color: #1f2937;
            font-family: 'Roboto Mono', monospace;
        }
        
        /* Tooltip Styles */
        .mc-tooltip {
            position: fixed;
            display: none;
            background: rgba(31, 41, 55, 0.95);
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 12px;
            z-index: 1000;
            pointer-events: none;
            box-shadow: 0 4px 20px rgba(0,0,0,0.25);
            max-width: 280px;
        }
        
        .mc-tooltip-title {
            font-weight: 600;
            margin-bottom: 8px;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(255,255,255,0.2);
        }
        
        .mc-tooltip-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 6px;
        }
        
        .mc-tooltip-color {
            width: 12px;
            height: 12px;
            border-radius: 3px;
            flex-shrink: 0;
        }
        
        .mc-tooltip-label {
            color: rgba(255,255,255,0.8);
        }
        
        .mc-tooltip-value {
            margin-left: auto;
            font-weight: 600;
            font-family: 'Roboto Mono', monospace;
        }
        `;
    }
    
    // Add Helper Functions
    
    function formatCurrency(value, compact = false) {
        if (compact && value >= 1000) {
            return '$' + (value / 1000).toFixed(0) + 'K';
        }
        return '$' + Math.round(value).toLocaleString();
    }
    
    function adjustColor(color, amount) {
        const num = parseInt(color.replace('#', ''), 16);
        const r = Math.min(255, Math.max(0, (num >> 16) + amount));
        const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
        const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
        return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
    }
    
    function updateParameterDisplay() {
        const params = getParameters();
        const mitigations = getActiveMitigations();
        
        const display = document.getElementById('mcParamsDisplay');
        if (display) {
            display.innerHTML = `
                R: ${(params.ransomwareProb * 100).toFixed(1)}% | 
                E: ${(params.equipmentProb * 100).toFixed(1)}% | 
                S: ${(params.supplierProb * 100).toFixed(1)}% | 
                Mit: ${mitigations.size}/6
            `;
        }
    }
    
    function updateResultsDisplay(stats) {
        document.getElementById('mcStdMean').textContent = formatCurrency(stats.standard.mean);
        document.getElementById('mcStdStd').textContent = 'SD: ' + formatCurrency(stats.standard.stdDev);
        
        document.getElementById('mcIntMean').textContent = formatCurrency(stats.integrated.mean);
        document.getElementById('mcIntStd').textContent = 'SD: ' + formatCurrency(stats.integrated.stdDev);
        
        document.getElementById('mcMitMean').textContent = formatCurrency(stats.mitigated.mean);
        document.getElementById('mcMitStd').textContent = 'SD: ' + formatCurrency(stats.mitigated.stdDev);
        
        const underest = stats.underestimationPercent;
        document.getElementById('mcUnderest').textContent = '+' + underest.toFixed(1) + '%';
        
        const tbody = document.getElementById('mcPercentilesBody');
        tbody.innerHTML = `
            <tr class="row-standard">
                <td>Standard Model</td>
                <td>${formatCurrency(stats.standard.min)}</td>
                <td>${formatCurrency(stats.standard.p5)}</td>
                <td>${formatCurrency(stats.standard.p25)}</td>
                <td>${formatCurrency(stats.standard.median)}</td>
                <td>${formatCurrency(stats.standard.p75)}</td>
                <td>${formatCurrency(stats.standard.p95)}</td>
                <td>${formatCurrency(stats.standard.max)}</td>
            </tr>
            <tr class="row-integrated">
                <td>Integrated Model</td>
                <td>${formatCurrency(stats.integrated.min)}</td>
                <td>${formatCurrency(stats.integrated.p5)}</td>
                <td>${formatCurrency(stats.integrated.p25)}</td>
                <td>${formatCurrency(stats.integrated.median)}</td>
                <td>${formatCurrency(stats.integrated.p75)}</td>
                <td>${formatCurrency(stats.integrated.p95)}</td>
                <td>${formatCurrency(stats.integrated.max)}</td>
            </tr>
            <tr class="row-mitigated">
                <td>Mitigated Model</td>
                <td>${formatCurrency(stats.mitigated.min)}</td>
                <td>${formatCurrency(stats.mitigated.p5)}</td>
                <td>${formatCurrency(stats.mitigated.p25)}</td>
                <td>${formatCurrency(stats.mitigated.median)}</td>
                <td>${formatCurrency(stats.mitigated.p75)}</td>
                <td>${formatCurrency(stats.mitigated.p95)}</td>
                <td>${formatCurrency(stats.mitigated.max)}</td>
            </tr>
        `;
        
        const findings = [];
        
        findings.push({
            type: 'critical',
            text: `<strong>Cost Underestimation:</strong> Traditional risk assessment underestimates costs by 
                   <strong>${underest.toFixed(1)}%</strong> on average when cyber-physical interdependencies 
                   are not considered (n=${stats.iterations.toLocaleString()}).`
        });
        
        const varDiff = ((stats.valueAtRisk.integrated95 - stats.valueAtRisk.standard95) / 
                        stats.valueAtRisk.standard95 * 100);
        findings.push({
            type: 'critical',
            text: `<strong>Value at Risk:</strong> The 95th percentile VaR is 
                   <strong>${varDiff.toFixed(1)}%</strong> higher in the integrated model 
                   (${formatCurrency(stats.valueAtRisk.integrated95)} vs ${formatCurrency(stats.valueAtRisk.standard95)}), 
                   indicating greater tail risk from cascading failures.`
        });
        
        if (stats.mitigationEffectPercent < 0) {
            findings.push({
                type: 'positive',
                text: `<strong>Mitigation Effectiveness:</strong> Active controls reduce expected costs by 
                       <strong>${Math.abs(stats.mitigationEffectPercent).toFixed(1)}%</strong> 
                       compared to the unmitigated integrated model.`
            });
        }
        
        findings.push({
            type: 'neutral',
            text: `<strong>Cascade Frequency:</strong> Average of 
                   <strong>${stats.cascades.mean.toFixed(1)}</strong> cascade events per 30-day period 
                   (SD: ${stats.cascades.stdDev.toFixed(1)}).`
        });
        
        document.getElementById('mcFindings').innerHTML = findings.map(f => 
            `<div class="mc-finding-item ${f.type}">${f.text}</div>`
        ).join('');
        
        document.getElementById('mcSampleSize').textContent = stats.iterations.toLocaleString();
        document.getElementById('mcCIStd').textContent = 
            formatCurrency(stats.standard.ci95Lower) + ' - ' + formatCurrency(stats.standard.ci95Upper);
        document.getElementById('mcCIInt').textContent = 
            formatCurrency(stats.integrated.ci95Lower) + ' - ' + formatCurrency(stats.integrated.ci95Upper);
        document.getElementById('mcAvgCascades').textContent = stats.cascades.mean.toFixed(2);
        
        drawChart('mcCostChart', {
            type: 'histogram',
            title: 'Cost Distribution by Model',
            xLabel: 'Total Cost',
            yLabel: 'Frequency',
            datasets: [
                {
                    label: 'Standard',
                    color: CONFIG.colors.standard,
                    histogram: generateHistogramData('standard'),
                    dataKey: 'standard'
                },
                {
                    label: 'Integrated',
                    color: CONFIG.colors.integrated,
                    histogram: generateHistogramData('integrated'),
                    dataKey: 'integrated'
                },
                {
                    label: 'Mitigated',
                    color: CONFIG.colors.mitigated,
                    histogram: generateHistogramData('mitigated'),
                    dataKey: 'mitigated'
                }
            ]
        });
        
        drawChart('mcCascadeChart', {
            type: 'histogram',
            title: 'Cascade Event Distribution',
            xLabel: 'Number of Cascades',
            yLabel: 'Frequency',
            datasets: [
                {
                    label: 'Cascade Count',
                    color: CONFIG.colors.cascade,
                    histogram: generateHistogramData('cascades', 15),
                    dataKey: 'cascades'
                }
            ]
        });
        
        // Setup tooltips
        setupTooltips('mcCostChart');
        setupTooltips('mcCascadeChart');
    }
    
    // Public API - these should all be the same
    
    return {
        init: function(containerId) {
            const container = document.getElementById(containerId);
            if (!container) {
                console.error('Monte Carlo: Container not found:', containerId);
                return;
            }
            
            const styleEl = document.createElement('style');
            styleEl.textContent = createStyles();
            document.head.appendChild(styleEl);
            
            container.innerHTML = createUI();
            
            updateParameterDisplay();
            
            setInterval(updateParameterDisplay, 2000);
            
            console.log('Monte Carlo Module initialized');
        },
        
        run: async function() {
            if (state.isRunning) return;
            
            state.isRunning = true;
            const iterations = parseInt(document.getElementById('mcIterations').value);
            
            const runBtn = document.getElementById('mcRunBtn');
            runBtn.textContent = 'Running...';
            runBtn.disabled = true;
            
            document.getElementById('mcProgressContainer').style.display = 'block';
            document.getElementById('mcResultsContainer').style.display = 'none';
            
            const progressCallback = (progress) => {
                const pct = Math.round(progress * 100);
                document.getElementById('mcProgressFill').style.width = pct + '%';
                document.getElementById('mcProgressPercent').textContent = pct + '%';
                document.getElementById('mcProgressStatus').textContent = 
                    pct < 100 ? `Processing iteration ${Math.round(progress * iterations)}...` : 'Calculating statistics...';
            };
            
            try {
                const stats = await runSimulation(iterations, progressCallback);
                
                document.getElementById('mcResultsContainer').style.display = 'block';
                document.getElementById('mcExportBtn').disabled = false;
                
                await new Promise(resolve => setTimeout(resolve, 50));
                
                updateResultsDisplay(stats);
                
            } catch (error) {
                console.error('Monte Carlo simulation error:', error);
                alert('Simulation error: ' + error.message);
            } finally {
                state.isRunning = false;
                runBtn.textContent = 'Run Simulation';
                runBtn.disabled = false;
                document.getElementById('mcProgressContainer').style.display = 'none';
            }
        },
        
        exportResults: function() {
            if (!state.results) {
                alert('No results to export. Run a simulation first.');
                return;
            }
            
            const stats = calculateStatistics(state.results);
            const params = getParameters();
            const mitigations = Array.from(getActiveMitigations());
            
            const exportData = {
                metadata: {
                    timestamp: new Date().toISOString(),
                    iterations: stats.iterations,
                    timeHorizon: CONFIG.timeHorizon
                },
                parameters: params,
                activeMitigations: mitigations,
                statistics: stats,
                rawData: state.results
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `monte-carlo-results-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        },
        
        getResults: function() {
            return state.results ? calculateStatistics(state.results) : null;
        }
    };
})();

// Make available globally
window.MonteCarloModule = MonteCarloModule;