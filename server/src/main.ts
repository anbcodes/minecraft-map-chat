// A command line interface

import { generateTiles } from "./tiles/buildImage";

const levelFolder = process.argv[2];
const outputFolder = process.argv[3];

generateTiles(levelFolder, outputFolder);
