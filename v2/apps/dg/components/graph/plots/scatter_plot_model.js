// ==========================================================================
//                        DG.ScatterPlotModel
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

sc_require('components/graph/plots/plot_model');
sc_require('components/graph/plots/numeric_plot_model_mixin');

/** @class  DG.ScatterPlotModel

 @extends DG.PlotModel
 */
DG.ScatterPlotModel = DG.PlotModel.extend(DG.NumericPlotModelMixin,
    /** @scope DG.ScatterPlotModel.prototype */
    {
      /**
       *
       * @param iPlace {DG.GraphTypes.EPlace}
       * @return { class }
       */
      getDesiredAxisClassFor: function( iPlace) {
        if( iPlace === DG.GraphTypes.EPlace.eX || iPlace === DG.GraphTypes.EPlace.eY)
          return DG.CellLinearAxisModel;
        else if(iPlace === DG.GraphTypes.EPlace.eY2) {
          return (this.getPath('dataConfiguration.y2AttributeID') === DG.Analysis.kNullAttribute) ?
              DG.AxisModel : DG.CellLinearAxisModel;
        }
      },

      /**
       @property { DG.MovablePointModel }
       */
      movablePoint: null,

      /**
       @property { Boolean }
       */
      isMovablePointVisible: function () {
        return !SC.none(this.movablePoint) && this.movablePoint.get('isVisible');
      }.property(),
      isMovablePointVisibleDidChange: function() {
        this.notifyPropertyChange('isMovablePointVisible');
      }.observes('*movablePoint.isVisible'),

      /**
       @property { DG.MovableLineModel }
       */
      movableLine: null,

      /**
       @property { Boolean, read only }
       */
      isMovableLineVisible: function () {
        return !SC.none(this.movableLine) && this.movableLine.get('isVisible');
      }.property(),
      isMovableLineVisibleDidChange: function() {
        this.notifyPropertyChange('isMovableLineVisible');
      }.observes('*movableLine.isVisible'),

      /**
       @property { DG.MultipleLSRLsModel }
       */
      multipleLSRLs: null,

      /**
       @property { Boolean, read only }
       */
      isLSRLVisible: function () {
        return !SC.none(this.multipleLSRLs) && this.multipleLSRLs.get('isVisible');
      }.property(),
      isLSRLVisibleDidChange: function() {
        this.notifyPropertyChange('isLSRLVisible');
      }.observes('*multipleLSRLs.isVisible'),

      /**
       @property { Boolean }
       */
      isInterceptLocked: function ( iKey, iValue) {
        if( !SC.none( iValue)) {
          this.setPath('movableLine.isInterceptLocked', iValue);
          this.setPath('multipleLSRLs.isInterceptLocked', iValue);
        }
        return !SC.none(this.movableLine) && this.movableLine.get('isInterceptLocked') ||
            !SC.none(this.multipleLSRLs) && this.multipleLSRLs.get('isInterceptLocked');
      }.property(),
      isInterceptLockedDidChange: function() {
        this.notifyPropertyChange('isInterceptLocked');
      }.observes('*movableLine.isInterceptLocked', '*multipleLSRLs.isInterceptLocked'),

      /**
       @property { Boolean }
       */
      areSquaresVisible: false,

      /**
       * Used for notification
       * @property{}
       */
      squares: null,

      init: function() {
        sc_super();
        this.addObserver('movableLine.slope',this.lineDidChange);
        this.addObserver('movableLine.intercept',this.lineDidChange);
      },

      destroy: function() {
        this.removeObserver('movableLine.slope',this.lineDidChange);
        this.removeObserver('movableLine.intercept',this.lineDidChange);
        sc_super();
      },

      dataConfigurationDidChange: function() {
        sc_super();
        var tDataConfiguration = this.get('dataConfiguration');
        if( tDataConfiguration) {
          tDataConfiguration.set('sortCasesByLegendCategories', false);
          // This is a cheat. The above line _should_ bring this about, but I couldn't make it work properly
          tDataConfiguration.invalidateCaches();
        }
      }.observes('dataConfiguration'),

      /**
       Returns true if the plot is affected by the specified change such that
       a redraw is required, false otherwise.
       @param    {Object}    iChange -- The change request to/from the DataContext
       @returns  {Boolean}   True if the plot must redraw, false if it is unaffected
       */
      isAffectedByChange: function (iChange) {
        if (!iChange || !iChange.operation) return false;
        return sc_super() ||
            (this.isAdornmentVisible('connectingLine') &&
                (iChange.operation === 'moveAttribute' || iChange.operation === 'moveCases'));
      },

      /**
       * Used for notification
       */
      lineDidChange: function () {
        SC.run(function() {
          this.notifyPropertyChange('squares');
        }.bind(this));
      },

      /**
       * Utility function to create a movable line when needed
       */
      createMovablePoint: function () {
        if (SC.none(this.movablePoint)) {
          this.beginPropertyChanges();
          this.set('movablePoint', DG.MovablePointModel.create( {
            plotModel: this
          }));
          this.movablePoint.recomputeCoordinates(this.get('xAxis'), this.get('yAxis'));
          this.endPropertyChanges();
        }
      },

      /**
       * Utility function to create a movable line when needed
       */
      createMovableLine: function () {
        if (SC.none(this.movableLine)) {
          this.beginPropertyChanges();
          this.set('movableLine', DG.MovableLineModel.create( {
            plotModel: this,
            showSumSquares: this.get('areSquaresVisible')
          }));
          this.movableLine.recomputeSlopeAndIntercept(this.get('xAxis'), this.get('yAxis'));
          this.endPropertyChanges();
        }
      },

      squaresVisibilityChanged: function() {
        var tMovableLine = this.get('movableLine'),
            tMultipleLSRLs = this.get('multipleLSRLs'),
            tSquaresVisible = this.get('areSquaresVisible');
        if( tMovableLine)
            tMovableLine.set('showSumSquares', tSquaresVisible);
        if( tMultipleLSRLs)
            tMultipleLSRLs.set('showSumSquares', tSquaresVisible);
      }.observes('areSquaresVisible'),

      enableMeasuresForSelectionDidChange: function(){
        sc_super();
        this.setPath('multipleLSRLs.enableMeasuresForSelection', this.get('enableMeasuresForSelection'));
      }.observes('enableMeasuresForSelection'),

      /**
       If we need to make a movable line, do so. In any event toggle its visibility.
       */
      toggleMovablePoint: function () {
        var this_ = this;

        function toggle() {

          function doToggle( iPlot) {
            if (SC.none(iPlot.movablePoint)) {
              iPlot.createMovablePoint(); // Default is to be visible
            }
            else {
              iPlot.movablePoint.recomputePositionIfNeeded(iPlot.get('xAxis'), iPlot.get('yAxis'));
              iPlot.movablePoint.set('isVisible', !iPlot.movablePoint.get('isVisible'));
            }
          }

          doToggle( this_);
          this_.get('siblingPlots').forEach( doToggle);
        }

        var willShow = !this.movablePoint || !this.movablePoint.get('isVisible');
        DG.UndoHistory.execute(DG.Command.create({
          name: "graph.toggleMovablePoint",
          undoString: (willShow ? 'DG.Undo.graph.showMovablePoint' : 'DG.Undo.graph.hideMovablePoint'),
          redoString: (willShow ? 'DG.Redo.graph.showMovablePoint' : 'DG.Redo.graph.hideMovablePoint'),
          log: "toggleMovablePoint: %@".fmt(willShow ? "show" : "hide"),
          executeNotification: {
            action: 'notify',
            resource: 'component',
            values: {
              operation: 'toggle movable point',
              type: 'DG.GraphView'
            }
          },
          execute: function () {
            toggle();
          },
          undo: function () {
            toggle();
          }
        }));
      },

      /**
       If we need to make a movable line, do so. In any event toggle its visibility.
       */
      toggleMovableLine: function () {
        var this_ = this;

        function toggle() {

          function doToggle(iPlot) {
            if (SC.none(iPlot.movableLine)) {
              iPlot.createMovableLine(); // Default is to be visible
            }
            else {
              iPlot.movableLine.recomputeSlopeAndInterceptIfNeeded(iPlot.get('xAxis'), iPlot.get('yAxis'));
              iPlot.movableLine.set('isVisible', !iPlot.movableLine.get('isVisible'));
            }
          }

          doToggle( this_);
          this_.get('siblingPlots').forEach( doToggle);
        }

        var willShow = !this.movableLine || !this.movableLine.get('isVisible');
        DG.UndoHistory.execute(DG.Command.create({
          name: "graph.toggleMovableLine",
          undoString: (willShow ? 'DG.Undo.graph.showMovableLine' : 'DG.Undo.graph.hideMovableLine'),
          redoString: (willShow ? 'DG.Redo.graph.showMovableLine' : 'DG.Redo.graph.hideMovableLine'),
          log: "toggleMovableLine: %@".fmt(willShow ? "show" : "hide"),
          executeNotification: {
            action: 'notify',
            resource: 'component',
            values: {
              operation: 'toggle movable line',
              type: 'DG.GraphView'
            }
          },
          execute: function () {
            toggle();
          },
          undo: function () {
            toggle();
          }
        }));
      },

      /**
       * Utility function to create the multipleLSRLs object when needed
       */
      createLSRLLines: function () {
        if (SC.none(this.multipleLSRLs)) {
          this.set('multipleLSRLs', DG.MultipleLSRLsModel.create( {
            plotModel: this,
            showSumSquares: this.get('areSquaresVisible'),
            isInterceptLocked: this.get('isInterceptLocked'),
            enableMeasuresForSelection: this.get('enableMeasuresForSelection')
          }));
          this.setPath('multipleLSRLs.isVisible', true);
        }
      },

      /**
       If we need to make a movable line, do so. In any event toggle its visibility.
       */
      toggleLSRLLine: function () {
        var this_ = this;

        function toggle() {

          function doToggle( iPlot) {
            if (SC.none(iPlot.get('multipleLSRLs'))) {
              iPlot.createLSRLLines();
            }
            else {
              iPlot.setPath('multipleLSRLs.isVisible', !iPlot.getPath('multipleLSRLs.isVisible'));
            }
          }

          doToggle( this_);
          this_.get('siblingPlots').forEach( doToggle);
        }

        var willShow = !this.multipleLSRLs || !this.multipleLSRLs.get('isVisible');
        DG.UndoHistory.execute(DG.Command.create({
          name: "graph.toggleLSRLLine",
          undoString: (willShow ? 'DG.Undo.graph.showLSRL' : 'DG.Undo.graph.hideLSRL'),
          redoString: (willShow ? 'DG.Redo.graph.showLSRL' : 'DG.Redo.graph.hideLSRL'),
          log: "toggleLSRL: %@".fmt(willShow ? "show" : "hide"),
          executeNotification: {
            action: 'notify',
            resource: 'component',
            values: {
              operation: 'toggle LSRL',
              type: 'DG.GraphView'
            }
          },
          execute: function () {
            toggle();
          },
          undo: function () {
            toggle();
          }
        }));
      },

      /**
       If we need to make a movable line, do so. In any event toggle whether its intercept is locked.
       */
      toggleInterceptLocked: function () {
        var this_ = this;

        function toggle() {

          function doToggle( iPlot) {
            if (!SC.none(iPlot.movableLine)) {
              iPlot.movableLine.toggleInterceptLocked();
              iPlot.movableLine.recomputeSlopeAndInterceptIfNeeded(iPlot.get('xAxis'), iPlot.get('yAxis'));
            }
            if (!SC.none(iPlot.multipleLSRLs)) {
              iPlot.multipleLSRLs.toggleInterceptLocked();
            }
          }

          doToggle( this_);
          this_.get('siblingPlots').forEach( doToggle);
        }

        function gatherUndoData() {

          function doGatherUndoData( iPlot) {
            tResult.push( {
              movableLine: iPlot.movableLine ? iPlot.movableLine.createStorage() : null,
              lsrlStorage: iPlot.multipleLSRLs ? iPlot.multipleLSRLs.createStorage() : null
            });
          }

          var tResult = [];
          doGatherUndoData( this_);
          this_.get('siblingPlots').forEach( doGatherUndoData);
          return tResult;
        }

        function restoreFromUndoData( iUndoData) {

          function doRestoreFromUndoData( iPlot, iIndexMinusOne) {
            var tUndoData = iUndoData[ iIndexMinusOne + 1];
            if( iPlot.movableLine)
              iPlot.movableLine.restoreStorage(tUndoData.movableLine);
            if( iPlot.multipleLSRLs)
              iPlot.multipleLSRLs.restoreStorage(tUndoData.lsrlStorage);
          }

          doRestoreFromUndoData( this_, -1);
          this_.get('siblingPlots').forEach( doRestoreFromUndoData);
        }

        var willLock = (this.movableLine && !this.movableLine.get('isInterceptLocked')) ||
                      (this.multipleLSRLs && !this.multipleLSRLs.get('isInterceptLocked'));
        DG.UndoHistory.execute(DG.Command.create({
          name: "graph.toggleLockIntercept",
          undoString: (willLock ? 'DG.Undo.graph.lockIntercept' : 'DG.Undo.graph.unlockIntercept'),
          redoString: (willLock ? 'DG.Redo.graph.lockIntercept' : 'DG.Redo.graph.unlockIntercept'),
          log: "lockIntercept: %@".fmt(willLock),
          executeNotification: {
            action: 'notify',
            resource: 'component',
            values: {
              operation: 'toggle lock intercept',
              type: 'DG.GraphView'
            }
          },
          execute: function () {
            this._undoData = gatherUndoData();
            toggle();
          },
          undo: function () {
            restoreFromUndoData( this._undoData);
            this._undoData = null;
          }
        }));
      },

      /**
       If we need to make a plotted function, do so. In any event toggle its visibility.
       */
      togglePlotFunction: function () {
        var this_ = this;

        function toggle() {

          function doToggle( iPlot) {
            iPlot.toggleAdornmentVisibility('plottedFunction', 'togglePlotFunction');
          }

          this_.get('siblingPlots').forEach( doToggle);
          doToggle( this_);
        }

        function connectFunctions() {
          var tSiblingPlots = this_.get('siblingPlots'),
              tMasterPlottedFunction = this_.getAdornmentModel('plottedFunction');
          tMasterPlottedFunction.set('siblingPlottedFunctions',
              tSiblingPlots.map( function( iPlot) {
                return iPlot.getAdornmentModel( 'plottedFunction');
              }));
        }

        var willShow = !this.isAdornmentVisible('plottedFunction');
        DG.UndoHistory.execute(DG.Command.create({
          name: "graph.togglePlotFunction",
          undoString: (willShow ? 'DG.Undo.graph.showPlotFunction' : 'DG.Undo.graph.hidePlotFunction'),
          redoString: (willShow ? 'DG.Redo.graph.showPlotFunction' : 'DG.Redo.graph.hidePlotFunction'),
          log: "togglePlotFunction: %@".fmt(willShow ? "show" : "hide"),
          executeNotification: {
            action: 'notify',
            resource: 'component',
            values: {
              operation: 'toggle plot function',
              type: 'DG.GraphView'
            }
          },
          execute: function () {
            toggle();
            connectFunctions();
          },
          undo: function () {
            toggle();
            this_.getAdornmentModel('plottedFunction').set('siblingPlottedFunctions', null);
          }
        }));
      },

      /**
       If we need to make a connecting line, do so. In any event toggle its visibility.
       */
      toggleConnectingLine: function () {
        var this_ = this;

        function toggle() {

          function doToggle( iPlot) {
            var tAdornModel = iPlot.toggleAdornmentVisibility('connectingLine', 'toggleConnectingLine');
            if (tAdornModel && tAdornModel.get('isVisible'))
              tAdornModel.recomputeValue(); // initialize
          }

          doToggle( this_);
          this_.get('siblingPlots').forEach( doToggle);
        }

        var willShow = !this.isAdornmentVisible('connectingLine');
        DG.UndoHistory.execute(DG.Command.create({
          name: "graph.toggleConnectingLine",
          undoString: (willShow ? 'DG.Undo.graph.showConnectingLine' : 'DG.Undo.graph.hideConnectingLine'),
          redoString: (willShow ? 'DG.Redo.graph.showConnectingLine' : 'DG.Redo.graph.hideConnectingLine'),
          log: "toggleConnectingLine: %@".fmt(willShow ? "show" : "hide"),
          executeNotification: {
            action: 'notify',
            resource: 'component',
            values: {
              operation: 'toggle connecting line',
              type: 'DG.GraphView'
            }
          },
          execute: function () {
            toggle();
          },
          undo: function () {
            toggle();
          }
        }));
      },

      /**
       * Toggle where the squares drawn from points to lines and functions are being shown
       */
      toggleShowSquares: function () {
        var this_ = this;

        function toggle() {

          function doToggle( iPlot) {
            iPlot.set('areSquaresVisible', !iPlot.get('areSquaresVisible'));
          }

          doToggle( this_);
          this_.get('siblingPlots').forEach( doToggle);
        }

        var willShow = !this.get('areSquaresVisible');
        DG.UndoHistory.execute(DG.Command.create({
          name: "graph.toggleShowSquares",
          undoString: (willShow ? 'DG.Undo.graph.showSquares' : 'DG.Undo.graph.hideSquares'),
          redoString: (willShow ? 'DG.Redo.graph.showSquares' : 'DG.Redo.graph.hideSquares'),
          log: "toggleShowSquares: %@".fmt(willShow ? "show" : "hide"),
          executeNotification: {
            action: 'notify',
            resource: 'component',
            values: {
              operation: 'toggle show squares',
              type: 'DG.GraphView'
            }
          },
          execute: function () {
            toggle();
          },
          undo: function () {
            toggle();
          }
        }));
      },

      handleDataConfigurationChange: function (iKey) {
        sc_super();
        this.rescaleAxesFromData(iKey !== 'hiddenCases', /* allow scale shrinkage */
            true /* do animation */);

        var adornmentModel = this.getAdornmentModel('connectingLine');
        if (adornmentModel) {
          adornmentModel.setComputingNeeded();  // invalidate if axis model/attribute change
        }
      },

      /**
       Each axis should rescale based on the values to be plotted with it.
       @param{Boolean} Default is false
       @param{Boolean} Default is true
       @param{Boolean} Default is false
       */
      rescaleAxesFromData: function (iAllowScaleShrinkage, iAnimatePoints, iLogIt, isUserAction) {
        if (iAnimatePoints === undefined)
          iAnimatePoints = true;
        this.doRescaleAxesFromData([DG.GraphTypes.EPlace.eX, DG.GraphTypes.EPlace.eY, DG.GraphTypes.EPlace.eY2],
            iAllowScaleShrinkage, iAnimatePoints, isUserAction);
        if (iLogIt && !isUserAction)
          DG.logUser("rescaleScatterplot");
      },

      /**
       @param{ {x: {Number}, y: {Number} } }
       @param{Number}
       */
      dilate: function (iFixedPoint, iFactor) {
        this.doDilation([DG.GraphTypes.EPlace.eX, DG.GraphTypes.EPlace.eY], iFixedPoint, iFactor);
      },

      /**
       * Return a list of objects { key, class, useAdornmentModelsArray, storage }
       * Subclasses should override calling sc_super first.
       * @return {[Object]}
       */
      getAdornmentSpecs: function() {
        var tSpecs = sc_super(),
        this_ = this;
        ['movablePoint', 'movableLine', 'multipleLSRLs'].forEach( function( iKey) {
          var tAdorn = this_.get( iKey);
          if (tAdorn)
            tSpecs.push({
              key: iKey,
              "class": tAdorn.constructor,
              useAdornmentModelsArray: false,
              storage: tAdorn.createStorage()
            });
        });
        DG.ObjectMap.forEach( this._adornmentModels, function( iKey, iAdorn) {
          tSpecs.push( {
            key: iKey,
            "class": iAdorn.constructor,
            useAdornmentModelsArray: true,
            storage: iAdorn.createStorage()
          });
        });
        return tSpecs;
      },

      /**
       * Base class will do most of the work. We just have to finish up setting the axes.
       * @param {DG.PlotModel} iSourcePlot
       */
      installAdornmentModelsFrom: function( iSourcePlot) {
        sc_super();
        var tMovablePoint = this.get('movablePoint');
        if (tMovablePoint) {
          tMovablePoint.set('xAxis', this.get('xAxis'));
          tMovablePoint.set('yAxis', this.get('yAxis'));
          tMovablePoint.recomputeCoordinates(this.get('xAxis'), this.get('yAxis'));
        }
        var tMultipleLSRLs = this.get('multipleLSRLs');
        if (tMultipleLSRLs) {
          tMultipleLSRLs.recomputeSlopeAndInterceptIfNeeded(this.get('xAxis'), this.get('yAxis'));
        }
      },

      checkboxDescriptions: function () {
        var this_ = this;
        return sc_super().concat([
          {
            title: 'DG.Inspector.graphConnectingLine',
            value: this_.isAdornmentVisible('connectingLine'),
            classNames: 'dg-graph-connectingLine-check'.w(),
            valueDidChange: function () {
              this_.toggleConnectingLine();
            }.observes('value')
          },
          {
            title: 'DG.Inspector.graphMovablePoint',
            value: this_.get('isMovablePointVisible'),
            classNames: 'dg-graph-movablePoint-check'.w(),
            valueDidChange: function () {
              this_.toggleMovablePoint();
            }.observes('value')
          },
          {
            title: 'DG.Inspector.graphMovableLine',
            value: this_.get('isMovableLineVisible'),
            classNames: 'dg-graph-movableLine-check'.w(),
            valueDidChange: function () {
              this_.toggleMovableLine();
            }.observes('value')
          },
          {
            title: 'DG.Inspector.graphLSRL',
            value: this_.get('isLSRLVisible'),
            classNames: 'dg-graph-lsrl-check'.w(),
            valueDidChange: function () {
              this_.toggleLSRLLine();
            }.observes('value')
          },
          {
            title: 'DG.Inspector.graphInterceptLocked',
            classNames: 'dg-graph-interceptLocked-check'.w(),
            _changeInProgress: true,
            valueDidChange: function () {
              if( !this._changeInProgress)
                this_.toggleInterceptLocked();
            }.observes('value'),
            lineVisibilityChanged: function() {
              this._changeInProgress = true;
              var tLineIsVisible = this_.get('isMovableLineVisible') || this_.get('isLSRLVisible');
              if( !tLineIsVisible)
                this_.set('isInterceptLocked', false);
              this.set('value', this_.get('isInterceptLocked'));
              this.set('isEnabled', tLineIsVisible);
              this._changeInProgress = false;
            },
            init: function() {
              sc_super();
              this.lineVisibilityChanged();
              this_.addObserver('isMovableLineVisible', this, 'lineVisibilityChanged');
              this_.addObserver('isLSRLVisible', this, 'lineVisibilityChanged');
              this._changeInProgress = false;
            },
            destroy: function() {
              this_.removeObserver('isMovableLineVisible', this, 'lineVisibilityChanged');
              this_.removeObserver('isLSRLVisible', this, 'lineVisibilityChanged');
              sc_super();
            }
          },
          {
            title: 'DG.Inspector.graphPlottedFunction',
            value: this_.isAdornmentVisible('plottedFunction'),
            classNames: 'dg-graph-plottedFunction-check'.w(),
            valueDidChange: function () {
              this_.togglePlotFunction();
            }.observes('value')
          },
          {
            title: 'DG.Inspector.graphPlottedValue',
            value: this_.isAdornmentVisible('plottedValue'),
            classNames: 'dg-graph-plottedValue-check'.w(),
            valueDidChange: function () {
              this_.togglePlotValue();
            }.observes('value')
          },
          {
            title: 'DG.Inspector.graphSquares',
            value: this_.get('areSquaresVisible'),
            classNames: 'dg-graph-squares-check'.w(),
            lineVisibilityChanged: function() {
              var tLineIsVisible = this_.get('isMovableLineVisible') || this_.get('isLSRLVisible');
              this.set('isEnabled', tLineIsVisible);
              if( this_.get('areSquaresVisible') && !tLineIsVisible)
                this.set('value', false);
            },
            init: function() {
              sc_super();
              this.lineVisibilityChanged();
              this_.addObserver('isMovableLineVisible', this, 'lineVisibilityChanged');
              this_.addObserver('isLSRLVisible', this, 'lineVisibilityChanged');
            },
            destroy: function() {
              this_.removeObserver('isMovableLineVisible', this, 'lineVisibilityChanged');
              this_.removeObserver('isLSRLVisible', this, 'lineVisibilityChanged');
            },
            valueDidChange: function () {
              this_.toggleShowSquares();
            }.observes('value')
          }
        ]);
      }.property(),

      /**
       * When making a copy of a plot (e.g. for use in split) the returned object
       * holds those properties that should be assigned to the copy.
       * @return {{}}
       */
      getPropsForCopy: function() {
        var tResult = sc_super();
        return $.extend( tResult, {
          areSquaresVisible: this.get('areSquaresVisible')
        });
      },

      /**
       * @return { Object } with properties specific to a given subclass
       */
      createStorage: function () {
        var tStorage = sc_super(),
            tMovablePoint = this.get('movablePoint'),
            tMovableLine = this.get('movableLine'),
            tLSRL = this.get('multipleLSRLs');
        if (!SC.none(tMovablePoint))
          tStorage.movablePointStorage = tMovablePoint.createStorage();
        if (!SC.none(tMovableLine))
          tStorage.movableLineStorage = tMovableLine.createStorage();
        if (!SC.none(tLSRL) && tLSRL.get('isVisible'))
          tStorage.multipleLSRLsStorage = tLSRL.createStorage();
        if (this.get('areSquaresVisible'))
          tStorage.areSquaresVisible = true;
        if (this.get('isLSRLVisible'))
          tStorage.isLSRLVisible = true;

        return tStorage;
      },

      /**
       * @param { Object } with properties specific to a given subclass
       */
      restoreStorage: function (iStorage) {

        /*  Older documents stored adornments individually in the plot model
         *  that used them, e.g. movable lines and function plots were stored
         *  here with the scatter plot model. In newer documents, there is an
         *  'adornments' property in the base class (plot model) which stores
         *  all or most of the adornments. To preserve file format compatibility
         *  we move the locally stored storage objects into the base class
         *  'adornments' property where the base class will process them when
         *  we call sc_super().
         */
        this.moveAdornmentStorage(iStorage, 'movableLine', iStorage.movableLineStorage);
        this.moveAdornmentStorage(iStorage, 'multipleLSRLs', iStorage.multipleLSRLsStorage);
        this.moveAdornmentStorage(iStorage, 'plottedFunction', iStorage.plottedFunctionStorage);

        sc_super();

        if (iStorage.movablePointStorage) {
          if (SC.none(this.movablePoint))
            this.createMovablePoint();
          this.get('movablePoint').restoreStorage(iStorage.movablePointStorage);
        }
        if (iStorage.movableLineStorage) {
          if (SC.none(this.movableLine))
            this.createMovableLine();
          this.get('movableLine').restoreStorage(iStorage.movableLineStorage);
        }
        this.areSquaresVisible = iStorage.areSquaresVisible;
        if (iStorage.multipleLSRLsStorage) {
          if (SC.none(this.multipleLSRLs))
            this.createLSRLLines();
          this.get('multipleLSRLs').restoreStorage(iStorage.multipleLSRLsStorage);
        }

        // Legacy document support
        if (iStorage.plottedFunctionStorage) {
          if (SC.none(this.plottedFunction))
            this.set('plottedFunction', DG.PlottedFunctionModel.create());
          this.get('plottedFunction').restoreStorage(iStorage.plottedFunctionStorage);
        }
      },

      onRescaleIsComplete: function () {
        if (!SC.none(this.movableLine))
          this.movableLine.recomputeSlopeAndInterceptIfNeeded(this.get('xAxis'), this.get('yAxis'));
        if (!SC.none(this.movablePoint))
          this.movablePoint.recomputePositionIfNeeded(this.get('xAxis'), this.get('yAxis'));
      },

      /**
       * Get an array of non-missing case counts in each axis cell.
       * Also cell index on primary and secondary axis, with primary axis as major axis.
       * @return {Array} [{count, primaryCell, secondaryCell},...] (all values are integers 0+).
       */
      getCellCaseCounts: function ( iForSelectionOnly) {
        var tCases = iForSelectionOnly ? this.get('selection') : this.get('cases'),
            tXVarID = this.get('xVarID'),
            tYVarID = this.get('yVarID'),
            tCount = 0,
            tValueArray = [];

        if (!( tXVarID && tYVarID )) {
          return tValueArray; // too early to recompute, caller must try again later.
        }

        // compute count and percent cases in each cell, excluding missing values
        tCases.forEach(function (iCase, iIndex) {
          var tXVal = iCase.getForcedNumericValue(tXVarID),
              tYVal = iCase.getForcedNumericValue(tYVarID);
          if (isFinite(tXVal) && isFinite(tYVal)) ++tCount;
        });

        // initialize the values for the single 'cell' of the scatterplot
        var tCell = { primaryCell: 0, secondaryCell: 0 };
        if( iForSelectionOnly)
          tCell.selectedCount = tCount;
        else
          tCell.count = tCount;
        tValueArray.push(tCell);
        return tValueArray;
      }

    });

