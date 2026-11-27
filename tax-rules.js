(function (root) {
    'use strict';

    const PIT_SCHEDULES = {
        'tt111-2013': [
            { min: 0, max: 5000000, rate: 0.05 },
            { min: 5000000, max: 10000000, rate: 0.10 },
            { min: 10000000, max: 18000000, rate: 0.15 },
            { min: 18000000, max: 32000000, rate: 0.20 },
            { min: 32000000, max: 52000000, rate: 0.25 },
            { min: 52000000, max: 80000000, rate: 0.30 },
            { min: 80000000, max: Infinity, rate: 0.35 }
        ],
        'law109-2025': [
            { min: 0, max: 10000000, rate: 0.05 },
            { min: 10000000, max: 30000000, rate: 0.10 },
            { min: 30000000, max: 60000000, rate: 0.20 },
            { min: 60000000, max: 100000000, rate: 0.30 },
            { min: 100000000, max: Infinity, rate: 0.35 }
        ]
    };

    const REGULATIONS = {
        'july-2026': {
            name: "Từ 01/07/2026 (Mới nhất)",
            basicSalary: 2530000,
            regions: {
                1: 5310000,
                2: 4730000,
                3: 4140000,
                4: 3700000
            },
            selfDeduction: 15500000,
            dependentDeduction: 6200000,
            pitSchedule: 'law109-2025',
            legalBasis: "NQ 110/2025/UBTVQH15 · Luật Thuế TNCN 109/2025/QH15"
        },
        'jan-2026': {
            name: "Từ 01/01/2026 - 30/06/2026",
            basicSalary: 2340000,
            regions: {
                1: 5310000,
                2: 4730000,
                3: 4140000,
                4: 3700000
            },
            selfDeduction: 15500000,
            dependentDeduction: 6200000,
            pitSchedule: 'law109-2025',
            legalBasis: "NQ 110/2025/UBTVQH15 · Luật Thuế TNCN 109/2025/QH15"
        },
        'prev-2026': {
            name: "Trước năm 2026",
            basicSalary: 2340000,
            regions: {
                1: 4960000,
                2: 4410000,
                3: 3860000,
                4: 3450000
            },
            selfDeduction: 11000000,
            dependentDeduction: 4400000,
            pitSchedule: 'tt111-2013',
            legalBasis: "NQ 954/2020/UBTVQH14 · Thông tư 111/2013/TT-BTC"
        }
    };

    function formatVND(amount) {
        return Math.round(amount).toLocaleString("vi-VN") + "đ";
    }

    function calculatePIT(taxableIncome, brackets) {
        let pit = 0;
        const steps = [];
        const income = Math.max(0, taxableIncome);

        brackets.forEach((b, index) => {
            let taxInThisBracket = 0;
            let taxableInBracket = 0;

            if (income > b.min) {
                taxableInBracket = Math.min(income, b.max) - b.min;
                taxInThisBracket = taxableInBracket * b.rate;
                pit += taxInThisBracket;
            }

            steps.push({
                bracket: index + 1,
                range: `${formatVND(b.min)} - ${b.max === Infinity ? 'Trở lên' : formatVND(b.max)}`,
                rate: `${Math.round(b.rate * 100)}%`,
                taxable: taxableInBracket,
                tax: taxInThisBracket,
                active: taxableInBracket > 0
            });
        });

        return { pit, steps };
    }

    /**
     * Calculates Net from a given Gross salary and parameters.
     */
    function calculateGrossToNet(gross, params) {
        const {
            basicSalary,
            regionMinWage,
            selfDeduction,
            dependentDeduction,
            brackets,
            dependents,
            insuranceType,
            customInsuranceSalary,
            rates
        } = params;

        // 1. Determine base salary for insurances
        let baseInsuranceEE = gross;
        let baseInsuranceER = gross;

        if (insuranceType === 'custom') {
            baseInsuranceEE = customInsuranceSalary;
            baseInsuranceER = customInsuranceSalary;
        }

        // Cap for BHXH, BHYT: 20 times reference salary
        const capBHXH_BHYT = 20 * basicSalary;
        // Cap for BHTN: 20 times regional minimum wage
        const capBHTN = 20 * regionMinWage;

        // Employee insurances
        const eeBHXH = Math.min(baseInsuranceEE, capBHXH_BHYT) * (rates.eeBHXH / 100);
        const eeBHYT = Math.min(baseInsuranceEE, capBHXH_BHYT) * (rates.eeBHYT / 100);
        const eeBHTN = Math.min(baseInsuranceEE, capBHTN) * (rates.eeBHTN / 100);
        const totalInsuranceEE = eeBHXH + eeBHYT + eeBHTN;

        // Employer insurances
        const erBHXH = Math.min(baseInsuranceER, capBHXH_BHYT) * (rates.erBHXH / 100);
        const erBHYT = Math.min(baseInsuranceER, capBHXH_BHYT) * (rates.erBHYT / 100);
        const erBHTN = Math.min(baseInsuranceER, capBHTN) * (rates.erBHTN / 100);
        const totalInsuranceER = erBHXH + erBHYT + erBHTN;

        // 2. Taxable Income
        const incomeBeforeTax = gross - totalInsuranceEE;

        // Deductions
        const selfDeduct = selfDeduction;
        const depDeduct = dependentDeduction * dependents;
        const totalDeductions = selfDeduct + depDeduct;

        // Converted Taxable Income
        const taxableIncome = Math.max(0, incomeBeforeTax - totalDeductions);

        // 3. PIT calculation & steps breakdown
        const { pit, steps: pitSteps } = calculatePIT(taxableIncome, brackets);

        const net = gross - totalInsuranceEE - pit;
        const totalEmployerCost = gross + totalInsuranceER;

        return {
            gross,
            net,
            eeBHXH,
            eeBHYT,
            eeBHTN,
            totalInsuranceEE,
            incomeBeforeTax,
            selfDeduct,
            depDeduct,
            totalDeductions,
            taxableIncome,
            pit,
            pitSteps,
            erBHXH,
            erBHYT,
            erBHTN,
            totalInsuranceER,
            totalEmployerCost
        };
    }

    /**
     * Binary search to convert Net to Gross salary.
     */
    function calculateNetToGross(netTarget, params) {
        let lower = netTarget;
        // Set a safe upper bound: Net target plus high potential taxes and insurance
        let upper = Math.max(netTarget * 3, 10000000);
        let grossSolution = netTarget;

        // Run binary search
        for (let i = 0; i < 40; i++) {
            const mid = (lower + upper) / 2;
            const res = calculateGrossToNet(mid, params);

            if (res.net > netTarget) {
                upper = mid;
            } else {
                lower = mid;
                grossSolution = mid;
            }
        }

        // Final precise calculation
        return calculateGrossToNet(grossSolution, params);
    }

    function buildParams(periodKey, options) {
        const cfg = REGULATIONS[periodKey];
        if (!cfg) {
            throw new Error(`Unknown regulation period: ${periodKey}`);
        }

        const {
            region,
            dependents = 0,
            insuranceType = 'actual',
            customInsuranceSalary = 0,
            rates
        } = options || {};

        const regionMinWage = cfg.regions[region];
        if (regionMinWage == null) {
            throw new Error(`Unknown region: ${region}`);
        }

        const brackets = PIT_SCHEDULES[cfg.pitSchedule];
        if (!brackets) {
            throw new Error(`Unknown PIT schedule: ${cfg.pitSchedule}`);
        }

        return {
            basicSalary: cfg.basicSalary,
            regionMinWage,
            selfDeduction: cfg.selfDeduction,
            dependentDeduction: cfg.dependentDeduction,
            brackets,
            dependents,
            insuranceType,
            customInsuranceSalary,
            rates
        };
    }

    const api = {
        PIT_SCHEDULES,
        REGULATIONS,
        formatVND,
        calculatePIT,
        calculateGrossToNet,
        calculateNetToGross,
        buildParams
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        root.TaxRules = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
