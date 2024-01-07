import * as L from 'leaflet';
import 'leaflet-rotatedmarker';

const $ = <T extends HTMLElement>(s: string): T => {
  const el = document.querySelector(s);
  if (!el) throw new Error(`${el} not found`);
  return el as T;
}

let map = L.map('map', { crs: L.CRS.Simple, minZoom: -17, maxZoom: 5, zoomControl: false }).setView([0, 0], 0);

let layerConfig = {
  maxZoom: 5,
  maxNativeZoom: 0,
  minZoom: -17,
  minNativeZoom: -16,
  tileSize: 512
}

let overworld = L.tileLayer(
  '/tiles/overworld/{z}/{x}.{y}.png',
  layerConfig,
).addTo(map);

let nether = L.tileLayer(
  '/tiles/nether/{z}/{x}.{y}.png',
  layerConfig,
)

let end = L.tileLayer(
  '/tiles/end/{z}/{x}.{y}.png',
  layerConfig,
)

let display = 'world';

$("#overworld").addEventListener('click', () => {
  overworld.addTo(map);
  nether.remove()
  end.remove()

  display = 'world';
})
$("#nether").addEventListener('click', () => {
  overworld.remove();
  nether.addTo(map);
  end.remove()


  display = 'world_nether';

})
$("#end").addEventListener('click', () => {
  overworld.remove();
  nether.remove()
  end.addTo(map);

  display = 'world_the_end';
})


let cords = $<HTMLDivElement>("#cords");

map.on('mousemove', (ev) => {
  let x = Math.floor(ev.latlng.lat);
  let z = Math.floor(ev.latlng.lng);
  cords.textContent = `${x}, ?, ${z}`;
})

let socket = new WebSocket(((window.location.protocol === "https:") ? "wss://" : "ws://") + window.location.host + "/socket");
// let socket = new WebSocket('ws://192.168.86.100:20001/socket');

let players: Record<string, L.Marker> = {};

let chatMessages = $<HTMLDivElement>("#messages");
let chatInput = $<HTMLInputElement>("#message-input");
let sendButton = $<HTMLButtonElement>("#send");
let changeUsernameButton = $<HTMLButtonElement>("#set-username");
let showChatButton = $<HTMLButtonElement>("#show-chat");
let chatOverlay = $<HTMLDivElement>("#chat");

showChatButton.addEventListener('click', () => {
  if (chatOverlay.style.display === 'flex') {
    chatOverlay.style.display = 'none'
  } else {
    chatOverlay.style.display = 'flex'
  }
})

let username = localStorage.getItem("username") ?? 'anonymous';

changeUsernameButton.addEventListener('click', () => {
  username = prompt('New username') ?? 'anonymous';
  localStorage.setItem("username", username);
});

const sendMessage = () => {
  const message = chatInput.value;
  if (!message) { return; }
  socket.send(JSON.stringify({ type: 'chat', player: username, message }));
  chatInput.value = '';
}

sendButton.addEventListener('click', () => sendMessage());
chatInput.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter') {
    sendMessage();
  }
})

socket.addEventListener('message', (ev) => {
  const data = JSON.parse(ev.data);
  console.log("Got", data);

  if (data.type === 'move') {
    let player = players[data.player];

    if (!player) {
      player = players[data.player] = new L.Marker(L.latLng(-data.z, data.x), {
        title: data.player,
        rotationOrigin: 'center center',
        icon: L.icon({
          iconUrl: '/player_icon.png',
        })
      })
    }

    player.setLatLng(new L.LatLng(-data.z, data.x));
    player.setRotationAngle(data.yaw + 180);

    if (data.dim === display) {
      player.addTo(map);
    } else if (player) {
      player.remove();
    }


  } else if (data.type === 'leave') {
    let marker = players[data.player];
    if (marker) {
      marker.remove();
    }
  } else if (data.type === 'chat') {
    let message = data.message.slice(1, -1);
    let player = data.player;
    let el = document.createElement('div');
    el.id = 'msg';
    el.textContent = `<${player}> ${message}`;
    chatMessages.prepend(el);
  }
})


