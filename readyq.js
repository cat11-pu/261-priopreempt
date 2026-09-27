// readyq.js：入队与取队首（基线：一律不排队、取不到）
export function push(ready, row) {
  return ready;
}

export function pick(ready) {
  return -1;
}
