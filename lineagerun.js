// lineagerun.js：按扩展预算扩展并留账（基线：一律给空表）
import { dependentsOf, upstreamOf } from "./lineage.js";

export function step(spec) {
  return { state: spec.state, expanded: 0, queue_before: 0, queue: [], judged: 0, judged_bound: 0 };
}

export function close(spec) {
  return { state: spec.state, catchup: 0 };
}
