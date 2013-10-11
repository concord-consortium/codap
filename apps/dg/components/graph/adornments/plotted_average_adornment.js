// ==========================================================================
//                   DG.PlottedAverageAdornment
//
//  Averages displayed as symbols in a dot plot.
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
sc_require('components/graph/adornments/line_label_mixin');

/**
 * @class  Abstract base class for plot adornments that draw averages (mean, median) as symbols in the plot.
 * @extends DG.PlotAdornment
 */
DG.PlottedAverageAdornment = DG.PlotAdornment.extend( DG.LineLabelMixin,
/** @scope DG.PlottedMeanAdornment.prototype */
{
  cellGap:  2,          /** gap in pixels between one average line and the next */
  hoverWidth: 5,        /** width of invisible 'cover' line that has popup text */
  hoverDelay: 10,       /** very short (MS) delay before highlighting appears */
  symSize:  3,          /** reference size, about 1/2 of width of symbols */
  symStrokeWidth: 1,
  bgStroke: 'black',
  bgFill: 'gray',
  bgStrokeWidth:  0.5,
  titlePrecision: 2,    /** {Number} extra floating point precision of average value for this.titleString */
  titleFraction: 1/5,   /** {Number} fraction-from-top for placement of average=123 text */

  /**
    Concatenated array of ['PropertyName','ObserverMethod'] pairs used for indicating
    which observers to add/remove from the model.
    
    @property   {Array of [{String},{String}]}  Elements are ['PropertyName','ObserverMethod']
   */
  // Disabled, needs redesign to avoid redundancy with DG.DotPlotView calls to updateToModel()
  //modelPropertiesToObserve: [ ['values', 'updateToModel'] ],

  /** do we want the average to be visible and up to date? Yes if our model 'isVisible' */
  wantVisible: function() {
    return this.getPath('model.isVisible');
  },

  /**
   * Recompute our model if needed, then move symbols to location specified by model.
   * @param iAnimate {Boolean} [optional] if true then animate to new symbol location.
   */
  updateToModel: function( iAnimate ) {
    var tAverageModel = this.get('model');

    // only recompute and update symbols if visible, this.updateVisibility() handles everything else
    if( tAverageModel && tAverageModel.get('isVisible')) {
      if( ! this.textElement ) { // initialize the text element "average=", before updateSymbols()
        this.createTextElement();
        this.textElement.attr('opacity', 1);  // We don't show this element until user hovers,
                                              // at which point we need opacity to be 1
      }
      tAverageModel.recomputeValueIfNeeded();
      this.updateSymbols( iAnimate );
    }
  },

  /**
   * Show or hide the text element "average = 123.456"
   * Using DG.LineLabelMixin to position.
   * @param iShow {Boolean} Show or hide this text element?
   * @param iDisplayValue {Number} Value along numeric axis, for text display
   * @param iAxisValue {Number} Value along numeric axis, for positioning
   * @param iFractionFromTop {Number} used to position text on cross-axis
   * @param iElementID {Number} Rafael element id of the text, so we can find and update it on the fly.
   */
  updateTextElement: function( iShow, iDisplayValue, iAxisValue, iFractionFromTop, iElementID ) {
    DG.assert( this.textElement );
    if( iShow && DG.isFinite( iDisplayValue ) ) {
      // set up parameters used by DG.LineLabelMixin.updateTextToModel()
      this.value = iAxisValue; // for St.Dev., iAxisValue not equal to iDisplayValue
      this.valueString = this.titleString( iDisplayValue );
      this.valueAxisView = this.getPath('parentView.primaryAxisView');
      this.updateTextToModel( iFractionFromTop );
      this.textElement.show();
      this.textShowingForID = iElementID;
    } else {
      // hide until next time
      this.value = 0;
      this.valueString = '';
      this.valueAxisView = null;
      this.textElement.hide();
      this.textShowingForID = undefined;
    }
  },

  /**
   * Get the desired axis position of the pop-up text, in the attribute's coordinates.
   * @param iCenterValue {Number}
   * @param iSpreadValue {Number}
   */
  getTextPositionOnAxis: function( iCenterValue, iSpreadValue ) {
    return iCenterValue; // default to text going to the left of the center line
  },

  /**
   * Create or update our myElements array of average symbols.
   * @param iAnimate {Boolean} [optional] if true then animate to new symbol location.
   */
  updateSymbols: function( iAnimate ) {
    var tAdornment = this,
        tPrimaryAxisView = this.getPath('parentView.primaryAxisView'),
        tIsHorizontal = tPrimaryAxisView && (tPrimaryAxisView.get('orientation') === 'horizontal'),
        tValuesArray = this.getPath('model.values'),
        tNumValues = tValuesArray && tValuesArray.length,
        tNumElements = this.myElements.length;
    DG.assert( tNumValues > 0 ); // or tNumValues === number of cells
    var tPaper = this.get('paper'),
        tCellHeight = (tNumValues ? ((tIsHorizontal ? tPaper.height : tPaper.width)/tNumValues) : 0),
        p = { x:0, y:0, symSize:this.symSize, cellHeight:tCellHeight-this.cellGap },
        tOffScreen = -3 * this.symSize; // negative view coordinate to move off screen to hide
    var tWorldCoord, tViewCoord, i, tSpread, tStat;
    var tSymbol, tCover, tBackground, kElemsPerCell=3; // rafael elements

    function overScope() {
      var tAttributes = { stroke: tAdornment.hoverColor };
      this.stop();
      this.animate( tAttributes, tAdornment.hoverDelay );
      tAdornment.updateTextElement( true, this.textStatValue, this.textAxisPosition, this.textCrossPosition, this.id );
    }

    function outScope() {
      var tAttributes = { stroke: DG.RenderingUtilities.kTransparent };
      this.stop();
      this.animate( tAttributes, DG.PlotUtilities.kHighlightHideTime );
      tAdornment.updateTextElement( false );
    }

    // for each average value (one per cell on secondary axis), add *two* graphical elements
    // NOTE: alternatively, we might be able to create one group element that has both the symbol and cover as properties.
    for( i=0; i<tNumValues; ++i ) {

      // transform the computed average to view coordinates of symbol reference point
      tStat = tValuesArray[i][this.statisticKey]; // user-visible statistic value: number or undefined
      tWorldCoord = tValuesArray[i][this.centerKey]; // center value to plot: number or undefined
      tSpread = tValuesArray[i][this.spreadKey]; // spread value to plot: number or undefined;
      tViewCoord = ( isFinite( tWorldCoord ) ? tPrimaryAxisView.dataToCoordinate( tWorldCoord) : tOffScreen );
      p.width = ( isFinite( tSpread )? Math.abs(tPrimaryAxisView.dataToCoordinate( tWorldCoord+tSpread) - tViewCoord) : 0 );
      p.x = ( tIsHorizontal ? tViewCoord : i*tCellHeight );
      p.y = ( tIsHorizontal ? (i+1)*tCellHeight : tViewCoord );

      // create symbol and invisible cover line elements as needed (set constant attributes here)
      if( i*kElemsPerCell >= tNumElements ) {
        tBackground = tPaper.path('M0,0')
            .attr({ stroke:this.bgStroke, 'stroke-width':this.bgStrokeWidth, fill:this.bgFill, 'fill-opacity':0.5 });
        tSymbol = tPaper.path('M0,0')
            .attr({ stroke:this.symStroke, 'stroke-width':this.symStrokeWidth, 'stroke-opacity': 0 });
        tCover = tPaper.path('M0,0')
            .attr({ 'stroke-width':this.hoverWidth, stroke:DG.RenderingUtilities.kTransparent })
            .hover( overScope, outScope);
        tBackground.animatable = tSymbol.animatable = true;
        tBackground.animate( { 'stroke-opacity': 1 }, DG.PlotUtilities.kDefaultAnimationTime, '<>');
        tSymbol.animate( { 'stroke-opacity': 1 }, DG.PlotUtilities.kDefaultAnimationTime, '<>');
        this.myElements.push( tBackground );
        this.myElements.push( tSymbol );
        this.myElements.push( tCover );
      }

      // update elements (to current size/position)
      tBackground = this.myElements[i*kElemsPerCell];
      tSymbol = this.myElements[i*kElemsPerCell+1];
      tCover = this.myElements[i*kElemsPerCell+2];
      if( iAnimate) {
        tBackground.animate({ path: this.backgroundPath( p,tIsHorizontal) }, DG.PlotUtilities.kDefaultAnimationTime, '<>');
        tSymbol.animate({ path: this.symbolPath( p,tIsHorizontal) }, DG.PlotUtilities.kDefaultAnimationTime, '<>');
      } else {
        tBackground.attr({ path: this.backgroundPath( p,tIsHorizontal) });
        tSymbol.attr({ path: this.symbolPath( p,tIsHorizontal) });
      }
      tCover.attr( 'path', this.coverPath( p, tIsHorizontal));

      // save the following values for updateTextElement() which is called during hover over the cover element
      tCover.textStatValue = tStat;
      tCover.textAxisPosition = this.getTextPositionOnAxis( tWorldCoord, tSpread );
      tCover.textCrossPosition = ((1/tNumValues) * (i + this.titleFraction)); // text position in range [0-1] on cross axis

      tSymbol.toFront(); // keep averages on top of cases
      tCover.toFront();  // keep cover on top of average symbol
      if( this.textElement ) { this.textElement.toFront(); } // keep text in front of case circles

      // if mouse is now over an element with text showing, update the text now.
      if( this.textShowingForID === tCover.id ) {
        overScope.call( tCover ); // update text label
      }
    }

    // remove extra symbols (if number of cells has shrunk)
    if( this.myElements.length > (kElemsPerCell*tNumValues)) {
      this.removeExtraSymbols( kElemsPerCell*tNumValues );
    }
    DG.assert( this.myElements.length === kElemsPerCell * tValuesArray.length );
  },

  /**
   * Remove extra symbols from the plot and the end of our 'myElements' array
   * @param iDesiredNumSymbols
   */
  removeExtraSymbols: function( iDesiredNumSymbols ) {
    var i, j, tElement;
    
    // Raphael sets 'this' to the element for completion callbacks.
    function removeOnCompletion() { this.remove(); }
    
    for( i=iDesiredNumSymbols, j=this.myElements.length; i<j; ++i ) {
      tElement = this.myElements[i];
      if( tElement.animatable) {
        tElement.animate( { 'stroke-opacity': 0 }, DG.PlotUtilities.kDefaultAnimationTime, '<>',
                          removeOnCompletion);
      }
      else
        tElement.remove(); // remove from paper
    }
    this.myElements.length = iDesiredNumSymbols;
  },

  /**
   * Create the path string for the average symbol; can be overridden
   * @param p {x,y,cellHeight} of reference point
   * @param iIsHorizontal {Boolean}
   * @return {String} M:move-to absolute: l:line-to relative: z:close path
   */
  symbolPath: function( p, iIsHorizontal ) {
    if( iIsHorizontal ) {
      return 'M%@,%@ v%@'.fmt( p.x, p.y, -(p.cellHeight) );
    } else {
      return 'M%@,%@ h%@'.fmt( p.x, p.y, p.cellHeight );
    }
  },

  /**
   * Create the path string for the invisible popup cover region.
   * @param p {x,y,cellHeight} of reference point
   * @return {String} M:move-to absolute: v:vertical-line-to relative: h:horizontal-line-to
   */
  coverPath: function( p, iIsHorizontal ) {
    if( iIsHorizontal ) {
      return 'M%@,%@ v%@'.fmt( p.x, p.y, -(p.cellHeight) );
    } else {
      return 'M%@,%@ h%@'.fmt( p.x, p.y, p.cellHeight );
    }
  },

  /**
   * Create the path string for the background, for example gray reference lines on the St.Dev..
   * @param p {x,y,cellHeight} of reference point
   * @return {String} M:move-to absolute: v:vertical-line-to relative: h:horizontal-line-to
   */
  backgroundPath: function( p, iIsHorizontal ) {
    return 'M0,0'; // default is to return an empty path
  },

  /**
   * @return {String} title string to show when hovering over average symbol/line
   */
  titleString: function( axisValue ) {
    // convert resource to string with rounding, and insert axis value number
    DG.assert( isFinite( axisValue ));
    var tPrecision = this.titlePrecision + (this.get('model.precision') || 0);
    return this.titleResource.loc( axisValue.toFixed( tPrecision ));
  }

});

