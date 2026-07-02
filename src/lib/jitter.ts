/** deterministic pseudo-random 0..1 per index — one source of "hand-made" wobble
 *  shared by every section so the whole page jitters with the same character */
export function jitter(i: number) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
