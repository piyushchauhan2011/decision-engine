import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { access, mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "@playwright/test";

const require = createRequire(import.meta.url);
const lighthouseCli = join(dirname(require.resolve("lighthouse/package.json")), "cli/index.js");
const chromePath = chromium.executablePath();

async function freePort() {
  const socket = createServer();
  await new Promise((resolve, reject) => {
    socket.once("error", reject);
    socket.listen(0, "127.0.0.1", resolve);
  });
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  return port;
}

async function ready(url, server, getLog) {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null || server.signalCode !== null) {
      throw new Error(`Production server exited before becoming ready.\n${getLog()}`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
      throw new Error(
        `Production route returned HTTP ${response.status}. Run pnpm db:setup.\n${getLog()}`,
      );
    } catch (error) {
      if (error.cause?.code !== "ECONNREFUSED") throw error;
    }
    await delay(250);
  }
  throw new Error(`Production server did not start within 30 seconds.\n${getLog()}`);
}

async function audit(url, name, reportDir) {
  const output = join(reportDir, name);
  const args = [
    lighthouseCli,
    url,
    "--preset=desktop",
    "--only-categories=performance",
    "--chrome-flags=--headless=new --no-sandbox",
    "--output=json",
    "--output=html",
    `--output-path=${output}`,
    "--quiet",
  ];
  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      env: { ...process.env, CHROME_PATH: chromePath },
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code) => resolve(code));
  });
  if (exitCode !== 0) throw new Error(`Lighthouse failed for ${url} (exit ${exitCode})`);

  const report = JSON.parse(await readFile(`${output}.report.json`, "utf8"));
  const metric = (id) => report.audits[id]?.displayValue ?? "n/a";
  console.log(
    `${name}: ${Math.round(report.categories.performance.score * 100)}/100 | FCP ${metric("first-contentful-paint")} | LCP ${metric("largest-contentful-paint")} | TBT ${metric("total-blocking-time")} | CLS ${metric("cumulative-layout-shift")}`,
  );
  console.log(`  ${output}.report.html`);
}

function startServer(port) {
  const server = spawn(process.execPath, [".output/server/index.mjs"], {
    env: { ...process.env, PORT: String(port), HOST: "127.0.0.1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  const capture = (chunk) => {
    log = (log + chunk.toString()).slice(-4000);
  };
  server.stdout.on("data", capture);
  server.stderr.on("data", capture);
  return {
    server,
    exited: new Promise((resolve) => server.once("exit", resolve)),
    getLog: () => log,
  };
}

async function main() {
  try {
    await access(chromePath);
  } catch {
    throw new Error("Playwright Chromium is missing. Run pnpm exec playwright install chromium.");
  }

  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  // Hold the rendered variant constant across runs, independent of the visitor cookie.
  const overrides = new URLSearchParams({
    "exp.arrival-flow": "control",
    "exp.destination-density": "control",
    "exp.planning-guide-detail": "control",
    country: "US",
    offers: "off",
    guide: "off",
  });
  const reportDir = join(
    "test-results",
    "lighthouse",
    new Date().toISOString().replaceAll(":", "-"),
  );
  await mkdir(reportDir, { recursive: true });

  const { server, exited, getLog } = startServer(port);

  try {
    await ready(`${base}/`, server, getLog);
    console.log(`Auditing production pages at ${base} (desktop preset)`);
    await audit(`${base}/?${overrides}`, "home", reportDir);
    await audit(`${base}/destinations?${overrides}`, "destinations", reportDir);
    console.log(`Reports: ${reportDir}`);
  } finally {
    if (server.exitCode === null && server.signalCode === null) server.kill("SIGTERM");
    await Promise.race([exited, delay(5000)]);
    if (server.exitCode === null && server.signalCode === null) server.kill("SIGKILL");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
