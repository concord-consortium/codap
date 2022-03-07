// ==========================================================================
//                            DG.UnivariatePlotModel
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

sc_require('components/graph/plots/plot_model');
sc_require('components/graph/plots/numeric_plot_model_mixin');

/** @class  DG.UnivariatePlotModel The model for a dot plot.

 @extends SC.PlotModel
 */
DG.UnivariatePlotModel = DG.PlotModel.extend(DG.NumericPlotModelMixin,
    /** @scope DG.UnivariatePlotModel.prototype */
    {
      /**
       * Originally a boolean; extended to support line/bar plot
       * @property {Boolean | "bars"}
       */
      displayAsBinned: null,

      /**
       @property{Number}
       */
      primaryVarID: function () {
        return (this.get('primaryAxisPlace') === DG.GraphTypes.EPlace.eX) ?
            this.get('xVarID') : this.get('yVarID');
      }.property('primaryAxisPlace', 'xVarID', 'yVarID')/*.cacheable()*/,

      /**
       @property{DG.GraphTypes.EPlace}
       */
      primaryAxisPlace: function () {
        var dataConfiguration = this.get('dataConfiguration');
        return dataConfiguration && dataConfiguration.getPlaceForRole(DG.Analysis.EAnalysisRole.ePrimaryNumeric);
      }.property('xVarID', 'yVarID')/*.cacheable()*/,

      /**
       @property{DG.GraphTypes.EPlace}
       */
      secondaryAxisPlace: function () {
        var dataConfiguration = this.get('dataConfiguration');
        return dataConfiguration && dataConfiguration.getPlaceForRole(DG.Analysis.EAnalysisRole.eSecondaryCategorical);
      }.property('xVarID', 'yVarID')/*.cacheable()*/,

      /**
       @property{DG.CellLinearAxisModel}
       */
      primaryAxisModel: function () {
        return this.getAxisForPlace(this.get('primaryAxisPlace'));
      }.property('primaryAxisPlace', 'xAxis', 'yAxis')/*.cacheable()*/,

      /**
       @property{DG.CellLinearAxisModel}
       */
      secondaryAxisModel: function () {
        return this.getAxisForPlace(this.get('secondaryAxisPlace'));
      }.property('secondaryAxisPlace', 'xAxis', 'yAxis')/*.cacheable()*/,

      /**
       'vertical' means the stacks of dots are vertical, while 'horizontal' means they are horizontal
       @property{String}
       */
      orientation: function () {
        return (this.get('primaryAxisPlace') === DG.GraphTypes.EPlace.eX) ? DG.GraphTypes.EOrientation.kVertical :
            DG.GraphTypes.EOrientation.kHorizontal;
      }.property('primaryAxisPlace'),

      destroy: function() {
        this.invalidateComputationContext();
        sc_super();
      },

      handleDataConfigurationChange: function ( iKey) {
        if (!DG.assert(!this.get('isDestroyed'), "DG.DotPlotModel.handleDataConfiguration() shouldn't be triggered after destroy()!"))
          return;
        sc_super();
        var kAnimate = true, kDontLog = false;
        this.rescaleAxesFromData( iKey !== 'hiddenCases', kAnimate, kDontLog);
        this.updateAdornmentModels();
      },

      /**
       * @param iKey {String} If present, the property that changed to bring about this call
       Subclasses may override
       Called when attribute configuration changes occur, for instance.
       */
      invalidateCaches: function ( iKey) {
        sc_super();
        this.invalidateComputationContext();
      },

      /**
       * If SC's property caching worked the way we would like it to, we wouldn't need this private property.
       * As it is, we store a cached computation context here, nulling it out by hand when caches must be
       * invalidated.
       */
      _cachedComputationContext: null,

      /**
       * Caching this computation context allows us to save a lot of 'gets'
       * @property{Object}
       */
      computationContext: function() {
        if( !this._cachedComputationContext) {
          this._cachedComputationContext = {
            primaryAxis: this.get('primaryAxisModel'),
            secondaryAxis: this.get('secondaryAxisModel'),
            primaryVarID: this.get('primaryVarID'),
            secondaryVarID: this.get('secondaryVarID'),
            legendVarID: this.get('legendVarID')
          };
        }
        return this._cachedComputationContext;
      }.property('primaryAxisModel', 'secondaryAxisModel', 'primaryVarID', 'secondaryVarID', 'legendVarID' ),

      invalidateComputationContext: function() {
        this._cachedComputationContext = null;
      }.observes('primaryAxisModel', 'secondaryAxisModel', 'primaryVarID', 'secondaryVarID', 'legendVarID' ),

      doForOneCase: function( iCase, iIndex, iCC, iDoF) {
        var tPrimaryVal = iCase.getValue( iCC.primaryVarID),
            tPrimaryIsValid = SC.none( iCC.primaryVarID) || !SC.none( tPrimaryVal),
            tSecondaryVal = iCase.getValue( iCC.secondaryVarID),
            tSecondaryIsValid = SC.none( iCC.secondaryVarID) || !SC.none( tSecondaryVal),
            tPrimaryCell, tSecondaryCell;
        if( tPrimaryIsValid && tSecondaryIsValid) {
          tPrimaryCell = iCC.primaryAxis.valueToCellNumber( tPrimaryVal);
          tSecondaryCell = iCC.secondaryAxis.cellNameToCellNumber( tSecondaryVal);
          iDoF( iCase, iIndex, tPrimaryCell, tSecondaryCell);
        }
      },

      /**
       Call the given function once for each case that has a value for each axis.
       function signature for iDoF is { iCase, iCaseIndex, iPrimaryCellIndex, iSecondaryCellIndex }
       */
      forEachBivariateCaseDo: function( iDoF, iForSelectionOnly) {
        var tCases = iForSelectionOnly ? this.get('selection') : this.get('cases'),
            tCC = this.get('computationContext');
        if( !tCC.primaryAxis || !tCases || !tCC.secondaryAxis)
          return; // Can happen during transitions. Bail!
        tCases.forEach( function( iCase, iIndex) {
          this.doForOneCase( iCase, iIndex, tCC, iDoF);
        }.bind(this));
      },

      /**
       * Get an array of non-missing case counts in each axis cell.
       * Also cell index on primary and secondary axis, with primary axis as major axis.
       * @return {Array} [{count, primaryCell, secondaryCell},...] (all values are integers 0+).
       */
      getCellCaseCounts: function ( iForSelectionOnly) {
        var tNumericAxisModel = this.get('primaryAxisModel'),
            tCategoricalAxisModel = this.get('secondaryAxisModel'),
            tValueArray = [];

        if (!( tCategoricalAxisModel && tNumericAxisModel )) {
          return tValueArray; // too early to recompute, caller must try again later.
        }

        var tNumCatCells = tCategoricalAxisModel.get('numberOfCells'),
            tNumNumericCells = tNumericAxisModel.get('numberOfCells'),
            tNumCells = tNumCatCells * tNumNumericCells,
            tCellIndex;

        // initialize the values
        for (var i = 0; i < tNumCells; ++i) {
          tValueArray.push({count: 0, selectedCount: 0, primaryCell: Math.floor( i / tNumCatCells),
            secondaryCell: i % tNumCatCells });
        }

        // compute count of cases in each cell, excluding missing values
        this.forEachBivariateCaseDo( function( iCase, iIndex, iPrimaryCell, iSecondaryCell) {
          tCellIndex = iPrimaryCell*tNumCatCells + iSecondaryCell;
          if( isFinite( tCellIndex) && DG.MathUtilities.isInIntegerRange( tCellIndex, 0, tNumCells )) {
            var iValue = tValueArray[ tCellIndex ];
            iValue.count += 1;
            DG.assert( iValue.primaryCell === (iPrimaryCell || 0), "primary cell index error in DG.UnivariatePlotModel.getCellCaseCounts()" );
            DG.assert( iValue.secondaryCell === (iSecondaryCell || 0), "secondary cell index error in DG.UnivariatePlotModel.getCellCaseCounts()" );
          }
        });

        if( iForSelectionOnly) {
          // compute count of selected cases in each cell, excluding missing values
          this.forEachBivariateCaseDo(function (iCase, iIndex, iPrimaryCell, iSecondaryCell) {
            tCellIndex = iPrimaryCell * tNumCatCells + iSecondaryCell;
            if (isFinite(tCellIndex) && DG.MathUtilities.isInIntegerRange(tCellIndex, 0, tNumCells)) {
              var iValue = tValueArray[tCellIndex];
              iValue.selectedCount += 1;
            }
          }, iForSelectionOnly);
        }

        return tValueArray;
      },

      /**
       * A dot plot can be configured as a binned chart
       * @property {Boolean}
       */
      canSupportConfigurations: function() {
        return true;
      }.property(),

      configurationDescriptions: function() {
        var this_ = this,
            kRowHeight = 20,
            tDescriptions = sc_super();
        tDescriptions.push(
            {
              constructorClass: SC.RadioView,
              properties:
                {
                  layout: { height: 3 * kRowHeight },
                  items: [
                    {
                      title: 'DG.Inspector.graphPlotPoints'.loc(),
                      value: false, // was originally a boolean
                      enabled: YES
                    },
                    {
                      title: 'DG.Inspector.graphGroupIntoBins'.loc(),
                      value: true,  // was originally a boolean
                      enabled: YES
                    },
                    {
                      title: 'DG.Inspector.graphBarForEachPoint'.loc(),
                      value: 'bars',
                      enabled: YES
                    }
                  ],
                  value: this_.get('displayAsBinned'),
                  valueDidChange: function () {
                    var value = this.get('value');
                    this_.set('displayAsBinned', value);
                    DG.mainPage.mainPane.hideInspectorPicker();
                  }.observes('value'),
                  itemTitleKey: 'title',
                  itemValueKey: 'value',
                  itemIsEnabledKey: 'enabled',
                  isEnabled: YES,
                  layoutDirection: SC.LAYOUT_VERTICAL
                }
            }
        );
        return tDescriptions;
      }.property(),

    });

/**
 class method called before plot creation to make sure roles are correct
 @param {DG.GraphDataConfiguration}
 */
DG.UnivariatePlotModel.configureRoles = function (iConfig) {
  var tXType = iConfig.get('xType'),
      tXIsNumeric = tXType === DG.Analysis.EAttributeType.eNumeric ||
          tXType === DG.Analysis.EAttributeType.eDateTime,
      tAxisKey = tXIsNumeric ? 'x' : 'y',
      tOtherAxisKey = (tAxisKey === 'x') ? 'y' : 'x';
  iConfig.setPath(tAxisKey + 'AttributeDescription.role',
      DG.Analysis.EAnalysisRole.ePrimaryNumeric);
  iConfig.setPath(tOtherAxisKey + 'AttributeDescription.role',
      DG.Analysis.EAnalysisRole.eSecondaryCategorical);
};
