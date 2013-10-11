// ==========================================================================
//                        DG.AttributeStats
//
//  Author:   William Finzer
//
//  Copyright ©2013 KCP Technologies, Inc., a McGraw-Hill Education Company
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

/** @class

  Deals with an array of attributes and maintains univariate (categorical or numeric) statistics
 for them.

 @extends SC.Object
 */
DG.AttributeStats = SC.Object.extend(
  /** @scope DG.AttributeStats.prototype */ {

    /**
     * The attributes for this slot
     * @property {Array of DG.AttributeModel}
     */
    attributes: null,

    /**
     * A cache of computed univariate statistics
     * @property {DG.UnivariateStats}
     */
    numericStats:null,

    /**
     * A cache of computed categorical statistics
     * @property {DG.CategoricalStats}
     */
    categoricalStats:null,

    /**
     * @property {Array of DG.Case} Passed in through invalidateCaches
     */
    _cases:null,

    /**
     * @property {Boolean}
     */
    _numericCacheIsValid:null,

    /**
     * @property {Boolean}
     */
    _categoricalCacheIsValid:null,

    /**
     * Only gets a value if 'attributeType' is set rather than computed.
     * @property {DG.Analysis.EAttributeType}
     */
    _attributeType:DG.Analysis.EAttributeType.eNone,

    /**
     * Initialize those members that require it.
     */
    init:function () {
      sc_super();
      this.attributes = [];
      this.numericStats = DG.UnivariateStats.create();
      this._numericCacheIsValid = true; // because there is nothing to compute

      this.categoricalStats = DG.CategoricalStats.create();
      this._categoricalCacheIsValid = true; // because there is nothing to compute
    },

    attributeDidChange:function () {
      this.invalidateCaches();
      this.set( 'attributeType', null ); // When the attributes are first assigned, we don't know its type
    }.observes( 'attributes' ),

    /**
     *
     * @param iCases {Array} of DG.Case
     */
    invalidateCaches:function ( iCases, iChange ) {

      function isBetterMin( n1, n2) {
        return SC.none( n2) || (n1 < n2);
      }

      function isBetterMax( n1, n2) {
        return SC.none( n2) || (n1 > n2);
      }

      var
        processOneNumeric = function( iCase, iVarID) {
          var tInfo = {}, tValue = iCase.getNumValue( iVarID, tInfo);
          if( isFinite( tValue)) {
            this.numericStats.incrementProperty( 'count' );
            this.numericStats.set('sum', this.numericStats.sum + tValue);
            if( isBetterMin( tValue, this.numericStats.rangeMin))
              this.numericStats.set('rangeMin', tValue);
            if( isBetterMax( tValue, this.numericStats.rangeMax))
              this.numericStats.set('rangeMax', tValue);
            if( tValue > 0 ) {
              if( isBetterMin( tValue, this.numericStats.positiveMin))
                this.numericStats.set('positiveMin', tValue);
              if( isBetterMax( tValue, this.numericStats.positiveMax))
                this.numericStats.set('positiveMax', tValue);
            }
            this.numericStats.setIfChanged('squaredDeviations', null);  // We can't compute this without iteration
          }
          else if( tInfo.isNominal) {
            this.numericStats.setIfChanged('attributeType', DG.Analysis.EAttributeType.eCategorical);
          }
        }.bind( this ),

        processOneCategorical = function( iCase, iVarID) {
          var tValue = iCase.getStrValue( iVarID);
          if( !SC.empty( tValue)) {
            var tCellMap = this.getPath('categoricalStats.cellMap' );
            if( SC.none( tCellMap[ tValue] ) )
              tCellMap[ tValue] = [];
            tCellMap[ tValue].push( iCase );
            this.categoricalStats.incrementProperty( 'count' );
            this.setPath( 'categoricalStats.cellMap', tCellMap ); // Replace with notifyPropertyChange?
          }
        }.bind(this);

      this._cases = iCases || this._cases; // Do this first so subsequently computed stats will use the right cases
      if( iChange && 
          ((iChange.operation === 'createCase') || (iChange.operation === 'createCases'))) {

        var tCaseIDs = iChange.result.caseIDs || [ iChange.result.caseID ],
            tVarID = this.getPath('attribute.id'),
            tType = this.get('attributeType'),
            tAttributes = this.get('attributes' ),
            shouldProcessNumeric = this._numericCacheIsValid,
            shouldProcessCategorical = this._categoricalCacheIsValid &&
                                      (tType === DG.Analysis.EAttributeType.eCategorical);
        
        if( shouldProcessNumeric)
          this.numericStats.beginPropertyChanges();
        if( shouldProcessCategorical)
          this.categoricalStats.beginPropertyChanges();
        tCaseIDs.forEach( function( iCaseID) {
                            var tCase = DG.store.find( DG.Case, iCaseID);
                            if( tCase) {
                              tAttributes.forEach( function( iAttribute) {
                                tVarID = iAttribute.get( 'id' );
                                if( shouldProcessNumeric) {
                                  processOneNumeric( tCase, tVarID);
                                }
                                if( shouldProcessCategorical)
                                  processOneCategorical( tCase, tVarID);
                                else
                                  this.setIfChanged('_categoricalCacheIsValid', false);
                              }.bind(this));
                            }
                          }.bind( this));
        if( shouldProcessNumeric)
          this.numericStats.endPropertyChanges();
        if( shouldProcessCategorical)
          this.categoricalStats.endPropertyChanges();
        return;
      }

      // We're currently required to use set here so that dependents will hear about change
      this.setIfChanged( '_numericCacheIsValid', false );
      this.setIfChanged( '_categoricalCacheIsValid', false );
    },

    /**
     @property{{min:{Number}, max:{Number} isDataInteger:{Boolean}}}
     */
    minMax:function () {
      if( !this._numericCacheIsValid )
        this._computeNumericStats();
      var tRange = this.numericStats.get( 'numericRange' );
      return { min:tRange.min,
              max:tRange.max,
              isDataInteger:this.numericStats.get( 'dataIsInteger' ) };
    }.property(),

    /**
     It is possible to set this property, thus implying that the attributes
     are to be treated one way or another.
     @property{DG.Analysis.EAttributeType} True if all values are numbers or blank
     */
    attributeType:function ( iKey, iValue ) {
      if( iValue !== undefined )
        this._attributeType = iValue;
      if( !SC.none( this._attributeType ) )
        return this._attributeType;

      var tAttributes = this.get('attributes');

      // We don't have a value stored, so we compute the answer
      if( tAttributes.length === 0 )
        return DG.Analysis.EAttributeType.eNone;

      // If our first attribute has a type assigned, we return it
      switch( tAttributes[ 0].get('type')) {
        case 'nominal':
          return DG.Analysis.EAttributeType.eCategorical;
        case 'numeric':
          return DG.Analysis.EAttributeType.eNumeric;
        default:
          // Do nothing
      }

      // Finally, determine the type from the actual values, if any
      if( !this._numericCacheIsValid )
        this._computeNumericStats();

      return this.getPath( 'numericStats.attributeType' );
    }.property('attributes', 'numericStats.attributeType'),

    /**
     Run through all attributes and their values and cache computed statistics.
     @private
     */
    _computeNumericStats:function () {
      var tCases = this._cases,
        tAttributes = this.get('attributes' ),
        tCaseCount = 0,
        tAttributeType,
        tDataIsNumeric = true,
        tMin = Number.POSITIVE_INFINITY,
        tMax = Number.NEGATIVE_INFINITY,
        tPositiveMin = Number.MAX_VALUE,
        tPositiveMax = -Number.MAX_VALUE,
        tSum = 0,
        tSumDiffs = 0,
        tSumSquareDiffs = 0,
        //tDataIsInteger = true,
        tMean,
        tValues = [];

      function addCaseValueToStats( iCaseValue ) {
         var tValue = Number( iCaseValue );
         if( !SC.empty( iCaseValue ) && isFinite( tValue ) ) {
           tCaseCount++;
           if( tValue < tMin ) tMin = tValue;
           if( tValue > tMax ) tMax = tValue;
           tSum += tValue;
           //tDataIsInteger = tDataIsInteger && (Math.floor( tValue ) === tValue);
           tValues.push( tValue );
           if( tValue > 0 ) {
             tPositiveMin = Math.min( tValue, tPositiveMin );
             tPositiveMax = Math.max( tValue, tPositiveMax );
           }
         }
         // Let infinity and NaN through as numbers. And don't let null be treated as categorical
         else if( (typeof iCaseValue !== 'number') && !SC.empty( iCaseValue ) ) {
           tValue = String( iCaseValue );
           if( tDataIsNumeric && !SC.empty( tValue ) )
             tDataIsNumeric = false;
         }
       }

      this.numericStats.reset();

      this.numericStats.beginPropertyChanges();
        if( SC.isArray( tCases)) {
          tAttributes.forEach( function( iAttribute) {
            var tVarID = iAttribute.get('id');
            tCases.forEach( function ( iCase ) {
              addCaseValueToStats( iCase.getValue( tVarID ) );
            } );
          });
        }

        if( tCaseCount > 0 ) {
          this.numericStats.set( 'count', tCaseCount );
          this.numericStats.set( 'sum', tSum );
          this.numericStats.set( 'rangeMin', tMin );
          this.numericStats.set( 'rangeMax', tMax );
          tMean = tSum / tCaseCount;
          tValues.forEach( function ( iValue ) {
            var tDiff = iValue - tMean;
            tSumDiffs += tDiff;
            tSumSquareDiffs += tDiff * tDiff;
          } );
          // The second term serves as a correction factor for roundoff error.
          // See Numeric Recipes in C, section 14.1 for details.
          tSumSquareDiffs -= tSumDiffs * tSumDiffs / tCaseCount;
          this.numericStats.set( 'squaredDeviations', tSumSquareDiffs );

          if( tPositiveMin <= tPositiveMax ) {
            this.numericStats.set( 'positiveMin', tPositiveMin );
            this.numericStats.set( 'positiveMax', tPositiveMax );
          }
        }
        tAttributeType = tDataIsNumeric ? DG.Analysis.EAttributeType.eNumeric :
                         DG.Analysis.EAttributeType.eCategorical;
        this.numericStats.set( 'attributeType', tAttributeType );
        this._numericCacheIsValid = true;
      this.numericStats.endPropertyChanges();
    },

    /**
     @property{Number} The number of categorical cells
     */
    numberOfCells:function () {
      if( !this._categoricalCacheIsValid )
        this._computeCategoricalStats();
      return this.getPath( 'categoricalStats.numberOfCells' );
    }.property( 'categoricalStats.numberOfCells' ),

    /**
     @property{Number} The number of categorical cells
     */
    numericRange:function () {
      if( !this._numericCacheIsValid)
        this._computeNumericStats();
      return this.getPath( 'numericStats.numericRange' );
    }.property( 'numericStats.numericRange' ),

    /**
     * The property defined above which is supposed to be dependent on numericStats.numericRange
     * proved not to be so. We fix this directly observing and triggering the necessary
     * notification.
     */
    numericRangeDidChange: function() {
      this.notifyPropertyChange('numericRange');
    }.observes('numericStats.numericRange'),

    dataDidChange:function () {
      // We only have to deal with categorical stats if we are not numeric
      // Note that for this to work in the long run we're going to have to respond to any change
      //    in whether the attributes are numeric or not.
      if( (this.get( 'attributeType' ) === DG.Analysis.EAttributeType.eCategorical) &&
          !this._categoricalCacheIsValid ) {
        var tOldNumCells = this.categoricalStats.get( 'numberOfCells' ),
          tNewNumCells;
        this._computeCategoricalStats();
        tNewNumCells = this.categoricalStats.get( 'numberOfCells' );
        if( tNewNumCells !== tOldNumCells ) {
          this.notifyPropertyChange( 'numberOfCells' );
        }
      }
    }.observes( '_categoricalCacheIsValid' ),

    /**
     @property{Object} The names of the properties of this object are the cell names
     */
    cellMap:function () {
      if( !this._categoricalCacheIsValid )
        this._computeCategoricalStats();
      return this.categoricalStats.get( 'cellMap' );
    }.property( 'categoricalStats.cellMap' ),

    /**
     @return{Number} corresponding to given name
     */
    cellNameToCellNumber:function ( iCellName ) {
      if( !this._categoricalCacheIsValid )
        this._computeCategoricalStats();
      return this.categoricalStats.cellNameToCellNumber( iCellName );
    },

    /**
     Run through all attribute values and cache categorical stats
     @private
     */
    _computeCategoricalStats:function () {
      var tCases = this._cases,
        tAttributes = this.get('attributes' ),
        tCaseCount = 0,
        tCellMap = {};

      function addCaseValueToStats( iCase, iCaseValue) {
        var tValue = String( iCaseValue );
        // Note that a null iCaseValue becomes "null" under string coercion
        if( !SC.none( iCaseValue ) && !SC.empty( tValue ) ) {
          // consider a DG.CategoricalStats.addCaseValue() method
          if( SC.none( tCellMap[ tValue] ) )
            tCellMap[ tValue] = [];
          tCellMap[ tValue].push( iCase );
          tCaseCount++;
        }
      }

      this.categoricalStats.reset();

      if( SC.isArray( tCases )) {
        tAttributes.forEach( function( iAttribute) {
          // If the attribute has a colormap, use it to predetermine the order of the categories
          var tColorMap = iAttribute.get('colormap');
          if( tColorMap) {
            DG.ObjectMap.forEach( tColorMap, function( iKey) {
              tCellMap[ iKey] = [];
            });
          }

          var tVarID = iAttribute.get('id');
          tCases.forEach( function ( iCase ) {
            addCaseValueToStats( iCase, iCase.getValue( tVarID ));
          } );
        });

        this.categoricalStats.beginPropertyChanges();
        this.categoricalStats.set( 'cellMap', tCellMap );
        this.categoricalStats.set( 'count', tCaseCount );
        this.categoricalStats.endPropertyChanges();
      }
      this._categoricalCacheIsValid = true;
    }

  } );

