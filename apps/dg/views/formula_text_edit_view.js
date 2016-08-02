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

  /*
    Utility function for testing whether a jQuery event was
    ultimately triggered by a key event.
   */
  function isKeyDownEvent(iEvent, iOptionalKeyCode) {
    // recurse our way down to the most original event
    if (iEvent.originalEvent)
      return isKeyDownEvent(iEvent.originalEvent, iOptionalKeyCode);
            // test whether it's a key event
    return /^key/.test(iEvent.type) &&
            // if a particular keyCode was specified, test whether it was the one
            ((iOptionalKeyCode == null) || (iOptionalKeyCode === iEvent.keyCode));
  }

  // Keycodes that can be used in identifiers.
  // May have to be expanded to handle internationalization.
  function isIdentifierKeyCode(iKeyCode) {
    return ((iKeyCode >= 0x30) && (iKeyCode <= 0x39) ||   // number keys
            (iKeyCode >= 0x41) && (iKeyCode <= 0x5A) ||   // letter keys
            (iKeyCode >= 0x60) && (iKeyCode <= 0x69) ||   // numpad number keys
            (iKeyCode === 0xBD));                         // underscore
  }

  // Adds backspace key (can put up autocomplete menu after backspace)
  function isIdentifierOrBackspaceKeyCode(iKeyCode) {
    return isIdentifierKeyCode(iKeyCode) ||
            (iKeyCode === SC.Event.KEY_BACKSPACE);
  }

  // Adds menu navigation keys -- shouldn't dismiss menu after these keys
  function isAutoCompleteKeyCode(iKeyCode) {
    return isIdentifierKeyCode(iKeyCode) ||
            ([SC.Event.KEY_UP, SC.Event.KEY_DOWN,
              SC.Event.KEY_PAGEUP, SC.Event.KEY_PAGEDOWN].indexOf(iKeyCode) >= 0);
  }

  /*
    Replace the appropriate portion of the original string with the
    contents (value) of the focused or selected item.
   */
  function autocompleteReplace(iInstance, iItem, iMatchPos, iMatchStr) {
    var element = iInstance.element.get(0),
        orgText = iInstance && iInstance.term,
        replaceStr = iItem.value,
        replaceLen = replaceStr.length,
        newText, caretPos;

    // Don't add parentheses at end of function name if there are
    // already parentheses immediately following the string to replace.
    if ((replaceLen > 2) && 
        (replaceStr[replaceStr.length - 2] === '(') &&
        (orgText[iMatchPos + iMatchStr.length] === '(')) {
      replaceStr = replaceStr.substr(0, replaceLen - 2);
    }

    if (iMatchStr === replaceStr) return;

    // Replace the matched part of the string with the selected string
    if (iMatchStr) {
      newText = orgText.substr(0, iMatchPos) +
                replaceStr +
                orgText.substr(iMatchPos + iMatchStr.length);
      iInstance._value(newText);
      // set the caret position after the replacement
      // (or between the parentheses in the case of functions)
      if (element) {
        caretPos = iMatchPos + replaceStr.length;
        if (replaceStr.indexOf("()") > 0)
          -- caretPos;
        else if (iItem.value.indexOf("()") > 0)
          ++ caretPos;
        element.selectionStart = element.selectionEnd = caretPos;
      }
      // let SproutCore know we've changed the value
      SC.run(function() {
        if (iInstance.options._dg_editView)
          iInstance.options._dg_editView.fieldValueDidChange();
      });
    }
  }

