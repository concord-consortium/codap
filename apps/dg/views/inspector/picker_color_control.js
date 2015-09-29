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
      classNames: 'inspector-picker-color'.w(),
      initialColor: null, // Should be set by caller
      colorKey: null, // Should be set by caller
      setColorFunc: null, // Should be set by caller
      appendToLayerFunc: null, // Should be set by caller
      render: function(iContext, iFirstTime) {
        iContext.push('<input type="text" id="custom1" />')
        this.invokeLast(function () {
          this.$('#custom1').spectrum({
            color: tinycolor(this.initialColor),
            appendTo: this.appendToLayerFunc(),
            showAlpha: true,
            showInitial: true,
            showButtons: false,
            move: function (iColor) {
              if( this.setColorFunc)
                this.setColorFunc( iColor, this.colorKey);
            }.bind(this),
            change: function (iColor) {
              if( this.setColorFunc)
                this.setColorFunc( iColor, this.colorKey);
            }.bind(this)
          })
        }.bind(this));
      }
    });

