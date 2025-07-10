// ==========================================================================
//  
//  Author:   jsandoe
//
//  Copyright (c) 2017 by The Concord Consortium, Inc. All rights reserved.
//
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.
// ==========================================================================
/*global require:true */
var Rsvg = require('librsvg').Rsvg;
var btoa = btoa || require('btoa');
var fs = require('fs');
var merc = require('mercator-projection');
// var st = require('geojson-bounds');
var console = require('console');
/*global process:true, Buffer:true */
var progName = process.argv[1];

/**
 * print usage and exit
 */
function usage () {
  console.error('usage: node ' + progName + ' codap-geojson-file.codap');
  process.exit(1);
}

/**
 * Amend a CODAP file with geojson to add a thumbnail representation of each
 * geojson element. The thumbnail is a data uri encoding of a png file 200x200 pixels.
 * The thumbnail should be accurately proportioned for a Mercator projection
 * along the mid-line of the figure.
 */

(function () {
  var kGeometryTypes = {
    Point:true,
    MultiPoint:true,
    LineString:true,
    MultiLineString:true,
    Polygon:true,
    MultiPolygon:true,
    GeometryCollection:true
  };

  /**
   * Attempts to read the CODAP file, parse it, and verify that it has the expected
   * structure.
   *
   * @param {string} fn filename
   * @return {Object | null}
   *
   * To determine if the file is a CODAP file, we verify "appName"=="DG" and that
   * there is "appVersion", "appBuild", contexts, and components at the top level.
   * In addition the CODAP files for this purpose are expected to have exactly
   * one data context with two collections,
   * boundaries and index. The collection "boundaries" has one attribute, "boundary"
   * with Geojson content.
   */
  function readAndVerifyCODAPFile(fn) {
    var objString = fs.readFileSync(fn, {encoding: 'utf8'});
    var obj;
    try {
      obj = JSON.parse(objString);
    } catch (ex) {console.error(ex);}
    var hasCODAPFields = obj &&
        obj.appName === 'DG' &&
        obj.appVersion &&
        obj.appBuildNum &&
        obj.contexts &&
        obj.components
    ;
    var context = hasCODAPFields && obj.contexts[0];
    var collection = context && context.collections.find(function(c) { return c.name === 'boundaries';});
    var attr = collection && collection.attrs.find(function(attr) {return attr.name === 'boundary';});
    if (hasCODAPFields && attr) {
      return obj;
    } else {
      console.error('File is not properly formatted CODAP boundary file: ' + fn + ' ' + [!!obj, !!hasCODAPFields, !!context, !!collection, !!attr].join());
    }
  }

  function renderGeoJSONToSVG(geojson) {
    var refLng = null;
    var bBox = {
      xMin: Number.MAX_VALUE,
      yMin: Number.MAX_VALUE,
      xMax: -Number.MAX_VALUE,
      yMax: -Number.MAX_VALUE
    };

    function adjustBBox(pt) {
      bBox.xMin = Math.min(pt.x, bBox.xMin);
      bBox.yMin = Math.min(pt.y, bBox.yMin);
      bBox.xMax = Math.max(pt.x, bBox.xMax);
      bBox.yMax = Math.max(pt.y, bBox.yMax);
    }

    function latLongToXY(coord) {
      return merc.fromLatLngToPoint(adjustForAntimeridian({lat: coord[1], lng: coord[0]}));
    }

    function renderPoint(coord) {
      if (coord) {
        return '<circle r="3" cx="' + coord[0] + '" cy="' + coord[1] + '" />';
      }
    }
    function renderLine(coords) {
      var start = coords.shift();
      var pathDef = 'M' + start.x + ',' + start.y + ' L' + coords.map(function (pt, ix){
          return pt.x + ' ' + pt.y + ' ';
      }).join();
      return '<path stroke-width="1" stroke="blue" d="' + pathDef + '" />';
    }
    function renderPolygon(coords) {
      var pathDef = coords.map(function (linearRing) {
        var start = linearRing.shift();
        var pathDef = 'M' + start.x + ',' + start.y + ' L' + linearRing.map(function (pt, ix){
          return pt.x + ' ' + pt.y + ' ';
        }).join();
        return pathDef;
      }).join();
      var svg = '<path stroke-width="0" fill="blue" d="' + pathDef + '"/>';
      return svg;
    }
    function adjustForAntimeridian(coord) {
      if (!coord) {
        return;
      }
      if (refLng === null) {
        refLng = coord.lng;
      } else if (Math.abs(coord.lng - refLng)>180) {
        coord.lng += (refLng>=0?360:-360);
      }
      return coord;
    }
    var renderers = {
      Point: function (geojson) {
        var coord = latLongToXY(geojson.coordinates);
        adjustBBox(coord);
        return renderPoint(coord);
      },
      MultiPoint: function (geojson) {
        var coords = geojson.coordinates;
        var dots = coords.map(function (coord) {
          var xyCoord = latLongToXY(coord);
          adjustBBox(coord);
          return renderPoint(xyCoord);
        });
        return dots.join('');
      },
      LineString: function (geojson) {
        var coords = geojson.coordinates;
        var xys = coords.map(function(coord) {
          var xy = latLongToXY(coord);
          adjustBBox(xy);
          return xy;
        });
        var svg = renderLine(xys);
        return svg;
      },
      MultiLineString: function (geojson) {
        var lines = geojson.coordinates;
        var svg = lines.map(function (line) {
          return renderers.LineString({coordinates: line });
        }).join('');
        return svg;
      },
      Polygon: function (geojson) {
        var coords = geojson.coordinates;
        var xys = coords.map(function(lineString) {
          return lineString.map(function(coord) {
            var xy = latLongToXY(coord);
            adjustBBox(xy);
            return xy;
          });
        });
        var svg = renderPolygon(xys);
        return svg;
      },
      MultiPolygon: function(geojson) {
        var polygons = geojson.coordinates;
        var svg = polygons.map(function (polygon) {
          return renderers.Polygon({coordinates: polygon });
        }).join('');
        return svg;
      },
      GeometryCollection: function (geojson) {
        var geometries = geojson.geometries;
        geometries.map(function(geometry) {
          var fn = renderers[geometry.type];
          if (!fn) {
            console.log("Unknown type: " + geometry.type);
          }
          return fn(geometry);
        }).join('');
      },
      Feature: function (geojson) {
        var geometry = geojson.geometry;
        var fn = renderers[geometry.type];
        if (!fn) {
          console.log("Unknown type: " + geometry.type);
        }
        return fn(geometry);
      },
      FeatureCollection: function (geojson) {
        var features = geojson.features;
        var svg = features.map(function (feature) {
          return renderers.Feature(feature);
        }).join();
        return svg.join('');
      }
    };
    if (!geojson) {
      return;
    }
    var fn = renderers[geojson.type];
    if (!fn) {
      console.log("Unknown type: " + geojson.type);
      return;
    }
    var svg = fn(geojson);
    var imgW = bBox.xMax-bBox.xMin;
    var imgH = bBox.yMax-bBox.yMin;
    var delta = (imgW - imgH) / 2;
    var x,y,w,h;
    if (delta < 0) {
      x = bBox.xMin - delta;
      y = bBox.yMin;
      w = imgW + (delta * 2);
      h = imgH;
    } else {
      x = bBox.xMin;
      y = bBox.yMin - delta;
      w = imgW;
      h = imgH + (delta * 2);
    }
    return '<?xml version="1.0" encoding="UTF-8" ?>' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" ' +
        'viewBox="' + [x, y, w, h].join(' ') + '">' + svg + "</svg>";

  }

  function convertSVGtoPNG(svgText) {
    var svg = new Rsvg(svgText);
    var rendering = new Buffer(svg.render({
      format: 'png',
      width: svg.width,
      height: svg.height
    }).data);
    return rendering;
  }

  function formatAsDataURI(png, mime) {
    var out = 'data:' + mime + ';base64,' + btoa(png);
    return out;
  }

  var codapFile = process.argv[2];
  if (!codapFile) { usage(); }
  var codapDoc = readAndVerifyCODAPFile(codapFile);
  if (codapDoc) {
    var collection = codapDoc.contexts[0].collections.find(function(c) { return c.name === 'boundaries';});
    collection.cases.forEach(function (iCase) {
      try {
        var boundary = iCase.values.boundary;
        var isParsed = true;
        if (typeof boundary === 'string' && boundary.startsWith('{')) {
          boundary = JSON.parse(boundary);
          isParsed = false;
        }
        if (!boundary) {
          return;
        }
        // GeoJSON does not require any particular top-level type, but we need
        // to add a property so, we wrap 'naked' geoJSON in a Feature type.
        if (kGeometryTypes[boundary.type]) {
          boundary = {
            type: 'Feature',
            properties: {},
            geometry: boundary
          };
        }
        var svg = renderGeoJSONToSVG(boundary);
        // console.log(svg);
        var png = svg && convertSVGtoPNG(svg);
        var dataURI = png && formatAsDataURI(png, 'image/png');
        if (dataURI) {
          if (!boundary.properties) { boundary.properties = {}; }
          boundary.properties.THUMB = dataURI;
          if (!isParsed) {
            boundary = JSON.stringify(boundary);
          }
          iCase.values.boundary = boundary;
        }
      } catch (ex) {
        console.error(ex);
      }
    });
  }
  console.log(JSON.stringify(codapDoc));

}());
