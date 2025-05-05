# Geo Rasters
CODAP supports adding a layer to the map which displays an image projected onto the map. Currently this image must be a PNG with a palette. It is only supported via the CODAP plugin API. You can test it by:
1. Add the Plugin API Tester to a CODAP document:
https://concord-consortium.github.io/codap-data-interactives/DataInteractiveAPITester/index.html?lang=en
2. Add a map to the CODAP document
3. Send a message to CODAP like the examples below.

## JSON format

```json
"geoRaster": {
    "url": "url_to_image",
    "type": "png",
    "opacity": 0.5,
}
```

The `opacity` is optional and defaults to `0.5`.

The image is assumed to be span the whole globe from -90 to 90 latitude and -180 to 180 longitude. The image is also assumed to be in an EPSG 4326 "projection".

## Example CODAP messages

### Rainfall

0.5 deg resolution:
```json
{
  "action": "update",
  "resource": "component[Map]",
  "values": {
    "geoRaster": {
      "type": "png",
      "url": "https://models-resources.concord.org/neo-images/v1/GPM_3IMERGM/720x360/2007-09-01.png"
    }
  }
}
```

0.25 Resolution
```json
{
  "action": "update",
  "resource": "component[Map]",
  "values": {
    "geoRaster": {
      "type": "png",
      "url": "https://neo.gsfc.nasa.gov/servlet/RenderData?si=1990677&cs=rgb&format=PNG&width=1440&height=720"
    }
  }
}
```

0.1 Resolution
```json
{
  "action": "update",
  "resource": "component[Map]",
  "values": {
    "geoRaster": {
      "type": "png",
      "url": "https://neo.gsfc.nasa.gov/servlet/RenderData?si=1990677&cs=rgb&format=PNG&width=3600&height=1800"
    }
  }
}
```

### Other datasets
You can try other datasets by:
1. Find a dataset here: https://neo.gsfc.nasa.gov/dataset_index.php
2. Choose the year and month of interest.
3. Make sure the File Type is PNG.
4. Right click on the resolution of interest and select Copy Link Address.
5. Replace the `geoRaster.url` in one of the messages above.

## What about GeoTIFFs
We initially tried to support real GeoTIFFs. They include information about the position of the raster in the world, and what map projection the raster is using. So they would be a more self contained way of sending map rasters to CODAP. However the libraries we found to support them seem to be buggy. Additionally the the size of the GeoTIFFs is a bit larger than PNGs.

