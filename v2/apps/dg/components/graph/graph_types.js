// ==========================================================================
//                            DG.GraphTypes
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

DG.GraphTypes = {

  /**
   * Enumeration of places.
   */
  EPlace: {
        eUndefined: -1,
        eFirstPlace: 0,
        eX: 0,
        eY: 1,
        eLegend: 2,
        eY2: 3,
        ePolygon: 4,
        eCaption: 5,
        eTopSplit: 6,
        eRightSplit: 7,
        eLastPlace: 7,
        eNumPlaces: 8
  },

  EOrientation: {
    kNone: 'none',
    kHorizontal: 'horizontal',
    kVertical: 'vertical',
    kVertical2: 'vertical2',
    kTop: 'top',
    kRight: 'right'
  }

};

