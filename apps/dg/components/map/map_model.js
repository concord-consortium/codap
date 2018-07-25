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
    /**
     * These two properties are from the Leaflet Map and are kept in synch for save and restore
     * by my view.
     */
    center: null,
    zoom: null,

    /**
     * This is the name of the layer used as an argument to L.esri.basemapLayer
     * {@property String}
     */
    baseMapLayerName: null,

    /**
     * Changes the visibility of the layer in Leaflet with the opacity parameter.
     * {@property Boolean}
     */
    baseMapLayerToggle: true,

    /**
     * An array of data configurations, one per layer
     * @property {[{DG.MapDataConfiguration}]}
     */
    mapDataConfigurations: null,

    /**
     * An array of layer models such as mapPointLayerModel and mapPolygonLayerModel
     * @property {[DG.MapLayerModel]}
     */
    mapLayerModels: null,

    /**
     * Reflects (and determines) whether the mapPointViews subview is showing
     * {@property Boolean}
     */
    pointsShouldBeVisible: true,

    /**
     * Reflects (and determines) whether the points are to be connected by lines
     * {@property Boolean}
     */
    linesShouldBeVisible: false,

    /**
     * {@property DG.MapGridModel}
     */
    gridModel: null,

    areaColor: DG.PlotUtilities.kMapAreaNoLegendColor,
    areaTransparency: DG.PlotUtilities.kDefaultMapFillOpacity,
    areaStrokeColor: DG.PlotUtilities.kDefaultMapStrokeColor,
    areaStrokeTransparency: DG.PlotUtilities.kDefaultMapStrokeOpacity,

    /**
     * @property {DG.ConnectingLineModel}
     */
    connectingLineModel: null,

    /**
     * Set to true during restore as flag to use to know whether to fit bounds or not
     */
    centerAndZoomBeingRestored: false,

    dataConfigurationClass: function() {
      return DG.MapDataConfiguration;
    }.property(),

    caseValueAnimator: null,  // Used to animate points back to start

    latVarID: function() {
      return this.getPath('dataConfiguration.latAttributeID');
    }.property(),
    latVarIDDidChange: function() {
      this.notifyPropertyChange('latVarID');
    }.observes('*dataConfiguration.latAttributeID'),

    longVarID: function() {
      return this.getPath('dataConfiguration.longAttributeID');
    }.property(),
    longVarIDDidChange: function() {
      this.notifyPropertyChange('longVarID');
    }.observes('*dataConfiguration.longAttributeID'),

    areaVarID: function() {
      return this.getPath('dataConfiguration.areaAttributeDescription.attributeID');
    }.property(),
    areaVarIDDidChange: function() {
      this.notifyPropertyChange('areaVarID');
    }.observes('*dataConfiguration.areaAttributeDescription.attributeID'),

    /**
     Prepare dependencies.
     */
    init: function() {
      sc_super();
      var kLatNames = ['latitude', 'lat', 'latitud'],
          kLongNames = ['longitude', 'long', 'lng', 'lon', 'longitud'],
          kAreaNames = ['boundary', 'boundaries', 'polygon', 'polygons'];

      this.mapDataConfigurations = [];
      DG.currDocumentController().get('contexts').forEach(function (iContext) {
        var tLatName, tLongName, tAreaName;

        iContext.get('collections').forEach(function (iCollection) {
          var tAttrNames = (iCollection && iCollection.getAttributeNames()) || [],
              // Make a copy, all lower case. We will need the original if we find a match.
              tLowerCaseNames = tAttrNames.map( function( iAttrName) {
                return iAttrName.toLowerCase();
              });

          function pickOutName( iKNames) {
            return tAttrNames.find(function (iAttrName, iIndex) {
              return iKNames.find(function (iKName) {
                return (iKName === tLowerCaseNames[ iIndex]);
              });
            });
          }

          tLatName = pickOutName( kLatNames);
          tLongName = pickOutName( kLongNames);
          tAreaName = pickOutName( kAreaNames);
          if( !tAreaName) {  // Try for an attribute that has a boundary type
            ((iCollection && iCollection.get('attrs')) || []).some( function( iAttr) {
              if( iAttr.get('type') === 'boundary') {
                tAreaName = iAttr.get('name');
                return true;
              } else {
                return false;
              }
            });
          }

          if ((tLatName && tLongName) || tAreaName) {
            this.mapDataConfigurations.push( DG.MapDataConfiguration.create({
              initializer: {
                context: iContext, collection: iCollection,
                latName: tLatName, longName: tLongName, areaName: tAreaName
              }
            }));
          }
        }.bind( this));
      }.bind( this));

      this.mapLayerModels = [];
      this.mapDataConfigurations.forEach(function (iDataConfig) {
        var tContext = iDataConfig.get('dataContext');

        // TODO: This is questionable.
        if (tContext) {
          tContext.addObserver('changeCount', this, 'handleDataContextNotification');
        }

        var tLegend = DG.LegendModel.create( { dataConfiguration: iDataConfig });
        var tLegendDescription = iDataConfig.get('legendAttributeDescription');
        tLegend.set('attributeDescription', tLegendDescription);

        var tMapLayerModel = DG.MapLayerModel.create({
          dataConfiguration: iDataConfig,
          legend: tLegend
        });

        tMapLayerModel.invalidate();
        this.mapLayerModels.push(tMapLayerModel);
      }.bind(this));

      var tConfiguration = this.mapDataConfigurations.length > 0 ? this.mapDataConfigurations[0] :
                              DG.MapDataConfiguration.create({ initializer: {} }),
          tContext = tConfiguration.get('dataContext');
      // If the context has been discovered in the init of the configuration, we take this opportunity
      // to hook up our observer to it.
      if( tContext) {
        tContext.addObserver('changeCount', this, 'handleDataContextNotification');
      }
      this.set( 'dataConfiguration', tConfiguration);

      var tLegendDescription = tConfiguration.get('legendAttributeDescription');

      this.set('legend', DG.LegendModel.create( { dataConfiguration: tConfiguration }));
      this.setPath('legend.attributeDescription', tLegendDescription);

      // base class doesn't do this because GraphModel has other initialization to do first
      this.invalidate();

      this.set('center', [45.4408, 12.3155]); //
      this.set('zoom', 1);  // Reasonable default
      this.set('baseMapLayerName', 'Topographic');

      this.set('gridModel', DG.MapGridModel.create({ dataConfiguration: this.get('dataConfiguration')}));
      this.set('connectingLineModel', DG.ConnectingLineModel.create( {
        plotModel: this.get('dataConfiguration'),
        isVisible: false
      }));
    },

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

      var tGridModel = this.get('gridModel');
      if( tGridModel)
        tGridModel.handleDataContextChange( iChange);
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
     * Override superclass
     * @returns {boolean}
     */
    wantsInspector: function() {
      return this.get('hasLatLongAttributes') || this.get('hasAreaAttribute');
    },

    hasLatLongAttributes: function() {
      return this.getPath('dataConfiguration.hasLatLongAttributes');
    }.property('dataConfiguration').cacheable(),

    hasLatLongAttributesDidChange: function() {
      this.notifyPropertyChange('hasLatLongAttributes');
    }.observes('*dataConfiguration.hasLatLongAttributes'),

    hasAreaAttribute: function() {
      return this.getPath('dataConfiguration.hasAreaAttribute');
    }.property('dataConfiguration'),

    hasAreaAttributeDidChange: function() {
      this.notifyPropertyChange('hasLatLongAttributes');
    }.observes('*dataConfiguration.hasAreaAttribute'),

    /**
     * We can rescale if we have some data to rescale to.
     * @return {Boolean}
     */
    canRescale: function() {
      return this.get('hasLatLongAttributes') || this.getPath('dataConfiguration.hasAreaAttribute');
    }.property('hasNumericAxis', 'plot'),

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

    checkboxDescriptions: function() {
      var this_ = this,
          tItems = [];
      if( this.getPath('dataConfiguration.hasLatLongAttributes')) {
        tItems = tItems.concat([
          {
            title: 'DG.Inspector.mapGrid',
            value: this_.getPath('gridModel.visible'),
            classNames: 'dg-map-grid-check'.w(),
            valueDidChange: function () {
              this_.toggleGrid();
            }.observes('value')
          },
          {
            title: 'DG.Inspector.mapPoints',
            value: this_.get('pointsShouldBeVisible'),
            classNames: 'dg-map-points-check'.w(),
            valueDidChange: function () {
              this_.togglePoints();
            }.observes('value')
          },
          {
            title: 'DG.Inspector.mapLines',
            value: this_.get('linesShouldBeVisible'),
            classNames: 'dg-map-lines-check'.w(),
            valueDidChange: function () {
              this_.toggleLines();
            }.observes('value')
          }
        ]);
      }
      return tItems;
    }.property(),

    toggleGrid: function() {
      var mapModel = this;
      DG.UndoHistory.execute(DG.Command.create({
        name: "map.toggleGrid",
        undoString: 'DG.Undo.map.showGrid',
        redoString: 'DG.Redo.map.showGrid',
        _firstTime: true,
        execute: function() {
          var tGrid = mapModel.get('gridModel');
          tGrid.set('visible', !tGrid.get( 'visible'));
          this.log = 'mapAction: {mapAction: %@ }'.fmt(tGrid.get('visible') ? 'showGrid' : 'hideGrid');
          if (this._firstTime) {
            this._firstTime = false;
            var visible = tGrid.get('visible');
            this.set('name', visible ? 'map.showGrid' : 'map.hideGrid');
            this.set('undoString', visible ? 'DG.Undo.map.showGrid' : 'DG.Undo.map.hideGrid');
            this.set('redoString', visible ? 'DG.Redo.map.showGrid' : 'DG.Redo.map.hideGrid');
          }
        },
        undo: function() {
          this.execute();
        }
      }));
    },

    togglePoints: function() {
      var mapModel = this;
      DG.UndoHistory.execute(DG.Command.create({
        name: "map.togglePoints",
        undoString: 'DG.Undo.map.showPoints',
        redoString: 'DG.Redo.map.showPoints',
        _firstTime: true,
        execute: function() {
          var tPointsVisible = mapModel.get('pointsShouldBeVisible');
          if( tPointsVisible !== false)
            tPointsVisible = true;
          mapModel.set('pointsShouldBeVisible', !tPointsVisible);
          this.log = 'mapAction: {mapAction: %@}'.fmt(mapModel.get('pointsShouldBeVisible') ? 'showPoints' : 'hidePoints');
          if (this._firstTime) {
            this._firstTime = false;
            this.set('name', !tPointsVisible ? 'map.showPoints' : 'map.hidePoints');
            this.set('undoString', !tPointsVisible ? 'DG.Undo.map.showPoints' : 'DG.Undo.map.hidePoints');
            this.set('redoString', !tPointsVisible ? 'DG.Redo.map.showPoints' : 'DG.Redo.map.hidePoints');
          }
        },
        undo: function() {
          this.execute();
        }
      }));
    },

    toggleLines: function() {
      var mapModel = this;
      DG.UndoHistory.execute(DG.Command.create({
        name: "map.toggleLines",
        undoString: 'DG.Undo.map.showLines',
        redoString: 'DG.Redo.map.showLines',
        _firstTime: true,
        execute: function() {
          var tLinesVisible = mapModel.get('linesShouldBeVisible');
          mapModel.set('linesShouldBeVisible', !tLinesVisible);
          mapModel.setPath('connectingLineModel.isVisible', !tLinesVisible);
          this.log = 'mapAction: {mapAction: %@}'.fmt(mapModel.get('linesShouldBeVisible') ? 'showLines' : 'hideLines');
          if (this._firstTime) {
            this._firstTime = false;
            this.set('name', !tLinesVisible ? 'map.showLines' : 'map.hideLines');
            this.set('undoString', !tLinesVisible ? 'DG.Undo.map.showLines' : 'DG.Undo.map.hideLines');
            this.set('redoString', !tLinesVisible ? 'DG.Redo.map.showLines' : 'DG.Redo.map.hideLines');
          }
        },
        undo: function() {
          this.execute();
        }
      }));
    },

    createStorage: function() {
      var tStorage = {};
      tStorage.center = this.get('center');
      tStorage.zoom = this.get('zoom');
      tStorage.baseMapLayerName = this.get('baseMapLayerName');
      var tPointsVisible = this.get('pointsShouldBeVisible');
      if( tPointsVisible !== null)
        tStorage.pointsShouldBeVisible = tPointsVisible;
      tStorage.linesShouldBeVisible = this.get('linesShouldBeVisible');
      tStorage.grid = this.get('gridModel').createStorage();

      tStorage.areaColor = this.get('areaColor');
      tStorage.areaTransparency = this.get('areaTransparency');
      tStorage.areaStrokeColor = this.get('areaStrokeColor');
      tStorage.areaStrokeTransparency = this.get('areaStrokeTransparency');

      return tStorage;
    },

    restoreStorage: function( iStorage) {
      sc_super();

      var tLegendAttrRef = this.instantiateAttributeRefFromStorage(iStorage, 'legendColl', 'legendAttr'),
          tDataConfig = this.get('dataConfiguration');
      tDataConfig.setAttributeAndCollectionClient('legendAttributeDescription', tLegendAttrRef,
          iStorage.legendRole, iStorage.legendAttributeType);

      if( iStorage.mapModelStorage) {
        this.set('center', iStorage.mapModelStorage.center);
        this.set('zoom', iStorage.mapModelStorage.zoom);
        this.set('baseMapLayerName', iStorage.mapModelStorage.baseMapLayerName);
        this.set('centerAndZoomBeingRestored', true);
        if( !SC.none( iStorage.mapModelStorage.pointsShouldBeVisible))
          this.set('pointsShouldBeVisible', iStorage.mapModelStorage.pointsShouldBeVisible);
        if( !SC.none( iStorage.mapModelStorage.linesShouldBeVisible))
          this.set('linesShouldBeVisible', iStorage.mapModelStorage.linesShouldBeVisible);

        if( iStorage.mapModelStorage.areaColor)
          this.set('areaColor', iStorage.mapModelStorage.areaColor);
        if( iStorage.mapModelStorage.areaTransparency)
          this.set('areaTransparency', iStorage.mapModelStorage.areaTransparency);
        if( iStorage.mapModelStorage.areaStrokeColor)
          this.set('areaStrokeColor', iStorage.mapModelStorage.areaStrokeColor);
        if( iStorage.mapModelStorage.areaStrokeTransparency)
          this.set('areaStrokeTransparency', iStorage.mapModelStorage.areaStrokeTransparency);

        this.get('gridModel').restoreStorage( iStorage.mapModelStorage.grid);
      }
    }

  } );

