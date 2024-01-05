import { createReadStream, createWriteStream, mkdirSync } from "fs";
import { readdir, stat } from "fs/promises";
import { basename, join } from "path";
import { PNG } from "pngjs";

export async function generateZoomLevel(level: number, output: string) {
  console.log("Generating zoom", level);
  let zoomOutput = join(output, level.toString(10));
  mkdirSync(zoomOutput, { recursive: true });
  let previousOut = join(output, (level + 1).toString(10));

  let written = new Set<string>();
  let files = await readdir(previousOut);
  await Promise.all(files.map(async (v) => {
    let [_, x, z] = basename(v).split('.').map(v => +v);

    // if (!(x === 1 && z === 1)) {
    //   return
    // }

    let nx = Math.floor(x / 2);
    let nz = Math.floor(z / 2);
    if (written.has(`${nx},${nz}`)) {
      return;
    }

    written.add(`${nx},${nz}`)

    const prev = join(previousOut, `r.${x}.${z}.mca.png`);
    const curr = join(zoomOutput, `r.${nx}.${nz}.mca.png`);
    let isModified = true;
    try {
      isModified = (await stat(prev)).mtimeMs > ((await stat(curr)).mtimeMs);
      if ((await stat(curr)).size === 0) {
        isModified = true;
      }
    } catch (e) {
      // console.log(e);
      // File probably doesn't already exist
    }

    if (!isModified) {
      return
    }

    let mapFiles = [
      [`r.${nx * 2}.${nz * 2}.mca.png`, `r.${nx * 2 + 1}.${nz * 2}.mca.png`],
      [`r.${nx * 2}.${nz * 2 + 1}.mca.png`, `r.${nx * 2 + 1}.${nz * 2 + 1}.mca.png`],
    ].map(v => v.map(v => join(previousOut, v)));

    let heightFiles = [
      [`r.${nx * 2}.${nz * 2}.mca.height.png`, `r.${nx * 2 + 1}.${nz * 2}.mca.height.png`],
      [`r.${nx * 2}.${nz * 2 + 1}.mca.height.png`, `r.${nx * 2 + 1}.${nz * 2 + 1}.mca.height.png`],
    ].map(v => v.map(v => join(previousOut, v)));

    await mergeImages(mapFiles, join(zoomOutput, `r.${nx}.${nz}.mca.png`));
    await mergeImages(heightFiles, join(zoomOutput, `r.${nx}.${nz}.mca.height.png`));
  }));
}

async function mergeImages(fileStrs: string[][], output: string) {
  let getFile = (file: string) => new Promise<Uint32Array | undefined>((resolve) => {
    try {
      createReadStream(file)
        .on('error', () => {
          resolve(undefined);
        })
        .pipe(new PNG())
        .on('parsed', (data) => {
          resolve(new Uint32Array(data.buffer, data.byteOffset, data.byteLength / 4));
        })
        .on('error', () => {
          // TODO: Check what error it is
          resolve(undefined);
        })
    } catch (e) {
      // TODO: Check if file is undefined
      resolve(undefined);
    }
  })

  // let files = [
  //   [await getFile(nx * 2, nz * 2), await getFile(nx * 2 + 1, nz * 2)],
  //   [await getFile(nx * 2, nz * 2 + 1), await getFile(nx * 2 + 1, nz * 2 + 1)]
  // ];

  let files = await Promise.all(fileStrs.map(v => Promise.all(v.map(v => getFile(v)))));

  let newFile = new PNG({
    width: 512,
    height: 512,
  });

  let uints = new Uint32Array(newFile.data.buffer, newFile.data.byteOffset, newFile.data.byteLength / 4);
  for (let x = 0; x < 512; x++) {
    for (let z = 0; z < 512; z++) {
      let idx = (newFile.width * z + x);

      let get = (x: number, z: number) => {
        let ox = (x % 256) * 2;
        let oz = (z % 256) * 2;
        let file = files[Math.floor(z / 256)][Math.floor(x / 256)];
        let getPixel = (x: number, z: number) => file?.[512 * z + x] ?? 0;

        let colors = [
          getPixel(ox, oz),
          getPixel(ox + 1, oz),
          getPixel(ox, oz + 1),
          getPixel(ox + 1, oz + 1),
        ];


        // [a, b, c, d]
        // a: a == b && c || a == c && d || a === b && d
        // b: b == a && c || b == a && d || b === 
        // c: c == a && b || c == a && d
        // d: d == a && b || d == b && c

        const mode = () => {
          let [a, b, c, d] = colors;
          if (a === b) return a;
          if (a === c) return a;
          if (a === d) return a;
          if (b === c) return b;
          if (b === d) return b;
          if (c === d) return c;

          return a;
        }

        // console.log(colors, mode());

        return mode();
      }

      let color = get(x, z);

      uints[idx] = color;
    }
  }

  console.log("Writing", output);

  await new Promise<void>((resolve) => newFile.pack().pipe(createWriteStream(output)).on('finish', () => resolve()));

  console.log("Generated", output);
  // let files = 
}
