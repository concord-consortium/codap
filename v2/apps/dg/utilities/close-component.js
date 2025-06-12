DG.closeComponent = function (iComponentID) {
    var tState;

    // Give the controller a chance to do some housekeeping before we close it (defocus, commit edits, etc.).
    // Also, do this outside of the undo command, so that it can register its own
    // separate undo command if desired.
    var tController = DG.currDocumentController().componentControllersMap[iComponentID];
    if (!tController) return;
    tController.willCloseComponent();

    DG.UndoHistory.execute(DG.Command.create({
      name: 'component.close',
      undoString: 'DG.Undo.component.close',
      redoString: 'DG.Redo.component.close',
      _componentId: iComponentID,
      _controller: function() {
        return DG.currDocumentController().componentControllersMap[this._componentId];
      },
      _model: null,
      execute: function() {
        tController = this._controller();
        var tComponentView = tController.get('view'),
            tContainerView = tComponentView.get('parentView');

        this.log = 'closeComponent: %@'.fmt(tComponentView.get('title'));
        this._model = tController.get('model');

        // Some components (the graph in particular), won't restore correctly without calling willSaveComponent(),
        // because sometimes not all of the info necessary to restore the view is actively held in the model.
        // (In the graph's case, there is 'model' which relates to the view, and 'graphModel' which holds all of the
        // configuration like axis ranges, legends, etc.)
        tController.willSaveComponent();

        if (tController.saveGameState) {
          // If we are a GameController, try to save state.
          // Since this is an asynchronous operation, we have to hold off closing the component
          // until it is complete (or it will fail).
          // Also, since closing the document will happen after this command executes, dirtying the
          // document will clear the undo history, so we must force it not to dirty.
          tController.saveGameState(function(result) {
            if (result && result.success) {
              tState = result.state || result.values;
            }
            SC.run(function () {
              tContainerView.removeComponentView( tComponentView);
            });
          });
        } else {
          tContainerView.removeComponentView( tComponentView);
        }
        DG.currDocumentController().notificationManager.sendNotification({
          action: 'notify',
          resource: 'component',
          values: {
            operation: 'delete',
            type: tController.getPath('model.type'),
            id: tController.getPath('model.id'),
            name: tController.getPath('model.name'),
            title: tController.getPath('model.title')
          }
        });
      },
      undo: function() {
        DG.currDocumentController().createComponentAndView(this._model);

        tController = this._controller();
        if (tController.restoreGameState && tState) {
          tController.restoreGameState({gameState: tState});
        }
      }
    }));
  };
