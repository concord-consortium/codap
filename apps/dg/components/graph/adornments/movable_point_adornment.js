// ==========================================================================
//                      DG.MovablePointAdornment
//
//  Author:   William Finzer
//
//  Copyright (c) 2017 by The Concord Consortium, Inc. All rights reserved.
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

sc_require('components/graph/utilities/plot_utilities');
sc_require('components/graph_map_common/layer_names');

/** @class  Draws a movable point.

 @extends DG.PlotAdornment
 */
DG.MovablePointAdornment = DG.PlotAdornment.extend(
    /** @scope DG.MovablePointAdornment.prototype */
    {
      defaultColor: DG.PlotUtilities.kDefaultMovablePointColor,
      defaultRadius: DG.PlotUtilities.kDefaultMovablePointRadius,

      /**
       Concatenated array of ['PropertyName','ObserverMethod'] pairs used for indicating
       which observers to add/remove from the model.

       @property   {Array of [{String},{String}]}  Elements are ['PropertyName','ObserverMethod']
       */
      modelPropertiesToObserve: [['coordinates', 'updateToModel']],

      layerName: DG.LayerNames.kDataTip,

      opacity: 0.6,
      strokeOpacity: 0.8,

      /**
       The point itself is a single point element
       @property { Raphael point element }
       */
      point: null,

      /**
       The point has a shadow, offset down and to the right by 1 pixel
       @property { Raphael point element }
       */
      shadow: null,

      /**
       * Lazy instantiation.
       * @property {DG.PointDataTip }
       */
      dataTip: function() {
        if( !this._dataTip) {
          this._dataTip = DG.MovablePointDataTip.create( { plotLayer: this.get('paperSource'),
            layerName: DG.LayerNames.kDataTip, movablePoint: this.get('model') });
        }
        return this._dataTip;
      }.property(),

      /**
       * @property {Boolean} Indicates whether dragging is in progress
       */
      dragging: false,

      /**
       Make the pieces of the movable line. This only needs to be done once.
       */
      createElements: function () {
        var tXAxisView = this.get('xAxisView'),
            tYAxisView = this.get('yAxisView'),
            tOriginalCoordinates,
            tDragPoint;

        //=============Event handling functions===============
        var overScope = function () {
/*
              var tAttributes = {stroke: DG.PlotUtilities.kLineHighlightColor};
              this.point.stop();
              this.point.animate(tAttributes, DG.PlotUtilities.kHighlightShowTime);
*/

              this.get('dataTip').show( this.point.attr('cx'), this.point.attr('cy'), this.point.attr('r'));
            }.bind(this),

            outScope = function () {
/*
              var tAttributes = {stroke: DG.RenderingUtilities.kSeeThrough};
              if (!tDragging) {
                this.point.stop();
                this.point.animate(tAttributes, DG.PlotUtilities.kHighlightHideTime);
              }
*/
              this.get('dataTip').hide();
            }.bind(this),

            beginDrag = function (iWindowX, iWindowY) {
              tOriginalCoordinates = this.getPath('model.coordinates');
              tDragPoint = DG.ViewUtilities.windowToViewCoordinates(
                  {x: iWindowX, y: iWindowY}, this.parentView);
              overScope();
              this.set('dragging', true);
            }.bind(this),

            continueDrag = function (idX, idY) {
              this.setPath( 'model.coordinates', {  x: tXAxisView.coordinateToData( tDragPoint.x + idX),
                                  y: tYAxisView.coordinateToData( tDragPoint.y + idY) });
            }.bind(this),

            endDrag = function (idX, idY) {
              var tOriginal = tOriginalCoordinates,
                  tNew;
              DG.UndoHistory.execute(DG.Command.create({
                name: "graph.moveMovablePoint",
                undoString: 'DG.Undo.graph.moveMovablePoint',
                redoString: 'DG.Redo.graph.moveMovablePoint',
                log: "Moved movable point from %@ to %@".fmt( tOriginal, this.getPath('model.coordinates')),
                executeNotification: {
                  action: 'notify',
                  resource: 'component',
                  values: {
                    operation: 'drag movable point',
                    type: 'DG.GraphView'
                  }
                },
                execute: function() {
                  tNew = this.getPath('model.coordinates');
                }.bind( this),
                undo: function() {
                  this.setPath('model.coordinates', tOriginal);
                }.bind( this),
                redo: function() {
                  this.setPath('model.coordinates', tNew);
                }.bind( this)
              }));
              this.set('dragging', false);
              // outScope();
            }.bind(this);

        //=============Main body of createElements===============

        if (this.myElements && (this.myElements.length > 0))
          return; // already created

        var tLayer = this.get('layer'),
            tPaper = this.get('paper');

        this.point = tPaper.circle(0, 0, this.defaultRadius)
            .attr({fill: this.defaultColor, opacity: 0, stroke: 'black', 'stroke-opacity': 0, cursor: 'move'})
            .drag( continueDrag, beginDrag, endDrag)
            .hover( overScope, outScope);
        this.point.animatable = true;
        // Tune up the point rendering a bit
        this.point.node.setAttribute('shape-rendering', 'geometric-precision');

        this.shadow = tPaper.circle(0, 0, this.defaultRadius)
            .attr({ 'stroke-width': 2, stroke: 'darkgray', 'stroke-opacity': 0});
        this.shadow.animatable = true;
        // Tune up the shadow rendering a bit
        this.shadow.node.setAttribute('shape-rendering', 'geometric-precision');

        this.myElements = [ this.shadow, this.point ];
        this.myElements.forEach(function (iElement) {
          tLayer.push(iElement);
        });
        return this.myElements;
      },

      /**
       * Set coordinates based on model.
       * Decide whether to animate based on opacity.
       */
      updateToModel: function () {
        if (!this.getPath('model.isVisible'))
          return;
        if (this.myElements === null)
          this.createElements();
        var tXAxisView = this.get('xAxisView'),
            tYAxisView = this.get('yAxisView'),
            tModel = this.get('model'),
            tCoords = tModel.get('coordinates'),
            tScreenCoords = worldToScreen( tCoords),
            tPoint = this.get('point'),
            tShadow = this.get('shadow'),
            tLayer = this.get('layer');

        function worldToScreen(iWorld) {
          return {
            cx: tXAxisView.dataToCoordinate(iWorld.x),
            cy: tYAxisView.dataToCoordinate(iWorld.y)
          };
        }
        if( this.get('dragging') || tPoint.attr('opacity') === 0) {
          tPoint.attr(tScreenCoords);
          tShadow.attr({cx: tScreenCoords.cx + 1, cy: tScreenCoords.cy + 1});
        } else {
          tPoint.animate(tScreenCoords, DG.PlotUtilities.kDefaultAnimationTime, '<>');
          tShadow.animate({cx: tScreenCoords.cx + 1, cy: tScreenCoords.cy + 1},
              DG.PlotUtilities.kDefaultAnimationTime, '<>');
        }
        if( tPoint.attr('opacity') === 0) {
          tPoint.animate({opacity: this.opacity, 'stroke-opacity': this.strokeOpacity}, DG.PlotUtilities.kDefaultAnimationTime, '<>');
          tShadow.animate({ 'stroke-opacity': 0.8}, DG.PlotUtilities.kDefaultAnimationTime, '<>');
        }
        tLayer.bringToFront(tShadow);
        tLayer.bringToFront(tPoint);
      }

    });

