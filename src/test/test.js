function encodeBigUint64(n) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(n); // Write as 64-bit unsigned (Big Endian)
  return buf.toString("base64");
}

function decodeBigUint64(b64) {
  const buf = Buffer.from(b64, "base64");
  return buf.readBigUInt64BE(); // Read as 64-bit unsigned (Big Endian)
}


function encodeBigUint64Array(arr) {
  return Buffer.from(arr.buffer).toString("base64");
}

function decodeBigUint64Array(b64) {
  const buf = Buffer.from(b64, "base64");
  return new BigUint64Array(buf.buffer, buf.byteOffset, buf.byteLength / 8);
}

const piecesPositions = new BigUint64Array(12)

piecesPositions[0] = 0x20df00n
piecesPositions[1] = 0xff000000000000n
piecesPositions[2] = 0x42n
piecesPositions[3] = 0x4200000000000000n
piecesPositions[4] = 0x24n
piecesPositions[5] = 0x2400000000000000n
piecesPositions[6] = 0x81n
piecesPositions[7] = 0x8100000000000000n
piecesPositions[8] = 0x10n
piecesPositions[9] = 0x1000000000000000n
piecesPositions[10] = 0x8n
piecesPositions[11] = 0x800000000000000n


const encoded = encodeBigUint64Array(piecesPositions)
let json = JSON.stringify({positions: encoded})
console.log(encoded)
let parsed = JSON.parse(json)
const decoded = decodeBigUint64Array(parsed.positions)

for(const val of decoded) {
  console.log(val.toString(16))
}