return {

  autoCorrect: false,

  autoCapitalize: false,
  
  names: [],  // Will be filled with attribute and global variable names by client

  _disableNextSelectRoot: false,

  didAppendToDocument: function() {
    DG.FormulaTextEditView.initializeAutoComplete();

    // Initialize the autocomplete widget when we are appended to the DOM.
    var textArea = this.$('textarea');
    textArea.catcomplete({
                // stash a backpointer into the options
                _dg_editView: this,
                autoFocus: true,
                position: { my: 'left top', at: 'left bottom', of: this.get('layer') },
                // filled in by caller
                source: this.get('completionData'),

                // called when the menu is opened
                open: function(event, ui) {
                  var widget = textArea.catcomplete('widget'),
                      formulaFrame = this.frame(),
                      formulaWidth = formulaFrame.width,
                      // We want to make sure the menu is visible/fits in the window.
                      // On mobile Safari, there is no reliable way to determine
                      //  1) when/whether the virtual keyboard is shown
                      //  2) the height of the virtual keyboard if it is shown
                      //  3) the height of the window excluding the virtual keyboard
                      // and even the unreliable methods are often iOS-version-specific.
                      // Therefore, we simply punt and hard-code a value that seems to work.
                      // Apparently, on Android resize events are fired when the keyboard
                      // is shown, so there is reason to believe that the default code
                      // will work there, although I haven't tried it yet.
                      maxMenuHeight = SC.browser.isMobileSafari
                                          ? 125
                                          : $(window).height() - widget.offset().top - 5;
                  this._ac_isOpen = true;
                  this._ac_selectedWithTab = false;

                  widget.css({
                          // make sure it's on top
                          zIndex: 9999,
                          // match width of menu to width of dialog
                          width: formulaWidth,
                          // set maximum height before scrolling kicks in
                          maxHeight: maxMenuHeight
                         });
                }.bind(this),

                // called when an item is focused in the menu
                focus: function(event, ui) {
                  var instance = textArea.catcomplete('instance'),
                      matchPos = this._ac_matchPos || 0,
                      matchStr = this._ac_matchStr || (instance ? instance.term : "");
                  if (isKeyDownEvent(event)) {
                    // If we've matched a substring instead of the full contents,
                    // we must do the replacing ourselves, but only if the focus
                    // occurred as the result of a user keypress (e.g. not when
                    // auto-focusing initially).
                    if (instance) {
                      autocompleteReplace(instance, ui.item, matchPos, matchStr);
                      return false;
                    }
                  }
                }.bind(this),

                // called when the user selects an item from the menu
                select: function(event, ui) {
                  var instance = textArea.catcomplete('instance'),
                      matchPos = this._ac_matchPos || 0,
                      matchStr = this._ac_matchStr || (instance ? instance.term : "");
                  // We do our own replacing since we sometimes match a substring and
                  // we also set the caret (e.g. inside the parentheses for functions).
                  if (instance) {
                    this._ac_selectedWithTab = isKeyDownEvent(event, SC.Event.KEY_TAB);
                    autocompleteReplace(instance, ui.item, matchPos, matchStr);
                    return false;
                  }
                }.bind(this),

                // called when the menu is closed
                close: function(event, ui) {
                  this._ac_isOpen = false;
                }.bind(this)
              });
  },
  
  _selectRootElement: function() {
    if( !this._disableNextSelectRoot)
      sc_super();
    this._disableNextSelectRoot = false;
  },

  keyDown: function( evt) {
    var kMinus = DG.UNICODE.MINUS_SIGN,
        tCurrent = this.get('value'),
        tSelection = this.get('selection'),
        acInstance = this.$('textarea').catcomplete('instance');

    // If tab key was used to exit the autocomplete menu, don't
    // let SproutCore use it to exit the text field as well.
    if ((evt.keyCode === SC.Event.KEY_TAB) && this._ac_selectedWithTab) {
      this._ac_selectedWithTab = false;
      // indicate we've handled the event, otherwise we tab out of the edit field
      return true;
    }

    // Restore the original text and caret position on escape key.
    if (acInstance && (evt.keyCode === SC.Event.KEY_ESC)) {
      // restore the original text
      acInstance._value(acInstance.term);
      if (this._ac_matchPos && this._ac_matchStr) {
        // restore the selection position
        var element = acInstance.element.get(0),
            endMatchPos = this._ac_matchPos + this._ac_matchStr.length;
        if (element)
          element.selectionStart = element.selectionEnd = endMatchPos;
      }
      // close the autocomplete menu
      if (this._ac_isOpen)
        this.$('textarea').catcomplete('close');
    }

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
        // Use DOM mechanisms to get the selection position and field
        // contents because the SC mechanisms (e.g. this.get('selection'))
        // aren't always up-to-date at this point.
    var element = this.$('textarea').get(0),
        selStart = element && element.selectionStart,
        tCurrent = element && element.value,
        // the string up to the caret position
        tBeforeCaret = selStart ? tCurrent.substr(0, selStart) : tCurrent,
        // the string up to the caret plus one more char
        tBeyondCaret = selStart ? tCurrent.substr(0, selStart + 1) : tCurrent,
        // TODO: support unicode letters (e.g. accented characters).
        // Should then call removeDiacritics() to sanitize the search string.
        kRegLastWord = /\b([a-zA-Z_][\w]*)$/,
        kRegLastWordPlus = /\b([a-zA-Z_][\w]*).?$/,
        tBeforeMatch = tBeforeCaret && typeof tBeforeCaret === "string"
                        ? tBeforeCaret.match( kRegLastWord) : null,
        tBeyondMatch = tBeyondCaret && typeof tBeyondCaret === "string"
                        ? tBeyondCaret.match( kRegLastWordPlus) : null,
        tSearchStr = tBeforeMatch && tBeforeMatch[1],
        tBeyondStr = tBeyondMatch && tBeyondMatch[1],
        // If the before-caret word match is different than the beyond-caret
        // word match, then the caret is in the middle of the word and we
        // shouldn't try to bring up the autocomplete menu.
        caretInMiddleOfWord = (tSearchStr !== tBeyondStr);

    // To support autocompletion of partial field contents, we need to detect
    // the appropriate conditions and launch the search ourselves, because by
    // default jQueryUI's autocomplete widget only matches the full text.
    if (isIdentifierOrBackspaceKeyCode(evt.keyCode) && !caretInMiddleOfWord &&
        tSearchStr && tSearchStr.length && (tSearchStr.length < tCurrent.length)) {
      this._ac_matchPos = selStart && (selStart - tSearchStr.length);
      this._ac_matchStr = tSearchStr;
      this.$('textarea').catcomplete('search', tSearchStr);
    }
    else if (!isAutoCompleteKeyCode(evt.keyCode)) {
      this._ac_matchPos = null;
      this._ac_matchStr = null;
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

/*
  One-time initialization of our customized autocomplete widget.
 */
DG.FormulaTextEditView.isAutoCompleteInitialized = false;
DG.FormulaTextEditView.initializeAutoComplete = function() {
  if (DG.FormulaTextEditView.isAutoCompleteInitialized) return;

  // from http://stackoverflow.com/a/6969486
  function escapeRegExp(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
  }

  /*
    Adapted from autocomplete example at http://jqueryui.com/autocomplete/#categories
   */
  $.widget( "custom.catcomplete", $.ui.autocomplete, {
    _create: function() {
      this._super();
      this.widget().menu( "option", "items", "> :not(.ui-autocomplete-category)" );
    },

    // override menu rendering to support categories
    _renderMenu: function( ul, items ) {
      var that = this,
          currentCategory = "";
      // add 'dg-wants-touch' class so SC.RootResponder won't swallow touch
      // events targeted to our menu. See comment in main.js for details.
      if (!$(ul).hasClass('dg-wants-touch'))
        $(ul).addClass('dg-wants-touch');
      $.each( items, function( index, item ) {
        var li;
        if ( item.category !== currentCategory ) {
          ul.append( "<li class='ui-autocomplete-category'>" + item.category + "</li>" );
          currentCategory = item.category;
        }
        li = that._renderItemData( ul, item );
        if ( item.category ) {
          li.attr( "aria-label", item.category + " : " + item.label );
        }
      });
    },

    // override item rendering to support highlighting the internal match
    _renderItem: function( ul, item ) {
      var searchStr = this.options._dg_editView._ac_matchStr || this.term,
          searchLen = searchStr.length,
          re = new RegExp(escapeRegExp(searchStr), 'i'),
          // match against label, which has had diacritics removed
          match = re.exec(item.label);

      if (!match) {
        return $( "<li>" )
          .append( $( "<div>" ).text( item.value ) )
          .appendTo( ul );
      }

      var matchLoc = match.index,
          preMatchStr = matchLoc > 0 ? item.value.substr(0, matchLoc) : "",
          // Note: Removing diacritics can change the length of the string.
          // In that case, we could end up highlighting the wrong characters
          // in the menu item.
          matchStr = (matchLoc != null) ? item.value.substr(matchLoc, searchLen) : "",
          postMatchStr = matchLoc + searchLen < item.value.length
                          ? item.value.substr(matchLoc + searchLen) : "",
          itemTag = $('<div>');
      if (preMatchStr)
        $('<span>').text(preMatchStr).appendTo(itemTag);
      if (matchStr)
        $('<span>').css({ fontWeight: 'bold',
                          fontFamily: item.fontFamily || 'inherit',
                          fontSize: item.fontSize || 'inherit' })
                    .text(matchStr).appendTo(itemTag);
      if (postMatchStr)
        $('<span>').text(postMatchStr).appendTo(itemTag);
      return $( "<li>" )
        .append( itemTag )
        .appendTo( ul );
    }
  });

  DG.FormulaTextEditView.isAutoCompleteInitialized = true;
};


