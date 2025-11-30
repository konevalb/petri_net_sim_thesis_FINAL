const FTAModule = (function() {
    'use strict';
    
    const CONFIG = {
        colors: {
            primary: '#2c3e50', standard: '#4a90e2', risk: '#e74c3c',
            mitigated: '#16a34a', warning: '#f39c12', cyber: '#9b59b6',
            text: '#2c3e50', textLight: '#666', textMuted: '#999',
            border: '#e0e0e0', background: '#fafafa', white: '#ffffff'
        },
        tree: { nodeWidth: 140, nodeHeight: 50, gateSize: 40, levelSpacing: 100, nodeSpacing: 30 }
    };
    
    let state = { initialized: false, selectedNode: null, faultTree: null, calculatedMetrics: null };
    
    const getParameters = () => window.SharedConfig?.getParameters() || {
        ransomwareProb: 0.02, equipmentProb: 0.05, supplierProb: 0.01,
        cascadeDelay: 800, recoveryFactor: 3, costMultiplier: 1.0
    };
    
    const getActiveMitigations = () => window.SharedConfig?.getActiveMitigations() || window.activeMitigations || new Set();
    
    const getMitigationConfigs = () => window.SharedConfig?.getMitigationConfigs() || window.mitigationConfigs || {
        backup: { cost: 5000, ransomwareReduction: 0.4 },
        firewall: { cost: 3000, ransomwareReduction: 0.35 },
        buffer: { cost: 15000, supplierReduction: 0.8, bufferDays: 30 },
        dual: { cost: 4000, supplierReduction: 0.5 },
        maintenance: { cost: 6000, equipmentReduction: 0.7 },
        redundancy: { cost: 25000, equipmentReduction: 0.8 }
    };
    
    function buildFaultTree() {
        const params = getParameters();
        const mitigations = getActiveMitigations();
        const configs = getMitigationConfigs();
        
        let ransomwareEffective = params.ransomwareProb;
        let equipmentEffective = params.equipmentProb;
        let supplierEffective = params.supplierProb;
        
        if (mitigations.has('backup')) {
            ransomwareEffective *= (1 - configs.backup.ransomwareReduction);
        }
        if (mitigations.has('firewall')) {
            ransomwareEffective *= (1 - configs.firewall.ransomwareReduction);
        }
        if (mitigations.has('maintenance')) {
            equipmentEffective *= (1 - configs.maintenance.equipmentReduction);
        }
        if (mitigations.has('redundancy')) {
            equipmentEffective *= (1 - configs.redundancy.equipmentReduction);
        }
        if (mitigations.has('dual')) {
            supplierEffective *= (1 - configs.dual.supplierReduction);
        }
        if (mitigations.has('buffer')) {
            supplierEffective *= (1 - configs.buffer.supplierReduction);
        }
        
        // IEC 61025 tree structure
        const tree = {
            id: 'TOP',
            name: 'Supply Chain Disruption',
            type: 'event',
            description: 'Complete or partial supply chain failure affecting customer delivery',
            gate: {
                id: 'G1',
                type: 'OR',
                description: 'Any of the following failure modes leads to disruption'
            },
            children: [
                {
                    id: 'IE1',
                    name: 'Cyber Attack Impact',
                    type: 'intermediate',
                    description: 'Cyber-physical cascade from IT system compromise',
                    gate: {
                        id: 'G2',
                        type: 'AND',
                        description: 'Attack must succeed AND propagate to physical systems'
                    },
                    children: [
                        {
                            id: 'BE1',
                            name: 'Ransomware Attack',
                            type: 'basic',
                            description: 'Malicious encryption of IT systems',
                            probability: params.ransomwareProb,
                            effectiveProbability: ransomwareEffective,
                            baseCost: 50000,
                            mitigations: ['backup', 'firewall'],
                            category: 'cyber'
                        },
                        {
                            id: 'BE2',
                            name: 'IT-OT Connection',
                            type: 'basic',
                            description: 'Network path between IT and operational technology',
                            probability: 0.85,
                            effectiveProbability: mitigations.has('firewall') ? 0.55 : 0.85,
                            baseCost: 0,
                            mitigations: ['firewall'],
                            category: 'cyber'
                        }
                    ]
                },
                {
                    id: 'IE2',
                    name: 'Physical System Failure',
                    type: 'intermediate',
                    description: 'Direct physical equipment or process failure',
                    gate: {
                        id: 'G3',
                        type: 'OR',
                        description: 'Any physical failure causes disruption'
                    },
                    children: [
                        {
                            id: 'BE3',
                            name: 'Equipment Failure',
                            type: 'basic',
                            description: 'Critical manufacturing equipment breakdown',
                            probability: params.equipmentProb,
                            effectiveProbability: equipmentEffective,
                            baseCost: 30000,
                            mitigations: ['maintenance', 'redundancy'],
                            category: 'physical'
                        },
                        {
                            id: 'BE4',
                            name: 'Process Deviation',
                            type: 'basic',
                            description: 'Quality or process control failure',
                            probability: 0.03,
                            effectiveProbability: mitigations.has('maintenance') ? 0.01 : 0.03,
                            baseCost: 15000,
                            mitigations: ['maintenance'],
                            category: 'physical'
                        }
                    ]
                },
                {
                    id: 'IE3',
                    name: 'Supply Network Failure',
                    type: 'intermediate',
                    description: 'Upstream supply chain disruption',
                    gate: {
                        id: 'G4',
                        type: 'OR',
                        description: 'Any supply issue causes disruption'
                    },
                    children: [
                        {
                            id: 'BE5',
                            name: 'Supplier Disruption',
                            type: 'basic',
                            description: 'Key supplier bankruptcy or capacity issue',
                            probability: params.supplierProb,
                            effectiveProbability: supplierEffective,
                            baseCost: 20000,
                            mitigations: ['dual', 'buffer'],
                            category: 'supply'
                        },
                        {
                            id: 'BE6',
                            name: 'Logistics Failure',
                            type: 'basic',
                            description: 'Transportation or distribution breakdown',
                            probability: 0.02,
                            effectiveProbability: mitigations.has('buffer') ? 0.005 : 0.02,
                            baseCost: 10000,
                            mitigations: ['buffer'],
                            category: 'supply'
                        }
                    ]
                }
            ]
        };
        
        calculateGateProbabilities(tree);
        
        return tree;
    }
    
    function calculateGateProbabilities(node) {
        if (node.type === 'basic') {
            return node.effectiveProbability;
        }
        
        if (node.children && node.children.length > 0) {
            const childProbs = node.children.map(child => calculateGateProbabilities(child));
            
            if (node.gate.type === 'AND') {
                node.probability = childProbs.reduce((a, b) => a * b, 1);
            } else if (node.gate.type === 'OR') {
                // P(A OR B) = 1 - (1-P(A))(1-P(B))
                node.probability = 1 - childProbs.reduce((acc, p) => acc * (1 - p), 1);
            }
            
            return node.probability;
        }
        
        return 0;
    }
    
    
    function calculateImportanceMeasures() {
        const tree = state.faultTree;
        const topEventProb = tree.probability;
        const basicEvents = getBasicEvents(tree);
        const metrics = [];
        
        basicEvents.forEach(event => {
            const fvi = calculateFussellVesely(event, tree);
            const birnbaum = calculateBirnbaum(event, tree);
            const raw = calculateRAW(event, tree, topEventProb);
            const rrw = calculateRRW(event, tree, topEventProb);
            
            metrics.push({
                id: event.id,
                name: event.name,
                category: event.category,
                baseProbability: event.probability,
                effectiveProbability: event.effectiveProbability,
                mitigations: event.mitigations,
                baseCost: event.baseCost,
                fussellVesely: fvi,
                birnbaum: birnbaum,
                raw: raw,
                rrw: rrw,
                criticality: (fvi + birnbaum + (raw - 1)) / 3 
            });
        });
        
        metrics.sort((a, b) => b.criticality - a.criticality);
        
        return metrics;
    }
    
    function getBasicEvents(node, events = []) {
        if (node.type === 'basic') {
            events.push(node);
        }
        if (node.children) {
            node.children.forEach(child => getBasicEvents(child, events));
        }
        return events;
    }
    
    function calculateFussellVesely(event, tree) {
        const originalProb = tree.probability;
        if (originalProb === 0) return 0;
        
        const savedProb = event.effectiveProbability;
        event.effectiveProbability = 0;
        calculateGateProbabilities(tree);
        const reducedProb = tree.probability;
        event.effectiveProbability = savedProb;
        calculateGateProbabilities(tree);
        
        return (originalProb - reducedProb) / originalProb;
    }
    
    function calculateBirnbaum(event, tree) {
        const savedProb = event.effectiveProbability;
        
        event.effectiveProbability = 1;
        calculateGateProbabilities(tree);
        const probFailed = tree.probability;
        
        event.effectiveProbability = 0;
        calculateGateProbabilities(tree);
        const probWorking = tree.probability;
        
        event.effectiveProbability = savedProb;
        calculateGateProbabilities(tree);
        
        return probFailed - probWorking;
    }
    
    function calculateRAW(event, tree, topEventProb) {
        if (topEventProb === 0) return 1;
        
        const savedProb = event.effectiveProbability;
        event.effectiveProbability = 1;
        calculateGateProbabilities(tree);
        const probFailed = tree.probability;
        event.effectiveProbability = savedProb;
        calculateGateProbabilities(tree);
        
        return probFailed / topEventProb;
    }
    
    function calculateRRW(event, tree, topEventProb) {
        const savedProb = event.effectiveProbability;
        event.effectiveProbability = 0;
        calculateGateProbabilities(tree);
        const probWorking = tree.probability;
        event.effectiveProbability = savedProb;
        calculateGateProbabilities(tree);
        
        if (probWorking === 0) return Infinity;
        return topEventProb / probWorking;
    }
    
    
    function calculateMinimalCutSets() {
        const tree = state.faultTree;
        const cutSets = [];
        
        cutSets.push({
            id: 'MCS1',
            name: 'Cyber Attack Cascade',
            events: ['BE1', 'BE2'],
            eventNames: ['Ransomware Attack', 'IT-OT Connection'],
            probability: state.faultTree.children[0].probability,
            order: 2,
            category: 'cyber'
        });
        
        cutSets.push({
            id: 'MCS2',
            name: 'Equipment Breakdown',
            events: ['BE3'],
            eventNames: ['Equipment Failure'],
            probability: getBasicEvents(tree).find(e => e.id === 'BE3').effectiveProbability,
            order: 1,
            category: 'physical'
        });
        
        cutSets.push({
            id: 'MCS3',
            name: 'Process Failure',
            events: ['BE4'],
            eventNames: ['Process Deviation'],
            probability: getBasicEvents(tree).find(e => e.id === 'BE4').effectiveProbability,
            order: 1,
            category: 'physical'
        });
        
        cutSets.push({
            id: 'MCS4',
            name: 'Supplier Failure',
            events: ['BE5'],
            eventNames: ['Supplier Disruption'],
            probability: getBasicEvents(tree).find(e => e.id === 'BE5').effectiveProbability,
            order: 1,
            category: 'supply'
        });
        
        cutSets.push({
            id: 'MCS5',
            name: 'Logistics Breakdown',
            events: ['BE6'],
            eventNames: ['Logistics Failure'],
            probability: getBasicEvents(tree).find(e => e.id === 'BE6').effectiveProbability,
            order: 1,
            category: 'supply'
        });
        
        cutSets.sort((a, b) => b.probability - a.probability);
        
        return cutSets;
    }
    
    
    function render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        // Build/update the fault tree
        state.faultTree = buildFaultTree();
        state.calculatedMetrics = calculateImportanceMeasures();
        const cutSets = calculateMinimalCutSets();
        
        const params = getParameters();
        const mitigations = getActiveMitigations();
        
        container.innerHTML = `
            <style>${getStyles()}</style>
            <div class="fta-container">
                <!-- Header -->
                <div class="fta-header">
                    <div class="fta-header-content">
                        <h2 class="fta-title">Enhanced Fault Tree Analysis</h2>
                        <p class="fta-subtitle">Quantitative risk assessment following IEC 61025 and IEEE Std 352</p>
                    </div>
                </div>
                
                <!-- Parameter Info Banner -->
                <div class="fta-info-banner">
                    <div class="fta-info-icon">i</div>
                    <div class="fta-info-text">
                        This analysis uses parameters from the Petri Net simulation. Adjust sliders on the Simulation tab to see real-time updates.
                        Current: Ransomware ${(params.ransomwareProb * 100).toFixed(1)}% | Equipment ${(params.equipmentProb * 100).toFixed(1)}% | Supplier ${(params.supplierProb * 100).toFixed(1)}% | Mitigations: ${mitigations.size}/6
                    </div>
                    <button class="fta-btn" onclick="FTAModule.refresh()">Refresh Analysis</button>
                </div>
                
                <!-- Main Content -->
                <div class="fta-content">
                    <!-- Top Event Summary -->
                    <div class="fta-section">
                        <h3 class="fta-section-title">System Risk Summary</h3>
                        <div class="fta-summary-grid">
                            <div class="fta-summary-card">
                                <div class="fta-summary-label">Top Event Probability</div>
                                <div class="fta-summary-value">${(state.faultTree.probability * 100).toFixed(2)}%</div>
                                <div class="fta-summary-detail">P(Supply Chain Disruption)</div>
                            </div>
                            <div class="fta-summary-card">
                                <div class="fta-summary-label">Minimal Cut Sets</div>
                                <div class="fta-summary-value">${cutSets.length}</div>
                                <div class="fta-summary-detail">Unique failure pathways</div>
                            </div>
                            <div class="fta-summary-card">
                                <div class="fta-summary-label">Basic Events</div>
                                <div class="fta-summary-value">${state.calculatedMetrics.length}</div>
                                <div class="fta-summary-detail">Component failure modes</div>
                            </div>
                            <div class="fta-summary-card">
                                <div class="fta-summary-label">Active Mitigations</div>
                                <div class="fta-summary-value">${mitigations.size}/6</div>
                                <div class="fta-summary-detail">Risk controls enabled</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Fault Tree Visualization -->
                    <div class="fta-section">
                        <h3 class="fta-section-title">Fault Tree Diagram</h3>
                        <div class="fta-tree-container">
                            <canvas id="ftaCanvas" width="900" height="500"></canvas>
                        </div>
                        <div class="fta-tree-legend">
                            <div class="fta-legend-item">
                                <div class="fta-legend-symbol fta-legend-event"></div>
                                <span>Top/Intermediate Event</span>
                            </div>
                            <div class="fta-legend-item">
                                <div class="fta-legend-symbol fta-legend-basic"></div>
                                <span>Basic Event</span>
                            </div>
                            <div class="fta-legend-item">
                                <div class="fta-legend-symbol fta-legend-or">OR</div>
                                <span>OR Gate</span>
                            </div>
                            <div class="fta-legend-item">
                                <div class="fta-legend-symbol fta-legend-and">AND</div>
                                <span>AND Gate</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Importance Measures -->
                    <div class="fta-section">
                        <h3 class="fta-section-title">Importance Measures</h3>
                        <div class="fta-methodology-note">
                            Importance measures quantify component contributions to system risk per IEC 61025 and NUREG-0492.
                        </div>
                        <div class="fta-table-container">
                            <table class="fta-table">
                                <thead>
                                    <tr>
                                        <th>Basic Event</th>
                                        <th>Base Prob.</th>
                                        <th>Effective Prob.</th>
                                        <th>Fussell-Vesely</th>
                                        <th>Birnbaum</th>
                                        <th>RAW</th>
                                        <th>RRW</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${state.calculatedMetrics.map(m => `
                                        <tr class="fta-row-${m.category}">
                                            <td>${m.name}</td>
                                            <td>${(m.baseProbability * 100).toFixed(2)}%</td>
                                            <td>${(m.effectiveProbability * 100).toFixed(2)}%</td>
                                            <td>${m.fussellVesely.toFixed(4)}</td>
                                            <td>${m.birnbaum.toFixed(4)}</td>
                                            <td>${m.raw.toFixed(2)}</td>
                                            <td>${m.rrw === Infinity ? 'Inf' : m.rrw.toFixed(2)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                        <div class="fta-measure-definitions">
                            <div class="fta-definition">
                                <strong>Fussell-Vesely (FV):</strong> Fraction of system risk attributable to this component. Higher = more critical.
                            </div>
                            <div class="fta-definition">
                                <strong>Birnbaum (BI):</strong> Change in system risk when component state changes. Higher = more sensitive.
                            </div>
                            <div class="fta-definition">
                                <strong>RAW:</strong> Risk increase factor if component fails. Values over 2 indicate significant risk drivers.
                            </div>
                            <div class="fta-definition">
                                <strong>RRW:</strong> Risk decrease factor if component is perfectly reliable. Higher = better mitigation target.
                            </div>
                        </div>
                    </div>
                    
                    <!-- Minimal Cut Sets -->
                    <div class="fta-section">
                        <h3 class="fta-section-title">Minimal Cut Sets</h3>
                        <div class="fta-methodology-note">
                            Minimal cut sets (MCS) represent the smallest combinations of basic events causing system failure.
                        </div>
                        <div class="fta-cutsets-grid">
                            ${cutSets.map((cs, i) => `
                                <div class="fta-cutset-card fta-cutset-${cs.category}">
                                    <div class="fta-cutset-header">
                                        <span class="fta-cutset-rank">#${i + 1}</span>
                                        <span class="fta-cutset-name">${cs.name}</span>
                                    </div>
                                    <div class="fta-cutset-prob">
                                        <span class="fta-cutset-prob-label">Probability:</span>
                                        <span class="fta-cutset-prob-value">${(cs.probability * 100).toFixed(3)}%</span>
                                    </div>
                                    <div class="fta-cutset-events">
                                        <span class="fta-cutset-order">Order ${cs.order}:</span>
                                        ${cs.eventNames.join(' AND ')}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- Mitigation Effectiveness -->
                    <div class="fta-section">
                        <h3 class="fta-section-title">Mitigation Effectiveness Analysis</h3>
                        <div class="fta-mitigation-grid">
                            ${renderMitigationAnalysis()}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Draw fault tree
        setTimeout(() => drawFaultTree(), 50);
    }
    
    function renderMitigationAnalysis() {
        const mitigations = getActiveMitigations();
        const configs = getMitigationConfigs();
        const params = getParameters();
        
        const mitigationData = [
            {
                id: 'backup',
                name: 'Automated Backup',
                target: 'Ransomware',
                reduction: configs.backup.ransomwareReduction,
                cost: configs.backup.cost,
                active: mitigations.has('backup'),
                baseProb: params.ransomwareProb
            },
            {
                id: 'firewall',
                name: 'Advanced Firewall',
                target: 'Ransomware + IT-OT',
                reduction: configs.firewall.ransomwareReduction,
                cost: configs.firewall.cost,
                active: mitigations.has('firewall'),
                baseProb: params.ransomwareProb
            },
            {
                id: 'maintenance',
                name: 'Predictive Maintenance',
                target: 'Equipment + Process',
                reduction: configs.maintenance.equipmentReduction,
                cost: configs.maintenance.cost,
                active: mitigations.has('maintenance'),
                baseProb: params.equipmentProb
            },
            {
                id: 'redundancy',
                name: 'Equipment Redundancy',
                target: 'Equipment Failure',
                reduction: configs.redundancy.equipmentReduction,
                cost: configs.redundancy.cost,
                active: mitigations.has('redundancy'),
                baseProb: params.equipmentProb
            },
            {
                id: 'dual',
                name: 'Dual Sourcing',
                target: 'Supplier Disruption',
                reduction: configs.dual.supplierReduction,
                cost: configs.dual.cost,
                active: mitigations.has('dual'),
                baseProb: params.supplierProb
            },
            {
                id: 'buffer',
                name: 'Buffer Inventory',
                target: 'Supplier + Logistics',
                reduction: configs.buffer.supplierReduction,
                cost: configs.buffer.cost,
                active: mitigations.has('buffer'),
                baseProb: params.supplierProb
            }
        ];
        
        return mitigationData.map(m => `
            <div class="fta-mitigation-card ${m.active ? 'active' : ''}">
                <div class="fta-mitigation-name">${m.name}</div>
                <div class="fta-mitigation-target">Targets: ${m.target}</div>
                <div class="fta-mitigation-stats">
                    <div class="fta-mitigation-stat">
                        <span class="fta-mitigation-stat-label">Reduction:</span>
                        <span class="fta-mitigation-stat-value">${(m.reduction * 100).toFixed(0)}%</span>
                    </div>
                    <div class="fta-mitigation-stat">
                        <span class="fta-mitigation-stat-label">Cost:</span>
                        <span class="fta-mitigation-stat-value">$${m.cost.toLocaleString()}</span>
                    </div>
                </div>
                <div class="fta-mitigation-status">
                    ${m.active ? 'Active' : 'Inactive'}
                </div>
            </div>
        `).join('');
    }
    
    
    function drawFaultTree() {
        const canvas = document.getElementById('ftaCanvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear
        ctx.fillStyle = CONFIG.colors.white;
        ctx.fillRect(0, 0, width, height);
        
        const tree = state.faultTree;
        
        // Calculate positions
        const positions = calculateTreePositions(tree, width);
        
        // Draw connections first
        drawTreeConnections(ctx, tree, positions);
        
        // Draw nodes
        drawTreeNodes(ctx, tree, positions);
    }
    
    function calculateTreePositions(tree, canvasWidth) {
        const positions = {};
        const levelY = [60, 170, 280, 390];
        
        // Top event
        positions['TOP'] = { x: canvasWidth / 2, y: levelY[0] };
        positions['G1'] = { x: canvasWidth / 2, y: levelY[0] + 50 };
        
        // Intermediate events (level 1)
        const ie1X = canvasWidth / 6;
        const ie2X = canvasWidth / 2;
        const ie3X = (5 * canvasWidth) / 6;
        
        positions['IE1'] = { x: ie1X, y: levelY[1] };
        positions['G2'] = { x: ie1X, y: levelY[1] + 45 };
        positions['IE2'] = { x: ie2X, y: levelY[1] };
        positions['G3'] = { x: ie2X, y: levelY[1] + 45 };
        positions['IE3'] = { x: ie3X, y: levelY[1] };
        positions['G4'] = { x: ie3X, y: levelY[1] + 45 };
        
        // Basic events (level 2)
        positions['BE1'] = { x: ie1X - 60, y: levelY[2] };
        positions['BE2'] = { x: ie1X + 60, y: levelY[2] };
        positions['BE3'] = { x: ie2X - 60, y: levelY[2] };
        positions['BE4'] = { x: ie2X + 60, y: levelY[2] };
        positions['BE5'] = { x: ie3X - 60, y: levelY[2] };
        positions['BE6'] = { x: ie3X + 60, y: levelY[2] };
        
        return positions;
    }
    
    function drawTreeConnections(ctx, tree, positions) {
        ctx.strokeStyle = CONFIG.colors.text;
        ctx.lineWidth = 1.5;
        
        // Top to gate
        drawLine(ctx, positions['TOP'].x, positions['TOP'].y + 20, positions['G1'].x, positions['G1'].y - 15);
        
        // Gate to intermediate events
        drawLine(ctx, positions['G1'].x, positions['G1'].y + 15, positions['IE1'].x, positions['IE1'].y - 20);
        drawLine(ctx, positions['G1'].x, positions['G1'].y + 15, positions['IE2'].x, positions['IE2'].y - 20);
        drawLine(ctx, positions['G1'].x, positions['G1'].y + 15, positions['IE3'].x, positions['IE3'].y - 20);
        
        // IE1 to gate to basic events
        drawLine(ctx, positions['IE1'].x, positions['IE1'].y + 20, positions['G2'].x, positions['G2'].y - 15);
        drawLine(ctx, positions['G2'].x, positions['G2'].y + 15, positions['BE1'].x, positions['BE1'].y - 15);
        drawLine(ctx, positions['G2'].x, positions['G2'].y + 15, positions['BE2'].x, positions['BE2'].y - 15);
        
        // IE2 to gate to basic events
        drawLine(ctx, positions['IE2'].x, positions['IE2'].y + 20, positions['G3'].x, positions['G3'].y - 15);
        drawLine(ctx, positions['G3'].x, positions['G3'].y + 15, positions['BE3'].x, positions['BE3'].y - 15);
        drawLine(ctx, positions['G3'].x, positions['G3'].y + 15, positions['BE4'].x, positions['BE4'].y - 15);
        
        // IE3 to gate to basic events
        drawLine(ctx, positions['IE3'].x, positions['IE3'].y + 20, positions['G4'].x, positions['G4'].y - 15);
        drawLine(ctx, positions['G4'].x, positions['G4'].y + 15, positions['BE5'].x, positions['BE5'].y - 15);
        drawLine(ctx, positions['G4'].x, positions['G4'].y + 15, positions['BE6'].x, positions['BE6'].y - 15);
    }
    
    function drawLine(ctx, x1, y1, x2, y2) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
    
    function drawTreeNodes(ctx, tree, positions) {
        drawEventNode(ctx, positions['TOP'].x, positions['TOP'].y, 
            'Supply Chain Disruption', (tree.probability * 100).toFixed(2) + '%', 'top');
        
        drawGate(ctx, positions['G1'].x, positions['G1'].y, 'OR');
        
        const ie1 = tree.children[0];
        const ie2 = tree.children[1];
        const ie3 = tree.children[2];
        
        drawEventNode(ctx, positions['IE1'].x, positions['IE1'].y,
            'Cyber Attack', (ie1.probability * 100).toFixed(2) + '%', 'intermediate', 'cyber');
        drawGate(ctx, positions['G2'].x, positions['G2'].y, 'AND');
        
        drawEventNode(ctx, positions['IE2'].x, positions['IE2'].y,
            'Physical Failure', (ie2.probability * 100).toFixed(2) + '%', 'intermediate', 'physical');
        drawGate(ctx, positions['G3'].x, positions['G3'].y, 'OR');
        
        drawEventNode(ctx, positions['IE3'].x, positions['IE3'].y,
            'Supply Failure', (ie3.probability * 100).toFixed(2) + '%', 'intermediate', 'supply');
        drawGate(ctx, positions['G4'].x, positions['G4'].y, 'OR');
        
        const basicEvents = getBasicEvents(tree);
        basicEvents.forEach(be => {
            const pos = positions[be.id];
            if (pos) {
                drawBasicEvent(ctx, pos.x, pos.y, be.name.split(' ')[0], 
                    (be.effectiveProbability * 100).toFixed(1) + '%', be.category);
            }
        });
    }
    
    function drawEventNode(ctx, x, y, label, prob, type, category) {
        const w = 120;
        const h = 40;
        
        ctx.fillStyle = CONFIG.colors.white;
        ctx.strokeStyle = type === 'top' ? CONFIG.colors.risk : CONFIG.colors.text;
        ctx.lineWidth = type === 'top' ? 2.5 : 1.5;
        
        ctx.beginPath();
        ctx.rect(x - w/2, y - h/2, w, h);
        ctx.fill();
        ctx.stroke();
        
        if (category) {
            const catColors = {
                cyber: CONFIG.colors.cyber,
                physical: CONFIG.colors.warning,
                supply: CONFIG.colors.standard
            };
            ctx.fillStyle = catColors[category] || CONFIG.colors.text;
            ctx.fillRect(x - w/2, y - h/2, 4, h);
        }
        
        ctx.fillStyle = CONFIG.colors.text;
        ctx.font = '600 11px Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, x, y - 3);
        
        ctx.font = '500 10px Roboto Mono, monospace';
        ctx.fillStyle = CONFIG.colors.textLight;
        ctx.fillText('P = ' + prob, x, y + 12);
    }
    
    function drawBasicEvent(ctx, x, y, label, prob, category) {
        const r = 28;
        
        const catColors = {
            cyber: CONFIG.colors.cyber,
            physical: CONFIG.colors.warning,
            supply: CONFIG.colors.standard
        };
        
        ctx.fillStyle = CONFIG.colors.white;
        ctx.strokeStyle = catColors[category] || CONFIG.colors.text;
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = CONFIG.colors.text;
        ctx.font = '600 10px Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, x, y - 3);
        
        ctx.font = '500 9px Roboto Mono, monospace';
        ctx.fillStyle = CONFIG.colors.textLight;
        ctx.fillText(prob, x, y + 10);
    }
    
    function drawGate(ctx, x, y, type) {
        const size = 28;
        
        ctx.fillStyle = CONFIG.colors.white;
        ctx.strokeStyle = CONFIG.colors.text;
        ctx.lineWidth = 1.5;
        
        if (type === 'OR') {
            ctx.beginPath();
            ctx.moveTo(x - size/2, y - size/2);
            ctx.lineTo(x + size/2, y - size/2);
            ctx.lineTo(x + size/2, y);
            ctx.quadraticCurveTo(x, y + size/2, x - size/2, y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.moveTo(x - size/2, y - size/2);
            ctx.lineTo(x + size/2, y - size/2);
            ctx.lineTo(x + size/2, y + size/2);
            ctx.lineTo(x - size/2, y + size/2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
        
        ctx.fillStyle = CONFIG.colors.text;
        ctx.font = '700 10px Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(type, x, y);
        ctx.textBaseline = 'alphabetic';
    }
    
    
    function getStyles() {
        return `
        .fta-container {
            font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
            background: ${CONFIG.colors.white};
            border: 1px solid ${CONFIG.colors.border};
            border-radius: 8px;
            overflow: hidden;
        }
        
        .fta-header {
            background: ${CONFIG.colors.primary};
            padding: 24px 28px;
            border-bottom: 1px solid ${CONFIG.colors.border};
        }
        
        .fta-title {
            font-size: 20px;
            font-weight: 600;
            color: ${CONFIG.colors.white};
            margin: 0 0 6px 0;
        }
        
        .fta-subtitle {
            font-size: 14px;
            color: rgba(255,255,255,0.8);
            margin: 0;
        }
        
        .fta-info-banner {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px 28px;
            background: ${CONFIG.colors.background};
            border-bottom: 1px solid ${CONFIG.colors.border};
        }
        
        .fta-info-icon {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: ${CONFIG.colors.standard};
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 600;
            flex-shrink: 0;
        }
        
        .fta-info-text {
            flex: 1;
            font-size: 13px;
            color: ${CONFIG.colors.textLight};
            line-height: 1.5;
        }
        
        .fta-btn {
            padding: 10px 18px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 13px;
            font-weight: 500;
            font-family: inherit;
            cursor: pointer;
            transition: all 0.2s;
            background: white;
            color: ${CONFIG.colors.text};
        }
        
        .fta-btn:hover {
            background: ${CONFIG.colors.primary};
            color: white;
            border-color: ${CONFIG.colors.primary};
        }
        
        .fta-content {
            padding: 28px;
        }
        
        .fta-section {
            margin-bottom: 32px;
        }
        
        .fta-section:last-child {
            margin-bottom: 0;
        }
        
        .fta-section-title {
            font-size: 16px;
            font-weight: 600;
            color: ${CONFIG.colors.text};
            margin: 0 0 16px 0;
            padding-bottom: 8px;
            border-bottom: 2px solid ${CONFIG.colors.border};
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .fta-methodology-note {
            background: ${CONFIG.colors.background};
            border: 1px solid ${CONFIG.colors.border};
            border-radius: 4px;
            padding: 12px 16px;
            font-size: 13px;
            color: ${CONFIG.colors.textLight};
            margin-bottom: 16px;
        }
        
        .fta-summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
        }
        
        @media (max-width: 1000px) {
            .fta-summary-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }
        
        .fta-summary-card {
            background: white;
            border: 1px solid ${CONFIG.colors.border};
            border-radius: 4px;
            padding: 15px;
            text-align: center;
        }
        
        .fta-summary-card:hover {
            border-color: ${CONFIG.colors.primary};
            box-shadow: 0 2px 8px rgba(44, 62, 80, 0.1);
        }
        
        .fta-summary-label {
            font-size: 11px;
            font-weight: 500;
            color: ${CONFIG.colors.textMuted};
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }
        
        .fta-summary-value {
            font-size: 24px;
            font-weight: 600;
            color: ${CONFIG.colors.text};
            font-family: monospace;
            margin-bottom: 4px;
        }
        
        .fta-summary-detail {
            font-size: 12px;
            color: ${CONFIG.colors.textMuted};
        }
        
        .fta-tree-container {
            background: white;
            border: 1px solid ${CONFIG.colors.border};
            border-radius: 4px;
            padding: 20px;
            overflow-x: auto;
        }
        
        .fta-tree-container canvas {
            display: block;
            margin: 0 auto;
        }
        
        .fta-tree-legend {
            display: flex;
            justify-content: center;
            gap: 24px;
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid ${CONFIG.colors.border};
        }
        
        .fta-legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            color: ${CONFIG.colors.textLight};
        }
        
        .fta-legend-symbol {
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 9px;
            font-weight: 700;
        }
        
        .fta-legend-event {
            border: 2px solid ${CONFIG.colors.text};
            border-radius: 2px;
        }
        
        .fta-legend-basic {
            border: 2px solid ${CONFIG.colors.text};
            border-radius: 50%;
        }
        
        .fta-legend-or, .fta-legend-and {
            border: 1.5px solid ${CONFIG.colors.text};
            background: white;
        }
        
        .fta-table-container {
            overflow-x: auto;
            border: 1px solid ${CONFIG.colors.border};
            border-radius: 4px;
        }
        
        .fta-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }
        
        .fta-table th,
        .fta-table td {
            padding: 10px 12px;
            text-align: right;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .fta-table th {
            background: ${CONFIG.colors.primary};
            color: white;
            font-weight: 500;
            text-align: right;
        }
        
        .fta-table th:first-child,
        .fta-table td:first-child {
            text-align: left;
        }
        
        .fta-table tbody tr:hover {
            background: ${CONFIG.colors.background};
        }
        
        .fta-row-cyber td:first-child {
            border-left: 3px solid ${CONFIG.colors.cyber};
        }
        
        .fta-row-physical td:first-child {
            border-left: 3px solid ${CONFIG.colors.warning};
        }
        
        .fta-row-supply td:first-child {
            border-left: 3px solid ${CONFIG.colors.standard};
        }
        
        .fta-measure-definitions {
            margin-top: 16px;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
        }
        
        @media (max-width: 800px) {
            .fta-measure-definitions {
                grid-template-columns: 1fr;
            }
        }
        
        .fta-definition {
            background: white;
            border: 1px solid ${CONFIG.colors.border};
            border-radius: 4px;
            padding: 12px;
            font-size: 12px;
            color: ${CONFIG.colors.textLight};
            line-height: 1.5;
        }
        
        .fta-definition strong {
            color: ${CONFIG.colors.text};
        }
        
        .fta-cutsets-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 16px;
        }
        
        .fta-cutset-card {
            background: white;
            border: 1px solid ${CONFIG.colors.border};
            border-radius: 4px;
            padding: 16px;
        }
        
        .fta-cutset-card:hover {
            border-color: ${CONFIG.colors.primary};
            box-shadow: 0 2px 8px rgba(44, 62, 80, 0.1);
        }
        
        .fta-cutset-cyber {
            border-left: 4px solid ${CONFIG.colors.cyber};
        }
        
        .fta-cutset-physical {
            border-left: 4px solid ${CONFIG.colors.warning};
        }
        
        .fta-cutset-supply {
            border-left: 4px solid ${CONFIG.colors.standard};
        }
        
        .fta-cutset-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
        }
        
        .fta-cutset-rank {
            background: ${CONFIG.colors.background};
            color: ${CONFIG.colors.text};
            font-size: 11px;
            font-weight: 600;
            padding: 4px 8px;
            border-radius: 4px;
        }
        
        .fta-cutset-name {
            font-weight: 600;
            color: ${CONFIG.colors.text};
            font-size: 13px;
        }
        
        .fta-cutset-prob {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        
        .fta-cutset-prob-label {
            font-size: 12px;
            color: ${CONFIG.colors.textMuted};
        }
        
        .fta-cutset-prob-value {
            font-size: 12px;
            font-weight: 600;
            font-family: monospace;
            color: ${CONFIG.colors.text};
        }
        
        .fta-cutset-events {
            font-size: 11px;
            color: ${CONFIG.colors.textLight};
        }
        
        .fta-cutset-order {
            font-weight: 600;
            color: ${CONFIG.colors.textMuted};
        }
        
        .fta-mitigation-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
        }
        
        @media (max-width: 1000px) {
            .fta-mitigation-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }
        
        @media (max-width: 600px) {
            .fta-mitigation-grid {
                grid-template-columns: 1fr;
            }
        }
        
        .fta-mitigation-card {
            background: white;
            border: 1px solid ${CONFIG.colors.border};
            border-radius: 4px;
            padding: 16px;
        }
        
        .fta-mitigation-card:hover {
            border-color: ${CONFIG.colors.primary};
        }
        
        .fta-mitigation-card.active {
            background: #f0fdf4;
            border-color: ${CONFIG.colors.mitigated};
        }
        
        .fta-mitigation-name {
            font-weight: 600;
            color: ${CONFIG.colors.text};
            font-size: 13px;
            margin-bottom: 4px;
        }
        
        .fta-mitigation-target {
            font-size: 11px;
            color: ${CONFIG.colors.textMuted};
            margin-bottom: 12px;
        }
        
        .fta-mitigation-stats {
            display: flex;
            gap: 16px;
            margin-bottom: 12px;
        }
        
        .fta-mitigation-stat {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        
        .fta-mitigation-stat-label {
            font-size: 10px;
            color: ${CONFIG.colors.textMuted};
            text-transform: uppercase;
        }
        
        .fta-mitigation-stat-value {
            font-size: 13px;
            font-weight: 600;
            color: ${CONFIG.colors.text};
            font-family: monospace;
        }
        
        .fta-mitigation-status {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            color: ${CONFIG.colors.textMuted};
        }
        
        .fta-mitigation-card.active .fta-mitigation-status {
            color: ${CONFIG.colors.mitigated};
        }
        `;
    }
    
    
    return {
        init: function(containerId) {
            render(containerId);
            state.initialized = true;
            
            // Set up periodic refresh
            setInterval(() => {
                if (state.initialized) {
                    // Check if parameters changed
                    const newTree = buildFaultTree();
                    if (Math.abs(newTree.probability - state.faultTree.probability) > 0.0001) {
                        render(containerId);
                    }
                }
            }, 2000);
        },
        
        refresh: function() {
            const container = document.getElementById('ftaContainer');
            if (container) {
                render('ftaContainer');
            }
        },
        
        getMetrics: function() {
            return state.calculatedMetrics;
        },
        
        getTopEventProbability: function() {
            return state.faultTree ? state.faultTree.probability : 0;
        }
    };
})();
window.FTAModule = FTAModule;