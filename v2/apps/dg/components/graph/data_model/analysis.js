// ==========================================================================
//                            DG.Analysis
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

/** @class

  Provides some types and constants for use in analysis objects

*/
DG.Analysis = {

  /**
   * Enumeration of possible types for attributes.
   */
  EAttributeType: {
        eNone: 0,
        eNumeric: 1,
        eCategorical: 2,
        eDateTime: 3,
        eBoundary: 4,
        eColor: 5
  },

  /**
   * Enumeration of possible roles for attributes.
   */
  EAnalysisRole: {
        eInvalid: -1,
        eNone: 0,
        ePrimaryNumeric: 1,
        eSecondaryNumeric: 2,
        ePrimaryCategorical: 3,
        eSecondaryCategorical: 4,
        eLegendNumeric: 5,
        eLegendCategorical: 6,
        eVerticalSplit: 7,      // for attribute in place DG.GraphTypes.EPlace.eTopSplit
        eHorizontalSplit: 8     // for attribute in place DG.GraphTypes.EPlace.eRightSplit
  },

  EPercentKind: {
    eCell: 0,
    eRow: 1,
    eColumn: 2
  },

  EBreakdownType: {
    eCount: 0,
    ePercent: 1
  },

/**
   * Constant to indicate a null attribute. It's inconvenient to use null because in a property
      function you can't distinguish between a desire to set it to null and a value of null.
   */
  kNullAttribute: null,

  forceColorToCategorical: function( iType) {
    return (iType === this.EAttributeType.eColor) ? this.EAttributeType.eCategorical : iType;
  }

};

