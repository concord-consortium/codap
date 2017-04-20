// ==========================================================================
//                                DG.ValueAnimator
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

/** @class

  Holds onto an object with a 'value' property that can be incremented. The size of the increment is obtained
  from the incrementProvider that has a property 'increment'.

 @extends SC.Object
 */
DG.ValueAnimator = SC.Object.extend(
  {
    /**
     * This object has a 'value' property that is numeric and can be incremented.
     * @property {SC.Object}
     */
    valueHolder: null,

    /**
     * This object has a numeric 'increment' property determined internally. For example, a DG.CellLinearAxisView will
     * compute this value based on the current value along the axis of a single pixel.
     */
    incrementProvider: null,

    /**
      @property {Boolean}
    */
    isAnimating: false,

    maxPerSecond: null,

    /**
      We assume that my properties have been set to the aspects of the plot that are to
      be animated. If there is an animation already in progress, we end it.
    */
    animate: function() {
      var this_ = this,
          tMaxPerSecond = this.get('maxPerSecond'),
          tInterval = (DG.isNumeric(tMaxPerSecond) && tMaxPerSecond > 0) ?
              (1000 / tMaxPerSecond) : 50,	// milliseconds
          tValueHolder = this.get('valueHolder')
          ;

      // animationLoop - This function is called up to 20 times per second. Note that it schedules itself using
      //	an SC.Timer.
      function animationLoop() {
        var tIncrement = this_.getPath('incrementProvider.increment');
        tValueHolder.set('value', tValueHolder.get('value') + tIncrement);
      }

      // End any animation we may be in the midst of
      if( this.get('isAnimating')) {
        this.endAnimation();
      }
      this.set('isAnimating', true);

      if( SC.none( this.animationTimer))
        this.animationTimer = SC.Timer.schedule( { action: animationLoop,
                      repeats: YES, until: false });
      this.animationTimer.set( 'interval', tInterval);
      this.animationTimer.set( 'isPaused', NO);
    },

    /**
      We assume that my properties have been set to the aspects of the plot that are to
      be animated. If there is an animation already in progress, we end it.
    */
    endAnimation: function() {
      if( !SC.none( this.animationTimer))
        this.animationTimer.set('isPaused', YES);
      if( this.get('isAnimating'))
        this.set('isAnimating', false);
    }

  } );
