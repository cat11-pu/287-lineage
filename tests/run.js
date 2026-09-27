import assert from "node:assert";
import { dependentsOf, upstreamOf } from "../lineage.js";
import { step, close } from "../lineagerun.js";
import { render } from "../app.js";

const base = {
  budget: 2, nodes: ["a", "b"],
  state: { deps: {}, affected: [], changed: [], queue: [], applied: [] },
  events: [],
  node_error_code: "E_UNKNOWN_NODE", self_error_code: "E_SELF_DEP",
  event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("dependentsOf returns a list", () => {
  assert.ok(Array.isArray(dependentsOf({}, "a")));
});

check("upstreamOf returns a list", () => {
  assert.ok(Array.isArray(upstreamOf({}, "a")));
});

check("step returns a state", () => {
  assert.strictEqual(typeof step(base).state, "object");
});

check("close returns a state", () => {
  assert.strictEqual(typeof close(base).state, "object");
});

check("render counts events", () => {
  assert.strictEqual(typeof render(base).count, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