DG.MapLayerModel = DG.DataDisplayModel.extend(
  /** @scope DG.MapLayerModel.prototype */
  {
    init: function() {
      sc_super();
    },


    //============================
    // Copy-pasted from MapModel: TODO: check & reorganize

    /**
     * Reflects (and determines) whether the mapPointViews subview is showing
     * {@property Boolean}
     */
    pointsShouldBeVisible: true,

    /**
     * Set to true during restore as flag to use to know whether to fit bounds or not
     */
    centerAndZoomBeingRestored: false,

    dataConfigurationClass: function() {
      return DG.MapDataConfiguration;
    }.property(),

    caseValueAnimator: null,  // Used to animate points back to start

    latVarID: function() {
      return this.getPath('dataConfiguration.latAttributeID');
    }.property(),
    latVarIDDidChange: function() {
      this.notifyPropertyChange('latVarID');
    }.observes('*dataConfiguration.latAttributeID'),

    longVarID: function() {
      return this.getPath('dataConfiguration.longAttributeID');
    }.property(),
    longVarIDDidChange: function() {
      this.notifyPropertyChange('longVarID');
    }.observes('*dataConfiguration.longAttributeID'),

    areaVarID: function() {
      return this.getPath('dataConfiguration.areaAttributeDescription.attributeID');
    }.property(),
    areaVarIDDidChange: function() {
      this.notifyPropertyChange('areaVarID');
    }.observes('*dataConfiguration.areaAttributeDescription.attributeID'),

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

      var tGridModel = this.get('gridModel');
      if( tGridModel)
        tGridModel.handleDataContextChange( iChange);
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
     * Override superclass
     * @returns {boolean}
     */
    wantsInspector: function() {
      return this.get('hasLatLongAttributes') || this.get('hasAreaAttribute');
    },

    hasLatLongAttributes: function() {
      return this.getPath('dataConfiguration.hasLatLongAttributes');
    }.property('dataConfiguration').cacheable(),

    hasLatLongAttributesDidChange: function() {
      this.notifyPropertyChange('hasLatLongAttributes');
    }.observes('*dataConfiguration.hasLatLongAttributes'),

    hasAreaAttribute: function() {
      return this.getPath('dataConfiguration.hasAreaAttribute');
    }.property('dataConfiguration'),

    hasAreaAttributeDidChange: function() {
      this.notifyPropertyChange('hasLatLongAttributes');
    }.observes('*dataConfiguration.hasAreaAttribute'),

    /**
     * We can rescale if we have some data to rescale to.
     * @return {Boolean}
     */
    canRescale: function() {
      return this.get('hasLatLongAttributes') || this.getPath('dataConfiguration.hasAreaAttribute');
    }.property('hasNumericAxis', 'plot'),

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

    checkboxDescriptions: function() {
      var this_ = this,
        tItems = [];
      if( this.getPath('dataConfiguration.hasLatLongAttributes')) {
        tItems = tItems.concat([
          {
            title: 'DG.Inspector.mapGrid',
            value: this_.getPath('gridModel.visible'),
            classNames: 'dg-map-grid-check'.w(),
            valueDidChange: function () {
              this_.toggleGrid();
            }.observes('value')
          },
          {
            title: 'DG.Inspector.mapPoints',
            value: this_.get('pointsShouldBeVisible'),
            classNames: 'dg-map-points-check'.w(),
            valueDidChange: function () {
              this_.togglePoints();
            }.observes('value')
          },
          {
            title: 'DG.Inspector.mapLines',
            value: this_.get('linesShouldBeVisible'),
            classNames: 'dg-map-lines-check'.w(),
            valueDidChange: function () {
              this_.toggleLines();
            }.observes('value')
          }
        ]);
      }
      return tItems;
    }.property(),

    togglePoints: function(iControlValue) {
      var mapModel = this;
      DG.UndoHistory.execute(DG.Command.create({
        name: "map.togglePoints",
        undoString: 'DG.Undo.map.showPoints',
        redoString: 'DG.Redo.map.showPoints',
        _firstTime: true,
        execute: function() {
          var tPointsVisible = mapModel.get('pointsShouldBeVisible');
          if( tPointsVisible !== false)
            tPointsVisible = true;

          // TODO: hack
          if (typeof(iControlValue) !== 'undefined') {
            tPointsVisible = !iControlValue;
          }

          mapModel.set('pointsShouldBeVisible', !tPointsVisible);

          this.log = 'mapAction: {mapAction: %@}'.fmt(mapModel.get('pointsShouldBeVisible') ? 'showPoints' : 'hidePoints');
          if (this._firstTime) {
            this._firstTime = false;
            this.set('name', !tPointsVisible ? 'map.showPoints' : 'map.hidePoints');
            this.set('undoString', !tPointsVisible ? 'DG.Undo.map.showPoints' : 'DG.Undo.map.hidePoints');
            this.set('redoString', !tPointsVisible ? 'DG.Redo.map.showPoints' : 'DG.Redo.map.hidePoints');
          }
        },
        undo: function() {
          this.execute();
        }
      }));
    },

    createStorage: function() {
      var tStorage = {};
      tStorage.center = this.get('center');
      tStorage.zoom = this.get('zoom');
      tStorage.baseMapLayerName = this.get('baseMapLayerName');
      var tPointsVisible = this.get('pointsShouldBeVisible');
      if( tPointsVisible !== null)
        tStorage.pointsShouldBeVisible = tPointsVisible;
      tStorage.linesShouldBeVisible = this.get('linesShouldBeVisible');
      tStorage.grid = this.get('gridModel').createStorage();

      tStorage.areaColor = this.get('areaColor');
      tStorage.areaTransparency = this.get('areaTransparency');
      tStorage.areaStrokeColor = this.get('areaStrokeColor');
      tStorage.areaStrokeTransparency = this.get('areaStrokeTransparency');

      return tStorage;
    },

    restoreStorage: function( iStorage) {
      sc_super();

      var tLegendAttrRef = this.instantiateAttributeRefFromStorage(iStorage, 'legendColl', 'legendAttr'),
        tDataConfig = this.get('dataConfiguration');
      tDataConfig.setAttributeAndCollectionClient('legendAttributeDescription', tLegendAttrRef,
        iStorage.legendRole, iStorage.legendAttributeType);

      if( iStorage.mapModelStorage) {
        this.set('center', iStorage.mapModelStorage.center);
        this.set('zoom', iStorage.mapModelStorage.zoom);
        this.set('baseMapLayerName', iStorage.mapModelStorage.baseMapLayerName);
        this.set('centerAndZoomBeingRestored', true);
        if( !SC.none( iStorage.mapModelStorage.pointsShouldBeVisible))
          this.set('pointsShouldBeVisible', iStorage.mapModelStorage.pointsShouldBeVisible);
        if( !SC.none( iStorage.mapModelStorage.linesShouldBeVisible))
          this.set('linesShouldBeVisible', iStorage.mapModelStorage.linesShouldBeVisible);

        if( iStorage.mapModelStorage.areaColor)
          this.set('areaColor', iStorage.mapModelStorage.areaColor);
        if( iStorage.mapModelStorage.areaTransparency)
          this.set('areaTransparency', iStorage.mapModelStorage.areaTransparency);
        if( iStorage.mapModelStorage.areaStrokeColor)
          this.set('areaStrokeColor', iStorage.mapModelStorage.areaStrokeColor);
        if( iStorage.mapModelStorage.areaStrokeTransparency)
          this.set('areaStrokeTransparency', iStorage.mapModelStorage.areaStrokeTransparency);

        this.get('gridModel').restoreStorage( iStorage.mapModelStorage.grid);
      }
    }
  });