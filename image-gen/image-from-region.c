#include <arpa/inet.h>
#include <inttypes.h>
#include <png.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <zlib.h>

#include "colors.h"

// #define log(...) printf(__VA_ARGS__)
// #define log_write(...) fwrite(__VA_ARGS__)

#define log(...)
#define log_write(...)

#define ntohll(x) (((uint64_t)ntohl((x) & 0xFFFFFFFF) << 32) | ntohl((x) >> 32))

uint8_t image[512][512] = {0};
uint16_t heightmap[512][512] = {0};

// https://www.roxlu.com/2015/050/saving-pixel-data-using-libpng
static int save_png(char *filename) {
  int width = 512;
  int height = 512;
  int bitdepth = 8;
  int colortype = PNG_COLOR_TYPE_PALETTE;
  unsigned char *data = image;
  int pitch = 1 * width;
  int transform = PNG_TRANSFORM_IDENTITY;

  int i = 0;
  int r = 0;
  FILE *fp = NULL;
  png_structp png_ptr = NULL;
  png_infop info_ptr = NULL;
  png_bytep *row_pointers = NULL;

  if (NULL == data) {
    log("Error: failed to save the png because the given data is NULL.\n");
    r = -1;
    goto error;
  }

  if (0 == strlen(filename)) {
    log("Error: failed to save the png because the given filename length is 0.\n");
    r = -2;
    goto error;
  }

  if (0 == pitch) {
    log("Error: failed to save the png because the given pitch is 0.\n");
    r = -3;
    goto error;
  }

  fp = fopen(filename, "wb");
  if (NULL == fp) {
    log("Error: failed to open the png file: %s\n", filename);
    r = -4;
    goto error;
  }

  png_ptr = png_create_write_struct(PNG_LIBPNG_VER_STRING, NULL, NULL, NULL);
  if (NULL == png_ptr) {
    log("Error: failed to create the png write struct.\n");
    r = -5;
    goto error;
  }

  info_ptr = png_create_info_struct(png_ptr);
  if (NULL == info_ptr) {
    log("Error: failed to create the png info struct.\n");
    r = -6;
    goto error;
  }

  png_set_IHDR(png_ptr,
               info_ptr,
               width,
               height,
               bitdepth,           /* e.g. 8 */
               colortype,          /* PNG_COLOR_TYPE_{GRAY, PALETTE, RGB, RGB_ALPHA, GRAY_ALPHA, RGBA, GA} */
               PNG_INTERLACE_NONE, /* PNG_INTERLACE_{NONE, ADAM7 } */
               PNG_COMPRESSION_TYPE_BASE,
               PNG_FILTER_TYPE_BASE);

  row_pointers = (png_bytep *)malloc(sizeof(png_bytep) * height);

  for (i = 0; i < height; ++i) {
    row_pointers[i] = data + i * pitch;
  }

  png_set_PLTE(png_ptr, info_ptr, map_palette, map_palette_len);

  png_init_io(png_ptr, fp);
  png_set_rows(png_ptr, info_ptr, row_pointers);
  png_write_png(png_ptr, info_ptr, transform, NULL);

error:

  if (NULL != fp) {
    fclose(fp);
    fp = NULL;
  }

  if (NULL != png_ptr) {
    if (NULL == info_ptr) {
      log("Error: info ptr is null. not supposed to happen here.\n");
    }

    png_destroy_write_struct(&png_ptr, &info_ptr);
    png_ptr = NULL;
    info_ptr = NULL;
  }

  if (NULL != row_pointers) {
    free(row_pointers);
    row_pointers = NULL;
  }

  log("And we're all free.\n");

  return r;
}

#define MAX_SECTIONS 25

#define NBT_End 0
#define NBT_Byte 1
#define NBT_Short 2
#define NBT_Int 3
#define NBT_Long 4
#define NBT_Float 5
#define NBT_Double 6
#define NBT_Byte_Array 7
#define NBT_String 8
#define NBT_List 9
#define NBT_Compound 10
#define NBT_Int_Array 11
#define NBT_Long_Array 12

