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
     * Reflects (and determines) whether the mapPointView subview is showing
     * {@property Boolean}
     */
    pointsShouldBeVisible: null,

    /**
     * Reflects (and determines) whether the points are to be connected by lines
     * {@property Boolean}
     */
    linesShouldBeVisible: false,

    /**
     * {@property DG.MapGridModel}
     */
    gridModel: null,

    _connectingLineModel: null,

    connectingLineModel: function() {
      if( !this._connectingLineModel) {
        this._connectingLineModel = DG.ConnectingLineModel.create( {
          plotModel: this.get('dataConfiguration'),
          sortOnXValues: false
        });
      }
      return this._connectingLineModel;
    }.property(),

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
    }.property('*dataConfiguration.latAttributeID'),

    longVarID: function() {
      return this.getPath('dataConfiguration.longAttributeID');
    }.property('dataConfiguration.longAttributeID'),

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

      this.set('center', [37.84, -122.10]); // San Francisco
      this.set('zoom', 5);  // Reasonable default
      this.set('baseMapLayerName', 'Topographic');

      this.set('gridModel', DG.MapGridModel.create({ dataConfiguration: this.get('dataConfiguration')}));
    },

    handleLegendAttrChange: function() {
      var tLegendAttrDesc = this.getPath('dataConfiguration.legendAttributeDescription');
      if( tLegendAttrDesc) {
        tLegendAttrDesc.set('offsetMinProportion', DG.PlotUtilities.kMapColorRangeOffset);
        tLegendAttrDesc.invalidateCaches();
      }
    }.observes('dataConfiguration.legendAttributeDescription.attribute'),

    handleOneDataContextChange: function( iNotifier, iChange) {
      if( iChange && iChange.operation === 'deleteCases')
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

    hasLatLongAttributes: function() {
      return this.getPath('dataConfiguration.hasLatLongAttributes');
    }.property('dataConfiguration.hasLatLongAttributes').cacheable(),

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
      var tMenuItems = [];

      var hideShowGrid = function() {
        var tGrid = this.get('gridModel');
        tGrid.set('visible', !tGrid.get( 'visible'));
        DG.dirtyCurrentDocument();
        DG.logUser('mapAction: {mapAction: %@ }', (tGrid.get('visible') ? 'showGrid' : 'hideGrid'));
      }.bind(this);

      var hideShowPoints = function() {
        var tPointsVisible = this.get('pointsShouldBeVisible');
        if( tPointsVisible !== false)
          tPointsVisible = true;
        this.set('pointsShouldBeVisible', !tPointsVisible);
        DG.dirtyCurrentDocument();
        DG.logUser('mapAction: {mapAction: %@}', (this.get('pointsShouldBeVisible') ? 'showPoints' : 'hidePoints'));
      }.bind(this);

      var hideShowLines = function() {
        var tLinesVisible = this.get('linesShouldBeVisible');
        this.set('linesShouldBeVisible', !tLinesVisible);
        this.setPath('connectingLineModel.isVisible', !tLinesVisible);
        DG.dirtyCurrentDocument();
        DG.logUser('mapAction: {mapAction: %@}', (this.get('linesShouldBeVisible') ? 'showLines' : 'hideLines'));
      }.bind(this);

      if( this.get('hasLatLongAttributes')) {
        var tHideShowGridTitle = this.getPath('gridModel.visible') ?
                'DG.MapView.hideGrid'.loc() : 'DG.MapView.showGrid'.loc(),
            tHideShowPointsTitle = (this.get('pointsShouldBeVisible') !== false) ? 'DG.MapView.hidePoints'.loc() :
                'DG.MapView.showPoints'.loc();
        tMenuItems = tMenuItems.concat( [
                      { title: tHideShowGridTitle, isEnabled: true, target: this, itemAction: hideShowGrid },
                      { title: tHideShowPointsTitle, isEnabled: true, target: this, itemAction: hideShowPoints }
                    ]);
        if( this.get('pointsShouldBeVisible')) {
          var tHideShowLinesTitle = (this.get('linesShouldBeVisible') ?
              'DG.DataDisplayModel.HideConnectingLine' :
              'DG.DataDisplayModel.ShowConnectingLine').loc();
          tMenuItems = tMenuItems.concat( [{ isSeparator: YES },
            { title: tHideShowLinesTitle, isEnabled: true, target: this, itemAction: hideShowLines }]);
        }

        tMenuItems = tMenuItems.concat( [{ isSeparator: YES }]).
            concat( this.createHideShowSelectionMenuItems());
      }

      return tMenuItems;
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
        if( iStorage.mapModelStorage.pointsShouldBeVisible !== null)
          this.set('pointsShouldBeVisible', iStorage.mapModelStorage.pointsShouldBeVisible);
        if( iStorage.mapModelStorage.linesShouldBeVisible !== null)
          this.set('linesShouldBeVisible', iStorage.mapModelStorage.linesShouldBeVisible);
        this.get('gridModel').restoreStorage( iStorage.mapModelStorage.grid);
      }
    }

  } );

