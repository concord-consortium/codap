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
            tResult = tCache.boundaryIndex[tKey.toLowerCase()];
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
            tCache.boundaryIndex[iKeyCase.values.key] = JSON.parse(tBoundariesIDIndex[iKeyCase.parent]);
          });
          /*
           var tKeyAttribute = tIndexCollection.getAttributeByName('key'),
           tKeyAttributeID = tKeyAttribute.get('id'),
           tBoundaryAttribute = tBoundariesCollection.getAttributeByName('boundary'),
           tBoundaryAttributeID = tBoundaryAttribute.get('id'),
           tKeysCases = tIndexCollection.get('cases');
           tKeysCases.forEach(function (iCase) {
           tCache.boundaryIndex[iCase.getStrValue(tKeyAttributeID)] =
           JSON.parse(iCase.get('parent').getRawValue(tBoundaryAttributeID));
           });
           */
          returnDesiredBoundary();
        }.bind(this);

    return lookupStateBoundary();
  }

};

