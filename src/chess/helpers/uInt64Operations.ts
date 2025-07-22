const MASK_64 = 0xFFFFFFFFFFFFFFFFn

export function u64_not(value: bigint): bigint {
  return BigInt((~value)) & MASK_64
}

export function u64(v: bigint | number): bigint {
  return BigInt(v) & MASK_64;
}

export function u64_add(a: bigint, b: bigint): bigint {
  return (a + b) & MASK_64;
}

export function u64_sub(a: bigint, b: bigint): bigint {
  return (a - b) & MASK_64;
}

export function u64_mul(a: bigint, b: bigint): bigint {
  return (a * b) & MASK_64;
}

export function u64_shl(a: bigint, bits: number | bigint): bigint {
  return (a << BigInt(bits)) & MASK_64;
}

export function u64_shr(a: bigint, bits: number | bigint): bigint {
  return a >> BigInt(bits); // right shift is safe; no need to mask
}

export function u64_or(...args: (bigint)[]): bigint {
  return args.reduce((acc, x) => acc | u64(x), 0n) & MASK_64;
}

export function u64_and(...args: (bigint)[]): bigint {
  if (args.length === 0) return MASK_64;
  return args.map(u64).reduce((acc, x) => acc & x, MASK_64) & MASK_64;
}
