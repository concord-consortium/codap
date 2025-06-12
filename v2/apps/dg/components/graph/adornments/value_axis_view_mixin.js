// ==========================================================================
//                            DG.ValueAxisViewMixin
// 
//  A mixin designed to work with DG.PlotAdornments which respond to
//  notifications from a 'valueAxisView' property.
//  
//  Author:   Kirk Swenson
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

DG.ValueAxisViewMixin = {

  /**
    @property { DG.CellLinearAxisView }
  */
  valueAxisView: null,

  /**
    Private properties used with observer methods.
   */
  _observedAxisModel: null,
  _observedAxisView: null,
  
  /**
    Initialization method.
   */
  initMixin: function() {
    // Trigger manually to handle 'valueAxisView' passed in as create() argument
    this.axisViewDidChange();
    
    // Add observer to handle any subsequent changes
    this.addObserver('valueAxisView', this, 'axisViewDidChange');
  },
  
  /**
    Destruction method.
   */
  destroyMixin: function() {
    this.set('valueAxisView', null);
    this.removeObserver('valueAxisView', this, 'axisViewDidChange');
  },
  
  /**
    Observer method called when the axis model changes.
    Guarantees that the line is updated when the axis bounds change.
   */
  axisModelDidChange: function() {
    if( this._observedAxisModel) {
      this._observedAxisModel.removeObserver('lowerBound', this, 'updateToModel');
      this._observedAxisModel.removeObserver('upperBound', this, 'updateToModel');
      this._observedAxisModel = null;
    }
    
    var axisModel = this.getPath('valueAxisView.model');
    if( axisModel) {
      axisModel.addObserver('lowerBound', this, 'updateToModel');
      axisModel.addObserver('upperBound', this, 'updateToModel');
      this._observedAxisModel = axisModel;
    }
  },

  /**
    Observer method called when the axis view changes.
    Guarantees that the line is redrawn when the view bounds change.
   */
  axisViewDidChange: function() {
    if( this._observedAxisView) {
      this._observedAxisView.removeObserver('model', this, 'axisModelDidChange');
      this._observedAxisView.removeObserver('pixelMin', this, 'updateToModel');
      this._observedAxisView.removeObserver('pixelMax', this, 'updateToModel');
      this._observedAxisView = null;
    }
    
    // If the axis view has changed, the axis model probably has as well.
    this.axisModelDidChange();
    
    var axisView = this.get('valueAxisView');
    if( axisView) {
      axisView.addObserver('model', this, 'axisModelDidChange');
      axisView.addObserver('pixelMin', this, 'updateToModel');
      axisView.addObserver('pixelMax', this, 'updateToModel');
      this._observedAxisView = axisView;
    }
  },
  
  /**
    Observer method triggered when axis properties change.
   */
  updateToModel: function() {
  }

};
