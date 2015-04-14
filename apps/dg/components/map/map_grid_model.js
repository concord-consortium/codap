// ==========================================================================
//                            DG.MapGridModel
//
//  Author:   William Finzer
//
//  Copyright ©2014 Concord Consortium
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

/** @class  DG.MapGridModel - The model for a grid being displayed on a map.

 @extends SC.Object
 */
DG.MapGridModel = SC.Object.extend((function () // closure
/** @scope DG.MapGridModel.prototype */ {

  function RectRecord(iRect) {
    this.rect = iRect;
    this.count = 0;
  }

  /**
   * A 2-dim sparse array of RectRecords, each of which shows up at the view level as a colored rectangle.
   * @constructor
   */
  function RectArray() {
    this.maxCount = 0;

    this.rectangles = [
      []
    ];
    this.getRect = function (iLongIndex, iLatIndex) {
      if(iLongIndex < this.rectangles.length)
        return this.rectangles[iLongIndex][iLatIndex];
      else
        return null;
    };
    this.setRect = function(iLongIndex, iLatIndex, iRect) {
      if(!this.rectangles[iLongIndex])
        this.rectangles[iLongIndex] = [];
      this.rectangles[iLongIndex][iLatIndex] = iRect;
    };

    this.forEachRect = function( iFunc) {
      this.rectangles.forEach( function(iLongArray, iLongIndex) {
        iLongArray.forEach( function( iRect, iLatIndex) {
          if( iRect)
            iFunc( iRect, iLongIndex, iLatIndex);
        });
      });
    };

    this.incrementCount = function( iLongIndex, iLatIndex) {
      var tRect = this.getRect( iLongIndex, iLatIndex);
      if( tRect) {
        tRect.count++;
        this.maxCount = Math.max(this.maxCount, tRect.count);
      }
    };

    this.deleteZeroRects = function() {
      this.rectangles.forEach( function(iLongArray, iLongIndex) {
        iLongArray.forEach( function( iRect, iLatIndex) {
          if( iRect.count === 0)
            iLongArray[ iLatIndex] = undefined;
        });
      });
    };
  }

  /**
   * The grid has a width and height measured in degrees
   * These are private variables used to compute actual grid width and height
   */
  var _gridWidth, // Number (degrees)
      _gridHeight, // Number (degrees)
      kGridCellCount = 20;

  /**
   * Start of MapGridModel
   */
  return {
    /**
     * Here we get access to the cases being plotted so we can determine how many points are in a grid rectangle
     * {@property DG.MapDataConfiguration}
     */
    dataConfiguration: null,

    /**
     * This number is multiplied times _gridWidth and _gridHeight to get the actual width and height
     */
    gridMultiplier: 1,  // Number [.1-2]

    gridWidth: function() {
      return _gridWidth * this.gridMultiplier;
    }.property('gridMultiplier'),

    gridHeight: function() {
      return _gridHeight * this.gridMultiplier;
    }.property('gridMultiplier'),

    startWest: null, // Number (degrees) - Left edge of grid
    startSouth: null, // Number (degrees) - Bottom edge of grid

    /**
     * A 2-dimensional array of objects, each of which consists of a rectangle and a count
     * {@property {[][]}
     */
    rectArray: null,

    maxCount: function() {
      return this.get('rectArray').maxCount;
    }.property(),

    /**
     * {@property Boolean}
     */
    visible: false,

    forEachRect: function( iFunc) {
      this.get('rectArray').forEachRect( iFunc);
    },

    initializeRectArray: function() {

      var tCases = this.getPath('dataConfiguration.cases'),
          tStartSouth, tStartWest;

      var setupRectangles = function() {
        var tRectArray = this.get('rectArray'),
            tBounds = this.get('dataConfiguration').getLatLongBounds(),
            tCenter = tBounds.getCenter(),
            tRefLong = tCenter.lng,
            tRefLat = tCenter.lat,
            tWest = tBounds.getWest(),
            tEast = tBounds.getEast(),
            tSouth = tBounds.getSouth(),
            tNorth = tBounds.getNorth();

        _gridWidth = (tEast - tWest) / kGridCellCount;
        _gridHeight = (tNorth - tSouth) / kGridCellCount;

        var tGridWidth = this.get('gridWidth'),
            tNumToWest = Math.ceil((tRefLong - tWest) / tGridWidth);
        tStartWest = tRefLong - tGridWidth * tNumToWest;

        var tGridHeight = this.get('gridHeight'),
            tNumToSouth = Math.ceil((tRefLat - tSouth) / tGridHeight),
            tLatIndex, tLongIndex;
        tStartSouth = tRefLat - tGridHeight * tNumToSouth;

        for (tLongIndex = 0; tLongIndex < 2 * tNumToWest; tLongIndex++) {
          for (tLatIndex = 0; tLatIndex < 2 * tNumToSouth; tLatIndex++) {
            tRectArray.setRect(tLongIndex, tLatIndex, new RectRecord([
              [tStartSouth + tLatIndex * tGridHeight, tStartWest + tLongIndex * tGridWidth],
              [tStartSouth + (tLatIndex + 1) * tGridHeight, tStartWest + (tLongIndex + 1) * tGridWidth]
            ]));
          }
        }
      }.bind(this);

      var computeCounts = function(){

        var zeroCounts = function() {
          this.get('rectArray').forEachRect( function( iRect) {
            iRect.count = 0;
          });
          this.get('rectArray').maxCount = 0;
        }.bind(this);

        var tGridWidth = this.get('gridWidth'),
            tGridHeight = this.get('gridHeight'),
            tLongVarID = this.getPath('dataConfiguration.xAttributeDescription.attributeID'),
            tLatVarID = this.getPath('dataConfiguration.yAttributeDescription.attributeID'),
            tRectArray = this.get('rectArray');
        zeroCounts();
        tCases.forEach( function( iCase) {
          var tLongVal = iCase.getNumValue( tLongVarID),
              tLatVal = iCase.getNumValue( tLatVarID),
              tLongIndex = Math.floor( (tLongVal - tStartWest) / tGridWidth),
              tLatIndex = Math.floor( (tLatVal - tStartSouth) / tGridHeight);
          tRectArray.incrementCount( tLongIndex, tLatIndex);
        });
      }.bind(this);

      this.beginPropertyChanges();
        this.set('rectArray', new RectArray());
        if(tCases.length > 0) {
          setupRectangles();
          computeCounts();
          this.get('rectArray').deleteZeroRects();
        }
      this.endPropertyChanges();
    },

    /**
     * We have to recompute the rectArray
     * TODO: Handle change in the number of cases and changes in values of cases
     */
    rectArrayMustChange: function() {
      if( this.getPath('dataConfiguration.hasLatLongAttributes'))
        this.initializeRectArray();
    }.observes('gridMultiplier', 'dataConfiguration.hiddenCases'),

    /**
     *
     * @returns {{}}
     */
    createStorage: function () {
      var tStorage = {};
      tStorage.gridMultiplier = this.get('gridMultiplier');
      tStorage.visible = this.get('visible');

      return tStorage;
    },

    /**
     *
     * @param iStorage
     */
    restoreStorage: function (iStorage) {
      if (iStorage) {
        this.beginPropertyChanges();
        this.set('gridMultiplier', iStorage.gridMultiplier ? iStorage.gridMultiplier : 1);
        this.set('visible', iStorage.visible);
        this.endPropertyChanges();
      }
    }
  };
})()); // end closure
