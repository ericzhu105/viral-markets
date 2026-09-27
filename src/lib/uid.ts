export function uid(): string {
  const rand = globalThis.crypto?.getRandomValues?.(new Uint32Array(2));
  const a = rand ? rand[0].toString(36) : Math.random().toString(36).slice(2);
  const b = rand ? rand[1].toString(36) : Math.random().toString(36).slice(2);
  return (Date.now().toString(36) + a + b).slice(0, 18);
}
