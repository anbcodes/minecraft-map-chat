export const colors = {
  GRASS: {
    id: 1,
    color: [127, 178, 56],
    match: /grass_block|slime_block/g,
  },
  SAND: {
    id: 2,
    color: [247, 233, 163],
    exclude: /leaves|sapling/g,
    match: /(^minecraft:sand$)|birch|sandstone|glowstone|end_stone|bone_block|turtle_egg|scaffolding|candle|ochre_froglight/g
  },
  WOOL: {
    id: 3,
    color: [199, 199, 199],
    match: /cobweb|mushroom_stem|white_candle/g,
  },
  FIRE: {
    id: 4,
    color: [255, 0, 0],
    match: /lava|tnt|(^minecraft:fire$)|redstone_block/g,
  },
  ICE: {
    id: 5,
    color: [160, 160, 255],
    match: /ice/g,
  },
  METAL: {
    id: 6,
    color: [167, 167, 167],
    match: /iron_block|iron_door|iron_trapdoor|brewing_stand|heavy_weighted_pressure_plate|grindstone|soul_lantern|lodestone/g,
  },
  PLANT: {
    id: 7,
    color: [0, 124, 0],
    exclude: /seagrass|bamboo_sapling|cherry_leaves/g,
    match: /sapling|dandelion|poppy|blue_orchid|allium|azure_bluet|tulip|oxeye_daisy|cornflower|lily_of_the_valley|torchflower|wither_rose|sunflower|lilac|peony|pitcher_plant|wheat|sugar_cane|pumpklin_stem|melon_stem|lily_pad|cocoa|carrots|potatoes|beetroots|sweet_berry_bush|grass|fern|vines|leaves|cactus|bamboo|cave_vines|spore_blossom|dripleaf/g,
  },
  SNOW: {
    id: 8,
    color: [255, 255, 255],
    match: /snow|white/g,
  },
  CLAY: {
    id: 9,
    color: [164, 168, 184],
    exclude: /deepslate/g,
    match: /clay|infested/g,
  },
  DIRT: {
    id: 10,
    color: [151, 109, 77],
    exclude: /sapling/g,
    match: /dirt|farmland|granite|jungle|jukebox|brown_mushroom_block|hanging_roots|packed_mud/g,
  },
  STONE: {
    id: 11,
    color: [112, 112, 112],
    exclude: /deepslate|blackstone|nether/g,
    match: /stone|andesite|cobblestone|bedrock|ore|dispenser|spawner|furnace|ender_chest|dropper|observer|smoker|piston|gravel|cauldron|hopper/g,
  },
  WATER: {
    id: 12,
    color: [64, 64, 255],
    match: /kelp|seagrass|water|bubble_column/g,
  },
  WOOD: {
    id: 13,
    color: [143, 119, 72],
    exclude: /ender_chest|chisled_bookshelf|dark_oak/g,
    match: /oak|note_block|bookshelf|bamboo_sapling|chest|table|daylight_detector|loom|barrel|lectern|composter|dead_bush|beehive|beehive|banner/g,
  },
  QUARTZ: {
    id: 14,
    color: [255, 252, 245],
    match: /diorite|quartz|sea_lantern|target/g,
  },
  COLOR_ORANGE: {
    id: 15,
    color: [216, 127, 51],
    exclude: /ore|orange_terracotta|panes|exposed_copper|oxidized_copper/g,
    match: /acacia|red_sand|orange|pumpkin|jack_o_lantern|(^minecraft:terracotta$)|red_sandstone|honey_block|honeycomb_block|copper|lightning_rod/g,
  },
  COLOR_MAGENTA: {
    id: 16,
    color: [178, 76, 216],
    exclude: /magenta_terracotta|panes/g,
    match: /magenta|purpur/g,
  },
  COLOR_LIGHT_BLUE: {
    id: 17,
    color: [102, 153, 216],
    exclude: /light_blue_terracotta|panes/g,
    match: /light_blue|soul_fire/g,
  },
  COLOR_YELLOW: {
    id: 18,
    color: [229, 229, 51],
    exclude: /yellow_terracotta|panes/g,
    match: /sponge|yellow|hay_block|horn_coral|bee_nest/g,
  },
  COLOR_LIGHT_GREEN: {
    id: 19,
    color: [127, 204, 25],
    exclude: /lime_terracotta|panes/g,
    match: /lime|melon/g,
  },
  COLOR_PINK: {
    id: 20,
    color: [242, 127, 165],
    exclude: /pink_terracotta|panes/g,
    match: /cherry|pink|brain_coral|pearlescent_froglight/g,
  },
  COLOR_GRAY: {
    id: 21,
    color: [76, 76, 76],
    exclude: /gray_terracotta|light_gray|panes/g,
    match: /acacia_wood|gray|dead_coral|tinted_glass/g,
  },
  COLOR_LIGHT_GRAY: {
    id: 22,
    color: [153, 153, 153],
    exclude: /light_gray_terracotta|pane/g,
    match: /light_gray|structure_block|jigsaw_block/g,
  },
  COLOR_CYAN: {
    id: 23,
    color: [76, 127, 153],
    exclude: /cyan_terracotta|pane|dark_prismarine|prismarine_bricks/g,
    match: /cyan|prismarine|warped_roots|warped_fungus|twisting_vines|nether_sprouts|sculk_sensor/g,
  },
  COLOR_PURPLE: {
    id: 24,
    color: [127, 63, 178],
    exclude: /purple_terracotta|pane|purple_shulker_box/g,
    match: /(^minecraft:shulker_box$)|purple|mycelium|chorus|repeating_command_block|bubble_coral|amethyst/g,
  },
  COLOR_BLUE: {
    id: 60,
    color: [51, 76, 178],
    exclude: /light_blue|pane|blue_terracotta/g,
    match: /blue|tube_coral/g,
  },
  COLOR_BROWN: {
    id: 25,
    color: [102, 76, 51],
    exclude: /brown_terracotta|pane/g,
    match: /dark_oak|brown|soul_sand|command_block|(^minecraft:brown_mushroom$)|soul_soil|mud_brick_slab/g,
  },
  COLOR_GREEN: {
    id: 26,
    color: [102, 127, 51],
    exclude: /green_terracotta|pane/g,
    match: /green|end_portal_frame/g,
  },
  COLOR_RED: {
    id: 27,
    color: [153, 51, 51],
    exclude: /red_terracotta|pane|stone|deepslate|quartz|mangrove_roots|mud_bricks/g,
    match: /red|bricks|red_mushroom_block|nether_wart|enchanting_table|nether_wart_block|fire_coral|shroomlight|red_mushroom|mangrove/g,
  },
  COLOR_BLACK: {
    id: 28,
    color: [25, 25, 25],
    exclude: /black_terracotta|pane/g,
    match: /black|obsidian|end_portal|dragon_egg|coal_block|end_gateway|basalt|netherite_block|ancient_debris|crying_obsidian|respawn_anchor|blackstone|sculk/g,
  },
  GOLD: {
    id: 29,
    color: [250, 238, 77],
    match: /gold_block|light_weighted_pressure_plate|bell/g,
  },
  DIAMOND: {
    id: 30,
    color: [92, 219, 213],
    match: /diamond_block|beacon|prismarine_bricks|dark_prismarine|conduit/g,
  },
  LAPIS: {
    id: 31,
    color: [74, 128, 255],
    match: /lapis_block/g,
  },
  EMERALD: {
    id: 32,
    color: [0, 217, 58],
    match: /emerald_block/g,
  },
  PODZOL: {
    id: 33,
    color: [129, 86, 49],
    match: /podzul|spruce|campfire|mangrove_roots|muddy_mangrove_roots/g,
  },
  NETHER: {
    id: 34,
    color: [112, 2, 0],
    match: /netherrack|nether_bricks|nether.*ore|magma_block|crimson_roots|crimson_fungus|weeping_vinees/g,
  },
  TERRACOTTA_WHITE: {
    id: 35,
    color: [209, 177, 161],
    match: /white_terracotta|calcite/g,
  },
  TERRACOTTA_ORANGE: {
    id: 36,
    color: [159, 82, 36],
    match: /orange_terracotta/g,
  },
  TERRACOTTA_MAGENTA: {
    id: 37,
    color: [149, 87, 108],
    match: /magenta_terracotta/g,
  },
  TERRACOTTA_LIGHT_BLUE: {
    id: 38,
    color: [112, 108, 138],
    match: /light_blue_terracotta/g,
  },
  TERRACOTTA_YELLOW: {
    id: 39,
    color: [186, 133, 36],
    match: /yellow_terracotta/g,
  },
  TERRACOTTA_LIGHT_GREEN: {
    id: 40,
    color: [103, 117, 53],
    match: /lime_terracotta/g,
  },
  TERRACOTTA_PINK: {
    id: 41,
    color: [160, 77, 78],
    match: /pink_terracotta/g,
  },
  TERRACOTTA_GRAY: {
    id: 42,
    color: [57, 41, 35],
    match: /gray_terracotta|tuff/g,
  },
  TERRACOTTA_LIGHT_GRAY: {
    id: 42,
    color: [135, 107, 98],
    match: /light_gray_terracotta|exposed_copper|mud_bricks/g,
  },
  TERRACOTTA_CYAN: {
    id: 43,
    color: [87, 92, 92],
    match: /cyan_terracotta|(^minecraft:mud$)/g,
  },
  TERRACOTTA_PURPLE: {
    id: 44,
    color: [122, 73, 88],
    match: /purple_terracotta|purple_shulker_box/g,
  },
  TERRACOTTA_BLUE: {
    id: 45,
    color: [76, 62, 92],
    match: /blue_terracotta/g,
  },
  TERRACOTTA_BROWN: {
    id: 46,
    color: [76, 50, 35],
    match: /brown_terracotta|pointed_dripstone|dripstone_block/g,
  },
  TERRACOTTA_GREEN: {
    id: 47,
    color: [76, 82, 42],
    match: /green_terracotta/g,
  },
  TERRACOTTA_RED: {
    id: 48,
    color: [142, 60, 46],
    match: /red_terracotta|decorated_pot/g,
  },
  TERRACOTTA_BLACK: {
    id: 49,
    color: [37, 22, 16],
    match: /black_terracotta/g,
  },
  CRIMSON_NYLIUM: {
    id: 50,
    color: [189, 48, 49],
    match: /crimson_nylium/g,
  },
  CRIMSON_STEM: {
    id: 51,
    color: [148, 63, 97],
    exclude: /crimson_nylium|hyphae/g,
    match: /crimson/g,
  },
  CRIMSON_HYPHAE: {
    id: 52,
    color: [92, 25, 29],
    match: /crimson.*hyphae/g,
  },
  WARPED_NYLIUM: {
    id: 53,
    color: [22, 126, 134],
    match: /warped_nylium|oxidized_copper/g,
  },
  WARPED_STEM: {
    id: 54,
    color: [58, 142, 140],
    exclude: /warped_nylium|hyphae/g,
    match: /warped/g,
  },
  WARPED_HYPHAE: {
    id: 55,
    color: [86, 44, 62],
    match: /warped.*hyphae/g,
  },
  WARPED_WART_BLOCK: {
    id: 56,
    color: [20, 180, 133],
    match: /warped_wart_block/g,
  },
  DEEPSLATE: {
    id: 57,
    color: [100, 100, 100],
    match: /deepslate/g,
  },
  RAW_IRON: {
    id: 58,
    color: [216, 175, 147],
    match: /raw_iron_block/g,
  },
  GLOW_LICHEN: {
    id: 59,
    color: [127, 167, 150],
    match: /glow_lichen|verdant_froglight/g,
  },
  // TRANSPARENT: {
  //   color: [0, 0, 0],
  //   // exclude: /stained_glass_pane/g,
  //   // match: /air|barrier|redstone_lamp|cake|powered_rail|rail|torch|redstone_wire|latter|lever|button|tripwire|repeater|flower_pot|potted|head|comparator|end_rod|glass|nether_portal|void|iron_bars|chain|(^minecraft:light$)/g
  //   match: /.*/g
  // },
} as Record<string, { color: [number, number, number], match: RegExp, id: number, exclude?: RegExp }>;

export const multipliers = [0.71, 0.86, 1, 0.53];