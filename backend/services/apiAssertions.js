const https = require('https');
const http  = require('http');
const dns   = require('dns');

// ── Minimal JSONPath subset — supports $.a.b, $.a[0].b, $.a[0] ──────────────
function evalJsonPath(obj, path) {
    if (!path || typeof path !== 'string' || !path.startsWith('$')) return undefined;
    const tokens = path.slice(1).match(/\.[a-zA-Z0-9_]+|\[\d+\]/g) || [];
    let cur = obj;
    for (const tok of tokens) {
        if (cur == null) return undefined;
        if (tok[0] === '.') cur = cur[tok.slice(1)];
        else cur = cur[parseInt(tok.slice(1, -1), 10)];
    }
    return cur;
}

function evalAssertion(responseJson, assertion) {
    const { property, comparison, target } = assertion;
    const actual = evalJsonPath(responseJson, property);
    switch (comparison) {
        case 'equals':       return String(actual) === String(target);
        case 'not_equals':   return String(actual) !== String(target);
        case 'contains':     return actual != null && String(actual).includes(target);
        case 'greater_than': return Number(actual) > Number(target);
        case 'less_than':    return Number(actual) < Number(target);
        case 'exists':       return actual !== undefined;
        case 'not_exists':   return actual === undefined;
        default:             return false;
    }
}

function statusInRanges(code, ranges) {
    if (!code) return false;
    if (!ranges || !ranges.length) return code >= 200 && code < 400;
    return ranges.some(r => {
        if (/^\d{3}$/.test(r)) return Number(r) === code;
        const m = String(r).match(/^(\d)xx$/i);
        if (m) { const base = Number(m[1]) * 100; return code >= base && code < base + 100; }
        return false;
    });
}

function resolveDnsFamily(host, family) {
    return new Promise((resolve) => {
        dns.lookup(host, { family }, (err, address) => resolve(err ? null : address));
    });
}

const net = require('net');
async function resolveByIpVersion(host, ipVersion) {
    if (net.isIP(host)) return { address: host, family: net.isIPv4(host) ? 4 : 6 };
    const order = ipVersion === 'ipv6_only'     ? [6]
                : ipVersion === 'ipv4_only'     ? [4]
                : ipVersion === 'ipv6_priority' ? [6, 4]
                : [4, 6]; // ipv4_priority (default)
    for (const fam of order) {
        const addr = await resolveDnsFamily(host, fam);
        if (addr) return { address: addr, family: fam };
    }
    return null;
}

// ── HTTP request — captures status + body for assertion checking ────────────
function httpRequest(target) {
    const { url, httpMethod, requestHeaders, requestBody, timeout, followRedirects, ipVersion } = target;
    return new Promise(async (resolve) => {
        const start = Date.now();
        const method = (httpMethod || 'GET').toUpperCase();
        const headers = {};
        (requestHeaders || []).forEach(h => { if (h && h.key) headers[h.key] = h.value; });
        if (requestBody && !Object.keys(headers).some(k => k.toLowerCase() === 'content-type')) {
            headers['Content-Type'] = 'application/json';
        }

        let firstHostResolved = null;
        try {
            firstHostResolved = await resolveByIpVersion(new URL(url).hostname, ipVersion);
        } catch (_) { /* invalid URL — let request fail naturally below */ }

        const makeReq = (targetUrl, redirectCount = 0, useResolved = true) => {
            let u;
            try { u = new URL(targetUrl); } catch (e) {
                return resolve({ statusCode: 0, body: '', time: Date.now() - start, error: 'Invalid URL' });
            }
            const mod = u.protocol === 'https:' ? https : http;
            const reqHeaders = { ...headers, Host: u.hostname };
            const reqOpts = {
                method, timeout: (timeout || 30) * 1000, rejectUnauthorized: false, headers: reqHeaders,
                hostname: (useResolved && firstHostResolved) ? firstHostResolved.address : u.hostname,
                path: u.pathname + u.search,
                port: u.port || (u.protocol === 'https:' ? 443 : 80),
            };
            if (u.protocol === 'https:') reqOpts.servername = u.hostname; // preserve SNI when using resolved IP

            const req = mod.request(reqOpts, (res) => {
                if (followRedirects !== false && [301,302,303,307,308].includes(res.statusCode) && res.headers.location && redirectCount < 5) {
                    const location = res.headers.location;
                    const nextUrl = location.startsWith('http') ? location : new URL(location, targetUrl).href;
                    res.resume();
                    return makeReq(nextUrl, redirectCount + 1, false); // don't reuse first-hop IP for cross-host redirects
                }
                let body = '';
                res.on('data', chunk => { if (body.length < 1024 * 1024) body += chunk; });
                res.on('end', () => resolve({ statusCode: res.statusCode, body, time: Date.now() - start, error: null }));
            });
            req.on('error', (e) => resolve({ statusCode: 0, body: '', time: Date.now() - start, error: e.message }));
            req.on('timeout', () => { req.destroy(); resolve({ statusCode: 0, body: '', time: Date.now() - start, error: 'Timeout' }); });
            if (!['GET','HEAD'].includes(method) && requestBody) req.write(requestBody);
            req.end();
        };
        makeReq(url);
    });
}

// ── Full check: request + status + assertions ───────────────────────────────
async function checkApiTarget(target) {
    const result = await httpRequest(target);
    if (result.error || !result.statusCode) {
        return { alive: false, ms: result.time, statusCode: 0, error: result.error, assertionResults: [] };
    }
    const statusOk = statusInRanges(result.statusCode, target.upStatusCodes);
    let assertionResults = [];
    let assertionsOk = true;
    if (target.assertions && target.assertions.length) {
        let json = null;
        try { json = JSON.parse(result.body); } catch (_) { json = null; }
        assertionResults = target.assertions.map(a => ({ ...a, pass: json !== null && evalAssertion(json, a) }));
        assertionsOk = target.assertionLogic === 'OR'
            ? assertionResults.some(a => a.pass)
            : assertionResults.every(a => a.pass);
    }
    return { alive: statusOk && assertionsOk, ms: result.time, statusCode: result.statusCode, assertionResults };
}

module.exports = { evalJsonPath, evalAssertion, statusInRanges, httpRequest, checkApiTarget };
