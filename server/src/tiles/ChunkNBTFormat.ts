import { Byte, Byte_Array, Compound, CompoundOf, Int, ListOf, Long, Long_Array, NBT_String } from "./nbt";

export type ChunkNBT = {
  DataVersion: Int;
  xPos: Int;
  zPos: Int;
  yPos: Int;
  Status: NBT_String;
  LastUpdate: Long;
  sections: ListOf<Section>;
}

export type Section = {
  Y: Byte,
  block_states: CompoundOf<BlockStates>,
  biomes: CompoundOf<Biomes>,
  BlockLight: Byte_Array,
  SkyLight: Byte_Array,
}

export type BlockStates = {
  palette: ListOf<{ Name: NBT_String, Properties: CompoundOf<Record<string, NBT_String>> }>,
  data?: Long_Array,
}

export type Biomes = {
  palette: ListOf<{ Name: NBT_String }>,
  data?: Long_Array,
}