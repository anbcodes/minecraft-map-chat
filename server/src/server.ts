import send from "@fastify/send";
import fastifyStatic from "@fastify/static";
import AdmZip from "adm-zip";
import fastify from "fastify";
import { join } from "path";
import { createInterface } from "readline";
import fastifyWebsocket from "@fastify/websocket";
import { WebSocket } from "ws";
import { spawn } from "child_process";
import { mkdirSync } from "fs";

// Arguments

let overworldRegionFolder = process.argv[2];
let netherRegionFolder = process.argv[3];
let endRegionFolder = process.argv[4];
let dataFolder = process.argv[5];
let host = process.argv[6] ?? '0.0.0.0';
let port = +(process.argv[7] ?? 14367);

let playerMovedSinceLastUpdate = false;
const outOverworld = join(dataFolder, 'tiles', 'overworld');
const outNether = join(dataFolder, 'tiles', 'nether');
const outEnd = join(dataFolder, 'tiles', 'end');
mkdirSync(outOverworld, { recursive: true });
mkdirSync(outNether, { recursive: true });
mkdirSync(outEnd, { recursive: true });

const spawnAsync = (command: string, args: string[]) => new Promise<number | null>(resolve => spawn(command, args).on('exit', (code) => resolve(code)))

async function generateTiles() {
  const exec = join(dataFolder, 'image-generator')

  await Promise.all([
    spawnAsync(exec, [overworldRegionFolder, outOverworld]),
    spawnAsync(exec, [netherRegionFolder, outNether]),
    spawnAsync(exec, [endRegionFolder, outEnd]),
  ]);

  playerMovedSinceLastUpdate = false;
}

(async () => {
  // const logFile = '/home/andrew/Code/js/minecraft-map/server/log.txt';

  const log = (...str: any[]) => {
    const message = str.map(v => v.toString()).join(' ');
    message.split('\n').forEach(v => {
      sendCommand('log', v);
    })
  }

  process.on('uncaughtException', function (err) {
    log((err && err.stack) ? err.stack : err);
  });


  const sendCommand = (...str: string[]) => {
    console.log(str.join(' '));
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  })

  log("starting...");

  log("region folders", overworldRegionFolder, netherRegionFolder, endRegionFolder);

  let zip = new AdmZip(join(dataFolder, 'client.zip'))

  let clientFiles = Object.fromEntries(zip.getEntries().map(e => [e.entryName, e.getData()]));

  const server = fastify();

  await server.register(fastifyStatic, {
    root: join(dataFolder, 'tiles'),
    prefix: '/tiles',
  })

  await server.register(fastifyWebsocket);

  const defaultType = 'application/octet-stream'


  function getContentType(path: string) {
    const type = send.mime.getType(path) || defaultType

    if (!send.isUtf8MimeType(type)) {
      return type
    }
    return `${type}; charset=UTF-8`
  }

  let connections: WebSocket[] = []

  server.get('/socket', { websocket: true }, (conn, req) => {
    connections.push(conn.socket);
    conn.socket.on('message', (raw) => {
      //@ts-ignore
      const msg = JSON.parse(raw);

      if (msg.type === 'chat') {
        sendCommand('chat', msg.player, msg.message);
        broadcast({
          ...msg,
          message: `"${msg.message}"`,
        });
      } else if (msg.type === 'exec') {
        sendCommand('execas', msg.player, msg.message);
      }
    })
  })

  server.get('/*', (req, rep) => {
    let path = req.originalUrl;
    if (path === '/') {
      path = '/index.html';
    }
    if (clientFiles[path.slice(1)]) {
      rep.header('content-type', getContentType(path.slice(1)));
      rep.send(clientFiles[path.slice(1)]);
    }
  })

  const broadcast = (msg: any) => connections.forEach(c => c.send(JSON.stringify(msg)));


  try {

    await generateTiles();

    setInterval(async () => {
      if (!playerMovedSinceLastUpdate) {
        return;
      }
      playerMovedSinceLastUpdate = false;
      log("Updating files");
      await generateTiles();
      log("Finished update");

      setTimeout(() => {
        sendCommand("exec save-all");
      }, 1000 * 30)
    }, 1000 * 60);

    log(`Listening at http://${host}:${port}`);
    await server.listen({ port, host });

  } catch (err) {
    log("error", err);
    process.exit(1)
  }


  for await (const line of rl) {
    const [type, ...rest] = line.split(' ');
    if (type === 'chat') {
      broadcast({
        type: 'chat',
        player: rest[0],
        message: rest.slice(1).join(' '),
      })
    } else if (type === 'm') {
      playerMovedSinceLastUpdate = true;
      broadcast({
        type: 'move',
        player: rest[0],
        x: +rest[1],
        y: +rest[2],
        z: +rest[3],
        yaw: +rest[4],
        pitch: +rest[5],
        dim: rest[6],
      })
    } else if (type === 'leave') {
      broadcast({
        type: 'leave',
        player: rest[0],
      })
    }
  }

})();

