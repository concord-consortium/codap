// ==========================================================================
//                            DG.BinnedAxisView
//
//  Author:   William Finzer
//
//  Copyright (c) 2019 by The Concord Consortium, Inc. All rights reserved.
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

sc_require('components/graph/axes/axis_view');

/** @class  DG.BinnedAxisView - The view for a graph axis that displays numeric bins.

 @extends DG.AxisView
 */
DG.BinnedAxisView = DG.AxisView.extend( (function() {
  var kTickLength = 4,
      kAxisGap = 2;

  return {
    /** @scope DG.BinnedAxisView.prototype */

    /**
     Number of pixels required from the axis line to the edge of the graph view
     @property { Number }
     */
    desiredExtent: function() {
      var kWidthFudge = 5;
      return sc_super() + kTickLength + kAxisGap + kWidthFudge + this.get('maxLabelExtent');
    }.property('maxLabelExtent'),

    /**
     * When we are the "other" axis, our partner needs to know how much to offset pixelMin.
     * For me, it's the same as desiredExtent
     * @property {Number}
     */
    pixelMinOffset: function() {
      return this.get('desiredExtent');
    }.property('desiredExtent'),

    /**
     It's not clear whether this is a numeric axis or not
     @property { Boolean }
     */
    isNumeric: true,

    /**
     * @property {Boolean}
     */
    centering: true,

    /**
     @property {Number} Each time we draw the axis, we set this property to the maximum width
     of the label strings. Note that this will change depending not only on the length of the
     strings but on the rotation of the labels.
     */
    maxLabelExtent: 0,

    allowCellBoundaries: false,

    numberOfBins: function() {
      return this.getPath('model.binnedPlotModel.totalNumberOfBins');
    }.property(),
    numberOfBinsDidChange: function() {
      this.notifyPropertyChange( 'numberOfBins');
      this.displayDidChange();
    }.observes('model.binnedPlotModel.totalNumberOfBins'),

    /**
     * @return { Number} in pixels
     */
    binWidth: function() {
      var tNumBins = this.get('numberOfBins');

      return Math.abs(this.get('pixelMax') - this.get('pixelMin')) / tNumBins;
    }.property('numberOfBins'),

    labelSpecs: null,

    /**
     *
     * @param iBinNum {Number}
     * @return {Number} screen coordinate of center of bin
     */
    binToCoordinate: function( iBinNum) {
      var tOffset = (iBinNum + 0.5) * this.get('binWidth');
      if (this.get('orientation') === DG.GraphTypes.EOrientation.kVertical)
        tOffset = -tOffset;
      return this.get('pixelMin') + tOffset;
    },

    /**
     *
     * @param iWorldValue
     * @return {Number} in screen coordinates
     */
    dataToCoordinate: function( iWorldValue) {
      return this.binToCoordinate( Math.floor( (iWorldValue - this.getPath( 'model.binnedPlotModel.alignment')) /
        this.getPath('model.binnedPlotModel.width')));
    },

    binnedPlotModelWidthOrAlignmentDidChange: function() {
      this.displayDidChange();
    }.observes('model.binnedPlotModel.width', 'model.binnedPlotModel.alignment'),

    /**
     Since I'm a leaf class I implement doDraw.
     */
    doDraw: function doDraw() {

      // We can get stuck if we have height or width of zero
      var tFrame = this.get('frame');
      if( !tFrame || (tFrame.height === 0 || tFrame.width === 0))
        return;

      var this_ = this,
          kHorizontalOrientations = [DG.GraphTypes.EOrientation.kHorizontal, DG.GraphTypes.EOrientation.kTop],
          tModel = this.get('model'),
          tNumBins = tModel.get('numberOfBins'),
          tBaseline = this_.get('axisLineCoordinate'),
          tOrientation = this.get('orientation'),
          tIsHorizontal = kHorizontalOrientations.indexOf( tOrientation) >= 0,
          tRotation = tIsHorizontal ? 0 : -90, // default to parallel to axis
          tMaxHeight = DG.RenderingUtilities.kDefaultFontHeight,  // So there will be a default extent
          tCentering = this.get('centering'),
          tTickOffset = tCentering ? 0 : this.get('binWidth') / 2,
          tAnchor = tCentering ? 'middle' : 'start',
          tMaxWidth = tMaxHeight,
          tLabels = this.getPath('model.binLabels'),
          tLabelSpecs = this.get('labelSpecs') || [],
          tCollision = false,
          kCollisionPadding = 5,
          tPrevLabelEnd;

      function measureOneBin( iBinLabelAndTitle, iBinNum) {
        var tCoord = this_.binToCoordinate(iBinNum);
        if( !isFinite( tCoord)) {
          return;
        }
        var tTextElement;
        if( !tLabelSpecs[iBinNum]) {
          tTextElement = this_.get('paper').text(0, 0, iBinLabelAndTitle.label)
              .addClass('dg-axis-tick-label')
              .addClass('dg-binned-axis-label');
        }
        else {
          tTextElement = tLabelSpecs[ iBinNum].element;
          tTextElement.attr('text', iBinLabelAndTitle.label);
        }
        tTextElement.attr('title', iBinLabelAndTitle.title);
        var tTextExtent = DG.RenderingUtilities.getExtentForTextElement(
                          tTextElement, DG.RenderingUtilities.kDefaultFontHeight, true /* compute with no transform */);

        tTextElement.binNum = iBinNum;
        tLabelSpecs[iBinNum] = { element: tTextElement, coord: tCoord,
                      height: tTextExtent.height, width: tTextExtent.width };

        tMaxHeight = Math.max( tMaxHeight, tTextExtent.height);
        tMaxWidth = Math.max( tMaxWidth, tTextExtent.width);
        if(SC.none( tPrevLabelEnd)) {
          tCollision = tTextExtent.width > this_.get('binWidth');
          tPrevLabelEnd = tIsHorizontal ? tCoord + tTextExtent.width / 2 : tCoord - tTextExtent.width / 2;
        }
        else if( tIsHorizontal) {
          tCollision = tCollision || (tCoord - tTextExtent.width / 2 < tPrevLabelEnd + kCollisionPadding);
          tPrevLabelEnd = (tCoord + tTextExtent.width / 2);
        }
        else {  // vertical
          tCollision = tCollision || (tCoord + tTextExtent.width / 2 > tPrevLabelEnd - kCollisionPadding);
          tPrevLabelEnd = (tCoord - tTextExtent.width / 2);
        }
      } // measureOneBin

      // iLabelSpec has form { element: {Raphael element}, coord: {Number}, height: {Number}, width: {Number} }
      function drawOneCell( iLabelSpec, iIndex) {
        var tCoord = iLabelSpec.coord,
            tLabelX, tLabelY;
        switch( this_.get('orientation')) {
          case DG.GraphTypes.EOrientation.kVertical:
            this_._elementsToClear.push(
              this_.get('paper').line( tBaseline, tCoord + tTickOffset, tBaseline - kTickLength, tCoord + tTickOffset)
                .attr( { stroke: DG.PlotUtilities.kAxisColor }));
            tLabelX = tBaseline - kTickLength - kAxisGap - iLabelSpec.height / 3;
            tLabelY = tCoord + tTickOffset - ((iIndex === 0 && !tCentering) ? iLabelSpec.height / 2 : 0);
            if( tRotation === 0) {
              tAnchor = 'end';
              if( iLabelSpec.width > tLabelX && tLabelX > 10) {
                DG.RenderingUtilities.elideToFit( iLabelSpec.element, tLabelX);
              }
            }
            break;

          case DG.GraphTypes.EOrientation.kHorizontal:
            this_._elementsToClear.push(
              this_.get('paper').line( tCoord - tTickOffset, tBaseline, tCoord - tTickOffset, tBaseline + kTickLength)
                .attr( { stroke: DG.PlotUtilities.kAxisColor }));
            tLabelX = tCoord - tTickOffset + 1;
            tLabelY = tBaseline + kTickLength + kAxisGap + iLabelSpec.height / 3;
            if( tRotation === -90) {
              tAnchor = 'end';
              if( iIndex === 0 && !tCentering)
                tLabelX += iLabelSpec.height / 3;
              if( iLabelSpec.width > tFrame.height - tLabelY && tFrame.height - tLabelY > 10)
                DG.RenderingUtilities.elideToFit( iLabelSpec.element, tFrame.height - tLabelY);
            }
            break;
        }
        iLabelSpec.element.attr( { x: tLabelX, y: tLabelY, 'text-anchor': tAnchor });
        DG.RenderingUtilities.rotateText( iLabelSpec.element, tRotation, tLabelX, tLabelY);
      } // drawOneCell

      //==========Main body of doDraw==================
      this._elementsToClear.push( this.renderAxisLine());

      tLabels.forEach( measureOneBin);
      while( tLabelSpecs.length > tNumBins) {
        var tSpec = tLabelSpecs.pop();
        tSpec.element.remove();
      }
      if( tCollision) // labels must be perpendicular to axis
        tRotation = tIsHorizontal ? -90 : 0;
      tLabelSpecs.forEach( drawOneCell);

      this.set('labelSpecs', tLabelSpecs);

      this.renderLabel();
      // By changing maxLabelExtent we can trigger notification that causes the graph to re-layout
      // axes and plot if needed.
      var tNewExtent;
      switch (tOrientation) {
        case DG.GraphTypes.EOrientation.kHorizontal:
          tNewExtent = (tRotation === 0) ? tMaxHeight : tMaxWidth;
          break;
        case DG.GraphTypes.EOrientation.kVertical:
          tNewExtent = (tRotation === 0) ? tMaxWidth : tMaxHeight;
          break;
      }
      this.setIfChanged('maxLabelExtent', tNewExtent);
    }

  };
}())
);

