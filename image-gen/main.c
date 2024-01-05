#define _DEFAULT_SOURCE
#include <arpa/inet.h>
#include <dirent.h>
#include <inttypes.h>
#include <png.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <threads.h>
#include <zlib.h>

#include "colors.h"

// logging defs
// #define dprintf(...) printf(__VA_ARGS__)
// #define dfwrite(...) fwrite(__VA_ARGS__)

#define dprintf(...)
#define dfwrite(...)

// Types

typedef struct {
  int x;
  int z;
  thrd_t thread;
  uint8_t data[512][512];
  bool finished_zoom;
} map_image;

enum {
  NBT_End = 0,
  NBT_Byte = 1,
  NBT_Short = 2,
  NBT_Int = 3,
  NBT_Long = 4,
  NBT_Float = 5,
  NBT_Double = 6,
  NBT_Byte_Array = 7,
  NBT_String = 8,
  NBT_List = 9,
  NBT_Compound = 10,
  NBT_Int_Array = 11,
  NBT_Long_Array = 12
};

// Globals

#define ntohll(x) (((uint64_t)ntohl((x) & 0xFFFFFFFF) << 32) | ntohl((x) >> 32))
#define MAX_Y_SECTIONS 25

char *output_dir;
char *input_dir;

map_image *images;
mtx_t images_mutex;
int max_images_count = 1000;
int images_count = 0;

void init_images() {
  images = malloc(max_images_count * sizeof images[0]);
}

void increase_max_images_count() {
  max_images_count *= 2;
  map_image *old_images = images;
  images = malloc(max_images_count * sizeof images[0]);
  memcpy(images, old_images, max_images_count / 2 * sizeof images[0]);
}

map_image next_level_images[250];
mtx_t next_level_images_mutex;
int next_level_images_count = 1000;

void initialize_mutexes() {
  mtx_init(&images_mutex, mtx_plain);
  mtx_init(&next_level_images_mutex, mtx_plain);
}

// Util

