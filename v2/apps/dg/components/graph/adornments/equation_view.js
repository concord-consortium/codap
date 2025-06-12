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

      transitionShow: SC.View.FADE_IN,
      transitionShowOptions: { duration: 1, timing: 'ease-in-out'},
      transitionHide: SC.View.FADE_OUT,
      transitionHideOptions: { duration: 1, timing: 'ease-in-out'},

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
        if(!isFinite(iViewLocation.x) || !isFinite(iViewLocation.y))
          return; // Can happen during transitions
        this.get('layer').innerHTML = iEquation;

        SC.run(function () {
          this.adjust({left: iViewLocation.x, top: iViewLocation.y});
        }.bind(this));
      },

      didCreateLayer: function () {
        var this_ = this,
            tLayer = this.get('layer');
        tLayer.addEventListener('mouseover', this_.callHighlight.bind(this_));
        tLayer.addEventListener('mouseout', this_.callUnHighlight.bind(this_));
      },

      willDestroyLayer: function () {
        var this_ = this,
            tLayer = this.get('layer');
        tLayer.removeEventListener('mouseover', this_.callHighlight.bind(this_));
        tLayer.removeEventListener('mouseout', this_.callUnHighlight.bind(this_));
      },

      callHighlight: function () {
        this.highlight(this.get('index'));
      },

      callUnHighlight: function () {
        this.unhighlight(this.get('index'));
      },

      hide: function () {
        this.set('isVisible', false);
      }

    });

DG.EquationView.defaultHeight = 16;
