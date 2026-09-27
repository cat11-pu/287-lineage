// lineagerun.js：按整批共用的扩展预算扩散影响面，预算用尽留账给下一轮
import { dependentsOf } from "./lineage.js";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function cloneState(state) {
  const source = state || {};
  const deps = Object.create(null);
  for (const key of Object.keys(source.deps || {})) {
    deps[key] = Array.from(new Set(source.deps[key] || [])).sort();
  }
  return {
    deps,
    affected: (source.affected || []).slice(),
    changed: (source.changed || []).slice(),
    queue: (source.queue || []).slice(),
    applied: (source.applied || []).slice()
  };
}

function enqueue(st, node) {
  if (st.applied.indexOf(node) !== -1) return;
  if (st.queue.indexOf(node) !== -1) return;
  st.queue.push(node);
}

function expandOne(st) {
  const node = st.queue.shift();
  if (st.applied.indexOf(node) !== -1) return false;
  st.applied.push(node);
  if (st.affected.indexOf(node) === -1) st.affected.push(node);
  for (const dependent of dependentsOf(st.deps, node)) enqueue(st, dependent);
  return true;
}

function drain(st, budget, used) {
  while (used < budget && st.queue.length) {
    if (expandOne(st)) used += 1;
  }
  return used;
}

function validateEvent(event, nodes, codes) {
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    fail(codes.event, "事件必须是对象");
  }
  if (event.kind !== "depend" && event.kind !== "change") {
    fail(codes.event, "不支持的事件类型 " + String(event.kind));
  }
  if (event.kind === "depend") {
    if (typeof event.node !== "string" || typeof event.on !== "string") {
      fail(codes.event, "depend 事件必须带 node 与 on");
    }
  } else if (typeof event.node !== "string") {
    fail(codes.event, "change 事件必须带 node");
  }
  const refs = event.kind === "depend" ? [event.node, event.on] : [event.node];
  for (const ref of refs) {
    if (nodes.indexOf(ref) === -1) fail(codes.node, "未知节点 " + ref);
  }
  if (event.kind === "depend" && event.node === event.on) {
    fail(codes.self, "节点不能依赖自己 " + event.node);
  }
}

function codesOf(spec) {
  return {
    node: spec.node_error_code || "E_UNKNOWN_NODE",
    self: spec.self_error_code || "E_SELF_DEP",
    event: spec.event_error_code || "E_BAD_EVENT"
  };
}

export function step(spec) {
  const st = cloneState(spec.state);
  const nodes = Array.isArray(spec.nodes) ? spec.nodes.slice() : [];
  const events = Array.isArray(spec.events) ? spec.events.slice() : [];
  const codes = codesOf(spec);
  const budget = Number.isFinite(spec.budget) ? Math.max(0, spec.budget) : 0;
  let expanded = drain(st, budget, 0);
  events.forEach(function (event) {
    validateEvent(event, nodes, codes);
    if (event.kind === "change") {
      if (st.changed.indexOf(event.node) === -1) st.changed.push(event.node);
      enqueue(st, event.node);
    } else {
      const ups = st.deps[event.node] || (st.deps[event.node] = []);
      const isNew = ups.indexOf(event.on) === -1;
      if (isNew) {
        ups.push(event.on);
        ups.sort();
        if (st.affected.indexOf(event.on) !== -1) enqueue(st, event.node);
      }
    }
    expanded = drain(st, budget, expanded);
  });
  return {
    state: st,
    expanded,
    queue_before: st.queue.length,
    queue: st.queue.slice(),
    judged: events.length,
    judged_bound: events.length
  };
}

export function close(spec) {
  const st = cloneState(spec.state);
  let catchup = 0;
  while (st.queue.length) {
    if (expandOne(st)) catchup += 1;
  }
  return { state: st, catchup };
}
