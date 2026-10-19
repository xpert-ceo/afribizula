// Local test stack for the browser smoke test: in-memory MongoDB, mock Paystack, real API.
// Never point this at a real database. Usage: see e2e/README.md
import http from "node:http";
import fs from "node:fs";
import { startStack } from "../server/test/helpers.js";
const s = await startStack();
// control server so the browser test can simulate the customer paying on Paystack
http.createServer((req, res) => {
  const m = req.url.match(/^\/pay\/(.+)$/);
  if (m) { try { s.paystack.pay(decodeURIComponent(m[1])); res.end("ok"); } catch (e) { res.statusCode = 404; res.end(String(e)); } return; }
  if (req.url === "/refs") { res.end(JSON.stringify([...s.paystack.txs.keys()])); return; }
  res.statusCode = 404; res.end();
}).listen(5056, "127.0.0.1");
fs.mkdirSync(new URL("./.tmp/", import.meta.url), { recursive: true });
fs.writeFileSync(new URL("./.tmp/stack.json", import.meta.url), JSON.stringify({ base: s.base, mongo: s.config.mongoUri }));
console.log("STACK", s.base, s.config.mongoUri);
setInterval(() => {}, 1 << 30);
