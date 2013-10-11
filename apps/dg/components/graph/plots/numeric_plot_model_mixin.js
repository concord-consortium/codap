// ==========================================================================
//                      DG.NumericPlotModelMixin
//
//  Author:   William Finzer
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

/** @class  Mixin to encapsulate certain behaviors that plot models with one or two numeric
    axes have in common.
*/
DG.NumericPlotModelMixin = 
{
  /**
    Animate a dilation of the plot around the given fixed point.
    @param {Array of {DG.GraphTypes.EPlace}}
    @param {x:{Number}, y:{Number}}
    @param {Number}
  */
  doDilation: function( iPlaces, iFixedPoint, iFactor) {
    var this_ = this,
      tAxisInfoArray = [];
  
    function computeNewBounds( iAxis, iFixedCoord) {
      if( SC.none( iAxis))
        return;

      var tNewBounds = iAxis.computeBoundsForDilation( iFixedCoord, iFactor);
      tAxisInfoArray.push ( { axis: iAxis, newBounds: tNewBounds });
    }
  
    iPlaces.forEach( function( iPlace) {
      var tCoord = (iPlace === DG.GraphTypes.EPlace.eX) ? iFixedPoint.x : iFixedPoint.y;
      computeNewBounds( this_.getAxisForPlace( iPlace), tCoord);
    });
    
    if( SC.none( this.plotAnimator))
      this.plotAnimator = DG.GraphAnimator.create();
    this.plotAnimator.set('axisInfoArray', tAxisInfoArray).animate();
  },

  /**
    Each axis should rescale based on the values to be plotted with it.
    @param{Array of {DG.GraphTypes.EPlace}}
    @param{Boolean} Default is false
    @param{Boolean} Default is true
  */
  doRescaleAxesFromData: function( iPlaces, iAllowScaleShrinkage, iAnimatePoints) {
    var this_ = this,
      tAxisInfoArray = [],
      tOldBoundsArray = [];
  
    function setNewBounds( iPlace, iAxis) {
      var tAttribute = iAxis.getPath('attributeDescription.attribute');
      if( !iAxis || !iAxis.setDataMinAndMax || (tAttribute === DG.Analysis.kNullAttribute))
        return;

      var tDataConfiguration = this_.get('dataConfiguration'),
          tMinMax = tDataConfiguration && tDataConfiguration.getDataMinAndMaxForDimension( iPlace),
          tOldLower = iAxis.get('lowerBound'),
          tOldUpper = iAxis.get('upperBound'),
          tNewLower, tNewUpper;
      tOldBoundsArray.push( { lower: tOldLower, upper: tOldUpper });
      iAxis.setDataMinAndMax( tMinMax.min, tMinMax.max, iAllowScaleShrinkage || false);
      tNewLower = iAxis.get('lowerBound');
      tNewUpper = iAxis.get('upperBound');
      tAxisInfoArray.push ( { axis: iAxis, newBounds: { lower: tNewLower, upper: tNewUpper } });
    }
    
    function setOldBounds( iAxis, iBounds) {
      if( !SC.none( iAxis))
        iAxis.setLowerAndUpperBounds(iBounds.lower, iBounds.upper);
    }
    
    function boundsChanged( iAxisInfoArray, iOldBoundsArray) {
      var tIndex;
      for( tIndex = 0; tIndex < iAxisInfoArray.length; tIndex++) {
        if( !SC.none(iOldBoundsArray[ tIndex].lower) && !SC.none(iOldBoundsArray[ tIndex].upper) &&
            ((iAxisInfoArray[ tIndex].newBounds.lower !== iOldBoundsArray[ tIndex].lower) ||
            (iAxisInfoArray[ tIndex].newBounds.upper !== iOldBoundsArray[ tIndex].upper)))
          return true;
      }
      return false;
    }
  
    // Body of rescaleAxesFromData
    if( SC.none( iAnimatePoints))
      iAnimatePoints = true;

    iPlaces.forEach( function( iPlace) {
      setNewBounds( iPlace, this_.getAxisForPlace( iPlace));
    });
    
    // Only animate if the bounds have changed
    if( boundsChanged( tAxisInfoArray, tOldBoundsArray)) {
      if( iAnimatePoints)
        DG.sounds.playMixup();
        this.set('isAnimating', true);  // Signals view that axes are in new state and points
                                        // can be animated to new coordinates
      // We'll go through both iPlaces and tOldBoundsArray in reverse order
      while( (iPlaces.length > 0) && (tOldBoundsArray.length > 0)) {
        setOldBounds( this_.getAxisForPlace( iPlaces.pop()), tOldBoundsArray.pop());
      }
      
      if( SC.none( this.plotAnimator))
        this.plotAnimator = DG.GraphAnimator.create( { plot: this });
      this.plotAnimator.set('axisInfoArray', tAxisInfoArray).animate( this, this.onRescaleIsComplete);
    }
  },

    /**
     * Subclasses that have something to do after axes are rescaled should override.
     */
    onRescaleIsComplete: function() {
    }
  
};

