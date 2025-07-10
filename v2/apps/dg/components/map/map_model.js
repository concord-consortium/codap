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

/** @class  DG.MapModel - The model for a map.

 @extends DG.Object
 */
DG.MapModel = SC.Object.extend(
    /** @scope DG.MapModel.prototype */
    (function () {
      var kDefaultLocation = [45.4408, 12.3155];

      return {
        /**
         * These two properties are from the Leaflet Map and are kept in synch for save and restore
         * by my view.
         */
        center: null,
        zoom: null,
        newCenter: null,
        newZoom: null,

        /**
         * This is the name of the layer used as an argument to L.esri.basemapLayer
         * {@property String}
         */
        baseMapLayerName: null,

        /**
         * Changes the visibility of the layer in Leaflet with the opacity parameter.
         * {@property Boolean}
         */
        baseMapLayerIsVisible: true,

        /**
         * An array of layer models such as mapPointLayerModel and mapPolygonLayerModel
         * @property {[DG.MapLayerModel]}
         */
        mapLayerModels: null,

        /**
         * Set to true during restore as flag to use to know whether to fit bounds or not
         */
        centerAndZoomBeingRestored: false,

        _addLayersForCollection: function (iContext, iCollection) {
          var tLatName, tLongName, tPolygonName,
              tMapLayerModel, tDataConfiguration,
              tLegend,
              tLayerWasAdded = false,
              tAttrNames = (iCollection && iCollection.getAttributeNames()) || [],
              // Make a copy, all lower case. We will need the original if we find a match.
              tLowerCaseNames = tAttrNames.map(function (iAttrName) {
                return iAttrName.toLowerCase();
              }),
              configureLayer = function (iInitializer, iDataConfigClass, iLayerModelClass) {
                tDataConfiguration = iDataConfigClass.create({
                  initializer: iInitializer
                });
                tLegend = DG.LegendModel.create({
                  dataConfiguration: tDataConfiguration,
                  attributeDescription: tDataConfiguration.get('legendAttributeDescription')
                });
                tLegend.addObserver('attributeDescription.attribute', this, this.legendAttributeDidChange);
                tLegend.addObserver('attributeDescription.attributeStats.attributeType',
                    this, this.legendAttributeDidChange);
                tMapLayerModel = iLayerModelClass.create({
                  dataConfiguration: tDataConfiguration,
                  legend: tLegend
                });
                tMapLayerModel.addObserver('somethingIsSelectable', this, this.somethingIsSelectableDidChange);
                tMapLayerModel.addObserver('gridIsVisible', this, this.gridIsVisibleDidChange);
                tMapLayerModel.addObserver('attributeRemoved', this, this.removeMapLayerModel);
                tMapLayerModel.addObserver('attributeUpdated', this, this.handleAttributeUpdated);
                this.mapLayerModels.push(tMapLayerModel);
                tMapLayerModel.invalidate();
              }.bind(this),

              contextAndAttributesAlreadyPresent = function () {
                return this.get('mapLayerModels').some(function (iLayerModel) {
                  var tDataConfig = iLayerModel.get('dataConfiguration'),
                      tExistingContext = tDataConfig.get('dataContext'),
                      tExistingLatID = tDataConfig.get('latAttributeID'),
                      tExistingLongID = tDataConfig.get('longAttributeID'),
                      tExistingPolygonID = tDataConfig.get('polygonAttributeID');
                  if (iContext === tExistingContext) {
                    var tProposedLatID = tLatName && iCollection.getAttributeByName(tLatName).get('id'),
                        tProposedLongID = tLongName && iCollection.getAttributeByName(tLongName).get('id'),
                        tProposedPolygonID = tPolygonName && iCollection.getAttributeByName(tPolygonName).get('id');
                    return (tExistingLatID === tProposedLatID && tExistingLongID === tProposedLongID) ||
                        tExistingPolygonID === tProposedPolygonID;
                  } else return false;
                });
              }.bind(this);

          function pickOutName(iKNames) {
            return tAttrNames.find(function (iAttrName, iIndex) {
              return iKNames.find(function (iKName) {
                return (iKName === tLowerCaseNames[iIndex]);
              });
            });
          }

          tLatName = pickOutName(DG.MapConstants.kLatNames);
          tLongName = pickOutName(DG.MapConstants.kLongNames);
          tPolygonName = pickOutName(DG.MapConstants.kPolygonNames);
          if (!tPolygonName) {  // Try for an attribute that has a boundary type
            ((iCollection && iCollection.get('attrs')) || []).some(function (iAttr) {
              if (iAttr.get('type') === 'boundary') {
                tPolygonName = iAttr.get('name');
                return true;
              } else {
                return false;
              }
            });
          }
          if (!contextAndAttributesAlreadyPresent()) {
            if (tLatName && tLongName) {
              tLayerWasAdded = true;
              configureLayer({
                    context: iContext, collection: iCollection,
                    latName: tLatName, longName: tLongName
                  },
                  DG.MapPointDataConfiguration, DG.MapPointLayerModel);
            }
            if (tPolygonName) {
              tLayerWasAdded = true;
              configureLayer({
                    context: iContext, collection: iCollection,
                    polygonName: tPolygonName
                  },
                  DG.MapPolygonDataConfiguration, DG.MapPolygonLayerModel);
            }
          }
          return tLayerWasAdded;
        },

        _processDocumentContexts: function () {
          var tLayerWasAdded = false;
          DG.currDocumentController().get('contexts').forEach(function (iContext) {
            iContext.get('collections').forEach(function (iCollection) {
              if (this._addLayersForCollection(iContext, iCollection))
                tLayerWasAdded = true;
            }.bind(this));
          }.bind(this));
          return tLayerWasAdded;
        },

        /**
         * Called during init. If we have been given a context and a legendAttributeName, we attempt
         * to add a legend. Then we can delete the two temporary properties.
         * @private
         */
        _processPossibleLegend: function () {
          var tContext = this.get('context'),
              tAttributeName = this.get('legendAttributeName');
          if( tContext && tAttributeName) {
            var tAttribute = tContext.getAttributeByName(tAttributeName),
                tCollClient = tContext.getCollectionForAttribute(tAttribute);
            this.changeAttributeForLegend(tContext, {attribute: tAttribute, collection: tCollClient});
          }
          delete this.context;
          delete this.legendAttributeName;
        },

        /**
         Prepare dependencies.
         */
        init: function () {
          sc_super();

          this.mapLayerModels = [];

          var layerWasAdded = this._processDocumentContexts();

          this._processPossibleLegend();

          this.set('center', kDefaultLocation); //
          this.set('zoom', 1);  // Reasonable default
          if (!layerWasAdded) {
            if (navigator.geolocation && navigator.geolocation.getCurrentPosition) {
              navigator.geolocation.getCurrentPosition(
                  function (pos) {
                    var coords = pos.coords;
                    this.set('newCenter', [coords.latitude, coords.longitude]);
                    this.set('newZoom', 8);
                  }.bind(this)
              );
            }
          }
          this.set('baseMapLayerName', 'Topographic');

        },

        destroy: function () {
          this.get('mapLayerModels').forEach(function (iLayerModel) {
            this.destroyMapLayer(iLayerModel);
          }.bind(this));
          this.set('mapLayerModels', null);
          sc_super();
        },

        /**
         * Called during destroy and also when a given layer is no longer relevant due to an attribute
         * being deleted.
         * @param iLayerModel
         */
        destroyMapLayer: function (iLayerModel) {
          iLayerModel.removeObserver('somethingIsSelectable', this, this.somethingIsSelectableDidChange);
          iLayerModel.removeObserver('gridIsVisible', this, this.gridIsVisibleDidChange);
          iLayerModel.removeObserver('attributeRemoved', this, this.removeMapLayerModel);
          iLayerModel.removeObserver('attributeUpdated', this, this.handleAttributeUpdated);
          var tLegend = iLayerModel.get('legend');
          tLegend && tLegend.removeObserver('attributeDescription.attribute',
              this, this.legendAttributeDidChange);
          tLegend && tLegend.removeObserver('attributeDescription.attributeStats.attributeType',
              this, this.legendAttributeDidChange);
          iLayerModel.destroy();
        },

        /**
         * Called by MapController when the document's count of data contexts changes.
         * Run through our list of contexts looking for any that are no longer present.
         *  For each of those, remove corresponding layer(s).
         * For any newly encountered contexts, check to see if each contains map attributes and, if so,
         *  add a layer for each.
         */
        adaptToNewOrRemovedContexts: function () {
          var tDocumentContexts = DG.currDocumentController().get('contexts'),
              tLayerModelsToRemove = [],
              tLayerModelWasAdded = false,
              tLayerModels = this.get('mapLayerModels');
          tLayerModels.forEach(function (iLayerModel) {
            var tLayerContext = iLayerModel.getPath('dataConfiguration.dataContext');
            if (tLayerContext && tDocumentContexts.indexOf(tLayerContext) < 0) {
              // Previously valid context has gone away
              tLayerModelsToRemove.push(iLayerModel);
            }
          });
          tLayerModelsToRemove.forEach(function (iLayerModel) {
            this.destroyMapLayer(iLayerModel);
            var tIndex = tLayerModels.indexOf(iLayerModel);
            tLayerModels.splice(tIndex, 1);
          }.bind(this));
          tLayerModelWasAdded = this._processDocumentContexts();
          if (tLayerModelsToRemove.length > 0 || tLayerModelWasAdded)
            this.notifyPropertyChange('mapLayerModelsChange');
        },

        legendAttributeDidChange: function () {
          this.notifyPropertyChange('legendAttributeChange');
        },

        handleDroppedContext: function (iContext) {
          // Nothing to do since contexts get dealt with at the MapLayerModel
        },

        /**
         * An attribute critical to the given layer model has been removed.
         * This means we should delete this layer model and notify so the view layer
         * can update
         * @param iMapLayerModel {DG.MapLayerModel}
         */
        removeMapLayerModel: function (iMapLayerModel) {
          var tMapLayerModels = this.get('mapLayerModels'),
              tIndex = tMapLayerModels.indexOf(iMapLayerModel);
          tMapLayerModels.splice(tIndex, 1);
          this.destroyMapLayer(iMapLayerModel);
          this.notifyPropertyChange('mapLayerModelsChange');
        },

        /**
         * An attribute critical to the given layer model has been updated, (e.g. its name was changed).
         * We ask the layer model whether the attributes assigned to it still work. If not,
         * @param iMapLayerModel {DG.MapLayerModel}
         */
        handleAttributeUpdated: function (iMapLayerModel) {
          if (!iMapLayerModel.hasValidMapAttributes())
            this.removeMapLayerModel(iMapLayerModel);
        },

        /** create a menu item that removes the attribute on the given legend */
        createRemoveAttributeMenuItem: function (iLegendView) {
          var tAttribute = iLegendView.getPath('model.attributeDescription.attribute') || DG.Analysis.kNullAttribute,
              tName = (tAttribute === DG.Analysis.kNullAttribute) ? '' : tAttribute.get('name'),
              tTitle = ('DG.DataDisplayMenu.removeAttribute_legend').loc(tName);
          return {
            title: tTitle,
            target: this,
            itemAction: this.removeLegendAttribute,
            isEnabled: (tAttribute !== DG.Analysis.kNullAttribute),
            log: "attributeRemoved: { attribute: %@, axis: %@ }".fmt(tName, 'legend'),
            args: [iLegendView.getPath('model.dataConfiguration')]
          };
        },

        createChangeAttributeTypeMenuItem: function (iLegendView) {
          var tDescription = iLegendView.getPath('model.attributeDescription'),
              tAttribute = tDescription && tDescription.get('attribute'),
              tAttributeName = tAttribute && (tAttribute !== -1) ? tAttribute.get('name') : '',
              tIsNumeric = tDescription && tDescription.get('isNumeric'),
              tTitle = (tIsNumeric ? 'DG.DataDisplayMenu.treatAsCategorical' : 'DG.DataDisplayMenu.treatAsNumeric').loc();
          return {
            title: tTitle,
            target: this,
            itemAction: this.changeAttributeType, // call with args, toggling 'numeric' setting
            isEnabled: (tAttribute !== DG.Analysis.kNullAttribute),
            log: "plotAxisAttributeChangeType: { axis: legend, attribute: %@, numeric: %@ }".fmt(tAttributeName, !tIsNumeric),
            args: [iLegendView.getPath('model.dataConfiguration'), !tIsNumeric]
          };
        },

        removeLegendAttribute: function (iDataConfiguration) {
          iDataConfiguration.setAttributeAndCollectionClient('legendAttributeDescription', null);
        },

        changeAttributeType: function (iDataConfiguration, iTreatAsNumeric) {
          iDataConfiguration.setAttributeType('legendAttributeDescription', iTreatAsNumeric);
        },

        /**
         Sets the attribute for the legend for the layer that uses the given context
         @param  {DG.DataContext}      iDataContext -- The data context for this graph
         @param  {Object}              iAttrRefs -- The attribute to set for the axis
         {DG.CollectionClient} iAttrRefs.collection -- The collection that contains the attribute
         {DG.Attribute}        iAttrRefs.attribute -- Array of attributes to set for the legend
         */
        changeAttributeForLegend: function (iDataContext, iAttrRefs) {
          this.get('mapLayerModels').forEach(function (iLayerModel) {
            if (iDataContext === iLayerModel.get('dataContext')) {
              iLayerModel.changeAttributeForLegend(iDataContext, iAttrRefs);
            }
          });
        },

        someLayerReturnsTrue: function (iPropName) {
          var tResult = this.get('mapLayerModels').some(function (iLayerModel) {
            var tLayerResult = iLayerModel.get(iPropName);
            return tLayerResult;
          });
          return tResult;
        },

        somethingIsSelectable: function () {
          return this.someLayerReturnsTrue('somethingIsSelectable');
        }.property(),
        somethingIsSelectableDidChange: function () {
          this.notifyPropertyChange('somethingIsSelectable');
        },

        /**
         * When changed by user action, value is passed to all grid models
         * @property {Number}
         */
        gridMultiplier: 1,
        gridMultiplerDidChange: function () {
          this.get('mapLayerModels').forEach(function (iLayerModel) {
            iLayerModel.setPath('gridModel.gridMultiplier', this.get('gridMultiplier'));
          }.bind(this));
        }.observes('gridMultiplier'),

        gridIsVisible: function () {
          return this.someLayerReturnsTrue('gridIsVisible');
        }.property(),
        gridIsVisibleDidChange: function () {
          this.notifyPropertyChange('gridIsVisible');
        },

        /**
         * Override superclass
         * @returns {boolean}
         */
        wantsInspector: function () {
          return this.someLayerReturnsTrue('wantsInspector');
        },

        hasLatLongAttributes: function () {
          return this.someLayerReturnsTrue('hasLatLongAttributes');
        }.property(),

        hasPolygonAttribute: function () {
          return this.someLayerReturnsTrue('hasPolygonAttribute');
        }.property('dataConfiguration'),

        /**
         * We can rescale if we have some data to rescale to.
         * @return {Boolean}
         */
        canRescale: function () {
          return this.someLayerReturnsTrue('canRescale');
        }.property('hasNumericAxis', 'plot'),

        /**
         * Not yet. Compare with dot chart <==> bart chart
         * @property {Boolean}
         */
        canSupportConfigurations: function () {
          return false;
        }.property(),

        selectAll: function (iBool) {
          this.get('mapLayerModels').forEach(function (iMapLayerModel) {
            iMapLayerModel.selectAll(iBool);
          });
        },

        /**
         * Returns true if the specified change could affect the current map
         * @param     {object}  - iChange
         * @returns   {boolean} - true if the change could affect the plot; false otherwise
         */
        isAffectedByChange: function (iChange) {
          var attrs, i, collChange, collChanges, collChangeCount;

          // returns true if the specified list of attribute IDs contains any
          // that are being displayed in the map in any graph place
          var containsMappedAttrs = function (iAttrIDs) {
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

        _observedDataConfiguration: null,

        firstDataConfiguration: function () {
          var tMapLayerModels = this.get('mapLayerModels');
          if (tMapLayerModels.length > 0)
            return tMapLayerModels[0].get('dataConfiguration');
          else return null;
        }.property(),

        lastValueControls: function () {
          var tControls = [];
          this.get('mapLayerModels').forEach(function (iMapLayerModel) {
            tControls = tControls.concat(iMapLayerModel.get('lastValueControls'));
          });
          return tControls;
        }.property(),

        createHideShowSelectionMenuItems: function () {
          var getSelectionSpecs = function () {
            var tSpecs = {
              numSelected: 0,
              numUnSelected: 0,
              numHidden: 0,
              selectionData: [/*{
                           dataConfig: null,
                           cases: null,
                           selected: null
                         }*/]
            };
            this.get('mapLayerModels').forEach(function (iLayerModel) {
              var tConfig = iLayerModel.get('dataConfiguration');
              if (!tSpecs.selectionData.find(function (iSpec) {
                return iSpec.dataConfig === tConfig;
              })) {
                var tData = {
                  dataConfig: tConfig,
                  cases: tConfig.get('cases').toArray(),
                  selected: tConfig.get('selection').toArray(),
                  hidden: tConfig.get('hiddenCases').toArray()
                };
                tSpecs.numSelected += tData.selected.length;
                tSpecs.numUnSelected += (tData.cases.length - tData.selected.length);
                tSpecs.numHidden += tData.hidden.length;
                tSpecs.selectionData.push(tData);
              }
            });
            return tSpecs;
          }.bind(this);

          var tSelectionSpecs = getSelectionSpecs(),
              tSomethingIsSelected = tSelectionSpecs.numSelected > 0,
              tSomethingIsUnselected = tSelectionSpecs.numUnSelected > 0,
              tSomethingHidden = tSelectionSpecs.numHidden > 0,
              tHideSelectedNumber = tSelectionSpecs.numSelected > 1 ? 'Plural' : 'Sing',
              tHideUnselectedNumber = tSelectionSpecs.numUnSelected > 1 ? 'Plural' : 'Sing';

          function hideSelectedCases() {
            DG.UndoHistory.execute(DG.Command.create({
              name: 'graph.display.hideSelectedCases',
              undoString: 'DG.Undo.hideSelectedCases',
              redoString: 'DG.Redo.hideSelectedCases',
              log: "Hide %@ selected cases".fmt(tSelectionSpecs.numSelected.length),
              executeNotification: {
                action: 'notify',
                resource: 'component',
                values: {
                  operation: 'hide selected cases',
                  type: 'DG.MapView'
                }
              },
              execute: function () {
                this._undoData = tSelectionSpecs;
                tSelectionSpecs.selectionData.forEach(function (iData) {
                  iData.dataConfig.hideCases(iData.selected);
                });
              },
              undo: function () {
                this._undoData.selectionData.forEach(function (iData) {
                  iData.dataConfig.showCases(iData.selected);
                });
              }
            }));
          }

          function hideUnselectedCases() {
            DG.UndoHistory.execute(DG.Command.create({
              name: 'graph.display.hideUnselectedCases',
              undoString: 'DG.Undo.hideUnselectedCases',
              redoString: 'DG.Redo.hideUnselectedCases',
              log: "Hide %@ unselected cases".fmt(tSelectionSpecs.numCases - tSelectionSpecs.numSelected),
              executeNotification: {
                action: 'notify',
                resource: 'component',
                values: {
                  operation: 'hide unselected cases',
                  type: 'DG.MapView'
                }
              },
              execute: function () {
                this._undoData = tSelectionSpecs;
                tSelectionSpecs.selectionData.forEach(function (iData) {
                  var tUnselected = DG.ArrayUtils.subtract(iData.cases, iData.selected,
                      function (iCase) {
                        return iCase.get('id');
                      });
                  iData.dataConfig.hideCases(tUnselected);
                });
              },
              undo: function () {
                this._undoData.selectionData.forEach(function (iData) {
                  var tUnselected = DG.ArrayUtils.subtract(iData.cases, iData.selected,
                      function (iCase) {
                        return iCase.get('id');
                      });
                  iData.dataConfig.showCases(tUnselected);
                });
              }
            }));
          }

          function showAllCases() {
            DG.UndoHistory.execute(DG.Command.create({
              name: 'graph.display.showAllCases',
              undoString: 'DG.Undo.showAllCases',
              redoString: 'DG.Redo.showAllCases',
              log: "Show all cases",
              executeNotification: {
                action: 'notify',
                resource: 'component',
                values: {
                  operation: 'show all cases',
                  type: 'DG.MapView'
                }
              },
              execute: function () {
                this._undoData = tSelectionSpecs;
                tSelectionSpecs.selectionData.forEach(function (iData) {
                  iData.dataConfig.showAllCases();
                });
              },
              undo: function () {
                this._undoData.selectionData.forEach(function (iData) {
                  iData.dataConfig.hideCases(iData.hidden);
                });
              }
            }));
          }

          return [
            // Note that these 'built' string keys will have to be specially handled by any
            // minifier we use
            {
              title: ('DG.DataDisplayMenu.hideSelected' + tHideSelectedNumber), isEnabled: tSomethingIsSelected,
              target: this, action: hideSelectedCases },
            { title: ('DG.DataDisplayMenu.hideUnselected' + tHideUnselectedNumber), isEnabled: tSomethingIsUnselected,
              target: this, action: hideUnselectedCases },
            { title: 'DG.DataDisplayMenu.showAll', isEnabled: tSomethingHidden,
              target: this, action: showAllCases
            }
          ];
        },

        createStorage: function () {
          var tStorage = {};
          tStorage.center = this.get('center');
          tStorage.zoom = this.get('zoom');
          tStorage.baseMapLayerName = this.get('baseMapLayerName');
          tStorage.gridMultiplier = this.get('gridMultiplier');
          tStorage.layerModels = this.get('mapLayerModels').map(function (iLayerModel) {
            return iLayerModel.createStorage();
          });

          return tStorage;
        },

        restoreStorage: function (iStorage) {
          if (iStorage.mapModelStorage) {
            // The following two 'new' properties cause the base map to respond
            this.set('newCenter', iStorage.mapModelStorage.center);
            this.set('newZoom', iStorage.mapModelStorage.zoom);
            this.set('center', iStorage.mapModelStorage.center);
            this.set('zoom', iStorage.mapModelStorage.zoom);
            this.set('baseMapLayerName', iStorage.mapModelStorage.baseMapLayerName);
            if (!SC.none(iStorage.mapModelStorage.gridMultiplier))
              this.set('gridMultiplier', iStorage.mapModelStorage.gridMultiplier);
            this.set('centerAndZoomBeingRestored', true);
            this.get('mapLayerModels').forEach(function (iLayerModel, iIndex) {
              if (iStorage.mapModelStorage.layerModels && iIndex < iStorage.mapModelStorage.layerModels.length) {
                var tLayerStorage = SC.isArray(iStorage.mapModelStorage.layerModels) ?
                    iStorage.mapModelStorage.layerModels[iIndex] : iStorage;
                iLayerModel.restoreStorage(tLayerStorage);
              }
            });
          }
        }

      };

    }()) // function closure
);

