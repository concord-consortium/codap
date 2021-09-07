// ==========================================================================
//                          DG.CellLinearAxisView
// 
//  A view of a linear axis possibly broken into cells.
//  
//  Author:   William Finzer
//
//  Copyright (c) 2014 by The Concord Consortium, Inc. All rights reserved.
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

sc_require('components/graph/axes/cell_axis_view');

/** @class

  An axis with a numeric scale, possible broken into cells.

  @extends DG.CellAxisView
*/
DG.CellLinearAxisView = DG.CellAxisView.extend(
/** @scope DG.CellLinearAxisView.prototype */ (function() {
  var kAxisGap = 1,
      kTickLength = 4;

  return {

    displayProperties: 'model.lowerBound model.upperBound model.tickGap'.w(),

    /**
     * @property { DG.NumericAxisViewHelper or DG.DateTimeAxisViewHelper}
     */
    _axisViewHelper: null,
    axisViewHelper: function() {
      var tNewHelperClass = (this.get('isDateTime')) ?
          DG.DateTimeAxisViewHelper : DG.NumericAxisViewHelper;
      if( !this._axisViewHelper || tNewHelperClass !== this._axisViewHelper.constructor) {
        if(this._axisViewHelper)
          this._axisViewHelper.destroy();
        this._axisViewHelper = tNewHelperClass.create( {
          axisView: this
        });
      }
      return this._axisViewHelper;
    }.property('isDateTime'),

    attributeDidChange: function() {
      this._axisViewHelper = null;
    }.observes('model.attributeDescription.attribute'),

    /**
    I work with numbers.
      @return { Boolean }
    */
    isNumeric: true,

    isDateTime: function() {
      return this.getPath('model.attributeDescription.attributeType') ===
          DG.Analysis.EAttributeType.eDateTime;
    }.property(),
    attributeTypeChanged: function() {
      this.notifyPropertyChange('isDateTime');
    }.observes('model.attributeDescription.attributeType'),

    /**
      @property {Number} The coordinate at which the zero line should be drawn. Null if zero
        is not within axis bounds.
    */
    zeroPixel: function() {
      if( (0 >= this.getPath('model.lowerBound')) && (0 <= this.getPath('model.upperBound')))
        return this.dataToCoordinate( 0);
      else
        return null;
    }.property().cacheable(),
    zeroPixelDidChange: function() {
      this.notifyPropertyChange('zeroPixel');
    }.observes('*model.lowerBound', '*model.upperBound', 'pixelMin', 'pixelMax'),

    /**
      @property {Number} Each time we draw the axis, we set this property to the maximum width
        of the number label strings
    */
    maxNumberExtent: 0,

    /**
    coordToString
      @param {Number} location on axis
      @return {String}  Formatted version of world coordinate with decimals appropriate to axis
    */
    coordToString: function( iPixelValue) {
      var tData = this.coordinateToData( iPixelValue),
        tTickGap = this.getPath('model.tickGap'),
        tFracDigits = (tTickGap < 1) ? 1 + Math.ceil( Math.abs( Math.log( tTickGap) / Math.LN10)) : 0,
        tFormat;
      if( (tFracDigits === 0) && (tTickGap < 10))
        tFracDigits++;
      tFormat = DG.Format.number().group("").fractionDigits( 0, tFracDigits);
      return tFormat( tData);
    },

    /**
    We force display which will call createVisualization
    */
    prepareVisualization: function() {
      this.displayDidChange();
    },

    /**
    Called each time we have to regenerate or modify the visualization
    */
    doDraw: function doDraw() {
      var this_ = this,
          tOrientation = this.get('orientation');

      function setupEventHandling() {
        var tFrame = this_.get('frame'),
            tClickHandling = false,
            tLockZero = this_.getPath('model.lockZero');

        // Event handlers
        function beginDrag() {
          this_._dragPanel.show();
          this_._isDragging = true;
          DG.logUser("dragStart: { lower: %@, upper: %@ }",
            this_.getPath('model.lowerBound'), this_.getPath('model.upperBound'));
        }

        function endDrag() {
          this_._dragPanel.hide();
          this_._isDragging = false;
          var newLowerBound = this_.getPath('model.lowerBound'),
              newUpperBound = this_.getPath('model.upperBound'),
              oldLowerBound = this_._lowerBoundAtDragStart,
              oldUpperBound = this_._upperBoundAtDragStart,
              wasDilate = (newLowerBound === oldLowerBound || newUpperBound === oldUpperBound),
              tGraphView = this_.get('parentView'),
              tAxisKey, tGraphModelId;
          if      (tOrientation === DG.GraphTypes.EOrientation.kHorizontal) { tAxisKey = 'xAxisView'; }
          else if (tOrientation === DG.GraphTypes.EOrientation.kVertical)   { tAxisKey = 'yAxisView'; }
          else                                    { tAxisKey = 'y2AxisView'; }

          DG.ObjectMap.forEach(DG.currDocumentController().componentControllersMap, function(id, controller) {
            if (controller.get('graphView') === tGraphView) {
              tGraphModelId = id;
            }
          });

          DG.UndoHistory.execute(DG.Command.create({
            name: (wasDilate ? 'graph.axis.dilate' : 'graph.axis.drag'),
            undoString: (wasDilate ? 'DG.Undo.axisDilate' : 'DG.Undo.axisDrag'),
            redoString: (wasDilate ? 'DG.Redo.axisDilate' : 'DG.Redo.axisDrag'),
            log: "dragEnd: { lower: %@, upper: %@ }".fmt(newLowerBound, newUpperBound),
            _componentId: tGraphModelId,
            _controller: function() {
              return DG.currDocumentController().componentControllersMap[this._componentId];
            },
            _model: function() {
              return this._controller().getPath(tAxisKey+'.model');
            },
            executeNotification: {
              action: 'notify',
              resource: 'component',
              values: {
                operation: 'change axis bounds',
                newBounds: { lower: newLowerBound, upper: newUpperBound },
                type: 'DG.GraphView'
              }
            },
            execute: function() { },
            undo: function() {
              this._model().setLowerAndUpperBounds(oldLowerBound, oldUpperBound, true /* animate */ );
            },
            redo: function() {
              this._model().setLowerAndUpperBounds(newLowerBound, newUpperBound, true /* animate */ );
            }
          }));
        }

        function beginTranslate( iWindowX, iWindowY) {
          if( !tClickHandling) {
            beginDrag();
            this_._lowerBoundAtDragStart = this_.getPath('model.lowerBound');
            this_._upperBoundAtDragStart = this_.getPath('model.upperBound');
          }
        }

        function doTranslate( idX, idY) {
          SC.run(function () {
            if (!tClickHandling && this_._isDragging) {
              //DG.SoundUtilities.drag();
              var tDelta = this_.get('isVertical') ? idY : idX,
                  tHelper = this_.get('axisViewHelper'),
                  tLowerBound = this_.getPath('model.lowerBound'),
                  tCurrentDelta = tHelper.coordinateToDataGivenCell(0, 0) -
                      tHelper.coordinateToDataGivenCell(0, tDelta),
                  tIncDelta = tCurrentDelta - (tLowerBound - this_._lowerBoundAtDragStart);
                this_.get('model').translate(tIncDelta);
            }
          });
        }

        // We are dragging in the lower portion of the axis. The upper bound will remain fixed
        function beginLowerDilate( iWindowX, iWindowY) {
          if( !tClickHandling) {
            var tPoint = DG.ViewUtilities.windowToViewCoordinates(
                          { x: iWindowX, y: iWindowY }, this_);
            this_._dilationAnchorCoord =
                    this_.get( 'isVertical') ? tPoint.y : tPoint.x;
            this_._lowerBoundAtDragStart = this_.getPath('model.lowerBound');
            this_._upperBoundAtDragStart = this_.getPath('model.upperBound');
            beginDrag();
          }
        }

        function doLowerDilate( idX, idY) {
          SC.run(function() {
            if (!tClickHandling && this_._isDragging) {
              //DG.SoundUtilities.drag();
              var tLowerAtStart = this_.get('_lowerBoundAtDragStart'),
                  tUpper = this_.getPath('model.upperBound'),
                  tCurrDelta = this_.get('isVertical') ? idY : idX,
                  tFixed = this_.get('pixelMax'),
                  tDelta = tFixed - this_._dilationAnchorCoord,
                  tFactor = tDelta / (tDelta - tCurrDelta);
              if ((tFactor > 0) && (tFactor < 10)) {
                this_.setPath('model._lowerBound', tLowerAtStart);
                this_.get('model').dilate(tUpper, tFactor);
              }
            }
          });
        }

        // We are dragging in the lower portion of the axis. The upper bound will remain fixed
        function beginUpperDilate( iWindowX, iWindowY) {
          if( !tClickHandling) {
            var tPoint = DG.ViewUtilities.windowToViewCoordinates(
                          { x: iWindowX, y: iWindowY }, this_);
            this_._dilationAnchorCoord =
                    this_.get( 'isVertical') ? tPoint.y : tPoint.x;
            this_._upperBoundAtDragStart = this_.getPath('model.upperBound');
            this_._lowerBoundAtDragStart = this_.getPath('model.lowerBound');
            beginDrag();
          }
        }

        function doUpperDilate( idX, idY) {
          SC.run(function() {
            if( !tClickHandling && this_._isDragging) {
              //DG.SoundUtilities.drag();
              var tUpperAtStart = this_.get('_upperBoundAtDragStart'),
                  tLower = this_.getPath('model.lowerBound'),
                  tCurrDelta = this_.get('isVertical') ? idY : idX,
                  tFixed = this_.get('pixelMin'),
                  tDelta = tFixed - this_._dilationAnchorCoord,
                  tFactor = tDelta / (tDelta - tCurrDelta);
              if ((tFactor > 0) && (tFactor < 10)) {
                this_.setPath('model._upperBound', tUpperAtStart);
                this_.get('model').dilate(tLower, tFactor);
              }
            }
          });
        }

        function setRect( iElement, iX, iY, iWidth, iHeight) {
          iElement.attr( { x: iX, y: iY, width: iWidth, height: iHeight });
        }

        function handleMouseDown( iEvent) {
          tClickHandling = iEvent.altKey;
        }

        function handleMouseMove( iEvent) {
          var tZoomDirection;
          if( iEvent.altKey) {
            var magnifyPlusCursorUrl = static_url('cursors/MagnifyPlus.cur'),
                magnifyMinusCursorUrl = static_url('cursors/MagnifyMinus.cur'),
                cursorUrl = iEvent.shiftKey ? magnifyMinusCursorUrl : magnifyPlusCursorUrl;
            tZoomDirection = iEvent.shiftKey ? "out" : "in";
            this.attr( { cursor:DG.Browser.customCursorStr( cursorUrl, 8, 8),
                  title: "Click to zoom " + tZoomDirection });
          }
          else
            this.attr( { cursor: this.defaultCursor, title: this.defaultTitle });
        }

        function handleMouseUp( iEvent) {
          var tFactor, tViewPoint, tFixedCoord;
          if( iEvent.altKey) {
            tFactor = iEvent.shiftKey ? 2 : 0.5;
            tViewPoint = DG.ViewUtilities.windowToViewCoordinates(
              { x: iEvent.clientX, y: iEvent.clientY }, this_);
            tFixedCoord =  this_.get('isVertical') ? tViewPoint.y : tViewPoint.x;
            this_.get('model').dilate( this_.coordinateToData(tFixedCoord), tFactor,
                          true /* with animation */);
            tClickHandling = false;
          }
        }

        // ============body of setupEventHandling===========
        if( SC.none( this_._midPanel)) {
          this_._midPanel = this_.get('paper').rect(0, 0, 0, 0)
                    .attr({ stroke: DG.RenderingUtilities.kTransparent,
                            fill: DG.RenderingUtilities.kSeeThrough });
          this_._lowerPanel = this_._midPanel.clone();
          this_._upperPanel = this_._midPanel.clone();
          this_._dragPanel = this_._midPanel.clone();
          // It doesn't work to assign mousedown, mouseup, and mousemove to _midPanel
          // and then clone. The handlers don't get cloned. :-(
          if( !tLockZero) {
            this_._midPanel.defaultTitle = 'DG.CellLinearAxisView.midPanelTooltip'.loc(); // "Drag to translate axis scale"
            this_._midPanel.attr({title: this_._midPanel.defaultTitle});
            this_._midPanel.mousedown(handleMouseDown);
            this_._midPanel.mouseup(handleMouseUp);
            this_._midPanel.drag(doTranslate, beginTranslate, endDrag);
            this_._midPanel.mousemove(handleMouseMove);

            this_._lowerPanel.defaultTitle = 'DG.CellLinearAxisView.lowerPanelTooltip'.loc(); // "Drag to change axis lower bound"
            this_._lowerPanel.attr({title: this_._lowerPanel.defaultTitle});
            this_._lowerPanel.mousedown(handleMouseDown);
            this_._lowerPanel.mouseup(handleMouseUp);
            this_._lowerPanel.drag(doLowerDilate, beginLowerDilate, endDrag);
            this_._lowerPanel.mousemove(handleMouseMove);
          }

          this_._upperPanel.defaultTitle = 'DG.CellLinearAxisView.upperPanelTooltip'.loc(); // "Drag to change axis upper bound";
          this_._upperPanel.attr( { title: this_._upperPanel.defaultTitle });
          this_._upperPanel.mousedown( handleMouseDown);
          this_._upperPanel.mouseup( handleMouseUp);
          this_._upperPanel.drag( doUpperDilate, beginUpperDilate, endDrag);
          this_._upperPanel.mousemove( handleMouseMove);

          // Note that the name of this cursor canNOT be "ClosedHand" or in Safari
          // you will get a black closed hand no matter what is in the file.
          this_._dragPanel.attr( { cursor: DG.Browser.customCursorStr(static_url('cursors/ClosedHandXY.cur'), 8, 8) });
        }
        switch( this_.get('orientation')) {
          case DG.GraphTypes.EOrientation.kVertical:
          case DG.GraphTypes.EOrientation.kVertical2:
            if( !tLockZero) {
              setRect(this_._lowerPanel, 0, (5 / 8) * tFrame.height, tFrame.width, (3 / 8) * tFrame.height);
              this_._lowerPanel.defaultCursor = DG.Browser.customCursorStr(static_url('cursors/DownDilate.cur'), 8, 8);
              this_._lowerPanel.attr({cursor: this_._lowerPanel.defaultCursor});
              setRect(this_._midPanel, 0, (3 / 8) * tFrame.height, tFrame.width, (3 / 8) * tFrame.height);
              this_._midPanel.defaultCursor = DG.Browser.customCursorStr(static_url('cursors/TranslateY.cur'), 8, 8);
              this_._midPanel.attr({cursor: this_._midPanel.defaultCursor});
            }
            setRect(this_._upperPanel, 0, 0, tFrame.width, (tLockZero ? 1 : (3 / 8)) * tFrame.height);
            this_._upperPanel.defaultCursor = DG.Browser.customCursorStr(static_url('cursors/UpDilate.cur'), 8, 8);
            this_._upperPanel.attr({ cursor: this_._upperPanel.defaultCursor });
            setRect(this_._dragPanel, 0, 0, tFrame.width, tFrame.height);
            break;
          case DG.GraphTypes.EOrientation.kHorizontal:
            if( !tLockZero) {
              setRect(this_._lowerPanel, 0, 0, (3 / 8) * tFrame.width, tFrame.height);
              this_._lowerPanel.defaultCursor = DG.Browser.customCursorStr(static_url('cursors/LeftDilate.cur'), 8, 8);
              this_._lowerPanel.attr({cursor: this_._lowerPanel.defaultCursor});
              setRect(this_._midPanel, (3 / 8) * tFrame.width, 0, (3 / 8) * tFrame.width, tFrame.height);
              this_._midPanel.defaultCursor = DG.Browser.customCursorStr(static_url('cursors/TranslateX.cur'), 8, 8);
              this_._midPanel.attr({cursor: this_._midPanel.defaultCursor});
            }
            setRect(this_._upperPanel, (tLockZero ? 0 : (5 / 8) * tFrame.width), 0,
                (tLockZero ? 1 : (3 / 8)) * tFrame.width, tFrame.height);
            this_._upperPanel.defaultCursor = DG.Browser.customCursorStr(static_url('cursors/RightDilate.cur'), 8, 8);
            this_._upperPanel.attr({ cursor: this_._upperPanel.defaultCursor });
            setRect(this_._dragPanel, 0, 0,
                tFrame.width, tFrame.height);
            break;
        }
        if( !this_._isDragging)
            this_._dragPanel.hide();
      }

      // ===============Main body of doDraw===============

      this._elementsToClear.push( this.renderAxisLine());
      this.get('axisViewHelper').drawTicks();
      setupEventHandling();
      this.renderLabel();
    },

    /**
     Given the value to plot return the coordinate along this axis.
     @return {Number}
     */
    dataToCoordinate: function( iData) {
      return this.get('axisViewHelper').dataToCoordinate( iData);
    },

    /**
    Given a coordinate, return the result of the linear transformation
    to data value
     @param iCoord {number}
     @param iSnapToTick {boolean} if true, and return value is close to a tick, return the tick value
     @return {Number} in world coordinates.
    */
    coordinateToData: function( iCoord, iSnapToTick) {
      return this.get('axisViewHelper').coordinateToData( iCoord, iSnapToTick);
    },

    /**
     * Called typically be a ValueAnimator to get the amount to increment a value displayed along the axis
     * @property {Number}
     */
    increment: function() {
      return this.coordinateToData(1) - this.coordinateToData(0);
    }.property('frame').cacheable(),

    incrementDidChange: function() {
      this.notifyPropertyChange('increment');
    }.observes('*model.lowerBound', '*model.upperBound'),

    /**
    Return the maximum length of the label strings plus a bit extra.
      @property {Number} of pixels
    */
    desiredExtent: function() {
      var tExtent = sc_super() + kAxisGap + kTickLength + this.get('maxNumberExtent');
      return tExtent;
    }.property('maxNumberExtent'),

    /**
    Call the given function once for each tick with arguments
        iWorldCoordinateOfTick, iScreenCoordinateOfTick
      @param {Function} to be called for each tick
    */
    forEachTickDo: function( iDoF) {
      this.get('axisViewHelper').forEachTickDo( iDoF);
    },

    _isDragging: false,
    _lowerBoundAtDragStart: null,
    _upperBoundAtDragStart: null,
    _dilationAnchorCoord: null,
    _dragPanel: null,
    _lowerPanel: null,
    _midPanel: null,
    _upperPanel: null
  };

}())
);

