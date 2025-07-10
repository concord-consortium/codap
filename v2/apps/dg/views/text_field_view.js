// ==========================================================================
//                            DG.TextFieldView
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

/** @class  DG.TextFieldView

  A wrapper for a TextFieldView that hooks into the DG.globalEditorLock.

  @extends SC.TextFieldView
*/
DG.TextFieldView = SC.TextFieldView.extend(
/** @scope DG.TextFieldView.prototype */ {

  isTextSelectable: YES,

  /**
    Override SproutCore method to coordinate with DG.globalEditorLock.
    @returns  {Boolean} True if successful; false otherwise.
   */
  beginEditing: function() {
    // If we're already active, keep it that way
    if( DG.globalEditorLock.isActive( this)) {
      return sc_super();
    }

    // If another editor is active, ask it to finish up
    if( !DG.globalEditorLock.commitCurrentEdit()) {
      return false;
    }

    var currValue = this.get('value'),
        beginResult = sc_super();
    if( beginResult) {
      // Stash original value in case we need to cancel
      this._prevValue = currValue;
      DG.globalEditorLock.activate( this);
    }
    return beginResult;
  },
  
  /**
    Override SproutCore method to coordinate with DG.globalEditorLock.
    @returns  {Boolean} True if successful; false otherwise.
   */
  commitEditing: function() {
    var commitResult = sc_super();
    if( commitResult && DG.globalEditorLock.isActive( this))
      DG.globalEditorLock.deactivate( this);
    return commitResult;
  },
  
  /**
    Override SproutCore method to coordinate with DG.globalEditorLock.
    Discard edits and restore original value.
    @returns  {Boolean} True if successful; false otherwise.
   */
  discardEditing: function() {
    this.set('value', this._prevValue || "");
    this.resignFirstResponder();
    if( DG.globalEditorLock.isActive( this))
      DG.globalEditorLock.deactivate( this);
    return true;
  },
  
  completeEditing: function() {
    // We tell the underlying HTMLElement to blur(), which triggers sending of a 'blur' event.
    // SC.TextFieldView responds to the 'blur' event by calling resignFirstResponder(),
    // commitEditing(), etc. So all we need to do is force the 'blur' event. It seems like
    // there should be SC.TextFieldView API for doing this, but it doesn't seem to exist.
    // (See SC.TextFieldView._textField_fieldDidBlur() for details of SC.TextFieldView's response.)
    this.$input().blur();
  },

  /**
    Implement SlickGrid.EditController protocol.
    @returns  {Boolean} True if commit was successful; false otherwise.
   */
  commitCurrentEdit: function() {
    return this.commitEditing();
  },
  
  /**
    Implement SlickGrid.EditController protocol.
    @returns  {Boolean} True if cancel was successful; false otherwise.
   */
  cancelCurrentEdit: function() {
    return this.discardEditing();
  },

  /**
    Sets the selection to the specified range.
    If only iStart is specified, sets it to a caret at that position.
    @param    {Number}    iStart -- The index of the start of the selection
    @param    {Number}    iEnd -- [Optional] The index of the end of the selection
                                  If not specified, iEnd = iStart
   */
  setSelection: function( iStart, iEnd) {
    if( SC.none( iStart)) return;
    var end = iEnd || iStart;
    if( end < iStart) end = iStart;
    this.set('selection', SC.TextSelection.create({ start: iStart, end: end }));
  },

  /**
    Replace the current selection with the specified string.
    @param    {String}    iNewString -- the string to insert
   */
  replaceSelectionWithString: function( iNewString) {
    var currText = this.get('value'),
        selection = this.get('selection'),
        selStart = selection.get('start'),
        selEnd = selection.get('end'),
        preText = currText.substr( 0, selStart),
        postText = currText.substr( selEnd),
        newText = preText + iNewString + postText,
        newSel = selStart + iNewString.length;
    this.set('value', newText);
    // If we aren't currently focused, then setting the selection will trigger a call to
    // _selectRootElement, which will select all the text. Setting the _disableNextSelectRoot
    // flag will trigger our _selectRootElement override to bypass this undesirable result.
    if( !this.get('focused'))
      this._disableNextSelectRoot = true;
    this.setSelection( newSel);
  }
});
