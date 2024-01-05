import { createReadStream, createWriteStream, mkdirSync, readdirSync, writeFileSync } from "fs";
import { FileHandle, open, readdir, stat, writeFile } from "fs/promises";
import { basename, join, resolve } from "path";

import { handleFile } from "./generateImage";
import { PNG } from "pngjs";
import { generateZoomLevel } from "./zoomLevels";

export async function generateTiles(levelFolder: string, outputFolder: string) {
  const files = readdirSync(levelFolder).map(v => join(levelFolder, v));

  console.log(files);

  // let bounds = {
  //   x1: 1e50,
  //   x2: -1e50,
  //   z1: 1e50,
  //   z2: -1e50,
  // }

  // Zoom level 0

  let level0 = join(outputFolder, '0');

  mkdirSync(level0, { recursive: true })
  await Promise.all(files.map(async v => {
    let [_, x, z] = basename(v).split('.').map(v => +v);
    // if (!(Math.abs(x) < 2 && Math.abs(z) < 2)) {
    //   return
    // }
    // if (x < bounds.x1) bounds.x1 = x;
    // if (x > bounds.x2) bounds.x2 = x;
    // if (z < bounds.z1) bounds.z1 = z;
    // if (z > bounds.z2) bounds.z2 = z;

    try {
      const outputFile = join(level0, `${basename(v)}.png`);
      const heightOutput = join(level0, `${basename(v)}.height.png`);
      let isModified = true;
      try {
        isModified = (await stat(v)).mtimeMs > ((await stat(outputFile)).mtimeMs);
        if ((await stat(outputFile)).size === 0) {
          isModified = true;
        }
      } catch (e) {
        // File probably doesn't already exist
      }

      if (isModified) {
        await handleFile(v, outputFile, heightOutput);
      }
    } catch (e) {
      console.error(e);
    }
  }))

  // Generate zoom levels
  for (let level = 1; level < 10; level++) {
    await generateZoomLevel(-level, outputFolder);
  }
}
