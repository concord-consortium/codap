// ==========================================================================
//                      DG.MovableValueAdornment
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

sc_require('components/graph/adornments/plot_adornment');
sc_require('components/graph/adornments/line_label_mixin');
sc_require('components/graph/adornments/value_axis_view_mixin');

/** @class  Draws a movable line.
 *          Mixes in the DG.ValueAxisViewMixin for handling axis notifications that trigger updates.

  @extends DG.PlotAdornment
*/
DG.MovableValueAdornment = DG.PlotAdornment.extend( DG.LineLabelMixin, DG.ValueAxisViewMixin,
/** @scope DG.MovableValueAdornment.prototype */ 
{
  kLineSlideHCur: DG.Browser.customCursorStr(static_url('cursors/LineSlideH.cur'), 8, 8),
  kLineSlideVCur: DG.Browser.customCursorStr(static_url('cursors/LineSlide.cur'), 8, 8),
  kLabelSpace: 50,  // pixels

  /**
    The movable value itself is a single line element
    @property { Raphael line element }
  */
  lineSeg: null,

  /**
    We cover the line segment with a wider segment for hit-testing and hilighting
    @property { Raphael line element }
  */
  coverSeg: null,

  /**
   * A small square caps the line
   */
  cap: null,

  orientation: function() {
    return this.getPath('valueAxisView.orientation');
  }.property(),

  screenCoord: function() {
    return this.get('valueAxisView').dataToCoordinate( this.getPath('model.value'));
  }.property(),

  /**
    @property { Number }
  */
  value: function() {
    return this.getPath('model.value');
  }.property(),

  valueDidChange: function () {
    this.notifyPropertyChange('value');
  }.observes('*model.value'),

  /**
    The returned string should have a reasonable number of significant digits for the
      circumstances.
    @property { String read only }
  */
  valueString: function() {

    var dateTimeString = function() {
          var tAxisViewHelper = this.getPath('valueAxisView.axisViewHelper'),
              tResolution = tAxisViewHelper.getValueDisplayResolution(),
              tDateValue = new Date( tValue * 1000),
              tYear = tDateValue.getFullYear(),
              tMonthName = DG.monthName( tValue),
              tDay = tDateValue.getDate(),
              tHour = tDateValue.getHours()/*,
              tMinute = tDateValue.getMinutes(),
              tSecond = tDateValue.getSeconds()*/;
          switch( tResolution) {
            case 'year': return String(tYear);
            case 'month': return 'DG.MovableMonthYear'.loc( tMonthName, tYear);
            case 'day': return tDateValue.toLocaleDateString();
            case 'hour': return 'DG.MovableMonthDayHour'.loc( tMonthName, tDay, tHour);
            case 'second':
            case 'minute': return tDateValue.toLocaleTimeString();
          }

          return DG.DataUtilities.formatDate( tValue);
        }.bind( this),

        numericString = function() {
          var tDigits = DG.PlotUtilities.findFractionDigitsForAxis( this.get('valueAxisView')),
              tNumFormat = DG.Format.number().fractionDigits( 0, tDigits);
          if( tValue < 2500 )
            tNumFormat.group('');
          return tNumFormat( tValue);
        }.bind( this);

    var tValue = this.get('value');

    if( this.getPath('valueAxisView.isDateTime'))
      return dateTimeString();
    else
      return numericString();
  }.property().cacheable(),
  valueStringDidChange: function() {
    this.notifyPropertyChange('valueString');
  }.observes('*model.value', '*valueAxisView.model.firstAttributeName'),

  /**
    Concatenated array of ['PropertyName','ObserverMethod'] pairs used for indicating
    which observers to add/remove from the model.
    
    @property   {Array of [{String},{String}]}  Elements are ['PropertyName','ObserverMethod']
   */
  modelPropertiesToObserve: [ ['value', 'updateToModel'],
                              ['removed', 'modelWasRemoved']],

  modelWasRemoved: function() {
    this.detachModel();
  },

  /**
    Make the movable line. This only needs to be done once.
  */
  createElements: function() {
    var this_ = this,
        tPaper = this.get('paper'),
        tLayer = this.get('layer' ),
        tDragCoord,
        tOriginalValue;
  
    //=============Event handling functions===============
    function beginTranslate( iWindowX, iWindowY) {
      tOriginalValue = this_.getPath('model.value');
      var tDragPoint = DG.ViewUtilities.windowToViewCoordinates( 
                    { x: iWindowX, y: iWindowY }, this_.parentView);
      tDragCoord = (this_.get('orientation') === DG.GraphTypes.EOrientation.kHorizontal) ?
                        tDragPoint.x : tDragPoint.y;
    }
    
    function continueTranslate( idX, idY) {
      var tAxisView = this_.get('valueAxisView'),
          tDelta = (tAxisView.get('orientation') === DG.GraphTypes.EOrientation.kHorizontal) ? idX : idY,
          tValue = tAxisView.coordinateToData( tDragCoord + tDelta, true /* snapToTick */);
      this_.setPath('model.value', tValue);
    }
  
    function endTranslate( idX, idY) {
      var tOriginal = tOriginalValue,
          tNew;
      DG.logUser("dragMovableValue: '%@'", this_.get('valueString'));
      DG.UndoHistory.execute(DG.Command.create({
        name: "graph.moveMovableValue",
        undoString: 'DG.Undo.graph.moveMovableValue',
        redoString: 'DG.Redo.graph.removeMovableValue',
        log: "Moved movable value from %@ to %@".fmt( tOriginal, this_.get('value')),
        executeNotification: {
          action: 'notify',
          resource: 'component',
          values: {
            operation: 'drag movable line',
            type: 'DG.GraphView'
          }
        },
        execute: function() {
          tNew = this_.getPath('model.value');
        },
        undo: function() {
          this_.setPath('model.value', tOriginal);
        },
        redo: function() {
          this_.setPath('model.value', tNew);
        }
      }));
    }

    function overScope() {
      var tAttributes = { stroke: DG.PlotUtilities.kMovableLineHighlightColor };
      this_.coverSeg.stop();
      this_.coverSeg.animate( tAttributes, DG.PlotUtilities.kHighlightShowTime);
    }

    function outScope() {
      var tAttributes = { stroke: DG.RenderingUtilities.kSeeThrough };
      this_.coverSeg.stop();
      this_.coverSeg.animate( tAttributes, DG.PlotUtilities.kHighlightHideTime);
    }

    //=============Main body of createElements===============

    if( this.myElements && (this.myElements.length > 0))
      return; // already created
    if( !tPaper)
      return; // Not ready yet
    var tCapSize = DG.PlotUtilities.kMovableValueCapSize,
        tCur = (this.get('orientation') === DG.GraphTypes.EOrientation.kHorizontal) ?
                  this.kLineSlideHCur : this.kLineSlideVCur;
    this.lineSeg = tPaper.line( 0, 0, 0, 0)
              .attr({ 'stroke-opacity': 0 })
        .addClass('dg-graph-adornment-movable');
    this.coverSeg = tPaper.line( 0, 0, 0, 0)
              .attr( { 'stroke-width': 6, stroke: DG.RenderingUtilities.kSeeThrough,
                        cursor: tCur, title: "Drag the value" })
              .hover( overScope, outScope)
              .drag( continueTranslate, beginTranslate, endTranslate);
    this.cap = tPaper.rect(-20, 0, tCapSize, tCapSize)
        .attr( { cursor: tCur, opacity: 0 })
        .drag( continueTranslate, beginTranslate, endTranslate)
        .addClass( 'dg-graph-adornment-movable');

    this.myElements = [ this.lineSeg, this.coverSeg, this.cap ];
    this.myElements.push( this.createBackgroundRect());
    this.myElements.push( this.createTextElement());
    this.lineSeg.animatable = true;
    this.textElement.animatable = true;
    this.textElement.attr( {fill: DG.PlotUtilities.kDefaultMovableLineColor})
        .hover( overScope, outScope)
        .drag( continueTranslate, beginTranslate, endTranslate);
    this.lineSeg.animate({ 'stroke-opacity': 1 }, DG.PlotUtilities.kDefaultAnimationTime, '<>');
    this.textElement.animate({ opacity: 1 }, DG.PlotUtilities.kDefaultAnimationTime, '<>');
    this.cap.animatable = true;
    this.cap.animate({ opacity: 1 }, DG.PlotUtilities.kDefaultAnimationTime, '<>');
    this.myElements.forEach( function( iElement) {
      tLayer.push( iElement);
    });
  },

  /**
    Compute the positions of the line segment and text element
  */
  updateToModel: function() {
    if( this.myElements === null)
      this.createElements();

    var tAxisView = this.get('valueAxisView'),
        tPaper = this.get('paper');
    if( !tAxisView || !tPaper) return;  // not ready yet

    var tCapOffset = DG.PlotUtilities.kMovableValueCapSize / 2,
        tValue = this.getPath('model.value'),
        tValueCoord = tAxisView && tAxisView.dataToCoordinate( tValue),
        tPt1, tPt2, tTextAnchor, tTextBox, tTextXOffset = 0,
        tTextYOffset = 0,
        tBackgrndAnchor;
    this.textElement.attr( { text: this.get('valueString')});
    tTextBox = this.textElement.getBBox();

    if( this.getPath('model.isVisible')) {
      if( tAxisView.get('orientation') === DG.GraphTypes.EOrientation.kHorizontal) {
        tPt1 = { x: tValueCoord, y: tPaper.height};
        tPt2 = { x: tValueCoord, y: this.kLabelSpace /2 };
        tTextAnchor = 'middle';
        tTextYOffset = -4 * tCapOffset;
        tBackgrndAnchor = { x: tValueCoord - tTextBox.width / 2, y: tPt2.y + tTextYOffset - tTextBox.height / 2 };
      }
      else {
        tPt1 = { x: 0, y: tValueCoord };
        tPt2 = { x: tPaper.width - this.kLabelSpace, y: tValueCoord };
        tTextAnchor = 'start';
        tTextXOffset = 2 * tCapOffset;
        tBackgrndAnchor = { x: tPt2.x + tTextXOffset, y: tPt2.y - tTextBox.height / 2 };
      }

      this.textElement.attr( {
        x: tPt2.x + tTextXOffset, y: tPt2.y + tTextYOffset,
        'text-anchor': tTextAnchor });
      this.backgrndRect.attr( { x: tBackgrndAnchor.x, y: tBackgrndAnchor.y, width: tTextBox.width, height: tTextBox.height });

      DG.RenderingUtilities.updateLine( this.lineSeg, tPt1, tPt2);
      DG.RenderingUtilities.updateLine( this.coverSeg, tPt1, tPt2);
      this.cap.attr( { x: tPt2.x - tCapOffset, y: tPt2.y - tCapOffset });
    }
  }

});

