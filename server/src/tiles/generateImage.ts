import { PNG } from "pngjs";
import { inflate } from "zlib";
import { parseCompound } from "./nbt";
import { ChunkNBT, Section } from "./ChunkNBTFormat";
import { getColor, multipliers } from "./colors";
import { createWriteStream } from "fs";
import { FileHandle, open, writeFile } from "fs/promises";

const sectorSize = 4096;

let blankPNG = new PNG({
  width: 512,
  height: 512,
})

for (let i = 0; i < 512 * 512 * 4; i++) {
  blankPNG.data[i] = 0;
}

let blankPNGBuffer = PNG.sync.write(blankPNG);

// leaflet.js for rendering

export async function handleFile(filename: string, out: string, heightOut: string) {
  console.log("Proccessing", filename);
  const file = await open(filename, 'r');
  const generated = await getChunksInfo(file);

  const png = new PNG({
    width: 512,
    height: 512,
  });

  const heightMap = new PNG({
    width: 512,
    height: 512,
  });

  // try {
  let results = await Promise.all(generated.map(chunk => handleChunk(file, chunk, png, heightMap)));
  // } catch (e) {
  // console.error(e);
  //ignore
  // }

  if (results.some(v => v)) {
    // Add depth
    for (let x = 0; x < 512; x++) {
      for (let z = 0; z < 512; z++) {
        let idx = (png.width * (z) + x) << 2;
        let idxp = (png.width * (z + 1) + x) << 2;
        let height = (heightMap.data[idx + 3] << 1) + heightMap.data[idx + 1];
        let heightp = z === 512 ? height : (heightMap.data[idxp + 3] << 1) + heightMap.data[idxp + 1];

        if (height < heightp) {
          // Bright
          png.data[idx] *= multipliers[2];
          png.data[idx + 1] *= multipliers[2];
          png.data[idx + 2] *= multipliers[2];
        } else if (height > heightp) {
          // Dark
          png.data[idx] *= multipliers[0];
          png.data[idx + 1] *= multipliers[0];
          png.data[idx + 2] *= multipliers[0];
        } else {
          // Normal
          png.data[idx] *= multipliers[1];
          png.data[idx + 1] *= multipliers[1];
          png.data[idx + 2] *= multipliers[1];
        }
      }
    }

    console.log("Writing " + out);

    await Promise.all([
      new Promise<void>(resolve => png.pack().pipe(createWriteStream(out)).on('finish', () => resolve())),
      new Promise<void>(resolve => heightMap.pack().pipe(createWriteStream(heightOut)).on('finish', () => resolve()))
    ]);

    console.log("Done! Rendered " + out);
  } else {
    await writeFile(out, blankPNGBuffer);
    await writeFile(heightOut, blankPNGBuffer);
    console.log("Done! No generated chunks found for " + filename);
  }

  await file.close();
}


async function handleChunk(file: FileHandle, chunkInfo: ChunkInfo, png: PNG, heightMap: PNG) {
  const chunk = await getChunk(file, chunkInfo);

  // console.log("Parsing", chunkInfo);
  const data = parseCompound(chunk.data).value as ChunkNBT;

  if (!data.Status.value.includes('full')) {
    return false;
  }

  console.dir(data, { depth: null });
  process.exit(1);

  const ySections = data.sections.value.filter(v => {
    const palette = v?.block_states?.value?.palette?.value;
    if (!palette) return false;
    return !(palette.length === 1 && palette[0]?.Name?.value === 'minecraft:air')
  }).sort((a, b) => b.Y.value - a.Y.value);

  if (ySections.length === 0) {
    return false;
  }

  // console.dir(ySections, { depth: null });

  let offX = chunkInfo.cx * 16;
  let offZ = chunkInfo.cz * 16;

  let s = 0;
  let filled = new Set<number>();

  while (filled.size < 256) {
    let section = getBlocksInSection(ySections[s]);
    let offY = ySections[s].Y.value * 16;

    for (let z = 0; z < 16; z++) {
      for (let x = 0; x < 16; x++) {
        if (filled.has(z * 16 + x)) continue;

        for (let y = 15; y >= 0; y--) {
          let blockId = section.blocks[y * 16 * 16 + z * 16 + x];
          let block = section.palette[blockId];
          let match = getColor(block);
          if (match) {
            // console.log(block.Name, Object.keys(colors)[Object.values(colors).indexOf(match)]);

            let idx = (png.width * (z + offZ) + x + offX) << 2;
            heightMap.data[idx] = match.id;
            heightMap.data[idx + 1] = (offY + y + 64) % 2;
            heightMap.data[idx + 2] = 255;
            heightMap.data[idx + 3] = (offY + y + 64) >> 1;
            png.data[idx] = match.color[0];
            png.data[idx + 1] = match.color[1];
            png.data[idx + 2] = match.color[2];
            png.data[idx + 3] = 255;

            filled.add(z * 16 + x);
            break;
          }
        }
      }
    }
    s++;
  }

  return true;
}


