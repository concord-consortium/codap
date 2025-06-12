// ==========================================================================
//                              DG.AxisLabelView
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

sc_require('components/graph/utilities/graph_drop_target');
sc_require('views/raphael_base');
sc_require('utilities/rendering_utilities');

/** @class  DG.AxisLabelView - Displays attribute name(s) on left or bottom of graph.
 *          Particularly important when a plot has been split so there are multiple independent axes there.


 @extends DG.RaphaelBaseView
 */
DG.AxisLabelView = DG.RaphaelBaseView.extend(DG.GraphDropTarget,
    /** @scope DG.AxisLabelView.prototype */
    (function () {
      return {

        classNames: 'dg-axis-view'.w(),

        orientation: null,

        /**
         * @property {DG.Attribute}
         */
        plottedAttribute: null,

        blankDropHint: 'DG.GraphView.addToEmptyPlace',

        desiredExtent: DG.RenderingUtilities.kCaptionFontHeight,

        init: function() {
          sc_super();

          // Add a classname for use in QA automation
          var tClassName;
          switch( this.get('orientation')) {
            case DG.GraphTypes.EOrientation.kHorizontal:
              tClassName = 'dg-h-axis';
              break;
            case DG.GraphTypes.EOrientation.kVertical:
              tClassName = 'dg-v-axis';
              break;
            case DG.GraphTypes.EOrientation.kVertical2:
              tClassName = 'dg-v2-axis';
              break;
          }
          this.get('classNames').push( tClassName);

        }

      };
    }()));

