// ==========================================================================
//                      DG.BarChartFormulaEditContext
//
//  Author:   William Finzer
//
//  Copyright (c) 2021 by The Concord Consortium, Inc. All rights reserved.
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

DG.BarChartFormulaEditContext = DG.PlottedFormulaEditContext.extend({

  plotModel: null,  // Set by caller during create

  openFormulaEditorDialog: function() {
    var formulaContext = this,
        dataContext = this.getPath('plotModel.dataContext'),
        result = DG.AttributeFormulaView.buildOperandsMenuAndCompletionData(dataContext),
        clientOptions = this.get('clientOptions'),
        options = Object.assign({
                    applyTarget: formulaContext,
                    applyAction: 'applyNewFormula',
                    attrNamePrompt: 'DG.PlottedFormula.defaultNamePrompt'.loc(),
                    attrNameValue: "",
                    attrNameIsEnabled: false,
                    formulaValue: formulaContext.getPath('plotModel.expression'),
                    formulaCompletions: result.completionData,
                    formulaOperands: result.operandsMenu
                  }, clientOptions),
        formulaDialog = DG.CreateAttributeFormulaView(options);
    this.set('formulaDialog', formulaDialog);
    return formulaDialog;
  },

  createEditCommand: function(newFormula) {
    var clientOptions = this.get('clientOptions'),
        originalFormula = this.getPath('plotModel.expression');

    var setFormula = function setFormula(formula) {
      this.setPath('plotModel.expression', formula);
    }.bind(this);

    return DG.Command.create({
      isUndoable: clientOptions.isUndoable,
      name: clientOptions.commandName,
      undoString: clientOptions.undoString,
      redoString: clientOptions.redoString,
      log: clientOptions.logMessage &&
            clientOptions.logMessage.fmt(originalFormula, newFormula),
      execute: function() {
        setFormula(newFormula);
      },
      undo: function() {
        setFormula(originalFormula);
      },
      redo: function() {
        setFormula(newFormula);
      }
    });
  },

  applyNewFormula: function() {
    var cmd = this.createEditCommand(this.getPath('formulaDialog.formula'));
    if( cmd.isUndoable)
      DG.UndoHistory.execute(cmd);
    else
      cmd.execute();

    var dialog = this.get('formulaDialog');
    if (dialog) {
      dialog.close();
      this.set('formulaDialog', null);
    }
  }
});

DG.BarChartFormulaEditContext.formulaEditContexts = {};

DG.BarChartFormulaEditContext.hasFormulaEditContextFor = function(iPlotModel) {
  return iPlotModel &&
      !SC.none(DG.BarChartFormulaEditContext.formulaEditContexts[DG.Debug.scObjectID(iPlotModel)]);
};

DG.BarChartFormulaEditContext.getFormulaEditContext = function(iPlotModel) {
  var plotID = DG.Debug.scObjectID(iPlotModel);
  if (!DG.BarChartFormulaEditContext.formulaEditContexts[plotID]) {
    DG.BarChartFormulaEditContext.formulaEditContexts[plotID] =
      DG.BarChartFormulaEditContext.create({ plotModel: iPlotModel });
  }
  return DG.BarChartFormulaEditContext.formulaEditContexts[plotID];
};

DG.BarChartFormulaEditContext.destroyFormulaEditContext = function( iID) {
  var tContext = DG.BarChartFormulaEditContext.formulaEditContexts[iID];
  if( tContext) {
    tContext.destroy();
    delete DG.BarChartFormulaEditContext.formulaEditContexts[iID];
  }
};