// ==========================================================================
//                    DG.PlottedFunctionAdornment
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

/** @class  Plots a function.

  @extends DG.PlotAdornment
*/
DG.PlottedFunctionAdornment = DG.PlotAdornment.extend(
/** @scope DG.PlottedFunctionAdornment.prototype */
{

  /**
    Concatenated array of ['PropertyName','ObserverMethod'] pairs used for indicating
    which observers to add/remove from the model.

    @property   {Array of [{String},{String}]}  Elements are ['PropertyName','ObserverMethod']
   */
  modelPropertiesToObserve: [ ['expression', 'updateToModel'], ['dependentChange', 'updateToModel'] ],

  /**
    The function is drawn by specifying a path for a path element.
    @property { Raphael line element }
  */
  curve: null,

  /**

  */
  createElements: function() {
    if( this.myElements && (this.myElements.length > 0))
      return; // already created
    if( !this.get('paper'))
      return; // Not ready yet
    this.curve = this.get('paper').path('').attr( { stroke: 'red' });
    this.curve.animatable = true;
    this.myElements.push( this.curve);
    this.get('layer' ).push( this.curve);
  },

  /**
    Compute the path for the current equation given by my model.
    We're using a fixed grid scheme at the moment, but should rewrite this to use an adaptive
    algorithm such as the one described at: <http://yacas.sourceforge.net/Algochapter4.html>.
  */
  updateToModel: function() {
    if(!this.getPath('model.isVisible') || !this.get('paper'))
      return;

    this.createElements();
    var tXAxisView = this.get('xAxisView'),
        tYAxisView = this.get('yAxisView'),
        tPixelMin = tXAxisView.get('pixelMin'),
        tPixelMax = tXAxisView.get('pixelMax'),
        kPixelGap = 1,  // pixels between path points
        tPixelX,
        tModel = this.get('model'),
        tPath = '',
        tX, tY, tPixelY,
        tPoints = [];

    // begin updateToModel body
    if( tModel) {
      // Wrap the loop in a try/catch block so exceptions will exit the loop.
      try {
        for( tPixelX = tPixelMin; tPixelX <= tPixelMax; tPixelX += kPixelGap) {
          tX = tXAxisView.coordinateToData( tPixelX);
          // Note: If an exception is thrown on evaluate(), we exit the loop
          tY = tModel.evaluate({ x: tX });
          if( DG.isFinite( tY)) {
            tPixelY = tYAxisView.dataToCoordinate( tY);
            tPoints.push( {top: tPixelY, left: tPixelX});
          }
        }
      }
      catch(err) {
        // Extract error information to provide feedback to user.
      }
      if( tPoints.length > 0) {
        // Here we are using a bit of protovis wizardry in order to accomplish spline interpolation
        tPath = 'M' + tPoints[0].left + ',' + tPoints[0].top + DG.SvgScene.curveBasis( tPoints);
      }
    }
    this.curve.attr( { path: tPath });
  }

});

DG.PlottedFunctionAdornment.createFormulaEditView = function(iPlottedFunction) {
  var formulaEditContext = DG.PlottedFormulaEditContext.getFormulaEditContext(iPlottedFunction);
  return formulaEditContext.createFormulaView({
                              attrNamePrompt: 'DG.PlottedFunction.namePrompt',
                              formulaPrompt: 'DG.PlottedFunction.formulaPrompt',
                              formulaHint: 'DG.PlottedFunction.formulaHint',
                              commandName: 'graph.editPlottedFunction',
                              undoString: 'DG.Undo.graph.changePlotFunction',
                              redoString: 'DG.Redo.graph.changePlotFunction',
                              logMessage: 'Change plotted function: "%@1" to "%@2"'
                            });
};

