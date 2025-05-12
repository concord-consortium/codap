# Geo Rasters
CODAP supports adding a layer to the map which displays an image projected onto the map. Currently this image must be a PNG. It is only supported via the CODAP plugin API. You can test it by:
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

The image is assumed to span the whole globe from -90 to 90 latitude and -180 to 180 longitude. The image is also assumed to be in an EPSG 4326 "projection".

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

This library is popular, but it is difficult to get a handle on how it is maintained. There are a few open PRs that seem reasonable but don't have any responses from the maintainer. Meanwhile there are several PRs that have been merged recently with very little discussion. It looks like the maintainer trusts certain contributors or there is another channel where communication about the PRs is happening.

We found that it crashes when trying to load some images from https://neo.gsfc.nasa.gov. For example: https://neo.gsfc.nasa.gov/servlet/RenderData?si=1990677&cs=rgb&format=TIFF&width=720&height=360 This file will cause node.js to crash with a native stack trace. When geotiff.js is used in the browser the error message about this file is more useful. If there is time and support it would probably be worthwhile for us to track down the issue and fix geotiff.js so CODAP can support GeoTIFFs.

Besides this error we've seen errors just downloading the GeoTIFFs.

## Projections

EPSG 4326 is the "projection" where each x,y coordinate represents a lat,long coordinate. It might be in different scales so a pixel might be one degree, 0.5 degrees, ...

EPSG 3857 is the "google maps" projection where things are stretched vertically as you go more north or south from the equator. The stretching is done so the distance in meters at a point stays the same both vertically and horizontally.

## Performance

Originally we used the georaster-layer-for-leaflet and png-codec packages to implement this. These had some performance issues which were fixed by bringing this code into CODAP and significantly modifying it.

The speed of the rendering will vary depending on the zoom level of the map. When zoomed in the rendering inner loop has fewer raster pixels to iterate over.

### Notes on georaster-layer-for-leaflet package with png-codec

The creation of the GeoRaster for each 0.5 degree per pixel image took around 40ms. This was mostly taken up by the png fetching from cache (11ms), the png decoding (20ms), converting the decoded pixels to the GeoRaster format (8ms).

Then this GeoRaster was either used to create a new GeoRasterLayer or update an existing GeoRasterLayer. Each tile location in Leaflet asks the GeoRasterLayer to create a tile for this location and render this tile. On the full map view there are 3 tiles which are really the same image repeated 3 times. The total time for all of this rendering was around 110ms.

These times were calculated using the Chrome dev tools profile tool along with some `performance.measure(...)` calls in the code.

Another way to profile was by looking at what speed the images can be cycled through and still give consistent updates:
- For the default map (full world view with repeats), we could update at a rate of 6 images a second before the updates started to fall behind. This matched up with the 150ms total time described above.
- For a map zoomed into just North America, it could go about 15 frames a second. So that was around 67 ms rendering time for each image.

Note that in the North America view the creation of the GeoRaster should have taken the same amount of time as with the full world view. That means that the 40ms to create the GeoRaster really dominated the total time on the North America view.

#### Flicker
Originally we were creating a new GeoRasterLayer on each image update. This layer was not removed until the new GeoRaster was successfully created. However this still resulted in a flicker because the layer's tiles would be hidden instantly and the drawing of the new tiles would happen async over 20ms to 110ms. So this resulted in a pretty bad flicker.

Now the GeoRasterLayer is updated if it can be instead of making a new layer. This eliminated one reason for the flicker, but then exposed another issue. In the georaster-layer-for-leaflet package the `GeoRasterLayer.drawTile` method sets the width and height of the canvas of the tile even if width and height don't change. As documented by MDN, setting either of these properties automatically clears the canvas even if the values are the same.

This was fixed in the `georaster-layer-leaflet.ts` module that is part of CODAP.

### Canceling
When the geoRaster is updated too quickly, the fetching and decoding of the geoRaster might not complete before the next updated. Additionally within the `GeoRasterLayer.drawTile` the actual rendering happens async after the initial canvas configuration, so this might also not have completed. The code currently bails out of the fetching and decoding if the geoRaster URL has changed during the fetch or decoding.

This could be further improved by bailing out of `GeoRasterLayer.drawTile` if the url has changed.

### Notes
- the "resolution" of the GeoRasterLayer can be changed. This ought to speed up its rendering, but the "raster pixel" edges shown when zoomed in won't match up as well with the actual "raster pixels".
- for the absolute fastest rendering we would need to pre-render the projected geo-raster so the map is just displaying a tile source like any other tile source. However this would require a lot of storage and more network bandwidth as the user is zooming in and out. So in the end it might not be worth it.

# Javascript Size
When this feature was being developed the size of main CODAP javascript bundled file was 6.6MB before the feature was added.

Initially the georaster-layer-for-leaflet package was used along with png-codec to load in the png image. This approach caused the main javascript file to go up to 7.2MB. So about a 600KB increase.

The georaster-layer-for-leaflet code was brought into CODAP directly and stripped down so it no longer supports lots of different types of projections which required the Proj4j package. Additionally the png-codec package was replaced with loading the png into a canvas. These changes improved the speed of the geo raster support. They also brought the size of the main javascript down to 6.7MB. So about a 100KB increase.

The extra size could be reduced further by looking at the use of snap package by georaster-layer-for-leaflet. This snap package uses the preciso, regenerator-runtime, and snap-bb all of which are probably unnecessary and add around 24KB.
