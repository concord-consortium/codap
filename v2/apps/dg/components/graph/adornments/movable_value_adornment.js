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

  /** The object has category names as keys the following as values: {
   *   lineSeg:{Raphael line element},  The movable value itself is a single line element
   *   coverSeg:{Raphael line element}, We cover the line segment with a wider segment for hit-testing and hilighting
   *   cap:{Raphael line element }
   * }
   * @property {Object}
   */
  valueElements: null,

  /**
   @property { DG.CellAxisView }
   */
  splitAxisView: function() {
    return this.getPath('parentView.secondaryAxisView');
  }.property(),

  orientation: function() {
    return this.getPath('valueAxisView.orientation');
  }.property(),
  orientationDidChange: function() {
    this.removeElements();
    this.updateToModel();
  }.observes('*valueAxisView.orientation'),

  /**
   * @param iCat {string}
   */
  screenCoord: function(iCat) {
    return this.get('valueAxisView').dataToCoordinate( this.get('model').getValueForCategory(iCat));
  },

  /**
    The returned string should have a reasonable number of significant digits for the
      circumstances.
    @param iCat {string}
    @return { String read only }
  */
  valueStringForCategory: function(iCat) {

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

    var tValue = this.get('model').getValueForCategory(iCat);

    if( this.getPath('valueAxisView.isDateTime'))
      return dateTimeString();
    else
      return numericString();
  },
  valueStringDidChange: function() {
    this.notifyPropertyChange('valueString');
  }.observes('*model.valueChange', '*valueAxisView.model.firstAttributeName'),

  /**
    Concatenated array of ['PropertyName','ObserverMethod'] pairs used for indicating
    which observers to add/remove from the model.
    
    @property   {Array of [{String},{String}]}  Elements are ['PropertyName','ObserverMethod']
   */
  modelPropertiesToObserve: [ ['valueChange', 'updateToModel'],
                              ['removed', 'modelWasRemoved']],

  modelWasRemoved: function() {
    this.detachModel();
  },

  /**
    Make the movable line segments.
  */
  createElements: function() {
    var this_ = this,
        tPaper = this.get('paper'),
        tLayer = this.get('layer' ),
        tDragCoord,
        tOriginalValue;
  
    //=============Event handling functions===============
    function beginTranslate( iWindowX, iWindowY) {
      tOriginalValue = this_.get('model').getValueForCategory(this._key);
      var tDragPoint = DG.ViewUtilities.windowToViewCoordinates( 
                    { x: iWindowX, y: iWindowY }, this_.parentView);
      tDragCoord = (this_.get('orientation') === DG.GraphTypes.EOrientation.kHorizontal) ?
                        tDragPoint.x : tDragPoint.y;
    }
    
    function continueTranslate( idX, idY) {
      var tAxisView = this_.get('valueAxisView'),
          tDelta = (tAxisView.get('orientation') === DG.GraphTypes.EOrientation.kHorizontal) ? idX : idY,
          tValue = tAxisView.coordinateToData( tDragCoord + tDelta, true /* snapToTick */);
      this_.get('model').setValueForCategory( this._key, tValue);
    }
  
    function endTranslate( idX, idY) {
      var tOriginal = tOriginalValue,
          tCat = this._key,
          tModel = this_.get('model'),
          tNew;
      DG.logUser("dragMovableValue: '%@'", this_.valueStringForCategory(tCat));
      DG.UndoHistory.execute(DG.Command.create({
        name: "graph.moveMovableValue",
        undoString: 'DG.Undo.graph.moveMovableValue',
        redoString: 'DG.Redo.graph.removeMovableValue',
        log: "Moved movable value from %@ to %@".fmt( tOriginal, tModel.getValueForCategory(tCat)),
        executeNotification: {
          action: 'notify',
          resource: 'component',
          values: {
            operation: 'drag movable line',
            type: 'DG.GraphView'
          }
        },
        execute: function() {
          tNew = tModel.getValueForCategory(tCat);
        },
        undo: function() {
          tModel.setValueForCategory(tCat, tOriginal);
        },
        redo: function() {
          tModel.setValueForCategory(tCat, tNew);
        }
      }));
    }

    function overScope() {
      var tCoverSeg = this_.get('valueElements')[this._key].coverSeg,
          tAttributes = { stroke: DG.PlotUtilities.kMovableLineHighlightColor };
      tCoverSeg.stop();
      tCoverSeg.animate( tAttributes, DG.PlotUtilities.kHighlightShowTime);
    }

    function outScope() {
      var tCoverSeg = this_.get('valueElements')[this._key].coverSeg,
          tAttributes = { stroke: DG.RenderingUtilities.kSeeThrough };
      tCoverSeg.stop();
      tCoverSeg.animate( tAttributes, DG.PlotUtilities.kHighlightHideTime);
    }

    //=============Main body of createElements===============

    if( this.myElements && (this.myElements.length > 0))
      return; // already created
    if( !tPaper)
      return; // Not ready yet
    var tCapSize = DG.PlotUtilities.kMovableValueCapSize,
        tCur = (this.get('orientation') === DG.GraphTypes.EOrientation.kHorizontal) ?
                  this.kLineSlideHCur : this.kLineSlideVCur,
        tModelValues = this.getPath('model.values'),
        tValueElements = {};
    this.myElements = [];
    DG.ObjectMap.forEach( tModelValues, function( iKey, iValue) {
      var tLineSeg = tPaper.line( 0, 0, 0, 0)
              .attr({ 'stroke-opacity': 0 })
              .addClass('dg-graph-adornment-movable'),
          tCoverSeg = tPaper.line( 0, 0, 0, 0)
              .attr( { 'stroke-width': 6, stroke: DG.RenderingUtilities.kSeeThrough,
                cursor: tCur, title: "Drag the value" })
              .hover( overScope, outScope)
              .drag( continueTranslate, beginTranslate, endTranslate),
          tCap = tPaper.rect(-20, 0, tCapSize, tCapSize)
              .attr( { cursor: tCur, opacity: 0 })
              .drag( continueTranslate, beginTranslate, endTranslate)
              .addClass( 'dg-graph-adornment-movable'),
          tBackground = this_.createBackgroundRect(),
          tText = this_.createTextElement();
      tCoverSeg._key = tCap._key = tText._key = iKey;
      tLineSeg.animatable = true;
      tLineSeg.animate({ 'stroke-opacity': 1 }, DG.PlotUtilities.kDefaultAnimationTime, '<>');
      tText.animatable = true;
      tText.attr( {fill: DG.PlotUtilities.kDefaultMovableLineColor})
          .hover( overScope, outScope)
          .drag( continueTranslate, beginTranslate, endTranslate);
      tText.animate({ opacity: 1 }, DG.PlotUtilities.kDefaultAnimationTime, '<>');
      tCap.animatable = true;
      tCap.animate({ opacity: 1 }, DG.PlotUtilities.kDefaultAnimationTime, '<>');
      tValueElements[iKey] = {
        lineSeg: tLineSeg,
        coverSeg: tCoverSeg,
        cap: tCap,
        background: tBackground,
        text: tText
      };
      DG.ObjectMap.values(tValueElements[iKey]).forEach( function(iElement) {
        this_.myElements.push(iElement);
      });
    });
    this.myElements.forEach( function( iElement) {
      tLayer.push( iElement);
    });
    this.set('valueElements', tValueElements);
  },

  /**
    Compute the positions of the line segment and text element
  */
  updateToModel: function() {
    var getCellNames = function() {
          var tNames = this.getPath('model.plotModel.secondaryAxisModel.attributeDescription.cellNames');
          if (!tNames || tNames.length === 0)
            tNames = [DG.MovableValueModel.kSingleCellName];
          return tNames;
        }.bind(this),
    tCellNames = getCellNames(),
    tValueElements = this.get('valueElements');

    if( !this.myElements || tCellNames.some(function(iName) {
      return !tValueElements[iName];  // signifying it's out of date
    }) ||
        Object.keys(tValueElements).some( function( iKey) {
          return tCellNames.indexOf( iKey) < 0;
        })) {
      this.removeElements();
      this.createElements();
    }

    var this_ = this,
        tValueAxisView = this.get('valueAxisView'),
        tSplitAxisView = this.get('splitAxisView'),
        tCellExtent = tSplitAxisView && tSplitAxisView.get('fullCellWidth'),
        tPaper = this.get('paper'),
        tModelIsVisible = this.getPath('model.isVisible');
    if( !tValueAxisView || !tPaper || !tModelIsVisible || !tSplitAxisView) return;  // not ready yet or no need

    var tCapOffset = DG.PlotUtilities.kMovableValueCapSize / 2;
    DG.ObjectMap.forEach(this.get('valueElements'), function (iKey, iValueElement) {
      var tWorldCoord = this_.get('model').getValueForCategory(iKey),
          tScreenCoord = tValueAxisView && tValueAxisView.dataToCoordinate(tWorldCoord),
          tCellCoord = tSplitAxisView.cellNameToCoordinate(iKey),
          tPt1, tPt2, tTextAnchor, tTextBox, tTextXOffset = 0,
          tTextYOffset = 0,
          tBackgrndAnchor;
      if(!DG.isFinite(tCellCoord) || !DG.isFinite(tScreenCoord))
        return; // Can happen during transitions
      iValueElement.text.attr({text: this_.valueStringForCategory(iKey)});
      tTextBox = iValueElement.text.getBBox();

      if (tValueAxisView.get('orientation') === DG.GraphTypes.EOrientation.kHorizontal) {
        tPt1 = {x: tScreenCoord, y: tCellCoord + tCellExtent / 2};
        tPt2 = {x: tScreenCoord, y: tCellCoord - tCellExtent / 2 + DG.MovableValueAdornment.kLabelSpace / 2};
        tTextAnchor = 'middle';
        tTextYOffset = -4 * tCapOffset;
        tBackgrndAnchor = {x: tScreenCoord - tTextBox.width / 2, y: tPt2.y + tTextYOffset - tTextBox.height / 2};
      } else {
        tPt1 = {x: tCellCoord - tCellExtent / 2, y: tScreenCoord};
        tPt2 = {x: tCellCoord + tCellExtent / 2 - DG.MovableValueAdornment.kLabelSpace, y: tScreenCoord};
        tTextAnchor = 'start';
        tTextXOffset = 2 * tCapOffset;
        tBackgrndAnchor = {x: tPt2.x + tTextXOffset, y: tPt2.y - tTextBox.height / 2};
      }

      iValueElement.text.attr({
        x: tPt2.x + tTextXOffset, y: tPt2.y + tTextYOffset,
        'text-anchor': tTextAnchor
      });
      iValueElement.background.attr({
        x: tBackgrndAnchor.x,
        y: tBackgrndAnchor.y,
        width: tTextBox.width,
        height: tTextBox.height
      });

      DG.RenderingUtilities.updateLine(iValueElement.lineSeg, tPt1, tPt2);
      DG.RenderingUtilities.updateLine(iValueElement.coverSeg, tPt1, tPt2);
      iValueElement.cap.attr({x: tPt2.x - tCapOffset, y: tPt2.y - tCapOffset});
    });
  }

});

DG.MovableValueAdornment.kLabelSpace = 50;  // pixels

