export const TAG = {
  End: 0,
  Byte: 1,
  Short: 2,
  Int: 3,
  Long: 4,
  Float: 5,
  Double: 6,
  Byte_Array: 7,
  String: 8,
  List: 9,
  Compound: 10,
  Int_Array: 11,
  Long_Array: 12
}

export type End = {
  type: 0,
  value: 0,
}

export type Byte = {
  type: 1,
  value: number,
}

export type Short = {
  type: 2,
  value: number,
}

export type Int = {
  type: 3,
  value: number,
}

export type Long = {
  type: 4,
  value: number,
}

export type Float = {
  type: 5,
  value: number,
}

export type Double = {
  type: 6,
  value: number,
}

export type Byte_Array = {
  type: 7,
  value: Uint8Array,
}

export type NBT_String = {
  type: 8,
  value: string,
}

type NBTField = End | Byte | Short | Int | Long | Float | Double | Byte_Array | NBT_String | List | Compound | Int_Array | Long_Array
type ListValue = number[] | Uint8Array[] | string[] | ListValue[] | Record<string, NBTField>[];

export type List = {
  type: 9,
  value: ListValue,
}

type ListDefault = number | Uint8Array | string | Record<string, NBTField> | Int32Array;
export type ListOf<T extends ListDefault> = {
  type: 9,
  value: T[],
}

export type Compound = {
  type: 10,
  value: Record<string, NBTField>,
}

export type CompoundOf<T extends Record<string, NBTField>> = {
  type: 10,
  value: T,
}

export type Int_Array = {
  type: 11,
  value: Int32Array,
}

export type Long_Array = {
  type: 12,
  value: BigInt64Array,
}

function getTagName(data: Buffer): { name: string, i: number } {
  const nameLen = data.readInt16BE(1);
  const name = new TextDecoder().decode(data.subarray(3, 3 + nameLen));
  const i = 3 + nameLen;
  return { name, i };
}

export function parseEnd(data: Buffer) {
  const { value, len } = parseEndPayload(data);
  return { name: '', value, len: len };
}

export function parseEndPayload(data: Buffer): { value: number, len: number } {
  return {
    value: data.readInt8(),
    len: 1,
  }
}

export function parseByte(data: Buffer) {
  const { name, i } = getTagName(data);
  const { value, len } = parseBytePayload(data.subarray(i));
  return { name, value, len: i + len };
}

export function parseBytePayload(data: Buffer): { value: number, len: number } {
  return {
    value: data.readInt8(),
    len: 1,
  }
}

export function parseShort(data: Buffer) {
  const { name, i } = getTagName(data);
  const { value, len } = parseShortPayload(data.subarray(i));
  return { name, value, len: i + len };
}

export function parseShortPayload(data: Buffer): { value: number, len: number } {
  return {
    value: data.readInt16BE(),
    len: 2,
  }
}

export function parseInt(data: Buffer) {
  const { name, i } = getTagName(data);
  const { value, len } = parseIntPayload(data.subarray(i));
  return { name, value, len: i + len };
}

export function parseIntPayload(data: Buffer): { value: number, len: number } {
  return {
    value: data.readInt32BE(),
    len: 4,
  }
}

export function parseLong(data: Buffer) {
  const { name, i } = getTagName(data);
  const { value, len } = parseLongPayload(data.subarray(i));
  return { name, value, len: i + len };
}

export function parseLongPayload(data: Buffer): { value: bigint, len: number } {
  return {
    value: data.readBigInt64BE(),
    len: 8,
  }
}

export function parseFloat(data: Buffer) {
  const { name, i } = getTagName(data);
  const { value, len } = parseFloatPayload(data.subarray(i));
  return { name, value, len: i + len };
}

export function parseFloatPayload(data: Buffer): { value: number, len: number } {
  return {
    value: data.readFloatBE(),
    len: 4,
  }
}

export function parseDouble(data: Buffer) {
  const { name, i } = getTagName(data);
  const { value, len } = parseDoublePayload(data.subarray(i));
  return { name, value, len: i + len };
}

export function parseDoublePayload(data: Buffer): { value: number, len: number } {
  return {
    value: data.readDoubleBE(),
    len: 8,
  }
}

export function parseByteArray(data: Buffer) {
  const { name, i } = getTagName(data);
  const { value, len } = parseByteArrayPayload(data.subarray(i));
  return { name, value, len: i + len };
}

export function parseByteArrayPayload(data: Buffer): { value: Buffer, len: number } {
  let size = data.readInt32BE();
  return {
    value: data.subarray(4, 4 + size),
    len: 4 + size,
  }
}

