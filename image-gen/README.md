# Minecraft Map Image Generator

Copy Minecraft en-us.json file from the assets folder (required for next step).

Generate `colors.h` using `ts-node getblockmapping.ts`

Compile with `gcc ./main.c -O3 -o image-generator -lz -lpng -Werror`

Usage: `./image-generator [region folder] [output folder]`
