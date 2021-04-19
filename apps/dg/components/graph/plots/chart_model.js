// ==========================================================================
//                          DG.ChartModel
//
//  Author:   William Finzer
//
//  Copyright (c) 2017 by The Concord Consortium, Inc. All rights reserved.
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

/** @class  DG.ChartModel - The model for a plot with categorical axes

  @extends SC.Object
*/
DG.ChartModel = DG.PlotModel.extend(
/** @scope DG.ChartModel.prototype */
{

  /**
  @property{DG.GraphTypes.EPlace}
  */
  primaryAxisPlace: function() {
    var dataConfiguration = this.get('dataConfiguration');
    return dataConfiguration && dataConfiguration.getPlaceForRole( DG.Analysis.EAnalysisRole.ePrimaryCategorical);
  }.property('xVarID', 'yVarID'),

  /**
  @property{DG.GraphTypes.EPlace}
  */
  secondaryAxisPlace: function() {
    var dataConfiguration = this.get('dataConfiguration');
    return dataConfiguration && dataConfiguration.getPlaceForRole( DG.Analysis.EAnalysisRole.eSecondaryCategorical);
  }.property('xVarID', 'yVarID'),

/**
  @property{DG.CellAxisModel}
  */
  primaryAxisModel: function() {
    return this.getAxisForPlace( this.get('primaryAxisPlace'));
  }.property('primaryAxisPlace', 'xAxis', 'yAxis'),

/**
  @property{DG.CellAxisModel}
  */
  secondaryAxisModel: function() {
    return this.getAxisForPlace( this.get('secondaryAxisPlace'));
  }.property('secondaryAxisPlace', 'xAxis', 'yAxis'),

  /**
    'vertical' means the stacks of dots are vertical, while 'horizontal' means they are horizontal
    @property{String}
    */
    orientation: function() {
      return (this.get('primaryAxisPlace') === DG.GraphTypes.EPlace.eX) ? DG.GraphTypes.EOrientation.kVertical :
          DG.GraphTypes.EOrientation.kHorizontal;
    }.property(),

  /**
   * A dot chart can be configured as a bar chart
   * But (for now) not if there are categorical attributes on both x and y axes
   * @property {Boolean}
   */
  canSupportConfigurations: function() {
    return this.getPath( 'dataConfiguration.xAttributeDescription.isNull') ||
        this.getPath( 'dataConfiguration.yAttributeDescription.isNull');
  }.property(),
  canSupportConfigurationsChanged: function() {
    this.notifyPropertyChange('canSupportConfigurations');
  }.observes('dataConfiguration.xAttributeDescription.isNull', 'dataConfiguration.yAttributeDescription.isNull'),

  /**
   * @property {Boolean}
   */
  displayAsBarChart: null,

  /**
    @property{SC.Array of SC.Array of SC.Array of {theCase, caseIndex}}
  */
  cachedCells: null,

  /**
    Reverse lookup. Indexed by case index.
    @property{SC.Array of {primaryCell, primaryCell, indexInCell}}
  */
  cachedIndex: null,

  validCachedCells: function() {
    if( !this._cacheIsValid)
      this._buildCache();
    return this.get('cachedCells');
  }.property(),

  xAxisDidChange: function() {
    sc_super();
    this.invalidateCaches();
  },

  yAxisDidChange: function() {
    sc_super();
    this.invalidateCaches();
  },

  numberOfCategoriesLimitDidChange: function() {
    this.invalidateCaches();
  }.observes('*xAxis.numberOfCategoriesLimit', '*yAxis.numberOfCategoriesLimit'),

  /**
    @property{Number} The maximum number of cases in any cell
  */
  maxInCell: function() {
    if( !this._cacheIsValid)
      this._buildCache();
    return this._maxInCell;
  }.property(),

  /**
   * An array of counts, indexed by primary cell
   * @property { [Integer]}
   */
  primaryCellCounts: function() {
    if( !this._cacheIsValid)
      this._buildCache();
    return this.get('cachedCells').map( function( iCell) {
      return iCell[0].length;
    });
  }.property(),

  /**
    Responder for DataContext notifications. The PlotModel does not
    receive DataContext notifications directly, however. Instead, it
    receives them from the GraphModel, which receives them directly
    from the DataContext.
   */
  handleDataContextNotification: function( iNotifier, iChange) {
    if( !this.isAffectedByChange( iChange))
      return;

    var addToCache = function( iCase, iIndex, iPrimaryCell, iSecondaryCell) {
      var tCellLength;
      if(SC.none( iPrimaryCell) || SC.none( iSecondaryCell))
        return;

      var tCachedCells = this.get('cachedCells' ),
          tCachedIndex = this.get('cachedIndex' ),
          tMaxInCell = this.get('_maxInCell');

      if( SC.none( tCachedCells[ iPrimaryCell]))
        tCachedCells[ iPrimaryCell] = [];
      if( SC.none( tCachedCells[ iPrimaryCell][ iSecondaryCell]))
        tCachedCells[ iPrimaryCell][ iSecondaryCell] = [];
      tCachedCells[ iPrimaryCell][iSecondaryCell].push( { theCase: iCase, caseIndex: iIndex });
      tCellLength = tCachedCells[ iPrimaryCell][ iSecondaryCell].length;
      tCachedIndex[ iIndex] = { primaryCell: iPrimaryCell, secondaryCell: iSecondaryCell, indexInCell: tCellLength - 1 };
      this.beginPropertyChanges();
        this.set('cachedCells', tCachedCells);
        this.set('cachedIndex', tCachedIndex);
        this.set('_maxInCell', Math.max( tMaxInCell, tCellLength));
      this.endPropertyChanges();
    }.bind( this);



    if( (iChange.operation === 'createCase') || (iChange.operation === 'createCases')) {
      var tCaseDisturbedCellOrder = false,
          tCaseIDs = iChange.result.caseIDs || [ iChange.result.caseID ],
      tIndexOfCaseInArray = this.getPath('dataConfiguration.cases').length() - tCaseIDs.length,
          tCC = this.get('computationContext' );
      tCaseIDs.forEach( function( iCaseID) {
        var tCase = DG.store.find(DG.Case, iCaseID);
        if (tCase) {
          if( tCase._didDisturbCellOrder) {
            tCaseDisturbedCellOrder = true;
            delete tCase._didDisturbCellOrder;
          }
          if( !tCaseDisturbedCellOrder)
            this.doForOneCase(tCase, tIndexOfCaseInArray++, tCC, addToCache);
        }
      }.bind( this));
      if( tCaseDisturbedCellOrder)
        this.invalidateCaches();
    }
    else
      this.invalidateCaches();

    sc_super(); // Call this last because it results in view update, which we're not ready to do first
  },

  /**
    With this iteration we pass to the given function the index of the case in the cell.
    @return {{primaryCell, secondaryCell, indexInCell}}
  */
  lookupCellForCaseIndex: function( iIndex) {
    if( !this._cacheIsValid)
      this._buildCache();
    return this.get('cachedIndex')[ iIndex];
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

  doForOneCase: function( iCase, iIndex, iCC, iDoF) {
    var tPrimaryVal = iCase.getValue( iCC.primaryVarID),
        tPrimaryIsValid = SC.none( iCC.primaryVarID) || !SC.none( tPrimaryVal),
        tSecondaryVal = iCase.getValue( iCC.secondaryVarID),
        tSecondaryIsValid = SC.none( iCC.secondaryVarID) || !SC.none( tSecondaryVal),
        tPrimaryCell, tSecondaryCell;
    if( tPrimaryIsValid && tSecondaryIsValid) {
      tPrimaryCell = iCC.primaryAxis.cellNameToCellNumber( tPrimaryVal);
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
   * @param iKey {String} If present, the property that changed to bring about this call
    My data has changed, so my cache is no longer valid.
  */
  invalidateCaches: function( iKey) {
    sc_super();
    this.set('_cacheIsValid', false);
    this._cachedComputationContext = null;
  },

  /**
   * Get an array of non-missing case counts in each axis cell.
   * Also cell index on primary and secondary axis, with primary axis as major axis.
   * @return {Array} [{count, primaryCell, secondaryCell},...] (all values are integers 0+).
   */
  getCellCaseCounts: function( iForSelectionOnly) {
    var tAxis1 = this.get('primaryAxisModel'),
        tAxis2 = this.get('secondaryAxisModel'),
        tValueArray = [];

    if( !( tAxis1 && tAxis2 )) {
      return tValueArray; // too early to recompute, caller must try again later.
    }
    var tNumCells1 = tAxis1.get('numberOfCells') || 1,
        tNumCells2 = tAxis2.get('numberOfCells') || 1;
    var totalCells = tNumCells1*tNumCells2;
    var i, tCellIndex;

    // initialize the values
    for( i=0; i<totalCells; ++i ) {
      tValueArray.push({ count: 0, selectedCount: 0,
        primaryCell: Math.floor(i/tNumCells2), secondaryCell: i%tNumCells2 });
    }

    // compute count of cases in each cell, excluding missing values
    this.forEachBivariateCaseDo( function( iCase, iIndex, iPrimaryCell, iSecondaryCell) {
      tCellIndex = iPrimaryCell*tNumCells2 + iSecondaryCell;
      if( isFinite( tCellIndex) && DG.MathUtilities.isInIntegerRange( tCellIndex, 0, totalCells )) {
        var iValue = tValueArray[ tCellIndex ];
        iValue.count += 1;
      }
    });

    if( iForSelectionOnly) {
      // compute count of cases in each cell, excluding missing values
      this.forEachBivariateCaseDo(function (iCase, iIndex, iPrimaryCell, iSecondaryCell) {
        tCellIndex = iPrimaryCell * tNumCells2 + iSecondaryCell;
        if (isFinite(tCellIndex) && DG.MathUtilities.isInIntegerRange(tCellIndex, 0, totalCells)) {
          var iValue = tValueArray[tCellIndex];
          iValue.selectedCount += 1;
        }
      }, iForSelectionOnly);
    }

    return tValueArray;
  },

  /**
    Build a sparse 3-dim matrix of cases.
  */
  _buildCache: function() {
    var tCachedCells = [],
        tCachedIndex = [],
        tMaxInCell = 0;
    this.forEachBivariateCaseDo( function( iCase, iIndex, iPrimaryCell, iSecondaryCell) {
      var tCellLength;
      // forEachBivariateCaseDo() assumes that if there is no attribute on the secondary axis,
      // then there is no secondary cell. This code assumes that if there's no secondary cell
      // then there's nothing to cache. In the case of a computed bar chart we want to cache
      // the primary cell counts even when there's no explicit secondary cell.
      iSecondaryCell = iSecondaryCell || 0;
      if(SC.none( iPrimaryCell) || SC.none( iSecondaryCell))
        return;

      if( SC.none( tCachedCells[ iPrimaryCell]))
        tCachedCells[ iPrimaryCell] = [];
      if( SC.none( tCachedCells[ iPrimaryCell][ iSecondaryCell]))
        tCachedCells[ iPrimaryCell][ iSecondaryCell] = [];
      tCachedCells[ iPrimaryCell][iSecondaryCell].push( { theCase: iCase, caseIndex: iIndex });
      tCellLength = tCachedCells[ iPrimaryCell][ iSecondaryCell].length;
      tCachedIndex[ iIndex] = { primaryCell: iPrimaryCell, secondaryCell: iSecondaryCell, indexInCell: tCellLength - 1 };
      tMaxInCell = Math.max( tMaxInCell, tCellLength);
    });
    this._cacheIsValid = true;
    this.beginPropertyChanges();
      this.set('cachedCells', tCachedCells);
      this.set('cachedIndex', tCachedIndex);
      this.set('_maxInCell', tMaxInCell);
    this.endPropertyChanges();
  },

  /**
   If we need to make a count model, do so. In any event toggle its visibility.
   Note that the command is executed at the GraphModel level.
   */
  toggleDisplayAsBarChart: function() {
    this.toggleProperty('displayAsBarChart');
  },

  configurationDescriptions: function() {
    var this_ = this,
        tDescriptions = sc_super();
    tDescriptions.push(
        {
          constructorClass: SC.CheckboxView,
          properties: {
            title: 'DG.Inspector.graphBarChart',
            value: this_.get('displayAsBarChart'),
            classNames: 'dg-graph-barchart-check'.w(),

            valueDidChange: function () {
              this_.toggleDisplayAsBarChart();
              DG.mainPage.mainPane.hideInspectorPicker();
            }.observes('value')
          }
        }
    );
    return tDescriptions;
  }.property(),

  /**
    @property{Boolean}
    @private
  */
  _cacheIsValid: false,
  /**
    @property{Number}
    @private
  */
  _maxInCell: 0

});

/**
  class method called before plot creation to make sure roles are correct
  @param {DG.GraphDataConfiguration}
*/
DG.ChartModel.configureRoles = function( iConfig) {
  var tXType = iConfig.get('xType'),
      tAxisKey = (tXType === DG.Analysis.EAttributeType.eCategorical) ? 'x' : 'y',
      tOtherAxisKey = (tAxisKey === 'x') ? 'y' : 'x';
  iConfig.setPath( tAxisKey + 'AttributeDescription.role',
                    DG.Analysis.EAnalysisRole.ePrimaryCategorical);
  iConfig.setPath( tOtherAxisKey + 'AttributeDescription.role',
                    DG.Analysis.EAnalysisRole.eSecondaryCategorical);
};
