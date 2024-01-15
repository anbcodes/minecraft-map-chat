# Tile Server

This server is meant to be run by the java plugin, but technically can stand
alone.

Development:

- `npm install`
- `npm run build`
- `node server.js [...args]` or `./server-[arch] [...args]`

## Technical Details

The server communicates with the java plugin using stdin/stdout. It hosts the
files in `./client.zip` (generated from [/client](/client/)) and runs a
websocket server for live chat and locations.