int get_length_of_tag(uint8_t type, uint8_t *data, size_t max_len) {
  int len = 0;

  switch (type) {
    case NBT_End:
      log("NBT_End\n");
      return 1;
    case NBT_Byte:
      log("NBT_Byte\n");
      return 1;
    case NBT_Short:
      log("NBT_Short\n");
      return 2;
    case NBT_Int:
      log("NBT_Int\n");
      return 4;
    case NBT_Long:
      log("NBT_Long\n");
      return 8;
    case NBT_Float:
      log("NBT_Float\n");
      return 4;
    case NBT_Double:
      log("NBT_Double\n");
      return 8;
    case NBT_Byte_Array:
      int byte_array_len = ntohl(*(uint32_t *)(data));
      log("NBT_Byte_Array %d\n", byte_array_len);
      return byte_array_len + 4;
    case NBT_String:
      unsigned short str_size = ntohs(*(uint16_t *)(data));
      log("NBT_String %d\n", str_size);
      return 2 + str_size;
    case NBT_List:
      uint8_t list_type = data[0];
      len++;
      int list_len = ntohl(*(uint32_t *)(data + len));
      log("NBT_List %d\n", list_len);
      len += 4;
      for (int i = 0; i < list_len; i++) {
        len += get_length_of_tag(list_type, data + len, max_len - len);
      }
      return len;
    case NBT_Compound:
      log("NBT_Compound\n");
      while (len < max_len) {
        uint8_t tag_type = data[len];
        len++;
        if (tag_type == NBT_End) {
          return len;
        }
        unsigned short nameLen = ntohs(*(uint16_t *)(data + len));
        len += 2 + nameLen;
        log("At %d %d ", len, nameLen);
        log_write(data + len - nameLen, 1, nameLen, stdout);
        log("\n");
        len += get_length_of_tag(tag_type, data + len, max_len - len);
      }
      log("Reached max len!\n");
      return 0;
    case NBT_Int_Array:
      int int_array_len = ntohl(*(uint32_t *)(data));
      log("NBT_Int_Array %d\n", int_array_len);
      return int_array_len * 4 + 4;
    case NBT_Long_Array:
      int long_array_len = ntohl(*(uint32_t *)(data));
      log("NBT_Long_Array %d\n", long_array_len);
      return long_array_len * 8 + 4;
    default:
      log("Invalid type!! %d\n", type);
      return 0;
  }
}

uint8_t *nbt_get_key(uint8_t *data, size_t dataLen, char *name) {
  int at = 0;
  for (int i = 0; i < 20; i++) {
    log("%02hhx", data[i]);
  }
  log("\n");

  while (at < dataLen) {
    uint8_t type = data[at];
    at++;

    if (type == NBT_End) {
      return 0;
    }

    unsigned short nameLen = ntohs(*(uint16_t *)(data + at));
    at += 2;
    if (strlen(name) == nameLen && strncmp(data + at, name, nameLen) == 0) {
      return data + at + nameLen;
    }
    log("Here %d %d ", at, nameLen);
    log_write(data + at, 1, nameLen, stdout);
    log("\n");

    at += nameLen;
    at += get_length_of_tag(type, data + at, dataLen - at);
  }
}

const size_t COLOR_COUNT = sizeof colors / sizeof colors[0];

char *get_color(char *name) {
  log("Looking for %s\n", name);
  int first = 0;
  int last = COLOR_COUNT - 1;
  int middle = (first + last) / 2;
  while (first <= last) {
    int cmp = strncmp(name, colors[middle], (sizeof colors[0]) - 1);
    log("Checking %d %s %d\n", middle, colors[middle], cmp);

    if (cmp == 0) {
      return colors[middle];
    } else if (cmp < 0) {
      last = middle - 1;
    } else if (cmp > 0) {
      first = middle + 1;
    }
    middle = (first + last) / 2;
  }

  return 0;
}

