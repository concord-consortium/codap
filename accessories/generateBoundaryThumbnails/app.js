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
    var paths = [],
        bBox = {
          xMin: Number.MAX_VALUE,
          yMin: Number.MAX_VALUE,
          xMax: -Number.MAX_VALUE,
          yMax: -Number.MAX_VALUE
        };

    function recurseIntoArray(iArray) {
      var tPathString = '',
          tPath, tBox = {
            xMin:Number.MAX_VALUE,
            yMin:Number.MAX_VALUE,
            xMax:-Number.MAX_VALUE,
            yMax:-Number.MAX_VALUE
          };

      iArray.forEach(function (iElement, iIndex) {
        if (iElement.length && iElement.length > 0) {
          if (!isNaN(iElement[0])) {
            // var pt = {
            //   x: iElement[0],
            //   y: -iElement[1]
            // };
            var pt = merc.fromLatLngToPoint({lat: iElement[1], lng: iElement[0]});
            tBox.xMin = Math.min(pt.x, tBox.xMin);
            tBox.yMin = Math.min(pt.y, tBox.yMin);
            tBox.xMax = Math.max(pt.x, tBox.xMax);
            tBox.yMax = Math.max(pt.y, tBox.yMax);
            if (iIndex === 0) {
              tPathString = 'M' + pt.x + ',' + pt.y + ' L';
            }
            else {
              tPathString += pt.x + ' ' + pt.y + ' ';
            }
          }
          else {
            recurseIntoArray(iElement);
          }
        }
      });
      if (tPathString !== '') {
        tPathString += 'Z';
        tPath = '<path stroke-width="0" fill="blue" d="' + tPathString + '"/>';
        paths.push(tPath);
        bBox = {
          xMin: Math.min(bBox.xMin, tBox.xMin),
          yMin: Math.min(bBox.yMin, tBox.yMin),
          xMax: Math.max(bBox.xMax, tBox.xMax),
          yMax: Math.max(bBox.yMax, tBox.yMax)
        };
      }
    }

    if (Array.isArray(geojson)) {
      for (var i = 0; i < geojson.length; i++) {
        recurseIntoArray(geojson[i].geometry.coordinates);
      }
    } else {
      recurseIntoArray(geojson.geometry.coordinates);
    }


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
        'viewBox="' + [x, y, w, h].join(' ') + '">' + paths.join('') + "</svg>";
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
        var svg = renderGeoJSONToSVG(boundary);
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
