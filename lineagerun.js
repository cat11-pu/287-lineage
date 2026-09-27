// lineagerun.js：按扩展预算扩散，预算用尽压账，收尾不限预算补齐
import { dependentsOf } from "./lineage.js";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function cloneState(state) {
  const src = (state && state.deps) || {};
  const deps = {};
  for (const name of Object.keys(src)) deps[name] = src[name].slice();
  return {
    deps: deps,
    affected: ((state && state.affected) || []).slice(),
    changed: ((state && state.changed) || []).slice(),
    queue: ((state && state.queue) || []).slice(),
    applied: ((state && state.applied) || []).slice()
  };
}

function checkEvent(spec, event) {
  const eventCode = spec.event_error_code || "E_BAD_EVENT";
  const nodeCode = spec.node_error_code || "E_UNKNOWN_NODE";
  const selfCode = spec.self_error_code || "E_SELF_DEP";
  if (!event || typeof event !== "object") fail(eventCode, "事件不是对象");
  if (event.kind === "depend") {
    if (typeof event.node !== "string" || typeof event.on !== "string") {
      fail(eventCode, "depend 事件缺 node/on 字段");
    }
  } else if (event.kind === "change") {
    if (typeof event.node !== "string") fail(eventCode, "change 事件缺 node 字段");
  } else {
    fail(eventCode, "未知事件类型 " + String(event.kind));
  }
  if (Array.isArray(spec.nodes)) {
    if (spec.nodes.indexOf(event.node) === -1) fail(nodeCode, "未知节点 " + event.node);
    if (event.kind === "depend" && spec.nodes.indexOf(event.on) === -1) {
      fail(nodeCode, "未知节点 " + event.on);
    }
  }
  if (event.kind === "depend" && event.node === event.on) fail(selfCode, "自依赖 " + event.node);
}

function enqueue(state, node) {
  if (state.applied.indexOf(node) !== -1) return;
  if (state.queue.indexOf(node) !== -1) return;
  state.queue.push(node);
}

function drain(state, budget) {
  let expanded = 0;
  while (state.queue.length > 0 && expanded < budget) {
    const node = state.queue.shift();
    if (state.applied.indexOf(node) !== -1) continue;
    state.applied.push(node);
    if (state.affected.indexOf(node) === -1) state.affected.push(node);
    expanded += 1;
    const dependents = dependentsOf(state.deps, node);
    for (const next of dependents) enqueue(state, next);
  }
  return expanded;
}

export function step(spec) {
  const eventCode = (spec && spec.event_error_code) || "E_BAD_EVENT";
  if (!spec || typeof spec !== "object") fail(eventCode, "入参不是对象");
  const events = spec.events || [];
  if (!Array.isArray(events)) fail(eventCode, "事件表不是数组");
  const state = cloneState(spec.state);
  const budget = typeof spec.budget === "number" && spec.budget > 0 ? spec.budget : 0;
  let expanded = 0;
  let judged = 0;
  for (const event of events) {
    checkEvent(spec, event);
    judged += 1;
    if (event.kind === "depend") {
      const ups = state.deps[event.node] || [];
      if (ups.indexOf(event.on) === -1) {
        ups.push(event.on);
        ups.sort();
        state.deps[event.node] = ups;
        if (state.affected.indexOf(event.on) !== -1) enqueue(state, event.node);
      }
    } else {
      if (state.changed.indexOf(event.node) === -1) state.changed.push(event.node);
      enqueue(state, event.node);
    }
    expanded += drain(state, budget - expanded);
  }
  return {
    state: state,
    expanded: expanded,
    queue_before: state.queue.length,
    queue: state.queue.slice(),
    judged: judged,
    judged_bound: events.length
  };
}

export function close(spec) {
  const state = cloneState(spec && spec.state);
  const catchup = drain(state, Infinity);
  return { state: state, catchup: catchup };
}
