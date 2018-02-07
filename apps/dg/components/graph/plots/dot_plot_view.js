// ==========================================================================
//                          DG.DotPlotView
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

sc_require('components/graph/plots/plot_view');

/** @class  DG.DotPlotView - A plot of dots piled up along a numeric axis

  @extends DG.PlotView
*/
DG.DotPlotView = DG.PlotView.extend(
/** @scope DG.DotPlotView.prototype */ 
{
  displayProperties: ['primaryAxisView.model.lowerBound', 'primaryAxisView.model.upperBound',
                      'secondaryAxisView.model.numberOfCells', 'overlap'],

  autoDestroyProperties: ['multipleMovableValuesAdorn', 'plottedValueAdorn',
                          'plottedMeanAdorn', 'plottedMedianAdorn', 'plottedStDevAdorn', 'plottedBoxPlotAdorn'],

  /**
  @property{DG.CellLinearAxisView}
  */
  primaryAxisView: function() {
    switch( this.getPath('model.primaryAxisPlace')) {
      case DG.GraphTypes.EPlace.eX:
        return this.get('xAxisView');
      case DG.GraphTypes.EPlace.eY:
        return this.get('yAxisView');
      default:
        return null;
    }
  }.property()/*.cacheable()*/,
  primaryAxisViewDidChange: function() {
    this.notifyPropertyChange('primaryAxisView');
  }.observes('*model.primaryAxisPlace', 'xAxisView', 'yAxisView'),

  /**
  @property{DG.CellLinearAxisView}
  */
  secondaryAxisView: function() {
    switch( this.getPath('model.secondaryAxisPlace')) {
      case DG.GraphTypes.EPlace.eX:
        return this.get('xAxisView');
      case DG.GraphTypes.EPlace.eY:
        return this.get('yAxisView');
      default:
        return null;
    }
  }.property()/*.cacheable()*/,
  secondaryAxisViewDidChange: function() {
    this.notifyPropertyChange('secondaryAxisView');
  }.observes('*model.secondaryAxisPlace', 'xAxisView', 'yAxisView'),

  /**
   * The secondaryAxisView needs to be told that its tick marks and labels are not to be centered in each cell.
   * Though this is the default, if the prior plot was a dot chart, the axis will be stuck in centering mode.
   */
  setupAxes: function() {
    var tCellAxis = this.get('secondaryAxisView');
    if( tCellAxis) {
      tCellAxis.set('centering', false);
    }
  },

  /** @property {DG.MultipleMovableValuesAdornment} */
  multipleMovableValuesAdorn: null,

  /** @property {DG.PlottedMeanAdornment} */
  plottedMeanAdorn: null,

  /** @property {DG.PlottedMedianAdornment} */
  plottedMedianAdorn: null,

  /** @property {DG.plottedStDevAdorn} */
  plottedStDevAdorn: null,
  
  /** @property {DG.plottedBoxPlotAdorn} */
  plottedBoxPlotAdorn: null,

  /**
  The bins stretch from numeric axis' lower to upper bounds and have width 2 * point radius.
  Initially each bin is zero, but we increment its count each time a point is computed to
  display in that bin.
   It's a two-dimensional array where the first index corresponds to the cell number and the second
   index corresponds to the bin number
  @property {Array of Array of {Number}}
  */
  binArrays: null,

  /**
  When there is room for each stack, the overlap is 0. As soon as one of the stacks reaches
  the plot boundary, the overlap must increase. The amount that must be subtracted from
  each stack coordinate is the overlap times the index of the point in the stack.
  @property {Number}
  */
  overlap: 0,

  /**
    Before we recompute coordinates, we need to zero out the bin array.
  */
  prepareToResetCoordinates: function() {
    this.zeroBinArray();
  },

  /**
   * Update the plot when cases have been added or removed.
   */
  dataDidChange: function() {
    sc_super(); // base class handles almost everything
    if( SC.none( this.get('paper')))
      return;   // not ready to create elements yet
    this.updateAverages();
  },

  /**
   * Update the plot when case values have changed.
   */
  dataRangeDidChange: function( iSource, iQuestion, iKey, iChanges) {
    var this_ = this,
        tPlotElementLength = this._plottedElements.length,
        tCases = this.getPath('model.cases'),
        tRC = this.createRenderContext();

    // iChanges can be a single index or an array of indices
    // Unless we keep track of the index of each point in each stack, we have to recompute
    // all coordinates.
    this.prepareToResetCoordinates();
    tCases.forEach( function( iCase, iIndex) {
      if( iIndex >= tPlotElementLength)
        this_.callCreateElement( iCase, iIndex, this_._createAnimationOn);
      this_.setCircleCoordinate( tRC, iCase, iIndex);
    });

    this.updateAverages();
    this.rescaleOnParentCaseCompletion( tCases);
    sc_super();
  },

  numberOfCellsDidChange: function() {
    ['plottedMeanAdorn', 'plottedMedianAdorn', 'plottedStDevAdorn', 'plottedBoxPlotAdorn'].
        forEach( function( iKey) {
            if( this.getPath( iKey + '.model')) {
              this.getPath( iKey + '.model').setComputingNeeded();
            }
          }.bind( this));
  }.observes('*secondaryAxisView.model.numberOfCells'),

  /**
    Called when the order of the categories on an axis changes (e.g. cells are dragged)
  */
  categoriesDidChange: function() {
    this.updateAverages();
  },

  /**
   * Invalidate and update the averages adornments.
   * To be called when cases or plot configuration
   * changes, that the averages depend upon.
   * @param iAnimate {Boolean}[optional] animate change to averages.
   */
  updateAverages: function( iAnimate ) {
    function updateOneAdorn( ioAdorn ) {
      if( ioAdorn ) {
        var adornModel = ioAdorn.get('model');
        if( adornModel) {
          adornModel.setComputingNeeded();
          ioAdorn.updateToModel(  iAnimate );
        }
      }
    }

    if( !this.getPath('model.dataConfiguration'))
      return; // because we can get here during destroy

    updateOneAdorn( this.plottedMeanAdorn );
    updateOneAdorn( this.plottedMedianAdorn );
    updateOneAdorn( this.plottedStDevAdorn );
    updateOneAdorn( this.plottedBoxPlotAdorn );
    updateOneAdorn( this.multipleMovableValuesAdorn );

    if (this.plottedValueAdorn) {
      this.plottedValueAdorn.updateToModel();
    }
  },

  /**
   * Construct and return a new render context
   * used for setCircleCoordinate()
   * @return {*}
   */
  createRenderContext: function() {
    var tRC = sc_super(),
        tModel = this.get('model');

    // cache some more render parameters common to all cases, but unique to DotPlotView.
    tRC.categoryAxisView = this.get('secondaryAxisView');
    tRC.categoryAxisModel = tRC.categoryAxisView && tRC.categoryAxisView.get('model');
    tRC.categoryVarID = tModel && tModel.get('secondaryVarID');
    tRC.primaryVarID = tModel && tModel.get('primaryVarID');
    tRC.primaryAxisPlace = tModel && tModel.get('primaryAxisPlace');
    tRC.primaryAxisView = this.get('primaryAxisView');

    if( !tRC.primaryAxisView)
      return null;

    return tRC;
  },

  /**
   * Set the coordinates and other attributes of the case circle (a Rafael element in this._plottedElements).
   * @param {{}} iRC case-invariant Render Context
   * @param {DG.Case} iCase the case data
   * @param {number} iIndex index of case in collection
   * @param {Boolean} iAnimate (optional) want changes to be animated into place?
   * @param {function} iCallback
   * @returns {{cx:{Number},cy:{Number}}} final coordinates or null if not defined (hidden plot element)
   */
  setCircleCoordinate: function( iRC, iCase, iIndex, iAnimate, iCallback ) {
    //DG.assert( iRC && iRC.categoryAxisView );
    DG.assert( iCase, 'There must be a case' );
    DG.assert( DG.MathUtilities.isInIntegerRange( iIndex, 0, this._plottedElements.length ),
        'index %@ out of bounds for _plottedElements of length %@'.loc(iIndex, this._plottedElements.length));
    var tCircle = this._plottedElements[ iIndex],
        tWorld = iCase.getNumValue( iRC.primaryVarID ),
        tScreenCoord = iRC.primaryAxisView.dataToCoordinate( tWorld),
        tIsMissingCase =(!DG.isFinite( tScreenCoord) || iRC.primaryAxisPlace === DG.GraphTypes.EPlace.eUndefined);

    // show or hide if needed, then update if shown.
    if( this.showHidePlottedElement(tCircle, tIsMissingCase) && iRC.categoryAxisModel) {

      var tCellNumber = iRC.categoryAxisModel.cellNameToCellNumber( iCase.getStrValue( iRC.categoryVarID )),
          tCellCoord = SC.none(tCellNumber) ? 0 : iRC.categoryAxisView.cellToCoordinate( tCellNumber),
          tCellHalfWidth = iRC.categoryAxisView.get('fullCellWidth') / 2,
          tRadius = this._pointRadius,
          tBinArrays = this.get('binArrays'),
          tBinArray = tBinArrays && (tCellNumber < tBinArrays.length) && tBinArrays[tCellNumber],
          tCoordX, tCoordY;

      var tBin = Math.round( tScreenCoord / (2 * tRadius)),
          tBinsInCell = (tBinArray && tBinArray.length) || 0,
          tRow = (tBinArray && tBin >= 0 && tBin < tBinsInCell) ? tBinArray[tBin].counter++ : 0,
          tOverlap = this.get('overlap'),
          tStackCoord = tRadius + (2 * tRadius - tOverlap) * tRow + 1;

      // Express coordinates in terms of x and y
      switch( iRC.primaryAxisPlace) {
        case DG.GraphTypes.EPlace.eX:
          tCoordX = tScreenCoord;
          tCoordY = tCellCoord - tStackCoord + tCellHalfWidth;
          break;
        case DG.GraphTypes.EPlace.eY:
          tCoordX = tCellCoord + tStackCoord - tCellHalfWidth;
          tCoordY = tScreenCoord;
          break;
      }

      var tAttrs = {cx: tCoordX, cy: tCoordY, r: this.radiusForCircleElement(tCircle),
                    fill: iRC.calcCaseColorString( iCase ),
                    stroke: iRC.strokeColor, 'fill-opacity': iRC.transparency, 'stroke-opacity': iRC.strokeTransparency};
      this.updatePlottedElement( tCircle, tAttrs, iAnimate, iCallback);
      return { cx: tCoordX, cy: tCoordY, r: tRadius };
    }
    return null;
  },

  createElement: function( iDatum, iIndex, iAnimate) {
    var this_ = this,
        tNumericPlace = this.getPath('model.primaryAxisPlace');

    function changeCaseValues( iDelta) {
      var tPrimaryVarID = this_.getPath('model.primaryVarID'),
          tChange = {
            operation: 'updateCases',
            cases: [],
            attributeIDs: [ tPrimaryVarID ],
            values: [ [] ]
          },
          tDataContext = this_.get('dataContext');
      if( !tDataContext) return;
      // Note that we have to get the cases dynamically rather than have a variable
      // declared in the closure. The array pointed to by such a closure is not updated!
      this_.getPath('model.casesController.selection').forEach( function( iCase) {
        var tValue = iCase.getNumValue( tPrimaryVarID) + iDelta;
        if( this_.getPath('primaryAxisView.isDateTime')) {
          tValue = DG.createDate( tValue);
        }
        tChange.cases.push( iCase);
        tChange.values[0].push( tValue);
      });
      tDataContext.applyChange( tChange);
    }

    function returnCaseValuesToStart( iCaseIndex, iStartWorldCoord) {
      var tCase = this_.getPath('model.cases').unorderedAt(iCaseIndex),
          tPrimaryVarID = this_.getPath('model.primaryVarID'),
          tDelta = tCase.getNumValue( tPrimaryVarID) - iStartWorldCoord;
      this_.get('model').animateSelectionBackToStart([ tPrimaryVarID], [ tDelta]);
    }

    var tIsDragging = false,
      kOpaque = 1,
      tInitialTransform = null,
      tCircle = this.get('paper').circle( -100, -100, this._pointRadius)
        .attr( { cursor: "pointer" })
        .addClass( DG.PlotUtilities.kColoredDotClassName)
        .hover( function (event) {  // over
              // Note that Firefox can come through here repeatedly so we have to check for existence
              if( !tIsDragging && SC.none( tInitialTransform)) {
                tInitialTransform = '';
                this.animate( { opacity: kOpaque, transform: DG.PlotUtilities.kDataHoverTransform }, DG.PlotUtilities.kDataTipShowTime);
                this_.showDataTip( this, iIndex);
              }
            },
            function(event) { // out
              if( !tIsDragging) {
                this.stop();
                this.animate( {opacity: DG.PlotUtilities.kDefaultPointOpacity,
                                transform: tInitialTransform }, DG.PlotUtilities.kHighlightHideTime);
                tInitialTransform = null;
                this_.hideDataTip();
              }
            })
        .mousedown( function( iEvent) {
              SC.run(function() {
                this_.get('model').selectCaseByIndex( iIndex, iEvent.shiftKey);
              });
            })
        .drag(function (dx, dy) { // continue
              var tNewCoord = (tNumericPlace === DG.GraphTypes.EPlace.eX) ?
                                this.ox + dx : this.oy + dy,
                  tNewWorld = this_.get('primaryAxisView').coordinateToData( tNewCoord),
                  tOldWorld = this_.getPath('model.cases').unorderedAt(this.index).getNumValue( this_.getPath('model.primaryVarID')),
                  tCurrTransform = this.transform();
              if( isFinite( tNewWorld)) {
                // Put the element into the initial transformed state so that changing case values
                // will not be affected by the scaling in the current transform.
                SC.run(function() {
                  this.transform( tInitialTransform);
                  changeCaseValues( tNewWorld - tOldWorld);
                  this.transform( tCurrTransform);
                }.bind(this));
              }
            },
            function (x, y) { // begin
              tIsDragging = true;
              // Save the initial screen coordinates
              this.ox = this.attr("cx");
              this.oy = this.attr("cy");
              // Save the initial world coordinate
              this.w = this_.getPath('model.cases').unorderedAt(this.index).getNumValue( this_.getPath('model.primaryVarID'));
              this.attr({opacity: kOpaque });
            },
            function() {  // end
              this.animate( {transform: tInitialTransform }, DG.PlotUtilities.kHighlightHideTime);
              returnCaseValuesToStart( this.index, this.w);
              tIsDragging = false;
              this.ox = this.oy = this.w = undefined;
            });
    //if( iIndex % 100 === 0 ) DG.logTimer( iIndex===0, "createElement index="+iIndex );
    tCircle.index = iIndex;
    tCircle.node.setAttribute('shape-rendering', 'geometric-precision');
    if( iAnimate)
      DG.PlotUtilities.doCreateCircleAnimation( tCircle);
    return tCircle;
  },

  /**
  We may clear and draw everything from scratch if required.
  */
  drawData: function drawData() {

    if( this.getPath('model.isAnimating'))
      return; // Points are animating to new position

    if( !SC.none( this.get('transferredElementCoordinates'))) {
      this.animateFromTransferredElements();
      return;
    }

    sc_super();
  },

  /**
    Generate the svg needed to display the plot
  */
  doDraw: function doDraw() {

    function updateAverageAdorn( a ) {
      if( !SC.none( a ) && a.wantVisible())
        a.updateToModel();
    }

    sc_super();

    this.drawData();

    this.updateSelection();

    updateAverageAdorn( this.plottedMeanAdorn );
    updateAverageAdorn( this.plottedMedianAdorn );
    updateAverageAdorn( this.plottedStDevAdorn );
    updateAverageAdorn( this.plottedBoxPlotAdorn );

    if( !SC.none( this.plottedValueAdorn))
      this.plottedValueAdorn.updateToModel();
    if( !SC.none( this.multipleMovableValuesAdorn))
      this.multipleMovableValuesAdorn.updateToModel();
  },

  zeroBinArray: function() {
    this._zeroBinArray( 2 * this._pointRadius);
  },

  /**
  Initialize binArray so it is ready to be used in drawing a complete set of points.
  */
  _zeroBinArray: function( iBinWidth) {
    var this_ = this,
        tNumericAxisView = this.get('primaryAxisView'),
        tCategoricalAxisView = this.get('secondaryAxisView');

    // We can get here because of a cleanupFunc call during destroy
    if( !tNumericAxisView || !tCategoricalAxisView)
      return;

    var tCategoricalAxisModel = tCategoricalAxisView.get('model'),
        tNumCells = tCategoricalAxisModel.get('numberOfCells'),
        tNumBins = Math.round( Math.abs( tNumericAxisView.get('pixelMax') -
                    tNumericAxisView.get('pixelMin')) / iBinWidth) + 1;

    function computeOverlap() {
      var tCases = this_.getPath('model.cases'),
          tNumericVarID = this_.getPath( 'model.primaryVarID'),
          tCategoricalVarID = this_.getPath( 'model.secondaryVarID'),
          tRadius = iBinWidth / 2,
          tBinArrays = this_.get('binArrays'),
          tMaxStackHeight = tCategoricalAxisView.get('fullCellWidth'),
          // The '-1' in the following is to ensure at least one point's worth of space between cells
          tMaxThatFit = Math.round( tMaxStackHeight / (2 * tRadius)) - 1,
          tOverlap = 0,
          tColorDesc = this_.getPath('model.dataConfiguration.legendAttributeDescription'),
          tColorID = tColorDesc.get('attributeID'),
          tMaxInBin, tPixelsOutside;
      tCases = tCases.filter( function( iCase) {
        return DG.isFinite( iCase.getNumValue( tNumericVarID));
      });

      if( tMaxThatFit <= 0) // If things are really tight, overlap points directly on top of each other
        return iBinWidth;
          
      tCases.forEach( function( iCase) {
        var tColorValue = !SC.none( tColorID) ? iCase.getValue( tColorID) : null,
            tNumericCoord = tNumericAxisView.dataToCoordinate( iCase.getNumValue( tNumericVarID)),
            tBin = Math.round( tNumericCoord / (2 * tRadius)),
            tCellNumber = tCategoricalAxisModel.cellNameToCellNumber( iCase.getStrValue(tCategoricalVarID));
        // Note that we can get a valid cell number for which we have not yet allocated a
        // bin array. We choose to ignore that cell for the purposes of computing overlap. The
        // desired bin array will be created the next time we draw.
        if( (SC.none( tColorID) || !SC.none( tColorValue)) && (tBin >= 0) && !SC.none( tCellNumber) &&
                (tCellNumber >= 0) && (tCellNumber < tBinArrays.length) &&
                (tBin < tBinArrays[ tCellNumber].length))
              tBinArrays[ tCellNumber][ tBin].total++;
      });
      tMaxInBin = DG.MathUtilities.max( tBinArrays.map( function( iBinArray ) {
        return DG.MathUtilities.max( iBinArray.map( function( iBin) {
          return iBin.total;
        }) );
      } ) );
      if( tMaxInBin > tMaxThatFit) {
        tPixelsOutside = (tMaxInBin - tMaxThatFit) * 2 * tRadius;
        tOverlap = tPixelsOutside / (tMaxInBin - 1);
      }
      return tOverlap;
    } // computeOverlap()
    
    // Fill arrays with zeroes
    this.set( 'binArrays', DG.MathUtilities.range( tNumCells ).map( function() {
      return DG.MathUtilities.range( tNumBins ).map( function() {
        return { total: 0, counter: 0 };
      } );
    } ) );
    this.set('overlap', computeOverlap());
  },

  /**
    Presumably our model has created a movable value. We need to create our adornment.
  */
  movableValueChanged: function() {
    var tPlotModel = this.get('model'),
        tMultipleMovableValues = tPlotModel && tPlotModel.getAdornmentModel('multipleMovableValues');
    if( tMultipleMovableValues) {
      if( !this.multipleMovableValuesAdorn) {
        this.multipleMovableValuesAdorn = DG.MultipleMovableValuesAdornment.create({
                                     parentView: this, model: tMultipleMovableValues,
                                     paperSource: this.get('paperSource'),
                                     layerName: DG.LayerNames.kAdornments,
                                     valueAxisView: this.get('primaryAxisView') });
      }
      this.multipleMovableValuesAdorn.updateToModel();
    }
  }.observes('.model.valuesDidChange', '.model.multipleMovableValues'),

  /**
   Presumably our model has created a plotted mean. We need to create our adornment.
   */
  plottedMeanChanged: function() {
    this.adornmentDidChange('plottedMean', 'plottedMeanAdorn', DG.PlottedMeanAdornment);
  }.observes('.model.plottedMean'),

  /**
    Presumably our model has created a plotted mean. We need to create our adornment.
  */
  plottedMedianChanged: function() {
    this.adornmentDidChange('plottedMedian', 'plottedMedianAdorn', DG.PlottedMedianAdornment);
  }.observes('.model.plottedMedian'),

  /**
   Presumably our model has created a plotted St.Dev. We need to create our adornment.
   */
  plottedStDevChanged: function() {
    this.adornmentDidChange('plottedStDev', 'plottedStDevAdorn', DG.PlottedStDevAdornment);
  }.observes('.model.plottedStDev'),
  
  /**
   Presumably our model has created a plotted IQR. We need to create our adornment.
   */
  plottedBoxPlotChanged: function() {
    this.adornmentDidChange('plottedBoxPlot', 'plottedBoxPlotAdorn', DG.PlottedBoxPlotAdornment);
  }.observes('.model.plottedBoxPlot'),
  
  /**
    Update an adornment after a change to its corresponding adornment model.
    @param    {String}    iAdornmentKey -- e.g. 'plottedMean' or 'plottedMedian'
    @param    {String}    iAdornmentProperty -- e.g. 'plottedMeanAdorn' or 'plottedMedianAdorn'
    @param    {Object}    iAdornmentClass -- e.g. DG.PlottedMeanAdornment or DG.PlottedMedianAdornment
   */
  adornmentDidChange: function( iAdornmentKey, iAdornmentProperty, iAdornmentClass) {
    var tPlotModel = this.get('model'),
        tAdornmentModel = tPlotModel && tPlotModel.getAdornmentModel( iAdornmentKey),
        tAdornment = this[ iAdornmentProperty];
    // Rather than attempt to reconnect an existing adornment, we throw out the old and rebuild.
    if( tAdornmentModel) {
      if( !tAdornment) {
        tAdornment = iAdornmentClass.create({
                        parentView: this, model: tAdornmentModel, paperSource: this.get('paperSource'),
                        layerName: DG.LayerNames.kAdornments, shadingLayerName: DG.LayerNames.kIntervalShading });
        this[ iAdornmentProperty] = tAdornment;
      }
      tAdornment.updateToModel();
    }
  },

  /**
   * This function gets called by a scheduled timer. We force a recomputation of overlap and a redisplay.
   */
  cleanupFunc: function() {
    this.prepareToResetCoordinates();
    this.displayDidChange();
  },

  /**
   Used by both handleBackgroundClick and handleBackgroundDblClick
    @param {SC.Event}
  */
  zoom: function( iEvent) {
    var tAxisKey = (this.getPath('model.primaryAxisPlace') === DG.GraphTypes.EPlace.eX) ? 'x' : 'y',
      tNumericAxisView = this.get('primaryAxisView'),
        tWorldPoint = { },
        tFactor = iEvent.shiftKey ? 2 : 0.5,
        tViewPoint = DG.ViewUtilities.windowToViewCoordinates({ x: iEvent.clientX, y: iEvent.clientY }, this);
      tWorldPoint[ tAxisKey] = tNumericAxisView.coordinateToData( tViewPoint[ tAxisKey]);
      this.get('model').dilate(tWorldPoint, tFactor);
  },

  /**
    Alt key triggers zoom.
    @param {SC.Event}
  */
  handleBackgroundClick: function( iEvent) {
    if( iEvent.altKey) {
      this.zoom( iEvent);
    }
  },

  /**
    Zoom at the mouse point
    @param {SC.Event}
  */
  handleBackgroundDblClick: function( iEvent) {
    this.zoom( iEvent);
  }

});

