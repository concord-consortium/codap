// ==========================================================================
//                        DG.ObjectMap Unit Test
//
//  Copyright (c) 2015 by The Concord Consortium, Inc. All rights reserved.
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
sc_require('utilities/color_utilities');

DG.T = {};

module("DG.ColorUtilities", {

   setup: function() {
   DG.T = {};
   DG.T.empty = {};
   DG.T.letters1 = { a: "a" };
   DG.T.letters2 = { a: "a", b: "b" };
   },

   teardown: function() {
   DG.T = null;
   }
});

test("DG.ColorUtilities.colorMapToArray", function() {
  var tMap = { cat1: 'red', cat2: 'yellow', cat3: 'green'},
      tArray = [['cat1', 'red'], ['cat2', 'yellow'], ['cat3', 'green']],
      tConvertedArray = DG.ColorUtilities.colorMapToArray( tMap),
      tConvertedMap = DG.ColorUtilities.colorArrayToColorMap(tConvertedArray);
  // Note: same() relies on SproutCore's Array.isEqual() extension which
  // doesn't work for this purpose, so we convert twice and compare maps instead.
  same(tConvertedMap, tMap, "convert map to array");
});

test("DG.ColorUtilities.colorArrayToColorMap", function() {
  var tMap = { cat1: 'red', cat2: 'yellow', cat3: 'green'},
      tArray = [['cat1', 'red'], ['cat2', 'yellow'], ['cat3', 'green']];
  same(DG.ColorUtilities.colorArrayToColorMap( tArray), tMap, "convert array to map");
});

