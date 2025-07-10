// ==========================================================================
//                      DG.PlottedValueAdornment
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

/** @class  Plots a computed value.

  @extends DG.PlotAdornment
*/
DG.PlottedValueAdornment = DG.PlotAdornment.extend( DG.LineLabelMixin,
/** @scope DG.PlottedValueAdornment.prototype */
{
  statisticsKey: 'plottedValue',
  lastHoverValue: null,

  /**
    @property { DG.CellLinearAxisView }
  */
  valueAxisView: function() {
    return this.getPath('parentView.primaryAxisView');
  }.property(),

  /**
    @property { DG.CellAxisView }
  */
  splitAxisView: function() {
    return this.getPath('parentView.secondaryAxisView');
  }.property(),

  valueTextElement: null,

  /**
    The value is drawn as a line segement.
    @property [{Object}]
  */
  valueSegments: null,

  /**
    @property { Number }
  */
  values: function() {
    var splitAxisModel = this.get('splitAxisModel'),
        values = [];
    if (splitAxisModel && splitAxisModel.forEachCellDo) {
      splitAxisModel.forEachCellDo(function(iIndex, iName) {
        values.push(this.getValueToPlot(iName));
      }.bind(this));
    }
    else {
      values.push(this.getValueToPlot());
    }
    return values;
  }.property(),

  /**
    The returned string should have a reasonable number of significant digits for the
      circumstances.
    @property { String read only }
  */
  valueStrings: function() {
    var tValues = this.get('values');

    if( tValues instanceof Error)
      return tValues.message;

    var tDigits = DG.PlotUtilities.findFractionDigitsForAxis( this.get('valueAxisView')),
        tNumFormat = DG.Format.number().fractionDigits( 0, tDigits);
    return tValues.map(function(iValue) {
      if( iValue < 2500)
        tNumFormat.group('');
      else
        tNumFormat.group( ',');
      return DG.isFinite(iValue) ? tNumFormat(iValue) : (iValue != null ? iValue.toString() : null);
    });
  }.property('values'),

  /**
    Concatenated array of ['PropertyName','ObserverMethod'] pairs used for indicating
    which observers to add/remove from the model.

    @property   {Array of [{String},{String}]}  Elements are ['PropertyName','ObserverMethod']
   */
  modelPropertiesToObserve: [ ['expression', 'updateToModel'], ['dependentChange', 'updateToModel'] ],

  splitAxisModel: function() {
    return this.getPath('model.splitAxisModel');
  }.property(),

  init: function() {
    sc_super();

    this.valueSegments = [];
    this.myElements = [];
  },

  /**
   * valueSegments will contain an array of { valueSegment, background, textElement }
  */
  createElements: function( iNumCells) {
    var this_ = this;
    if( this.valueSegments.length === iNumCells)
      return; // already the right number

    function createSegment() {
      var tSegment = tPaper.path('')
          .addClass('dg-plotted-value');
      return tSegment;
    }

    function createTextElement() {
      var tText = tPaper.text( 0, 0, '')
          .attr({ 'text-anchor': 'start', opacity: 1 })
          .hide()
          .addClass('dg-graph-adornment');
      return tText;
    }

    function createBackground() {
      var tBackgrnd = tPaper.path('')
          .addClass('dg-plotted-value-background');
      return tBackgrnd;
    }

    function createCover( iCellNum) {
      var tHoverWidth = 5;        /** width of invisible 'cover' line that has popup text */

      function overScope() {
        var tHoverColor = "rgba(0, 255, 0, 0.2)",
            tHoverDelay = 10,
            tAttributes = { stroke: tHoverColor },
            tValueElement = this_.valueTextElement,
            tValueText = this_.get('valueStrings')[ iCellNum],
            tSegmentBox = this.getBBox();
        this.stop();
        this.animate( tAttributes, tHoverDelay );

        tValueElement.attr('text', tValueText);
        if( tSegmentBox.y === tSegmentBox.y2) { // horizontal segment
          tValueElement.attr( { x: tSegmentBox.x2 - 5, y: tSegmentBox.y - 6, 'text-anchor': 'end'});
        }
        else {
          tValueElement.attr( { x: tSegmentBox.x + 3, y: tSegmentBox.y + 6, 'text-anchor': 'start'});
        }
        tValueElement.show();

        // Log this hover provided it wasn't the last hover
        if( tValueText !== this_.lastHoverValue) {
          this_.updateHoverLog( this_.statisticsKey+"=" + tValueText );
          this_.lastHoverValue = tValueText;
        }
      }

      function outScope() {
        var tAttributes = { stroke: DG.RenderingUtilities.kTransparent };
        this.stop();
        this.animate( tAttributes, DG.PlotUtilities.kHighlightHideTime );
        this_.valueTextElement.hide();
      }

      var tCover = tPaper.path('M0,0')
          .attr({ 'stroke-width':tHoverWidth, stroke:DG.RenderingUtilities.kTransparent })
          .hover( overScope, outScope);
      return tCover;
    }

    var tLayerManager = this.getPath('paperSource.layerManager'),
        tLayer = this.get('layer'),
        tPaper = this.get('paper'),
        tValueSegments = this.get('valueSegments');
    if( !this.valueTextElement) {
      this.valueTextElement = createTextElement();
    }
    while( tValueSegments.length < iNumCells) {
      var tValueSegment = {
        background: createBackground(),
        valueSegment: createSegment(),
        cover: createCover(tValueSegments.length)
      };
      tValueSegments.push( tValueSegment);
      DG.ObjectMap.forEach( tValueSegment, function( iKey, iElement) {
        this.myElements.push( iElement);
        tLayer.push( iElement);
      }.bind(this));
    }

    while( tValueSegments.length > iNumCells) {
      var tSegmentToRemove = tValueSegments.pop();
      DG.ObjectMap.forEach( tSegmentToRemove, function( iKey, iElement) {
        tLayerManager.removeElement( iElement, true /* callRemove */);
        iElement.remove();
      });
    }
  },

  /**

  */
  updateToModel: function() {
    if (this.getPath('model.isVisible')) {

      var tSplitAxisModel = this.get('splitAxisModel'), // categorical axis if any
          tNumCells = tSplitAxisModel ? tSplitAxisModel.get('numberOfCells') : 1,
          tValueAxisView = this.get('valueAxisView'),
          tSplitAxisView = this.get('splitAxisView');

      if (!(tValueAxisView && tSplitAxisView))
        return;   // happens when the plot is going awayu

      this.createElements(tNumCells);  // if needed

      var tCellWidth = tSplitAxisView.get('fullCellWidth'),
          tPaper = this.get('paper'),
          tPlottedValues = this.get('values');
      for (var tIndex = 0; tIndex < tNumCells; tIndex++) {
        var tPlottedValue = tPlottedValues && tPlottedValues[tIndex],
            tValueSegment = this.get('valueSegments')[tIndex].valueSegment,
            tBackground = this.get('valueSegments')[tIndex].background,
            tCover = this.get('valueSegments')[tIndex].cover,
            tCoord, tPt1, tPt2;

        if (DG.isFinite(tPlottedValue)) {
          tCoord = tValueAxisView.dataToCoordinate(tPlottedValue);
          if (tValueAxisView.get('orientation') === DG.GraphTypes.EOrientation.kHorizontal) {
            tPt1 = {x: tCoord, y: tPaper.height - tIndex * tCellWidth};
            tPt2 = {x: tCoord, y: tPaper.height - (tIndex + 1) * tCellWidth};
          }
          else {
            tPt1 = {x: tIndex * tCellWidth, y: tCoord};
            tPt2 = {x: (tIndex + 1) * tCellWidth, y: tCoord};
          }
          DG.RenderingUtilities.updateLine(tValueSegment, tPt1, tPt2);
          DG.RenderingUtilities.updateLine(tCover, tPt1, tPt2);
          DG.RenderingUtilities.updateLine(tBackground, tPt1, tPt2);
        }
        else {
          tValueSegment.attr({path: ''});
          tCover.attr({path: ''});
          tBackground.attr({path: ''});
        }
      }
    }
  }.observes('DG.globalsController.globalNameChanges'),

  valueAxisAttrDidChange: function() {
    var tModel = this.get('model');
    if( tModel) {
      this.get('model').invalidateExpression();
    }
  }.observes('*valueAxisView.model.firstAttributeName'),

  /**

  */
  getValueToPlot: function(iGroup) {
    var model = this.get('model'),
        evalContext = iGroup ? { _groupID_: iGroup } : {},
        tPlottedValue = NaN;

    try {
      if( model)
        tPlottedValue = model.evaluate(evalContext);
    }
    catch(e) {
      // Propagate errors to return value
      tPlottedValue = e;
    }

    return tPlottedValue;
  },

  /**
   * Create a user log of the the hover over the average line, but remove duplicates
   * @param logString
   */
  updateHoverLog: function( logString ) {
    DG.logUser("%@: %@", "hoverOverPlottedValue", logString );
  }

});

DG.PlottedValueAdornment.createFormulaEditView = function(iPlottedValue) {
  var formulaEditContext = DG.PlottedFormulaEditContext.getFormulaEditContext(iPlottedValue);
  return formulaEditContext.createFormulaView({
                              attrNamePrompt: 'DG.PlottedValue.namePrompt',
                              formulaPrompt: 'DG.PlottedValue.formulaPrompt',
                              formulaHint: 'DG.PlottedValue.formulaHint',
                              commandName: 'graph.editPlottedValue',
                              undoString: 'DG.Undo.graph.changePlotValue',
                              redoString: 'DG.Redo.graph.changePlotValue',
                              logMessage: 'Change plotted value: "%@1" to "%@2"'
                            });
};
