# What is this for?
The goal of this project is to map out "effective" coverage of a MeshCore mesh.
The MeshCore client app will already tell you whether a repeater heard your message,
but that doesn't really tell you much. Did it actually go anywhere? Did anyone else
receive it? By using MQTT data from prominent observer nodes, this helps visualize
that places where a sent message will be widely received.

## What this is not
This is not intended to be a general purpose "repeater coverage" map. It's also not
meant to support multiple regions in the same map. What would a green tile even mean
if messages made it to one part of the map but not the whole map?

# How this works
There are 4 parts to this service.
1) The MQTT observer network. This is outside the scope of this project. If you don't
already have this infrastructure set up for you mesh, you have to start there.
    1) It _is_ possible to run this using your own radio as a makeshift observer, but
    only if that radio is in a location that would be considered "central" to your mesh.
    2) For the PNW mesh, this uses the MQTT feed hosted [here](https://analyzer.letsme.sh/about).
2) The backend service. This is a Cloudflare Pages app that uses KV for storage. This
is reasonably easy to set up and you can get started for free to test things out. You
will absolutely need a paid subscription if you want others to contribute. It's $5/month.
3) Batch script. This runs hourly to consolidate Samples into Coverage and perform other
housekeeping tasks. This just call the service, but Cloudflare doesn't have a place
to host something like a cron job so I use a Linux machine I have.
4) A companion radio and the web app. This is the client part. You run the web app and
drive around. Samples (a.k.a. Pings) are sent to the service.

## Basic flow
1) Client sends a Ping containing the current location to the mesh and the service.
The location is the shared "key" for a ping.
2) If the Ping is received by the MQTT observer, the packet is read and the location and
first-hop repeater are extracted from the packet.
3) The Sample item in the service is update with the first-hop repeater. This indicates
a the Ping was heard.
4) The map shows Coverage and Samples - green indicates it was heard (that is the Sample
has values for the repeater), red indicates that the Sample was not heard.

## Terms
* Repeater - it's just a repeater.
* Sample or Ping - a location message sent to the service and the mesh. Pings are what
the client sends. Samples is what it's referred to on the service-side.
* Coverage or Tile - a tile on the map. Samples are consolidated into Tiles for efficiency.
* Geohash - A way to encode location. The service stores Samples and Coverage using Geohash.
8 digits are used to encode Samples. This gives ~5m accuracy. 6 digits encode a tile. The
magic bit of Geohash is that to find the Coverage item for a Sample just remove the last
two digits.

# Setup
## MQTT
You're on your own here. There are lots of docs online. Definitely check out
[letsme.sh](https://analyzer.letsme.sh/about).

## Cloudflare
You need a Cloudflare account - you can start with a free account for testing.
You also need a GitHub account. The app is automatically deployed from the main branch.
1) Fork the [project](https://github.com/kallanreed/mesh-map).
2) Create the new Pages app and point it at the repo.
3) Create the required KV namespaces.
  1) mesh-map-samples
  2) mesh-map-repeaters
  3) mesh-map-coverage
  4) mesh-map-old-samples
4) Each of the KV namespaces will have an id. Update the wrangler.jsonc with your ids.
Leave the binding names alone. Those are the names used in the code.
5) Change the host in functions/slurp to your host. This is kind of optional because
'slurp' is only used to pull service data locally for local testing.
6) There are some hard coded constants in content/shared_npm.js that need to be updated.
  * centerPos - the center of your map.
  * maxDistanceMiles - how far out you want to consider "in" your region.
  * Use `npx esbuild content/shared_npm.js --bundle --format=esm --outfile=content/shared.js` to regen the samples.js bundle.
7) Commit your changes to git and push. Cloudflare should pick up your changes
and deploy to your Pages app.

## MQTT Client
Under the support/mqtt folder are the scripts that you need to run somewhere. Get a Linux
VM somewhere get a python environment set up. Use systemd to set the scripts to run as
services that start on boot. The systemd files are there for reference. Once you have
the services running, use journalctl to watch the logs.

### Files to modify
* config.json has per-instance config that you need to modify.
  * mqtt_host - where the MQTT client will connect.
  * mqtt user/pass - creds for the MQTT client to use to connect to the host.
  * service_host - your Pages app host.
  * center_pos - the center of your map.
  * valid_dist - radius in miles considered "in" your region.
  * channel hash/secret - the mesh channel to read from. "#wardrive" by default and feel free to use that.
  * watched_observers - the repeater names of the observers that are considered
  "official". Remember, the point is to pick observers that indicate a message was
  shared with your whole region. If an observer is off in its own little corner, the
  map would show a green tile for an area that wouldn't reach the whole mesh.

### Python Setup
TODO - but basically use venv to create a virtual environment, activate it, and then
`pip install` all the imports in the two .py files.

