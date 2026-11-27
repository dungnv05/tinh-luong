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

test('app.js wires all 12 controls via addEventListener inside bindEventHandlers', () => {
    const match = appJs.match(/function\s+bindEventHandlers\s*\(\)\s*\{([\s\S]*?)\r?\n\}\r?\n/);
    assert.ok(match, 'bindEventHandlers() function should exist in app.js');

    const body = match[1];
    assert.ok(body.includes('addEventListener'), 'bindEventHandlers() should use addEventListener');

    const expectedHandlers = [
        'switchMode',
        'calculate',
        'handlePeriodChange',
        'handleRegionChange',
        'adjustDependents',
        'toggleCustomInsuranceInput',
        'toggleAdvancedSettings',
        'exportPDF',
        'clearHistory',
    ];

    for (const fnName of expectedHandlers) {
        assert.ok(
            body.includes(fnName),
            `Expected ${fnName} to be referenced inside bindEventHandlers() addEventListener wiring`
        );
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
