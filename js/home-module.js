const HomeModule = (function() {
    'use strict';
    
    const colors = (window.SharedConfig && SharedConfig.COLORS) || {
        primary: '#2c3e50', secondary: '#34495e', petriNet: '#4a90e2',
        monteCarlo: '#9b59b6', fta: '#e74c3c', scor: '#16a34a',
        text: '#2c3e50', textLight: '#666', textMuted: '#999',
        border: '#e0e0e0', background: '#fafafa', white: '#ffffff'
    };
    
    function render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = `
            <style>${getStyles()}</style>
            <div class="home-container">
                <div class="home-hero">
                    <div class="home-hero-content">
                        <h1 class="home-title">Cyber-Physical Supply Chain Risk Assessment Framework</h1>
                        <p class="home-thesis-context">Master's Thesis Research Project</p>
                        <div class="home-problem-statement">
                            <span class="home-problem-label">The Problem:</span>
                            Traditional supply chain risk models treat cyber and physical risks independently, 
                            failing to capture cascade effects that amplify disruption costs.
                        </div>
                    </div>
                </div>
                
                <div class="home-finding-banner">
                    <div class="home-finding-icon">!</div>
                    <div class="home-finding-content">
                        <div class="home-finding-label">Key Research Finding</div>
                        <div class="home-finding-text">
                            Traditional risk assessment <strong>underestimates costs by 40-60%</strong> when cyber-physical 
                            interdependencies are not considered. This framework quantifies and addresses that gap.
                        </div>
                    </div>
                </div>
                
                <div class="home-content">
                    <div class="home-section">
                        <h2 class="home-section-title">Integrated Framework</h2>
                        <p class="home-section-intro">
                            This model integrates four analytical components into a cohesive framework. Each component builds upon 
                            the others to provide both theoretical rigor and practical applicability.
                        </p>
                        <div class="home-framework-diagram">
                            <canvas id="frameworkCanvas" width="900" height="420"></canvas>
                        </div>
                    </div>
                    
                    <div class="home-section">
                        <h2 class="home-section-title">How the Components Connect</h2>
                        <div class="home-flow-container">
                            ${renderFlowSteps()}
                        </div>
                    </div>
                    
                    <div class="home-section">
                        <h2 class="home-section-title">Why This Matters</h2>
                        <div class="home-sowhat-grid">
                            <div class="home-sowhat-card">
                                <div class="home-sowhat-header">For Risk Managers</div>
                                <div class="home-sowhat-text">
                                    Current risk assessments are systematically underestimating exposure. This framework 
                                    provides a methodology to capture hidden cascade costs before they materialize.
                                </div>
                            </div>
                            <div class="home-sowhat-card">
                                <div class="home-sowhat-header">For Procurement Leaders</div>
                                <div class="home-sowhat-text">
                                    Mitigation investments can be prioritized using quantitative importance measures rather 
                                    than intuition. The model shows which controls deliver the highest risk reduction per dollar.
                                </div>
                            </div>
                            <div class="home-sowhat-card">
                                <div class="home-sowhat-header">For Academic Research</div>
                                <div class="home-sowhat-text">
                                    Demonstrates a novel integration of Petri Nets with FTA for supply chain risk, 
                                    grounded in established standards (IEC 61025, SCOR 12.0) for reproducibility.
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="home-section">
                        <h2 class="home-section-title">Explore the Model</h2>
                        <div class="home-nav-grid">
                            ${renderNavCards()}
                        </div>
                    </div>
                    
                    <div class="home-section">
                        <h2 class="home-section-title">Standards and Methodology</h2>
                        <div class="home-standards-grid">
                            ${renderStandards()}
                        </div>
                    </div>
                </div>
                
                <div class="home-footer">
                    <div class="home-footer-content">
                        Cyber-Physical Supply Chain Risk Assessment Framework
                    </div>
                </div>
            </div>
        `;
        
        setTimeout(drawFrameworkDiagram, 50);
    }
    
    function renderFlowSteps() {
        const steps = [
            { num: 1, title: 'Petri Net Simulation', 
              desc: 'Models disruption propagation through supply chain states. Demonstrates how cyber events cascade into physical systems, creating compounding effects invisible to traditional models.',
              outputs: 'Risk parameters, mitigation configurations, cascade timing' },
            { num: 2, title: 'Monte Carlo Analysis',
              desc: 'Validates the cost differential through thousands of probabilistic simulations. Provides statistical confidence that the underestimation gap is real and quantifiable.',
              outputs: 'Cost distributions, confidence intervals, percentile analysis' },
            { num: 3, title: 'Enhanced FTA',
              desc: 'Identifies which components contribute most to system risk using industry-standard importance measures. Pinpoints where mitigation investments yield highest returns.',
              outputs: 'Importance rankings, minimal cut sets, mitigation priorities' },
            { num: 4, title: 'SCOR Mapping',
              desc: 'Translates theoretical findings into industry-standard framework. Enables practitioners to apply insights using familiar supply chain terminology and metrics.',
              outputs: 'Process risk scores, metric impacts, implementation guidance' }
        ];
        
        const arrows = ['Feeds parameters into', 'Validates findings from', 'Prioritizes risks for'];
        
        return steps.map((step, i) => `
            <div class="home-flow-step">
                <div class="home-flow-number">${step.num}</div>
                <div class="home-flow-content">
                    <h3 class="home-flow-title">${step.title}</h3>
                    <p class="home-flow-desc">${step.desc}</p>
                    <div class="home-flow-output">
                        <span class="home-flow-output-label">Outputs:</span> ${step.outputs}
                    </div>
                </div>
            </div>
            ${i < steps.length - 1 ? `<div class="home-flow-arrow">${arrows[i]}</div>` : ''}
        `).join('');
    }
    
    function renderNavCards() {
        const cards = [
            { abbr: 'PN', title: 'Petri Net Simulation', desc: 'Adjust parameters and watch disruptions propagate', action: 'Start Here', color: colors.petriNet, tabIndex: 2 },
            { abbr: 'MC', title: 'Monte Carlo Analysis', desc: 'Run simulations to validate cost differentials', action: 'Run Analysis', color: colors.monteCarlo, tabIndex: 3 },
            { abbr: 'FTA', title: 'Enhanced FTA', desc: 'Identify critical failure pathways', action: 'View Analysis', color: colors.fta, tabIndex: 4 },
            { abbr: 'SCOR', title: 'SCOR Mapping', desc: 'See industry framework alignment', action: 'View Mapping', color: colors.scor, tabIndex: 5 }
        ];
        
        return cards.map(c => `
            <div class="home-nav-card" onclick="document.querySelector('.tab-btn:nth-child(${c.tabIndex})').click()">
                <div class="home-nav-icon" style="background: ${c.color}">${c.abbr}</div>
                <div class="home-nav-content">
                    <h3 class="home-nav-title">${c.title}</h3>
                    <p class="home-nav-desc">${c.desc}</p>
                    <div class="home-nav-action">${c.action}</div>
                </div>
            </div>
        `).join('');
    }
    
    function renderStandards() {
        const standards = [
            { cat: 'Modeling', name: 'Petri Net Formalism', desc: 'Discrete event systems modeling for state transitions' },
            { cat: 'Reliability', name: 'IEC 61025', desc: 'Fault Tree Analysis methodology' },
            { cat: 'Reliability', name: 'IEEE Std 352', desc: 'Reliability analysis for nuclear applications' },
            { cat: 'Reliability', name: 'NUREG-0492', desc: 'NRC Fault Tree Handbook' },
            { cat: 'Supply Chain', name: 'SCOR 12.0', desc: 'APICS/ASCM Supply Chain Operations Reference' },
            { cat: 'Risk Management', name: 'ISO 28000 / ISO 22301', desc: 'Supply chain security and business continuity' }
        ];
        
        return standards.map(s => `
            <div class="home-standard-item">
                <div class="home-standard-category">${s.cat}</div>
                <div class="home-standard-name">${s.name}</div>
                <div class="home-standard-desc">${s.desc}</div>
            </div>
        `).join('');
    }
    
    function drawFrameworkDiagram() {
        const canvas = document.getElementById('frameworkCanvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        ctx.fillStyle = colors.white;
        ctx.fillRect(0, 0, width, height);
        
        const components = [
            { name: 'Petri Net\nSimulation', x: 120, y: 80, color: colors.petriNet, desc: 'State Modeling' },
            { name: 'Monte Carlo\nAnalysis', x: 340, y: 80, color: colors.monteCarlo, desc: 'Statistical Validation' },
            { name: 'Enhanced\nFTA', x: 560, y: 80, color: colors.fta, desc: 'Risk Prioritization' },
            { name: 'SCOR\nMapping', x: 780, y: 80, color: colors.scor, desc: 'Industry Application' }
        ];
        
        const boxWidth = 140, boxHeight = 80;
        
        ctx.fillStyle = '#f8f9fa';
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 2;
        roundRect(ctx, 60, 280, width - 120, 70, 8, true, true);
        
        ctx.fillStyle = colors.primary;
        ctx.font = '600 14px Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SHARED SIMULATION PARAMETERS', width / 2, 310);
        
        ctx.font = '400 12px Roboto, sans-serif';
        ctx.fillStyle = colors.textLight;
        ctx.fillText('Risk Probabilities  |  Mitigation Configurations  |  Cost Multipliers  |  Recovery Factors', width / 2, 332);
        
        ctx.fillStyle = '#fff8e6';
        ctx.strokeStyle = '#f39c12';
        ctx.lineWidth = 2;
        roundRect(ctx, width/2 - 160, 185, 320, 55, 8, true, true);
        
        ctx.fillStyle = colors.primary;
        ctx.font = '600 13px Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('KEY FINDING: 40-60% Cost Underestimation', width / 2, 210);
        
        ctx.font = '400 11px Roboto, sans-serif';
        ctx.fillStyle = colors.textLight;
        ctx.fillText('Traditional models miss cyber-physical cascade effects', width / 2, 228);
        
        components.forEach((comp, i) => {
            const x = comp.x - boxWidth/2;
            const y = comp.y;
            
            ctx.fillStyle = 'rgba(0,0,0,0.05)';
            roundRect(ctx, x + 3, y + 3, boxWidth, boxHeight, 6, true, false);
            
            ctx.fillStyle = colors.white;
            ctx.strokeStyle = comp.color;
            ctx.lineWidth = 2;
            roundRect(ctx, x, y, boxWidth, boxHeight, 6, true, true);
            
            ctx.fillStyle = comp.color;
            ctx.fillRect(x, y, boxWidth, 6);
            ctx.beginPath();
            ctx.arc(x + 6, y + 6, 6, Math.PI, 1.5 * Math.PI);
            ctx.lineTo(x + boxWidth - 6, y);
            ctx.arc(x + boxWidth - 6, y + 6, 6, 1.5 * Math.PI, 0);
            ctx.lineTo(x + boxWidth, y + 6);
            ctx.lineTo(x, y + 6);
            ctx.closePath();
            ctx.fill();
            
            ctx.fillStyle = colors.text;
            ctx.font = '600 13px Roboto, sans-serif';
            ctx.textAlign = 'center';
            comp.name.split('\n').forEach((line, j) => {
                ctx.fillText(line, comp.x, y + 32 + (j * 16));
            });
            
            ctx.font = '400 11px Roboto, sans-serif';
            ctx.fillStyle = colors.textLight;
            ctx.fillText(comp.desc, comp.x, y + boxHeight + 18);
            
            if (i < components.length - 1) {
                const next = components[i + 1];
                const arrowY = y + boxHeight/2;
                const startX = comp.x + boxWidth/2 + 5;
                const endX = next.x - boxWidth/2 - 5;
                
                ctx.strokeStyle = colors.textMuted;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(startX, arrowY);
                ctx.lineTo(endX - 8, arrowY);
                ctx.stroke();
                
                ctx.fillStyle = colors.textMuted;
                ctx.beginPath();
                ctx.moveTo(endX, arrowY);
                ctx.lineTo(endX - 8, arrowY - 5);
                ctx.lineTo(endX - 8, arrowY + 5);
                ctx.closePath();
                ctx.fill();
            }
        });
        
        ctx.fillStyle = colors.text;
        ctx.font = '600 16px Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Integrated Cyber-Physical Risk Assessment Framework', width / 2, 35);
        
        ctx.font = '400 12px Roboto, sans-serif';
        ctx.fillStyle = colors.textLight;
        ctx.fillText('Four interconnected components sharing a unified parameter set', width / 2, 55);
        
        ctx.font = '500 11px Roboto, sans-serif';
        ctx.fillStyle = colors.textMuted;
        ctx.textAlign = 'left';
        ctx.fillText('Data Flow', 70, 395);
        
        ctx.beginPath();
        ctx.moveTo(120, 392);
        ctx.lineTo(180, 392);
        ctx.strokeStyle = colors.textMuted;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        ctx.fillStyle = colors.textMuted;
        ctx.beginPath();
        ctx.moveTo(180, 392);
        ctx.lineTo(174, 388);
        ctx.lineTo(174, 396);
        ctx.closePath();
        ctx.fill();
    }
    
    function roundRect(ctx, x, y, w, h, r, fill, stroke) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        if (fill) ctx.fill();
        if (stroke) ctx.stroke();
    }
    
    function getStyles() {
        return `
        .home-container { font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif; background: ${colors.white}; border: 1px solid ${colors.border}; border-radius: 8px; overflow: hidden; }
        .home-hero { background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%); padding: 48px 40px; text-align: center; }
        .home-title { font-size: 28px; font-weight: 700; color: ${colors.white}; margin: 0 0 8px 0; letter-spacing: -0.5px; }
        .home-thesis-context { font-size: 14px; color: rgba(255,255,255,0.7); margin: 0 0 24px 0; text-transform: uppercase; letter-spacing: 2px; }
        .home-problem-statement { max-width: 700px; margin: 0 auto; padding: 20px 28px; background: rgba(255,255,255,0.1); border-radius: 8px; font-size: 15px; line-height: 1.6; color: rgba(255,255,255,0.9); text-align: left; }
        .home-problem-label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: rgba(255,255,255,0.6); margin-bottom: 8px; }
        .home-finding-banner { display: flex; align-items: center; gap: 16px; padding: 20px 40px; background: #fef3cd; border-bottom: 1px solid #f0d78c; }
        .home-finding-icon { width: 36px; height: 36px; border-radius: 50%; background: #f39c12; color: white; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; flex-shrink: 0; }
        .home-finding-content { flex: 1; }
        .home-finding-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #92400e; margin-bottom: 4px; }
        .home-finding-text { font-size: 15px; color: ${colors.text}; line-height: 1.5; }
        .home-finding-text strong { color: #92400e; }
        .home-content { padding: 40px; }
        .home-section { margin-bottom: 48px; }
        .home-section:last-child { margin-bottom: 0; }
        .home-section-title { font-size: 18px; font-weight: 600; color: ${colors.text}; margin: 0 0 12px 0; padding-bottom: 12px; border-bottom: 2px solid ${colors.border}; }
        .home-section-intro { font-size: 14px; color: ${colors.textLight}; line-height: 1.6; margin-bottom: 24px; max-width: 800px; }
        .home-framework-diagram { background: white; border: 1px solid ${colors.border}; border-radius: 8px; padding: 20px; overflow-x: auto; }
        .home-framework-diagram canvas { display: block; margin: 0 auto; }
        .home-flow-container { position: relative; }
        .home-flow-step { display: flex; gap: 20px; padding: 24px; background: white; border: 1px solid ${colors.border}; border-radius: 8px; margin-bottom: 12px; }
        .home-flow-step:last-child { margin-bottom: 0; }
        .home-flow-number { width: 40px; height: 40px; border-radius: 50%; background: ${colors.primary}; color: white; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; flex-shrink: 0; }
        .home-flow-step:nth-child(1) .home-flow-number { background: ${colors.petriNet}; }
        .home-flow-step:nth-child(3) .home-flow-number { background: ${colors.monteCarlo}; }
        .home-flow-step:nth-child(5) .home-flow-number { background: ${colors.fta}; }
        .home-flow-step:nth-child(7) .home-flow-number { background: ${colors.scor}; }
        .home-flow-content { flex: 1; }
        .home-flow-title { font-size: 16px; font-weight: 600; color: ${colors.text}; margin: 0 0 8px 0; }
        .home-flow-desc { font-size: 13px; color: ${colors.textLight}; line-height: 1.6; margin: 0 0 12px 0; }
        .home-flow-output { font-size: 12px; color: ${colors.textMuted}; padding: 8px 12px; background: ${colors.background}; border-radius: 4px; }
        .home-flow-output-label { font-weight: 600; color: ${colors.textLight}; }
        .home-flow-arrow { text-align: center; padding: 8px 0; font-size: 12px; color: ${colors.textMuted}; font-style: italic; }
        .home-sowhat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        @media (max-width: 900px) { .home-sowhat-grid { grid-template-columns: 1fr; } }
        .home-sowhat-card { background: white; border: 1px solid ${colors.border}; border-radius: 8px; padding: 24px; }
        .home-sowhat-card:hover { border-color: ${colors.primary}; box-shadow: 0 4px 12px rgba(44, 62, 80, 0.1); }
        .home-sowhat-header { font-size: 14px; font-weight: 600; color: ${colors.text}; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid ${colors.border}; }
        .home-sowhat-text { font-size: 13px; color: ${colors.textLight}; line-height: 1.6; }
        .home-nav-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        @media (max-width: 1000px) { .home-nav-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px) { .home-nav-grid { grid-template-columns: 1fr; } }
        .home-nav-card { background: white; border: 1px solid ${colors.border}; border-radius: 8px; padding: 20px; cursor: pointer; transition: all 0.2s; }
        .home-nav-card:hover { border-color: ${colors.primary}; box-shadow: 0 4px 12px rgba(44, 62, 80, 0.1); transform: translateY(-2px); }
        .home-nav-icon { width: 48px; height: 48px; border-radius: 8px; color: white; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; margin-bottom: 16px; }
        .home-nav-title { font-size: 14px; font-weight: 600; color: ${colors.text}; margin: 0 0 6px 0; }
        .home-nav-desc { font-size: 12px; color: ${colors.textMuted}; margin: 0 0 12px 0; line-height: 1.4; }
        .home-nav-action { font-size: 12px; font-weight: 600; color: ${colors.petriNet}; }
        .home-standards-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        @media (max-width: 800px) { .home-standards-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 500px) { .home-standards-grid { grid-template-columns: 1fr; } }
        .home-standard-item { background: white; border: 1px solid ${colors.border}; border-radius: 6px; padding: 16px; }
        .home-standard-category { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: ${colors.textMuted}; margin-bottom: 4px; }
        .home-standard-name { font-size: 14px; font-weight: 600; color: ${colors.text}; margin-bottom: 4px; }
        .home-standard-desc { font-size: 11px; color: ${colors.textLight}; line-height: 1.4; }
        .home-footer { background: ${colors.background}; padding: 20px 40px; border-top: 1px solid ${colors.border}; text-align: center; }
        .home-footer-content { font-size: 12px; color: ${colors.textMuted}; }
        `;
    }
    
    return {
        init: function(containerId) { render(containerId); },
        refresh: function() {
            const container = document.getElementById('homeContainer');
            if (container) render('homeContainer');
        }
    };
})();

window.HomeModule = HomeModule;
