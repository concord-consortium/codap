// ==========================================================================
//                          DG.ScrollAnimationUtility
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

/** @class  DG.ScrollAnimationUtility - controls the animation of a scroll bar
 * from one position to the next.

  @extends SC.Object
*/
DG.ScrollAnimationUtility = SC.Object.extend(
/** @scope DG.ScrollAnimationUtility.prototype */
{
  kAnimationTime: 1000, // milliseconds
  /**
    @type {Boolean}
  */
  isAnimating: false,

  /**
    The time that the animation started.
    @type { Number }
  */
  startTime: null,

  /**
   * The animation target.
   * @type {DG.CaseTableView}
   */
  targetView: null,

  /**
   * destroy - break loops that prevent garbage collection
   */
  destroy: function() {
    this.endAnimation();
    //this.plot = null;
    //this.axisInfoArray = null;
    //this.savedAxisInfoArray = null;
    sc_super();
  },

  /**
   * We assume that my properties have been set to the aspects of the scroll that are to
   * be animated. If there is an animation already in progress, we end it.
   *
   */
  animate: function( targetView, iStart, iEnd) {
    var this_ = this,
        kInterval = 50, // milliseconds
        kTargetDuration = this.kAnimationTime; //milliseconds

    this.targetView = targetView;
    this.startValue = iStart;
    this.endValue = iEnd;

    // animationLoop - This function is called up to 20 times per second. With each call
    //  it moves the animation to the position appropriate for the amount of time that
    //  has passed since the animation was initiated. Note that it schedules itself using
    //  an SC.Timer until the animation is complete.
    var animationLoop = function () {
      var tCurrTime = (new Date()).valueOf(),
          tCurrProportion = (tCurrTime - this_.startTime) / kTargetDuration,
          tAnimationProportion;

      // getAnimationProportion - Return DefaultAnimationTween for the given proportion
      //  with a bit of bounds checking.
      function getAnimationProportion( iProportion) {
        if( iProportion >= 1)
          return 1;
        else
          return DG.AnimationMath.DefaultAnimationTween( iProportion);
      }

      // tween - Simple tween using iAnimationProportion
      function tween( iStart, iEnd, iAnimationProportion) {
        return iStart + iAnimationProportion * (iEnd - iStart);
      }

      tAnimationProportion = getAnimationProportion( tCurrProportion);

      this_.get('targetView').scrollToRow(tween(this_.startValue, this.endValue, tAnimationProportion));

      if( tCurrProportion < 1) {
        DG.assert( !this_.animationTimer.get( 'isPaused'));
      }
      else {
        this_.endAnimation();
      }
    }.bind(this); // animationLoop

    if( this.isAnimating) {
      this.endAnimation();
    }

    this.isAnimating = true;

    this.startTime = (new Date()).valueOf();

    if( SC.none( this.animationTimer))
      this.animationTimer = SC.Timer.schedule( { action: animationLoop, interval: kInterval,
                    repeats: YES, until: false });
    this.animationTimer.set( 'isPaused', NO);

    animationLoop();
  },

  /**
    We assume that my properties have been set to the aspects of the plot that are to
    be animated. If there is an animation already in progress, we end it.
  */
  endAnimation: function( iTarget, iCompletionFunc) {
    if (this.animationTimer) {
      this.animationTimer.set( 'isPaused', YES);
      this.endTime = (new Date()).valueOf();
    }
    this.isAnimating = false;
  }

});

