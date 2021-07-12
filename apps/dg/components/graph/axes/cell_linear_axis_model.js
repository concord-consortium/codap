// ==========================================================================
//                        DG.CellLinearAxisModel
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

sc_require('components/graph/axes/cell_axis_model');

/** @class  DG.CellLinearAxisModel - The model for a graph axis.

  @extends DG.CellAxisModel
*/
DG.CellLinearAxisModel = DG.CellAxisModel.extend(
/** @scope DG.CellLinearAxisModel.prototype */
{
  /**
    The gap between tick marks in world coordinates.
    @property { Number }
  */
  tickGap: null,

  /**
    The lower bound of the axis in world coordinates.
    @property { Number }
  */
  __lowerBound: null,
  lowerBound: function( iKey, iValue) {
    if( !SC.none( iKey) && !SC.none( iValue))
        this.__lowerBound = iValue;
    return this.__lowerBound;
  }.property(),

  /**
    The upper bound of the axis in world coordinates.
    @property { Number }
  */
  __upperBound: null,
  upperBound: function( iKey, iValue) {
    if( !SC.none( iKey) && !SC.none( iValue))
      this.__upperBound = iValue;
    return this.__upperBound;
  }.property(),

  /**
   * Prefer a zero lower bound for axis when supported by data.
   * @property { boolean }
   */
  preferZeroLowerBound: false,

  /**
   * Draw a grid line at zero.
   * @property { boolean }
   */
  drawZeroLine: false,

  /**
    Should the zero be locked at one end of the axis?
    @property { boolean }
  */
  lockZero: function( iKey, iLockZero) {
    if( iLockZero !== undefined) {
      this.beginPropertyChanges();
      this.set('_lockZero', iLockZero);
      if( iLockZero)
        this.set( 'lowerBound', 0);
      else
        this.setDataMinAndMax( this._lowerBound, this._upperBound);
      this.endPropertyChanges();
    }
    return this._lockZero;
  }.property( '_lockZero').cacheable(),

  /**
    Should decimal tick values be suppressed (as for a frequency axis)?
    @property { boolean }
  */
  displayOnlyIntegers: false,

  /**
    @property {Boolean}
  */
  isNumeric: true,

  /**
   * @property {Boolean}
   */
  scaleCanAnimate: true,

  /**
    The actual lower bounds from which the apparent lower bounds is computed.
      @private
    @property { Number }
  */
  _lowerBound: null,

  /**
    The actual upper bounds from which the apparent upper bounds is computed.
      @private
    @property { Number }
  */
  _upperBound: null,

  init: function() {
    sc_super();
    this.attributeDescriptionDidChange();
  },

  attributeDescriptionDidChange: function() {
    var tAttrDesc = this.get('attributeDescription');
    if( tAttrDesc && Number(tAttrDesc.getPath('attribute.precision')) === 0)
      this.set('displayOnlyIntegers', true);
  }.observes('attributeDescription'),

  /**
    Override (for now) because superclass will compute it wrong!
    @property{Number} >= 1
  */
  numberOfCells: function() {
    return 1;
  }.property(),

   /**
      @private
    @property { boolean }
  */
  _lockZero: false,

  /**
  We set lower and upper bounds without notifying until after the change
  is complete. Since clients rely on notification from the operands, we
  cause either or both of them to notify as necessary.
  We keep the tickGap in synch with the bounds because this routine is called
  during animation and the tickGap needs to change as the bounds change.

    @param {Number} iLower - desired world coordinate lower bound
    @param {Number} iUpper - desired world coordinate upper bound
  */
  setLowerAndUpperBounds: function( iLower, iUpper, iWithAnimation) {
    iWithAnimation = iWithAnimation || false;
    if( iWithAnimation) {
      if( SC.none( this.axisAnimator))
        this.axisAnimator = DG.GraphAnimator.create();
      this.axisAnimator
          .set('axisInfoArray', [{ axis: this, newBounds: {lower: iLower, upper: iUpper} }])
          .animate();
    }
    else {
      this.beginPropertyChanges();
      // Change to private variables so they don't get out of synch.
      this._lowerBound = iLower;
      this._upperBound = iUpper;
      this.setIfChanged('lowerBound', iLower);
      this.setIfChanged('upperBound', iUpper);
      this.setIfChanged('tickGap', this._computeTickGap(iLower, iUpper));
      this.endPropertyChanges();
    }
  },

  /**
    Translate the bounds of the axis by the given delta
    @param {Number} iDelta - The amount by which the bounds will be translated
  */
  translate: function( iDelta) {
    if( (iDelta === 0) || this._lockZero)
      return; // Can't translate when zero is locked.
    this.beginPropertyChanges();
    this._lowerBound += iDelta;
    this._upperBound += iDelta;
    this._setBoundsFromInternalBounds();
    this.endPropertyChanges();
  },

  /**
    Translate the bounds of the axis by the given delta
    @param {Number} iFixedValue - Will remain constant
    @param {Number} iFactor - The dilation amount
    @return {{lower: {Number}, upper: {Number}}}
  */
  computeBoundsForDilation: function( iFixedValue, iFactor) {
    var tNewLower = (!this._lockZero || (this._lowerBound !== 0)) ?
                      iFixedValue + (this._lowerBound - iFixedValue) * iFactor :
                      this._lowerBound,
        tNewUpper = (!this._lockZero || (this._upperBound !== 0)) ?
                      iFixedValue + (this._upperBound - iFixedValue) * iFactor :
                      this._upperBound;
    return {lower: tNewLower, upper: tNewUpper};
  },

  /**
    Dilate the axes by the given ratio leaving fixedValue constant.
    @param {Number} iFixedValue - Will remain constant
    @param {Number} iFactor - The dilation amount
    @param {Boolean} Should the dilation be accomplished with animation. Default is false.
  */
  dilate: function( iFixedValue, iFactor, iWithAnimation) {
    var tNewBounds = this.computeBoundsForDilation( iFixedValue, iFactor);
    iWithAnimation = iWithAnimation || false;
    if( iWithAnimation) {
      if( SC.none( this.axisAnimator))
        this.axisAnimator = DG.GraphAnimator.create();
      this.axisAnimator
          .set('axisInfoArray', [{ axis: this, newBounds: tNewBounds }])
          .animate();
    }
    else {
      this._lowerBound = tNewBounds.lower;
      this._upperBound = tNewBounds.upper;

      if( this._setBoundsFromInternalBounds()) {
        this.beginPropertyChanges();
        this._resetTickGap( this.get('lowerBound'), this.get('upperBound'));
        this._handleAxisChange();
        this.endPropertyChanges();
      }
    }
  },

  /**
    My data range has changed. Recompute a reasonable _lowerBound and
    _upperBound.

    If iAllowRangeToShrink is false, we will keep the current bounds if they
    are wide enough to encompass the new dataMin and dataMax.

    @param {Number} iDataMin - the data provide this value
    @param {Number} iDataMax - the data provide this value
    @param {boolean} iAllowRangeToShrink - If true, we can shrink the current bounds
  */
  setDataMinAndMax: function( iDataMin, iDataMax, iAllowRangeToShrink) {
    // If we're not allowed to shrink, don't let null iDataMin or iDataMax force us to do anything
    if( !iAllowRangeToShrink && (SC.none( iDataMin) || SC.none( iDataMax)))
      return;

    // If we're not allowed to shrink and the current bounds will handle the given min and max, we can bail
    if( !iAllowRangeToShrink &&
        (iDataMin >= this.get('lowerBound')) && (iDataMax <= this.get('upperBound')))
      return;

    this._resetScale(iDataMin, iDataMax);

    // There are special conditions having to do with multiples that require us
    // to call both _setBoundsFromInternalBounds and _resetTickGap. If either
    // returns true, then we have _handleAxisChange.
    var tSetBoundsResult = this._setBoundsFromInternalBounds(),
        tResetTickGapResult = this._resetTickGap( this.get('lowerBound'),
                                                  this.get('upperBound'));
    if ( tSetBoundsResult || tResetTickGapResult)
      this._handleAxisChange();
  },

  /**
  Recompute lowerBound, upperBound and tickGap for each subaxis

    @param {Number} iDataMin - the data provide this value
    @param {Number} iDataMax - the data provide this value
    @protected
  */
  _resetScale: function( iDataMin, iDataMax) {
    var tNewParams = this._computeBoundsAndTickGap( iDataMin, iDataMax);
    this.set('tickGap', tNewParams.gap);
    this._lowerBound = tNewParams.lower;
    this._upperBound = tNewParams.upper;
  },

  /**
  Recompute lowerBound, upperBound and tickGap for each subaxis

    @param {Number} iDataMin - the data provide this value
    @param {Number} iDataMax - the data provide this value
    @return { {lower: {Number}, upper: {Number}, gap: {Number}} }
    @protected
  */
  _computeBoundsAndTickGap: function( iDataMin, iDataMax) {
    var kFactor = 2.5,
        tType = this.getPath('attributeDescription.attributeType'),
        tDefaultConstants = defaultsForType( tType),
        tTickGap;

    function defaultsForType( iType) {
      switch( iType) {
        case DG.Analysis.EAttributeType.eDateTime:
          return {
            min: Date.now() / 1000 - 10 * 24 * 60 * 60,
            max: Date.now() / 1000,
            addend: 5 * 24 * 60 * 60
          };
        case DG.Analysis.EAttributeType.eNumeric:
          /* falls through */
        default:
          return {
            min: 0,
            max: 10,
            addend: 5
          };
      }
    }

    // We can get in here with dataMax < iDataMin if there are no values.
    // should not rely on min/max being real or +/- inf.
    if ( !DG.isFinite( iDataMax) || !DG.isFinite( iDataMin) || (iDataMax < iDataMin)) {
      // If the attribute description has defaults, we use them. Otherwise arbitrarily set range from 0..10
      var tDefaultMin = this.getPath('attributeDescription.attribute.defaultMin' ),
          tDefaultMax = this.getPath('attributeDescription.attribute.defaultMax' );
      iDataMin = SC.none( tDefaultMin) ? tDefaultConstants.min : tDefaultMin;
      iDataMax = SC.none( tDefaultMax) ? tDefaultConstants.max : tDefaultMax;
    }
    else if( (iDataMin === iDataMax) && (iDataMin === 0)){
      iDataMin = -10;
      iDataMax = 10;
    }
    else if( (iDataMin === iDataMax) && (Math.floor(iDataMin) === iDataMin)) {
      // Place the value in the middle of a scale that extends a fixed amount in each direction
      iDataMax += tDefaultConstants.addend;
      iDataMin -= tDefaultConstants.addend;
    }
    else if( iDataMin === iDataMax) {
      switch( tType) {
        case DG.Analysis.EAttributeType.eNumeric:
          // Place the value in the middle of a scale that extends 10% of the value in each direction
          iDataMax = iDataMin + 0.1 * Math.abs( iDataMin);
          iDataMin = iDataMin - 0.1 * Math.abs( iDataMin);
          break;
        case DG.Analysis.EAttributeType.eDateTime:
          // Place the value in the middle of a scale that extends a fixed amount in each direction
          iDataMax += tDefaultConstants.addend;
          iDataMin -= tDefaultConstants.addend;
          break;
      }
    }
    else if( tType === DG.Analysis.EAttributeType.eNumeric) { // Here we can snap to zero
      if( (iDataMin > 0) && (iDataMax > 0) && (iDataMin <= iDataMax / kFactor))
        iDataMin = 0;
      else if( (iDataMin < 0) && (iDataMax < 0) && (iDataMax >= iDataMin / kFactor))
        iDataMax = 0;
    }
    tTickGap = this._computeTickGap( iDataMin, iDataMax);
    return { lower: this._findLow( iDataMin, tTickGap),
              upper: this._findHigh( iDataMax, tTickGap),
              gap: tTickGap };
  },

  /**
    @param {Number} iDataMin - the data provide this value
    @param {Number} iDataMax - the data provide this value
    @return {Number} the new tickGap
    @protected
  */
  _computeTickGap: function( iDataMin, iDataMax) {
    var tRange = (iDataMin >= iDataMax) ? Math.abs( iDataMin) : iDataMax - iDataMin,
        tTickGap = this._goodTickValue( tRange / 5);
    // If we're set to only show integers, we have to make sure
    // that tickGap is at least one.
    if (this.displayOnlyIntegers && (tTickGap < 1))
      tTickGap = 1;

    return tTickGap;
  },

  /**
    @param {Number} iDataMin - the data provide this value
    @param {Number} iDataMax - the data provide this value
    @return {boolean} true if new tickgap is different than pre-existing one
    @protected
  */
  _resetTickGap: function( iDataMin, iDataMax) {
    var tOldTickGap = this.tickGap,
        tNewTickGap = this._computeTickGap( iDataMin, iDataMax);

    this.set('tickGap', tNewTickGap);

    return tOldTickGap !== tNewTickGap;
  },

  /**
  Use the internal bounds to set the apparent bounds. If either bound
  is "close" to zero, snap it to zero.

  Don't use this algorithm if there is a transformation in place
  because a transformation typically has trouble with zero.

    @return {boolean} True if either apparent bounds changes, false otherwise.
    @private
  */
  _setBoundsFromInternalBounds: function() {
    var kGrabFraction = 0.05,
        tSavedLower = this.get('lowerBound'),
        tSavedUpper = this.get('upperBound'),
        tGrabRange = (this._upperBound - this._lowerBound) * kGrabFraction;

    this.beginPropertyChanges();
    if ((this.get( 'lockZero') || ((this._lowerBound > 0) && (this._lowerBound - tGrabRange < 0))))
      this.set( 'lowerBound', 0);
    else
      this.set( 'lowerBound', this._lowerBound);

    if ((this._upperBound < 0)  && (this._upperBound + tGrabRange > 0))
      this.set( 'upperBound', 0);
    else
      this.set( 'upperBound', this._upperBound);
    this.endPropertyChanges();

    return (tSavedLower !== this.get('lowerBound')) ||
        (tSavedUpper !== this.get('upperBound'));
},

  /**
  A change in my model can trigger a change in how I handle leading or
  trailing zeroes.

    @private
  */
  _handleAxisChange: function() {
    // Do nothing until we're ready to deal with leading or trailing zeroes
  },

  /**
    @param {Number} iDataMin - the data provide this value
    @param {Number} iTickGap - the gap between ticks
    @return {Number} a reasonable value for the lower bounds
  */
  _findLow: function( iDataMin, iTickGap) {
    if ((iDataMin >= 0) && this.get('preferZeroLowerBound'))
      return 0;
    if( iTickGap !== 0)
      return (Math.floor( iDataMin / iTickGap) - 0.5) * iTickGap;
    else
      return iDataMin - 1;
  },

  /**
    @param {Number} iDataMax - the data provide this value
    @param {Number} iTickGap - the gap between ticks
    @return {Number} a reasonable value for the uppax bounds
  */
  _findHigh: function( iDataMax, iTickGap) {
    if( iTickGap !== 0)
      return (Math.floor( iDataMax / iTickGap) + 1.5) * iTickGap;
    else
      return iDataMax + 1;
  },

  /**
    Computes a good major tick value from a trial value. It will be the next
      lowest value of the form 1, 2, 5, 10, ...
    @param {Number} iTrial - a suggested tick value
  */
  _goodTickValue: function( iTrial) {
    return DG.MathUtilities.goodTickValue( iTrial);
  }

});
