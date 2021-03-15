// ==========================================================================
//                      DG.NumericPlotModelMixin
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
      this.plotAnimator = DG.GraphAnimator.create( { plot: this });
    this.plotAnimator.set('axisInfoArray', tAxisInfoArray).animate();
  },

  /**
    Each axis should rescale based on the values to be plotted with it.
    @param{Array of {DG.GraphTypes.EPlace}}
    @param{Boolean} Default is false
    @param{Boolean} Default is true
  */
  doRescaleAxesFromData: function( iPlaces, iAllowScaleShrinkage, iAnimatePoints, iUserAction) {
    if( this.getPath('dataConfiguration.cases').length() === 0)
      return; // Don't rescale if there are no cases
    var this_ = this,
      tAxisInfoArray = [],
      tOldBoundsArray = [];

    function setNewBounds( iPlace, iAxis, isPseudoNumeric) {
      var tAttribute = iAxis && iAxis.getPath('attributeDescription.attribute'),
          // a pseudo-numeric axis is a numeric axis that doesn't correspond to an attribute
          tIsPseudoNumeric = isPseudoNumeric || (iAxis &&
              iAxis.constructor === DG.CountAxisModel);
      if( !iAxis || !iAxis.setDataMinAndMax ||
          (!tIsPseudoNumeric && tAttribute === DG.Analysis.kNullAttribute)) {
        tOldBoundsArray.push({}); // Must have an object here or things get out of sync
        return;
      }
      iAxis.set('scaleCanAnimate', SC.none( tAttribute) || tAttribute.get('type') !== 'qualitative');

      // For the purpose of getting new bounds, if we're working with the y-axis of a plot that
      // is plotting on y2, we have to change iPlace so we get the right min and max.
      if( iPlace === DG.GraphTypes.EPlace.eY && this_.get('verticalAxisIsY2'))
        iPlace = DG.GraphTypes.EPlace.eY2;

      var tMinMax = this_.getDataMinAndMaxForDimension( iPlace),
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

    function axisForPlace( iPlace) {
      var tPlace = iPlace;
      if( this_.get('verticalAxisIsY2')) {
        switch( iPlace) {
          case DG.GraphTypes.EPlace.eY:
              tPlace = DG.GraphTypes.EPlace.eY2;
            break;
          case DG.GraphTypes.EPlace.eY2:
              tPlace = DG.GraphTypes.EPlace.eUndefined;
            break;
        }
      }
      return this_.getAxisForPlace( tPlace);
    }

    // Body of rescaleAxesFromData
    if( SC.none( iAnimatePoints))
      iAnimatePoints = true;

    DG.UndoHistory.execute(DG.Command.create({
      name: 'axis.rescaleFromData',
      undoString: 'DG.Undo.axisRescaleFromData',
      redoString: 'DG.Redo.axisRescaleFromData',
      causedChange: iUserAction,        // if this was not triggered by user, don't add to undo stack
      log: "Rescale axes from data",
      executeNotification: {
        action: 'notify',
        resource: 'component',
        values: {
          operation: 'rescaleGraph',
          type: 'DG.GraphView'
        }
      },
      execute: function() {

        iPlaces.forEach( function( iPlace) {
          setNewBounds( iPlace, axisForPlace( iPlace), this_.get('isBarHeightComputed'));
        });

        // we store clones of the data, because if/when we animate, the two arrays we need are emptied
        this._undoData = { bounds: tOldBoundsArray.slice(), places: iPlaces.slice() };

        if( boundsChanged( tAxisInfoArray, tOldBoundsArray)) {
          if (iAnimatePoints) {
            DG.sounds.playMixup();
            this_.set('isAnimating', true);    // Signals view that axes are in new state and points
            // can be animated to new coordinates
            // We'll go through both iPlaces and tOldBoundsArray in reverse order
            while ((iPlaces.length > 0) && (tOldBoundsArray.length > 0)) {
              setOldBounds(axisForPlace(iPlaces.pop()), tOldBoundsArray.pop());
            }

            if (SC.none(this_.plotAnimator))
              this_.plotAnimator = DG.GraphAnimator.create({plot: this_});
            this_.plotAnimator.set('axisInfoArray', tAxisInfoArray).animate(this_, this_.onRescaleIsComplete);
          }
          else {
            // Make sure there is no pending animation
            if( this_.plotAnimator)
              this_.plotAnimator.reset();
            // Without animation, set the axes to the correct bounds
            tAxisInfoArray.forEach( function( iInfo) {
              iInfo.axis.setDataMinAndMax( iInfo.newBounds.lower, iInfo.newBounds.upper);
            });
          }
        }
      },
      undo: function() {
        if (this._undoData) {
          this._undoData.places.forEach( function( iPlace, i) {
            var iAxis = axisForPlace( iPlace),
                data  = this._undoData.bounds[i];
            if (iAxis && data)
              iAxis.setLowerAndUpperBounds( data.lower, data.upper);
          }.bind(this));
          this_.onRescaleIsComplete();
        }
      },
      redo: function() {
        if (this._undoData) {
          this._undoData.places.forEach( function( iPlace) {
            setNewBounds( iPlace, axisForPlace( iPlace), this_.get('isBarHeightComputed'));
          });

          // Only animate if the bounds have changed
          if( iAnimatePoints && boundsChanged( tAxisInfoArray, tOldBoundsArray)) {
            DG.sounds.playMixup();
            this_.set('isAnimating', true);    // Signals view that axes are in new state and points
                                               // can be animated to new coordinates
            // We'll go through both iPlaces and tOldBoundsArray in reverse order
            while( (iPlaces.length > 0) && (tOldBoundsArray.length > 0)) {
              setOldBounds( axisForPlace( iPlaces.pop()), tOldBoundsArray.pop());
            }

            if( SC.none( this_.plotAnimator))
              this_.plotAnimator = DG.GraphAnimator.create( { plot: this_ });
            this_.plotAnimator.set('axisInfoArray', tAxisInfoArray).animate( this_, this_.onRescaleIsComplete);
          }
        }
      },
    }));
  },

    /**
     * Subclasses that have something to do after axes are rescaled should override.
     */
    onRescaleIsComplete: function() {
    }

};
