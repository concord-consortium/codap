// ==========================================================================
//                  DG.CellLinearAxisView Unit Test
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

sc_require('libraries/raphael');
sc_require('utilities/rendering_utilities');
sc_require('views/plots/cell_linear_axis_view');

DG.T = {};

module("DG.CellLinearAxisView", {
  
  setup: function() {
    DG.T = DG.CellLinearAxisView.create();
    /* jshint -W064 */  // Missing 'new' prefix when invoking a constructor. (W064)
    DG.T.set('_paper', Raphael(0, 0, 0, 0));
    DG.T.set('pixelMin', 0);
    DG.T.set('pixelMax', 100);
    DG.T.set('orientation', 'horizontal');
    var tModel = DG.CellLinearAxisModel.create();
    tModel.setDataMinAndMax( -1, 12, true);
    DG.T.set('model', tModel);
  },
  
  teardown: function() {
    DG.T.destroy();
    DG.T = null;
  }
});

test("DG.CellLinearAxisView", function() {
//   equals(Math.round( DG.T.dataToCoordinate( 0)), 17, "x = 0 is at pixel");
//   equals(Math.round( DG.T.dataToCoordinate( 10)), 72, "x = 10 is at pixel");
//   
//   DG.T.set('orientation', 'vertical');
//   DG.T.set('pixelMin', 100);
//   DG.T.set('pixelMax', 0);
// 
//   equals(Math.round( DG.T.dataToCoordinate( 0)), 83, "y = 0 is at pixel");
//   equals(Math.round( DG.T.dataToCoordinate( 10)), 28, "y = 10 is at pixel");
//   
//   equals( DG.T.desiredExtent(), 19, 'desired extent');
});

