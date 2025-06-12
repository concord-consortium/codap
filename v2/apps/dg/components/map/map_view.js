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


/** @class  DG.MapView

 A view on a map and plotted data.

 @extends SC.View
 */
DG.MapView = SC.View.extend(DG.GraphDropTarget,
    /** @scope DG.MapView.prototype */ {

      displayProperties: ['model.dataConfiguration.attributeAssignment'],

      kPadding: [10, 10],

      /**
       * @property {DG.MapModel}
       */
      model: null,

      /**
       A map view is neither horizontal or vertical. Distinguish it from axes
       @property { String }
       */
      orientation: DG.GraphTypes.EOrientation.kNone,

      /**
       * @property {DG.Attribute}
       */
      plottedAttribute: function() {
        var tLegendViews = this.get('legendViews');
        return tLegendViews.length === 1 ? tLegendViews[0].get('plottedAttribute') : null;
      }.property(),

      /**
       * @property {DG.BaseMapView}
       */
      mapLayer: null,
      mapBinding: '.mapLayer.map',

      /**
       * @property [{DG.MapPolygonLayer}]
       */
      mapPolygonLayers: null,

      /**
       * @property {DG.MapPointView}
       */
      mapPointView: null,

      /**
       * @property {DG.MapGridLayer}
       */
      mapGridLayer: null,

      /**
       * @property [{DG.LegendView}]
       */
      legendViews: null,

      /**
       * Assigned on creation. Called with newly created LegendView.
       * @property {Function}
       */
      legendViewCreationCallback: null,

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

      paper: function () {
        return this.getPath('mapPointView.paper');
      }.property(),

      layerManager: function () {
        return this.getPath('mapPointView.layerManager');
      }.property(),

      dataConfiguration: function() {
        return this.getPath('model.firstDataConfiguration');
      }.property(),

      init: function () {
        sc_super();
        var tMapLayer = DG.BaseMapView.create({model: this.get('model')});

        this.set('mapLayer', tMapLayer);
        this.appendChild(tMapLayer);

        this.legendViews = [];

        this.gridControl = SC.SliderView.create({
          controlSize: SC.SMALL_CONTROL_SIZE,
          layout: {width: 40, height: 16, top: 16, right: 58},
          toolTip: 'DG.MapView.gridControlHint'.loc(),
          classNames: ['dg-map-grid-slider'],
          minimum: 0.1,
          maximum: 2.0,
          step: 0,
          value: this.getPath('model.gridMultiplier'),
          persistedValue: this.getPath('model.gridMultiplier'),
          previousPersistedValue: this.getPath('model.gridMultiplier'),
          isVisible: false,
          mouseUp: function (iEvent) {
            sc_super();
            if (this.get('value') !== this.get('persistedValue')) {
              this.set('previousPersistedValue', this.get('persistedValue'));
              this.set('persistedValue', this.get('value'));
              DG.logUser('changeGridMultiplier: %@', this.get('value'));
            }
          }
        });
        this.appendChild(this.gridControl);

        this.marqueeTool = SC.ImageButtonView.create({
          buttonBehavior: SC.PUSH_BEHAVIOR,
          layout: {right: 10, top: 9, width: 32, height: 32},
          toolTip: 'DG.MapView.marqueeHint'.loc(),
          image: 'dg-map-marquee',
          action: 'setMarqueeMode',
          isVisible: false
        });
        this.appendChild(this.marqueeTool);

        // Don't trigger undo events until the map has settled down initially
        this._ignoreMapDisplayChanges = true;
        tMapLayer._setIdle();

        DG.globalsController.addObserver('globalValueChanges', this, 'globalValueDidChange');
      },

      destroy: function () {
        this._ignoreMapDisplayChanges = true; // So we don't install an idleTask in response to layout changes
        this.model.destroy(); // so that it can unlink observers
        DG.globalsController.removeObserver('globalValueChanges', this, 'globalValueDidChange');
        this.get('legendViews').forEach( function( iLegendView) {
          iLegendView.removeObserver('dragData', this, this.legendDidAcceptDrop);
        });
        sc_super();
      },

      setMarqueeMode: function () {
        var tMapPointView = this.get('mapPointView'),
            tMapGridLayer = this.get('mapGridLayer');
        if (tMapPointView && tMapPointView.get('isVisible')) {
          tMapPointView.set('isInMarqueeMode', true);
        }
        else if (tMapGridLayer && tMapGridLayer.get('isVisible')) {
          tMapGridLayer.set('isInMarqueeMode', true);
        }
        DG.logUser('marqueeToolSelect');
      },

      marqueeModeChanged: function () {
        var tGridInMarqueeMode = this.getPath('mapGridLayer.isInMarqueeMode'),
            tImage = (this.getPath('mapPointView.isInMarqueeMode') || tGridInMarqueeMode) ?
                'dg-map-marquee-selected' :
                'dg-map-marquee';
        this.setPath('marqueeTool.image', tImage);
      }.observes('mapPointView.isInMarqueeMode', 'mapGridLayer.isInMarqueeMode'),

      changeBaseMap: function (iNewValue) {
        var tOldBackground = this.getPath('model.baseMapLayerName');
        DG.UndoHistory.execute(DG.Command.create({
          name: "map.changeBaseMap",
          undoString: 'DG.Undo.map.changeBaseMap',
          redoString: 'DG.Redo.map.changeBaseMap',
          log: 'Map base layer changed: %@'.fmt(iNewValue),
          _componentId: this.getPath('controller.model.id'),
          _controller: function () {
            return DG.currDocumentController().componentControllersMap[this._componentId];
          },
          executeNotification: {
            action: 'notify',
            resource: 'component',
            values: {
              operation: 'change base map',
              type: 'DG.MapView'
            }
          },
          execute: function () {
            this._controller().setPath('view.contentView.model.baseMapLayerName', iNewValue);
          },
          undo: function () {
            this._controller().setPath('view.contentView.model.baseMapLayerName', tOldBackground);
            this._controller().setPath('view.contentView.backgroundControl.value', [tOldBackground]);
          },
          redo: function () {
            this._controller().setPath('view.contentView.model.baseMapLayerName', iNewValue);
            this._controller().setPath('view.contentView.backgroundControl.value', [iNewValue]);
          }
        }));
      },

      changeGridSize: function () {
        var tControlValue = this.gridControl.get('value');
        this.setPath('model.gridMultiplier', tControlValue);
      }.observes('gridControl.value'),

      changePersistedGridSize: function () {
        var tControlValue = this.gridControl.get('persistedValue'),
            tPreviousControlValue = this.gridControl.get('previousPersistedValue');

        DG.UndoHistory.execute(DG.Command.create({
          name: "map.changeGridSize",
          undoString: 'DG.Undo.map.changeGridSize',
          redoString: 'DG.Redo.map.changeGridSize',
          log: "Map grid size changed: {from: %@, to: %@}".fmt(tPreviousControlValue, tControlValue),
          _componentId: this.getPath('controller.model.id'),
          _controller: function () {
            return DG.currDocumentController().componentControllersMap[this._componentId];
          },
          executeNotification: {
            action: 'notify',
            resource: 'component',
            values: {
              operation: 'change grid size',
              type: 'DG.MapView'
            }
          },
          execute: function () {
          },
          undo: function () {
            this._controller().setPath('view.contentView.model.gridMultiplier', tPreviousControlValue);
            this._controller().setPath('view.contentView.gridControl.value', tPreviousControlValue);
          },
          redo: function () {
            this._controller().setPath('view.contentView.model.gridMultiplier', tControlValue);
            this._controller().setPath('view.contentView.gridControl.value', tControlValue);
          }
        }));
      }.observes('gridControl.persistedValue'),

      addPointLayers: function () {
        if (!this.get('mapPointView')) {

          var tMapPointView = DG.MapPointView.create(
              {
                mapLayer: this.get('mapLayer'),
                model: this.get('model')
              });

          this.set('mapPointView', tMapPointView);
          this.appendChild(tMapPointView);
        }
        else {
          this.get('mapPointView').addMapPointLayers();
        }

        var tAlreadyUsedMapPointLegends = this.get('legendViews').map(function (iLegendView) {
              return iLegendView.get('model');
            }),
            tUnusedMapPointLayers = this.getPath('mapPointView.mapPointLayers').filter( function( iLayer) {
              return tAlreadyUsedMapPointLegends.indexOf( iLayer.getPath('model.legend')) < 0;
            });
        tUnusedMapPointLayers.forEach(function (iMapPointLayer) {
          var tNewLegendView = DG.LegendView.create( { model: iMapPointLayer.getPath('model.legend')});
          this.observeLegendView( tNewLegendView);
          this.appendChild(tNewLegendView);
          this.legendViewCreationCallback(tNewLegendView);
          this.get('legendViews').push( tNewLegendView);
        }.bind( this));

        this.adjustLayout(this.renderContext(this.get('tagName')));
        this.updateMarqueeToolVisibility();
        this.updateGridControlVisibility();
      },

      numberOfLayerModelsChanged: function () {

        function processLayerArray( iLayerArray) {
          iLayerArray.filter( function( iLayer) {
            return tMapLayerModels.indexOf( iLayer.get('model')) < 0;
          }).forEach( function( iLayerToRemove) {
            iLayerArray.splice( iLayerArray.indexOf( iLayerToRemove) , 1);
            iLayerToRemove.destroy();
          });
        }

        var tMapLayerModels = this.getPath( 'model.mapLayerModels'),
            tPolygonLayers = this.get('mapPolygonLayers'),
            tPointLayers = this.getPath('mapPointView.mapPointLayers');
        if( tMapLayerModels.length > tPolygonLayers.length + tPointLayers.length) {
          // The routines to add point and polygon layers check to avoid duplicates, so we can just call them both.
          this.addPointLayers();
          this.addPolygonLayers();
          this.displayDidChange();
          this.fitBounds();
        }
        else {
          processLayerArray( tPolygonLayers);
          processLayerArray( tPointLayers);
          this.displayDidChange();
        }
        this.updateMarqueeToolVisibility();
      }.observes('model.mapLayerModelsChange'),

      updateMarqueeToolVisibility: function () {
        this.setPath('marqueeTool.isVisible', this.getPath('model.somethingIsSelectable'));
      },

      somethingIsSelectableDidChange: function() {
        this.updateMarqueeToolVisibility();
      }.observes('model.somethingIsSelectable'),

      updateGridControlVisibility: function () {
        this.setPath('gridControl.isVisible', this.getPath('model.gridIsVisible'));
      },

      gridIsVisibleDidChange: function() {
        this.updateGridControlVisibility();
      }.observes('model.gridIsVisible'),

      addPolygonLayers: function () {
        var tNewLayerAdded = false;
        if (!this.get('mapPolygonLayers')) {
          this.set('mapPolygonLayers', []);
        }
        var tLegendViews = this.get('legendViews'),
            tPolygonLayers = this.get('mapPolygonLayers'),
            tModelsForExistingLayers = tPolygonLayers.map(function (iLayer) {
              return iLayer.get('model');
            });
        this.getPath('model.mapLayerModels').forEach(function (iLayerModel) {
          if (iLayerModel.constructor === DG.MapPolygonLayerModel &&
              tModelsForExistingLayers.indexOf(iLayerModel) < 0) {
            var tNewLayer = DG.MapPolygonLayer.create(
                {
                  mapSource: this,
                  model: iLayerModel
                });
            tPolygonLayers.push(tNewLayer);
            tNewLayer.addFeatures();
            var tLegendView = DG.LegendView.create({model: iLayerModel.get('legend')});
            this.observeLegendView( tLegendView);
            this.appendChild(tLegendView);
            tLegendViews.push(tLegendView);
            this.legendViewCreationCallback(tLegendView);
            tNewLayerAdded = true;
          }
        }.bind(this));
        if (!this.getPath('model.centerAndZoomBeingRestored') && tNewLayerAdded) {
          this.fitBounds();
        }
      },

      /**
       * Cause the map to shrink or expand to encompass the data
       */
      fitBounds: function () {
        var tPolygonLayers = this.get('mapPolygonLayers'),
            tPointView = this.get('mapPointView'),
            tBounds = tPointView ? tPointView.getBounds() : null;
        if (tPolygonLayers) {
          tPolygonLayers.forEach(function (iLayer) {
            if( iLayer.getPath('model.isVisible')) {
              var tPolyBounds = iLayer.getBounds();
              if (!SC.none(tPolyBounds)) {
                if (!tBounds)
                  tBounds = tPolyBounds;
                else
                  tBounds.extend(tPolyBounds);
              }
            }
          });
        }
        if (tBounds && tBounds.isValid()) {
          this._fitBoundsInProgress = true;
          this.getPath('mapLayer.map').fitBounds(tBounds, {padding: this.kPadding, animate: true});
          this.get('mapLayer')._setIdle();
        }
      },

      observeLegendView: function( iLegendView) {
        iLegendView.addObserver('dragData', this, this.legendDidAcceptDrop);
      },

      /**
       * We pass the notification along to our controller by setting dragData as though the drop
       * had been received by us.
       * @param iView
       * @param iKey
       */
      legendDidAcceptDrop: function(iView, iKey) {
        this.set('dragData', iView.get('dragData'));
      },

      viewDidResize: function () {
        sc_super();
        this.adjustLayout(this.renderContext(this.get('tagName')));
      },

      /**
       Set the layout (view position) for our subviews.
       @returns {void}
       */
      adjustLayout: function (context, firstTime) {
        var tMapLayer = this.get('mapLayer'),
            tMapPointView = this.get('mapPointView'),
            tLegendHeight = 0;

        if (this._isRenderLayoutInProgress || !tMapPointView)
          return;
        this._isRenderLayoutInProgress = true;

        this.get('legendViews').forEach(function (iLegendView) {
          var tHeight = iLegendView.get('desiredExtent');
          iLegendView.set('layout', {bottom: tLegendHeight, height: tHeight});
          tLegendHeight += tHeight;
        }.bind(this));

        // adjust() method avoids triggering observers if layout parameter is already at correct value.
        tMapPointView.adjust('bottom', tLegendHeight);
        tMapLayer.adjust('bottom', tLegendHeight);

        this._isRenderLayoutInProgress = false;
        // The polygons in the map, if any, may now be exposed, so give it a nudge so that they will repaint.
        this.invokeLast( function() {
          this.getPath('mapLayer.map').invalidateSize({pan: false});
        }.bind(this));
      }.observes('model.legendAttributeChange'),

      /**
       * Private property to prevent recursive execution of renderLayout. Seems most important in Firefox.
       */
      _isRenderLayoutInProgress: false,

      /**
       * This is our chance to add the features to the area layer
       */
      createVisualization: function () {
        var tPolygonLayers = this.get('mapPolygonLayers');
        if (tPolygonLayers) {
          tPolygonLayers.forEach(function (iLayer) {
            iLayer.createVisualization();
          });
        }
      },

      /**
       Called when the value of a global value changes (e.g. when a slider is dragged).
       */
      globalValueDidChange: function () {
        var tPolygonLayers = this.get('mapPolygonLayers');
        if (tPolygonLayers) {
          tPolygonLayers.forEach(function (iLayer) {
            iLayer.refreshComputedLegendColors();
          });
        }
      },

      handleMapLayerDisplayChange: function () {
        var tMapPointView = this.get('mapPointView'),
            tLastEventType = this.getPath('mapLayer.lastEventType');
        if (tMapPointView) {
          if (tLastEventType === 'dragstart') {
            tMapPointView.set('isVisible', false);
          }
          else if (tLastEventType === 'moveend') {
            tMapPointView.doDraw();
            tMapPointView.set('isVisible', true);
          }
          tMapPointView.updateConnectingLines();
        }

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

      /**
       * Clicks have to be handled carefully because we don't want a click on the map background to deselect
       * everything if the click is the click that first selects the map component.
       * So didBecomeSelected sets a temporary flag that remains set for a brief time so we can use it to
       * decide whether we should deselect everything.
       */
      handleClick: function () {
        if (!this.justSelected)
          this.get('model').selectAll(false);
      }.observes('mapLayer.clickCount'),

      didBecomeSelected: function() {
        this.justSelected = true;
        this.invokeLater( function() {
          this.justSelected = false;
        }, 500);
      }.observes('parentView.parentView.isSelected'),

      handleIdle: function () {
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
              name: "map." + change,
              undoString: 'DG.Undo.map.' + change,
              redoString: 'DG.Redo.map.' + change,
              causedChange: this.getPath('mapLayer.lastEventType') !== 'moveend',
              log: 'mapEvent: %@ at {center: %@, zoom: %@}'.fmt(change, newCenter, newZoom),
              _componentId: this.getPath('controller.model.id'),
              _controller: function () {
                return DG.currDocumentController().componentControllersMap[this._componentId];
              },
              executeNotification: {
                action: 'notify',
                resource: 'component',
                values: {
                  operation: 'change map coordinates',
                  type: 'DG.MapView'
                }
              },
              execute: function () {
                var view = this._controller().getPath('view.contentView');
                view.setPath('model.center', newCenter);
                view.setPath('model.zoom', newZoom);
              },
              undo: function () {
                // Tell the map to change, but also ignore any events until those changes are done...
                var controller = this._controller(),
                    view = controller.getPath('view.contentView'),
                    map = view.getPath('mapLayer.map');
                view._ignoreMapDisplayChanges = true;
                map.setView(oldCenter, oldZoom);
                view.setPath('model.center', oldCenter);
                view.setPath('model.zoom', oldZoom);
              },
              redo: function () {
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
      dragStarted: function () {
        if(this.get('dataConfiguration')) {
          DG.GraphDropTarget.dragStarted.apply(this, arguments);
          if (!this.getPath('model.hasLatLongAttributes'))
            this.setPath('mapPointView.isVisible', true);
        }
      },

      dragEntered: function() {
        if(this.get('dataConfiguration')) {
          DG.GraphDropTarget.dragEntered.apply(this, arguments);
        }
      },

      dragExited: function() {
        if(this.get('dataConfiguration')) {
          DG.GraphDropTarget.dragExited.apply(this, arguments);
        }
      },

      dragEnded: function () {
        if(this.get('dataConfiguration')) {
          DG.GraphDropTarget.dragEnded.apply(this, arguments);
        }
      },

      /**

       */
      selectionDidChange: function () {
        var tAdorn = this.get('connectingLineAdorn');
        if (tAdorn) {
          tAdorn.updateSelection();
        }
      }.observes('selection'),

      /**
       * We've animated to our initial position and along the way lost our bounds.
       */
      didReachInitialPosition: function () {
        this.fitBounds();
      }

    }
);
