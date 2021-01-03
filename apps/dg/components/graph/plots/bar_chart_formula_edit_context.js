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

  openFormulaEditorDialog: function() {
    var formulaContext = this,
        dataContext = this.getPath('plottedFormula.context.plotModel.dataContext'),
        result = DG.AttributeFormulaView.buildOperandsMenuAndCompletionData(dataContext),
        clientOptions = this.get('clientOptions'),
        options = Object.assign({
                    applyTarget: formulaContext,
                    applyAction: 'applyNewFormula',
                    attrNamePrompt: 'DG.PlottedFormula.defaultNamePrompt'.loc(),
                    attrNameValue: "",
                    attrNameIsEnabled: false,
                    formulaValue: formulaContext.get('expression'),
                    formulaCompletions: result.completionData,
                    formulaOperands: result.operandsMenu
                  }, clientOptions),
        formulaDialog = DG.CreateAttributeFormulaView(options);
    this.set('formulaDialog', formulaDialog);
    return formulaDialog;
  },

  createEditCommand: function(newFormula) {
    var clientOptions = this.get('clientOptions'),
        originalFormula = this.get('expression');

    var setFormula = function setFormula(formula) {
      this.set('expression', formula);
      this.setPath('formulaView.value', formula);
    }.bind(this);

    return DG.Command.create({
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
    DG.UndoHistory.execute(cmd);

    var dialog = this.get('formulaDialog');
    if (dialog) {
      dialog.close();
      this.set('formulaDialog', null);
    }
  }
});

DG.BarChartFormulaEditContext.formulaEditContexts = {};

DG.BarChartFormulaEditContext.hasFormulaEditContextFor = function(iPlottedFormula) {
  return iPlottedFormula &&
      !SC.none(DG.BarChartFormulaEditContext.formulaEditContexts[iPlottedFormula.get('id')]);
};

DG.BarChartFormulaEditContext.getFormulaEditContext = function(iPlottedFormula) {
  var adornmentID = iPlottedFormula.get('id');
  if (!DG.BarChartFormulaEditContext.formulaEditContexts[adornmentID]) {
    DG.BarChartFormulaEditContext.formulaEditContexts[adornmentID] =
      DG.BarChartFormulaEditContext.create({ plottedFormula: iPlottedFormula });
  }
  return DG.BarChartFormulaEditContext.formulaEditContexts[adornmentID];
};

DG.BarChartFormulaEditContext.destroyFormulaEditContext = function( iID) {
  var tContext = DG.BarChartFormulaEditContext.formulaEditContexts[iID];
  if( tContext) {
    tContext.destroy();
    delete DG.BarChartFormulaEditContext.formulaEditContexts[iID];
  }
};