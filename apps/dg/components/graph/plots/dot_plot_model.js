// ==========================================================================
//                            DG.DotPlotModel
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

sc_require('components/graph/plots/univariate_adornment_base_model');

/** @class  DG.DotPlotModel The model for a dot plot.

 @extends SC.PlotModel
 */
DG.DotPlotModel = DG.UnivariateAdornmentBaseModel.extend(
    /** @scope DG.DotPlotModel.prototype */
    {
      displayAsBinned: false,

      /**
       *
       * @param iPlace {DG.GraphTypes.EPlace}
       * @return { class }
       */
      getDesiredAxisClassFor: function( iPlace) {
        if( iPlace === this.get('primaryAxisPlace'))
          return DG.CellLinearAxisModel;
        else if(iPlace === this.get('secondaryAxisPlace')) {
          return SC.none( this.get('secondaryVarID')) ? DG.AxisModel : DG.CellAxisModel;
        }
        else return sc_super();
      },

      /**
       Each axis should rescale based on the values to be plotted with it.
       * @param {boolean} iAllowScaleShrinkage
       * @param {boolean} iAnimatePoints
       * @param {boolean} iLogIt
       * @param {boolean} iUserAction
       */
      rescaleAxesFromData: function (iAllowScaleShrinkage, iAnimatePoints, iLogIt, iUserAction) {
        if (iAnimatePoints === undefined)
          iAnimatePoints = true;
        this.doRescaleAxesFromData([this.get('primaryAxisPlace')], iAllowScaleShrinkage, iAnimatePoints, iUserAction);
        if (iLogIt)
          DG.logUser("rescaleDotPlot");
      },

      /**
       @param{ {x: {Number}, y: {Number} } } iFixedPoint
       @param{Number} iFactor
       */
      dilate: function (iFixedPoint, iFactor) {
        this.doDilation([this.get('primaryAxisPlace')], iFixedPoint, iFactor);
      },

    });

/**
 class method called before plot creation to make sure roles are correct
 @param {DG.GraphDataConfiguration}
 */
DG.DotPlotModel.configureRoles = function (iConfig) {
  // Base class has method for this
  DG.UnivariatePlotModel.configureRoles( iConfig);
};