export function parseString(data: Buffer) {
  const { name, i } = getTagName(data);
  const { value, len } = parseStringPayload(data.subarray(i));
  return { name, value, len: i + len };
}

export function parseStringPayload(data: Buffer): { value: string, len: number } {
  const len = data.readUint16BE();
  return {
    value: new TextDecoder().decode(data.subarray(2, 2 + len)),
    len: 2 + len,
  }
}

const payloadFunctionsForTags = {
  [TAG.End]: parseEndPayload,
  [TAG.Byte]: parseBytePayload,
  [TAG.Short]: parseShortPayload,
  [TAG.Int]: parseIntPayload,
  [TAG.Long]: parseLongPayload,
  [TAG.Float]: parseFloatPayload,
  [TAG.Double]: parseDoublePayload,
  [TAG.Byte_Array]: parseByteArrayPayload,
  [TAG.String]: parseStringPayload,
  [TAG.List]: parseListPayload,
  [TAG.Compound]: parseCompoundPayload,
  [TAG.Int_Array]: parseIntArrayPayload,
  [TAG.Long_Array]: parseLongArrayPayload,
}

export function parseList(data: Buffer) {
  const { name, i } = getTagName(data);
  const { value, len } = parseListPayload(data.subarray(i));
  return { name, value, len: i + len };
}

export function parseListPayload(data: Buffer): { value: any[], len: number } {
  const type = data.readUInt8();

  if (type > 12) throw new Error("Unknown tag type " + type);

  const len = data.readInt32BE(1);
  let value: any[] = new Array(len);
  let ind = 5;
  for (let i = 0; i < len; i++) {
    const { value: v, len: l } = payloadFunctionsForTags[type](data.subarray(ind))
    value[i] = v;
    ind += l;
  }
  return {
    value,
    len: ind,
  }
}

const functionsForTags = {
  [TAG.End]: parseEnd,
  [TAG.Byte]: parseByte,
  [TAG.Short]: parseShort,
  [TAG.Int]: parseInt,
  [TAG.Long]: parseLong,
  [TAG.Float]: parseFloat,
  [TAG.Double]: parseDouble,
  [TAG.Byte_Array]: parseByteArray,
  [TAG.String]: parseString,
  [TAG.List]: parseList,
  [TAG.Compound]: parseCompound,
  [TAG.Int_Array]: parseIntArray,
  [TAG.Long_Array]: parseLongArray,
}

export function parseCompound(data: Buffer) {
  const { name, i } = getTagName(data);
  const { value, len } = parseCompoundPayload(data.subarray(i));
  return { name, value, len: i + len };
}

export function parseCompoundPayload(data: Buffer): { value: Record<string, NBTField>, len: number } {
  const obj: Record<any, any> = {};
  let i = 0;
  while (true) {
    if (data[i] > 12) throw new Error("Unknown tag type " + data[i]);

    if (data[i] === TAG.End) {
      return {
        value: obj,
        len: i + 1,
      };
    } else {
      const { name, value, len } = functionsForTags[data[i]](data.subarray(i));
      // console.log("Read", name, value, len);
      obj[name] = {
        type: data[i],
        value,
      }
      i += len;
    }
  }
}

export function parseIntArray(data: Buffer) {
  const { name, i } = getTagName(data);
  const { value, len } = parseIntArrayPayload(data.subarray(i));
  return { name, value, len: i + len };
}

export function parseIntArrayPayload(data: Buffer): { value: Int32Array, len: number } {
  let size = data.readInt32BE();
  let dataview = new DataView(data.buffer, data.byteOffset + 4, size * 4);
  let value = new Int32Array(size);
  for (let i = 0; i < size; i++) {
    value[i] = dataview.getInt32(i * 4, false);
  }
  return {
    value,
    len: 4 + size * 4,
  }
}

export function parseLongArray(data: Buffer) {
  const { name, i } = getTagName(data);
  const { value, len } = parseLongArrayPayload(data.subarray(i));
  return { name, value, len: i + len };
}

export function parseLongArrayPayload(data: Buffer): { value: BigInt64Array, len: number } {
  let size = data.readInt32BE();
  let dataview = new DataView(data.buffer, data.byteOffset + 4, size * 8);
  let value = new BigInt64Array(size);
  for (let i = 0; i < size; i++) {
    value[i] = dataview.getBigInt64(i * 8, false);
  }
  return {
    value,
    len: 4 + size * 8,
  }
}