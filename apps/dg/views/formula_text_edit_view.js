// ==========================================================================
//                      DG.FormulaTextEditView
// 
//  Provides a DG-specific text editor for entering a formula.
//  
//  Authors:  William Finzer
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

sc_require('views/text_field_view');

/** @class

  This text editor deals specially with hyphens by turning them into true minus signs.
  Its functionality can be extended to enhance formula editing.

  @extends DG.TextFieldView
*/
DG.FormulaTextEditView = DG.TextFieldView.extend(
/** @scope DG.FormulaTextEditView.prototype */ {

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
  keyUp: function( evt) {
    var tSel = this.get('selection'),
        tCurrent = this.get('value'),
        tNames = this.get('names'),
        kRegLastWord = /\b[a-zA-Z_][\w]*$/,
        tMatch = typeof tCurrent === "string" && !SC.empty( tCurrent)
                  ? tCurrent.match( kRegLastWord) : null;
    
    // Weird bug: It is possible to get here after closing the calculator and then switching
    // to the model table with the world not looking the way we expect. If so, just bail.
    if( !tSel) return NO;
    
    function isValidChar( iCode) {
      return !(iCode < 32 || (iCode >= 33 && iCode <= 46) || (iCode >= 112 && iCode <= 123) ||
              (iCode >= 91 && iCode <= 93));
    }
    
    function getSuggestion( iRoot) {
      var tSuggestion = iRoot,
          tIndex, tTrial;
      
      for( tIndex = 0; tIndex < tNames.length; tIndex++) {
        tTrial = tNames[ tIndex];
        if( tTrial.indexOf( iRoot) === 0) {
          tSuggestion = tTrial;
          break;
        }
      }
      
      return tSuggestion;
    }
    
    if( (tSel.start > 0) && (tSel.end === tCurrent.length) && isValidChar( evt.keyCode) &&
        (tNames.length > 0) && !SC.none( tMatch)) {
      var tRoot = tMatch[ 0],
          tSuggest = getSuggestion( tRoot),
          tNew = tCurrent.replace( kRegLastWord, tSuggest);
      // If we actually found something, change the value and selection.
      // Note that doing so when there is supposedly no change can, in certain circumstances
      // move the selection to the end of the field when that is not what we want.
      if( tSuggest !== tRoot) {
        this.set('value', tNew);
        this.setSelection( tCurrent.length, tNew.length);
      }
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
  
});

