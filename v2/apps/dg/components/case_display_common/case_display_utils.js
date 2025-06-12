// ==========================================================================
//  
//  Author:   kswenson
//
//  Copyright (c) 2020 by The Concord Consortium, Inc. All rights reserved.
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
//
DG.CaseDisplayUtils = {

  /**
   *
   * @param iAttribute {DG.Attribute} attribute for tooltip
   */
  getTooltipForAttribute: function (iAttribute) {
    var name = iAttribute.get('name'),
        unit = iAttribute.get('unit'),
        description = iAttribute.get('description'),
        formula = iAttribute.get('formula');
    if (!description && !formula)
      return unit ? 'DG.CaseCard.attrHintUnitsOnly'.loc(name, unit)
                  : 'DG.CaseCard.attrHintPlain'.loc(name);
    if (!formula)
      return 'DG.CaseCard.attrHintDescription'.loc(name, description);
    if (!description)
      return 'DG.CaseCard.attrHintFormula'.loc(name, formula);
    return 'DG.CaseCard.attrHintDescriptionAndFormula'.loc(name, description, formula);
  },

  setCollectionNameWithCommand: function (iDataContext, iOldName, iNewName) {

    function setCollectionName(currName, newName) {
      var tCollectionClient = iDataContext.getCollectionByName(currName);
      if (tCollectionClient) {
        iDataContext.applyChange({
          operation: 'updateCollection',
          collection: tCollectionClient,
          properties: { name: newName }
        });
      }
    }

    DG.UndoHistory.execute(DG.Command.create({
      name: 'caseTable.collectionNameChange',
      undoString: 'DG.Undo.caseTable.collectionNameChange',
      redoString: 'DG.Redo.caseTable.collectionNameChange',
      execute: function () {
        setCollectionName(iOldName, iNewName);
        this.log = "Change collection name from '%@' to '%@'".fmt(iOldName, iNewName);
      },
      undo: function () {
        setCollectionName(iNewName, iOldName);
      },
      redo: function() {
        setCollectionName(iOldName, iNewName);
      }
    }));
  }

};
