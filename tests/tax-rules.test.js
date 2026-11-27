const test = require('node:test');
const assert = require('node:assert/strict');

const TaxRules = require('../tax-rules.js');

const DEFAULT_RATES = {
    eeBHXH: 8,
    eeBHYT: 1.5,
    eeBHTN: 1,
    erBHXH: 17.5,
    erBHYT: 3,
    erBHTN: 1
};

function makeParams(periodKey, dependents = 0, region = 1) {
    return TaxRules.buildParams(periodKey, {
        region,
        dependents,
        insuranceType: 'actual',
        customInsuranceSalary: 0,
        rates: DEFAULT_RATES
    });
}

test('calculatePIT law109-2025 (5 brackets)', () => {
    const brackets = TaxRules.PIT_SCHEDULES['law109-2025'];
    assert.equal(brackets.length, 5);

    const cases = [
        [0, 0],
        [10000000, 500000],
        [10000100, 500010],
        [30000000, 2500000],
        [60000000, 8500000],
        [100000000, 20500000],
        [120000000, 27500000]
    ];

    for (const [taxable, expected] of cases) {
        const res = TaxRules.calculatePIT(taxable, brackets);
        assert.equal(res.steps.length, 5);
        assert.equal(Math.round(res.pit), expected, `taxable=${taxable}`);
        if (taxable === 10000100) {
            assert.equal(res.steps[1].active, true);
            assert.equal(res.steps[0].taxable, 10000000);
        }
    }
});

test('calculatePIT tt111-2013 (7 brackets)', () => {
    const brackets = TaxRules.PIT_SCHEDULES['tt111-2013'];
    assert.equal(brackets.length, 7);

    const cases = [
        [5000000, 250000],
        [5000100, 250010],
        [10000000, 750000],
        [18000000, 1950000],
        [32000000, 4750000],
        [52000000, 9750000],
        [80000000, 18150000],
        [100000000, 25150000]
    ];

    for (const [taxable, expected] of cases) {
        const res = TaxRules.calculatePIT(taxable, brackets);
        assert.equal(res.steps.length, 7);
        assert.equal(Math.round(res.pit), expected, `taxable=${taxable}`);
        if (taxable === 5000100) {
            assert.equal(res.steps[1].active, true);
            assert.equal(res.steps[0].taxable, 5000000);
        }
    }
});

test('Gross->Net july-2026 with 30,000,000 gross and 0/1/2 dependents', () => {
    const r0 = TaxRules.calculateGrossToNet(30000000, makeParams('july-2026', 0));
    assert.equal(r0.totalInsuranceEE, 3150000);
    assert.equal(r0.taxableIncome, 11350000);
    assert.equal(r0.pit, 635000);
    assert.equal(r0.net, 26215000);

    const r1 = TaxRules.calculateGrossToNet(30000000, makeParams('july-2026', 1));
    assert.equal(r1.taxableIncome, 5150000);
    assert.equal(r1.pit, 257500);
    assert.equal(r1.net, 26592500);

    const r2 = TaxRules.calculateGrossToNet(30000000, makeParams('july-2026', 2));
    assert.equal(r2.taxableIncome, 0);
    assert.equal(r2.pit, 0);
    assert.equal(r2.net, 26850000);
});

test('Gross->Net jan-2026 and prev-2026 regression with 30,000,000 gross', () => {
    const jan0 = TaxRules.calculateGrossToNet(30000000, makeParams('jan-2026', 0));
    assert.equal(jan0.pit, 1627500);
    assert.equal(jan0.net, 25222500);

    const prev0 = TaxRules.calculateGrossToNet(30000000, makeParams('prev-2026', 0));
    assert.equal(prev0.pit, 1627500);
    assert.equal(prev0.net, 25222500);

    const jan1 = TaxRules.calculateGrossToNet(30000000, makeParams('jan-2026', 1));
    assert.equal(jan1.taxableIncome, 11450000);
    assert.equal(jan1.pit, 967500);
});

test('REGULATIONS deduction values and pitSchedule mapping per period', () => {
    assert.equal(TaxRules.REGULATIONS['july-2026'].selfDeduction, 15500000);
    assert.equal(TaxRules.REGULATIONS['july-2026'].dependentDeduction, 6200000);
    assert.equal(TaxRules.REGULATIONS['july-2026'].pitSchedule, 'law109-2025');

    for (const key of ['jan-2026', 'prev-2026']) {
        assert.equal(TaxRules.REGULATIONS[key].selfDeduction, 11000000);
        assert.equal(TaxRules.REGULATIONS[key].dependentDeduction, 4400000);
        assert.equal(TaxRules.REGULATIONS[key].pitSchedule, 'tt111-2013');
    }
});

test('Insurance cap july-2026 at 80,000,000 gross', () => {
    const res = TaxRules.calculateGrossToNet(80000000, makeParams('july-2026', 0));
    // BHXH/BHYT base capped at 20 * 2,530,000 = 50,600,000 -> eeBHXH = 4,048,000
    assert.equal(res.eeBHXH, 4048000);
});

test('BHTN cap differs by period region minimum wage', () => {
    const julyRes = TaxRules.calculateGrossToNet(120000000, makeParams('july-2026', 0, 1));
    assert.equal(julyRes.eeBHTN, 1062000);
    assert.equal(julyRes.eeBHXH, 4048000);

    const prevRes = TaxRules.calculateGrossToNet(120000000, makeParams('prev-2026', 0, 1));
    assert.equal(prevRes.eeBHTN, 992000);
    assert.equal(prevRes.eeBHXH, 3744000);
});

test('Net->Gross round trip for july-2026 and jan-2026', () => {
    const nets = [5000000, 15000000, 25000000, 26215000, 60000000, 120000000];

    for (const period of ['july-2026', 'jan-2026']) {
        for (const deps of [0, 1, 2]) {
            const params = makeParams(period, deps);
            for (const net of nets) {
                const r = TaxRules.calculateNetToGross(net, params);
                const verify = TaxRules.calculateGrossToNet(r.gross, params);
                assert.ok(
                    Math.abs(verify.net - net) <= 1,
                    `Round trip failed for period=${period}, deps=${deps}, net=${net}, got=${verify.net}`
                );
                assert.ok(
                    r.gross >= net,
                    `Expected gross >= net for period=${period}, deps=${deps}, net=${net}, gross=${r.gross}`
                );
            }
        }
    }

    const july30m = TaxRules.calculateNetToGross(26215000, makeParams('july-2026', 0));
    assert.ok(
        Math.abs(Math.round(july30m.gross) - 30000000) <= 1,
        `Expected gross within 1 of 30000000, got ${july30m.gross}`
    );
});

test('buildParams throws on unknown period', () => {
    assert.throws(() => {
        makeParams('unknown-period', 0);
    });
});
