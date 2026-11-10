"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const code = fs.readFileSync("launchevent.js", "utf8");

async function run(subject, readError, writeError) {
  let handler;
  let completed = 0;
  let writes = [];
  const logs = [];
  const office = {
    AsyncResultStatus: { Succeeded: "succeeded", Failed: "failed" },
    actions: { associate(name, fn) {
      assert.equal(typeof fn, "function");
      if (name === "onMessageComposeHandler") handler = fn;
    }},
    context: { mailbox: { item: { subject: {
      getAsync(cb) {
        queueMicrotask(() => cb(readError
          ? { status: "failed", error: { message: readError } }
          : { status: "succeeded", value: subject }));
      },
      setAsync(value, cb) {
        writes.push(value);
        queueMicrotask(() => cb(writeError
          ? { status: "failed", error: { message: writeError } }
          : { status: "succeeded" }));
      }
    }}}}
  };
  const context = vm.createContext({
    Office: office,
    console: { log(...args) { logs.push(args.join(" ")); } },
    setTimeout, clearTimeout, queueMicrotask
  });
  vm.runInContext(code, context, { filename: "launchevent.js" });
  assert.ok(handler, "Compose event handler not registered");
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("event.completed not called")), 2000);
    handler({ completed() { completed++; clearTimeout(timer); resolve(); } });
  });
  assert.equal(completed, 1, "event.completed must be called exactly once");
  return { writes, logs };
}

(async () => {
  let r = await run("Re: AMTEST: Offerte Monaco");
  assert.deepEqual(r.writes, ["Re: [AM260158] AMTEST: Offerte Monaco"]);
  assert.ok(r.logs.some(x => x.includes("WRITE_OK")));

  r = await run("Normale offerte");
  assert.deepEqual(r.writes, []);

  r = await run("AMTEST: [AM260158] Offerte");
  assert.deepEqual(r.writes, []);

  r = await run("AW: WG: AMTEST: Project");
  assert.deepEqual(r.writes, ["AW: WG: [AM260158] AMTEST: Project"]);

  r = await run("AMTEST: Test", "Read error");
  assert.deepEqual(r.writes, []);
  assert.ok(r.logs.some(x => x.includes("READ_FAILED")));

  r = await run("AMTEST: Test", null, "Write error");
  assert.equal(r.writes.length, 1);
  assert.ok(r.logs.some(x => x.includes("WRITE_FAILED")));

  console.log("PASS: 6 mocked Outlook compose scenarios");
})().catch(error => { console.error(error); process.exitCode = 1; });
