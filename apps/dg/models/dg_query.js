// ==========================================================================
//                            SC.Query
//
//  Replace the orderStoreKeys method of SC.Query with one that avoids
//  sorting the storeKeys unless it's necessary.
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

  Extensions to SC.Query with performance improvements.

  @extends SC.Query
*/

/**
  Sorts a set of store keys according to the orderBy property
  of the `SC.Query`. KCPT replacement only sorts if the storeKeys
  aren't already in order.

  @param {Array} storeKeys to sort
  @param {SC.Query} query to use for sorting
  @param {SC.Store} store to materialize records from
  @returns {Array} sorted store keys.  may be same instance as passed value
*/
SC.Query.orderStoreKeys = function(storeKeys, query, store) {
  // determine if the storeKeys are already sorted
  if (storeKeys) {
    var i, len = storeKeys.get('length'),
        isSorted = true,
        prevStoreKey = null;
    for (i=0; i<len; i++) {
      var thisStoreKey = storeKeys.objectAt(i);
      if (prevStoreKey &&
          SC.Query.compareStoreKeys(query, store, prevStoreKey, thisStoreKey) > 0) {
        isSorted = false;
        break;
      }
      prevStoreKey = thisStoreKey;
    }
    // only sort if they're not already sorted
    if (!isSorted) {
      storeKeys.sort(function(a, b) {
        return SC.Query.compareStoreKeys(query, store, a, b);
      });
    }
  }

  return storeKeys;
};

