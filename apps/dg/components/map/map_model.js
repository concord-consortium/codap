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
     * For now, we'll assume all changes affect us
     * @param iChange
     */
    isAffectedByChange: function( iChange) {
      return true;
    }

    } );

