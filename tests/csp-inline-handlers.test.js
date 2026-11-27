const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');

const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(rootDir, 'app.js'), 'utf8');
const vercelJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'vercel.json'), 'utf8'));

test('index.html contains zero inline event-handler attributes (on*=)', () => {
    const htmlWithoutComments = indexHtml.replace(/<!--[\s\S]*?-->/g, '');
    const tags = htmlWithoutComments.match(/<[^>]+>/g) || [];

    for (const tag of tags) {
        assert.doesNotMatch(
            tag,
            /\son[a-z]+\s*=/i,
            `Found inline event handler attribute in tag: ${tag}`
        );
    }
});

test('index.html contains zero inline <script> blocks with code', () => {
    const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = scriptRegex.exec(indexHtml)) !== null) {
        assert.equal(
            match[1].trim(),
            '',
            `Found inline <script> with content: ${match[0]}`
        );
    }
});

test('app.js wires all 12 controls (11 bindings + 2 data-delta counter buttons) via addEventListener inside bindEventHandlers', () => {
    const match = appJs.match(/function\s+bindEventHandlers\s*\(\)\s*\{([\s\S]*?)\r?\n\}\r?\n/);
    assert.ok(match, 'bindEventHandlers() function should exist in app.js');

    const body = match[1];

    const controlBindings = [
        {
            name: 'tab-gross-net',
            pattern: /getElementById\(\s*['"]tab-gross-net['"]\s*\)[\s\S]{0,120}?\.addEventListener\(\s*['"]click['"]\s*,\s*\(\)\s*=>\s*switchMode\(\s*['"]gross-net['"]\s*\)\s*\)/,
        },
        {
            name: 'tab-net-gross',
            pattern: /getElementById\(\s*['"]tab-net-gross['"]\s*\)[\s\S]{0,120}?\.addEventListener\(\s*['"]click['"]\s*,\s*\(\)\s*=>\s*switchMode\(\s*['"]net-gross['"]\s*\)\s*\)/,
        },
        {
            name: 'salary-form',
            pattern: /getElementById\(\s*['"]salary-form['"]\s*\)[\s\S]{0,120}?\.addEventListener\(\s*['"]submit['"]\s*,\s*\([^)]*\)\s*=>\s*\{[\s\S]{0,120}?\.preventDefault\(\)[\s\S]{0,60}?calculate\(\)/,
        },
        {
            name: 'period-select',
            pattern: /getElementById\(\s*['"]period-select['"]\s*\)[\s\S]{0,120}?\.addEventListener\(\s*['"]change['"]\s*,\s*\(\)\s*=>\s*handlePeriodChange\(\)\s*\)/,
        },
        {
            name: 'region-select',
            pattern: /getElementById\(\s*['"]region-select['"]\s*\)[\s\S]{0,120}?\.addEventListener\(\s*['"]change['"]\s*,\s*\(\)\s*=>\s*handleRegionChange\(\)\s*\)/,
        },
        {
            name: '.btn-counter[data-delta]',
            pattern: /querySelectorAll\(\s*['"]\.btn-counter\[data-delta\]['"]\s*\)[\s\S]{0,200}?\.addEventListener\(\s*['"]click['"]\s*,\s*\(\)\s*=>\s*adjustDependents\(\s*delta\s*\)\s*\)/,
        },
        {
            name: 'insurance-type actual',
            pattern: /querySelector\(\s*['"]input\[name=["']insurance-type["']\]\[value=["']actual["']\]['"]\s*\)[\s\S]{0,120}?\.addEventListener\(\s*['"]change['"]\s*,\s*\(\)\s*=>\s*toggleCustomInsuranceInput\(\s*false\s*\)\s*\)/,
        },
        {
            name: 'insurance-type custom',
            pattern: /querySelector\(\s*['"]input\[name=["']insurance-type["']\]\[value=["']custom["']\]['"]\s*\)[\s\S]{0,120}?\.addEventListener\(\s*['"]change['"]\s*,\s*\(\)\s*=>\s*toggleCustomInsuranceInput\(\s*true\s*\)\s*\)/,
        },
        {
            name: '.advanced-settings-header',
            pattern: /querySelector\(\s*['"]\.advanced-settings-header['"]\s*\)[\s\S]{0,120}?\.addEventListener\(\s*['"]click['"]\s*,\s*\(\)\s*=>\s*toggleAdvancedSettings\(\)\s*\)/,
        },
        {
            name: 'btn-export-pdf',
            pattern: /getElementById\(\s*['"]btn-export-pdf['"]\s*\)[\s\S]{0,120}?\.addEventListener\(\s*['"]click['"]\s*,\s*\(\)\s*=>\s*exportPDF\(\)\s*\)/,
        },
        {
            name: '.btn-clear-history',
            pattern: /querySelector\(\s*['"]\.btn-clear-history['"]\s*\)[\s\S]{0,120}?\.addEventListener\(\s*['"]click['"]\s*,\s*\(\)\s*=>\s*clearHistory\(\)\s*\)/,
        },
    ];

    for (const { name, pattern } of controlBindings) {
        assert.match(
            body,
            pattern,
            `Expected bindEventHandlers() to wire ${name} via addEventListener`
        );
    }

    assert.match(
        indexHtml,
        /<button\b[^>]*class=["'][^"']*\bbtn-counter\b[^"']*["'][^>]*data-delta=["']-1["'][^>]*>/,
        'Expected index.html to have a .btn-counter button with data-delta="-1"'
    );
    assert.match(
        indexHtml,
        /<button\b[^>]*class=["'][^"']*\bbtn-counter\b[^"']*["'][^>]*data-delta=["']1["'][^>]*>/,
        'Expected index.html to have a .btn-counter button with data-delta="1"'
    );
});

test('index.html contains no javascript: URLs', () => {
    assert.doesNotMatch(
        indexHtml,
        /javascript:/i,
        'index.html must not contain javascript: URLs'
    );
});

test('app.js and vendor/*.js contain no inline-code or dynamic-eval patterns', () => {
    const vendorDir = path.join(rootDir, 'vendor');
    const vendorFiles = fs.existsSync(vendorDir)
        ? fs.readdirSync(vendorDir).filter((f) => f.endsWith('.js')).map((f) => path.join('vendor', f))
        : [];
    const jsFiles = ['app.js', 'tax-rules.js', ...vendorFiles];

    const forbiddenPatterns = [
        { label: 'inline on*= attribute in string/template', pattern: /\son[a-z]+\s*=\s*["'`]/i },
        { label: 'javascript: URL', pattern: /javascript:/i },
        { label: 'setAttribute("on...", ...)', pattern: /setAttribute\(\s*["'`]on/i },
        { label: 'eval(...)', pattern: /\beval\s*\(/ },
        { label: 'new Function(...)', pattern: /\bnew\s+Function\s*\(/ },
        { label: 'setTimeout/setInterval with string literal', pattern: /\bset(?:Timeout|Interval)\s*\(\s*["'`]/ },
    ];

    for (const relPath of jsFiles) {
        const content = fs.readFileSync(path.join(rootDir, relPath), 'utf8');
        for (const { label, pattern } of forbiddenPatterns) {
            assert.doesNotMatch(
                content,
                pattern,
                `Found forbidden ${label} in ${relPath}`
            );
        }
    }
});

test('vercel.json CSP script-src does not allow unsafe-inline or unsafe-hashes', () => {
    const headers = (vercelJson.headers || []).flatMap((rule) => rule.headers || []);
    const cspHeader = headers.find((h) => h.key.toLowerCase() === 'content-security-policy');
    assert.ok(cspHeader, 'Content-Security-Policy header should exist in vercel.json');

    const directives = cspHeader.value.split(';').map((d) => d.trim());
    const scriptSrc = directives.find((d) => d.startsWith('script-src'));
    assert.ok(scriptSrc, 'script-src directive should exist in CSP');

    assert.ok(!scriptSrc.includes("'unsafe-inline'"), "script-src must not contain 'unsafe-inline'");
    assert.ok(!scriptSrc.includes("'unsafe-hashes'"), "script-src must not contain 'unsafe-hashes'");
});

test('index.html loads tax-rules.js exactly once, as a classic script, before app.js', () => {
    const htmlWithoutComments = indexHtml.replace(/<!--[\s\S]*?-->/g, '');
    const scriptTagRegex = /<script\b([^>]*)>/gi;
    const srcAttrRegex = /(?:^|\s)src\s*=\s*(?:"([^"]*)"|'([^']*)')/i;

    const scripts = [];
    let match;
    while ((match = scriptTagRegex.exec(htmlWithoutComments)) !== null) {
        const attrs = match[1];
        const srcMatch = attrs.match(srcAttrRegex);
        if (!srcMatch) continue;
        const rawSrc = srcMatch[1] ?? srcMatch[2];
        const normalizedSrc = rawSrc.replace(/^(?:\.\/|\/)/, '');
        scripts.push({ tag: match[0], attrs, src: normalizedSrc });
    }

    const taxRulesScripts = scripts.filter((s) => s.src === 'tax-rules.js');
    const appJsScripts = scripts.filter((s) => s.src === 'app.js');

    assert.equal(taxRulesScripts.length, 1, 'Expected index.html to load tax-rules.js exactly once');
    assert.equal(appJsScripts.length, 1, 'Expected index.html to load app.js exactly once');

    const taxRulesIndex = scripts.findIndex((s) => s.src === 'tax-rules.js');
    const appJsIndex = scripts.findIndex((s) => s.src === 'app.js');
    assert.ok(taxRulesIndex < appJsIndex, 'Expected tax-rules.js to be loaded before app.js');

    const taxRulesAttrs = taxRulesScripts[0].attrs;
    assert.doesNotMatch(
        taxRulesAttrs,
        /(?:^|\s)type\s*=\s*["']?module["']?(?:\s|$)/i,
        'tax-rules.js must be a classic script (no type="module")'
    );
    assert.doesNotMatch(
        taxRulesAttrs,
        /(?:^|\s)async(?:\s*=|\s|$)/i,
        'tax-rules.js must not have async attribute'
    );
    assert.doesNotMatch(
        taxRulesAttrs,
        /(?:^|\s)defer(?:\s*=|\s|$)/i,
        'tax-rules.js must not have defer attribute'
    );
});
