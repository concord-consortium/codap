// ==========================================================================
//                            DG.GeojsonUtils
//
//  A collection of utilities for working with Geojson objects.
//
//  Author: William Finzer
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

DG.GeojsonUtils = {

  /**
   * Object
   */
  boundariesCache: {
    state: {
      requestQueue: [],
      boundaryIndex: null,
      url: 'http://codap.concord.org/~bfinzer/boundaries/US_State_Boundaries.codap'
      // url: 'http://billmbp.local/~bfinzer/US_State_Boundaries.codap'
    }
  },

/*
  drawMiniBoundary: function( iJsonObject, iDivElement) {
    var paths = [],
        bBox = {
          xMin: Number.MAX_VALUE,
          yMin: Number.MAX_VALUE,
          xMax: -Number.MAX_VALUE,
          yMax: -Number.MAX_VALUE
        },
        tWidth = 200, //iDivElement.clientWidth - 4,
        tHeight = 25, //iDivElement.clientHeight - 4,
        tScale,
        map = Raphael(iDivElement, tWidth, tHeight),
        coordinates = iJsonObject.coordinates || iJsonObject.geometry.coordinates;

    function recurseIntoArray(iArray) {
      var tPathString = '',
          tPath, tBox;
      iArray.forEach(function (iElement, iIndex) {
        if (iElement.length && iElement.length > 0) {
          if (!isNaN(iElement[0])) {
            var pt = {
              x: iElement[0],
              y: -iElement[1]
            };
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
        tPath = map.path(tPathString).attr({'stroke-width': 0, fill: 'blue'});
        paths.push(tPath);
        tBox = tPath.getBBox();
        bBox = {
          xMin: Math.min(bBox.xMin, tBox.x),
          yMin: Math.min(bBox.yMin, tBox.y),
          xMax: Math.max(bBox.xMax, tBox.x2),
          yMax: Math.max(bBox.yMax, tBox.y2)
        };
      }
    }

    recurseIntoArray(coordinates);

    // Translate and scale
    tScale = Math.min( tWidth / (bBox.xMax - bBox.xMin), tHeight / (bBox.yMax - bBox.yMin));
    var tTransform = 't' + (-bBox.xMin + 2) + ',' + (-bBox.yMin + 2) +  's' +
        tScale + ',' + tScale + ',' + bBox.xMin + ',' + bBox.yMin;
    paths.forEach( function( iPath) {
      iPath.transform( tTransform);
    });

  },
*/

  /**
   *
   * @param iBoundaryCollectionName {String} One of 'state', 'county', 'puma', ...
   * @param iKey {String} The "name" of the boundary to be retrieved
   * @param iIsFirstTime {Boolean} If true, this is the first of a sequence of calls to be made
   * @param iCallback {Function} Called when we successfully retrieve the boundary
   */
  lookupBoundary: function (iBoundaryCollectionName, iKey, iCallback) {

    function returnError(iError) {
      iCallback(null, iError);
    }

    function returnDesiredBoundary() {
      var tOnlyOneResultToReturn = tCache.requestQueue.length === 1;
      while (tCache.requestQueue.length > 0) {
        var tKeyCallbackPair = tCache.requestQueue.splice(0, 1)[0],
            tKey = tKeyCallbackPair[0],
            tCallback = tKeyCallbackPair[1],
            tResult = tCache.boundaryIndex[tKey.toLowerCase()].jsonBoundaryObject;
        if (tCallback)
          tCallback(tResult);
        else if (tOnlyOneResultToReturn)
          return tResult;
      }

    }

    var tCache = this.boundariesCache[iBoundaryCollectionName];
    if (!tCache) {
      returnError('Invalid boundary specification');
      return;
    }
    var lookupStateBoundary = function () {
          tCache.requestQueue.push([iKey, iCallback]);  // Remember the correct callback for its closure
          if (!tCache.boundaryIndex && tCache.requestQueue.length === 1) {
            $.ajax({
              url: tCache.url,
              context: this,
              data: '',
              success: processBoundaries,
              error: function (iJqXHR, iStatus, iError) {
                returnError('Request for US_State_Boundaries.codap failed. Status: ' + iStatus + ' Error: ' + iError);
              },
              dataType: 'json'
            });
          }
          else if (tCache.boundaryIndex) {
            return returnDesiredBoundary();
          }
        }.bind(this),

        processBoundaries = function (iJSON) {
          var tBoundariesObject,
              tBoundariesCollection,
              tBoundariesIDIndex = {},
              tIndexCollection;
          tCache.boundaryIndex = {};

          tBoundariesObject = iJSON.contexts[0];
          tBoundariesObject.collections.forEach(function (iCollection) {
            switch (iCollection.name) {
              case 'boundaries':
                tBoundariesCollection = iCollection;
                break;
              case 'index':
                tIndexCollection = iCollection;
                break;
            }
          });
          tBoundariesCollection.cases.forEach(function (iCase) {
            tBoundariesIDIndex[iCase.guid] = iCase.values.boundary;
          });

          tIndexCollection.cases.forEach(function (iKeyCase) {
            var tJSON = JSON.parse(tBoundariesIDIndex[iKeyCase.parent])/*,
                tDivElement = document.createElement('div')*/;
/*
            tDivElement.clientWidth = 100;
            tDivElement.clientHeight = 25;
*/
            //this.drawMiniBoundary( tJSON, tDivElement);
            tCache.boundaryIndex[iKeyCase.values.key] = {
              jsonBoundaryObject: tJSON/*,
              miniBoundaryElement: tDivElement*/
            };
          }.bind( this));
          returnDesiredBoundary();
        }.bind(this);

    return lookupStateBoundary();
  }

};

