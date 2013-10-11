// ==========================================================================
//                        DG.PlotAdornmentModel
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

/**
 * @class  DG.PlotAdornmentModel -- Base class for plot adornment models.
 * @extends SC.Object
 */
DG.PlotAdornmentModel = SC.Object.extend(
/** @scope DG.PlotAdornmentModel.prototype */
{
  /**
    The plot model to which the adornment is attached.
    @property   {DG.PlotModel}
   */
  plotModel: null,
  
  /**
    True if the adornment should be displayed, false if it's hidden.
    @property   {Boolean}
   */
  isVisible: true,
  
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
    this.set('isVisible', iStorage.isVisible || false);
  }

});

/**
 *  A registry which maps adornment keys (e.g. 'plottedValue') to a
 *  creation function for creating an instance of the adornment model.
 */
DG.PlotAdornmentModel.registry = {};
//DG.PlotAdornmentModel.registry['plottedValue'] = DG.PlottedFunctionModel.create;

