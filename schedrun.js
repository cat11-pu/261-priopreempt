// schedrun.js：按时间片预算调度并留账；收尾不限预算把账跑完
import { push, pick } from "./readyq.js";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function cloneState(state) {
  const used = {};
  Object.keys(state.used || {}).forEach(function (task) { used[task] = state.used[task]; });
  return {
    ready: (state.ready || []).map(function (row) { return row.slice(); }),
    done: (state.done || []).slice(),
    used: used,
    pending: (state.pending || []).map(function (row) { return row.slice(); }),
    applied: (state.applied || []).slice()
  };
}

function runSlice(state, quantum) {
  const head = pick(state.ready);
  if (head < 0) return false;
  const row = state.ready[head];
  const ran = Math.min(row[2], quantum);
  row[2] -= ran;
  state.used[row[0]] = (state.used[row[0]] || 0) + ran;
  if (row[2] === 0) {
    state.ready.splice(head, 1);
    state.done.push(row[0]);
  }
  return true;
}

export function step(spec) {
  const state = cloneState(spec.state || {});
  const dupCode = spec.duplicate_error_code || "E_DUPLICATE_TASK";
  const idleCode = spec.idle_error_code || "E_IDLE";
  const eventCode = spec.event_error_code || "E_BAD_EVENT";
  let budget = spec.budget;
  if (!Number.isFinite(budget)) budget = 0;
  budget = Math.max(0, Math.floor(budget));
  let slices = 0;
  let judged = 0;
  const events = Array.isArray(spec.events) ? spec.events : [];
  events.forEach(function (event) {
    if (!event || typeof event !== "object" || Array.isArray(event)
      || (event.kind !== "spawn" && event.kind !== "tick")) {
      fail(eventCode, "bad event");
    }
    if (event.id !== undefined && state.applied.indexOf(event.id) !== -1) return;
    if (event.kind === "spawn") {
      if (typeof event.task !== "string" || event.task.length === 0
        || !Number.isFinite(event.priority) || !Number.isFinite(event.work)
        || event.work < 0) {
        fail(eventCode, "bad event");
      }
      const known = state.ready.some(function (row) { return row[0] === event.task; })
        || state.done.indexOf(event.task) !== -1
        || Object.prototype.hasOwnProperty.call(state.used, event.task);
      if (known) fail(dupCode, "duplicate task " + event.task);
      state.ready = push(state.ready, [event.task, event.priority, event.work]);
      state.applied.push(event.id);
      judged += 1;
      return;
    }
    if (!Number.isFinite(event.quantum) || event.quantum <= 0) {
      fail(eventCode, "bad event");
    }
    if (pick(state.ready) < 0) fail(idleCode, "idle tick");
    if (budget <= 0) {
      state.pending.push([event.quantum]);
    } else {
      budget -= 1;
      slices += 1;
      runSlice(state, event.quantum);
    }
    state.applied.push(event.id);
    judged += 1;
  });
  return { state: state, slices: slices,
           pending_before: state.pending.length,
           pending_quanta: state.pending.map(function (row) { return row[0]; }),
           judged: judged, judged_bound: events.length };
}

export function close(spec) {
  const state = cloneState(spec.state || {});
  let catchup = 0;
  state.pending.forEach(function (row) {
    if (runSlice(state, row[0])) catchup += 1;
  });
  state.pending = [];
  return { state: state, catchup: catchup };
}