All of the Leaflet libraries we found use the [geotiff.js](https://github.com/geotiffjs/geotiff.js) library underneath.

This library is popular, but seems to be sporadically maintained. There are a few open PRs that seem reasonable but don't have any responses from the maintainer. Meanwhile there are PRs that have been merged recently.

We found that it crashes when trying to load some images from https://neo.gsfc.nasa.gov. For example: https://neo.gsfc.nasa.gov/servlet/RenderData?si=1990677&cs=rgb&format=TIFF&width=720&height=360 This file will cause node.js to crash with a native stack trace. When geotiff.js is used in the browser the error message about this file is more useful. If there is time and support it would probably be worthwhile for us to track down the issue and fix geotiff.js so CODAP can support GeoTIFFs.

Besides this error we've seen errors just downloading the GeoTIFFs. Most likely these errors will occur with PNGs too. Probably the fetching of the image needs to be updated to automatically retry when there is an error.

## Projections

EPSG 4326 is the "projection" where each x,y coordinate represents a lat,long coordinate. It might be in different scales so a pixel might be one degree, 0.5 degrees, ...

EPSG 3857 is the "google maps" projection where things are stretched vertically as you go more north or south from the equator. The stretching is done so the distance in meters at a point stays the same both vertically and horizontally.

## Performance

When looking at the timing when the map is showing the full world with horizontal repeats so the full north and south range can be seen, the biggest performance issue seems to be in the GeoRasterLayer when it is rendering the image for each of the requested Leaflet tiles.

The creation of the GeoRaster for each image takes around 40ms. This is mostly taken up by the png fetching from cache (11ms), the png decoding (20ms), converting the decoded pixels to the GeoRaster format (8ms). The png decoding could probably be reduced by using a canvas to decode the png instead of a pure javascript decoder. This canvas approach is used in the neo-codap-plugin.

Then this GeoRaster is either used to create a new GeoRasterLayer or update an existing GeoRasterLayer. Each tile location in Leaflet asks the GeoRasterLayer to create a tile for this location and render this tile. On the full map view there are 3 tiles which are really the same image repeated 3 times. The total time for all of this rendering is around 110ms.

These times were calculated using the Chrome dev tools profile tool along with some `performance.measure(...)` calls in the code.

Another way to profile is by looking at what speed the images can be animated and still give consistent updates:
- For the default map (full world view with repeats), the slider can go at about 6 images a second before the updates start to fall behind. This matches up with the 150ms total time described above.
- For a map zoomed into just North America, it can go about 15 frames a second. So that is around 67 ms rendering time for each image.

Note that in the North America view the creation of the GeoRaster should take the same amount of time as with the full world view. That means that the 40ms to create the GeoRaster really dominates the total time on the North America view.

### Flicker
Originally we were creating a new GeoRasterLayer on each image update. This layer was not removed until the new GeoRaster was successfully created. However this still resulted in a flicker because the layer's tiles would be hidden instantly and the drawing of the new tiles would happen async over 20ms to 110ms. So this resulted in a pretty back flicker.

Now the GeoRasterLayer is updated if it can be. This reduces the flicker, but it still exists. Now the problem is in the `GeoRasterLayer.drawTile` method. This method sets the width and height of the canvas of the tile even if they aren't changed. Setting either of these properties automatically clears the canvas.

Fixing this requires a change to `GeoRasterLayer.drawTile`, so we either need our own fork of that code or submit a PR.

### Canceling
When the geoRaster is updated too quickly, the fetching and decoding of the geoRaster might not complete before the next updated. Additionally within the `GeoRasterLayer.drawTile` the actual rendering happens async after the initial canvas configuration, so this might also not have completed. The code currently bails out of the fetching and decoding if the geoRaster URL has changed during the fetch or decoding.

This could be further improved by actually canceling the fetch. And if we can make changes to `GeoRaster.drawTile` we could also have it bail out.

### Notes
- the current png decoder is wasting time and memory by returning r,g,b values which we then convert back into palette indexes.
- the png decoder could be replaced with a canvas based decoding like with the neo-codap-plugin does, however this would continue to give us r,g,b values which we either need to convert back to palette indexes or waste space and have the GeoRasterLayer work with r,g,b values instead of palette indexes.
- the GeoRasterLayer is pretty optimized since it gets faster when rendering more zoomed in tiles. This is because it is actually drawing rectangular regions instead of pixel by pixel.
- the "resolution" of the GeoRasterLayer could be reduced this ought to speed up its rendering, but the "raster blocks" shown when zoomed in won't match up as well with the actual "raster blocks".
- look for projection options which use a WebGL canvas, these should be able to leverage parallel processing to optimize the projection.
- consider storing the data files "pre-projected" so no client processing is needed to draw them, and just some simple math is needed to find the value at a lat-long for the datasets. The problem with this approach is that we'd have to render multiple tiles for each image of the dataset so the lines are correct as the student zooms in and out. So this means more storage and network used up for all of these tiles.

# Size
From my notes before the main js file was 6.6MB at the base of this PR.
When the georaster-layer-for-leaflet library it went up to 7.2MB.
With changes which remove the direct dependency from georaster-layer-from-leaflet on Proj4j it remained at 7.2MB. This is because the GeoExtent library also used Proj4j indirectly.
With our custom GeoExtent class the main js file when down to 6.8MB. Some of the libraries which are contributing to this size: png-codec (39KB), pako (46KB) brought in by png-codec, preciso (12KB) brought in by the snap library, regenerator-runtime (6.5KB), snap-bb (5.8KB)
