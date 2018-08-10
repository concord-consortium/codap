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

sc_require('components/map/map_layer_model');

/** @class  DG.MapPointLayerModel - The model for a points displayed on a map.

 @extends DG.MapLayerModel
 */
DG.MapPointLayerModel = DG.MapLayerModel.extend(
    /** @scope DG.MapPointLayerModel.prototype */
    {
      /**
       * Reflects (and determines) whether the points show
       * {@property Boolean}
       */
      pointsShouldBeVisible: true,

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

      handleOneDataContextChange: function( iNotifier, iChange) {
        sc_super();

        var tGridModel = this.get('gridModel');
        if( tGridModel)
          tGridModel.handleDataContextChange( iChange);
      },

      /**
       * Override superclass
       * @returns {boolean}
       */
      wantsInspector: function() {
        return true;
      },

      hasLatLongAttributes: true,

      /**
       * We can rescale if we have some data to rescale to.
       */
      canRescale: true,

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
        var tStorage = sc_super(),
            tDataConfiguration = this.get('dataConfiguration'),
            tPointsVisible = this.get('pointsShouldBeVisible'),
            tGridModel = this.get('gridModel');
        tDataConfiguration.addToStorageForDimension(tStorage, 'legend');
        tStorage.pointColor = this.getPath('pointColor');
        tStorage.strokeColor = this.getPath('strokeColor');
        tStorage.pointSizeMultiplier = this.getPath('pointSizeMultiplier');
        tStorage.transparency = this.getPath('transparency');
        tStorage.strokeTransparency = this.getPath('strokeTransparency');

        if( tPointsVisible !== null)
          tStorage.pointsShouldBeVisible = tPointsVisible;
        tStorage.linesShouldBeVisible = this.get('linesShouldBeVisible');
        if( tGridModel)
          tStorage.grid = tGridModel.createStorage();
        return tStorage;
      },

      restoreStorage: function( iStorage) {
        sc_super();

        var tStorage = iStorage.mapModelStorage || iStorage,
            tGridModel = this.get('gridModel');

        if (!SC.none(tStorage.pointsShouldBeVisible))
          this.set('pointsShouldBeVisible', tStorage.pointsShouldBeVisible);
        if (!SC.none(tStorage.linesShouldBeVisible))
          this.set('linesShouldBeVisible', tStorage.linesShouldBeVisible);

        if( tGridModel)
          this.get('gridModel').restoreStorage(tStorage.grid);
      }
    });