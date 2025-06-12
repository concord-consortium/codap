// ==========================================================================
//                            DG.BinnedPlotModel
//
//  Author:   William Finzer
//
//  Copyright (c) 2020 by The Concord Consortium, Inc. All rights reserved.
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

sc_require('components/graph/plots/univariate_plot_model');

/**
 * @class  DG.BinnedPlotModel The model for a dot plot in which the dots are binned.
 *
 * Notes
 *  - When the plot is grouped into cells by a categorical attribute, the alignment and width is the same for
 *    all the cells.
 *  - The default number of bins applies across all the cells rather than separately for each cell. Thus, to
 *    determine the alignment and width we have to find the min and max of all the values, regardless of cell.
 *
 * @extends SC.UnivariatePlotModel
 */
DG.BinnedPlotModel = DG.UnivariatePlotModel.extend((function () {

  var kDefaultNumberOfBins = 4;

      return {
        /** @scope DG.BinnedPlotModel.prototype */
        displayAsBinned: true,

        dotsAreFused: false,
        dotsAreFusedDidChange: function() {
          if( this.get('dotsAreFused')) {
            this.setPath('plottedCount.isVisible', false);
          }
        }.observes('dotsAreFused'),

        restoreInProgress: false,

        wantsOtherAxis: function() {
          return this.get('dotsAreFused');
        }.property('dotsAreFused'),

        /**
         * Histograms (dots are fused) get one set of axis models and binned plots another.
         * @param iPlace {DG.GraphTypes.EPlace}
         * @return { class }
         */
        getDesiredAxisClassFor: function( iPlace) {
          var tDotsAreFused = this.get('dotsAreFused');
          if( iPlace === this.get('primaryAxisPlace'))
            return tDotsAreFused ? DG.CellLinearAxisModel : DG.BinnedAxisModel;
          else if(iPlace === this.get('secondaryAxisPlace')) {
            if( tDotsAreFused)
              return DG.CountAxisModel;
            else {
              return SC.none( this.get('secondaryVarID')) ? DG.AxisModel : DG.CellAxisModel;
            }
          }
          else return sc_super();
        },

        /**
         * The left edge of the zeroth bin has this value
         * @property {Number}
         */
        _leastBinEdge: 0,
        leastBinEdge: function( iKey, iValue) {
          if( !SC.none( iValue)) {
            this._leastBinEdge = iValue;
          }
          else if(!this._casesMap) {
            this.updateCasesMap();
          }
          return this._leastBinEdge;
        }.property(),

        maxBinEdge: function() {
          return this.get('leastBinEdge') + this.get('totalNumberOfBins') * this.get('width');
        }.property('leastBinEdge', 'width', 'totalNumberOfBins'),

        /**
         * One of the bins is constrained to this value
         * @property {Number}
         */
        _alignment: null,
        alignment: function( iKey, iValue) {
          if( iValue !== undefined) {
            this._alignment = iValue;
          }
          else if(!this._casesMap) {
            this.updateCasesMap();
          }
          return this._alignment;
        }.property(),

        /**
         * All bins are this wide
         * @property {Number}
         */
        _width: null,
        width: function( iKey, iValue) {
          if( iValue !== undefined) {
            this._width = iValue;
          }
          else if(!this._casesMap) {
            this.updateCasesMap();
          }
          return this._width;
        }.property(),

        /**
         * @property {Number}
         */
        _widthIncrement: null,
        widthIncrement: function( iKey, iValue) {
          if( iValue !== undefined) {
            this._widthIncrement = iValue;
          }
          else if(!this._casesMap) {
            this.updateCasesMap();
          }
          return this._widthIncrement;
        }.property(),

        /**
         * @property {[{  value: {Number}, cell: {Number}, bin: { Number}, indexInBin: {Number} }]}
         */
        _casesMap: null,
        casesMap: function( iKey, iValue) {
          if( !SC.none( iValue)) {
            this._casesMap = iValue;
          }
          else if(!this._casesMap) {
            this.updateCasesMap();
          }
          return this._casesMap;
        }.property(),

        /**
         * @property { [{ lowerEdgeWorld: {Number}, count: {Number}, indices: [{Number}] }] }
         */
        bars: function() {
          var tTotalNumberOfBins = this.get('totalNumberOfBins'),
              tCasesMap = this.get('casesMap'),
              tBars = new Array( tTotalNumberOfBins),
              tWidth = this.get('width'),
              tLowerEdge = this.get('leastBinEdge');
          for(var i = 0; i < tTotalNumberOfBins; i++) {
            tBars[i] = { count: 0, indices: [],
                        lowerEdgeWorld: tLowerEdge + i * tWidth};
          }
          tCasesMap.forEach( function( iObject, iIndex) {
            tBars[iObject.bin].count++;
            tBars[iObject.bin].indices.push( iIndex);
            tLowerEdge += tWidth;
          });

          return tBars;
        }.property(),

        totalCount: function() {
          return this.get('bars').reduce( function( iSum, iBar) {
            return iSum + iBar.count;
          }, 0);
        }.property('bars'),

        /**
         * What is the most number of case values in a given bin?
         */
        _maxBinCount: 0,
        maxBinCount: function( iKey, iValue) {
          if( !SC.none( iValue)) {
            this._maxBinCount = iValue;
          }
          else if(!this._casesMap) {
            this.updateCasesMap();
          }
          return this._maxBinCount;
        }.property(),

        /**
         * What is the total number of bins across all cells?
         */
        _totalNumberOfBins: 0,
        totalNumberOfBins: function( iKey, iValue) {
          if( !SC.none( iValue)) {
            this._totalNumberOfBins = iValue;
          }
          else if(!this._casesMap) {
            this.updateCasesMap();
          }
          return this._totalNumberOfBins;
        }.property(),

        /**
         * Set to true to avoid infinite loops
         * @property {Boolean}
         */
        recomputing: false,

        isDateTime: function() {
          var tPrimaryPlace = this.get('primaryAxisPlace'),
              tAxisPrefix = tPrimaryPlace === DG.GraphTypes.EPlace.eX ? 'x' : 'y';
          return this.getPath('dataConfiguration.' + tAxisPrefix + 'AttributeDescription.attributeType') ===
              DG.Analysis.EAttributeType.eDateTime;
        }.property(),

        /**
         *
         * @param iIndex {Number}
         * @return { {value: {Number}, cell: {Number}, bin: { Number}, indexInBin: {Number}} }
         */
        infoForCase: function( iIndex) {
          var tCasesMap = this.get('casesMap');
          return tCasesMap && tCasesMap[ iIndex];
        },

        valueToBinNumber: function( iValue) {
          var tLeastBinEdge = this.get('leastBinEdge'),
              tWidth = this.get('width');
          return Math.floor( (iValue - tLeastBinEdge) / tWidth);
        },

        handleDataContextNotification: function (iNotifier, iChange) {
          if( iChange.operation !== 'selectCases')
            this.invalidateCasesMap();
          sc_super();
        },

        /**
         * @param iKey {String} If present, the property that changed to bring about this call
         */
        invalidateCaches: function ( iKey) {
          sc_super();
          this.invalidateCasesMap();
        },

        invalidateCasesMap: function() {
          this._casesMap = null;
          this.notifyPropertyChange('changed');
        }.observes('width', 'alignment'),

        /**
         * Called directly by GraphModel. If it is our primary axis attribute that has changed,
         * we need to recompute width, alignment, and increment.
         * @parameter {String}  Either 'xAxis' or 'yAxis'
         */
        xOrYAttributeDidChange: function( iAxisKey) {
          var tPrimaryPlace = this.get('primaryAxisPlace'),
              tPlaceThatChanged = (iAxisKey === 'xAxis') ? DG.GraphTypes.EPlace.eX : DG.GraphTypes.EPlace.eY;
          if( tPrimaryPlace === tPlaceThatChanged) {
            this.set('width', null);
            this.set('alignment', null);
            this.set('widthIncrement', null);
          }
        },

        updateCasesMap: function () {
          if( this.recomputing)
            return; // Avoid recursion
          this.recomputing = true;

          var tCases = this.get('cases'),
              tNumericVarID = this.get('primaryVarID'),
              tNumericAxisModel = this.get('primaryAxisModel'),
              tCategoricalVarID = this.get('secondaryVarID'),
              tCategoricalAxisModel = this.get('secondaryAxisModel'),
              tMin = Number.MAX_VALUE,
              tMax = -Number.MAX_VALUE,
              tBinCounts = [],
              tWidth = this.get('width'),
              tAlignment = this.get('alignment'),
              tLeastBinEdge = this.get('leastBinEdge'),
              tMaxBinCount = this.get('maxBinCount'),
              tTotalNumberOfBins = this.get('totalNumberOfBins');

          if (!(tCategoricalAxisModel && tNumericAxisModel))
            return; // too early to recompute, caller must try again later.

          var tNumCells = tCategoricalAxisModel.get('numberOfCells');
          this._casesMap = [];

          if( tCases.length() === 0 && (SC.none( tWidth) || SC.none( tAlignment))) {
            tWidth = 1;
            tAlignment = 0;
            tLeastBinEdge = 0;
            tMaxBinCount = 0;
            tTotalNumberOfBins = 0;
          }
          else {
            tCases.forEach(function (iCase, iIndex) {
              var tNumericValue = iCase.getForcedNumericValue(tNumericVarID),
                  tCellValue = iCase.getStrValue(tCategoricalVarID),
                  tCellNumber = tCategoricalAxisModel.cellNameToCellNumber(tCellValue);
              if (tCellNumber != null &&
                  DG.MathUtilities.isInIntegerRange(tCellNumber, 0, tNumCells) && // if Cell Number not missing
                  !SC.none(tNumericValue)) { // if numeric value not missing
                tMin = Math.min(tMin, tNumericValue);
                tMax = Math.max(tMax, tNumericValue);
                this._casesMap[iIndex] = {value: tNumericValue, cell: tCellNumber};
              }
            }.bind(this));
            // We can get in here during a transition without a valid casesMap
            if( this._casesMap.length !== 0) {
              tWidth = this.get('width');
              if (SC.none(tWidth)) {
                tWidth = DG.MathUtilities.goodTickValue((tMax - tMin) / kDefaultNumberOfBins);
              }
              tAlignment = this.get('alignment') || Math.floor(tMin / tWidth) * tWidth;
              tLeastBinEdge = tAlignment - Math.ceil((tAlignment - tMin) / tWidth) * tWidth;
              tMaxBinCount = 0;
              // Note that we add a small number so that we get enough bins to accommodate a number
              // that lies exactly on the top edge
              tTotalNumberOfBins = Math.ceil((tMax - tLeastBinEdge) / tWidth + 0.000001);
              this._widthIncrement = DG.MathUtilities.goodTickValue((tMax - tMin) / tTotalNumberOfBins) / 20;

              // Put each case in a bin
              // this._casesMap.forEach(function (iObject) {
              tCases.forEach(function (iCase, iIndex) {
                var tObject = this._casesMap[iIndex];
                if( tObject) {
                  tObject.bin = Math.floor((tObject.value - tLeastBinEdge) / tWidth);
                  if (!tBinCounts[tObject.cell])
                    tBinCounts[tObject.cell] = [];
                  if (!tBinCounts[tObject.cell][tObject.bin])
                    tBinCounts[tObject.cell][tObject.bin] = 0;
                  tObject.indexInBin = tBinCounts[tObject.cell][tObject.bin];
                  tBinCounts[tObject.cell][tObject.bin]++;
                  tMaxBinCount = Math.max(tMaxBinCount, tBinCounts[tObject.cell][tObject.bin]);
                }
              }.bind(this));
            }
          }

          this.beginPropertyChanges();
          this.set('width', tWidth);
          this.set('alignment', tAlignment);
          this.set('leastBinEdge', tLeastBinEdge);
          this.set('maxBinCount', tMaxBinCount);
          this.set('totalNumberOfBins', tTotalNumberOfBins);
          this.endPropertyChanges();

          this.recomputing = false;
          this.restoreInProgress = false;
        },

        /**
         * For each bin, pass the [min,max) interval to the given functor
         * @param iFunc {Function}
         */
        forEachBinDo: function (iFunc) {
          if( !this._casesMap) {
            this.updateCasesMap();
          }
          var tLowerEdge = this.get('leastBinEdge'),
              tNumberOfBins = this.get('totalNumberOfBins'),
              tWidth = this.get('width'),
              tWidthIncrement = this.get('widthIncrement'),
              tDigits = tWidthIncrement >= 1 ? 0 : Math.abs( Math.floor( Math.log10(tWidthIncrement))),
              tIsDateTime = this.get('isDateTime'),
              tDateLevel = tIsDateTime ?
                  DG.DateUtilities.mapLevelToPrecision(DG.DateUtilities.determineLevels(tLowerEdge, tLowerEdge +
                      ( tNumberOfBins - 1) * tWidth).innerLevel) :
                  null;
          for( var tBinNum = 0; tBinNum < tNumberOfBins; tBinNum++) {
            var tLower = tIsDateTime ? DG.DateUtilities.formatDate( tLowerEdge, tDateLevel, true /* useShort */) :
                  DG.MathUtilities.formatNumber( tLowerEdge, tDigits),
                tUpper = tIsDateTime ? DG.DateUtilities.formatDate( tLowerEdge + tWidth, tDateLevel, true /* useShort */) :
                    DG.MathUtilities.formatNumber( tLowerEdge + tWidth, tDigits);
            iFunc( tBinNum, tLower, tUpper);
            tLowerEdge += tWidth;
          }
        },

        /**
         * Return a list of objects { key, class, useAdornmentModelsArray, storage }
         * Subclasses should override calling sc_super first.
         * @return {[Object]}
         */
        getAdornmentSpecs: function () {
          var tSpecs = sc_super();
          DG.ObjectMap.forEach(this._adornmentModels, function (iKey, iAdorn) {
            tSpecs.push({
              key: iKey,
              "class": iAdorn.constructor,
              useAdornmentModelsArray: true,
              storage: iAdorn.createStorage()
            });
          });
          return tSpecs;
        },

        /**
         * Base class will do most of the work. We just have to finish up the multipleMovableValues model.
         * @param {DG.PlotModel} iSourcePlot
         */
        installAdornmentModelsFrom: function (iSourcePlot) {
          sc_super();
        },

        /**
         Each axis should rescale based on the values to be plotted with it.
         @param{Boolean} Default is false
         @param{Boolean} Default is true
         @param{Boolean} Default is false
         @param{Boolean} Default is false
         */
        rescaleAxesFromData: function (iAllowScaleShrinkage, iAnimatePoints, iLogIt, iUserAction) {
          if (iAnimatePoints === undefined)
            iAnimatePoints = true;
          this.doRescaleAxesFromData([DG.GraphTypes.EPlace.eX, DG.GraphTypes.EPlace.eY],
              iAllowScaleShrinkage, iAnimatePoints, iUserAction);
          if (iLogIt)
            DG.logUser("rescaleBinnedPlot");
        },

        /**
         @override
         @param iPlace { DG.GraphTypes.EPlace }
         @return{ {min:{Number}, max:{Number} isDataInteger:{Boolean}} }
         */
        getDataMinAndMaxForDimension: function (iPlace) {
          if( iPlace === this.get('secondaryAxisPlace')) {
            return {
              min: 0,
              max: this.get('maxBinCount'),
              isDataInteger: true
            };
          }
          else if( iPlace === this.get('primaryAxisPlace')) {
            return {
              min: this.get('leastBinEdge'),
              max: this.get('maxBinEdge')
            };
          }
        },

        /**
         * Change the value corresponding to the given key
         * @param iKey {String} Should be 'displayAsBinned'
         * @param iValue {Boolean}
         * @param iParamString {String}
         */
        changeBinParam: function( iKey, iValue, iParamString) {
          var tInitialValue = this.get(iKey);
          DG.UndoHistory.execute(DG.Command.create({
            name: "graph.changeBinParam",
            undoString: 'DG.Undo.graph.' + iParamString,
            redoString: 'DG.Redo.graph.' + iParamString,
            log: ("change %@ from %@ to %@").fmt(iKey, tInitialValue, iValue),
            executeNotification: {
              action: 'notify',
              resource: 'component',
              values: {
                operation: 'change bin parameter',
                type: 'DG.GraphView'
              }
            },
            execute: function() {
              this.set(iKey, iValue);
            }.bind(this),
            undo: function() {
              this.set(iKey, tInitialValue);
            }.bind(this)
          }));
        },

        toggleDotsAreFused: function() {
          var tDotsStartOutFused = this.get('dotsAreFused'),
              tUndo = tDotsStartOutFused ? 'DG.Undo.graph.dissolveRectanglesToDots' :
                  'DG.Undo.graph.fuseDotsToRectangles',
              tRedo = tDotsStartOutFused ? 'DG.Redo.graph.dissolveRectanglesToDots' :
                  'DG.Redo.graph.fuseDotsToRectangles';
          DG.UndoHistory.execute(DG.Command.create({
            name: "graph.changeDotPlotModelType",
            undoString: tUndo,
            redoString: tRedo,
            log: ("toggleShowAs: %@").fmt(tDotsStartOutFused ? "Histogram" : "BinnedDotPlot"),
            executeNotification: {
              action: 'notify',
              resource: 'component',
              values: {
                operation: 'toggle between histogram and dots',
                type: 'DG.GraphView'
              }
            },
            execute: function() {
              this.toggleProperty('dotsAreFused');
            }.bind(this),
            undo: function() {
              this.execute();
            }
          }));
        },

        checkboxDescriptions: function () {
          return sc_super();
        }.property(),

        lastConfigurationControls: function () {
          var this_ = this,
              tControls = sc_super(),
              kRowHeight = 18;

          [ {
              label: 'DG.Inspector.graphBinWidth', key: 'width', paramString: 'changeBinWidth'
            },
            {
              label: 'DG.Inspector.graphAlignment', key: 'alignment', paramString: 'changeBinAlignment'
            }].forEach(function (iInfo) {
            tControls.push(
                SC.View.create({
                  layout: {height: kRowHeight},
                  init: function () {
                    sc_super();
                    this.appendChild(SC.LabelView.create({
                      layout: {height: kRowHeight},
                      value: iInfo.label,
                      localize: true
                    }));
                    this.appendChild(SC.TextFieldView.create({
                      classNames: 'dg-inspector-textentry',
                      layout: {height: kRowHeight, width: 40, right: 0},
                      applyImmediately: false,
                      value: this_.get(iInfo.key),
                      valueDidChange: function () {
                        var tNewValue = Number(this.get('value')),
                            tCurrentValue = this_.get(iInfo.key);
                        if(isNaN(tNewValue) || (tNewValue <= 0 && iInfo.key === 'width')) {
                          this.set('value', tCurrentValue);
                        }
                        else if( tNewValue !== tCurrentValue)
                          this_.changeBinParam(iInfo.key, tNewValue, iInfo.paramString);
                      }.observes('value')
                    }));
                  }
                })
            );
          });
          if( this.get('secondaryVarID') === DG.Analysis.kNullAttribute) {
            tControls.push(SC.CheckboxView.create({
              layout: {height: kRowHeight},
              title: 'DG.Inspector.graphBarChart',
              classNames: 'dg-graph-fuse-check'.w(),
              value: this_.get('dotsAreFused'),
              valueDidChange: function () {
                this_.toggleDotsAreFused();
                DG.mainPage.mainPane.hideInspectorPicker();
              }.observes('value'),
              localize: true
            }));
          }

          return tControls;
        }.property('plot'),

        /**
         * Create the model data to save with document.
         * Derived plot models will add to this storage.
         * @return {Object} the saved data.
         */
        createStorage: function () {
          var tStorage = sc_super();

          ['width', 'alignment', 'dotsAreFused', 'totalNumberOfBins'].forEach( function( iProp) {
            tStorage[iProp] = this.get(iProp);
          }.bind( this));

          return tStorage;
        },

        /**
         * @param iStorage
         */
        restoreStorage: function (iStorage) {
          sc_super();
          this.restoreInProgress = true;
          ['width', 'alignment', 'dotsAreFused', 'totalNumberOfBins'].forEach( function( iProp) {
            if (!SC.none(iStorage[iProp])) {
              this.set( iProp, iStorage[iProp]);
            }
          }.bind( this));
        }

      };
    }())
);

/**
 class method called before plot creation to make sure roles are correct
 @param iConfig {DG.GraphDataConfiguration}
 */
DG.BinnedPlotModel.configureRoles = function (iConfig) {
  // Base class has method for this
  DG.UnivariatePlotModel.configureRoles(iConfig);
};