#define fmt(name, ...)                                \
  int _##name##_len = snprintf(NULL, 0, __VA_ARGS__); \
  char name[_##name##_len + 1];                       \
  snprintf(name, _##name##_len + 1, __VA_ARGS__);

int floor_div(int a, int b) {
  int d = a / b;

  return d * b == a ? d : d - ((a < 0) ^ (b < 0));
}

// https://www.roxlu.com/2015/050/saving-pixel-data-using-libpng
static int save_png(char *filename, uint8_t image[512][512]) {
  int width = 512;
  int height = 512;
  int bitdepth = 8;
  int colortype = PNG_COLOR_TYPE_PALETTE;
  unsigned char *data = (unsigned char *)image;
  int pitch = 1 * width;
  int transform = PNG_TRANSFORM_IDENTITY;

  int i = 0;
  int r = 0;
  FILE *fp = NULL;
  png_structp png_ptr = NULL;
  png_infop info_ptr = NULL;
  png_bytep *row_pointers = NULL;

  if (NULL == data) {
    dprintf("Error: failed to save the png because the given data is NULL.\n");
    r = -1;
    goto error;
  }

  if (0 == strlen(filename)) {
    dprintf("Error: failed to save the png because the given filename length is 0.\n");
    r = -2;
    goto error;
  }

  if (0 == pitch) {
    dprintf("Error: failed to save the png because the given pitch is 0.\n");
    r = -3;
    goto error;
  }

  fp = fopen(filename, "wb");
  if (NULL == fp) {
    dprintf("Error: failed to open the png file: %s\n", filename);
    r = -4;
    goto error;
  }

  png_ptr = png_create_write_struct(PNG_LIBPNG_VER_STRING, NULL, NULL, NULL);
  if (NULL == png_ptr) {
    dprintf("Error: failed to create the png write struct.\n");
    r = -5;
    goto error;
  }

  info_ptr = png_create_info_struct(png_ptr);
  if (NULL == info_ptr) {
    dprintf("Error: failed to create the png info struct.\n");
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
      dprintf("Error: info ptr is null. not supposed to happen here.\n");
    }

    png_destroy_write_struct(&png_ptr, &info_ptr);
    png_ptr = NULL;
    info_ptr = NULL;
  }

  if (NULL != row_pointers) {
    free(row_pointers);
    row_pointers = NULL;
  }

  dprintf("And we're all free.\n");

  return r;
}

// NBT

int nbt_get_length_of_tag(uint8_t type, uint8_t *data, size_t max_len) {
  int len = 0;

  switch (type) {
    case NBT_End:
      dprintf("NBT_End\n");
      return 1;
    case NBT_Byte:
      dprintf("NBT_Byte\n");
      return 1;
    case NBT_Short:
      dprintf("NBT_Short\n");
      return 2;
    case NBT_Int:
      dprintf("NBT_Int\n");
      return 4;
    case NBT_Long:
      dprintf("NBT_Long\n");
      return 8;
    case NBT_Float:
      dprintf("NBT_Float\n");
      return 4;
    case NBT_Double:
      dprintf("NBT_Double\n");
      return 8;
    case NBT_Byte_Array:
      int byte_array_len = ntohl(*(uint32_t *)(data));
      dprintf("NBT_Byte_Array %d\n", byte_array_len);
      return byte_array_len + 4;
    case NBT_String:
      unsigned short str_size = ntohs(*(uint16_t *)(data));
      dprintf("NBT_String %d\n", str_size);
      return 2 + str_size;
    case NBT_List:
      uint8_t list_type = data[0];
      len++;
      int list_len = ntohl(*(uint32_t *)(data + len));
      dprintf("NBT_List %d\n", list_len);
      len += 4;
      for (int i = 0; i < list_len; i++) {
        len += nbt_get_length_of_tag(list_type, data + len, max_len - len);
      }
      return len;
    case NBT_Compound:
      dprintf("NBT_Compound\n");
      while (len < max_len) {
        uint8_t tag_type = data[len];
        len++;
        if (tag_type == NBT_End) {
          return len;
        }
        unsigned short nameLen = ntohs(*(uint16_t *)(data + len));
        len += 2 + nameLen;
        dprintf("At %d %d ", len, nameLen);
        dfwrite(data + len - nameLen, 1, nameLen, stdout);
        dprintf("\n");
        len += nbt_get_length_of_tag(tag_type, data + len, max_len - len);
      }
      dprintf("Reached max len!\n");
      return 0;
    case NBT_Int_Array:
      int int_array_len = ntohl(*(uint32_t *)(data));
      dprintf("NBT_Int_Array %d\n", int_array_len);
      return int_array_len * 4 + 4;
    case NBT_Long_Array:
      int long_array_len = ntohl(*(uint32_t *)(data));
      dprintf("NBT_Long_Array %d\n", long_array_len);
      return long_array_len * 8 + 4;
    default:
      dprintf("Invalid type!! %d\n", type);
      return 0;
  }
}

uint8_t *nbt_get_key(uint8_t *data, size_t dataLen, char *name) {
  int at = 0;
  for (int i = 0; i < 20; i++) {
    dprintf("%02hhx", data[i]);
  }
  dprintf("\n");

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
    dprintf("Here %d %d ", at, nameLen);
    dfwrite(data + at, 1, nameLen, stdout);
    dprintf("\n");

    at += nameLen;
    at += nbt_get_length_of_tag(type, data + at, dataLen - at);
  }
}

// Colors

const size_t COLOR_COUNT = sizeof colors / sizeof colors[0];

