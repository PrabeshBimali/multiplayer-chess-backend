export function encodeBigUint64(n: bigint): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(n); // Write as 64-bit unsigned (Big Endian)
  return buf.toString("base64");
}

export function decodeBigUint64(b64: string): bigint {
  const buf = Buffer.from(b64, "base64");
  return buf.readBigUInt64BE(); // Read as 64-bit unsigned (Big Endian)
}


export function encodeBigUint64Array(arr: BigUint64Array): string {
  return Buffer.from(arr.buffer).toString("base64");
}

export function decodeBigUint64Array(b64: string): BigUint64Array {
  const buf = Buffer.from(b64, "base64");
  return new BigUint64Array(buf.buffer, buf.byteOffset, buf.byteLength / 8);
}
