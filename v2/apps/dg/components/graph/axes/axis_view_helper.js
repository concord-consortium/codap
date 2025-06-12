// ==========================================================================
//                              DG.AxisViewHelper
//
//  Author:   William Finzer
//
//  Copyright (c) 2016 by The Concord Consortium, Inc. All rights reserved.
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

/** @class  DG.AxisViewHelper - Base class for helpers that draw ticks on cell linear axes
 *
 * @extends SC.Object
 */
DG.AxisViewHelper = SC.Object.extend(
    /** @scope DG.AxisViewHelper.prototype */ (function () {
      return {
        kAxisGap: 1,
        kTickLength: 4,

        /**
         * @property {DG.CellLinearAxisView}
         */
        axisView: null,

        destroy: function() {
          sc_super();
          this.axisView = null;
        },

        paper: function() {
          return this.getPath('axisView.paper');
        }.property(),
        paperDidChange: function() {
          this.notifyPropertyChange('paper');
        }.observes('axisView.paper'),

        elementsToClear: function() {
          return this.axisView._elementsToClear;
        }.property('axisView'),

        orientation: function() {
          return this.getPath('axisView.orientation');
        }.property(),
        orientationDidChange: function() {
          this.notifyPropertyChange('orientation');
        }.observes('axisView.orientation'),

        lowerBound: function() {
          return this.getPath('axisView.model.lowerBound');
        }.property(),
        lowerBoundDidChange: function() {
          this.notifyPropertyChange('lowerBound');
        }.observes('axisView.model.lowerBound'),

        upperBound: function() {
          return this.getPath('axisView.model.upperBound');
        }.property(),
        upperBoundDidChange: function() {
          this.notifyPropertyChange('upperBound');
        }.observes('axisView.model.upperBound'),

        axisLineCoordinate: function() {
          return this.getPath('axisView.axisLineCoordinate');
        }.property(),
        axisLineCoordinateDidChange: function() {
          this.notifyPropertyChange('axisLineCoordinate');
        }.observes('axisView.axisLineCoordinate'),

        tickGap: function() {
          return this.getPath('axisView.model.tickGap');
        }.property(),
        tickGapDidChange: function() {
          this.notifyPropertyChange('tickGap');
        }.observes('axisView.model.tickGap'),

        pixelMin: function() {
          return this.getPath('axisView.pixelMin');
        }.property(),
        pixelMinDidChange: function() {
          this.notifyPropertyChange('pixelMin');
        }.observes('axisView.pixelMin'),

        pixelMax: function() {
          return this.getPath('axisView.pixelMax');
        }.property(),
        pixelMaxDidChange: function() {
          this.notifyPropertyChange('pixelMax');
        }.observes('axisView.pixelMax'),

        isVertical: function() {
          return this.getPath('axisView.isVertical');
        }.property(),
        isVerticalDidChange: function() {
          this.notifyPropertyChange('isVertical');
        }.observes('axisView.isVertical'),

        fullCellWidth: function() {
          return this.getPath('axisView.fullCellWidth');
        }.property(),
        fullCellWidthDidChange: function() {
          this.notifyPropertyChange('fullCellWidth');
        }.observes('axisView.fullCellWidth'),

        maxNumberExtent: function(iKey, iValue) {
          if( !SC.none( iValue)) {
            this.setPath('axisView.maxNumberExtent', iValue);
          }
          return this.getPath('axisView.maxNumberExtent');
        }.property(),
        maxNumberExtentDidChange: function() {
          this.notifyPropertyChange('maxNumberExtent');
        }.observes('axisView.maxNumberExtent'),

        /**
         * @property Cache of information about this axis
         */
        info: function() {
          var tInfo = {
            lowerBound: this.get('lowerBound'),
            upperBound: this.get('upperBound'),
            range: null,
            cellWidth: this.get('fullCellWidth'),
            pixelMax: this.get('pixelMax')
          };
          tInfo.range = tInfo.upperBound - tInfo.lowerBound;
          return tInfo;
        }.property().cacheable(),
        infoDidChange: function() {
          this.notifyPropertyChange('info');
        }.observes('*axisView.model.lowerBound', '*axisView.model.upperBound',
            'axisView.fullCellWidth', 'axisView.pixelMax'),

        /**
         Given the value to plot and its cell number, give the coordinate along this axis.
         @return {Number}
         */
        cellDataToCoordinate: function( iCell, iData) {
          return this.cellDataToCoordinateUsingCache( iCell, iData, this.get('info'));
        },

        /**
         Given the value to plot return the coordinate along this axis.
         @return {Number}
         */
        dataToCoordinate: function( iData) {
          return this.cellDataToCoordinate( 0, iData);
        },

        /**
         Given a coordinate, return the result of the linear transformation
         to data value
         @param iCoord {Number} in screen coordinates
         @param iSnapToTick {boolean} if true, and return value is close to a tick, return the tick value
         @return {Number} in world coordinates.
         */
        coordinateToData: function( iCoord, iSnapToTick) {
          return this.coordinateToDataGivenCell( 0, /*this.whichCell( iCoord)*/ iCoord, iSnapToTick);
        },

        /**
         Given the value to plot and its cell number, give the coordinate along this axis.
         @return {Number}
         */
        cellDataToCoordinateUsingCache: function( iCell, iData, iCache) {
          if (!isFinite( iData))
            return null;

          var tCoordinate = SC.empty( iData) ? null : (iData - iCache.lowerBound) * iCache.cellWidth / iCache.range;
          if(!SC.none(tCoordinate))
            switch( this.get('orientation')) {
              case DG.GraphTypes.EOrientation.kVertical:
              case DG.GraphTypes.EOrientation.kVertical2:
                tCoordinate = iCache.pixelMax + (iCell + 1) * iCache.cellWidth - tCoordinate;
                break;

              case DG.GraphTypes.EOrientation.kHorizontal:
                tCoordinate = iCell * iCache.cellWidth + tCoordinate;
                break;
            }

          return tCoordinate;
        },

        /**
         Given a coordinate, return the result of the linear transformation
         to data value. The value will be relative to the given cell; i.e., if
         the user has dragged outside of that cell, the returned value is as though
         that cell continued on in both directions.
         * @param iCell {number}
         * @param iCoord {number}
         * @param iSnapToTick {boolean} if true, and return value is close to a tick, return the tick value
         * @return {Number} in world coordinates
         */
        coordinateToDataGivenCell: function( iCell, iCoord, iSnapToTick) {
          var tData = 0,
              tCellWidth = this.get('fullCellWidth'),
              tLowerBound, tUpperBound, tPixelMin, tPixelMax, tPixelDistance, tPixelsPerWorldUnit;
          if (tCellWidth !== 0) {
            tLowerBound = this.get('lowerBound');
            tUpperBound = this.get('upperBound');
/*
       TBool tReverseScale = ((ds_CCellLinearAxis*) mAxisP)->IsScaleReversed();
       TBool tLogScale = ((ds_CCellLinearAxis*) mAxisP)->IsScaleLogarithmic();
*/

            if( this.get('isVertical')) {
              tPixelMin = this.get('pixelMax') + tCellWidth * (iCell + 1);
              tPixelMax = tPixelMin - tCellWidth;
              iCoord += this.get('pixelMax'); // offset by the top of the axis
            } else {
              tPixelMin = this.get('pixelMin') + tCellWidth * iCell;
              tPixelMax = tPixelMin + tCellWidth;
              iCoord += this.get('pixelMin'); // offset by the left of the axis
        }
            tPixelDistance = iCoord - tPixelMin;
            tPixelsPerWorldUnit = ( tPixelMax - tPixelMin) / (tUpperBound - tLowerBound);
            tData = tLowerBound + tPixelDistance / tPixelsPerWorldUnit;
/*
       TDouble tLogLinearParam( ((ds_CCellLinearAxis*) mAxisP)->
                       GetLogLinearTransitionParam()); // 0 => linear; 1 => log
            tPixelDistance is the number of pixels from the relevant axis boundary to the given coordinate
       TLength tPixelDistance( tReverseScale ? (pixelMax - iCoord) : (iCoord - pixelMin));
            For a vertical scale, tPixelDistance is negative, but tCellWidth is positive. That won't work for a
            log scale so we have to change the sign.
       if( tLogScale && (mOrientation === ds_kVertical))
         tPixelDistance *= -1;
       tData = ((tLogLinearParam === 0) ? 0 :
               tLogLinearParam * tLowerBounds *
                 pow( 10, log10( tUpperBounds / tLowerBounds) * tPixelDistance / tCellWidth))
           +
           ((tLogLinearParam === 1) ? 0 :
               (1 - tLogLinearParam) * (tLowerBounds + tPixelDistance * (tUpperBound - tLowerBound)
                             / ( tPixelMax - tPixelMin)));
*/
            if( iSnapToTick) {
              var kSnapPixelThreshold = 2,
                  tTickGap = this.get('tickGap'),
                  tNearestTickValue = Math.round(tData / tTickGap) * tTickGap;
              if (Math.abs(tNearestTickValue - tData) * tPixelsPerWorldUnit < kSnapPixelThreshold) {
                tData = tNearestTickValue;
              }

            }
          }

          return tData;
        }


      };
    }()));

