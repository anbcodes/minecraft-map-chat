import { readFileSync } from 'fs';
import { colors, multipliers } from './colors';

function getColor(name: string) {
  let match = Object.values(colors).findIndex(v => {
    let matches = v.match.test(name);
    v.match.lastIndex = 0;
    if (v.exclude) {
      matches = matches && !v.exclude.test(name)
      v.exclude.lastIndex = 0;
    }
    return matches;
  });

  return match === -1 ? 0 : Object.values(colors)[match].id;
}

const blocks = Object.keys(JSON.parse(readFileSync('./en_us.json', 'utf-8')))
  .filter(v => v.startsWith('block.minecraft.') && !v.includes('banner.') && v.split('.').length === 3)
  .map(v => `${v.split('.')[2]}`)
  .map(v => [v, getColor(`minecraft:${v}`) * 3] as [string, number])
  // .forEach(v => console.log(v[0], v[1]));
  .map(v => {
    let buf = new Uint8Array(40);
    let text_buf = new TextEncoder().encode(v[0]);
    buf.set(text_buf);
    buf[40 - 1] = v[1];
    // buf[40 - 2] = v[1][1];
    // buf[40 - 3] = v[1][0];
    return buf;
  }).map(v => [...v].map(v => `0x${v.toString(16).padStart(2, '0')}`).join(', '))
  .join(',\n');

let numberOfColors = Math.max(...Object.values(colors).map(v => v.id)) * 3 + 3;
let palette = [...new Array(numberOfColors)]
  .map((_, i) => [...Object.values(colors), { id: 0, color: [0, 0, 0] }].find(v => v.id === Math.floor(i / 3))?.color ?? [0, 0, 0])
  .map((v, i) => v.map(c => Math.floor(c * multipliers[i % 3])))
  .map(v => `{${v.map(v => `0x${v.toString(16)}`).join(',')}}`)
  .join(',\n  ');

console.log(`
#include <png.h>

png_color map_palette[${numberOfColors}] = {
  ${palette}
};

size_t map_palette_len = ${numberOfColors};

char colors[${blocks.split('\n').length}][40] = {
  ${blocks}
};
`);

// console.log(Math.max(...blocks.map(v => v[0].length)))
