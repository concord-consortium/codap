// ==========================================================================
//                              DG.PickerColorControl
// 
//  SC.PickerColorControl brings up a spectrum color picker
//  
//  Authors:  William Finzer
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

/** @class

    A PickerColorControl brings up a spectrum color picker

 @extends SC.View
 */
DG.PickerColorControl = SC.View.extend(
    /** @scope DG.PickerColorControl.prototype */ {
      classNames: 'dg-inspector-picker-color'.w(),
      initialColor: null, // Should be set by caller
      colorKey: null, // Should be set by caller
      setColorFunc: null, // Should be set by caller
      closedFunc: null, // Optionally set by caller
      appendToLayerFunc: null, // Should be set by caller
      lastColor: null, // the last color selected when closed
      render: function(iContext, iFirstTime) {
        iContext.push('<input type="text" id="custom1" />');
        if (this.get('lastColor') == null) {
          this.set('lastColor', this.get('initialColor'));
        }
        this.invokeLast(function () {
          /* global tinycolor */
          this.$('#custom1').spectrum({
            color: tinycolor(this.initialColor),
            appendTo: this.appendToLayerFunc(),
            showAlpha: true,
            showInitial: true,
            showButtons: false,
            togglePaletteOnly: true,
            togglePaletteMoreText: 'DG.Inspector.colorPicker.more'.loc(),
            togglePaletteLessText: 'DG.Inspector.colorPicker.less'.loc(),
            showPaletteOnly: true,
            showPalette: true,
            palette: [
                // See http://alumni.media.mit.edu/~wad/color/palette.html
              ['black', 'darkgray', 'lightgray', 'white'],
                // red, orange, yellow, green
              ['rgb(173,35,35);', 'rgb(255,150,50);', 'rgb(255,238,51);', 'rgb(29,105,20);'],
                // blue, brown, purple, cyan
              ['rgb(42,75,215);', 'rgb(129,74,25);', 'rgb(129,38,192);', 'rgb(41,208,208);'],
                // tan, pink, lt blue, lt green
              ['rgb(233,222,187);', 'rgb(255,205,243);', 'rgb(157,175,255);', 'rgb(129,197,122);']
            ],
            move: function (iColor) {
              SC.run(function() {
                if( this.setColorFunc)
                  this.setColorFunc( iColor, this.colorKey);
              }.bind(this));
            }.bind(this),
            change: function (iColor) {
              SC.run(function() {
                if( this.setColorFunc)
                  this.setColorFunc( iColor, this.colorKey);
                if ( this.closedFunc)
                  this.closedFunc( this.get('lastColor'), iColor);
                this.set( 'lastColor', iColor, this.colorKey);
              }.bind(this));
            }.bind(this)
          });
        }.bind(this));
      }
    });

