// schedrun.js：按时间片预算调度；预算用尽的时间片带长度压账，收尾不限预算跑完
import { push, pick } from "./readyq.js";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function codeOf(spec, key, fallback) {
  const value = spec ? spec[key] : null;
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function cloneState(state) {
  const source = state || {};
  const used = {};
  Object.keys(source.used || {}).forEach(function (task) {
    used[task] = source.used[task];
  });
  return {
    ready: (source.ready || []).map(function (row) { return row.slice(); }),
    done: (source.done || []).slice(),
    used: used,
    pending: (source.pending || []).map(function (row) { return row.slice(); }),
    applied: (source.applied || []).slice()
  };
}

function isPositiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function validateEvent(event, codes) {
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    throw fail(codes.event, "事件不合法");
  }
  if (event.kind === "spawn") {
    if (typeof event.task !== "string" || event.task.length === 0
        || typeof event.priority !== "number" || !Number.isFinite(event.priority)
        || !isPositiveNumber(event.work)) {
      throw fail(codes.event, "spawn 事件不合法");
    }
  } else if (event.kind === "tick") {
    if (!isPositiveNumber(event.quantum)) {
      throw fail(codes.event, "tick 事件不合法");
    }
  } else {
    throw fail(codes.event, "事件不合法");
  }
}

function knownTask(state, task) {
  if (state.ready.some(function (row) { return row[0] === task; })) return true;
  if (state.done.indexOf(task) !== -1) return true;
  if (Object.prototype.hasOwnProperty.call(state.used, task)) return true;
  if (state.pending.some(function (row) { return row[1] === task; })) return true;
  return false;
}

export function step(spec) {
  spec = spec || {};
  const codes = {
    duplicate: codeOf(spec, "duplicate_error_code", "E_DUPLICATE_TASK"),
    idle: codeOf(spec, "idle_error_code", "E_IDLE"),
    event: codeOf(spec, "event_error_code", "E_BAD_EVENT")
  };
  const state = cloneState(spec.state);
  const events = spec.events || [];
  let budget = Number.isFinite(spec.budget) ? spec.budget : 0;
  let slices = 0;
  let judged = 0;


  events.forEach(function (event, position) {
    const marker = event && (event.id != null ? event.id : "idx:" + position);
    if (state.applied.indexOf(marker) !== -1) return;
    validateEvent(event, codes);
    state.applied.push(marker);
    judged += 1;

    if (event.kind === "spawn") {
      if (knownTask(state, event.task)) {
        throw fail(codes.duplicate, "重复任务 " + event.task);
      }
      push(state.ready, [event.task, event.priority, event.work]);
      return;
    }

    // tick：没有预算就带长度压账（不算空转），留到收尾跑
    if (budget <= 0) {
      state.pending.push([event.quantum, null]);
      return;
    }

    const head = pick(state.ready);
    if (head < 0) {
      throw fail(codes.idle, "就绪队列为空，时间片空转");
    }
    budget -= 1;
    slices += 1;
    const row = state.ready[head];
    const run = Math.min(row[2], event.quantum);
    row[2] -= run;
    state.used[row[0]] = (state.used[row[0]] || 0) + run;
    if (row[2] <= 0) {
      state.ready.splice(head, 1);
      state.done.push(row[0]);
    }
  });

  return {
    state: state,
    slices: slices,
    pending_before: state.pending.length,
    pending_quanta: state.pending.map(function (row) { return row[0]; }),
    judged: judged,
    judged_bound: events.length
  };
}

export function close(spec) {
  spec = spec || {};
  const state = cloneState(spec.state);
  let catchup = 0;

  while (state.pending.length > 0) {
    const row = state.pending.shift();
    const quantum = row[0];
    const head = pick(state.ready);
    if (head < 0) continue;
    const task = state.ready[head];
    const run = Math.min(task[2], quantum);
    task[2] -= run;
    state.used[task[0]] = (state.used[task[0]] || 0) + run;
    catchup += 1;
    if (task[2] <= 0) {
      state.ready.splice(head, 1);
      state.done.push(task[0]);
    }
  }

  return { state: state, catchup: catchup };
}
