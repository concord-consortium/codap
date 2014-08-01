// ==========================================================================
//                            DG.MapModel
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

sc_require('components/graph_map_common/data_display_model');

/** @class  DG.MapModel - The model for a map.

 @extends DG.DataDisplayModel
 */
DG.MapModel = DG.DataDisplayModel.extend(
  /** @scope DG.MapModel.prototype */
  {

    dataConfigurationClass: function() {
      return DG.MapDataConfiguration;
    }.property(),

    caseValueAnimator: null,  // Used to animate points back to start

    latVarID: function() {
      return this.getPath('dataConfiguration.yAttributeDescription.attributeID');
    }.property('*dataConfiguration.yAttributeDescription.attributeID'),

    lngVarID: function() {
      return this.getPath('dataConfiguration.xAttributeDescription.attributeID');
    }.property('dataConfiguration.xAttributeDescription.attributeID'),

    areaVarID: function() {
      return this.getPath('dataConfiguration.areaAttributeDescription.attributeID');
    }.property('dataConfiguration.areaAttributeDescription.attributeID'),

    /**
     Prepare dependencies.
     */
    init: function() {
      sc_super();

      // base class doesn't do this because GraphModel has other initialization to do first
      this.invalidate();
    },

    handleOneDataContextChange: function( iNotifier, iChange) {
      // We must invalidate before we build indices because the change may
      // have affected the set of included cases, which affects indices.
      // It would be better not to be dealing with indices at all, but
      // that refactoring is left for another day.
      this.get('dataConfiguration').invalidateCaches( null, iChange);
      iChange.indices = this.buildIndices( iChange);
      this.dataRangeDidChange( this, 'revision', this, iChange.indices);
      this.set('lastChange', iChange);
    },

    /**
      @param {Number} The index of the case to be selected.
      @param {Boolean} Should the current selection be extended?
    */
    selectCaseByIndex: function( iIndex, iExtend) {
      var tCases = this.get('cases'),
          tCase = tCases[ iIndex],
          tSelection = this.get('selection'),
          tChange = {
            operation: 'selectCases',
            collection: this.get('collectionClient'),
            cases: [ tCase ],
            select: true,
            extend: iExtend
          };

      if( tSelection.get('length') !== 0) {
        if( tSelection.contains( tCase)) {  // Case is already selected
          if( iExtend) {
            tChange.select = false;
          }
          // clicking on a selected case leaves it selected
          else return;
        }
        else {
          tChange.select = true;
        }
      }

      this.get('dataContext').applyChange( tChange);
      if( tChange.select)
        DG.logUser("caseSelected: %@", iIndex);
      else
        DG.logUser("caseDeselected: %@", iIndex);
    },

    getLatLngBounds: function() {
      var tLatMinMax = this.getPath('dataConfiguration.yAttributeDescription.attributeStats.minMax' ),
          tLngMinMax = this.getPath('dataConfiguration.xAttributeDescription.attributeStats.minMax' ),
          tSouthWest = [tLatMinMax.min, tLngMinMax.min],
          tNorthEast = [tLatMinMax.max, tLngMinMax.max];
       return [tSouthWest, tNorthEast];
    },

    /**
     * If there is an area attribute, go through its values, finding the rectangle that encompases all
     * the coordinates.
     * @returns {*[]}
     */
    getAreaBounds: function() {
      var tCases = this.get('cases'),
          tAreaID = this.get('areaVarID'),
          tMinWest = 180, tMaxEast = -180, tMinSouth = 90, tMaxNorth = -90;
      if( !tAreaID)
        return null;

      function processArrayOfCoords( iArrayOfCoords) {
        iArrayOfCoords.forEach( function( iPoint) {
          tMinSouth = Math.min( tMinSouth, iPoint[1]);
          tMaxNorth = Math.max( tMaxNorth, iPoint[1]);
          tMinWest = Math.min( tMinWest, iPoint[0]);
          tMaxEast = Math.max( tMaxEast, iPoint[0]);
        });
      }

      tCases.forEach( function( iCase) {
        try {
          var tFeature = JSON.parse(iCase.getValue(tAreaID)),
              tCoords = tFeature.geometry.coordinates,
              tType = tFeature.geometry.type;
          tCoords.forEach(function (iArray) {
            switch (tType) {
              case 'Polygon':
                processArrayOfCoords(iArray);
                break;
              case 'MultiPolygon':
                iArray.forEach(function (iSubArray) {
                  processArrayOfCoords(iSubArray);
                });
                break;
            }
          });
        }
        catch(er) {}
      });

      return [[tMinSouth, tMinWest], [tMaxNorth, tMaxEast]];
    },

    hasLatLngAttrs: function() {
      return !SC.none( this.get('latVarID')) && !SC.none( this.get('lngVarID'));
    }.property('dataConfiguration.yAttributeDescription.attributeID', 'dataConfiguration.xAttributeDescription.attributeID'),

    /**
     * For now, we'll assume all changes affect us
     * @param iChange
     */
    isAffectedByChange: function( iChange) {
      return true;
    },

    animateSelectionBackToStart: function( iAttrIDs, iDeltas) {
      if( SC.none( this.caseValueAnimator))
        this.caseValueAnimator = DG.CaseValueAnimator.create();
      else  // We must end the animation before setting animator properties
        this.caseValueAnimator.endAnimation();

      this.caseValueAnimator.set( 'dataContext', this.get('dataContext'));
      this.caseValueAnimator.set( 'cases', DG.copy( this.get('selection')));
      this.caseValueAnimator.set( 'attributeIDs', iAttrIDs);
      this.caseValueAnimator.set( 'deltas', iDeltas);

      this.caseValueAnimator.animate();
    },

    _observedDataConfiguration: null,

    /**
     Return the map's notion of gear menu items concatenated with mine.
     @return {Array of menu items}
     */
    getGearMenuItems: function() {
      return [];
    }

  } );

