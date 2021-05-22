// ==========================================================================
//                          DG.EquationView
// 
//  A simple view for displaying an equation with formatting on top of a graph view.
//  There is one global instance.
//  
//  Author:   William Finzer
//
//  Copyright (c) 2021 by The Concord Consortium, Inc. All rights reserved.
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

    DG.EquationView displays text in a popup LabelView

 */
DG.EquationView = SC.LabelView.extend(
    /** @scope DG.EquationView.prototype */ {
      classNames: 'dg-equationview'.w(),

      isEditable: false,

      localize: true,

      classNameBindings: ['highlighted:dg-equationview-opaque'],

      /**
       * Creator passes in these two functions to be called on mouseover and mouseout
       * @property {function}
       */
      highlight: null,
      /**
       * Creator passes in these two functions to be called on mouseover and mouseout
       * @property {function}
       */
      unhighlight: null,

      /**
       *
       * @param iViewLocation
       * @param iEquation {String} HTML
       */
      show: function (iViewLocation, iEquation) {
        // this.set('value', iEquation);
        this.get('layer').innerHTML = iEquation;

        SC.run( function() {
          this.adjust({left: iViewLocation.x, top: iViewLocation.y});
        }.bind(this));
        this.set('isVisible', true);
      },

      didCreateLayer: function() {
        var tLayer = this.get('layer');
        tLayer.addEventListener('mouseover', this.highlight);
        tLayer.addEventListener('mouseout', this.unhighlight);
      },

      willDestroyLayer: function() {
        var tLayer = this.get('layer');
        tLayer.removeEventListener('mouseover', this.highlight);
        tLayer.removeEventListener('mouseout', this.unhighlight);
      },

      hide: function () {
        this.set('isVisible', false);
      }

    });