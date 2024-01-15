# Minecraft Map Chat Client

The web client for the map. Use `npm run build` to build it.

## Development

Run `npm run dev` in one terminal to build the `index.ts` file, and run
`cd public && vite .` in another terminal to host the dev server.

If you want to see the map while testing put the generated images in
./public/tiles

## Photos

![Map](/photos/map.png)

![chat](/photos/chat.png)

![end zoomed out](/photos/end-zoomed-out.png)

## Technical details

Renders a map using leaflet.js. It also supports live chat and locations using a
websocket connection.
