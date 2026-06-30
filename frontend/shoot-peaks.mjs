import { spawn } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import WebSocket from "ws";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const DBG = 9391;
const URL = process.argv[2];
const OUTDIR = process.argv[3];
const shots = [
  { f: 0.0, name: "cover" },
  { f: 0.09, name: "about-fill" },
  { f: 0.185, name: "about-read" },
];

const chrome = spawn(CHROME, [
  "--headless=new",
  "--use-gl=angle",
  "--use-angle=swiftshader",
  "--enable-webgl",
  "--ignore-gpu-blocklist",
  "--hide-scrollbars",
  "--no-sandbox",
  "--window-size=1440,900",
  "--force-device-scale-factor=1.5",
  `--remote-debugging-port=${DBG}`,
  "about:blank",
]);

const getJSON = (path) =>
  new Promise((res) => {
    http.get(`http://localhost:${DBG}${path}`, (r) => {
      let d = "";
      r.on("data", (c) => (d += c));
      r.on("end", () => res(JSON.parse(d)));
    });
  });

await new Promise((r) => setTimeout(r, 2800));
const tabs = await getJSON("/json");
const tab = tabs.find((t) => t.type === "page");
const sock = new WebSocket(tab.webSocketDebuggerUrl, { perMessageDeflate: false });
let id = 0;
const pending = {};
const send = (method, params = {}) =>
  new Promise((res) => {
    const i = ++id;
    pending[i] = res;
    sock.send(JSON.stringify({ id: i, method, params }));
  });
sock.on("message", (raw) => {
  const m = JSON.parse(raw);
  if (m.id && pending[m.id]) pending[m.id](m.result);
});
await new Promise((r) => sock.on("open", r));

await send("Page.enable");
await send("Runtime.enable");
await send("Page.navigate", { url: URL });
await new Promise((r) => setTimeout(r, 4500));

for (const s of shots) {
  await send("Runtime.evaluate", {
    expression: `(() => { const max = document.documentElement.scrollHeight - window.innerHeight; window.scrollTo(0, max * ${s.f}); })()`,
  });
  await new Promise((r) => setTimeout(r, 2400));
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(`${OUTDIR}/${s.name}.png`, Buffer.from(data, "base64"));
  console.log(`captured ${s.name}.png (frac ${s.f})`);
}

chrome.kill();
process.exit(0);
