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
 * The main controller for Undo and Redo functionality.
 *
 * For documentation about how to use UndoHistory, please see /docs/undo.md
 *
 * @extends SC.Object
*/
DG.UndoHistory = SC.Object.create((function() {
  var kStateNotifyMap = [
      'nan',
      /*EXECUTE*/ 'executeNotification',
      /*UNDO*/    'undoNotification',
      /*REDO*/    'redoNotification'
  ];
  /** @scope DG.UndoHistory.prototype */
  return {

    EXECUTE: 1,
    UNDO: 2,
    REDO: 3,

    enabledBinding: SC.Binding.oneWay('DG.enableUndoHistory'),

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
        this._wrapAndRun(command, command.execute);
      } catch (e) {
        // Just let exceptions bubble up, but clear the stacks...
        this._clearUndo();
        this._clearRedo();
        throw e;
      }

      // If the command didn't actually change anything, then don't add this to the stack
      // and don't invalidate either stack.
      if (!command.causedChange) { return; }

      // _executeInProgress will still be true if this is a nested call to execute. In that case, don't
      // append to the stack (we'll assume the outer-most Command knows how to undo all of its side effects).
      if (this._executeInProgress) { return; }

      if (this.get('enabled') && command.isUndoable) {

        // If we can reduce this command with the previous one, replace this command with the
        // reduced version and pop the previous one out.
        if (command.reduce && this._undoStack.length > 0) {
          var reducedCommand = command.reduce(this._undoStack[this._undoStack.length-1]);
          if (reducedCommand) {
            command.reduced = true;
            this._undoStack.pop();
            command = reducedCommand;
          }
        }

        this._undoStack.push(command);
        // Since we're not using set/get to access the stacks, notify changes manually.
        this.notifyPropertyChange('_undoStack');
      } else {
        // We've hit a not-undoable command, so clear our undo stack
        this._clearUndo();
      }
      // Clear the redo stack every time we add a new command. We *don't* support applying changes
      // from a different change tree to the current tree.
      this._clearRedo();

      this._logAction(command, this.EXECUTE);
      this._notify(command, this.EXECUTE);
      this._dirtyDocument(command.changedObject);
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
      DG.globalEditorLock.commitCurrentEdit();

      // You can get here directly from a keyboard shortcut, so rather than check if we
      // have anything to undo outside of this function, we'll just double-check here.
      if (!this.get('enabled') || this._undoStack.length === 0) {
        return;
      }
      var command = this._undoStack.pop();
      try {
        this._wrapAndRun(command, command.undo);
      } catch (e) {
        this.showErrorAlert(true, e);
      }
      this._redoStack.push(command);

      // Since we're not using set/get to access the stacks, notify changes manually.
      this.notifyPropertyChange('_undoStack');
      this.notifyPropertyChange('_redoStack');

      if( !command.undoNotification)
        command.undoNotification = {
          action: 'notify',
          resource: 'document',
          values: {
            operation: 'undo',
          }
        };
      this._logAction(command, this.UNDO);
      this._notify(command, this.UNDO);
      this._dirtyDocument(command.changedObject);
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
      DG.globalEditorLock.commitCurrentEdit();

      // You can get here directly from a keyboard shortcut, so rather than check if we
      // have anything to redo outside of this function, we'll just double-check here.
      if (!this.get('enabled') || this._redoStack.length === 0) {
        return;
      }
      var command = this._redoStack.pop();
      try {
        this._wrapAndRun(command, command.redo);
      } catch (e) {
        this.showErrorAlert(false, e);
      }
      this._undoStack.push(command);

      // Since we're not using set/get to access the stacks, notify changes manually.
      this.notifyPropertyChange('_undoStack');
      this.notifyPropertyChange('_redoStack');

      if( !command.redoNotification)
        command.redoNotification = {
          action: 'notify',
          resource: 'document',
          values: {
            operation: 'redo',
          }
        };
      this._logAction(command, this.REDO);
      this._notify(command, this.REDO);
      this._dirtyDocument(command.changedObject);
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
      this.clearUndoRedoHistory();

      // Also log the current stack so we can track these down one-by-one
/*
      if (this.get('enabled')) {
        DG.Debug.logErrorRaw("Document dirtied outside of an Undo Command\n%@".fmt((new Error()).stack));
      }
*/
    },

    clearUndoRedoHistory: function() {
      this._clearUndo();
      this._clearRedo();
    },

    // Something went wrong. We shouldn't ever reach here, because if we do, it's because of a programming error.
    // BUT, if it does happen, display an error dialog to the user, and then clear the undo/redo stacks.
    // Odds are pretty high that the entire app is going to be messed up too, but there's not much we can do about that.
    showErrorAlert: function(wasUndo, err) {
      if (!err || !err.message) {
        err = {message: "Unknown error"};
      }
      DG.Debug.logErrorRaw("Exception occurred while %@: %@\n%@".fmt((wasUndo ? "undoing: " : "redoing: "), err.message, err.stack));
      DG.AlertPane.error({
        localize: true,
        message: (wasUndo ? 'DG.Undo.exceptionOccurred' : 'DG.Redo.exceptionOccurred'),
        buttons: [
          {title: "OK", action: function() { this.clearUndoRedoHistory(); }.bind(this) }
        ]
      });
    },

    makeComponentNotification: function( iOperation, iType) {
      return {
        action: 'notify',
        resource: 'component',
        values: {
          operation: iOperation,
          type: iType
        }
      };
    },

    /** @private
      Helper method to run a function in a certain context. All calls to documentWasChanged will be ignored during its execution.
      @param    {DG.Command}   cmd -- An instance of DG.Command, which is used as the context for the function execution.
      @param    {Function}    func -- A function to be executed.
     */
    _wrapAndRun: function(cmd, func) {
      // Check if we're executing nested inside of another call to execute.
      // If we are, don't touch _executeInProgress.
      if (this._executeInProgress) {
        func.call(cmd);
      } else {
        this._executeInProgress = true;
        // We'll catch exceptions higher up, so only clean up after ourselves here...
        try {
          func.call(cmd);
        } finally {
          this._executeInProgress = false;
        }
      }
    },

    /** @private
      Helper function for clearing the undo stack.
     */
    _clearUndo: function() {
      this._undoStack.length = 0;
      this.notifyPropertyChange('_undoStack');
      this._sendUndoChangeToDI('clearUndo');
    },

    /** @private
      Helper function for clearing the redo stack.
     */
    _clearRedo: function() {
      this._redoStack.length = 0;
      this.notifyPropertyChange('_redoStack');
      this._sendUndoChangeToDI('clearRedo');
    },

    _dirtyDocument: function(changedObject) {
      if (this._executeInProgress) {
        DG.dirtyCurrentDocument(changedObject);
      } else {
        this._executeInProgress = true;
        DG.dirtyCurrentDocument(changedObject);
        this._executeInProgress = false;
      }
    },

    _queuedLogMessage: null,

    _logAction: function(command, state) {
      var logString = '';
      if (state === this.UNDO) {
        logString = 'Undo: ';
      } else if (state === this.REDO) {
        logString = 'Redo: ';
      }
      if (typeof(command.log) === 'function') {
        logString += command.log(state);
      } else {
        logString += command.log;
      }

      if (this._queuedLogMessage && !command.reduced) {
        DG.logUser(this._queuedLogMessage);
        this._queuedLogMessage = null;
      }
      if (command.reduce && state === this.EXECUTE) {
        // avoid logging reduced log messages until the end
        this._queuedLogMessage = logString;
      } else {
        DG.logUser(logString);
      }
    },

    _notify: function (command, state) {
      var propName = kStateNotifyMap[state] || ((state === this.REDO) && kStateNotifyMap);
      var prop = command[propName];
      var notification = prop && (typeof prop === 'function')? prop(state): prop;
      if (notification) {
        DG.currDocumentController().notificationManager.sendNotification(notification);
      }
    },

    _sendUndoChangeToDI: function(operation) {
      DG.sendCommandToDI({action: 'notify', resource: 'undoChangeNotice',
                          values: { operation: operation,
                                    canUndo: this.get('canUndo'),
                                    canRedo: this.get('canRedo')} });
    }

  }; // return from function closure
})()); // function closure
