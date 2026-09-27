// readyq.js：入队按优先级降序、同优先级按任务名升序；取队首下标
export function push(ready, row) {
  const priority = row[1];
  const name = row[0];
  let index = 0;
  while (index < ready.length) {
    const current = ready[index];
    if (current[1] > priority
        || (current[1] === priority
            && typeof current[0] === "string"
            && typeof name === "string"
            && current[0] < name)) {
      index += 1;
    } else {
      break;
    }
  }
  ready.splice(index, 0, row);
  return ready;
}

export function pick(ready) {
  return Array.isArray(ready) && ready.length > 0 ? 0 : -1;
}
