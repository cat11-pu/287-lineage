// app.js：渲染结果
import { dependentsOf, upstreamOf } from "./lineage.js";
import { step, close } from "./lineagerun.js";

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
  const full = step(Object.assign({}, spec, { events: events, budget: events.length + 2 }));
  const fullClosed = close(Object.assign({}, spec, { state: full.state }));
  const fingerprint = function (state) {
    return JSON.stringify({
      deps: state.deps, affected: state.affected.slice().sort(), changed: state.changed.slice().sort(),
      queue: state.queue, applied: state.applied.length
    });
  };
  return { affected: closed.state.affected.slice().sort(), changed: closed.state.changed.slice().sort(),
           expanded_first: first.expanded, expanded_wide: wide.expanded,
           pair_differs: first.expanded !== wide.expanded,
           queue_before: first.queue_before, queue: first.queue,
           catchup: closed.catchup, queue_after: closed.state.queue.length,
           mid_differs: fingerprint(r2.state) !== fingerprint(first.state),
           closed_equal: fingerprint(closedTwo.state) === fingerprint(closed.state),
           replay_new: replay.expanded, judged: first.judged, judged_bound: first.judged_bound,
           full_diff: fingerprint(closed.state) === fingerprint(fullClosed.state) ? 0 : 1,
           count: events.length,
           tail: dependentsOf({}, "a").length + upstreamOf({}, "a").length };
}
