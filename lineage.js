// lineage.js：正向与反向依赖
export function dependentsOf(deps, node) {
  const graph = deps || {};
  const out = [];
  for (const name of Object.keys(graph)) {
    const ups = graph[name] || [];
    if (ups.indexOf(node) !== -1) out.push(name);
  }
  return out.sort();
}

export function upstreamOf(deps, node) {
  const graph = deps || {};
  const ups = graph[node] || [];
  return ups.slice().sort();
}
