// app.js：渲染结果
import { push, pick } from "./readyq.js";
import { step, close } from "./schedrun.js";

export function render(spec) {
  const events = spec.events || [];
  const half = Math.ceil(events.length / 2);
  const first = step(spec);
  const closed = close(Object.assign({}, spec, { state: first.state }));
  const r1 = step(Object.assign({}, spec, { events: events.slice(0, half) }));
  const r2 = step(Object.assign({}, spec, { state: r1.state, events: events.slice(half) }));
  const closedTwo = close(Object.assign({}, spec, { state: r2.state }));
  const replay = step(Object.assign({}, spec, { state: closed.state }));
  const wide = step(Object.assign({}, spec, { budget: spec.budget + 2 }));
  const full = step(Object.assign({}, spec, { budget: events.length + 2 }));
  const fullClosed = close(Object.assign({}, spec, { state: full.state }));
  const usedRows = function (state) {
    return Object.keys(state.used).sort().map(function (task) { return [task, state.used[task]]; });
  };
  const fingerprint = function (state) {
    return JSON.stringify({
      used: usedRows(state), done: state.done.slice().sort(),
      ready: state.ready.map(function (row) { return row.join(":"); }),
      pending: state.pending.map(function (row) { return row.join(":"); }),
      applied: state.applied.length
    });
  };
  return { used: usedRows(closed.state), done: closed.state.done.slice(),
           slices_first: first.slices, slices_wide: wide.slices,
           pair_differs: first.slices !== wide.slices,
           pending_before: first.pending_before, pending_quanta: first.pending_quanta,
           catchup: closed.catchup, pending_after: closed.state.pending.length,
           mid_differs: fingerprint(r2.state) !== fingerprint(first.state),
           closed_equal: fingerprint(closedTwo.state) === fingerprint(closed.state),
           replay_new: replay.slices, judged: first.judged, judged_bound: first.judged_bound,
           full_diff: fingerprint(closed.state) === fingerprint(fullClosed.state) ? 0 : 1,
           count: events.length, tail: pick([]) + push([], []).length };
}
