 // ==========================================================================
 //                   DG.ConnectingLineAdornment
 //
 //  Connecting lines between points, intended for use between points on
 //  a scatterplot.  Can easily be extended or repurposed for other
 //  plot types.
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

/**
 * @class  Abstract base class for plot adornments that draw averages (mean, median) as symbols in the plot.
 * @extends DG.PlotAdornment
 */
DG.ConnectingLineAdornment = DG.PlotAdornment.extend(
/** @scope DG.ConnectingLineAdornment.prototype */
{
  _dataTip: null,     // {DG.LineDataTip}

  init: function() {
    sc_super();
    this.myElements = [];
    var tPlotView = this.get('parentView');
    DG.assert( tPlotView );
    this._dataTip = DG.LineDataTip.create( { paperSource: this.get('paperSource'),
                                            plotView: tPlotView, layerName: DG.LayerNames.kDataTip });
  },

  /** do we want the line(s) to be visible and up to date? Yes if our model 'isVisible' */
  wantVisible: function() {
    return this.getPath('model.isVisible');
  },

  /**
   * Tell our model that it is out of date.
   */
  invalidateModel: function() {
    var tModel = this.get('model');
    if( tModel ) { tModel.setComputingNeeded(); }
  },


  /**
   * Recompute our model if needed, then move symbols to location specified by model.
   * @param iAnimate {Boolean} [optional] if true then animate to new symbol location.
   */
  updateToModel: function( iAnimate ) {
    var tModel = this.get('model');
    if( SC.none( tModel))
      return;

    // only recompute and update line if visible, this.updateVisibility() handles everything else
    if( tModel.get('isVisible')) {
      tModel.recomputeValueIfNeeded();
      this.updateLine( iAnimate );
    }
    else
      this.hideLines();
  },

  /**
    My model's visibility has changed.
  */
  updateVisibility: function() {
    this.updateToModel( true /*animate*/);
  },

  hideLines: function() {
    var tNumElements = this.myElements.length,
        tLayer = this.get('layer');
    for( var i = 0; i < tNumElements; i++) {
      this.myElements[ i].animate( {'stroke-opacity': 0 }, DG.PlotUtilities.kDefaultAnimationTime, '<>',
                                  function() {
                                    tLayer.prepareToMoveOrRemove( this);
                                    this.remove();
                                  });
    }
    this.myElements.length = 0;
  },

  /**
   * Create or update our lines, one for each parent present.
   * @param iAnimate {Boolean} [optional] if true then animate to new symbol location.
   */
  updateLine: function( iAnimate ) {
    var this_ = this,
        tXAxisView = this.getPath('parentView.xAxisView'),
        tYAxisView = this.getPath('parentView.yAxisView'),
        tArrayOfValuesArrays = this.getPath('model.values'),
        kCount = 10,  // This is fixed so we get same colors no matter how many lines there are
        tPaper = this.get('paper' ),
        tLayer = this.get('layer');

    if( !tPaper) {
      this.invokeOnceLater( function() {
        this.updateLine( iAnimate);
      }.bind( this));
      return;
    }
    DG.assert( tXAxisView && tYAxisView ); // we expect to be on a scatterplot (numeric axes)
    if( !tArrayOfValuesArrays)
      return; // Can happen in scatterplot that has multiple attributes

    tArrayOfValuesArrays.forEach( function( iValues, iLineNum) {
      var tNumValues = iValues ? iValues.length : 0,
          tPath = 'M0,0', // use empty path if no points to connect
          tLineColor = DG.ColorUtilities.calcAttributeColorFromIndex( iLineNum % kCount, kCount).colorString,
          i, x, y,
          tLine;
      // create a new path, connecting each sorted data point
      for( i=0; i<tNumValues; ++i ) {
        x = tXAxisView.dataToCoordinate( iValues[i].x );
        y = tYAxisView.dataToCoordinate( iValues[i].y );
        if( i===0 ) {
          tPath = 'M%@,%@'.fmt( x, y ); // move to first line
        } else {
          tPath += ' L%@,%@'.fmt( x, y ); // draw to subsequent lines
        }
      }
      DG.assert( tPath );

      tLine = this_.myElements[ iLineNum];
      if( !tLine ) {
        // create the line
        tLine = tPaper.path( '');
        this_.myElements.push( tLine );
        tLayer.push( tLine);
        }
      tLine.attr({ path: tPath, 'stroke-opacity': 0, stroke: tLineColor, cursor: 'pointer' })
        .mousedown( function( iEvent) {
          this_.get('model' ).selectParent( iLineNum, iEvent.shiftKey);
        })
        .hover(
          // over
          function( iEvent) {
            this_.showDataTip( iEvent, iLineNum);
          },
          // out
          function(){
            this_.hideDataTip();
          });
      if( iAnimate)
        tLine.animate( { 'stroke-opacity': 1 }, DG.PlotUtilities.kDefaultAnimationTime, '<>');
      else
        tLine.attr( { 'stroke-opacity': 1 });
    });

    while( this.myElements.length > tArrayOfValuesArrays.length) {
      var tLast = this.myElements.pop();
      tLayer.prepareToMoveOrRemove( tLast);
      tLast.remove();
    }
    this.updateSelection();
  },

  /**
   * If all cases for a given line are selected, we use a thick line, otherwise a thin line.
   */
  updateSelection: function() {
    if( !this.get('paper'))
      return;
    // TODO: Encapsulate access to selection in plotModel.
    var tArrayOfValuesArrays = this.getPath('model.values' ),
        tSelection = this.getPath('model.plotModel.selection');
    tArrayOfValuesArrays.forEach( function( iValues, iLineNum) {
      var
          kUnselectedWidth = 3,
          kSelectedWidth = 6,
          tNumValues = iValues ? iValues.length : 0,
          tAllSelected = true,
          tLine = this.myElements[ iLineNum],
          i;
      if( tLine) {
        for( i = 0; i < tNumValues; ++i) {
          tAllSelected = tAllSelected && tSelection.indexOf( iValues[i].theCase) >= 0;
          if( !tAllSelected)
            break;
        }
        tLine.attr({ 'stroke-width': (tAllSelected ? kSelectedWidth : kUnselectedWidth) });
      }
    }.bind( this));
  },

  showDataTip: function( iEvent, iLineNum) {
    if( this._dataTip) {
      var tParents = this.getPath('model.parents' ),
          tParent = SC.isArray( tParents) && (iLineNum < tParents.length) ? tParents[ iLineNum] : null,
          tParentName = tParent.getPath('collection.name' ),
          tChildren = tParent.get('children' ).flatten(),
          tNumChildren = SC.isArray(tChildren) ? tChildren.get('length') : 0,
          tChildrenName = (tNumChildren > 0) ? tChildren[ 0].getPath('collection.name') : '';
      this._dataTip.show(
        {
          lineIndex: iLineNum + 1,
          parentName: tParentName,
          numChildren: tNumChildren,
          childrenName: tChildrenName
        },
        { x: iEvent.offsetX, y: iEvent.offsetY });
    }
  },

  hideDataTip: function() {
    if( this._dataTip) {
      this._dataTip.hide();
    }
  }

});


