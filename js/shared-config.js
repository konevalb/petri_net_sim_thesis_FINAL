const SharedConfig = (function() {
    'use strict';
    
    const COLORS = {
        primary: '#2c3e50',
        secondary: '#34495e',
        standard: '#4a90e2',
        risk: '#e74c3c',
        mitigated: '#16a34a',
        warning: '#f39c12',
        cyber: '#9b59b6',
        cascade: '#9b59b6',
        text: '#2c3e50',
        textLight: '#666',
        textMuted: '#999',
        border: '#e0e0e0',
        background: '#fafafa',
        white: '#ffffff',
        success: '#16a34a',
        danger: '#e74c3c',
        highlight: '#fff3cd',
        grid: '#e0e0e0',
        plan: '#3498db',
        source: '#9b59b6',
        make: '#e67e22',
        deliver: '#1abc9c',
        return: '#e74c3c',
        enable: '#34495e'
    };

    const MITIGATION_DEFAULTS = {
        backup: { cost: 5000, ransomwareReduction: 0.4 },
        firewall: { cost: 3000, ransomwareReduction: 0.35 },
        buffer: { cost: 15000, supplierReduction: 0.8, bufferDays: 30 },
        dual: { cost: 4000, supplierReduction: 0.5 },
        maintenance: { cost: 6000, equipmentReduction: 0.7 },
        redundancy: { cost: 25000, equipmentReduction: 0.8 }
    };

    const PARAM_DEFAULTS = {
        ransomwareProb: 0.02,
        equipmentProb: 0.05,
        supplierProb: 0.01,
        cascadeDelay: 800,
        recoveryFactor: 3,
        costMultiplier: 1.0
    };

    function getParameters() {
        if (window.parameters) {
            return {
                ransomwareProb: window.parameters.ransomwareProb ?? PARAM_DEFAULTS.ransomwareProb,
                equipmentProb: window.parameters.equipmentProb ?? PARAM_DEFAULTS.equipmentProb,
                supplierProb: window.parameters.supplierProb ?? PARAM_DEFAULTS.supplierProb,
                cascadeDelay: window.parameters.cascadeDelay ?? PARAM_DEFAULTS.cascadeDelay,
                recoveryFactor: window.parameters.recoveryFactor ?? PARAM_DEFAULTS.recoveryFactor,
                costMultiplier: window.parameters.costMultiplier ?? PARAM_DEFAULTS.costMultiplier
            };
        }
        return { ...PARAM_DEFAULTS };
    }

    function getActiveMitigations() {
        return window.activeMitigations || new Set();
    }

    function getMitigationConfigs() {
        return window.mitigationConfigs || { ...MITIGATION_DEFAULTS };
    }

    function applyMitigationReduction(baseProb, mitigationType) {
        const mitigations = getActiveMitigations();
        const configs = getMitigationConfigs();
        let prob = baseProb;

        if (mitigationType === 'ransomware') {
            if (mitigations.has('backup')) prob *= (1 - configs.backup.ransomwareReduction);
            if (mitigations.has('firewall')) prob *= (1 - configs.firewall.ransomwareReduction);
        } else if (mitigationType === 'equipment') {
            if (mitigations.has('maintenance')) prob *= (1 - configs.maintenance.equipmentReduction);
            if (mitigations.has('redundancy')) prob *= (1 - configs.redundancy.equipmentReduction);
        } else if (mitigationType === 'supplier') {
            if (mitigations.has('dual')) prob *= (1 - configs.dual.supplierReduction);
            if (mitigations.has('buffer')) prob *= (1 - configs.buffer.supplierReduction);
        }

        return prob;
    }

    return {
        COLORS: COLORS,
        MITIGATION_DEFAULTS: MITIGATION_DEFAULTS,
        PARAM_DEFAULTS: PARAM_DEFAULTS,
        getParameters: getParameters,
        getActiveMitigations: getActiveMitigations,
        getMitigationConfigs: getMitigationConfigs,
        applyMitigationReduction: applyMitigationReduction
    };
})();

window.SharedConfig = SharedConfig;
