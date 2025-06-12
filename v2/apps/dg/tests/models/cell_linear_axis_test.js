// ==========================================================================
//                  DG.CellLinearAxisModel Unit Test
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

sc_require('models/graph/cell_linear_axis_model');

DG.T = {};

module("DG.CellLinearAxisModel", {
  
  setup: function() {
    DG.T = DG.CellLinearAxisModel.create();
  },
  
  teardown: function() {
    DG.T = null;
  }
});

test("DG.CellLinearAxisModel", function() {
  equals(DG.T._goodTickValue( 1.5), 1, "tick value for 1.5");
  equals(DG.T._goodTickValue( 1100), 1000, "tick value for 1100");
  equals(DG.T._goodTickValue( 0.002), 0.002, "tick value for 0.002");

  equals(DG.T._findLow( 0, 1), -0.5, "_findLow for dataMin=0 and tickGap=1");
  equals(DG.T._findLow( 0, 0), -1, "_findLow for dataMin=0 and tickGap=0");
  equals(DG.T._findLow( -1000, 100), -1050, "_findLow for dataMin=-1000 and tickGap=100");
  equals(DG.T._findHigh( 0, 1), 1.5, "_findHigh for dataMin=0 and tickGap=1");
  equals(DG.T._findHigh( 0, 0), 1, "_findHigh for dataMin=0 and tickGap=0");
  equals(DG.T._findHigh( -1000, 100), -850, "_findHigh for dataMin=-1000 and tickGap=100");
  
  DG.T.setDataMinAndMax( -1, 12, true);
  equals(DG.T.get('lowerBound'), -3, "data goes from -1 to 12. lowerBound = ");
  equals(DG.T.get('upperBound'), 15, "data goes from -1 to 12. upperBound = ");

  DG.T.dilate( 5, 2);
  equals(DG.T.get('lowerBound'), -11, "after dilate(5,2). lowerBound = ");
  equals(DG.T.get('upperBound'), 25, "after dilate(5,2). upperBound = ");

  DG.T.translate( 100);
  equals(DG.T.get('lowerBound'), 89, "after translate(100). lowerBound = ");
  equals(DG.T.get('upperBound'), 125, "after translate(100). upperBound = ");
  
  DG.T.setLowerAndUpperBounds( 5.5, 12.34);
  equals(DG.T.get('lowerBound'), 5.5, "after setLowerAndUpperBounds( 5.5, 12.34). lowerBound = ");
  equals(DG.T.get('upperBound'), 12.34, "after setLowerAndUpperBounds( 5.5, 12.34). upperBound = ");
});

