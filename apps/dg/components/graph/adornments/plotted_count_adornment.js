// ==========================================================================
//                   DG.PlottedCountAdornment
//
//  Counts/Percents displayed as text in each cell of a plot.
//
//  Author:   Craig D. Miller
//
//  Copyright ©2012-13 Scientific Reasoning Research Institute,
//                  University of Massachusetts Amherst
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

sc_require('components/graph/adornments/plot_adornment');
sc_require('components/graph/adornments/value_axis_view_mixin');

/**
 * @class  Abstract base class for plot adornments that draw averages (mean, median) as symbols in the plot.
 *          Mixes in the DG.ValueAxisViewMixin for handling axis notifications that trigger updates.
 * @extends DG.PlotAdornment
 */
DG.PlottedCountAdornment = DG.PlotAdornment.extend( DG.ValueAxisViewMixin,
/** @scope DG.PlottedCountAdornment.prototype */
{
  marginX: 2,
  marginY: 2,
  textColor: '#315B7D',
  numCellsOnX: 1,
  numCellsOnY: 1,
  numCellsOnSecondary: 1,
  numCellsOnPrimary: 1,
  xIsPrimaryAxis: true,

  /**
    Concatenated array of ['PropertyName','ObserverMethod'] pairs used for indicating
    which observers to add/remove from the model.
    
    @property   {Array of [{String},{String}]}  Elements are ['PropertyName','ObserverMethod']
   */
  modelPropertiesToObserve: [ ['values', 'updateToModel'],
                              ['isShowingCount', 'updateSymbols'],
                              ['isShowingPercent', 'updateSymbols'],
                              ['percentKind', 'updateToModel']],

  /** do we want the average to be visible and up to date? Yes if our model 'isVisible' */
  wantVisible: function() {
    return this.getPath('model.isVisible');
  },

  /**
   * Recompute our model if needed, then move symbols to location specified by model.
   * @param iAnimate {Boolean} [optional] if true then animate to new symbol location.
   */
  updateToModel: function( iAnimate ) {
    if( typeof iAnimate === 'object')
        iAnimate = false; // because we get here through notification, which passes an object
    var tCountModel = this.get('model');

    // only recompute and update symbols if visible, this.updateVisibility() handles everything else
    if( tCountModel && tCountModel.get('isVisible')) {
      tCountModel.recomputeValueIfNeeded();
      this.updateSymbols( iAnimate );
    }
  },

  /**
   * Create or update our myElements array of average symbols.
   * @param iAnimate {Boolean} [optional] if true then animate to new symbol location.
   */
  updateSymbols: function( iAnimate ) {
    var this_ = this;

    function formatValueString( iValue) {
      var tForSelectionOnly = this_.getPath('model.enableMeasuresForSelection'),
          tFormatString,
          tValueString = '',
          tCountValue = tForSelectionOnly ? iValue.selectedCount: iValue.count,
          tPercValue = DG.MathUtilities.roundToSignificantDigits(iValue.percent, 2).roundedValue; // 2 significant digits
      if( tShowCount && !tShowPercent) {
        tFormatString = tForSelectionOnly ? 'DG.PlottedCount.withSelection' : 'DG.PlottedCount.withoutSelection';
        tValueString = tFormatString.loc (tCountValue.toString());
      }
      else if( tShowPercent && !tShowCount) {
        tFormatString = tForSelectionOnly ? 'DG.PlottedPercent.withSelection' : 'DG.PlottedPercent.withoutSelection';
        tValueString = tFormatString.loc( tPercValue);
      }
      else if( tShowCount && tShowPercent) {
        tFormatString = tForSelectionOnly ? 'DG.PlottedCountPercent.withSelection' : 'DG.PlottedCountPercent.withoutSelection';
        tValueString = tForSelectionOnly ?
            tFormatString.loc( tCountValue, iValue.count, tPercValue) :
            tFormatString.loc( tCountValue, tPercValue);
      }
      return tValueString;
    }

    function findLongestValueString() {
      var tMaxString = '';
      tValuesArray.forEach( function( iValue) {
        var tTestString = formatValueString( iValue);
        if( tTestString.length > tMaxString.length)
          tMaxString = tTestString;
      });
      return tMaxString;
    }

    var tModel = this.get('model'),
        tIsVisible = tModel.get('isVisible'),
        tShowCount = tModel.get('isShowingCount'),
        tShowPercent = tModel.get('isShowingPercent');
    if( !tIsVisible || (!tShowCount && !tShowPercent))
      return; // We have nothing to to update

    var tValuesArray = tModel.get('values'),
        tNumValues = tValuesArray.length,
        tNumElements = this.myElements.length;

    this.updateNumCells();
    if( tNumValues !==( this.numCellsOnX * this.numCellsOnY ) || tNumValues === 0) {
      // TODO: find the places where this happens and fix (Chainsaw: thickness vs. ?)
      // zero length array indicates that the model was not able to compute values and aborted; we should also,
      // until model is complete again.
      if( tNumValues > 0 )
        DG.logWarn("DG.PlottedCountAdornment.updateSymbols has mismatch of %@ values and %@ cells", tNumValues,
            ( this.numCellsOnX * this.numCellsOnY ));
      this.removeExtraSymbols( 0 );
      return;
    }
    var tPaper = this.get('paper'),
        tLayer = this.get('layer' ),
        tCellHeight = this.getPath('yAxisView.fullCellWidth'),
        tCellWidth = this.getPath('xAxisView.fullCellWidth'),
        tFontSize = 12,
        tLongest = findLongestValueString(),
        tTempElement = tPaper.text(-100, 0, tLongest)
            .attr( {'font-size': tFontSize })
            .addClass('dg-graph-adornment-count'),
        tExtent = DG.RenderingUtilities.getExtentForTextElement( tTempElement, 11),
        tYOffset = tExtent.height,

        tAttrs, tTextElem, tIsNewElement, i;
    while( tExtent.width > tCellWidth) {
      tFontSize--;
      tTempElement.attr( {'font-size': tFontSize });
      tExtent = DG.RenderingUtilities.getExtentForTextElement( tTempElement, 11);
    }
    tTempElement.remove();

    // for each count value (one per cell of plot), add/update a text element
    for( i=0; i<tNumValues; ++i ) {
      var tValue = tValuesArray[i],
          tIndexPrimary = tValue.primaryCell,
          tIndexSecondary = tValue.secondaryCell,
          tIndexX=( this.xIsPrimaryAxis ? tIndexPrimary : tIndexSecondary ),
          tIndexY=( this.xIsPrimaryAxis ? tIndexSecondary : tIndexPrimary ),
          tCountFromTop = this.numCellsOnY - tIndexY - 1;
      tIsNewElement = ( i >= tNumElements );
      tAttrs = { // position in upper-right of cell, with margin
          x: ((tIndexX+1)*tCellWidth) - this.marginX,
          y: this.marginY + tYOffset/3 + (tCountFromTop*tCellHeight ),
          'font-size': tFontSize,
          text: formatValueString( tValue)
      };

      if (tIsNewElement) {   // create text element
        tTextElem = tPaper.text(tAttrs.x, tAttrs.y, tAttrs.text);
        tTextElem.attr({'text-anchor': 'end', fill: this.textColor});
        tTextElem.addClass('dg-graph-adornment-count');
        this.myElements.push(tTextElem);
        tLayer.push(tTextElem);
      } else {                // update text element
        tTextElem = this.myElements[i];
        tTextElem.attr(tAttrs);
      }
      if (iAnimate) {
        tTextElem.attr({opacity: 0})
            .animate({opacity: 1}, DG.PlotUtilities.kDefaultAnimationTime, '<>');
      }
    }

    // remove extra symbols (if number of cells has shrunk)
    if( tNumValues < this.myElements.length ) {
      this.removeExtraSymbols( tNumValues );
    }
    DG.assert( this.myElements.length === tValuesArray.length );
  },

  /**
   * Remove extra symbols from the plot and the end of our 'myElements' array
   * @param iDesiredNumSymbols
   */
  removeExtraSymbols: function( iDesiredNumSymbols ) {
    var tLayer = this.get('layer' ),
        i, j, tElement;
    for( i=iDesiredNumSymbols, j=this.myElements.length; i<j; ++i ) {
      tElement = this.myElements[i];
      tLayer.prepareToMoveOrRemove( tElement);
      tElement.remove(); // remove from paper
      tElement = null;   // remove from array
    }
    this.myElements.length = iDesiredNumSymbols;
  },

  /**
   * Get the title shown when hovering over the count text
   * @param iCount {Number}
   * @param iPercent {Number}
   * @return {String}
   */
  getTitle: function( iCount, iPercent ) {
    // TODO: use getCaseCountString: function( iCollection, iCount) ?
    var tCasesString = ( iCount === 1 ? 'DG.DataContext.singleCaseName'.loc() : 'DG.DataContext.pluralCaseName'.loc() );
    return 'DG.PlottedCountAdornment.title'.loc( iCount, tCasesString, iPercent.toFixed(0));
  },

  /**
   * Update the number of cells on X and Y, for *all* plot types,
   * including those that use primary/secondary axis designation, instead
   * of X and Y.
   */
  updateNumCells: function() {
    var tPlot = this.getPath('model.plotModel'),
        tXAxis = tPlot.get('xAxis'),
        tYAxis = tPlot.get('yAxis'),
        tSecondaryAxis = tPlot.get('secondaryAxisModel'),
        tPrimaryAxis = tPlot.get('primaryAxisModel');

    this.xIsPrimaryAxis = tSecondaryAxis === tYAxis;
    this.numCellsOnX = tXAxis.get('numberOfCells') || 1;
    this.numCellsOnY = tYAxis.get('numberOfCells') || 1;
    this.numCellsOnSecondary = tSecondaryAxis ? tSecondaryAxis.get('numberOfCells') : 1;
    this.numCellsOnPrimary = tPrimaryAxis ? tPrimaryAxis.get('numberOfCells') : 1;
  }

});