/**
 * @class  Plots a computed value.
 * @extends DG.PlottedAverageAdornment
 */
DG.PlottedMeanAdornment = DG.PlottedAverageAdornment.extend(
/** @scope DG.PlottedMeanAdornment.prototype */
{
  statisticKey: 'mean', /** {String} key to relevant statistic in this.model.values[i][statistic] */
  centerKey: 'mean',
  titleResource: 'DG.PlottedAverageAdornment.meanValueTitle', /** {String} resource string for this.titleString() */
  //titleFraction: 0.3,   /** {Number} fraction-from-top for placement of average=123 text */
  hoverColor: "rgba(0, 0, 255, 0.3)", /** color of line when mouse over cover line */
  symStroke: '#00F',
  symStrokeWidth: 1.5

  /**
   * Create the path string for a Tinkerplots-like equilateral triangle at the given point on the axis line.
   * @param p {x,y,cellHeight} of reference point
   * @param iIsHorizontal {Boolean}
   * @return {String} M:move-to absolute: l:line-to relative: z:close path
   */
  /*symbolPath: function( p, iIsHorizontal ) {
    var triHeight = p.symSize*Math.sqrt(3),
        pathString = 'M%@,%@ l%@,%@ l%@,%@ z %@%@';
    if( iIsHorizontal ) {
      return pathString.fmt(
          p.x, (p.y - triHeight), // top of upward-pointing triangle
          (-p.symSize), triHeight, // lower left of triangle base
          (p.symSize*2), 0, // lower right of triangle base
          'V', // vertical line
          (p.y-p.cellHeight) // close path then move vertically to top of cell
        );
    } else {
      return pathString.fmt(
          (p.x+triHeight), p.y, // top of right-pointing triangle
          -triHeight, (-p.symSize), // top left of triangle base
          0, (p.symSize*2), // top right of triangle base
          'H', // horizontal line
          (p.x+p.cellHeight) // close path then move horizontally to top of cell
        );
    }
  }*/

});


