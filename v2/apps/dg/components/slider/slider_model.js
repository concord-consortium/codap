// ==========================================================================
//                            DG.SliderModel
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

DG.SliderTypes = {

  EAnimationDirection: {
    eBackAndForth: 0,
    eLowToHigh: 1,
    eHighToLow: 2
  },

  directionToString: function( iDirection) {
    switch( iDirection) {
      case this.EAnimationDirection.eBackAndForth:
        return 'DG.Slider.backAndForth'.loc();
      case this.EAnimationDirection.eLowToHigh:
        return 'DG.Slider.lowToHigh'.loc();
      case this.EAnimationDirection.eHighToLow:
        return 'DG.Slider.highToLow'.loc();
    }
  },

  EAnimationMode: {
    eNonStop: 0,
    eOnceOnly: 1
  },

  modeToString: function( iMode) {
    switch( iMode) {
      case this.EAnimationMode.eNonStop:
        return 'DG.Slider.nonStop'.loc();
      case this.EAnimationMode.eOnceOnly:
        return 'DG.Slider.onceOnly'.loc();
    }
  }

};

/** @class  DG.SliderModel - The model for a slider. Holds onto a global value.

 @extends SC.Object
 */
DG.SliderModel = SC.Object.extend(
  /** @scope DG.SliderModel.prototype */
  {
    /**
     @property { DG.AxisCellLinearModel }
     */
    axis: null,

    /**
     @property { DG.GlobalValue }
     */
    content: null,
  
    id: null,
    idBinding: '*content.id',
  
    name: function (key, value) {
      if (!SC.none(value)) {
        this.setPath('content.name', value);
      }
      return this.getPath('content.name');
    }.property(),
  
    defaultTitle: function() {
      return this.getPath('content.name');
    }.property(),

    defaultTitleDidChange: function () {
      this.notifyPropertyChange('defaultTitle');
    }.observes('*content.name'),

    _title: null,
    title: function (key, value) {
      if (!SC.none(value)) {
        this._title = value;
      }
      return this._title || this.get('defaultTitle');
    }.property(),

    titleDidChange: function () {
      this.set('userChangedTitle', true);
    }.observes('title'),

    value: null,
    valueBinding: '*content.value',

    animationDirection: DG.SliderTypes.EAnimationDirection.eLowToHigh,
    animationMode: DG.SliderTypes.EAnimationMode.eOnceOnly,
    restrictToMultiplesOf: null,
    maxPerSecond: null,
    userChangedTitle: false, // user changed the title

    /**
     * DG.GraphAnimator
     */
    animator: null,

    /**
     Prepare dependencies.
     */
    init: function() {
      sc_super();

      var axisModel = DG.CellLinearAxisModel.create();
      axisModel.setDataMinAndMax( 0, 10);
      this.set('axis', axisModel);
    },

    destroy: function() {
      DG.globalsController.destroyGlobalValue( this.get('content'));
      sc_super();
    },

    applyRestriction: function() {
      var tOldValue = this.get( 'value'),
          tRestriction = this.get('restrictToMultiplesOf'),
          tMultiplier = (DG.isNumeric( tRestriction) && tRestriction !== 0) ?
              Math.round( tOldValue / tRestriction) : null;
      if( DG.isNumeric( tMultiplier))
        this.setIfChanged('value', tRestriction * tMultiplier);
    }.observes('restrictToMultiplesOf'),

    valueChanged: function() {
      this.applyRestriction();
    }.observes('value'),

    /**
     * Make sure the axis bounds encompass the current value. If they don't, use animation in the rescaling.
     */
    encompassValue: function() {
      var tAxis = this.get('axis'),
          tLower = tAxis.get('lowerBound'),
          tUpper = tAxis.get('upperBound'),
          tValue = this.get('value');
      if( (tValue < tLower) || (tValue > tUpper)) {
        var tNewLower = tLower,
            tNewUpper = tUpper,
            tAxisInfoArray = [];
        if( tValue < tLower)
          tNewLower = tValue - (tUpper - tValue) / 10;
        else
          tNewUpper = tValue + (tValue - tLower) / 10;
        if( SC.none( this.get('animator')))
          this.set('animator', DG.GraphAnimator.create());
        tAxisInfoArray.push ( { axis: tAxis, newBounds: { lower: tNewLower, upper: tNewUpper } });
        DG.sounds.playDrag();
        this.get('animator').set('axisInfoArray', tAxisInfoArray)
                            .animate();
      }
    },

    /**
     * The axis bounds have been changed such that the thumb is no longer visible; i.e. the value is no longer
     * within these bounds. Bring them back in.
     */
    bringValueInBounds: function() {
      // If the axis is animating, it's probably animating so that it will
      // encompass the new value. Wait until it's finished before trying
      // to adjust the value so it fits within the axis bounds.
      if( this.getPath('animator.isAnimating'))
        return;
      var tAxis = this.get('axis'),
          tLower = tAxis.get('lowerBound'),
          tUpper = tAxis.get('upperBound'),
          tValue = this.get('value');
      if( tValue < tLower)
        this.set('value', tLower);
      else if( tValue > tUpper)
        this.set('value', tUpper);
    }.observes('.axis.lowerBound', '.axis.upperBound'),
    
    toLink: function() {
      var content = this.get('content');
      return content ? content.toLink() : null;
    }
    
  } );