int ceil_log2(unsigned long long x) {
  static const unsigned long long t[6] = {
      0xFFFFFFFF00000000ull,
      0x00000000FFFF0000ull,
      0x000000000000FF00ull,
      0x00000000000000F0ull,
      0x000000000000000Cull,
      0x0000000000000002ull};

  int y = (((x & (x - 1)) == 0) ? 0 : 1);
  int j = 32;
  int i;

  for (i = 0; i < 6; i++) {
    int k = (((x & t[i]) == 0) ? 0 : j);
    y += k;
    x >>= k;
    j >>= 1;
  }

  return y;
}

bool handle_chunk(uint8_t *file, int index) {
  int x = (index % 32) * 16;
  int z = (index / 32) * 16;
  uint32_t *ints = (uint32_t *)file;

  uint32_t loc = ((ntohl(ints[index]) & 0xffffff00) >> 8) * 4096;

  if (loc == 0) {
    return false;
  }

  uint32_t len = ntohl(ints[loc / 4]);

  uint8_t compression_type = file[loc + 4];

  uint8_t *compressed_data = file + loc + 5;

  static uint8_t chunk[1024 * 128] = {};

  unsigned long destLen = 1024ul * 128ul;

  int err = uncompress(chunk, &destLen, compressed_data, len);

  if (err != Z_OK) {
    log("There was an error decompressing the chunk (err: %d)\n", err);
    return false;
  }

  // log_write(chunk, 1, 500, stdout);

  uint8_t *status = nbt_get_key(chunk + 3, destLen, "Status");
  unsigned short status_len = ntohs(*(u_int16_t *)(status));

  log_write(status + 2, 1, status_len, stdout);

  if (strncmp(status + 2, "minecraft:full", status_len) != 0) {
    return false;
  }

  uint8_t *sections = nbt_get_key(chunk + 3, destLen, "sections");
  int section_count = ntohl(*(uint32_t *)(sections + 1));
  log("Section count %d\n", section_count);

  // Order the sections
  uint8_t *ordered_sections[MAX_SECTIONS] = {0};

  size_t at = 5;
  for (int i = 0; i < section_count; i++) {
    int8_t *y_ref = nbt_get_key(sections + at, 0xffffffff, "Y");
    if (y_ref != 0) {
      log("Setting section %d\n", *y_ref + 5);
      ordered_sections[*y_ref + 5] = sections + at;
    }
    at += get_length_of_tag(10, sections + at, 0xffffffff);
  }

  int colors_found = 0;

  // Proccess sections from top to bottom
  for (int i = MAX_SECTIONS - 1; i >= 0; i--) {
    if (ordered_sections[i] == 0) continue;

    log("Processing section %d\n", i - 5);

    uint8_t *block_states = nbt_get_key(ordered_sections[i], 0xffffffff, "block_states");

    if (block_states == 0) {
      continue;
    }

    // Get palette
    uint8_t *palette = nbt_get_key(block_states, 0xffffffff, "palette");

    static uint8_t palette_mapped[4096];

    int palette_length = ntohl(*(uint32_t *)(palette + 1));
    log("Got pallete length %d\n", palette_length);
    int ind = 5;
    for (int i = 0; i < palette_length; i++) {
      uint8_t *color_name_ptr = nbt_get_key(palette + ind, 0xffffffff, "Name");
      unsigned short color_name_len = ntohs(*(uint16_t *)(color_name_ptr));
      static char color_name[40] = {0};
      memcpy(color_name, color_name_ptr + 2 + 10, color_name_len - 10);
      color_name[color_name_len - 10] = 0;
      log("Got pallete name %s\n", color_name);

      uint8_t *color = get_color(color_name);
      if (color == 0) {
        log("Error: color not found %s\n", color_name);
      } else {
        palette_mapped[i] = color[39];
      }

      ind += get_length_of_tag(10, palette + ind, 0xffffffff);
    }

    // Process blocks
    uint8_t *compressed_blocks = nbt_get_key(block_states, 0xffffffff, "data");
    log("Compressed_blocks %p\n", compressed_blocks);

    if (compressed_blocks == 0) {
      if (palette_mapped[0] == 0) {
        continue;
      }
      for (int cx = 0; cx < 16; cx++) {
        for (int cz = 0; cz < 16; cz++) {
          image[z + cz][x + cx] = palette_mapped[0];
        }
      }
      return true;
    } else {
      int compressed_blocks_len = ntohl(*(uint32_t *)(compressed_blocks));
      uint64_t *compressed = (uint64_t *)(compressed_blocks + 4);
      int bitsize = ceil_log2(palette_length);
      bitsize = bitsize > 4 ? bitsize : 4;
      log("Bitsize %d compressed_len %d\n", bitsize, compressed_blocks_len);

      static uint16_t uncompressed[4096];

      int ind = 0;
      for (int i = 0; i < compressed_blocks_len; i++) {
        uint64_t cur = ntohll(compressed[i]);
        for (int j = 0; j < 64 / bitsize; j++) {
          int block = cur & ((1 << bitsize) - 1);
          // int block = cur % (1 << bitsize);
          cur = cur >> bitsize;
          uncompressed[ind] = block;
          ind++;
          if (ind == 4096) {
            goto after_loop;
          }
        }
      }
    after_loop:

      for (int cz = 0; cz < 16; cz++) {
        for (int cx = 0; cx < 16; cx++) {
          for (int cy = 15; cy >= 0; cy--) {
            if (image[z + cz][x + cx] != 0) break;
            int blockI = cy * 16 * 16 + cz * 16 + cx;
            int block = uncompressed[blockI];
            int y = cy + ((i - 5) * 16);

            log("Processesing block %d %d %d %d %d %d\n", block, cx, y, cz, palette_mapped[block][3], image[z + cz][x + cx][3]);

            if (palette_mapped[block] != 0) {
              log("Color found %d %d %d %d %d %d %d %d %d\n", colors_found, block, cx, y, cz, palette_mapped[block][0], palette_mapped[block][1], palette_mapped[block][2], image[z + cz][x + cx][3]);
              colors_found++;
              image[z + cz][x + cx] = palette_mapped[block];
              heightmap[z + cz][x + cx] = y;
              break;
            }

            if (colors_found == 256) {
              return true;
            }
          }
        }
      }
    }
  }

  return true;
}

