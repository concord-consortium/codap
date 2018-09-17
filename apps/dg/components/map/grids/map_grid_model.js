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

  /**
   *
   * @param [[south,west][north, east]]
   * @constructor
   */
  function RectRecord(iRect) {
    this.rect = iRect;
    this.count = 0;
    this.cases = [];
    this.selected = false;
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
      if(this.rectangles[iLongIndex] && !SC.none( this.rectangles[ iLongIndex][iLatIndex])) {
        return this.rectangles[iLongIndex][iLatIndex];
      }
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

    this.addCaseToRect = function( iLongIndex, iLatIndex, iCase) {
      var tRect = this.getRect( iLongIndex, iLatIndex);
      if( tRect) {
        tRect.cases.push(iCase);
        // todo: We no longer need this count because we have the array
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
     * {@property DG.MapPointDataConfiguration}
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
      var tRectArray = this.get('rectArray');
      return tRectArray ? tRectArray.maxCount : 0;
    }.property(),

    /**
     * {@property Boolean}
     */
    isVisible: false,

    forEachRect: function( iFunc) {
      var tRectArray = this.get('rectArray');
      if( tRectArray)
        tRectArray.forEachRect( iFunc);
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

        if( tWest === tEast) {
          tWest -= 5; // arbitrary offset
          tEast += 5;
        }
        if( tNorth === tSouth) {
          tNorth += 5; // arbitrary offset
          tSouth -= 5;
        }

        _gridWidth = Math.min((tEast - tWest) / kGridCellCount, (tNorth - tSouth) / kGridCellCount);
        _gridHeight = _gridWidth;

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
              [tStartSouth + (tLatIndex + 1) * tGridHeight, tStartWest + tLongIndex * tGridWidth],
              [tStartSouth + tLatIndex * tGridHeight, tStartWest + (tLongIndex + 1) * tGridWidth]
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
          tRectArray.addCaseToRect( tLongIndex, tLatIndex, iCase);
        });
      }.bind(this);

      var tBounds = this.get('dataConfiguration').getLatLongBounds();
      this.beginPropertyChanges();
        this.set('rectArray', new RectArray());
        if(tCases.get('length') > 0 && tBounds && tBounds.isValid()) {
          setupRectangles();
          computeCounts();
          this.get('rectArray').deleteZeroRects();
        }
      this.endPropertyChanges();
    },

    /**
     * Called to remove the grid rectangles
     */
    clear: function() {
      this.set('rectArray', new RectArray());
    },

    _selectCasesInRect: function( iLongIndex, iLatIndex, iSelect, iExtend) {
      var tDataContext = this.getPath('dataConfiguration.dataContext'),
          tCollectionClient = this.getPath('dataConfiguration.collectionClient'),
          tRect = this.get('rectArray').getRect( iLongIndex, iLatIndex),
          tSelectChange = {
            operation: 'selectCases',
            collection: tCollectionClient,
            cases: tRect.cases,
            select: iSelect,
            extend: iExtend
          };
      tDataContext.applyChange( tSelectChange);
    },

    selectCasesInRect: function( iLongIndex, iLatIndex, iExtend) {
      if( !iExtend) {
        this.forEachRect( function( iRect) {
          iRect.selected = false;
        });
      }
      this._selectCasesInRect( iLongIndex, iLatIndex, true, iExtend);
    },

    deselectCasesInRect: function( iLongIndex, iLatIndex) {
      this._selectCasesInRect( iLongIndex, iLatIndex, false, true);
    },

    /**
     * Deselect all cases
     */
    deselectAll: function() {
      var tDataConfig = this.get('dataConfiguration'),
          tContext = tDataConfig.get('dataContext'),
          tChange = {
            operation: 'selectCases',
            collection: tDataConfig.get('collectionClient'),
            cases: null,
            select: false
          };
      if (tContext) {
        tContext.applyChange(tChange);
      }
    },

    updateSelection: function() {
      var tSelection = this.getPath('dataConfiguration.collectionClient.casesController.selection');
      this.forEachRect( function( iRect) {
        iRect.selected = iRect.cases.every( function( iCase) {
          return tSelection.containsObject( iCase);
        });
      });
      this.notifyPropertyChange('selection');
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
     * The resulting string is used in a data tip
     * @param iCases {[DG.Case]}
     * @param iLegendAttrID {Number}
     */
    getCategoryBreakdownString: function( iCases, iLegendAttrID) {
      var tTotalCount = 0,
          tCategories = {},
          tResult = '';
      iCases.forEach( function( iCase) {
        var tValue = iCase.getStrValue( iLegendAttrID);
        if( !SC.empty( tValue)) {
          tTotalCount++;
          if( !tCategories[ tValue]) {
            tCategories[ tValue] = 0;
          }
          tCategories[ tValue]++;
        }
      });
      DG.ObjectMap.forEach( tCategories, function( iCat, iCount) {
        if( !SC.empty( tResult)) {
          tResult += '\n';
        }
        tResult += iCat + ': ' + iCount + ' (' + (Math.round(1000 * iCount/tTotalCount) / 10) + '%)';
      });
      return tResult;
    },

    handleDataContextChange: function( iChange) {
      var operation = iChange && iChange.operation;

      switch( operation) {
        case 'createCase':
        case 'createCases':
        case 'deleteCases':
        case 'createCollection':
        case 'resetCollections':
          this.rectArrayMustChange();
          break;
        case 'selectCases':
          this.updateSelection();
          break;
      }
    },

    /**
     *
     * @returns {{}}
     */
    createStorage: function () {
      var tStorage = {};
      tStorage.gridMultiplier = this.get('gridMultiplier');
      tStorage.isVisible = this.get('isVisible');

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
        this.set('isVisible', iStorage.isVisible);
        this.endPropertyChanges();
      }
    }
  };
})()); // end closure