function getBlocksInSection(section: Section) {
  const blocks: number[] = [];
  const bitsize = Math.max(4, Math.ceil(Math.log2(section.block_states.value.palette.value.length)));
  // const bitsize = 16;
  const compressed = section.block_states.value.data?.value;
  if (!compressed) {
    return {
      blocks: new Array(4096).fill(0),
      palette: section.block_states.value.palette.value,
    }
  }

  new BigUint64Array(compressed.buffer, compressed.byteOffset, compressed.byteLength / 8).forEach(v => {
    let numberOfBytes = Math.floor(64 / bitsize);
    let rest = v;
    for (let i = 0; i < numberOfBytes; i++) {
      blocks.push(Number(rest & BigInt((1 << bitsize) - 1)))
      rest = rest >> BigInt(bitsize);
    }

    if (rest !== 0n) {
      console.log(rest)
    }
  })

  return {
    blocks,
    palette: section.block_states.value.palette.value,
  }
}

interface ChunkInfo {
  offset: number,
  len: number,
  timestamp: number,
  cx: number,
  cz: number,
}

async function getChunksInfo(file: FileHandle) {
  const data = await file.read({
    buffer: Buffer.allocUnsafe(4096 * 2),
    length: 4096 * 2,
    position: 0,
  });
  if (data.bytesRead < 4096 * 2) throw new Error("Invalid file");
  const buf = data.buffer;

  const chunkLocationsAndTimestamps: ChunkInfo[] = [];

  for (let i = 0; i < 4096; i += 4) {
    const offset = (buf[i] << 16) + (buf[i + 1] << 8) + buf[i + 2];
    if (offset === 0) continue;
    const len = buf[i + 3];
    const timestamp = buf.readUInt32BE(i + 4096);
    chunkLocationsAndTimestamps.push({
      offset,
      len,
      timestamp,
      cx: Math.floor(i / 4) % 32,
      cz: Math.floor(i / 4 / 32),
    });
  }

  return chunkLocationsAndTimestamps;
}

async function getChunk(file: FileHandle, chunk: ChunkInfo) {
  // console.log("Getting", chunk, chunk.offset * sectorSize, chunk.len * sectorSize);

  const rawData = await file.read({
    buffer: Buffer.allocUnsafe(chunk.len * sectorSize),
    position: chunk.offset * sectorSize,
    length: chunk.len * sectorSize,
  });
  // if (rawData.bytesRead !== chunk.len * sectorSize) throw new Error("Invalid file");


  const chunkLength = rawData.buffer.readUInt32BE(0);
  if (chunkLength > rawData.bytesRead - 4) throw new Error("Invalid file");

  const compressionType = rawData.buffer[4];

  if (compressionType !== 2) throw new Error("Unsupported compression type " + compressionType);

  const compressedData = rawData.buffer.subarray(5, 4 + chunkLength);

  const data = await decompress(compressedData);

  return {
    chunkLength,
    compressionType,
    data
  }
}

function decompress(input: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    inflate(input, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    })
  })
}
