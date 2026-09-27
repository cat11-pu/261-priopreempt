// schedrun.js：按时间片预算调度并留账（基线：一律给空表）
import { push, pick } from "./readyq.js";

export function step(spec) {
  return { state: spec.state, slices: 0, pending_before: 0, pending_quanta: [],
           judged: 0, judged_bound: 0 };
}

export function close(spec) {
  return { state: spec.state, catchup: 0 };
}
