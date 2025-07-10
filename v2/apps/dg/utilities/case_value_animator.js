// ==========================================================================
//                            DG.CaseValueAnimator
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

  Holds onto an array of attributeIDs, an array of cases, and a delta for each attribute. During animation, each
    case's values change incrementally so that when the animation is finished, the cases have moved the full delta
    in each attribute dimension.

 @extends SC.Object
 */
DG.CASE_VALUE_ANIMATOR_DISABLE_ANIMATION = false;

DG.CaseValueAnimator = SC.Object.extend(
  {
    /**
      The data context to which animation changes should be applied.
      @property {DG.DataContext}
     */
    dataContext: null,
    
    /**
     * Typically there are only one or two elements in this array.
     * @property {SC.Array of {Number} }
     */
    attributeIDs: null,

    /**
     * How much each case value for each attribute will have changed at animation's end.
     * There are the same number of these as there are attributeIDs.
     * @property {SC.Array of {Number} }
     */
    deltas: null,

    /**
     * The cases whose values are being animated.
     * @property {SC.Array of {Case}}
     */
    cases: null,

    /**
     * One element per case. Each element is an array of values, one per attribute
     * @property {SC.Array of {SC.Array of {Number}}}
     */
    startingValues: null,

    /**
      @property {Boolean}
    */
    isAnimating: false,

    /**
      @property {Number}
    */
    startTime: null,
    
    destroy: function() {
      this.endAnimation();
      sc_super();
    },

    /**
      Change the values of the attributes we are animating of the cases that have been specified
      previously to the specified proportion of the animation.
      Presumes that the 'dataContext', 'cases', and 'attributeIDs' properties have been set up previously.
      @param  {Number}    The proportion of the animation to set the new values to
     */
    changeValues: function ( iProportion) {
      var this_ = this,
          tDataContext = this.get('dataContext'),
          tCases = [], tAttributeIDs = [];

      if( !tDataContext) return;

      // tween - Simple tween using iAnimationProportion
      function tween( iStart, iDelta, iAnimationProportion) {
        var tResult;
        if( DG.isDate( iStart)) {
          tResult = DG.createDate( iStart - iAnimationProportion * iDelta);
        }
        else {
          tResult = iStart - iAnimationProportion * iDelta;
        }
        return tResult;
      }
      
      this.attributeIDs.forEach( function( iAttributeID) { tAttributeIDs.push( iAttributeID); });
      this.cases.forEach( function( iCase) { tCases.push( iCase); });
      
      var change = {
            operation: 'updateCases',
            attributeIDs: tAttributeIDs,
            cases: tCases,
            values: [],
            dirtyDocument: false
          };

      this.cases.forEach( function( iCase, iValueIndex) {
        var tValues = this_.startingValues[ iValueIndex];
        this_.attributeIDs.forEach( function( iID, iAttrIndex) {
          if( !change.values[iAttrIndex]) change.values[iAttrIndex] = [];
          change.values[iAttrIndex].push( tween( tValues[ iAttrIndex], this_.deltas[ iAttrIndex], iProportion));
        });
      });
      
      tDataContext.applyChange( change);
    },



    /**
      We assume that my properties have been set to the aspects of the plot that are to
      be animated. If there is an animation already in progress, we end it.
    */
    animate: function() {
      var this_ = this,
          kInterval = 50,	// milliseconds
          kTargetDuration = DG.PlotUtilities.kDefaultAnimationTime
          ;

      function stashStartingValues() {
        this_.startingValues = [];
        if( SC.none( this_.cases))
          return;

        this_.cases.forEach( function(iCase) {
          var tValues = [];
          this_.attributeIDs.forEach( function(iID) {
            tValues.push( iCase.getRawValue( iID));
          });
          this_.startingValues.push( tValues);
        });
      }

      // animationLoop - This function is called up to 20 times per second.
      // Note that it schedules itself using an SC.Timer.
      function animationLoop() {
        var tCurrTime = (new Date()).valueOf(),
            tCurrProportion = (tCurrTime - this_.startTime) / kTargetDuration,
            tAnimationProportion;

        // getAnimationProportion - Return DefaultAnimationTween for the given 
        // proportion with a bit of bounds checking.
        function getAnimationProportion( iProportion) {
          if( iProportion >= 1)
            return 1;
          else
            return DG.AnimationMath.DefaultAnimationTween( iProportion);
        }

        // Body of animationLoop
        tAnimationProportion = getAnimationProportion( tCurrProportion);

        if( tCurrProportion < 1) {
          DG.assert( !this_.animationTimer.get( 'isPaused'));
          this_.changeValues( tAnimationProportion);
        }
        else {
          this_.endAnimation();
        }
      }

      // Body of animate
      if( this.isAnimating) {
        this.endAnimation();
      }

      stashStartingValues();

      this.isAnimating = true;
      
      if( DG.CASE_VALUE_ANIMATOR_DISABLE_ANIMATION) {
        this.endAnimation();
        return;
      }

      this.startTime = (new Date()).valueOf();

      if( SC.none( this.animationTimer))
        this.animationTimer = SC.Timer.schedule( { action: animationLoop, interval: kInterval,
                                                    repeats: YES, until: false });
      this.animationTimer.set( 'isPaused', NO);

    },

    /**
      We assume that my properties have been set to the aspects of the plot that are to
      be animated. If there is an animation already in progress, we end it.
    */
    endAnimation: function() {
      if( !SC.none( this.animationTimer))
        this.animationTimer.set('isPaused', YES);
      if( this.get('isAnimating')) {
        this.changeValues( 1);  // Finish the animation
        this.set('isAnimating', false);
      }
    }

  } );
