import assert from "node:assert";
import { push, pick } from "../readyq.js";
import { step, close } from "../schedrun.js";
import { render } from "../app.js";

const base = {
  budget: 2,
  state: { ready: [], done: [], used: {}, pending: [], applied: [] },
  events: [],
  duplicate_error_code: "E_DUPLICATE_TASK", idle_error_code: "E_IDLE",
  event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("push returns a list", () => {
  assert.ok(Array.isArray(push([], ["T1", 1, 1])));
});

check("pick returns a number", () => {
  assert.strictEqual(typeof pick([]), "number");
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
