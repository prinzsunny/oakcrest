// Smoke test: opens every page in headless Chrome, signed in with a fake family account, and reports
// script errors, missing local files and pages that render nothing. Also checks the portfolio with sample data.
//
//   npm i --no-save puppeteer-core@19     (once)
//   node tools/smoke.cjs                  (all pages)   node tools/smoke.cjs math/soroban   (pages under a folder)
//
// Uses the Chrome installed on this machine (set CHROME=/path/to/chrome to override).
const http = require("http");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

const ROOT = path.resolve(__dirname, "..");
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const only = process.argv[2] || "";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".webmanifest": "application/manifest+json" };

function serve() {
  const server = http.createServer((req, res) => {
    let file = path.join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (!file.startsWith(ROOT)) return res.writeHead(403).end();
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!fs.existsSync(file)) return res.writeHead(404).end();
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, () => resolve(server)));
}

function pages(dir = ROOT, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith(".") || name === "node_modules") continue;
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) pages(full, out);
    else if (name === "index.html") out.push(path.relative(ROOT, dir));
  }
  return out.filter((p) => p.startsWith(only)).sort();
}

// Signed-in fake family account, so the sign-in screen lets pages show.
const FAKE = `window.__ocFakeBackend = { onUser: (fn) => setTimeout(() => fn({ uid: "test", name: "Test" }), 0), signIn() {}, signOut() {}, pull: async () => ({}), push: async () => {}, profile: async () => {} };
try { sessionStorage.setItem("oc-synced", "1"); } catch {}`;

const SAMPLE = {
  "oc-learners": ["Ada"],
  "oc-current": "Ada",
  "oc-profiles": { Ada: { birth: `${new Date().getFullYear() - 6}-01` } },
  "oc-soroban-adv": { Ada: { levels: { w0l0: { stars: 3, at: Date.now() - 9e8 }, w0l1: { stars: 2 }, w0l2: { stars: 3 }, w0l3: { stars: 1 }, w0l4: { stars: 3, at: Date.now() - 5e8 }, w5l2: { stars: 2, best: 41, at: Date.now() } }, skills: { "five+": { n: 9, err: 0.05 }, "ten-": { n: 4, err: 0.4, weak: true } }, warm: { last: 0, days: 2, best: 5 } } },
  "oc-log": [{ id: "a1", source: "app", learner: "Ada", date: new Date().toISOString().slice(0, 10), time: "09:00", minutes: 25, subject: "Math", activity: "Soroban", counts: {}, notes: {} }],
  "oc-skills": { Ada: { mt_anAe11HAEH: { s: "yes", src: "check", at: Date.now() } } },
  "oc-portfolio": { Ada: { n1: { at: 1, date: "2026-10-01", subject: "Math", text: "Explained <b>why</b> 9+6 = 15 using ten-friends." } } },
};

(async () => {
  const server = await serve();
  const base = `http://localhost:${server.address().port}/`;
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
  const problems = [];
  const list = pages();

  async function open(rel, seed) {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(`script error: ${e.message.split("\n")[0]}`));
    page.on("console", (m) => m.type() === "error" && !/favicon|ERR_INTERNET|net::ERR|fonts\.g|status of 404/i.test(m.text()) && errors.push(`console: ${m.text().slice(0, 160)}`));
    page.on("response", (r) => r.url().startsWith(base) && !r.url().endsWith("/favicon.ico") && r.status() >= 400 && errors.push(`missing: ${r.url().slice(base.length)}`));
    await page.evaluateOnNewDocument(FAKE);
    if (seed) await page.evaluateOnNewDocument((data) => { if (!sessionStorage.getItem("seeded")) { for (const [k, v] of Object.entries(data)) localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v)); sessionStorage.setItem("seeded", "1"); } }, seed);
    await page.setRequestInterception(true);
    page.on("request", (r) => (r.url().startsWith(base) || r.url().startsWith("data:") ? r.continue() : r.abort()));
    await page.goto(base + (rel ? rel + "/" : ""), { waitUntil: "load", timeout: 20000 }).catch((e) => errors.push(`load: ${e.message}`));
    await new Promise((r) => setTimeout(r, 600));
    const text = await page.evaluate(() => document.body?.innerText.trim().length || 0).catch(() => 0);
    if (text < 40) errors.push("page shows almost nothing");
    return { page, errors };
  }

  for (const rel of list) {
    const { page, errors } = await open(rel);
    if (errors.length) problems.push([rel || "(home)", [...new Set(errors)]]);
    await page.close();
  }

  if (!only || "portfolio".startsWith(only)) {
    const { page, errors } = await open("portfolio", SAMPLE);
    await page.waitForFunction(() => /Level 28 of/.test(document.body.innerText), { timeout: 8000 }).catch(() => errors.push("portfolio: Soroban top level not shown"));
    const body = await page.evaluate(() => document.body.innerText);
    if (!/Ada's learning portfolio/.test(body)) errors.push("portfolio: learner title missing");
    await page.waitForFunction(() => /Two-Step Equations/.test(document.querySelector("[data-ahead]").innerText), { timeout: 8000 }).catch(() => errors.push("portfolio: ahead-of-age skill not listed"));
    if (!/Bead Garden/.test(body)) errors.push("portfolio: completed world missing");
    if (!/Explained why 9\+6/.test(body.replace(/<\/?b>/g, ""))) errors.push("portfolio: note missing");
    if (await page.$(".pf-table b b")) errors.push("portfolio: note HTML was not escaped");
    if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT, fullPage: true });
    if (errors.length) problems.push(["portfolio (sample data)", errors]);
    await page.close();
  }

  await browser.close();
  server.close();
  for (const [rel, errs] of problems) console.log(`✗ ${rel}\n    ${errs.slice(0, 6).join("\n    ")}`);
  console.log(`${list.length} pages checked, ${problems.length} with problems.`);
  process.exit(problems.length ? 1 : 0);
})();