/**
 * @class  Plots a computed value.
 * @extends DG.PlottedAverageAdornment
 */
DG.PlottedMedianAdornment = DG.PlottedAverageAdornment.extend(
/** @scope DG.PlottedMedianAdornment.prototype */
{
  statisticKey: 'median', /** {String} key to relevant statistic in this.model.values[i][statisticKey] */
  centerKey: 'median',
  titleResource: 'DG.PlottedAverageAdornment.medianValueTitle', /** {String} resource string for this.titleString() */
  //titleFraction: 0.1,   /** {Number} fraction-from-top for placement of average=123 text */
  hoverColor: "rgba(255, 0, 0, 0.3)", /** color of line when mouse over cover line */
  symStroke: '#F00',
  symStrokeWidth: 1.5

  /**
   * Create the path string for a TinkerPlots-like upside-down 'T' at the given point on the axis line.
   * @param p {x,y,cellHeight} of reference point
   * @param iIsHorizontal {Boolean}
   * @return {String} M:move-to absolute: l:line-to relative: z:close path
   */
  /*symbolPath: function( p, iIsHorizontal ) {
    if( iIsHorizontal ) {
      return 'M%@,%@ v%@ v%@ h%@ h%@'.fmt(
       p.x, p.y,
       -p.cellHeight, p.cellHeight,
       p.symSize, -2* p.symSize );
    } else {
      return 'M%@,%@ h%@ h%@ v%@ v%@'.fmt(
        p.x, p.y,
        p.cellHeight, -p.cellHeight,
        p.symSize, -2* p.symSize );
    }
  }
  */
});