char *get_color(char *name) {
  dprintf("Looking for %s\n", name);
  int first = 0;
  int last = COLOR_COUNT - 1;
  int middle = (first + last) / 2;
  while (first <= last) {
    int cmp = strncmp(name, colors[middle], (sizeof colors[0]) - 1);
    dprintf("Checking %d %s %d\n", middle, colors[middle], cmp);

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

// Chunk logic

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

bool handle_chunk(uint8_t *file, int index, uint8_t image_data[512][512], uint16_t heightmap[512][512]) {
  // Get chunk x z location
  int region_block_x = (index % 32) * 16;
  int region_block_z = (index / 32) * 16;

  // Get location and length of chunk section
  uint32_t *ints = (uint32_t *)file;

  uint32_t loc = ((ntohl(ints[index]) & 0xffffff00) >> 8) * 4096;

  if (loc == 0) {
    return false;
  }

  uint32_t len = ntohl(ints[loc / 4]);

  // Decompress chunk
  uint8_t compression_type = file[loc + 4];

  uint8_t *compressed_data = file + loc + 5;

  thread_local static uint8_t chunk[1024 * 128 * 4] = {};

  unsigned long destLen = 1024ul * 128ul * 4;

  int err = uncompress(chunk, &destLen, compressed_data, len);

  if (err != Z_OK) {
    printf("Error: there was an error decompressing the chunk (err: %d)\n", err);
    return false;
  }

  // Check whether the chunk is fully generated
  uint8_t *status = nbt_get_key(chunk + 3, destLen, "Status");
  unsigned short status_len = ntohs(*(u_int16_t *)(status));

  dfwrite(status + 2, 1, status_len, stdout);

  if (strncmp(status + 2, "minecraft:full", status_len) != 0) {
    return false;
  }

  // Get and order the y-sections
  uint8_t *sections = nbt_get_key(chunk + 3, destLen, "sections");
  int section_count = ntohl(*(uint32_t *)(sections + 1));
  dprintf("Section count %d\n", section_count);

  uint8_t *ordered_sections[MAX_Y_SECTIONS] = {0};

  size_t at = 5;
  for (int i = 0; i < section_count; i++) {
    int8_t *y_ref = nbt_get_key(sections + at, 0xffffffff, "Y");
    if (y_ref != 0) {
      dprintf("Setting section %d\n", *y_ref + 5);
      ordered_sections[*y_ref + 5] = sections + at;
    }
    at += nbt_get_length_of_tag(10, sections + at, 0xffffffff);
  }

  // Proccess sections from top to bottom

  int colors_found = 0;

  for (int i = MAX_Y_SECTIONS - 1; i >= 0; i--) {
    if (ordered_sections[i] == 0) continue;

    dprintf("Processing section %d\n", i - 5);

    uint8_t *block_states = nbt_get_key(ordered_sections[i], 0xffffffff, "block_states");

    if (block_states == 0) {
      continue;
    }

    // Get palette
    uint8_t *palette = nbt_get_key(block_states, 0xffffffff, "palette");

    thread_local static uint8_t palette_mapped[4096];

    int palette_length = ntohl(*(uint32_t *)(palette + 1));
    dprintf("Got pallete length %d\n", palette_length);
    int ind = 5;

    // Convert palette to color numbers
    for (int i = 0; i < palette_length; i++) {
      uint8_t *color_name_ptr = nbt_get_key(palette + ind, 0xffffffff, "Name");
      unsigned short color_name_len = ntohs(*(uint16_t *)(color_name_ptr));

      thread_local static char color_name[40] = {0};
      memcpy(color_name, color_name_ptr + 2 + 10, color_name_len - 10);
      color_name[color_name_len - 10] = 0;
      dprintf("Got pallete name %s\n", color_name);

      uint8_t *color = get_color(color_name);
      if (color == 0) {
        dprintf("Error: color not found %s\n", color_name);
      } else {
        palette_mapped[i] = color[39];
      }

      ind += nbt_get_length_of_tag(10, palette + ind, 0xffffffff);
    }

    // Process blocks
    uint8_t *compressed_blocks = nbt_get_key(block_states, 0xffffffff, "data");
    dprintf("Compressed_blocks %p\n", compressed_blocks);

    // If there is no block array, it's all a single block
    if (compressed_blocks == 0) {
      if (palette_mapped[0] == 0) {
        continue;
      }
      for (int cx = 0; cx < 16; cx++) {
        for (int cz = 0; cz < 16; cz++) {
          image_data[region_block_z + cz][region_block_z + cx] = palette_mapped[0];
        }
      }
      return true;
    } else {
      // Decompress the block array
      int compressed_blocks_len = ntohl(*(uint32_t *)(compressed_blocks));
      uint64_t *compressed = (uint64_t *)(compressed_blocks + 4);
      int bitsize = ceil_log2(palette_length);
      bitsize = bitsize > 4 ? bitsize : 4;
      dprintf("Bitsize %d compressed_len %d\n", bitsize, compressed_blocks_len);

      thread_local static uint16_t uncompressed[4096];

      int ind = 0;
      for (int i = 0; i < compressed_blocks_len; i++) {
        uint64_t cur = ntohll(compressed[i]);
        for (int j = 0; j < 64 / bitsize; j++) {
          int block = cur & ((1 << bitsize) - 1);
          cur = cur >> bitsize;
          uncompressed[ind] = block;
          ind++;
          if (ind == 4096) {
            goto after_loop;
          }
        }
      }
    after_loop:

      // Write the highest blocks to the image
      for (int cz = 0; cz < 16; cz++) {
        for (int cx = 0; cx < 16; cx++) {
          for (int cy = 15; cy >= 0; cy--) {
            if (image_data[region_block_z + cz][region_block_x + cx] != 0) break;
            int blockI = cy * 16 * 16 + cz * 16 + cx;
            int block = uncompressed[blockI];
            int y = cy + ((i - 5) * 16);

            dprintf("Processesing block %d %d %d %d %d %d\n", block, cx, y, cz, palette_mapped[block], image_data[region_block_z + cz][region_block_x + cx]);

            if (palette_mapped[block] != 0) {
              dprintf("Color found %d %d %d %d %d %d %d\n", colors_found, block, cx, y, cz, palette_mapped[block], image_data[region_block_z + cz][region_block_x + cx]);
              colors_found++;
              image_data[region_block_z + cz][region_block_x + cx] = palette_mapped[block];
              heightmap[region_block_z + cz][region_block_x + cx] = y;
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

void apply_heightmap(uint8_t image_data[512][512], uint16_t heightmap[512][512]) {
  for (int y = 0; y < 512; y++) {
    for (int x = 0; x < 512; x++) {
      if (y == 0) {
        image_data[y][x] += 1;
        continue;
      }
      if (heightmap[y - 1][x] > heightmap[y][x]) {
        image_data[y][x] += 0;
      } else if (heightmap[y - 1][x] < heightmap[y][x]) {
        image_data[y][x] += 2;
      } else {
        image_data[y][x] += 1;
      }
    }
  }
}

// Handle region
int handle_region(void *arg) {
  map_image *image = (map_image *)arg;
  dprintf("Starting to handle %d, %d\n", image->x, image->z);

  fmt(file_name, "%s/r.%d.%d.mca", input_dir, image->x, image->z);
  fmt(output_bin_file_name, "%s/0/%d.%d.bin", output_dir, image->x, image->z);

  FILE *fd = fopen(file_name, "r");

  struct stat st;
  fstat(fileno(fd), &st);

  if (access(output_bin_file_name, F_OK) == 0) {
    dprintf("Using cached %s\n", output_bin_file_name);
    struct stat st2;
    FILE *fd2 = fopen(output_bin_file_name, "rb");
    fstat(fileno(fd2), &st2);
    if (st2.st_mtim.tv_nsec >= st.st_mtim.tv_nsec) {
      int amount = fread(image->data, 1, 512 * 512, fd2);
      if (amount == 512 * 512) {
        return 0;
      } else {
        printf("Error reading cache data\n");
      }
    }
  }

  long size = st.st_size;

  uint8_t *file_buf = malloc(size);

  size_t count = fread(file_buf, 1, size, fd);
  if (count != size) {
    dprintf("Got incorrect file size\n");
    return 1;
  }

  thread_local static uint16_t heightmap[512][512];

  for (int c = 0; c < 1024; c++) {
    handle_chunk(file_buf, c, image->data, heightmap);
  }

  free(file_buf);

  apply_heightmap(image->data, heightmap);

  fmt(output_file_name, "%s/0/%d.%d.png", output_dir, image->x, image->z);

  save_png(output_file_name, image->data);

  // Write bin output file
  FILE *fd_out_bin = fopen(output_bin_file_name, "wb");
  fwrite(image->data, 1, 512 * 512, fd_out_bin);
}

typedef struct {
  int x;
  int z;
  int level;
  uint8_t (*previous_images[2][2])[512][512];
  uint8_t (*output)[512][512];
} produce_zoomed_out_image_args;
int produce_zoomed_out_image(void *_arg) {
  produce_zoomed_out_image_args *args = (produce_zoomed_out_image_args *)(_arg);

  for (int z = 0; z < 512; z++) {
    for (int x = 0; x < 512; x++) {
      if (args->previous_images[z / 256][x / 256] == NULL) {
        (*args->output)[z][x] = 0;
        continue;
      }
      uint8_t b0 = (*args->previous_images[z / 256][x / 256])[(z % 256) * 2][(x % 256) * 2];
      uint8_t b1 = (*args->previous_images[z / 256][x / 256])[(z % 256) * 2][(x % 256) * 2 + 1];
      uint8_t b2 = (*args->previous_images[z / 256][x / 256])[(z % 256) * 2 + 1][(x % 256) * 2];
      uint8_t b3 = (*args->previous_images[z / 256][x / 256])[(z % 256) * 2 + 1][(x % 256) * 2 + 1];
      if (b0 == b1 || b0 == b2 || b0 == b3) {
        (*args->output)[z][x] = b0;
      } else if (b1 == b2 || b1 == b3) {
        (*args->output)[z][x] = b1;
      } else if (b2 == b3) {
        (*args->output)[z][x] = b2;
      } else {
        (*args->output)[z][x] = b0;
      }
    }
  }

  for (int z = 0; z < 512; z++) {
    for (int x = 0; x < 512; x++) {
      dprintf("%d,", x);
    }
    dprintf("\n");
  }

  fmt(output_file, "%s/-%d/%d.%d.png", output_dir, args->level, args->x, args->z);

  save_png(output_file, *args->output);

  return 0;
}

map_image *find_image(map_image *images, int count, int x, int z) {
  for (int i = 0; i < count; i++) {
    if (images[i].x == x && images[i].z == z) {
      return &images[i];
    }
  }
  return 0;
}

typedef uint8_t (*image_data)[512][512];

image_data find_image_data(map_image *images, int count, int x, int z) {
  map_image *image = find_image(images, count, x, z);
  if (image == NULL)
    return NULL;
  image->finished_zoom = true;
  return &(image->data);
}

// Main function

int main(int argc, char **argv) {
  // Usage: ./main [input_folder] [output_folder]

  if (argc < 3) {
    printf("Usage: ./main [input_folder] [output_folder]\n");
    return 1;
  }

  init_images();

  output_dir = argv[2];
  input_dir = argv[1];

  // Read the input folder

  DIR *d;
  struct dirent *dir;
  d = opendir(argv[1]);
  if (d) {
    while ((dir = readdir(d)) != NULL) {
      if (dir->d_type == DT_REG) {
        int x = atoi(dir->d_name + 2);
        char *second_dot = strchr(dir->d_name + 2, '.');
        int z = atoi(second_dot + 1);
        if (images_count >= max_images_count) {
          increase_max_images_count();
        }
        images[images_count].x = x;
        images[images_count].z = z;
        images_count++;
        printf("%s %d %d\n", dir->d_name, x, z);
      }
    }
    closedir(d);
  }

  mkdir(output_dir, 0700);
  fmt(output_dir_level_0, "%s/0", output_dir);
  mkdir(output_dir_level_0, 0700);

  dprintf("Output name %s\n", output_dir_level_0);

  for (int i = 0; i < images_count; i++) {
    dprintf("Starting to processs %d %d\n", images[i].x, images[i].z);
    thrd_create(&images[i].thread, handle_region, &images[i]);
  }

  for (int i = 0; i < images_count; i++) {
    thrd_join(images[i].thread, NULL);
    printf("Finished %d %d\n", images[i].x, images[i].z);
  }

  // levels

  map_image *previous_images = images;
  int previous_image_count = images_count;

  for (int level = 1; level < 17; level++) {
    fmt(level_folder, "%s/-%d", output_dir, level);
    mkdir(level_folder, 0700);
    map_image *new_images = calloc(previous_image_count, sizeof images[0]);
    int new_images_count = 0;
    produce_zoomed_out_image_args *arguments = malloc(previous_image_count * sizeof(produce_zoomed_out_image_args));
    for (int i = 0; i < previous_image_count; i++) {
      if (previous_images[i].finished_zoom) {
        continue;
      }
      int x = floor_div(previous_images[i].x, 2);

      int z = floor_div(previous_images[i].z, 2);

      new_images[new_images_count].x = x;
      new_images[new_images_count].z = z;

      arguments[new_images_count].level = level;
      arguments[new_images_count].output = &new_images[new_images_count].data;
      arguments[new_images_count].x = x;
      arguments[new_images_count].z = z;
      arguments[new_images_count].previous_images[0][0] = find_image_data(previous_images, previous_image_count, x * 2, z * 2);
      arguments[new_images_count].previous_images[0][1] = find_image_data(previous_images, previous_image_count, x * 2 + 1, z * 2);
      arguments[new_images_count].previous_images[1][0] = find_image_data(previous_images, previous_image_count, x * 2, z * 2 + 1);
      arguments[new_images_count].previous_images[1][1] = find_image_data(previous_images, previous_image_count, x * 2 + 1, z * 2 + 1);

      thrd_create(&new_images[new_images_count].thread, produce_zoomed_out_image, &arguments[new_images_count]);

      new_images_count++;
    }

    for (int i = 0; i < new_images_count; i++) {
      thrd_join(new_images[i].thread, NULL);
    }

    free(previous_images);
    previous_images = new_images;
    previous_image_count = new_images_count;
    free(arguments);
  };
}