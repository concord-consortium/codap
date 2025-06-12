// ==========================================================================
//                            DG.PlotView
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

sc_require('components/graph_map_common/plot_layer');

/** @class  DG.PlotView - The base class for a plot layer that appears in a graph.

 @extends DG.PlotLayer
 */
DG.PlotView = DG.PlotLayer.extend(
    /** @scope DG.PlotView.prototype */
    {
      autoDestroyProperties: ['plottedCountAdorn', 'plottedValueAdorn'],

      /**
       * These two properties are used to determine point color when there are multiple plots in a graph
       */
      plotIndex: 0,
      numPlots: 1,

      plotIndexDidChange: function () {
        // Keep my plotLayerNumber in synch
        this.set('plotLayerNumber', this.get('plotIndex'));
      }.observes('plotIndex'),

      /**
       @property { DG.AxisView}
       */
      xAxisView: null,
      /**
       @property { DG.AxisView }
       */
      yAxisView: null,

      /**
       * We can check the orientation of the yAxis.
       */
      isUsingY2: function () {
        return this.getPath('yAxisView.orientation') === DG.GraphTypes.EOrientation.kVertical2;
      }.property(),
      isUsingY2DidChange: function () {
        this.notifyPropertyChange('isUsingY2');
      }.observes('*yAxisView.orientation'),

      /**
       * Expected type of plotted elements
       */
      plottedElementType: 'circle',

      /**
       Used to store point coordinates at the beginning of a configuration change.
       @property { Array of {cx:{Number}, cy:{Number}} }
       */
      cachedPointCoordinates: null,

      /**
       * These are point coordinates that were gathered up from the plot before a configuration change
       @property { Array of {cx:{Number}, cy:{Number}} }
       */
      transferredElementCoordinates: null,

      /**
       * Set to false if you have your own way of animating to a new state
       @property {Boolean}
       */
      allowTransferAnimation: true,

      _areAdornmentsInitialized: false,

      /**
       @property {DG.FormulaTextEditView}
       */
      plottedValueEditView: null,

      /** @property {DG.PlottedCountAdornment} */
      plottedCountAdorn: null,

      /**
       * Used by both dot plot and scatter plot
       * @property {DG.PlottedValueAdornment}
       */
      plottedValueAdorn: null,

      /**
       Prepare dependencies.
       */
      init: function () {
        sc_super();
      },

      destroy: function () {
        this.removePlottedValueEditView();
        sc_super();
      },

      removePlottedValueEditView: function () {
        if (this.plottedValueEditView) {
          this.plottedValueEditView.removeFromParent();
          this.plottedValueEditView.destroy();
          this.plottedValueEditView = null;
        }
      },

      /**
       * Subclasses may override to set certain axis view properties for their purpose.
       */
      setupAxes: function () {

      },

      /**
       * Gives plot a chance to return descriptions of axis views
       * @return {[{}]}
       */
      getAxisViewDescriptions: function () {
        return [];
      },

      /**
       Observer function called when the axis bounds change.
       */
      axisBoundsDidChange: function () {
        this._isRenderingValid = false;
        this.displayDidChange();
      }.observes('xAxisView.model.lowerBound', 'xAxisView.model.upperBound',
          'yAxisView.model.lowerBound', 'yAxisView.model.upperBound', '.model.axisBounds'),

      /** Invalidate and update adornments shared by all plot types */
      updateAdornments: function () {
        var tCountAdornModel = this.plottedCountAdorn && this.plottedCountAdorn.get('model');
        if (tCountAdornModel) {  // update counts if present
          this.plottedCountAdorn.get('model').setComputingNeeded();
          this.plottedCountAdorn.updateToModel();
        }

        var tPlottedValueAdorn = this.get('plottedValueAdorn');
        if (tPlottedValueAdorn) {
          tPlottedValueAdorn.updateToModel();
        }
      },

      rescaleOnParentCaseCompletion: function (iCases) {
        var caseCount = iCases && iCases.length,
            lastCase = caseCount && iCases[caseCount - 1],
            lastCaseID = lastCase && lastCase.get('id'),
            openParentCaseID = this.getPath('model.openParentCaseID');
        if (!SC.none(lastCaseID) && (lastCaseID === openParentCaseID)) {
          var plot = this.get('model');
          if (plot && plot.rescaleAxesFromData) {
            plot.rescaleAxesFromData(false /* don't allow scale shrinkage */,
                false /* don't animate points */);
          }
          this.setPath('model.openParentCaseID', null);
        }
      },

      /**
       Initialize the adornments from the set of adornment models.
       */
      initializeAdornments: function () {
        /* TODO: for historical reasons, the implementation of the plotted count
         * adornment is different from other adornments. it's state is managed
         * separately. Should be unified. */
        this.plottedCountChanged();

        var model = this.get('model'),
            adornmentModels = model && model._adornmentModels;
        DG.ObjectMap.forEach(adornmentModels,
            function (iAdornmentKey, iAdornmentModel) {
              model.notifyPropertyChange(iAdornmentKey);
            });

        this._areAdornmentsInitialized = true;
      },

      /**
       *
       * @param iIndex  Index of this plot view in array of plotviews owned by graph
       * @param iNumPlots Number of plotviews owned by graph
       */
      doDraw: function doDraw(iIndex, iNumPlots) {
        if (!SC.none(iIndex)) {
          this.set('plotIndex', iIndex);
          this.set('numPlots', iNumPlots);
        }
        if (!this._areAdornmentsInitialized) {
          this.initializeAdornments();
        } else {
          this.updateAdornments();
        }

        // The following seemed necessary at one point, but has since caused problems.
        // We leave it commented in because we may discover situations in which it _is_ necessary.
        // if( this.getPath('model.isAnimating')) {
        // In some situations we get both animation and transferred points coordinates. The first is sufficient
        // this.set('transferredElementCoordinates', null);
        // }

      },

      /**
       For use in transferring current element positions of this plot to a new plot about
       to take its place.
       @return {[{cx:{Number}, cy:{Number}, r: {Number}, fill: {String} ]}
       */
      getElementPositionsInParentFrame: function () {
        var tFrame = this.get('frame'),
            tPlottedElements = this.get('plottedElements');
        DG.assert(tPlottedElements.length === 0 || tPlottedElements[0][0].constructor !== SVGRectElement,
            'Expecting circle, not rect');
        return tPlottedElements.map(function (iElement) {
          var tRadius = (iElement.isHidden() ? 0 : iElement.attr('r')); // use r:0 as proxy for hidden plot element
          return {
            cx: iElement.attr('cx') + tFrame.x,
            cy: iElement.attr('cy') + tFrame.y,
            r: tRadius,
            fill: iElement.attr('fill'),
            type: 'circle'
          };
        });
      },

      /**
       * Returns 'transferredElementCoordinates' converted to view coordinates.
       */
      getTransferredElementsViewCoords: function () {
        var coords = this.get('transferredElementCoordinates'),
            frame = this.get('frame');
        if (coords && frame) {
          coords.forEach(function (iPoint, iIndex) {
            // adjust old coordinates from parent frame to this view
            // assign x/y and cx/cy to support animating to rects or circles
            if (iPoint.cx != null) iPoint.cx -= frame.x;
            if (iPoint.cy != null) iPoint.cy -= frame.y;
            if (iPoint.x != null) iPoint.x -= frame.x;
            if (iPoint.y != null) iPoint.y -= frame.y;
          });
        }
        return coords;
      },

      /**
       * Called from animateFromTransferredElements to create animatable elements.
       * @param {DG.Case} iCase
       * @param {number} iIndex
       * @param {Object} iOldEltAttrs
       */
      createAnimatingElement: function (iCase, iIndex, iOldEltAttrs) {
        var tElement = this.callCreateElement(iCase, iIndex, false);
        iOldEltAttrs && tElement.attr(iOldEltAttrs);
        return tElement;
      },

      /**
       Called when this view is taking over from another one in order to animate points from their
       previous position to their new position. Handles 3 types of animations:
       (a) one-to-many animation for moving from parent to corresponding child case(s)
       (b) many-to-one animation for moving from child case(s) to corresponding parent case
       (c) one-to-one animation for moving within a collection (this is default).
       */
      animateFromTransferredElements: function () {
        var tCases = this.getPath('model.cases'),
            tRC = this.createRenderContext(),
            tOldPointAttrs = this.getTransferredElementsViewCoords(),
            tOldElementType = tOldPointAttrs.length > 0 && tOldPointAttrs[0].type,
            tNewPointAttrs = [], // used if many-to-one animation
            tNewToOldCaseMap = [],
            tOldToNewCaseMap = [];
        // During undo/redo we can get here without cases. Bail!
        if (!tCases || !tRC)
          return;

        function caseLocationSimple(iIndex) {
          // assume a 1 to 1 correspondence of the current case indices to the new cases
          return tOldPointAttrs[iIndex];
        }

        function caseLocationViaMap(iIndex) {
          // use our case index map to go from current case index to previous case index
          return tOldPointAttrs[tNewToOldCaseMap[iIndex]];
        }

        this._getTransferredElementsToCasesMap(tNewToOldCaseMap, tOldToNewCaseMap);
        this.set('transferredElementCoordinates', null);
        var hasElementMap = tNewToOldCaseMap.length > 0,
            hasVanishingElements = tOldToNewCaseMap.length > 0,
            getCaseCurrentLocation = (hasElementMap ? caseLocationViaMap : caseLocationSimple),
            tHaveInstalledCallback = false;

        this._elementOrderIsValid = false;
        DG.sounds.playMixup();
        this.prepareToResetCoordinates();
        if (tOldElementType !== this.get('plottedElementType')) {
          this.removePlottedElements(true);
          // one would think that removePlottedElements() would obviate the need for this, but no
          this.get('plottedElements').forEach(function (iElement) {
            iElement.remove();
          });
          this.get('plottedElements').length = 0;
        }

        var eachCaseFunc = function (iCase, iIndex, iIsLast) {
              // Because this function is called during an invokeLater, it can happen that
              // since the time the loop was initiated, the plotview has been destroyed!
              if (this.isDestroyed)
                return;
              // create new circles, animating from old coordinates where possible
              var tPt = getCaseCurrentLocation(iIndex),
                  tAnimate = false,
                  tCallBack;
              this.createAnimatingElement(iCase, iIndex, tPt);
              if (!SC.none(tPt)) {
                tAnimate = true;
                if (iIsLast) {
                  tCallBack = function () {
                    this.setPath('model.isAnimating', false);  // Allow standard draw
                    // Draw once more because it can happen that a graph layout has happened since we computed
                    // point coordinates
                    this.drawData();
                  }.bind(this);
                }
              }
              // setCircleCoordinate returns null if coordinates are not valid
              tPt = this.setCircleCoordinate(tRC, iCase, iIndex, tAnimate, tCallBack);
              if (tPt && tCallBack) {
                tHaveInstalledCallback = true;
              }
              if (hasVanishingElements) {
                tNewPointAttrs.push(tPt);
              }
              return this.getPath('model.isAnimating');
            }.bind(this),

            finallyFunc = function () {
              if (!tHaveInstalledCallback)
                this.setPath('model.isAnimating', false);
              if (hasVanishingElements) {
                // create a vanishing element for each old point that needs one (used if many-to-one animation)
                tOldPointAttrs.forEach(function (iOldAttrs, iIndex) {
                  var tNewIndex = tOldToNewCaseMap[iIndex],
                      tNewAttrs = tNewPointAttrs[tNewIndex];
                  if (SC.none(tNewIndex) || SC.none(tNewAttrs) || (iOldAttrs.r === 0))
                    return; // no vanishing element, if (1) element persists or (2) new circle hidden or (3) old circle hidden
                  this.vanishPlottedElement(iOldAttrs, tNewAttrs);
                });
              }
              this.notifyPropertyChange('plotDisplayDidChange');
            }.bind(this);
        this.setPath('model.isAnimating', true); // So plot's standard draw won't wipe out animation
        tCases.forEachWithInvokeLater(eachCaseFunc, finallyFunc);
      },

      /**
       * Get a map from the current (new) case index to the index of the transferred point coordinates (old case),
       * and vise versa, if and only if we are animating from many cases to fewer cases, or vise versa.
       * Used to handle special case animations, when switching from parent to child collection or back,
       * where cases appear to get split or joined.  If neither array is populated, the caller can assume
       * a 1 to 1 case index mapping.
       * @param iNewToOldCaseMap {[]} empty Array, or array of index values, one for each (new) case.
       * @param iOldToNewCaseMap {[]} empty Array, or array of index values, one for each (old) transferred point coordinate.
       */
      _getTransferredElementsToCasesMap: function (iNewToOldCaseMap, iOldToNewCaseMap) {
        var tTransferredPoints = this.get('transferredElementCoordinates'),
            tCases = this.getPath('model.cases'),
            tCollectionClient = this.getPath('model.collectionClient'),
            tChildCollectionClient = this.getPath('model.dataContext.childCollection'),
            tParentCollectionClient = this.getPath('model.dataContext.parentCollection'),
            tParentNumCases = tParentCollectionClient ? tParentCollectionClient.getCaseCount() : 0,
            tChildNumCases = tChildCollectionClient ? tChildCollectionClient.getCaseCount() : 0,
            tNewNumCases = tCases ? tCases.get('length') : 0,
            tOldNumCases = tTransferredPoints.length;

        function isParentToChildTransformation() {
          // TODO this function needs improvement.  Returns true even if not changing collections, if number of cases happens to match parent-to-child transform.
          return (tParentCollectionClient &&
              (tParentNumCases === tOldNumCases) && // TODO: fix this bad assumption, better to check collection id saved with old cases instead
              (tCollectionClient && tCollectionClient.isDescendantOf(tParentCollectionClient)));
        }

        function isChildToParentTransformation() {
          // TODO this function needs improvement.  Returns true even if not changing collections, if number of cases happens to match child-to-parent transform.
          return (tChildCollectionClient &&
              (tChildNumCases === tOldNumCases) && // TODO: fix this bad assumption, better to check collection id saved with old cases instead
              (tCollectionClient && tCollectionClient.isAncestorOf(tChildCollectionClient)));
        }

        function getParentCaseNumChildren(iCaseIndex) {
          // return the number of children of the given case in the parent collection
          var tParentCase = tParentCollectionClient.getCaseAt(iCaseIndex),
              tParentCaseChildren = tParentCase && tParentCase.get('children');
          if (tParentCaseChildren) {
            tParentCaseChildren = tParentCaseChildren.filter(function (iCase) {
              return tCases.indexOf(iCase) >= 0;
            });
            return tParentCaseChildren.get('length');
          } else
            return 0;
        }

        function getParentToChildTransformation(iNewToOld, iOldToNew) {
          // fill iNewToOld[] with child case index to parent case index mapping
          // because typically many child cases will want location of the same shared parent case for animation
          var tOldIndex, tNewIndex, tNumChildren;

          for (tOldIndex = 0; tOldIndex < tOldNumCases; ++tOldIndex) {
            tNumChildren = getParentCaseNumChildren(tOldIndex);
            for (tNewIndex = 0; tNewIndex < tNumChildren; ++tNewIndex) {
              iNewToOld.push(tOldIndex);
            }
          }
          if (!DG.assert(iNewToOld.length === tNewNumCases, "Parent/Child case mismatch")) {
            iNewToOld.length = 0; // don't use this map if length error
          }
          DG.assert(iOldToNew.length === 0, "another parent/child case mismatch");
        }

        function getChildToParentTransformation(iNewToOld, iOldToNew) {
          // fill iNewToOld[] with parent case index to child case index mapping, using 'undefined' if no child case index
          // fill iOldToNew[] with child case index to parent case index mapping, for extra old cases that are vanishing
          // because typically each newly created parent case will start at location of 0th child case,
          // and typically all but 0th child case must animate to position of newly created parent case.
          var tOldIndex, tNewIndex, tNumChildren, tChild, tChildCaseIndex;

          tOldIndex = 0;
          for (tNewIndex = 0; tNewIndex < tNewNumCases; ++tNewIndex) {
            tNumChildren = getParentCaseNumChildren(tNewIndex);
            iNewToOld.push((tNumChildren > 0) ? tOldIndex : undefined); // map each parent case to 1st child case if any, otherwise undefined
            for (tChild = 0; tChild < tNumChildren; ++tChild) {
              // ignore the 0th child case (undefined mapping), give index of 1st+ child case which is to be vanished
              tChildCaseIndex = ((tChild === 0) ? undefined : iNewToOld.length - 1);
              iOldToNew.push(tChildCaseIndex);
              ++tOldIndex;
            }
          }
        }

        if (isParentToChildTransformation()) {
          getParentToChildTransformation(iNewToOldCaseMap, iOldToNewCaseMap);

        } else if (isChildToParentTransformation()) {
          getChildToParentTransformation(iNewToOldCaseMap, iOldToNewCaseMap);
        }
        //DG.log("DG.PlotView._getTransferredElementsToCasesMap() collection id=%@, NewToOldCaseMap %@", tCollectionClient.get('id'), iNewToOldCaseMap.toString());
        //DG.log("DG.PlotView._getTransferredElementsToCasesMap() collection id=%@, OldToNewCaseMap %@", tCollectionClient.get('id'), iOldToNewCaseMap.toString());
      },

      /**
       * Our model is signalling that it is about to change (DG.GraphModel.aboutToChangeConfiguration.set(true))
       * We use this opportunity to prepare for an animation.
       * See also handleConfigurationChange.
       */
      prepareForConfigurationChange: function () {
        this.set('cachedPointCoordinates', this.getElementPositionsInParentFrame());
      },

      /**
       * Our model is signalling that it has changed (DG.GraphModel.aboutToChangeConfiguration.set(false))
       * We use this opportunity to update views.
       * See also prepareForConfigurationChange.
       */
      handleConfigurationChange: function () {
        // In certain circumstances we have already moved point coordinates to transferredElementCoordinates.
        // Protect against wiping these out.
        if (this.get('allowTransferAnimation') && !this.get('transferredElementCoordinates')) {  // the configuration has changed
          this.set('transferredElementCoordinates', this.get('cachedPointCoordinates'));
        }
      },

      /**
       Subclasses may override. Note that deselection happens in startMarquee.
       @param iEvent {SC.Event}
       */
      handleBackgroundClick: function (iEvent) {
      },

      /**
       Subclasses will override if they have a double-click behavior
       @param iEvent {SC.Event}
       */
      handleBackgroundDblClick: function (iEvent) {
      },

      /**
       * This value depends only on plotIndex and numPlots
       */
      getAttributeColor: function () {
        var tPlotIndex = this.get('plotIndex'),
            tNumPlots = this.get('numPlots');
        return SC.none(tPlotIndex) || (tPlotIndex === 0) ? null :
            DG.ColorUtilities.calcAttributeColorFromIndex(tPlotIndex, tNumPlots);
      },

      getPointColor: function () {
        var tModel = this.get('model');
        return tModel.getPointColor ? tModel.getPointColor() : DG.PlotUtilities.kDefaultPointColor;
      },

      /**
       * Construct and return a new render context
       * used for setCircleCoordinate()
       * @return {*}
       */
      createRenderContext: function () {
        var tModel = this.get('model'),
            tConfig = tModel.get('dataConfiguration'),
            tLegendDesc = tConfig.get('legendAttributeDescription'),
            tYVarIDKey = tModel.getPath('verticalAxisIsY2') ? 'y2VarID' : 'yVarID',
            tStrokeParams = this.getStrokeParams(),
            tIsNumeric = tLegendDesc && tLegendDesc.get('isNumeric'),
            tQuantileValues = (tIsNumeric) ? DG.MathUtilities.nQuantileValues(
                    tConfig.numericValuesForPlace(DG.GraphTypes.EPlace.eLegend), 5) :
                [];
        this._pointRadius = this.calcPointRadius(); // make sure created circles are of right size
        return {
          // render needs (set all to true for now, maybe later we can optimize by not doing all of them?)
          casesAdded: true,
          casesRemoved: true,
          updatedColors: true,
          updatedPositions: true,

          // cached render parameters common to all cases
          xAxisView: this.get('xAxisView'),
          yAxisView: this.get('yAxisView'),
          xVarID: tModel.get('xVarID'),
          yVarID: tModel.get(tYVarIDKey),
          legendDesc: tLegendDesc,
          legendVarID: tLegendDesc && tLegendDesc.get('attributeID'),
          pointColor: this.getPointColor(),
          transparency: tModel.getTransparency ? tModel.getTransparency() : DG.PlotUtilities.kDefaultPointOpacity,
          strokeTransparency: tStrokeParams.strokeTransparency,
          attrColor: this.getAttributeColor(),

          /**
           * Calculate the case color string
           * @param iCase {DG.Case}
           * @return {String}
           */
          calcCaseColorString: function (iCase) {
            DG.assert(iCase);
            var tColorValue = tIsNumeric ? iCase.getForcedNumericValue(this.legendVarID) :
                    iCase.getValue(this.legendVarID),
                tCaseColor = DG.ColorUtilities.calcCaseColor(tColorValue, this.legendDesc,
                    this.attrColor || this.pointColor, tQuantileValues);
            return tCaseColor.colorString || tCaseColor;
          },
          calcStrokeColorString: function (iCase) {
            if (tStrokeParams.strokeSameAsFill)
              return this.calcCaseColorString(iCase);
            else return tStrokeParams.strokeColor;
          }
        };
      },

      /**
       Create or destroy the matching adornment when our model creates/destroys the DG.PlottedCountModel.
       */
      plottedCountChanged: function () {
        var tCountModel = this.getPath('model.plottedCount');
        // This adornment may have been passed from a previous plot. Make sure knows it needs to recompute
        if (tCountModel.get('isVisible'))
          tCountModel.setComputingNeeded();
        // Rather than attempt to reconnect an existing adornment, we throw out the old and rebuild.
        if (this.plottedCountAdorn) {
          this.plottedCountAdorn.destroy();
          this.plottedCountAdorn = null;
        }
        if (tCountModel && this.get('paper')) {
          this.plottedCountAdorn = DG.PlottedCountAdornment.create({
            parentView: this, valueAxisView: this.get('primaryAxisView'),
            model: tCountModel, paperSource: this.get('paperSource'),
            layerName: DG.LayerNames.kAdornments
          });
          this.plottedCountAdorn.updateToModel();
        }
      }.observes('*model.plottedCount'),

      /**
       The visibility of the model's plotted function has changed. We respond accordingly.
       */
      plottedValueChanged: function () {
        var plotModel = this.get('model'),
            tPlottedValue = plotModel && plotModel.getAdornmentModel('plottedValue'),
            tPlottedValueAdorn = this.get('plottedValueAdorn'),
            tFormulaEditContextExists = DG.PlottedFormulaEditContext.hasFormulaEditContextFor(tPlottedValue),
            tPlottedValueEditView = this.get('plottedValueEditView'),
            tPlottedValueIsVisible = tPlottedValue && tPlottedValue.get('isVisible');
        if (tPlottedValueEditView && !tPlottedValueIsVisible) {  // If it's not visible, we can avoid much of the work
          tPlottedValueEditView.set('isVisible', false);
        }
        if (!tFormulaEditContextExists && tPlottedValueEditView) {
          this.removePlottedValueEditView();
          tPlottedValueEditView = null;
        }
        if (tPlottedValue) {
          if (tPlottedValue && !tPlottedValueEditView) {
            tPlottedValueEditView = DG.PlottedValueAdornment.createFormulaEditView(tPlottedValue);
            this.set('plottedValueEditView', tPlottedValueEditView);
            this.setPath('parentView.plottedValueEditorView', tPlottedValueEditView);
          }
          // noinspection JSObjectNullOrUndefined
          tPlottedValueEditView.set('isVisible', tPlottedValue.get('isVisible'));

          if (tPlottedValueAdorn) {
            tPlottedValueAdorn.set('parentView', this);
            tPlottedValueAdorn.set('model', tPlottedValue);
            tPlottedValueAdorn.set('paperSource', this.get('paperSource'));
          } else {
            tPlottedValueAdorn = DG.PlottedValueAdornment.create({
              parentView: this,
              model: tPlottedValue,
              paperSource: this.get('paperSource'),
              layerName: DG.LayerNames.kAdornments
            });
            this.set('plottedValueAdorn', tPlottedValueAdorn);
          }
        } else if (tPlottedValueAdorn) {
          tPlottedValueAdorn.destroy();
          this.set('plottedValueAdorn', null);
        }
      }.observes('*model.plottedValue'),

      /**
       Called when the order of the categories on an axis changes (e.g. cells are dragged)
       */
      categoriesDidChange: function (iObject, iProperty) {
      },

      /**
       * Here we do the initialization that relies on there being a paper to draw on.
       */
      didCreateLayer: function () {
        this.plottedCountChanged(); // create count adornment to match model, now that we have paper
      }

    });
