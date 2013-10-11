// ==========================================================================
//                        DG.SliderController
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

sc_require('controllers/component_controller');

/** @class

  Coordinating controller for slider components.

  @extends DG.ComponentController
*/
DG.SliderController = DG.ComponentController.extend(
/** @scope DG.SliderController.prototype */ {

  sliderModel: null,
  
  axisModel: null,

  sliderView: null,
  
  axisView: null,
  
  /**
   Used to animate the mode's value.
   @property { DG.ValueAnimator }
   */
  valueAnimator: null,
  
  /**
   A record of the animation direction.
   @property { Number }
   */
  animationSign: 1,
  
  isAnimating: function() {
    // !! guarantees a boolean return for null, undefined, etc.
    return !!this.getPath('valueAnimator.isAnimating');
  }.property('valueAnimator.isAnimating'),
  
  modelDidChange: function() {
    var sliderModel = this.getPath('model.content');
    this.set('sliderModel', sliderModel);
    if( sliderModel)
      this.set('axisModel', sliderModel.get('axis'));
  }.observes('model'),
  
  viewDidChange: function() {
    var sliderView = this.getPath('view.contentView');
    this.set('sliderView', sliderView);
    this.set('axisView', sliderView.get('axisView'));
    sliderView.set('controller', this);
  }.observes('view','view.contentView'),
  
  /**
   * Called as action of startButton
   */
  toggleAnimation: function() {
    var tAnimator = this.get('valueAnimator');
    if( SC.none( tAnimator)) {
      tAnimator = DG.ValueAnimator.create( {
                                      valueHolder: this.get('sliderModel'),
                                      incrementProvider: this
                                    });
      this.set('valueAnimator', tAnimator);
    }

    if( tAnimator.get('isAnimating')) {
      tAnimator.endAnimation();
      DG.logUser("sliderEndAnimation: %@", this.getPath('sliderModel.name'));
    }
    else {
      tAnimator.animate();
      DG.logUser("sliderBeginAnimation: %@", this.getPath('sliderModel.name'));
    }
  },
  
  stopAnimation: function() {
    var tAnimator = this.get('valueAnimator');
    if( tAnimator && tAnimator.get('isAnimating'))
      tAnimator.endAnimation();
  },

  /**
   * Called typically be a ValueAnimator to get the amount to increment a value displayed along the axis
   * @property {Number}
   */
  increment: function() {
    var tAxisModel = this.get('axisModel'),
        tAxisView = this.get('axisView'),
        tInc = tAxisView && tAxisView.get('increment'),
        tLower = tAxisModel && tAxisModel.get('lowerBound'),
        tUpper = tAxisModel && tAxisModel.get('upperBound'),
        tValue = this.getPath('sliderModel.value'),
        tTrial = tValue + this.get('animationSign') * tInc;
    if( tTrial > tUpper) {
      this.set('animationSign', -1);
      tInc = tTrial - tUpper;
    }
    else if (tTrial < tLower) {
      this.set('animationSign', 1);
      tInc = tLower - tTrial;
    }
    return this.animationSign * tInc;
  }.property('axisView.increment', 'axisModel.lowerBound', 'axisModel.upperBound', 'sliderModel.value'),

  createComponentStorage: function() {
    var storage = {},
        sliderModel = this.get('sliderModel'),
        axisModel = this.get('axisModel');
    if( sliderModel) {
      this.addLink( storage, 'model', sliderModel);
      if( axisModel) {
        storage.lowerBound = axisModel.get('lowerBound');
        storage.upperBound = axisModel.get('upperBound');
      }
    }
    return storage;
  },
  
  restoreComponentStorage: function( iComponentStorage, iDocumentID) {
    var sliderModel = this.getPath('model.content');
    if( sliderModel) {
      var modelID = this.getLinkID( iComponentStorage, 'model');
      if( modelID) {
        var globalValue = DG.store.find( DG.GlobalValue, modelID);
        if( globalValue) {
          DG.globalsController.registerGlobalValue( globalValue);
          sliderModel.set('content', globalValue);
        }
      }

      var axisModel = sliderModel.get('axis');
      if( axisModel && iComponentStorage.lowerBound && iComponentStorage.upperBound)
        axisModel.setLowerAndUpperBounds( iComponentStorage.lowerBound, iComponentStorage.upperBound);
    }
  }
  
});

