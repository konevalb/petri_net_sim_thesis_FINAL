const SCORModule = (function() {
    'use strict';
    
    const CONFIG = {
        colors: {
            primary: '#2c3e50', plan: '#3498db', source: '#9b59b6',
            make: '#e67e22', deliver: '#1abc9c', return: '#e74c3c',
            enable: '#34495e', text: '#2c3e50', textLight: '#666',
            textMuted: '#999', border: '#e0e0e0', background: '#fafafa',
            white: '#ffffff', success: '#16a34a', warning: '#f39c12', danger: '#e74c3c'
        }
    };
    
    let state = { initialized: false, processMetrics: null, riskMapping: null };
    
    const getParameters = () => window.SharedConfig?.getParameters() || window.parameters || {
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
    
    function getSCORProcesses() {
        const params = getParameters();
        const mitigations = getActiveMitigations();
        const configs = getMitigationConfigs();
        
        let ransomwareEff = params.ransomwareProb;
        let equipmentEff = params.equipmentProb;
        let supplierEff = params.supplierProb;
        
        if (mitigations.has('backup')) ransomwareEff *= (1 - configs.backup.ransomwareReduction);
        if (mitigations.has('firewall')) ransomwareEff *= (1 - configs.firewall.ransomwareReduction);
        if (mitigations.has('maintenance')) equipmentEff *= (1 - configs.maintenance.equipmentReduction);
        if (mitigations.has('redundancy')) equipmentEff *= (1 - configs.redundancy.equipmentReduction);
        if (mitigations.has('dual')) supplierEff *= (1 - configs.dual.supplierReduction);
        if (mitigations.has('buffer')) supplierEff *= (1 - configs.buffer.supplierReduction);
        
        return {
            plan: {
                id: 'sP',
                name: 'Plan',
                color: CONFIG.colors.plan,
                description: 'Processes that balance aggregate demand and supply to develop a course of action which best meets sourcing, production and delivery requirements.',
                level2: [
                    { id: 'sP1', name: 'Plan Supply Chain', description: 'Identify, prioritize and aggregate supply chain requirements' },
                    { id: 'sP2', name: 'Plan Source', description: 'Identify, prioritize and aggregate product requirements' },
                    { id: 'sP3', name: 'Plan Make', description: 'Identify, prioritize and aggregate production requirements' },
                    { id: 'sP4', name: 'Plan Deliver', description: 'Identify, prioritize and aggregate delivery requirements' },
                    { id: 'sP5', name: 'Plan Return', description: 'Identify and aggregate return requirements' }
                ],
                petriNetMapping: ['P10', 'P11', 'P12'],
                riskEvents: ['Ransomware Attack'],
                impactedBy: {
                    ransomware: 0.9,
                    equipment: 0.3,
                    supplier: 0.4
                },
                effectiveRisk: ransomwareEff * 0.9 + equipmentEff * 0.3 + supplierEff * 0.4,
                metrics: {
                    reliability: { name: 'Perfect Order Fulfillment', baseline: 95, unit: '%' },
                    responsiveness: { name: 'Order Fulfillment Cycle Time', baseline: 5, unit: 'days' },
                    agility: { name: 'Upside Supply Chain Flexibility', baseline: 20, unit: '%' }
                }
            },
            source: {
                id: 'sS',
                name: 'Source',
                color: CONFIG.colors.source,
                description: 'Processes that procure goods and services to meet planned or actual demand.',
                level2: [
                    { id: 'sS1', name: 'Source Stocked Product', description: 'Order, receive and transfer stocked products' },
                    { id: 'sS2', name: 'Source Make-to-Order', description: 'Order, receive and transfer MTO products' },
                    { id: 'sS3', name: 'Source Engineer-to-Order', description: 'Order, receive and transfer ETO products' }
                ],
                petriNetMapping: ['P1', 'P2', 'P3'],
                riskEvents: ['Supplier Disruption', 'Logistics Failure'],
                impactedBy: {
                    ransomware: 0.4,
                    equipment: 0.2,
                    supplier: 1.0
                },
                effectiveRisk: ransomwareEff * 0.4 + equipmentEff * 0.2 + supplierEff * 1.0,
                metrics: {
                    reliability: { name: 'Supplier OTIF', baseline: 92, unit: '%' },
                    responsiveness: { name: 'Source Cycle Time', baseline: 7, unit: 'days' },
                    cost: { name: 'Cost of Goods Sold', baseline: 65, unit: '%' }
                }
            },
            make: {
                id: 'sM',
                name: 'Make',
                color: CONFIG.colors.make,
                description: 'Processes that transform product to a finished state to meet planned or actual demand.',
                level2: [
                    { id: 'sM1', name: 'Make-to-Stock', description: 'Manufacture products for stock based on forecast' },
                    { id: 'sM2', name: 'Make-to-Order', description: 'Manufacture products based on customer orders' },
                    { id: 'sM3', name: 'Engineer-to-Order', description: 'Design and manufacture to customer specification' }
                ],
                petriNetMapping: ['P1', 'P2', 'P3', 'P11'],
                riskEvents: ['Equipment Failure', 'Process Deviation', 'Ransomware Attack'],
                impactedBy: {
                    ransomware: 0.8,
                    equipment: 1.0,
                    supplier: 0.6
                },
                effectiveRisk: ransomwareEff * 0.8 + equipmentEff * 1.0 + supplierEff * 0.6,
                metrics: {
                    reliability: { name: 'Production Schedule Achievement', baseline: 90, unit: '%' },
                    responsiveness: { name: 'Make Cycle Time', baseline: 3, unit: 'days' },
                    cost: { name: 'Production Cost', baseline: 45, unit: '%' }
                }
            },
            deliver: {
                id: 'sD',
                name: 'Deliver',
                color: CONFIG.colors.deliver,
                description: 'Processes that provide finished goods and services to meet planned or actual demand.',
                level2: [
                    { id: 'sD1', name: 'Deliver Stocked Product', description: 'Deliver products maintained in finished goods' },
                    { id: 'sD2', name: 'Deliver Make-to-Order', description: 'Deliver products manufactured to order' },
                    { id: 'sD3', name: 'Deliver Engineer-to-Order', description: 'Deliver products designed/built to order' },
                    { id: 'sD4', name: 'Deliver Retail Product', description: 'Deliver products through retail channels' }
                ],
                petriNetMapping: ['P4', 'P5', 'P6', 'P12'],
                riskEvents: ['Logistics Failure', 'Ransomware Attack'],
                impactedBy: {
                    ransomware: 0.7,
                    equipment: 0.5,
                    supplier: 0.3
                },
                effectiveRisk: ransomwareEff * 0.7 + equipmentEff * 0.5 + supplierEff * 0.3,
                metrics: {
                    reliability: { name: 'Delivery Performance', baseline: 94, unit: '%' },
                    responsiveness: { name: 'Deliver Cycle Time', baseline: 2, unit: 'days' },
                    agility: { name: 'Delivery Flexibility', baseline: 15, unit: '%' }
                }
            },
            return: {
                id: 'sR',
                name: 'Return',
                color: CONFIG.colors.return,
                description: 'Processes associated with returning or receiving returned products for any reason.',
                level2: [
                    { id: 'sSR1', name: 'Source Return Defective', description: 'Return defective products to supplier' },
                    { id: 'sSR2', name: 'Source Return MRO', description: 'Return MRO products to supplier' },
                    { id: 'sSR3', name: 'Source Return Excess', description: 'Return excess products to supplier' },
                    { id: 'sDR1', name: 'Deliver Return Defective', description: 'Receive defective product returns' },
                    { id: 'sDR2', name: 'Deliver Return MRO', description: 'Receive MRO product returns' },
                    { id: 'sDR3', name: 'Deliver Return Excess', description: 'Receive excess product returns' }
                ],
                petriNetMapping: ['P7', 'P8', 'P9'],
                riskEvents: ['Logistics Failure'],
                impactedBy: {
                    ransomware: 0.3,
                    equipment: 0.2,
                    supplier: 0.2
                },
                effectiveRisk: ransomwareEff * 0.3 + equipmentEff * 0.2 + supplierEff * 0.2,
                metrics: {
                    reliability: { name: 'Return Processing Accuracy', baseline: 98, unit: '%' },
                    responsiveness: { name: 'Return Cycle Time', baseline: 10, unit: 'days' },
                    cost: { name: 'Return Processing Cost', baseline: 2, unit: '%' }
                }
            },
            enable: {
                id: 'sE',
                name: 'Enable',
                color: CONFIG.colors.enable,
                description: 'Processes that manage, prepare, maintain and govern information and relationships.',
                level2: [
                    { id: 'sE1', name: 'Manage Business Rules', description: 'Establish and maintain business rules' },
                    { id: 'sE2', name: 'Manage Performance', description: 'Measure and report performance' },
                    { id: 'sE3', name: 'Manage Data', description: 'Collect and maintain data' },
                    { id: 'sE4', name: 'Manage Inventory', description: 'Manage strategic inventory' },
                    { id: 'sE5', name: 'Manage Assets', description: 'Manage production and logistics assets' },
                    { id: 'sE6', name: 'Manage Transportation', description: 'Manage transportation network' },
                    { id: 'sE7', name: 'Manage Configuration', description: 'Manage supply chain configuration' },
                    { id: 'sE8', name: 'Manage Regulatory', description: 'Manage regulatory compliance' },
                    { id: 'sE9', name: 'Manage Risk', description: 'Identify and manage supply chain risks' },
                    { id: 'sE10', name: 'Manage Procurement', description: 'Manage supplier relationships' },
                    { id: 'sE11', name: 'Manage Technology', description: 'Manage supply chain technology' }
                ],
                petriNetMapping: ['P10', 'P11', 'P12'],
                riskEvents: ['Ransomware Attack', 'IT-OT Connection Breach'],
                impactedBy: {
                    ransomware: 1.0,
                    equipment: 0.4,
                    supplier: 0.3
                },
                effectiveRisk: ransomwareEff * 1.0 + equipmentEff * 0.4 + supplierEff * 0.3,
                metrics: {
                    reliability: { name: 'Data Accuracy', baseline: 99, unit: '%' },
                    responsiveness: { name: 'Decision Cycle Time', baseline: 1, unit: 'days' },
                    cost: { name: 'SC Management Cost', baseline: 5, unit: '%' }
                }
            }
        };
    }
    
 
    
    function getPerformanceAttributes() {
        const params = getParameters();
        const mitigations = getActiveMitigations();
        
        const totalRisk = params.ransomwareProb + params.equipmentProb + params.supplierProb;
        const mitigationFactor = 1 - (mitigations.size * 0.1); // Each mitigation reduces impact by 10%
        
        return [
            {
                id: 'RL',
                name: 'Reliability',
                description: 'The ability to perform tasks as expected. Reliability focuses on the predictability of the outcome of a process.',
                focus: 'Customer-facing',
                metrics: [
                    { id: 'RL.1.1', name: 'Perfect Order Fulfillment', definition: 'Percentage of orders delivered complete, on time, undamaged, with correct documentation', baseline: 95, impacted: 95 - (totalRisk * 100 * mitigationFactor), unit: '%' }
                ],
                riskImpact: totalRisk * mitigationFactor,
                color: CONFIG.colors.plan
            },
            {
                id: 'RS',
                name: 'Responsiveness',
                description: 'The speed at which tasks are performed. The speed at which a supply chain provides products to the customer.',
                focus: 'Customer-facing',
                metrics: [
                    { id: 'RS.1.1', name: 'Order Fulfillment Cycle Time', definition: 'Average actual cycle time to fulfill customer orders', baseline: 5, impacted: 5 * (1 + totalRisk * params.recoveryFactor * mitigationFactor), unit: 'days' }
                ],
                riskImpact: totalRisk * params.recoveryFactor * mitigationFactor,
                color: CONFIG.colors.deliver
            },
            {
                id: 'AG',
                name: 'Agility',
                description: 'The ability to respond to external influences and marketplace changes to gain or maintain competitive advantage.',
                focus: 'Customer-facing',
                metrics: [
                    { id: 'AG.1.1', name: 'Upside Supply Chain Flexibility', definition: 'Days required to achieve 20% increase in quantities delivered', baseline: 30, impacted: 30 * (1 + totalRisk * 2 * mitigationFactor), unit: 'days' },
                    { id: 'AG.1.2', name: 'Upside Supply Chain Adaptability', definition: 'Maximum sustainable increase in quantity delivered', baseline: 20, impacted: 20 * (1 - totalRisk * mitigationFactor), unit: '%' },
                    { id: 'AG.1.3', name: 'Downside Supply Chain Adaptability', definition: 'Reduction in quantities ordered sustainable at 30 days', baseline: 25, impacted: 25, unit: '%' }
                ],
                riskImpact: totalRisk * 2 * mitigationFactor,
                color: CONFIG.colors.warning
            },
            {
                id: 'CO',
                name: 'Cost',
                description: 'The cost of operating the supply chain processes including labor, materials, and transportation costs.',
                focus: 'Internal-facing',
                metrics: [
                    { id: 'CO.1.1', name: 'Total SC Management Cost', definition: 'Sum of supply chain management costs', baseline: 8, impacted: 8 * (1 + totalRisk * params.costMultiplier * mitigationFactor), unit: '%' },
                    { id: 'CO.1.2', name: 'Cost of Goods Sold', definition: 'Direct cost attributable to production', baseline: 65, impacted: 65 * (1 + totalRisk * 0.5 * mitigationFactor), unit: '%' }
                ],
                riskImpact: totalRisk * params.costMultiplier * mitigationFactor,
                color: CONFIG.colors.danger
            },
            {
                id: 'AM',
                name: 'Asset Management',
                description: 'The ability to efficiently utilize assets. Asset management strategies include inventory reduction and in-sourcing vs outsourcing.',
                focus: 'Internal-facing',
                metrics: [
                    { id: 'AM.1.1', name: 'Cash-to-Cash Cycle Time', definition: 'Days of inventory plus receivables minus payables', baseline: 45, impacted: 45 * (1 + totalRisk * mitigationFactor), unit: 'days' },
                    { id: 'AM.1.2', name: 'Return on SC Fixed Assets', definition: 'Revenue over fixed assets used in supply chain', baseline: 2.5, impacted: 2.5 * (1 - totalRisk * mitigationFactor), unit: 'x' },
                    { id: 'AM.1.3', name: 'Return on Working Capital', definition: 'Revenue over working capital', baseline: 4.0, impacted: 4.0 * (1 - totalRisk * mitigationFactor), unit: 'x' }
                ],
                riskImpact: totalRisk * mitigationFactor,
                color: CONFIG.colors.source
            }
        ];
    }
    

    
    function getRiskMapping() {
        const params = getParameters();
        const mitigations = getActiveMitigations();
        const configs = getMitigationConfigs();
        
        return [
            {
                riskEvent: 'Ransomware Attack',
                ftaId: 'BE1',
                petriNetTransition: 'T1 (FTA: Ransomware)',
                baseProbability: params.ransomwareProb,
                effectiveProbability: calculateEffectiveProb('ransomware', params, mitigations, configs),
                impactedProcesses: [
                    { process: 'Plan', impact: 'High', description: 'IT system disruption affects demand planning and S&OP' },
                    { process: 'Make', impact: 'High', description: 'Production systems encrypted, manufacturing halted' },
                    { process: 'Enable', impact: 'Critical', description: 'Core IT infrastructure compromised' }
                ],
                mitigations: ['backup', 'firewall'],
                costImpact: 50000 * params.costMultiplier
            },
            {
                riskEvent: 'Equipment Failure',
                ftaId: 'BE3',
                petriNetTransition: 'T2 (FTA: Equipment)',
                baseProbability: params.equipmentProb,
                effectiveProbability: calculateEffectiveProb('equipment', params, mitigations, configs),
                impactedProcesses: [
                    { process: 'Make', impact: 'Critical', description: 'Direct production stoppage' },
                    { process: 'Deliver', impact: 'High', description: 'Delayed order fulfillment' },
                    { process: 'Source', impact: 'Medium', description: 'Receiving capacity reduced' }
                ],
                mitigations: ['maintenance', 'redundancy'],
                costImpact: 30000 * params.costMultiplier
            },
            {
                riskEvent: 'Supplier Disruption',
                ftaId: 'BE5',
                petriNetTransition: 'T3 (FTA: Supplier)',
                baseProbability: params.supplierProb,
                effectiveProbability: calculateEffectiveProb('supplier', params, mitigations, configs),
                impactedProcesses: [
                    { process: 'Source', impact: 'Critical', description: 'Primary supply source unavailable' },
                    { process: 'Make', impact: 'High', description: 'Material shortage stops production' },
                    { process: 'Plan', impact: 'Medium', description: 'Supply plan disrupted' }
                ],
                mitigations: ['dual', 'buffer'],
                costImpact: 20000 * params.costMultiplier
            }
        ];
    }
    
    function calculateEffectiveProb(type, params, mitigations, configs) {
        let prob = 0;
        
        if (type === 'ransomware') {
            prob = params.ransomwareProb;
            if (mitigations.has('backup')) prob *= (1 - configs.backup.ransomwareReduction);
            if (mitigations.has('firewall')) prob *= (1 - configs.firewall.ransomwareReduction);
        } else if (type === 'equipment') {
            prob = params.equipmentProb;
            if (mitigations.has('maintenance')) prob *= (1 - configs.maintenance.equipmentReduction);
            if (mitigations.has('redundancy')) prob *= (1 - configs.redundancy.equipmentReduction);
        } else if (type === 'supplier') {
            prob = params.supplierProb;
            if (mitigations.has('dual')) prob *= (1 - configs.dual.supplierReduction);
            if (mitigations.has('buffer')) prob *= (1 - configs.buffer.supplierReduction);
        }
        
        return prob;
    }
  
    function render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const params = getParameters();
        const mitigations = getActiveMitigations();
        const processes = getSCORProcesses();
        const attributes = getPerformanceAttributes();
        const riskMapping = getRiskMapping();
        
        container.innerHTML = `
            <style>${getStyles()}</style>
            <div class="scor-container">
                <!-- Header -->
                <div class="scor-header">
                    <div class="scor-header-content">
                        <h2 class="scor-title">SCOR Model Mapping</h2>
                        <p class="scor-subtitle">Supply Chain Operations Reference framework alignment per ASCM SCOR 12.0</p>
                    </div>
                </div>
                
                <!-- Parameter Info Banner -->
                <div class="scor-info-banner">
                    <div class="scor-info-icon">i</div>
                    <div class="scor-info-text">
                        This analysis maps simulation parameters to SCOR processes and metrics. Adjust parameters on the Simulation tab to see real-time impact assessment.
                        Current: Ransomware ${(params.ransomwareProb * 100).toFixed(1)}% | Equipment ${(params.equipmentProb * 100).toFixed(1)}% | Supplier ${(params.supplierProb * 100).toFixed(1)}% | Mitigations: ${mitigations.size}/6
                    </div>
                    <button class="scor-btn" onclick="SCORModule.refresh()">Refresh Analysis</button>
                </div>
                
                <!-- Main Content -->
                <div class="scor-content">
                    <!-- SCOR Process Overview -->
                    <div class="scor-section">
                        <h3 class="scor-section-title">SCOR Process Framework</h3>
                        <div class="scor-methodology-note">
                            The Supply Chain Operations Reference (SCOR) model provides a standard framework for measuring and improving supply chain performance across six core processes.
                        </div>
                        <div class="scor-process-diagram">
                            <canvas id="scorProcessCanvas" width="850" height="200"></canvas>
                        </div>
                    </div>
                    
                    <!-- Process Risk Impact -->
                    <div class="scor-section">
                        <h3 class="scor-section-title">Process Risk Assessment</h3>
                        <div class="scor-process-grid">
                            ${Object.values(processes).map(p => renderProcessCard(p)).join('')}
                        </div>
                    </div>
                    
                    <!-- Performance Attributes -->
                    <div class="scor-section">
                        <h3 class="scor-section-title">Performance Attributes Impact</h3>
                        <div class="scor-methodology-note">
                            SCOR defines five performance attributes measuring supply chain capability. Risk events degrade these metrics proportionally.
                        </div>
                        <div class="scor-attributes-grid">
                            ${attributes.map(a => renderAttributeCard(a)).join('')}
                        </div>
                    </div>
                    
                    <!-- Risk-to-SCOR Mapping Table -->
                    <div class="scor-section">
                        <h3 class="scor-section-title">Risk Event to SCOR Process Mapping</h3>
                        <div class="scor-table-container">
                            <table class="scor-table">
                                <thead>
                                    <tr>
                                        <th>Risk Event</th>
                                        <th>FTA ID</th>
                                        <th>Base Prob.</th>
                                        <th>Effective Prob.</th>
                                        <th>Impacted Processes</th>
                                        <th>Cost Impact</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${riskMapping.map(r => `
                                        <tr>
                                            <td class="scor-risk-name">${r.riskEvent}</td>
                                            <td>${r.ftaId}</td>
                                            <td>${(r.baseProbability * 100).toFixed(2)}%</td>
                                            <td>${(r.effectiveProbability * 100).toFixed(2)}%</td>
                                            <td>${r.impactedProcesses.map(p => `<span class="scor-process-tag scor-tag-${p.impact.toLowerCase()}">${p.process}</span>`).join(' ')}</td>
                                            <td>$${r.costImpact.toLocaleString()}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <!-- Petri Net to SCOR Mapping -->
                    <div class="scor-section">
                        <h3 class="scor-section-title">Petri Net State to SCOR Mapping</h3>
                        <div class="scor-mapping-grid">
                            ${renderPetriNetMapping()}
                        </div>
                    </div>
                    
                    <!-- Mitigation Alignment -->
                    <div class="scor-section">
                        <h3 class="scor-section-title">Mitigation Strategy Alignment</h3>
                        <div class="scor-methodology-note">
                            Active mitigations map to SCOR Enable (sE9 - Manage Risk) process and impact specific SCOR processes.
                        </div>
                        <div class="scor-mitigation-table">
                            <table class="scor-table">
                                <thead>
                                    <tr>
                                        <th>Mitigation</th>
                                        <th>Status</th>
                                        <th>SCOR Process</th>
                                        <th>Metric Impact</th>
                                        <th>Risk Reduction</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${renderMitigationAlignment()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Draw SCOR process diagram
        setTimeout(() => drawSCORDiagram(), 50);
    }
    
    function renderProcessCard(process) {
        const riskLevel = process.effectiveRisk > 0.05 ? 'high' : process.effectiveRisk > 0.02 ? 'medium' : 'low';
        const riskPercent = Math.min(process.effectiveRisk * 100, 100);
        
        return `
            <div class="scor-process-card" style="border-left-color: ${process.color}">
                <div class="scor-process-header">
                    <span class="scor-process-id" style="background: ${process.color}">${process.id}</span>
                    <span class="scor-process-name">${process.name}</span>
                </div>
                <div class="scor-process-desc">${process.description.substring(0, 100)}...</div>
                <div class="scor-process-risk">
                    <div class="scor-risk-label">Risk Exposure</div>
                    <div class="scor-risk-bar">
                        <div class="scor-risk-fill scor-risk-${riskLevel}" style="width: ${Math.min(riskPercent * 10, 100)}%"></div>
                    </div>
                    <div class="scor-risk-value">${(process.effectiveRisk * 100).toFixed(2)}%</div>
                </div>
                <div class="scor-process-metrics">
                    ${Object.entries(process.metrics).slice(0, 2).map(([key, m]) => `
                        <div class="scor-metric-item">
                            <span class="scor-metric-name">${m.name}:</span>
                            <span class="scor-metric-value">${m.baseline}${m.unit}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    function renderAttributeCard(attr) {
        const degradation = attr.riskImpact * 100;
        
        return `
            <div class="scor-attribute-card">
                <div class="scor-attribute-header" style="border-left-color: ${attr.color}">
                    <span class="scor-attribute-id">${attr.id}</span>
                    <span class="scor-attribute-name">${attr.name}</span>
                    <span class="scor-attribute-focus">${attr.focus}</span>
                </div>
                <div class="scor-attribute-desc">${attr.description}</div>
                <div class="scor-attribute-metrics">
                    ${attr.metrics.map(m => `
                        <div class="scor-attr-metric">
                            <div class="scor-attr-metric-name">${m.name}</div>
                            <div class="scor-attr-metric-values">
                                <span class="scor-baseline">Baseline: ${m.baseline}${m.unit}</span>
                                <span class="scor-impacted">At Risk: ${typeof m.impacted === 'number' ? m.impacted.toFixed(1) : m.impacted}${m.unit}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="scor-degradation">
                    <span class="scor-degradation-label">Risk Impact Factor:</span>
                    <span class="scor-degradation-value">${degradation.toFixed(1)}%</span>
                </div>
            </div>
        `;
    }
    
    function renderPetriNetMapping() {
        const mappings = [
            { place: 'P1-P3', name: 'Manufacturer States', scor: 'Source (sS), Make (sM)', description: 'Production and sourcing operations' },
            { place: 'P4-P6', name: 'Distributor States', scor: 'Deliver (sD)', description: 'Order fulfillment and distribution' },
            { place: 'P7-P9', name: 'Customer States', scor: 'Return (sR), Deliver (sD)', description: 'Customer service and returns' },
            { place: 'P10', name: 'IT Systems', scor: 'Enable (sE), Plan (sP)', description: 'Information management and planning' },
            { place: 'P11', name: 'Production Systems', scor: 'Make (sM), Enable (sE)', description: 'Manufacturing execution' },
            { place: 'P12', name: 'Logistics Systems', scor: 'Deliver (sD), Enable (sE)', description: 'Transportation and logistics' }
        ];
        
        return mappings.map(m => `
            <div class="scor-mapping-card">
                <div class="scor-mapping-place">${m.place}</div>
                <div class="scor-mapping-name">${m.name}</div>
                <div class="scor-mapping-scor">${m.scor}</div>
                <div class="scor-mapping-desc">${m.description}</div>
            </div>
        `).join('');
    }
    
    function renderMitigationAlignment() {
        const mitigations = getActiveMitigations();
        const configs = getMitigationConfigs();
        
        const mitigationData = [
            { id: 'backup', name: 'Automated Backup', process: 'Enable (sE3, sE9)', metric: 'Data Accuracy, Recovery Time', reduction: configs.backup.ransomwareReduction },
            { id: 'firewall', name: 'Advanced Firewall', process: 'Enable (sE9, sE11)', metric: 'Security Compliance', reduction: configs.firewall.ransomwareReduction },
            { id: 'maintenance', name: 'Predictive Maintenance', process: 'Enable (sE5), Make (sM)', metric: 'Asset Utilization', reduction: configs.maintenance.equipmentReduction },
            { id: 'redundancy', name: 'Equipment Redundancy', process: 'Enable (sE5), Make (sM)', metric: 'Production Reliability', reduction: configs.redundancy.equipmentReduction },
            { id: 'dual', name: 'Dual Sourcing', process: 'Source (sS), Enable (sE10)', metric: 'Supplier Reliability', reduction: configs.dual.supplierReduction },
            { id: 'buffer', name: 'Buffer Inventory', process: 'Enable (sE4), Source (sS)', metric: 'Inventory Days', reduction: configs.buffer.supplierReduction }
        ];
        
        return mitigationData.map(m => `
            <tr class="${mitigations.has(m.id) ? 'scor-row-active' : ''}">
                <td>${m.name}</td>
                <td><span class="scor-status-badge ${mitigations.has(m.id) ? 'active' : 'inactive'}">${mitigations.has(m.id) ? 'Active' : 'Inactive'}</span></td>
                <td>${m.process}</td>
                <td>${m.metric}</td>
                <td>${(m.reduction * 100).toFixed(0)}%</td>
            </tr>
        `).join('');
    }
    
    // SCOR Diagram
    
    function drawSCORDiagram() {
        const canvas = document.getElementById('scorProcessCanvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        ctx.fillStyle = CONFIG.colors.white;
        ctx.fillRect(0, 0, width, height);
        
        const processes = getSCORProcesses();
        const processArray = Object.values(processes);
        const boxWidth = 120;
        const boxHeight = 60;
        const spacing = 20;
        const startX = (width - (processArray.length * boxWidth + (processArray.length - 1) * spacing)) / 2;
        const y = 70;
        
        ctx.fillStyle = '#f0f0f0';
        ctx.strokeStyle = CONFIG.colors.enable;
        ctx.lineWidth = 2;
        const enableWidth = width - 100;
        ctx.fillRect(50, 140, enableWidth, 40);
        ctx.strokeRect(50, 140, enableWidth, 40);
        
        ctx.fillStyle = CONFIG.colors.enable;
        ctx.font = '600 14px Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ENABLE (sE) - Manage Business Rules, Performance, Data, Assets, Risk, Technology', width / 2, 165);
        
        processArray.slice(0, 5).forEach((p, i) => {
            const x = startX + i * (boxWidth + spacing);
            
            ctx.fillStyle = CONFIG.colors.white;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 2;
            ctx.fillRect(x, y, boxWidth, boxHeight);
            ctx.strokeRect(x, y, boxWidth, boxHeight);
            
            ctx.fillStyle = p.color;
            ctx.fillRect(x, y, boxWidth, 6);
            
            ctx.fillStyle = CONFIG.colors.text;
            ctx.font = '600 13px Roboto, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(p.name.toUpperCase(), x + boxWidth / 2, y + 30);
            
            ctx.font = '500 11px Roboto, sans-serif';
            ctx.fillStyle = CONFIG.colors.textLight;
            ctx.fillText(`(${p.id})`, x + boxWidth / 2, y + 48);
            
            if (i < 4) {
                ctx.strokeStyle = CONFIG.colors.textLight;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(x + boxWidth + 2, y + boxHeight / 2);
                ctx.lineTo(x + boxWidth + spacing - 2, y + boxHeight / 2);
                ctx.stroke();
                
                ctx.beginPath();
                ctx.moveTo(x + boxWidth + spacing - 2, y + boxHeight / 2);
                ctx.lineTo(x + boxWidth + spacing - 8, y + boxHeight / 2 - 4);
                ctx.lineTo(x + boxWidth + spacing - 8, y + boxHeight / 2 + 4);
                ctx.closePath();
                ctx.fillStyle = CONFIG.colors.textLight;
                ctx.fill();
            }
        });
        
        ctx.strokeStyle = CONFIG.colors.border;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        processArray.slice(0, 5).forEach((p, i) => {
            const x = startX + i * (boxWidth + spacing) + boxWidth / 2;
            ctx.beginPath();
            ctx.moveTo(x, y + boxHeight);
            ctx.lineTo(x, 140);
            ctx.stroke();
        });
        ctx.setLineDash([]);
        
        ctx.fillStyle = CONFIG.colors.text;
        ctx.font = '600 14px Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SCOR Process Framework', width / 2, 25);
        
        ctx.font = '400 11px Roboto, sans-serif';
        ctx.fillStyle = CONFIG.colors.textLight;
        ctx.fillText('Supply Chain Operations Reference Model v12.0', width / 2, 42);
    }
    
    function getStyles() {
        return `
        .scor-container {
            font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
            background: ${CONFIG.colors.white};
            border: 1px solid ${CONFIG.colors.border};
            border-radius: 8px;
            overflow: hidden;
        }
        
        .scor-header {
            background: ${CONFIG.colors.primary};
            padding: 24px 28px;
            border-bottom: 1px solid ${CONFIG.colors.border};
        }
        
        .scor-title {
            font-size: 20px;
            font-weight: 600;
            color: ${CONFIG.colors.white};
            margin: 0 0 6px 0;
        }
        
        .scor-subtitle {
            font-size: 14px;
            color: rgba(255,255,255,0.8);
            margin: 0;
        }
        
        .scor-info-banner {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px 28px;
            background: ${CONFIG.colors.background};
            border-bottom: 1px solid ${CONFIG.colors.border};
        }
        
        .scor-info-icon {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: ${CONFIG.colors.plan};
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 600;
            flex-shrink: 0;
        }
        
        .scor-info-text {
            flex: 1;
            font-size: 13px;
            color: ${CONFIG.colors.textLight};
            line-height: 1.5;
        }
        
        .scor-btn {
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
        
        .scor-btn:hover {
            background: ${CONFIG.colors.primary};
            color: white;
            border-color: ${CONFIG.colors.primary};
        }
        
        .scor-content {
            padding: 28px;
        }
        
        .scor-section {
            margin-bottom: 32px;
        }
        
        .scor-section:last-child {
            margin-bottom: 0;
        }
        
        .scor-section-title {
            font-size: 16px;
            font-weight: 600;
            color: ${CONFIG.colors.text};
            margin: 0 0 16px 0;
            padding-bottom: 8px;
            border-bottom: 2px solid ${CONFIG.colors.border};
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .scor-methodology-note {
            background: ${CONFIG.colors.background};
            border: 1px solid ${CONFIG.colors.border};
            border-radius: 4px;
            padding: 12px 16px;
            font-size: 13px;
            color: ${CONFIG.colors.textLight};
            margin-bottom: 16px;
            line-height: 1.5;
        }
        
        .scor-process-diagram {
            background: white;
            border: 1px solid ${CONFIG.colors.border};
            border-radius: 4px;
            padding: 20px;
            overflow-x: auto;
        }
        
        .scor-process-diagram canvas {
            display: block;
            margin: 0 auto;
        }
        
        .scor-process-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
        }
        
        @media (max-width: 1200px) {
            .scor-process-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }
        
        @media (max-width: 700px) {
            .scor-process-grid {
                grid-template-columns: 1fr;
            }
        }
        
        .scor-process-card {
            background: white;
            border: 1px solid ${CONFIG.colors.border};
            border-left: 4px solid;
            border-radius: 4px;
            padding: 16px;
        }
        
        .scor-process-card:hover {
            box-shadow: 0 2px 8px rgba(44, 62, 80, 0.1);
        }
        
        .scor-process-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
        }
        
        .scor-process-id {
            padding: 4px 8px;
            border-radius: 4px;
            color: white;
            font-size: 11px;
            font-weight: 600;
        }
        
        .scor-process-name {
            font-size: 15px;
            font-weight: 600;
            color: ${CONFIG.colors.text};
        }
        
        .scor-process-desc {
            font-size: 12px;
            color: ${CONFIG.colors.textLight};
            margin-bottom: 12px;
            line-height: 1.4;
        }
        
        .scor-process-risk {
            margin-bottom: 12px;
        }
        
        .scor-risk-label {
            font-size: 11px;
            color: ${CONFIG.colors.textMuted};
            text-transform: uppercase;
            margin-bottom: 4px;
        }
        
        .scor-risk-bar {
            height: 6px;
            background: #eee;
            border-radius: 3px;
            overflow: hidden;
            margin-bottom: 4px;
        }
        
        .scor-risk-fill {
            height: 100%;
            border-radius: 3px;
            transition: width 0.3s;
        }
        
        .scor-risk-low { background: ${CONFIG.colors.success}; }
        .scor-risk-medium { background: ${CONFIG.colors.warning}; }
        .scor-risk-high { background: ${CONFIG.colors.danger}; }
        
        .scor-risk-value {
            font-size: 12px;
            font-weight: 600;
            color: ${CONFIG.colors.text};
            font-family: monospace;
        }
        
        .scor-process-metrics {
            border-top: 1px solid ${CONFIG.colors.border};
            padding-top: 10px;
        }
        
        .scor-metric-item {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            margin-bottom: 4px;
        }
        
        .scor-metric-name {
            color: ${CONFIG.colors.textLight};
        }
        
        .scor-metric-value {
            color: ${CONFIG.colors.text};
            font-weight: 500;
            font-family: monospace;
        }
        
        .scor-attributes-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 16px;
        }
        
        .scor-attribute-card {
            background: white;
            border: 1px solid ${CONFIG.colors.border};
            border-radius: 4px;
            overflow: hidden;
        }
        
        .scor-attribute-card:hover {
            box-shadow: 0 2px 8px rgba(44, 62, 80, 0.1);
        }
        
        .scor-attribute-header {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 16px;
            background: ${CONFIG.colors.background};
            border-left: 4px solid;
        }
        
        .scor-attribute-id {
            font-size: 12px;
            font-weight: 700;
            color: ${CONFIG.colors.text};
        }
        
        .scor-attribute-name {
            font-size: 14px;
            font-weight: 600;
            color: ${CONFIG.colors.text};
            flex: 1;
        }
        
        .scor-attribute-focus {
            font-size: 10px;
            padding: 3px 8px;
            background: white;
            border: 1px solid ${CONFIG.colors.border};
            border-radius: 10px;
            color: ${CONFIG.colors.textMuted};
        }
        
        .scor-attribute-desc {
            padding: 12px 16px;
            font-size: 12px;
            color: ${CONFIG.colors.textLight};
            line-height: 1.5;
            border-bottom: 1px solid ${CONFIG.colors.border};
        }
        
        .scor-attribute-metrics {
            padding: 12px 16px;
        }
        
        .scor-attr-metric {
            margin-bottom: 10px;
        }
        
        .scor-attr-metric:last-child {
            margin-bottom: 0;
        }
        
        .scor-attr-metric-name {
            font-size: 12px;
            font-weight: 500;
            color: ${CONFIG.colors.text};
            margin-bottom: 4px;
        }
        
        .scor-attr-metric-values {
            display: flex;
            gap: 16px;
            font-size: 11px;
        }
        
        .scor-baseline {
            color: ${CONFIG.colors.textMuted};
        }
        
        .scor-impacted {
            color: ${CONFIG.colors.danger};
            font-weight: 500;
        }
        
        .scor-degradation {
            padding: 10px 16px;
            background: ${CONFIG.colors.background};
            display: flex;
            justify-content: space-between;
            font-size: 12px;
        }
        
        .scor-degradation-label {
            color: ${CONFIG.colors.textMuted};
        }
        
        .scor-degradation-value {
            color: ${CONFIG.colors.danger};
            font-weight: 600;
            font-family: monospace;
        }
        
        .scor-table-container {
            overflow-x: auto;
            border: 1px solid ${CONFIG.colors.border};
            border-radius: 4px;
        }
        
        .scor-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }
        
        .scor-table th,
        .scor-table td {
            padding: 10px 12px;
            text-align: left;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .scor-table th {
            background: ${CONFIG.colors.primary};
            color: white;
            font-weight: 500;
        }
        
        .scor-table tbody tr:hover {
            background: ${CONFIG.colors.background};
        }
        
        .scor-risk-name {
            font-weight: 600;
            color: ${CONFIG.colors.text};
        }
        
        .scor-process-tag {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: 500;
            margin-right: 4px;
        }
        
        .scor-tag-critical {
            background: #fee2e2;
            color: #991b1b;
        }
        
        .scor-tag-high {
            background: #fef3c7;
            color: #92400e;
        }
        
        .scor-tag-medium {
            background: #e0f2fe;
            color: #075985;
        }
        
        .scor-mapping-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
        }
        
        @media (max-width: 900px) {
            .scor-mapping-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }
        
        @media (max-width: 600px) {
            .scor-mapping-grid {
                grid-template-columns: 1fr;
            }
        }
        
        .scor-mapping-card {
            background: white;
            border: 1px solid ${CONFIG.colors.border};
            border-radius: 4px;
            padding: 14px;
        }
        
        .scor-mapping-place {
            font-size: 13px;
            font-weight: 700;
            color: ${CONFIG.colors.primary};
            font-family: monospace;
            margin-bottom: 4px;
        }
        
        .scor-mapping-name {
            font-size: 13px;
            font-weight: 600;
            color: ${CONFIG.colors.text};
            margin-bottom: 6px;
        }
        
        .scor-mapping-scor {
            font-size: 11px;
            color: ${CONFIG.colors.plan};
            font-weight: 500;
            margin-bottom: 4px;
        }
        
        .scor-mapping-desc {
            font-size: 11px;
            color: ${CONFIG.colors.textMuted};
        }
        
        .scor-row-active {
            background: #f0fdf4;
        }
        
        .scor-status-badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .scor-status-badge.active {
            background: #dcfce7;
            color: ${CONFIG.colors.success};
        }
        
        .scor-status-badge.inactive {
            background: #f3f4f6;
            color: ${CONFIG.colors.textMuted};
        }
        `;
    }
    
    // Public API Section
    
    return {
        init: function(containerId) {
            render(containerId);
            state.initialized = true;
            
            setInterval(() => {
                if (state.initialized) {
                }
            }, 2000);
        },
        
        refresh: function() {
            const container = document.getElementById('scorContainer');
            if (container) {
                render('scorContainer');
            }
        },
        
        getProcessMetrics: function() {
            return getSCORProcesses();
        },
        
        getPerformanceAttributes: function() {
            return getPerformanceAttributes();
        }
    };
})();

// Make available globally
window.SCORModule = SCORModule;