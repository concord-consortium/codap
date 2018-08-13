// ==========================================================================
//                        DG.PlotAdornmentModel
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

/**
 * @class  DG.PlotAdornmentModel -- Base class for plot adornment models.
 * @extends SC.Object
 */

DG.PlotAdornmentModelNextID = 0;

DG.PlotAdornmentModel = SC.Object.extend(
/** @scope DG.PlotAdornmentModel.prototype */
{
  /**
    The plot model to which the adornment is attached; set on construction
    @type   {DG.PlotModel}
   */
  plotModel: null,
  
  /**
    The 'type' string by which this model is registered; set on construction
    @type   {string}
   */
  adornmentKey: null,

  /**
    True if the adornment should be displayed, false if it's hidden.
    @type   {Boolean}
   */
  isVisible: true,
  
  /**
    Initialization method
   */
  init: function() {
    this.set('id', ++ DG.PlotAdornmentModelNextID);
  },

  /**
    Destruction method
   */
  destroy: function() {
    this.notifyPropertyChange('willDestroy');
    sc_super();
  },
  
  /**
    Returns an object which contains properties that should be written
    out with the document for archiving purposes.
   */
  createStorage: function() {
    var tStorage = {};
    tStorage.isVisible = this.get('isVisible') || false;
    return tStorage;
  },

  /**
    Set the contents of the adornment model from the restored storage.
   */
  restoreStorage: function( iStorage) {
    if( iStorage)
      this.set('isVisible', iStorage.isVisible || false);
  }

});

/**
 *  A registry which maps adornment keys (e.g. 'plottedValue') to a
 *  creation function for creating an instance of the adornment model.
 */
DG.PlotAdornmentModel.registry = {};
//DG.PlotAdornmentModel.registry['plottedValue'] = DG.PlottedFunctionModel.create;