/**
 * @class  Plots a computed value.
 * @extends DG.PlottedAverageAdornment
 */
DG.PlottedStDevAdornment = DG.PlottedAverageAdornment.extend(
/** @scope DG.PlottedStDevAdornment.prototype */
{
  bgFill: '#9980FF',
  bgStroke: '#9980FF',
  bgStrokeWidth:  0.5,
  symStrokeWidth: 1,
  symStroke: '#30F',
  statisticKey: 'stdev', /** {String} key to relevant statistic in this.model.values[i][statisticKey] */
  centerKey:    'stDevMinus1',  /** {String} key to relevant center point in this.model.values[i][centerKey] */
  spreadKey:    'stdev', /** {String} key to relevant spread value in this.model.values[i][width] */
  titleResource: 'DG.PlottedAverageAdornment.stDevValueTitle', /** {String} resource string for this.titleString() */
  //titleFraction: 0.4,   /** {Number} fraction-from-top for placement of average=123 text */
  symHeight: 0.6,  /** {Number} fractional distance from axis for symbol line  */
  hoverColor: "rgba(48, 0, 255, 0.3)", /** color of line when mouse over cover line */

  /**
   * Create the path string for the rectangular area covering the Standard Deviation.
   * @param p {x,y,cellHeight,width} of reference point in view coordinates
   * @param iIsHorizontal {Boolean}
   * @param iWidth {Number} width in pixels of spread
   * @return {String} M:move-to absolute: l:line-to relative: z:close path
   */
  symbolPath: function( p, iIsHorizontal ) {
    if( iIsHorizontal ) {
      // 2 lines
      return 'M%@,%@ v%@ M%@,%@ v%@'.fmt(
          p.x, p.y, -p.cellHeight, // vertical line up at -1 st.dev.
          p.x + 2*p.width, p.y, -p.cellHeight); // vertical line up at +1 st.dev.
    } else {
      // 2 lines
      return 'M%@,%@ h%@ M%@,%@ h%@'.fmt(
          p.x, p.y, p.cellHeight, // vertical line up at -1 st.dev.
          p.x, p.y - 2* p.width, p.cellHeight); // vertical line up at +1 st.dev.
    }
  },

  /**
   * Create the path string for the background, for example gray reference lines on the St.Dev..
   * @param p {x,y,cellHeight} of reference point
   * @return {String} M:move-to absolute: v:vertical-line-to relative: h:horizontal-line-to
   */
  backgroundPath: function( p, iIsHorizontal ) {
    var x = p.x,
        y = p.y,
        w = p.width,
        h = p.cellHeight;
    if( iIsHorizontal ) {
      return 'M%@,%@ v%@ h%@ v%@ z M%@,%@ v%@'.fmt(
          x, y, -h, 2*w, h, // box from -1 to +1 s.d.
          x + w, y, -h ); // vertical line up at mean
    } else {
      return 'M%@,%@ h%@ v%@ h%@ z M%@,%@ h%@'.fmt(
          x, y, h, -2*w, -h, // box from mean to +1 s.d.
          x, y - w, h ); // horizontal line right at -1 s.d.
    }
  },

  /**
   * Create the path string for the invisible popup cover region.
   * @param p {x,y,cellHeight,width} of reference point
   * @return {String} M:move-to absolute: v:vertical-line-to relative: h:horizontal-line-to
   */
  coverPath: function( p, iIsHorizontal ) {
    return this.symbolPath( p, iIsHorizontal);
  },

  /**
   * Get the desired axis position of the pop-up text, in the attribute's coordinates.
   * @param iCenterValue
   * @param iSpreadValue
   */
  getTextPositionOnAxis: function( iCenterValue, iSpreadValue ) {
    return iCenterValue + 2 * iSpreadValue; // text going to the right of the shading
  }

});



