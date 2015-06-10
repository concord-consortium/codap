// ==========================================================================
//                      DG.UndoHistory
//
//  The controller for managing undo/redo.
//
//  Based on concepts from Fathom, Ivy (https://github.com/concord-consortium/building-models/blob/master/src/code/utils/undo-redo.coffee),
//    and undo.js (https://github.com/jzaefferer/undo/blob/master/undo.js)
//
//  Author:   Aaron Unger
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

  @extends SC.Object
*/
DG.UndoHistory = SC.Object.create((function() {
/** @scope DG.UndoHistory.prototype */
  return {
    /** @private
      A list of commands available to be undone. The last item in the array is the next item
      to be undone. This makes it easy to use pop() when undoing things and push() to add new commands on.
     */
    _undoStack: [],

    /** @private
      A list of commands available to be redone. The last item in the array is the next item
      to be redone. This makes it easy to use pop() when redoing things and push() to add new commands on.
     */
    _redoStack: [],

    /** @private
      A flag so that we can know if calls to documentWasChanged happened inside of a command function or not.
     */
    _executeInProgress: false,

    /**
      Registers a command which can be undone and redone at a later point. The command is immediately executed,
      and then added to the stack for later.
      @param    {DG.Command}  command -- An instance of DG.Command, which provides methods for doing, undoing and redoing an action.
     */
    execute: function(command) {
      try {
        this._wrapAndRun(command, command.execute); // Just let exceptions bubble up, but clear the stacks...
      } finally {
        this._clearUndo();
        this._clearRedo();
      }

      if (command.isUndoable) {
        this._undoStack.push(command);
        // Since we're not using set/get to access the stacks, notify changes manually.
        this.notifyPropertyChange('_undoStack');
      } else {
        // We've hit an not-undoable command, so clear our undo stack
        this._clearUndo();
      }
      // Clear the redo stack every time we add a new command. We *don't* support applying changes
      // from a different change tree to the current tree.
      this._clearRedo();
    },

    /**
     *  A flag indicating whether we have any commands to undo.
     *  @property {Boolean}
     */
    canUndo: function() {
      return this._undoStack.length > 0;
    }.property('_undoStack'),

    /**
     *  The next command which will be undone.
     *  @property {DG.Command}
     */
    nextUndoCommand: function() {
      if (this._undoStack.length === 0) {
        return null;
      }
      return this._undoStack[this._undoStack.length-1];
    }.property('_undoStack'),

    /**
      Undoes the most recently executed command and adds that command to the redo stack.
     */
    undo: function() {
      // You can get here directly from a keyboard shortcut, so rather than check if we
      // have anything to undo outside of this function, we'll just double-check here.
      if (this._undoStack.length === 0) {
        return;
      }
      var command = this._undoStack.pop();
      try {
        this._wrapAndRun(command, command.undo);
      } catch (e) {
        // Something went wrong. We shouldn't ever reach here, because if we do, it's because of a programming error.
        // BUT, if it does happen, display an error dialog to the user, and then clear the undo/redo stacks.
        // Odds are pretty high that the entire app is going to be messed up too, but there's not much we can do about that.
        DG.AlertPane.error({
          localize: true,
          message: 'DG.Undo.exceptionOccurred',
          buttons: [
            {title: "OK", action: function() { this._clearUndo(); this._clearRedo(); }.bind(this) }
          ]
        });
      }
      this._redoStack.push(command);

      // Since we're not using set/get to access the stacks, notify changes manually.
      this.notifyPropertyChange('_undoStack');
      this.notifyPropertyChange('_redoStack');
    },

    /**
     *  A flag indicating whether we have any commands to redo.
     *  @property {Boolean}
     */
    canRedo: function() {
      return this._redoStack.length > 0;
    }.property('_redoStack'),

    /**
     *  The next command which will be redone.
     *  @property {DG.Command}
     */
    nextRedoCommand: function() {
      if (this._redoStack.length === 0) {
        return null;
      }
      return this._redoStack[this._redoStack.length-1];
    }.property('_redoStack'),

    /**
      Redoes the most recently undone command and adds that command to the undo stack.
     */
    redo: function() {
      // You can get here directly from a keyboard shortcut, so rather than check if we
      // have anything to redo outside of this function, we'll just double-check here.
      if (this._redoStack.length === 0) {
        return;
      }
      var command = this._redoStack.pop();
      try {
        this._wrapAndRun(command, command.redo);
      } catch (e) {
        // Something went wrong. We shouldn't ever reach here, because if we do, it's because of a programming error.
        // BUT, if it does happen, display an error dialog to the user, and then clear the undo/redo stacks.
        // Odds are pretty high that the entire app is going to be messed up too, but there's not much we can do about that.
        DG.AlertPane.error({
          localize: true,
          message: 'DG.Redo.exceptionOccurred',
          buttons: [
            {title: "OK", action: function() { this._clearUndo(); this._clearRedo(); }.bind(this) }
          ]
        });
      }
      this._undoStack.push(command);

      // Since we're not using set/get to access the stacks, notify changes manually.
      this.notifyPropertyChange('_undoStack');
      this.notifyPropertyChange('_redoStack');
    },

    /**
      This method is called automatically by DG.dirtyCurrentDocument. If a document is dirtied
      as part of a command execution, then we ignore it. Otherwise, we clear the undo and redo stacks
      since a document-changing action took place which can't be undone.
     */
    documentWasChanged: function() {
      if (this._executeInProgress) { return; } // This is fine, we're doing it as part of a Command action

      // Otherwise, this wasn't part of a command, so this change is not able to be undone.
      // Clear the stacks
      this._clearUndo();
      this._clearRedo();
    },

    /** @private
      Helper method to run a function in a certain context. All calls to documentWasChanged will be ignored during its execution.
      @param    {DG.Command}   cmd -- An instance of DG.Command, which is used as the context for the function execution.
      @param    {Function}    func -- A function to be executed.
     */
    _wrapAndRun: function(cmd, func) {
      this._executeInProgress = true;
      // We'll catch exceptions higher up, so only clean up after ourselves here...
      try {
        func.call(cmd);
      } finally {
        this._executeInProgress = false;
      }
    },

    /** @private
      Helper function for clearing the undo stack.
     */
    _clearUndo: function() {
      this._undoStack.length = 0;
      this.notifyPropertyChange('_undoStack');
    },

    /** @private
      Helper function for clearing the redo stack.
     */
    _clearRedo: function() {
      this._redoStack.length = 0;
      this.notifyPropertyChange('_redoStack');
    }

  }; // return from function closure
})()); // function closure
