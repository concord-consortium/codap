// ==========================================================================
//                          DG.ImageUtilities
//
//  Author:   Jonathan Sandoe
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

/* global Promise */
DG.ImageUtilities = (function () {
  return {

    /**
     * Converts an SVG scene into a png image.
     * @param rootEl {Element} a DOM element. Either HTML or SVG. This routine
     *   will extract SVG elements from this object and place them in the final
     *   image. HTML DOM element will not be visible.
     * @param width {number}
     * @param height {number}
     * @param asDataURL {boolean} true - image returned as data URI, otherwise as blob
     * @return {Promise} The promise of an image.
     */
    captureSVGElementsToImage: function (rootEl, width, height, asDataURL) {

      function getCSSText() {
        var text = [], ix, jx;
        for (ix = 0; ix < document.styleSheets.length; ix += 1) {
          try {
            var styleSheet = document.styleSheets[ix];
            if (styleSheet) {
              var rules = styleSheet.rules || styleSheet.cssRules || [];
              for (jx = 0; jx < rules.length; jx += 1) {
                var rule = rules[jx];
                text.push(rule.cssText);
              }
            }
          } catch (ex) {
            DG.logWarn('Exception retrieving stylesheet: ' + ex);
          }
        }
        return text.join('\n');
      }

      function makeDataURLFromSVGElement(svgEl) {
        var svgClone = $(svgEl).clone();
        var css = $('<style>').text(getCSSText());
        svgClone.prepend(css);
        var svgData = new XMLSerializer().serializeToString(svgClone[0]);
        // Raphael overspecifies the url for the gradient. It prepends the
        // windows.location.href. This causes problems with the data url,
        // because we are no longer in this namespace. So, we remove.
        svgData = svgData.replace(
            new RegExp('url\\(\'[^#]*#', 'g'), 'url(\'#');
        // The use of unescape and encodeURIComponent are part of a well-
        // known hack work around btoa's handling of unicode characters.
        // see, eg:
        // http://ecmanaut.blogspot.com/2006/07/encoding-decoding-utf8-in-javascript.html
        return "data:image/svg+xml;base64,"
            + window.btoa(window.unescape(window.encodeURIComponent(svgData)));
      }

      /**
       * Create a canvas element with a white background. Not yet appended to
       * the DOM.
       * @param {number} width
       * @param {number} height
       * @returns {Canvas}
       */
      function makeCanvasEl(width, height) {
        var canvas = $("<canvas>").prop({width: width, height: height})[0];
        var ctx = canvas.getContext("2d");
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        return canvas;
      }

      /**
       * Add an image to the canvas at the specified location.
       * @param {Canvas} canvas DOM Element
       * @param {img} image DOM Element
       * @param {number} x
       * @param {number} y
       * @param {number} width
       * @param {number} height
       */
      function addImageToCanvas(canvas, image, x, y, width, height) {
        var ctx = canvas.getContext("2d");
        ctx.drawImage(image, x, y, width, height);
      }

      /**
       * Convert a canvas object to a blob.
       * @param canvas
       * @returns {*}
       */
      function makeCanvasBlob(canvas) {
        var canvasDataURL = canvas.toDataURL("image/png");
        var canvasData = atob(canvasDataURL.substring("data:image/png;base64,".length));
        var canvasAsArray = new Uint8Array(canvasData.length);  /* global Uint8Array */

        for (var i = 0, len = canvasData.length; i < len; ++i) {
          canvasAsArray[i] = canvasData.charCodeAt(i);
        }

        return new Blob([canvasAsArray.buffer], {type: "image/png"});
      }

      /**
       * @returns a promise of an image.
       * @param dataURL
       */
      function makeSVGImage(dataURL) {
        return new Promise(function (resolve, reject) {
              try {
                var img = $('<img/>')[0];
                img.onload = function () {
                  resolve(img);
                };
                img.src = dataURL;
              } catch (ex) {
                reject(ex);
              }
            }
        );
      }

      //
      // ######## convertImage begin ########
      //
      // find all svg elements that are not children of hidden divs
      var svgs = $(rootEl).find('div:not(.sc-hidden)>svg');
      var canvas = makeCanvasEl(width, height);
      var promises = [];

      // for each svg we calculate its geometry, then add it to the canvas
      // through a promise.
      // Note: This implementation starts a number of asynchronous operations,
      // one for each SVG in the hierarchy. If they overlap and are handled out
      // of order, it is possible that they may be written to the canvas in the
      // wrong order.
      if (svgs) {
        svgs.forEach(function (svg) {
          var width = svg.offsetWidth || svg.width.baseVal.value;
          var height = svg.offsetHeight || svg.height.baseVal.value;
          var left = 0;
          var top = 0;
          $(svg).add($(svg).parentsUntil(rootEl)).each(function () {
            left += this.offsetLeft || 0;
            top += this.offsetTop || 0;
          });
          // DG.log('SVG width/height/left/top: ' + [width, height, left, top].join('/'));
          var imgPromise = makeSVGImage(makeDataURLFromSVGElement(svg));
          imgPromise.then(function (img) {
                addImageToCanvas(canvas, img, left, top, width, height);
              },
              function (error) {
                DG.logError(error);
              }
          );
          promises.push(imgPromise);
        });
      }

      // when all promises have been fulfilled we make a blob, then invoke the
      // save image dialog.
      return Promise.all(promises).then(function () {
          return asDataURL ? canvas.toDataURL("image/png") : makeCanvasBlob(canvas);
        },
        function (error) {
          DG.logError(error);
        }
      );
    }
  };
}());