// ==========================================================================
//                            DG.MapView
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

sc_require('components/map/map_grid_marquee_view');

/** @class  DG.MapView

 A view on a map and plotted data.

 @extends SC.View
 */
DG.MapView = SC.View.extend( DG.GraphDropTarget,
    /** @scope DG.MapView.prototype */ {

      displayProperties: ['model.dataConfiguration.attributeAssignment'],

      kPadding: [10, 10],

      /**
       * @property {DG.MapModel}
       */
      model: null,

      /**
       * @property {DG.MapLayerView}
       */
      mapLayer: null,
      mapBinding: '.mapLayer.map',

      /**
       * @property {DG.MapAreaLayer}
       */
      mapAreaLayer: null,

      /**
       * @property {DG.MapPointView}
       */
      mapPointView: null,

      /**
       * @property {DG.MapGridLayer}
       */
      mapGridLayer: null,

      /**
       * @property {DG.MapGridMarqueeView}
       */
      mapGridMarqueeView: null,

      /**
       * @property {DG.LegendView}
       */
      legendView: null,

      /**
       * @property {DG.MapConnectingLineAdornment}
       */
      connectingLineAdorn: null,

      /**
       * SC.SegmentedView
       */
      backgroundControl: null,

      /**
       * SC.SliderView
       */
      gridControl: null,

      /**
       * SC.ImageButtonView
       */
      marqueeTool: null,

      selection: null,
      selectionBinding: '*model.casesController.selection',

      _ignoreMapDisplayChanges: false,
      _fitBoundsInProgress: false,
      _mapDisplayChangeInProgress: false,
      _mapDisplayChange: null,

      paper: function() {
        return this.getPath('mapPointView.paper');
      }.property(),

      layerManager: function() {
        return this.getPath('mapPointView.layerManager');
      }.property(),

      init: function () {
        sc_super();
        var tLegendView = DG.LegendView.create({layout: { bottom: 0, height: 0 }}),
            tMapLayer = DG.MapLayerView.create( { model: this.get('model') });

        this.set('mapLayer', tMapLayer);
        this.appendChild( tMapLayer);

        this.set('legendView', tLegendView);
        this.appendChild( tLegendView);
        tLegendView.set('model', this.getPath('model.legend'));

        var tItems = [
          SC.Object.create( { label: 'Oceans',
            value: 'Oceans'}),
          SC.Object.create( { label: 'Topo',
            value: 'Topographic'} ),
          SC.Object.create( { label: 'Streets',
            value: 'Streets'} )
        ];

        this.backgroundControl = SC.SegmentedView.create({
          controlSize: SC.SMALL_CONTROL_SIZE,
          layout: { width: 170, height: 18, top: 5, right: 5 },
          items: tItems,
          value: [this.getPath('model.baseMapLayerName')],
          itemTitleKey: 'label',
          itemValueKey: 'value',
          action: 'changeBaseMap',
          target: this
        });
        this.appendChild( this.backgroundControl );

        this.gridControl = SC.SliderView.create({
          controlSize: SC.SMALL_CONTROL_SIZE,
          layout: { width: 40, height: 16, top: 33, right: 58 },
          toolTip: 'DG.MapView.gridControlHint'.loc(),
          minimum: 0.1,
          maximum: 2.0,
          step: 0,
          value: this.getPath('model.gridModel.gridMultiplier'),
          persistedValue: this.getPath('model.gridModel.gridMultiplier'),
          previousPersistedValue: this.getPath('model.gridModel.gridMultiplier'),
          isVisible: false,
          mouseUp: function( iEvent) {
            sc_super();
            if (this.get('value') !== this.get('persistedValue')) {
              this.set('previousPersistedValue', this.get('persistedValue'));
              this.set('persistedValue', this.get('value'));
              DG.logUser('changeGridMultiplier: %@', this.get('value'));
            }
          }
        });
        this.appendChild( this.gridControl );

        this.marqueeTool = SC.ImageButtonView.create({
          buttonBehavior: SC.PUSH_BEHAVIOR,
          layout: { right: 10, top: 25, width: 32, height: 32 },
          toolTip: 'DG.MapView.marqueeHint'.loc(),
          image: 'dg-map-marquee',
          action: 'setMarqueeMode',
          isVisible: false
        });
        this.appendChild( this.marqueeTool);

        this.mapGridMarqueeView = DG.MapGridMarqueeView.create({
          isVisible: false
        });
        this.appendChild( this.mapGridMarqueeView);

        // Don't trigger undo events until the map has settled down initially
        this._ignoreMapDisplayChanges = true;
        tMapLayer._setIdle();

        DG.globalsController.addObserver('globalValueChanges', this, 'globalValueDidChange');
      },

      destroy: function() {
        this._ignoreMapDisplayChanges = true; // So we don't install an idleTask in response to layout changes
        this.model.destroy(); // so that it can unlink observers
        DG.globalsController.removeObserver('globalValueChanges', this, 'globalValueDidChange');
        sc_super();
      },

      setMarqueeMode: function() {
        var tMapPointView = this.get('mapPointView'),
            tMapGridLayer = this.get('mapGridLayer');
        if( tMapPointView && tMapPointView.get('isVisible')) {
          tMapPointView.set('isInMarqueeMode', true);
        }
        else if (tMapGridLayer && tMapGridLayer.get('isVisible')) {
          tMapGridLayer.set('isInMarqueeMode', true);
        }
        DG.logUser('marqueeToolSelect');
      },

      marqueeModeChanged: function() {
        var tGridInMarqueeMode = this.getPath('mapGridLayer.isInMarqueeMode'),
            tImage = (this.getPath('mapPointView.isInMarqueeMode') || tGridInMarqueeMode) ?
            'dg-map-marquee-selected' :
            'dg-map-marquee';
        this.setPath('marqueeTool.image', tImage);
        this.setPath('mapGridMarqueeView.isVisible', tGridInMarqueeMode);
      }.observes('mapPointView.isInMarqueeMode', 'mapGridLayer.isInMarqueeMode'),

      changeBaseMap: function() {
        var tBackground = this.backgroundControl.get('value'),
            tOldBackground = this.getPath('model.baseMapLayerName');
        DG.UndoHistory.execute(DG.Command.create({
          name: "map.changeBaseMap",
          undoString: 'DG.Undo.map.changeBaseMap',
          redoString: 'DG.Redo.map.changeBaseMap',
          log: 'Map base layer changed: %@'.fmt(tBackground),
          _componentId: this.getPath('controller.model.id'),
          _controller: function() {
            return DG.currDocumentController().componentControllersMap[this._componentId];
          },
          execute: function() {
            this._controller().setPath('view.contentView.model.baseMapLayerName', tBackground);
          },
          undo: function() {
            this._controller().setPath('view.contentView.model.baseMapLayerName', tOldBackground);
            this._controller().setPath('view.contentView.backgroundControl.value', [tOldBackground]);
          },
          redo: function() {
            this._controller().setPath('view.contentView.model.baseMapLayerName', tBackground);
            this._controller().setPath('view.contentView.backgroundControl.value', [tBackground]);
          }
        }));
      },

      changeGridSize: function() {
        var tControlValue = this.gridControl.get('value');
        this.setPath('model.gridModel.gridMultiplier', tControlValue);
      }.observes('gridControl.value'),

      changePersistedGridSize: function() {
        var tControlValue = this.gridControl.get('persistedValue'),
            tPreviousControlValue = this.gridControl.get('previousPersistedValue');

        DG.UndoHistory.execute(DG.Command.create({
          name: "map.changeGridSize",
          undoString: 'DG.Undo.map.changeGridSize',
          redoString: 'DG.Redo.map.changeGridSize',
          log: "Map grid size changed: {from: %@, to: %@}".fmt(tPreviousControlValue, tControlValue),
          _componentId: this.getPath('controller.model.id'),
          _controller: function() {
            return DG.currDocumentController().componentControllersMap[this._componentId];
          },
          execute: function() { },
          undo: function() {
            this._controller().setPath('view.contentView.model.gridModel.gridMultiplier', tPreviousControlValue);
            this._controller().setPath('view.contentView.gridControl.value', tPreviousControlValue);
          },
          redo: function() {
            this._controller().setPath('view.contentView.model.gridModel.gridMultiplier', tControlValue);
            this._controller().setPath('view.contentView.gridControl.value', tControlValue);
          }
        }));
      }.observes('gridControl.persistedValue'),

      addPointLayer: function () {
        if( this.get('mapPointView'))
          return;
        var tMakeVisible = this.getPath('model.pointsShouldBeVisible');

        var tMapPointView = DG.MapPointView.create(
            {
              mapLayer: this.get('mapLayer')
            });
        tMapPointView.set( 'model', this.get('model')); // Cannot pass in because of observer setup
        this.set('mapPointView', tMapPointView);
        this.appendChild( tMapPointView);

        if( this.getPath('model.hasLatLongAttributes')) {
          if (!this.getPath('model.centerAndZoomBeingRestored')) {
            this.fitBounds();
          }
          this.setPathIfChanged('marqueeTool.isVisible', tMakeVisible);
          this.setPathIfChanged('model.pointsShouldBeVisible', tMakeVisible);
          if( tMakeVisible && this.getPath('model.linesShouldBeVisible')) {
            this.lineVisibilityChanged();
          }
        }
        else {
          tMapPointView.set('isVisible', false);
        }
        this.adjustLayout( this.renderContext( this.get('tagName')));
      },

      updateMarqueeToolVisibility: function() {
        var tPointsAreVisible = this.getPath('model.pointsShouldBeVisible'),
            tLinesAreVisible = this.getPath('model.connectingLineModel.isVisible'),
            tGridIsVisible = this.getPath('model.gridModel.visible');
        this.setPath('marqueeTool.isVisible', tPointsAreVisible || tLinesAreVisible || tGridIsVisible);
      },

      pointVisibilityChanged: function() {
        var tPointsAreVisible = this.getPath('model.pointsShouldBeVisible'),
            tModel = this.get('model'),
            tFillOpacity = tPointsAreVisible ? tModel.get( 'transparency')|| DG.PlotUtilities.kDefaultPointOpacity : 1,
            tStrokeOpacity = tPointsAreVisible ? tModel.get( 'strokeTransparency') || DG.PlotUtilities.kDefaultStrokeOpacity : 1,
            tAttrs = { 'fill-opacity': tFillOpacity, 'stroke-opacity':  tStrokeOpacity};
        // todo: The following invokeLater could be eliminated with the function passed in as a completion of
        // animation callback
        this.get('layerManager').setVisibility( DG.LayerNames.kPoints, tPointsAreVisible, tAttrs);
        this.get('layerManager').setVisibility( DG.LayerNames.kSelectedPoints, tPointsAreVisible, tAttrs);
        this.updateMarqueeToolVisibility();
      }.observes('model.pointsShouldBeVisible'),

      /**
       * Something about the points (aside from visibility) changed. Take appropriate action.
       */
      pointsDidChange: function() {
        var tGridModel = this.getPath('mapGridLayer.model');
        if( tGridModel)
            tGridModel.rectArrayMustChange();
        this.updateConnectingLine();
      }.observes('mapPointView.pointsDidChange', 'model.dataConfiguration.hiddenCases', 'model.lastChange'),

      modelPointsDidChange: function() {
        this.get('legendView').displayDidChange();
      }.observes('model.pointColor', 'model.transparency'),

      /**
       Our model has created a connecting line. We need to create our adornment. We don't call adornmentDidChange
       because we don't want to destroy the adornment.
       */
      lineVisibilityChanged: function() {
        var tMapModel = this.get('model' ),
            tAdornModel = tMapModel && tMapModel.get( 'connectingLineModel' ),
            tLinesAreVisible = tMapModel.get('linesShouldBeVisible'),
            tAdorn = this.get('connectingLineAdorn');
            tAdornModel.set('isVisible', tLinesAreVisible);
        if( tAdornModel && tLinesAreVisible && !tAdorn) {
          tAdorn = DG.MapConnectingLineAdornment.create({ parentView: this, model: tAdornModel, paperSource: this,
                                                          mapSource: this, layerName: DG.LayerNames.kConnectingLines,
                                                          unselectedLineWidth: 1, selectedLineWidth: 3 });
          this.set('connectingLineAdorn', tAdorn);
        }

        this.invokeLast( function() {
          if( tAdorn) {
            tAdorn.updateVisibility();
            this.updateMarqueeToolVisibility();
          }
        }.bind( this));
      }.observes('.model.linesShouldBeVisible'),

      addAreaLayer: function () {
        if( !this.getPath('model.areaVarID') || this.get('mapAreaLayer'))
          return;

        this.set('mapAreaLayer', DG.MapAreaLayer.create(
            {
              mapSource: this,
              model: this.get('model')
            }));
        if( !this.getPath('model.centerAndZoomBeingRestored')) {
          this.fitBounds();
        }
        this.get('mapAreaLayer').addFeatures();
      },

      addGridLayer: function () {
        if( !this.getPath('model.hasLatLongAttributes') || this.get('mapGridLayer'))
          return;

        var tGridModel = this.getPath('model.gridModel');
        tGridModel.initializeRectArray();

        this.set('mapGridLayer', DG.MapGridLayer.create(
            {
              mapSource: this,
              model: tGridModel,
              showTips: true /* !this.getPath('model.pointsShouldBeVisible') */
            }));
        // The size of any points depends on whether the grid is visible or not
        if( !this.get('mapPointView'))
          this.addPointLayer();
        // Make the points smaller so they don't completely cover the grid cells
        if( tGridModel.get('visible'))
          this.setPath('mapPointView.mapPointLayer.fixedPointRadius', 3);

        this.gridVisibilityChanged();

        this.setPath('mapGridMarqueeView.mapGridLayer', this.get('mapGridLayer'));
      },

      /**
       * Cause the map to shrink or expand to encompass the data
       */
      fitBounds: function() {
        var tBounds;
        if( this.getPath('model.areaVarID')) {
          var tAreaLayer = this.get('mapAreaLayer'),
              tAreaBounds = tAreaLayer && tAreaLayer.getBounds();
          if( !SC.none(tAreaBounds)) {
            if (!tBounds)
              tBounds = tAreaBounds;
            else
              tBounds.extend(tAreaBounds);
          }
        }
        if (this.getPath('model.hasLatLongAttributes')) {
          var tPointBounds = this.getPath('model.dataConfiguration').getLatLongBounds();
          if( !SC.none( tPointBounds)) {
            if (!tBounds)
              tBounds = tPointBounds;
            else
              tBounds.extend(tPointBounds);
          }
        }
        if ( tBounds && tBounds.isValid()) {
          this._fitBoundsInProgress = true;
          this.getPath('mapLayer.map').fitBounds(tBounds, this.kPadding);
          this.get('mapLayer')._setIdle();
        }
      },

      gridVisibilityChanged: function() {
        this.gridControl.set('isVisible', this.getPath('model.gridModel.visible'));
        this.updateMarqueeToolVisibility();
      }.observes('*model.gridModel.visible'),

      /**
       Set the layout (view position) for our subviews.
       @returns {void}
       */
      adjustLayout: function( context, firstTime) {
        var tMapLayer = this.get('mapLayer'),
            tMapPointView = this.get('mapPointView' ),
            tLegendView = this.get('legendView'),
            tLegendHeight = SC.none( tLegendView) ? 0 : tLegendView.get('desiredExtent' );

        if( this._isRenderLayoutInProgress || !tMapPointView || !tLegendView)
          return;
        this._isRenderLayoutInProgress = true;

        // adjust() method avoids triggering observers if layout parameter is already at correct value.
        tMapPointView.adjust('bottom', tLegendHeight);
        tMapLayer.adjust('bottom', tLegendHeight);
        tLegendView.set( 'layout', { bottom: 0, height: tLegendHeight });

        this._isRenderLayoutInProgress = false;
      }.observes('model.dataConfiguration.attributeAssignment'),

      /**
       * Private property to prevent recursive execution of renderLayout. Seems most important in Firefox.
       */
      _isRenderLayoutInProgress: false,

      /**
       * This is our chance to add the features to the area layer
       */
      createVisualization: function () {
        this.get('mapAreaLayer').createVisualization();
      },

      /**
       Called when the value of a global value changes (e.g. when a slider is dragged).
       */
      globalValueDidChange: function() {
        var tAreaLayer = this.get('mapAreaLayer');
        if( tAreaLayer)
          tAreaLayer.refreshComputedLegendColors();
      },

      handleLegendModelChange: function() {
        var tLegendModel = this.getPath('model.legend');
        this.setPath('legendView.model', tLegendModel);
      }.observes('.model.legend'),

      /**
       * When the layout needs of an axis change, we need to adjust the layout of the plot and the other axis.
       */
      handleLegendLayoutChange: function() {
        this.adjustLayout( this.renderContext( this.get('tagName')));
      }.observes('*legendView.desiredExtent'),

      handleAttributeRemoved: function() {
        var tMapPointView = this.get('mapPointView'),
            tMapAreaLayer = this.get('mapAreaLayer'),
            tMapGridModel = this.get('model.gridModel');
        if( !this.getPath('model.dataConfiguration.hasLatLongAttributes')) {
          this.setPath('model.connectingLineModel.isVisible', false);
          this.setPath('model.pointsShouldBeVisible', false);
          if( tMapPointView)
            this.get('mapPointView').clear();
          if(tMapGridModel) {
            tMapGridModel.set('visible', false);
            tMapGridModel.clear();
          }
        }
        if( !this.getPath('model.hasAreaAttribute') && tMapAreaLayer) {
          tMapAreaLayer.clear();
        }
      }.observes('model.attributeRemoved'),

      updateConnectingLine: function() {
        var tConnectingLineAdorn = this.get('connectingLineAdorn');
        if( tConnectingLineAdorn) {
          tConnectingLineAdorn.invalidateModel();
          tConnectingLineAdorn.updateToModel( false /* do not animate */);
        }
      },

      handleMapLayerDisplayChange: function() {
        var tMapPointView = this.get('mapPointView'),
            tLastEventType = this.getPath( 'mapLayer.lastEventType');
        if (tMapPointView) {
          if (tLastEventType === 'dragstart') {
            tMapPointView.set('isVisible', false);
          }
          else if (tLastEventType === 'moveend') {
            tMapPointView.doDraw();
            tMapPointView.set('isVisible', true);
          }
        }

        this.updateConnectingLine();

        var tMap = this.getPath('mapLayer.map'),
            tCenter = tMap.getCenter(),
            tZoom = tMap.getZoom();

        // Record the current values, which will be applied in handleIdle()
        this._mapDisplayChangeInProgress = true;
        this._mapDisplayChange = {
          center: tCenter,
          zoom: tZoom
        };

        this.setPath('mapLayer.lastEventType', null);
      }.observes('mapLayer.displayChangeCount'),

      handleClick: function() {
        this.get('model').selectAll(false);
      }.observes('mapLayer.clickCount'),

      handleIdle: function() {
        var tModel = this.get('model'),
            oldCenter = tModel.get('center'),
            oldZoom = tModel.get('zoom');

        if (this._ignoreMapDisplayChanges) {
          this._ignoreMapDisplayChanges = false;
          this._mapDisplayChange = null;
          this._mapDisplayChangeInProgress = false;
          return;
        }

        if (this._mapDisplayChange) {
            var newCenter = this._mapDisplayChange.center,
                newZoom = this._mapDisplayChange.zoom,
                centerChanged = !newCenter.equals(oldCenter),
                zoomChanged = newZoom !== oldZoom;

          if (this._mapDisplayChangeInProgress && (centerChanged || zoomChanged)) {
            var change = 'change';
            if (this._fitBoundsInProgress || (centerChanged && zoomChanged)) {
              change = 'fitBounds';
              this._fitBoundsInProgress = false;
            } else if (centerChanged) {
              change = 'pan';
            } else {
              change = 'zoom';
            }
            DG.UndoHistory.execute(DG.Command.create({
              name: "map."+change,
              undoString: 'DG.Undo.map.'+change,
              redoString: 'DG.Redo.map.'+change,
              log: 'mapEvent: %@ at {center: %@, zoom: %@}'.fmt(change, newCenter, newZoom),
              _componentId: this.getPath('controller.model.id'),
              _controller: function() {
                return DG.currDocumentController().componentControllersMap[this._componentId];
              },
              execute: function() {
                var view = this._controller().getPath('view.contentView');
                view.setPath('model.center', newCenter);
                view.setPath('model.zoom', newZoom);
              },
              undo: function() {
                // Tell the map to change, but also ignore any events until those changes are done...
                var controller = this._controller(),
                    view = controller.getPath('view.contentView'),
                    map = view.getPath('mapLayer.map');
                view._ignoreMapDisplayChanges = true;
                map.setView(oldCenter, oldZoom);
                view.setPath('model.center', oldCenter);
                view.setPath('model.zoom', oldZoom);
              },
              redo: function() {
                // Tell the map to change, but also ignore any events until those changes are done...
                var controller = this._controller(),
                    view = controller.getPath('view.contentView'),
                    map = view.getPath('mapLayer.map');
                view._ignoreMapDisplayChanges = true;
                map.setView(newCenter, newZoom);
                view.setPath('model.center', newCenter);
                view.setPath('model.zoom', newZoom);
              }
            }));
          }
          this._mapDisplayChangeInProgress = false;
        }
      }.observes('mapLayer.idleCount'),

      /**
       * Override the two mixin methods because the drop target view is mapPointView
       */
      dragStarted: function() {
        DG.GraphDropTarget.dragStarted.apply( this, arguments);
        if( !this.getPath('model.hasLatLongAttributes'))
          this.setPath('mapPointView.isVisible', true);
      },

      dragEnded: function() {
        DG.GraphDropTarget.dragEnded.apply( this, arguments);
        if( !this.getPath('model.hasLatLongAttributes'))
          this.setPath('mapPointView.isVisible', false);
      },

      /**

       */
      selectionDidChange: function() {
        var tAdorn = this.get('connectingLineAdorn');
        if( tAdorn) {
          tAdorn.updateSelection();
        }
      }.observes('selection'),

      /**
       * We've animated to our initial position and along the way lost our bounds.
       */
      didReachInitialPosition: function() {
        this.fitBounds();
      }

    }
);
