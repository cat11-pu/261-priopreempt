// readyq.js：按优先级降序、同优先级按任务名升序入队；取队首下标
export function push(ready, row) {
  const next = ready.slice();
  let pos = 0;
  while (pos < next.length
    && (next[pos][1] > row[1]
      || (next[pos][1] === row[1] && String(next[pos][0]) < String(row[0])))) {
    pos += 1;
  }
  next.splice(pos, 0, row);
  return next;
}

export function pick(ready) {
  return Array.isArray(ready) && ready.length > 0 ? 0 : -1;
}
