// lineage.js：正向（谁依赖我）与反向（我依赖谁）依赖查询，结果一律升序
export function dependentsOf(deps, node) {
  const found = [];
  if (!deps) return found;
  for (const key of Object.keys(deps)) {
    const ups = deps[key];
    if (Array.isArray(ups) && ups.indexOf(node) !== -1) found.push(key);
  }
  return found.sort();
}

export function upstreamOf(deps, node) {
  const ups = deps ? deps[node] : null;
  return Array.isArray(ups) ? ups.slice().sort() : [];
}
