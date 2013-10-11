// ==========================================================================
//                    DG.PlottedFunctionAdornment
//
//  Author:   William Finzer
//
//  Copyright ©2013 KCP Technologies, Inc., a McGraw-Hill Education Company
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
    this.curve = this.get('paper').path('').attr( { stroke: 'red' });
    this.curve.animatable = true;
    this.myElements.push( this.curve);
  },

  /**
    Compute the path for the current equation given by my model.
    We're using a fixed grid scheme at the moment, but should rewrite this to use an adaptive
    algorithm such as the one described at: <http://yacas.sourceforge.net/Algochapter4.html>.
  */
  updateToModel: function() {
    if(!this.getPath('model.isVisible'))
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
          tY = tModel.evaluate( tX);
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
        tPath = 'M' + tPoints[0].left + ',' + tPoints[0].top + pv.SvgScene.curveBasis( tPoints);
      }
    }
    this.curve.attr( { path: tPath });
  }

});

DG.PlottedFunctionAdornment.createFormulaEditView = function( iPlottedFunction) {
  return DG.FormulaTextEditView.create({
            layout: { height: 20 },
            borderStyle: SC.BORDER_BEZEL,
            isVisible: false,
            hint: 'Type an expression e.g. x*x/30 - 50',
            leftAccessoryView: SC.LabelView.create({
                                layout: { left: 0, width:25, height:20, centerY: 0 },
                                value: 'y =',
                                backgroundColor: 'gray'
                              }),
            keyDown: function( evt) {
              var tKey = evt.which;
              if( tKey === SC.Event.KEY_RETURN) {
                this.completeEditing();
                return YES;
              }
              if( tKey === SC.Event.KEY_ESC) {
                this.discardEditing();
                return YES;
              }
              return sc_super();
            },
            commitEditing: function() {
              var tResult = sc_super();
              if( tResult) {
                iPlottedFunction.set('expression',
                                    this.get('formulaExpression'));
                DG.logUser("plotFunction: '%@'", this.get('formulaExpression'));
              }
              this.parentView.displayDidChange();
              return tResult;
            }
          });
};

