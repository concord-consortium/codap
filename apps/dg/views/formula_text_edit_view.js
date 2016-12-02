// ==========================================================================
//                      DG.FormulaTextEditView
// 
//  Provides a DG-specific text editor for entering a formula.
//  
//  Authors:  William Finzer
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

sc_require('views/text_field_view');

/** @class

  This text editor deals specially with hyphens by turning them into true minus signs.
  Its functionality can be extended to enhance formula editing.

  @extends DG.TextFieldView
*/
DG.FormulaTextEditView = DG.TextFieldView.extend((function() {
/** @scope DG.FormulaTextEditView.prototype */

return {

  autoCorrect: false,

  autoCapitalize: false,
  
  names: [],  // Will be filled with attribute and global variable names by client

  _disableNextSelectRoot: false,

  _selectRootElement: function() {
    if( !this._disableNextSelectRoot)
      sc_super();
    this._disableNextSelectRoot = false;
  },

  keyDown: function( evt) {
    var kMinus = DG.UNICODE.MINUS_SIGN,
        tCurrent = this.get('value'),
        tSelection = this.get('selection');

    if( evt.getCharString() === '-') {
      if( !SC.none( tCurrent)) {
        tCurrent = tCurrent.slice( 0, tSelection.get( 'start')) +
              kMinus + tCurrent.slice( tSelection.get( 'end'));
      }
      else
        tCurrent = kMinus;

      this.set('value', tCurrent);
      this.setSelection( tSelection.start + 1);
      return true;
    }
    // If the selection goes to the end and is non-null, a tab key will move the caret
    // to the end. (Note that it doesn't matter how those initial conditions came about.)
    else if( (evt.which === SC.Event.KEY_TAB) && 
        (tSelection.start !== tCurrent.length) &&
        (tSelection.end === tCurrent.length)){
      this.setSelection( tCurrent.length);
      return true;
    }
    return sc_super();
  },
  performValidateKeyDown: function( evt) {
    return ( evt.getCharString() !== '-') && sc_super();
  },
  formulaExpression: function( iKey, iValue) {
    if( iValue === undefined) {
      // Replace unicode minus with hyphen for purposes of evaluation
      var tCurrent = this.get('value');
      return !SC.empty( tCurrent) ? tCurrent.replace( /\u2212/g, '-') : tCurrent;
    }
    else {
      // Replace hyphen with unicode minus because hyphen can be unrecognizable
      this.set('value', !SC.empty( iValue) ? iValue.replace( /-/g, DG.UNICODE.MINUS_SIGN) : '');
    }
  }.property( 'value')
  
};

})());
