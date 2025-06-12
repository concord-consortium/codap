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

      latVarID: function () {
        return this.getPath('dataConfiguration.latAttributeID');
      }.property(),
      latVarIDDidChange: function () {
        this.notifyPropertyChange('latVarID');
      }.observes('*dataConfiguration.latAttributeID'),

      longVarID: function () {
        return this.getPath('dataConfiguration.longAttributeID');
      }.property(),
      longVarIDDidChange: function () {
        this.notifyPropertyChange('longVarID');
      }.observes('*dataConfiguration.longAttributeID'),

      xVarID: function () {
        return this.get('longVarID');
      }.property('longVarID'),

      yVarID: function () {
        return this.get('latVarID');
      }.property('latVarID'),

      /**
       * @property {DG.MapGridModel }
       */
      gridModel: null,

      /**
       * @property {DG.connectingLinesModel }
       */
      connectingLinesModel: null,

      init: function () {
        sc_super();

        this.gridModel = DG.MapGridModel.create({
          dataConfiguration: this.get('dataConfiguration')
        });

        this.connectingLinesModel = DG.ConnectingLineModel.create({
          plotModel: this,
          isVisible: false
        });
      },

      handleOneDataContextChange: function (iNotifier, iChange) {
        sc_super();

        var tGridModel = this.get('gridModel');
        if (tGridModel)
          tGridModel.handleDataContextChange(iChange);

        if( iChange.operation === 'moveCases')
          this.notifyPropertyChange('casesDidReorder');
      },

      /**
       * Override superclass
       * @returns {boolean}
       */
      wantsInspector: function () {
        return true;
      },

      hasLatLongAttributes: true,

      /**
       * We can rescale if we have some data to rescale to.
       */
      canRescale: true,

      /**
       * @override
       * @return {boolean}
       */
      hasValidMapAttributes: function() {
        var tDataConfiguration = this.get('dataConfiguration'),
            kAttrPrefixes = ['Lat', 'Long'];
        return kAttrPrefixes.every( function( iPrefix) {
          var tLowerCasePrefix = iPrefix.toLowerCase(),
              tAttrName = tDataConfiguration.getPath( tLowerCasePrefix + 'AttributeDescription.attribute.name'),
              tCandidates = DG.MapConstants['k' + iPrefix + 'Names'];
          return tCandidates.indexOf( tAttrName.toLowerCase()) >= 0;
        });
      },

      animateSelectionBackToStart: function (iAttrIDs, iDeltas) {
        if (SC.none(this.caseValueAnimator))
          this.caseValueAnimator = DG.CaseValueAnimator.create();
        else  // We must end the animation before setting animator properties
          this.caseValueAnimator.endAnimation();

        this.caseValueAnimator.set('dataContext', this.get('dataContext'));
        this.caseValueAnimator.set('cases', DG.copy(this.get('selection')));
        this.caseValueAnimator.set('attributeIDs', iAttrIDs);
        this.caseValueAnimator.set('deltas', iDeltas);

        this.caseValueAnimator.animate();
      },

      checkboxDescriptions: function () {
        var this_ = this,
            tItems = [];
        if (this.getPath('dataConfiguration.hasLatLongAttributes')) {
          tItems = tItems.concat([
            {
              title: 'DG.Inspector.mapGrid',
              value: this_.getPath('gridModel.isVisible'),
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
              value: this_.getPath('connectingLinesModel.isVisible'),
              classNames: 'dg-map-lines-check'.w(),
              valueDidChange: function () {
                this_.toggleLines();
              }.observes('value')
            }
          ]);
        }
        return tItems;
      }.property(),

      togglePoints: function () {
        var tMapLayerModel = this;
        DG.UndoHistory.execute(DG.Command.create({
          name: "map.togglePoints",
          _firstTime: true,
          execute: function () {
            var tPointsVisible = tMapLayerModel.get('pointsShouldBeVisible');
            if (tPointsVisible !== false)
              tPointsVisible = true;

            tMapLayerModel.set('pointsShouldBeVisible', !tPointsVisible);

            this.log = 'mapAction: {mapAction: %@}'.fmt(tMapLayerModel.get('pointsShouldBeVisible') ? 'showPoints' : 'hidePoints');
            if (this._firstTime) {
              this._firstTime = false;
              this.set('name', !tPointsVisible ? 'map.showPoints' : 'map.hidePoints');
              this.set('undoString', !tPointsVisible ? 'DG.Undo.map.showPoints' : 'DG.Undo.map.hidePoints');
              this.set('redoString', !tPointsVisible ? 'DG.Redo.map.showPoints' : 'DG.Redo.map.hidePoints');
            }
          },
          undo: function () {
            this.execute();
          }
        }));
      },

      toggleGrid: function () {
        var tMapLayerModel = this;
        DG.UndoHistory.execute(DG.Command.create({
          name: "map.toggleGrid",
          _firstTime: true,
          execute: function () {
            var tGridIsVisible = tMapLayerModel.getPath('gridModel.isVisible');
            // if (tGridIsVisible !== true)
            //   tGridIsVisible = false;

            tMapLayerModel.setPath('gridModel.isVisible', !tGridIsVisible);

            this.log = 'mapAction: {mapAction: %@}'.fmt(tMapLayerModel.getPath('gridModel.isVisible') ? 'showGrid' :
                'hideGrid');
            if (this._firstTime) {
              this._firstTime = false;
              this.set('name', !tGridIsVisible ? 'map.showGrid' : 'map.hideGrid');
              this.set('undoString', !tGridIsVisible ? 'DG.Undo.map.showGrid' : 'DG.Undo.map.hideGrid');
              this.set('redoString', !tGridIsVisible ? 'DG.Redo.map.showGrid' : 'DG.Redo.map.hideGrid');
            }
          },
          undo: function () {
            this.execute();
          }
        }));
      },

      toggleLines: function () {
        var tMapLayerModel = this;
        DG.UndoHistory.execute(DG.Command.create({
          name: "map.toggleLines",
          _firstTime: true,
          execute: function () {
            var tLinesAreVisible = tMapLayerModel.getPath('connectingLinesModel.isVisible');
            if (tLinesAreVisible !== false)
              tLinesAreVisible = true;

            tMapLayerModel.setPath('connectingLinesModel.isVisible', !tLinesAreVisible);

            this.log = 'mapAction: {mapAction: %@}'.fmt(tMapLayerModel.getPath('connectingLinesModel.isVisible') ?
                'showLines' : 'hideLines');
            if (this._firstTime) {
              this._firstTime = false;
              this.set('name', !tLinesAreVisible ? 'map.showLines' : 'map.hideLines');
              this.set('undoString', !tLinesAreVisible ? 'DG.Undo.map.showLines' : 'DG.Undo.map.hideLines');
              this.set('redoString', !tLinesAreVisible ? 'DG.Redo.map.showLines' : 'DG.Redo.map.hideLines');
            }
          },
          undo: function () {
            this.execute();
          }
        }));
      },

      somethingIsSelectable: function () {
        return this.get('isVisible') && (this.get('pointsShouldBeVisible') || this.getPath('gridModel.isVisible') ||
            this.getPath('connectingLinesModel.isVisible'));
      }.property(),
      somethingIsSelectableDidChange: function() {
        this.notifyPropertyChange('somethingIsSelectable');
      }.observes('isVisible', 'pointsShouldBeVisible', 'gridModel.isVisible', 'connectingLinesModel.isVisible'),

      gridIsVisible: function() {
        return this.get('isVisible') && this.getPath('gridModel.isVisible');
      }.property(),
      gridIsVisibleDidChange: function() {
        this.notifyPropertyChange('gridIsVisible');
      }.observes( 'isVisible', 'pointsShouldBeVisible', 'gridModel.isVisible', 'connectingLinesModel.isVisible'),

      createStorage: function () {
        var tStorage = sc_super(),
            tDataConfiguration = this.get('dataConfiguration'),
            tPointsVisible = this.get('pointsShouldBeVisible'),
            tGridModel = this.get('gridModel'),
            tConnectingLinesModel = this.get('connectingLinesModel');
        tDataConfiguration.addToStorageForDimension(tStorage, 'legend');
        tStorage.pointColor = this.get('pointColor');
        tStorage.strokeColor = this.get('strokeColor');
        tStorage.pointSizeMultiplier = this.get('pointSizeMultiplier');
        tStorage.transparency = this.get('transparency');
        tStorage.strokeTransparency = this.get('strokeTransparency');
        tStorage.strokeSameAsFill = this.get('strokeSameAsFill');

        if (tPointsVisible !== null)
          tStorage.pointsShouldBeVisible = tPointsVisible;
        tStorage.linesShouldBeVisible = this.get('linesShouldBeVisible');
        if (tGridModel)
          tStorage.grid = tGridModel.createStorage();
        if (tConnectingLinesModel)
          tStorage.connectingLines = tConnectingLinesModel.createStorage();
        return tStorage;
      },

      restoreStorage: function (iStorage) {
        sc_super();

        var tStorage = iStorage.mapModelStorage || iStorage,
            tGridModel = this.get('gridModel'),
            tConnectingLinesModel = this.get('connectingLinesModel');

        if (!SC.none(tStorage.pointsShouldBeVisible))
          this.set('pointsShouldBeVisible', tStorage.pointsShouldBeVisible);
        if (!SC.none(tStorage.linesShouldBeVisible))
          this.set('linesShouldBeVisible', tStorage.linesShouldBeVisible);

        if (tGridModel)
          tGridModel.restoreStorage(tStorage.grid);
        if (tConnectingLinesModel)
          tConnectingLinesModel.restoreStorage(tStorage.connectingLines);
      }
    });