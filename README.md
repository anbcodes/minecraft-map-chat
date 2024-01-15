# Minecraft Map Chat

A plugin that generates a map of your world. Details for each part are in their
respective folders.

## Building

Everything can be built using the following commands

- `cd plugin`
- `./build-other && ./gradlew build`

## About

Minecraft map chat generates a map of your world using the world files. It also
provides a live chat and live player positions.

![Map](/photos/map.png)

![Map zoomed in](/photos/overworld-zoomed-in.png)

![Map zoomed in 2](/photos/overworld-zoomed-in-2.png)

### Live chat

![chat](/photos/chat.png)

### The end

[!end](/photos/end.png)

[!end zoomed out](/photos/end-zoomed-out.png)

## Technical details

Technical details of each part are included in their respective folders.

- [Java Plugin](/plugin)
- [Web Client](/client)
- [Web Server](/server)
- [Map Image Generator](/image-gen/)

The project is made up of these four parts. `./plugin/build-other` embels all
the parts into the plugin. The web server and the image generator are both built
into executable files and the client is bundled into a zip file. The plugin
copies all the parts into the plugin data folder and executes the server
executable. It communicates with the server using stdin/stdout.

The server executable runs a web server which hosts the files in the zipped
client file. It also starts a websocket server for live chat/positions. The
server executable also periodically runs the image generator, which generates
images for a the region files in a folder.