void apply_heightmap() {
  for (int y = 1; y < 512; y++) {
    for (int x = 0; x < 512; x++) {
      if (heightmap[y - 1][x] > heightmap[y][x]) {
        image[y][x] += 0;
      } else if (heightmap[y - 1][x] < heightmap[y][x]) {
        image[y][x] += 2;
      } else {
        image[y][x] += 1;
      }
    }
  }
}

uint8_t next_level_image[512][512] = {0};

void save_next_level(char *output) {
  FILE *fd = fopen(output, "a+");
  struct stat st;
  fstat(fileno(fd), &st);
  long size = st.st_size;
  if (size == 512 * 512) {
    fseek(fd, 0, SEEK_SET);
    fread(next_level_image, 1, 512 * 512, fd);
  }
}

int main(int argc, char **argv) {
  if (argc < 3) {
    log("All arguments are required\n");
    return 1;
  }

  // char *color = get_color("air");

  // if (color == 0) {
  //   log("Failed to find color\n");
  //   return 0;
  // }

  // log("color %hhu %hhu %hhu\n", color[37], color[38], color[39]);
  // return 0;

  FILE *fd = fopen(argv[1], "r");

  struct stat st;
  fstat(fileno(fd), &st);
  long size = st.st_size;

  uint8_t *file_buf = malloc(size);

  size_t count = fread(file_buf, 1, size, fd);
  if (count != size) {
    log("Got incorrect file size\n");
    return 1;
  }

  for (int c = 0; c < 1024; c++) {
    if (handle_chunk(file_buf, c)) {
      // break;
    }
  }

  apply_heightmap();

  save_png(argv[2]);

  if (argc >= 4) {
    save_next_level(argv[4]);
  }

  return 0;
}