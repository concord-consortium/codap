// ==========================================================================
//                          DG.PlotAdornment
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

/** @class  The base class for plot adornments.

  @extends SC.Object
*/
DG.PlotAdornment = SC.Object.extend(
/** @scope DG.PlotAdornment.prototype */ 
{
  /**
    The model containing the data to display.
    @property { Depends on adornment }
  */
  model: null,

  /**
   * @property {DG.PlotBackgroundView}
  */
  paperSource: null,

  /**
   * @property( Raphael }
   */
  paper: function() {
    return this.getPath('paperSource.paper');
  }.property(),

  paperDidChange: function() {
    this.notifyPropertyChange('paper');
  }.observes('*paperSource.paper'),

  /**
    Provides x-coordinates
    @property { DG.AxisView }
  */
  xAxisView: function() {
    return this.getPath('paperSource.xAxisView');
  }.property('paperSource').cacheable(),

  xAxisViewDidChange: function() {
    this.notifyPropertyChange('xAxisView');
  }.observes('*paperSource.xAxisView'),

  /**
    Provides y-coordinates
    @property { DG.AxisView }
  */
  yAxisView: function() {
    return this.getPath('paperSource.yAxisView');
  }.property('paperSource').cacheable(),

  yAxisViewDidChange: function() {
    this.notifyPropertyChange('yAxisView');
  }.observes('*paperSource.yAxisView'),

  /**
    We need to know this view in order to transform from window to view coordinates.
    @property { SC.View }
  */
  parentView: null,

  /**
    These are the Raphael objects I draw, kept together for ease of showing and hiding.
    @property { SC.Array }
  */
  myElements: null,

  /**
   * The key into the layerManager to get the layer we use to display
   * @property { String }
   */
  layerName: null,

  /**
   * All my Raphael elements go in this layer
   * @property { DG.RaphaelLayer }
   */
  layer: function() {
    var tLayerManager = this.getPath('paperSource.layerManager');
    return (tLayerManager && this.layerName) ? tLayerManager[ this.layerName] :null;
  }.property('paperSource', 'layerName' ),

  /**
    Contains an array of elements, each of which corresponds to a pair of strings
    indicating a model property that should be observed and the handler that should
    be called when that property changes. Adding 'modelPropertiesToObserve' to the
    'concatenatedProperties' array allows the contents of the property from multiple
    levels of the 'class hierarchy' to be concatenated automatically taking advantage
    of a built-in SproutCore behavior. AddObserver/removeObserver will be called for 
    each of the ['PropertyName','ObserverMethod'] pairs as appropriate whenever the
    model changes.
    
    @property   {Array of [{String},{String}]}  Elements are ['PropertyName','ObserverMethod']
   */
  modelPropertiesToObserve: [ ['willDestroy', 'detachModel'],
    ['computingNeeded', 'updateToModel'],
    ['isVisible', 'updateVisibility'] ],
  concatenatedProperties: [ 'modelPropertiesToObserve' ],
  
  /**
    Initialization method
   */
  init: function() {
    sc_super();

    this.myElements = [];
    // Trigger manually and then addObserver
    this.modelDidChange();
  },
  
  /**
    Detaches all model references in preparation for destruction of
    either the model or the adornment.
   */
  detachModel: function() {
    // Reset the model (triggering notification), then removeObserver
    this.set('model', null);
  },
  
  /**
    Destruction method
   */
  destroy: function() {
    this.detachModel();
    this.removeElements();
    sc_super();
  },

  removeElements: function() {
    if( this.myElements) {
      var tLayerManager = this.getPath('paperSource.layerManager');
      this.myElements.forEach(function (iElement) {
        tLayerManager.removeElement(iElement);
        iElement.remove();
      });
      this.myElements = null;
    }
  },
  
  /**
    Observer method called when the adornment model changes.
    Guarantees that observers are added/removed for any relevant model properties.
    List ['Property','Handler'] pairs in 'modelPropertiesToObserve' property to
    have observers added/removed automatically.
   */
  _observedModel: null,
  modelDidChange: function() {
    // Get the concatenated list of model properties to observe
    var modelProps = this.get('modelPropertiesToObserve');

    // Detach from previous model
    if( this._observedModel) {
      if( modelProps) {
        // Remove observers for all listed properties
        modelProps.forEach( function( iModelProp) {
                              this._observedModel.removeObserver( iModelProp[0], this, iModelProp[1]);
                            }.bind( this));
      }
      this._observedModel = null;
    }
    
    // Attach to new model
    var model = this.get('model');
    if( model) {
      if( modelProps) {
        // Add observers for all listed properties
        modelProps.forEach( function( iModelProp) {
                              model.addObserver( iModelProp[0], this, iModelProp[1]);
                            }.bind( this));
      }
      this._observedModel = model;
    }
  }.observes('model'),

  showElements: function() {
    var tOpacity = this.get('opacity') || 1,
        tStrokeOpacity = this.get('strokeOpacity') || 1;
    this.myElements.forEach(function (iElement) {
      iElement.show();
      if (iElement.animatable) {
        iElement.animate({'stroke-opacity': tStrokeOpacity, opacity: tOpacity},
            DG.PlotUtilities.kDefaultAnimationTime, '<>');
      }
    });
  },

  hideElements: function () {
    this.myElements.forEach(function (iElement) {
      if (iElement.animatable) {
        iElement.animate({'stroke-opacity': 0, opacity: 0}, DG.PlotUtilities.kDefaultAnimationTime, '<>',
            function () {
              iElement.hide();
            });
      }
      else
        iElement.hide();
    });
  },

  /**
    My model's visibility has changed.
  */
  updateVisibility: function() {
    if( this.getPath('model.isVisible')) {
      this.updateToModel();
      this.showElements();
    }
    else if( !SC.none( this.myElements))
    {
      this.hideElements();
    }
  },

  updateToModel: function() {
    // Subclasses will override
  }

});

