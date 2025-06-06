// ==========================================================================
//                          DG.GraphAnimator
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

/** @class  DG.GraphAnimator - controls the animation of a graph from one state to the next.

  @extends SC.Object
*/
DG.GraphAnimator = SC.Object.extend(
/** @scope DG.GraphAnimator.prototype */ 
{
  /**
    @property {Boolean}
  */
  isAnimating: false,

  /**
    The time that the animation started.
    @property { Number }
  */
  startTime: null,

  /**
    @property {DG.PlotModel}
  */
  plot: null,

  /**
    The axis to be animated and its new bounds. Pass this in on creation
    @property { Array of { axis: {DG.CellLinearAxis}, newBounds: {lower: {Number}, upper: {Number}} } }
  */
  axisInfoArray: null,

  /**
    We make a copy of the above axisInfoArray before we start animation so we can hold onto the
      information we need to end the animation in case another animation starts before we're done.
    @property { Array of { axis: {DG.CellLinearAxis}, newBounds: {lower: {Number}, upper: {Number}} } }
  */
  savedAxisInfoArray: null,

  /**
   * destroy - break loops that prevent garbage collection
   */
  destroy: function() {
    this.endAnimation();
    this.plot = null;
    this.axisInfoArray = null;
    this.savedAxisInfoArray = null;
    sc_super();
  },

  /**
    We assume that my properties have been set to the aspects of the plot that are to
    be animated. If there is an animation already in progress, we end it.
    @param {Function} To be called when animation completes.
  */
  animate: function( iTarget, iCompletionFunc) {
    var this_ = this,
        kInterval = 50, // milliseconds
        kTargetDuration = DG.PlotUtilities.kDefaultAnimationTime; //milliseconds

    // animationLoop - This function is called up to 20 times per second. With each call
    //  it moves the animation to the position appropriate for the amount of time that
    //  has passed since the animation was initiated. Note that it schedules itself using
    //  an SC.Timer until the animation is complete.
    function animationLoop() {
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

      // moveAxisBounds - We're gradually changing the axis domain by tween from its
      //  oldBounds to its newBounds
      function moveAxisBounds( iInfo) {
        var tLower = tween( iInfo.oldBounds.lower,
                  iInfo.newBounds.lower, tAnimationProportion),
            tUpper = tween( iInfo.oldBounds.upper,
                    iInfo.newBounds.upper, tAnimationProportion);
        iInfo.axis.setLowerAndUpperBounds( tLower, tUpper);
      }

      tAnimationProportion = getAnimationProportion( tCurrProportion);

      this_.axisInfoArray.forEach( moveAxisBounds);

      if( tCurrProportion < 1) {
        DG.assert( !this_.animationTimer.get( 'isPaused'));
      }
      else {
        this_.endAnimation( iTarget, iCompletionFunc);
      }
    } // animationLoop

    function setupAxis( iAxisInfo) {
      iAxisInfo.oldBounds = { lower: iAxisInfo.axis.get('lowerBound'),
                  upper: iAxisInfo.axis.get('upperBound') };
    }

    var noAxisHasAnimatableScale = function() {
      var tSomeCanAnimate = this.axisInfoArray.some( function( iAxisInfo) {
        return iAxisInfo.axis.get('scaleCanAnimate');
      });
      return !tSomeCanAnimate;
    }.bind( this);

    if( this.isAnimating) {
      this.endAnimation();
    }
    this.isAnimating = true;

    this.savedAxisInfoArray = this.axisInfoArray; // so new caller won't wipe it out.

    this.axisInfoArray.forEach( setupAxis);

    if( noAxisHasAnimatableScale()) {
      this.endAnimation();
      return; // We're only animating axes so no animation to do
    }

    this.startTime = (new Date()).valueOf();

    if( SC.none( this.animationTimer))
      this.animationTimer = SC.Timer.schedule( { action: animationLoop, interval: kInterval,
                    repeats: YES, until: false });
    this.animationTimer.set( 'isPaused', NO);

    animationLoop();
  },

  /**
   * Called when we want to cancel any pending animations
   */
  reset: function() {
    this.animationTimer.set( 'isPaused', YES);
    if( !SC.none( this.plot))
      this.setPath('plot.isAnimating', false);
    this.isAnimating = false;
  },

  /**
    We assume that my properties have been set to the aspects of the plot that are to
    be animated. If there is an animation already in progress, we end it.
  */
  endAnimation: function( iTarget, iCompletionFunc) {
    if( this.animationTimer)
      this.animationTimer.set( 'isPaused', YES);
    if( !SC.none( this.plot))
      this.setPath('plot.isAnimating', false);
    this.savedAxisInfoArray.forEach( function( iInfo) {
      iInfo.axis.setLowerAndUpperBounds( iInfo.newBounds.lower, iInfo.newBounds.upper);
    });
    this.isAnimating = false;

    if( !SC.none( iCompletionFunc))
      iCompletionFunc.call( iTarget);
  }

});

