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

  cases: function() {
    return this.get('enableMeasuresForSelection') ?
        this.getPath('plotModel.selection') :
        this.getPath('plotModel.cases');

  }.property(),
  
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
    this.plotModel = null;
    this.notifyPropertyChange('willDestroy');
    sc_super();
  },

  /**
   Private cache.
   @property { Boolean }
   */
  _needsComputing: true,

  /**
   * True if we need to compute new values to match new cells.
   * Note that this does not detect data changes where means need recomputing anyway.
   * @return { Boolean }
   */
  isComputingNeeded: function() {
    return this._needsComputing && this.isVisible;
  },

  /**
   * Note that our mean values are out of date, for lazy evaluation.
   * Dependencies, which will require a recompute
   *  - case-attribute-values added/deleted/changed for the primary and secondary axis attribute(s)
   *  - primary or secondary axis attributes changed (from one attribute to another)
   *  - axis models changed (must be up to date when we use them here)
   */
  setComputingNeeded: function() {
    this._needsComputing = true;
    if( this.isComputingNeeded())
      this.notifyPropertyChange('computingNeeded');
  },

  recomputeValueIfNeeded: function() {
    if( this.isComputingNeeded()) {
      this.recomputeValue();
    }
  },

  recomputeValue: function() {
    // Subclass will override
  },

  /**
   * Set by MultipleLsrlsModel.
   * @property {Boolean}
   */
  enableMeasuresForSelection: false,

  enableMeasuresForSelectionDidChange: function() {
    this.setComputingNeeded();
  }.observes('enableMeasuresForSelection'),

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

