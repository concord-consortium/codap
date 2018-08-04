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
DG.MapLayerModel = DG.DataDisplayModel.extend(
    /** @scope DG.MapLayerModel.prototype */
    {
      init: function() {
        sc_super();
      },


      //============================
      handleLegendAttrChange: function() {
        var tLegendAttrDesc = this.getPath('dataConfiguration.legendAttributeDescription');
        if( tLegendAttrDesc) {
          tLegendAttrDesc.set('offsetMinProportion', DG.PlotUtilities.kMapColorRangeOffset);
          tLegendAttrDesc.invalidateCaches();
        }
      }.observes('dataConfiguration.legendAttributeDescription.attribute'),

      handleOneDataContextChange: function( iNotifier, iChange) {
        sc_super();

        var tOperation = iChange && iChange.operation;

        if (tOperation === 'deleteCases')
          this.get('dataConfiguration').synchHiddenCases();

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
       * This method is called when an area, latitude, or longitude attribute is deleted from the data context currently
       * being used by this map. Our job is to reconfigure our data configuration so there will no longer be any attempt
       * to plot data
       *
       * @param iDescKey {String}
       */
      removeAttribute: function( iDescKey) {
        var tDescription = this.getPath('dataConfiguration.' + iDescKey);
        if( tDescription) {
          tDescription.removeAllAttributes();
          this.notifyPropertyChange('attributeRemoved');
        }
      },

      /**
       @param {CaseModel} The the case to be selected.
       @param {Boolean} Should the current selection be extended?
       */
      selectCase: function( iCase, iExtend) {
        var tSelection = this.get('selection'),
            tChange = {
              operation: 'selectCases',
              collection: this.get('collectionClient'),
              cases: [ iCase ],
              select: true,
              extend: iExtend
            };

        if( tSelection.get('length') !== 0) {
          if( tSelection.contains( iCase)) {  // Case is already selected
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
      },

      /**
       * Not yet. Compare with dot chart <==> bart chart
       * @property {Boolean}
       */
      canSupportConfigurations: function() {
        return false;
      }.property(),

      /**
       * Returns true if the specified change could affect the current map
       * @param     {object}  - iChange
       * @returns   {boolean} - true if the change could affect the plot; false otherwise
       */
      isAffectedByChange: function( iChange) {
        var attrs, i, collChange, collChanges, collChangeCount;

        // returns true if the specified list of attribute IDs contains any
        // that are being displayed in the map in any graph place
        var containsMappedAttrs = function(iAttrIDs) {
          var mappedAttrs = this.getPath('dataConfiguration.placedAttributeIDs'),
              attrCount = iAttrIDs && iAttrIDs.length,
              i, attrID;
          for (i = 0; i < attrCount; ++i) {
            attrID = iAttrIDs[i];
            if (mappedAttrs.indexOf(attrID) >= 0)
              return true;
          }
          return false;
        }.bind(this);

        switch (iChange.operation) {
          case 'createCases':
          case 'deleteCases':
            return true;
          case 'updateCases':
            attrs = iChange.attributeIDs;
            if (!attrs) return true;  // all attributes affected
            return containsMappedAttrs(attrs);
          case 'dependentCases':
            collChanges = iChange.changes;
            collChangeCount = collChanges ? collChanges.length : 0;
            for (i = 0; i < collChangeCount; ++i) {
              collChange = collChanges[i];
              if (collChange) {
                attrs = collChange.attributeIDs;
                if (attrs && containsMappedAttrs(attrs))
                  return true;
              }
            }
            return false;
        }

        // For now, we'll assume all other changes affect us
        return true;
      },

      checkBoxDescriptions: function() {
        return [];
      }.property(),

      lastValueControls: function() {
        return [];
      }.property(),

      _observedDataConfiguration: null,

      /**
       * Store the information needed to put my data configuration back together.
       * @return {Object}
       */
      createStorage: function () {
        var tStorage = {_links_: {}},
            tDataContext = this.get('dataContext'),
            tDataConfiguration = this.get('dataConfiguration'),
            tHiddenCases = tDataConfiguration && tDataConfiguration.get('hiddenCases');

        if (tHiddenCases) {
          tStorage._links_.tHiddenCases = tHiddenCases
              .filter(function (iCase) {
                return !!iCase;
              })
              .map(function (iCase) {
                return iCase.toLink();
              });
        }

        if (tDataContext)
          tStorage._links_.context = tDataContext.toLink();

        tDataConfiguration.addToStorageForDimension( tStorage, 'legend');


        return tStorage;
      },

      restoreStorage: function( iStorage) {
        sc_super();
        var tLegendAttrRef = this.instantiateAttributeRefFromStorage(iStorage, 'legendColl', 'legendAttr'),
            tDataConfig = this.get('dataConfiguration');
        tDataConfig.setAttributeAndCollectionClient('legendAttributeDescription', tLegendAttrRef,
            iStorage.legendRole, iStorage.legendAttributeType);
      }
    });