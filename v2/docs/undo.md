<!-- This uses Github flavored markdown. View it directly in Github: https://github.com/concord-consortium/codap/blob/master/docs/undo.md -->

# Undo/Redo

Implementing undo revolves around two classes, mainly. `DG.Command` defines the API for encapsulating undoable things. `DG.UndoHistory` provides the API for executing those undoable commands and provides access to undoing or redoing previously executed commands.

### Commands

An undoable action is encapsulated within a Command. A Command is any object which conforms to the API set out in `DG.Command` -- it does not need to be an instance of `DG.Command`, nor does it need to be a subclass of it. As long as all of the various properties and methods are implemented on your object, you'll be able to execute it through `DG.UndoHistory`.

Commands have the following *properties* (defaults applicable when using `DG.Command`):

| Property      | Type     | Default | Purpose |
| --------      | ----     | ------- | ------- |
| name          | string   | `null`  | An internal identifier for each command, for debugging identifying. |
| undoString    | string   | `null`  | Provides the tooltip for the _Undo_ button when this Command is next to be undone. CODAP will attempt to localize this string before it is used. |
| redoString    | string   | `null`  | Provides the tooltip for the _Redo_ button when this Command is next to be redone. CODAP will attempt to localize this string before it is used.   |
| isUndoable    | boolean  | `true`  | A flag for whether or not this Command can be undone. If `false` after the `execute` method has been called, all stacked undoable commands will be discarded. This provides a mechanism by which a user can be prevented from undoing past a certain point. _This property can be set during the execute method._ |
| causedChange  | boolean  | `true`  | A flag for whether or not this Command actually caused a change. If `false` after the `execute` method has been called, this Command will not be added to the stack of undoable actions. This provides a mechanism through which an action that may _potentially_ change the document can be executed but will only register itself as undoable if a change was made. _This property can be set during the execute method._ |
| changedObject | object   | `null`  | A specific object which was changed during the `execute` method. This should be the same object that would get passed to `DG.dirtyCurrentDocument()` to tell the document controller which parts of the document need to be saved. _This property can be set during the execute method._ |
| log           | string or function | 'unknown action'   | This string (or the string returned by this function) will get passed to `DG.logUser()` after `execute`, `undo`, and `redo` are called on this Command. The string will be prepended with `Undo: ` or `Redo: ` when those methods are called. _This property can be set during the execute, undo or redo methods._ |

Commands also have the following *methods*:

| Method  | Purpose |
| ------  | ------- |
| execute | This method encapsulates an undoable action. This function is called when an action is first executed and should be the default code for doing an action. |
| undo    | This method encapsulates the actions necessary to undo all of the changes made during the `execute` method. |
| redo    | This method encapsulated the actions necessary to redo all of the changes made during the `execute` method. By default, this method just calls `execute` again, but can be implemented if special actions are required. |
| reduce  | This optional method allows multiple consecutive commands to be reduced to a single command in the undo history. It takes a function in the form `reduce: function(previousCommand)` and either returns a single command that combines the two actions into one, or returns `false` to indicate that the commands should not be reduced. |

### Flow

When implementing an Undoable action, the following flow must be kept in mind:

1. A Command is created

        var cmd = DG.Command.create({
          name: 'some.command',
          undoString: 'DG.Undo.example',
          redoString: 'DG.Redo.example',
          log: 'Some command occurred',
          execute: function() {
            // Do something here
          },
          undo: function() {
            // Undo everything here
          },
          redo: function() {
            // Redo everything here
          }
        });

1. The Command is executed via `DG.UndoHistory.execute()`

        DG.UndoHistory.execute(cmd);

1. The user continues to use CODAP.
    - For each action that can be undone, a Command is added to the Undo stack.
    - If the action can't be undone (isUndoable is `false` or the document was changed outside of a Command execution), the Undo stack is cleared.
    - The redo stack is always cleared after a change occurs (we do not support branching history).
1. The user hits the Undo button.
    - The `undo` method for the most recently added Undo command is called (the most recently executed or redone Command).
    - The Command which was just undone is moved from the Undo stack into the Redo stack.
    - This process is repeated for each press of the Undo button.
1. The user hits the Redo button.
    - The `redo` method for the most recently undone Command is called.
    - The Command which was just redone is moved from the Redo stack to the Undo stack.
1. Repeat.

### Tips / Gotchas

- If implementing a Command from within a controller or view, *do not reference the containing controller or view directly*. It's possible for that controller or view to no longer be active when undo or redo gets called (the primary case being when a component is destroyed and recreated as part of other undo or redo actions). Instead, store the component model's id, and use it to look up the controller or view at function call time.

        var originalValue = 'bar1',
            newValue = 'bar2';
        DG.UndoHistory.execute(DG.Command.create({
          name: 'view.change',
          undoString: 'DG.Undo.view.change',
          redoString: 'DG.Redo.view.change',
          log: 'view changed',
          _componentId: this.getPath('controller.model.id'),
          _controller: function() {
            return DG.currDocumentController().componentControllersMap[this._componentId];
          },
          execute: function() {
            var currentView = this._controller().get('view');
            // make some change to the view
            currentView.set('foo', newValue);
          },
          undo: function() {
            var currentView = this._controller().get('view');
            // revert some change to the view
            currentView.set('foo', originalValue);
          }
        }));

- You do not need to call `DG.dirtyCurrentDocument()` as part of your `execute`, `undo` or `redo` methods. `DG.UndoHistory` will automatically call it.
- Undo does not currently support asynchronous changes. If your `execute`, `undo` or `redo` methods trigger asynchronous code which dirties the document, you will end up clearing the Undo stacks even though the original calls were encapsulated in a Command.
- Undo does not currently support coalescing multiple Commands in a sequence into a single undoable action. Each Command will be added to the Undo stack separately.
- Nested Commands are executed without adding them to the Undo stack. So if your Command calls code which creates and executes another Command, your Command will need to ensure that it can undo and redo the changes that were made in the called Command in addition to the ones within your Command, since the `undo` and `redo` methods on that Command will not be called.

### Reducing commands

Adding a `reduce` function allows multiple consecutive commands to be merged into one single command.

A reducing function takes the last command in the undo stack, and, along with the ability to inspect the current comment (`this`), can return a new command.

When implementing a reducing function, it it up to the function to check if a reduction can be performed. A naive way it might do this is to check that the `name` of the previous command is the same as that of the current command.

The easiest way to return a new command is simply to modify the current command and return that. One easy way that commands may be merged is to copy the commonly-used `_beforeStorage` from the previous command and copy it into the current command.

If a command is reducable, only the last action in a stream of reduced events will be logged. Because
we can't know ahead of time which will be the last, the message will be logged after the first action
that was not reduced.
