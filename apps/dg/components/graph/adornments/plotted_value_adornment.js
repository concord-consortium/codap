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

  /**
    A number of entities here were designed to be single-valued but
    need to be multi-valued when split by a categorical attribute
    (e.g. 'value', 'valueString', 'valueSegment',
    DG.LineLabelMixin.createTextElement() and
    DG.LineLabelMixin.updateTextToModel()). To simplify things,
    we introduce the notion of a 'currentIndex', which indicates
    which of the now multi-valued elements is to be returned.
   */
  currentIndex: 0,

  /**
    @property { DG.CellLinearAxisView }
  */
  valueAxisView: null,

  /**
    The value is drawn as a line segement.
    @property { Raphael line element }
  */
  valueSegment: function() {
    var segments = this.get('valueSegments'),
        index = this.get('currentIndex') || 0;
    return segments && (index != null) ? segments[index] : null;
  }.property('valueSegments', 'currentIndex'),

  /**
    The value is drawn as a line segement.
    @property { Raphael line element }
  */
  valueSegments: null,

  /**
    @property { Number }
  */
  value: function() {
    var values = this.get('values'),
        index = this.get('currentIndex') || 0;
    return values && (index != null) ? values[index] : null;
  }.property('values', 'currentIndex'),

  /**
    @property { Number }
  */
  values: function() {
    var splitAxisModel = this.getPath('model.splitAxisModel'),
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
  valueString: function() {
    var strings = this.get('valueStrings'),
        index = this.get('currentIndex') || 0;
    return strings && (index != null) ? strings[index] : null;
  }.property('valueStrings', 'currentIndex'),

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

  /**

  */
  createElements: function() {
    if( this.myElements && (this.myElements.length > 0))
      return; // already created
    var tLayer = this.get('layer');
    this.myElements = [];
    this.valueSegment = this.get('paper').path('').attr( { stroke: 'green' });
    this.myElements.push( this.valueSegment);
    this.myElements.push( this.createBackgroundRect());
    this.myElements.push( this.createTextElement());
    this.myElements.forEach( function( iElement) {
      tLayer.push( iElement);
    });
  },

  /**

  */
  updateToModel: function() {
    if( !this.myElements || !this.myElements.length)
      this.createElements();

    var tAxisView = this.get( 'valueAxisView'),
        tPaper = this.get('paper'),
        tPlottedValues = this.get('values'),
        tIndex = this.get('currentIndex') || 0,
        tPlottedValue = tPlottedValues && tPlottedValues[tIndex],
        tCoord, tPt1, tPt2;

    if( DG.isFinite( tPlottedValue)) {
      tCoord = tAxisView.dataToCoordinate( tPlottedValue);
      if( tAxisView.get('orientation') === 'horizontal') {
        tPt1 = { x: tCoord, y: tPaper.height };
        tPt2 = { x: tCoord, y: 0 };
      }
      else {
        tPt1 = { x: 0, y: tCoord };
        tPt2 = { x: tPaper.width, y: tCoord };
      }
      DG.RenderingUtilities.updateLine( this.valueSegment, tPt1, tPt2);
    }
    else
      this.valueSegment.attr( { path: '' });

    this.updateTextToModel( 1/4); // offset from top of plot
  }.observes('DG.globalsController.globalNameChanges'),

  valueAxisAttrDidChange: function() {
    this.get('model').invalidateExpression();
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