/**
 * @class  Plots a computed Inter-Quartile Range (IQR), between the first and third quartiles (Q1 and Q3).
 * @extends DG.PlottedAverageAdornment
 */
DG.PlottedIQRAdornment = DG.PlottedAverageAdornment.extend(
/** @scope DG.PlottedIQRAdornment.prototype */
{
  statisticKey: 'IQR', /** {String} key to relevant statistic in this.model.values[i][statisticKey] */
  centerKey: 'Q1',  /** {String} key to relevant center point in this.model.values[i][centerKey] */
  spreadKey: 'IQR', /** {String} key to relevant spread value in this.model.values[i][width] */
  titleResource: 'DG.PlottedAverageAdornment.iqrValueTitle', /** {String} resource string for this.titleString() */
  //titleFraction: 0.2,   /** {Number} fraction-from-top for placement of average=123 text */
  hoverColor: "rgba(255, 48, 0, 0.3)", /** color of line when mouse over cover line */
  bgStroke: '#FFb280',
  bgStrokeWidth:  0.5,
  bgFill: '#FFb280',
  symStroke: '#F30',
  symStrokeWidth: 1,

  /**
   * Create the path string for the background, gray reference lines going from Q1 to Q3
   * @param p {x,y,width,cellHeight} of reference point, (.x,.y) is Q1, .width is IQR in pixels.
   * @return {String} M:move-to absolute: v:vertical-line-to relative: h:horizontal-line-to
   */
  symbolPath: function( p, iIsHorizontal ) {
    if( iIsHorizontal ) {
      return 'M%@,%@ v%@ M%@,%@ v%@'.fmt(
          p.x, p.y, -p.cellHeight,  // vertical line up on Q1
          p.x + p.width, p.y, -p.cellHeight); // vertical line up on Q3
    } else {
      return 'M%@,%@ h%@ M%@,%@ h%@'.fmt(
          p.x, p.y, p.cellHeight,  // upper horizontal line on Q1
          p.x, p.y - p.width, p.cellHeight); // lower horizontal line on Q3
    }
  },

  /**
   * Create the path string for the invisible popup cover region.
   * @param p {x,y,width,cellHeight} of reference point, (.x,.y) is Q1, .width is IQR in pixels.
   * @return {String} M:move-to absolute: v:vertical-line-to relative: h:horizontal-line-to
   */
  coverPath: function( p, iIsHorizontal ) {
    if( iIsHorizontal ) {
      return 'M%@,%@ v%@ M%@,%@ v%@'.fmt(
          p.x, p.y, -p.cellHeight,  // vertical line up on Q1
          p.x + p.width, p.y, -p.cellHeight); // vertical line up on Q3
    } else {
      return 'M%@,%@ h%@ M%@,%@ h%@'.fmt(
          p.x, p.y, p.cellHeight,  // upper horizontal line on Q1
          p.x, p.y - p.width, p.cellHeight); // lower horizontal line on Q3
    }
  },

  /**
   * Create the path string for the background, gray reference lines going from Q1 to Q3
   * @param p {x,y,width,cellHeight} of reference point, (.x,.y) is Q1, .width is IQR in pixels.
   * @return {String} M:move-to absolute: v:vertical-line-to relative: h:horizontal-line-to
   */
  backgroundPath: function( p, iIsHorizontal ) {
    if( iIsHorizontal ) {
      return 'M%@,%@ v%@ h%@ v%@ z'.fmt(
          p.x, p.y, -p.cellHeight, p.width, p.cellHeight); // box on Q1-Q3 lines in cell
    } else {
      return 'M%@,%@ h%@ v%@ h%@ z'.fmt(
          p.x, p.y, p.cellHeight, -p.width, -p.cellHeight); // box on Q1-Q3 lines in cell
    }
  },

  /**
   * Get the desired axis position of the pop-up text, in the attribute's coordinates.
   * @param iCenterValue
   * @param iSpreadValue
   */
  getTextPositionOnAxis: function( iCenterValue, iSpreadValue ) {
    return iCenterValue + iSpreadValue; // text going to the right of the shading
  }
});
