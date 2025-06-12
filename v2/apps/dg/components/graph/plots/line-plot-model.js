// ==========================================================================
//                            DG.LinePlotModel
//
//  Author:   Kirk Swenson
//
//  Copyright (c) 2020 by The Concord Consortium, Inc. All rights reserved.
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

sc_require('components/graph/plots/dot_plot_model');

/** @class  DG.LinePlotModel The model for a line/bar plot.

 @extends SC.LinePlotModel
 */
DG.LinePlotModel = DG.DotPlotModel.extend(
  /** @scope DG.LinePlotModel.prototype */
  {
    /**
     * Originally a boolean; extended to support line/bar plot
     * @property {Boolean | "bars"}
     */
    displayAsBinned: "bars",

    handleDataConfigurationChange: function(iKey) {
      // override to prevent unnecessary call to rescaleAxesFromData() by base class
      this.updateAdornmentModels();
    }
  }
);

/**
 class method called before plot creation to make sure roles are correct
 @param {DG.GraphDataConfiguration}
 */
DG.LinePlotModel.configureRoles = function(iConfig) {
  // Base class has method for this
  DG.UnivariatePlotModel.configureRoles(iConfig);
};
