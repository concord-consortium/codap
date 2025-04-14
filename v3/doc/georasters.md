# Geo Rasters
CODAP supports adding a layer to the map which displays an image projected onto the map. Currently this image must be a PNG with a palette. It is only supported via the CODAP plugin API. You can test it by:
1. Add the Plugin API Tester to a CODAP document:
https://concord-consortium.github.io/codap-data-interactives/DataInteractiveAPITester/index.html?lang=en
2. Add a map to the CODAP document
3. Send a message to CODAP like the examples below.

## Example CODAP messages

### Rainfall

0.5 deg resolution:
```json
{
  "action": "update",
  "resource": "component[Map]",
  "values": {
    "geotiffUrl": "https://neo.gsfc.nasa.gov/servlet/RenderData?si=1990677&cs=rgb&format=PNG&width=720&height=360"
  }
}
```

0.25 Resolution
```json
{
  "action": "update",
  "resource": "component[Map]",
  "values": {
    "geotiffUrl": "https://neo.gsfc.nasa.gov/servlet/RenderData?si=1990677&cs=rgb&format=PNG&width=1440&height=720"
  }
}
```

0.1 Resolution
```json
{
  "action": "update",
  "resource": "component[Map]",
  "values": {
    "geotiffUrl": "https://neo.gsfc.nasa.gov/servlet/RenderData?si=1990677&cs=rgb&format=PNG&width=3600&height=1800"
  }
}
```

### Other datasets
You can try other datasets by:
1. Find a dataset here: https://neo.gsfc.nasa.gov/dataset_index.php
2. Choose the year and month of interest.
3. Make sure the File Type is PNG.
4. Right click on the resolution of interest and select Copy Link Address.
5. Replace the `geotiffUrl` in the one of the messages above.

## What about GeoTIFFs
We initially tried to support real GeoTIFFs. They include information about the position of the raster in the world, and what map projection the raster is using. So they would be a more self contained way of sending map rasters to CODAP. However the libraries we found to support them seem to be buggy. Additionally the the size of the GeoTIFFs is a bit larger than PNGs.

All of the Leaflet libraries we found use the [geotiff.js](https://github.com/geotiffjs/geotiff.js) library underneath.

This library is popular, but seems to be sporadically maintained. There are a few open PRs that seem reasonable but don't have any responses from the maintainer. Meanwhile there are PRs that have been merged recently.

We found that it crashes when trying to load some images from https://neo.gsfc.nasa.gov. For example: https://neo.gsfc.nasa.gov/servlet/RenderData?si=1990677&cs=rgb&format=TIFF&width=720&height=360 This file will cause node.js to crash with a native stack trace. When geotiff.js is used in the browser the error message about this file is more useful. If there is time and support it would probably be worthwhile for us to track down the issue and fix geotiff.js so CODAP can support GeoTIFFs.

Besides this error we've seen errors just downloading the GeoTIFFs. Most likely these errors will occur with PNGs too. Probably the fetching of the image needs to be updated to automatically retry when there is an error.
