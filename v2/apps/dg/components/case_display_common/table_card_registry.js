// ==========================================================================
//  
//  Author:   jsandoe
//
//  Copyright (c) 2019 by The Concord Consortium, Inc. All rights reserved.
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
// Keeps track of case tables and case cards in the current document.
DG.TableCardRegistry = SC.Object.extend({

  contextCardMap: null,

  contextTableMap: null,

  init: function () {
    this.contextCardMap = {};
    this.contextTableMap = {};
  },

  reset: function () {
    this.contextCardMap = {};
    this.contextTableMap = {};
  },

  /**
   *
   * @param dataContext {DG.DataContext || string} dataContext or id of one.
   * @param view {DG.CaseCardView | DG.CaseTableView}
   */
  registerView: function (dataContext, view) {
    var contextID = (typeof dataContext === 'object')? dataContext.get('id'): dataContext;
    if (contextID != null && view) {
      var tContentView = view.get('contentView');
      if (view && tContentView instanceof DG.HierTableView) {
        this.contextTableMap[contextID] = view;
      } else if (view && tContentView instanceof DG.CaseCardView) {
        this.contextCardMap[contextID] = view;
      } else {
        DG.log("TableCardRegistry: unrecognized view");
      }
    } else {
      DG.log('TableCardRegistry: Context: no id');
    }
  },

  deregisterViews: function (dataContext) {
    var contextID = (typeof dataContext === 'object')? dataContext.get('id'): dataContext;
    delete this.contextCardMap[contextID];
    delete this.contextTableMap[contextID];
  },

  /**
   *
   * @param dataContext {DG.DataContext || string} dataContext or id of one.
   */
  getViewForContext: function (dataContext) {
    var contextID = (typeof dataContext === 'object')? dataContext.get('id'): dataContext;
    var cardView = this.contextCardMap[contextID];
    var tableView = this.contextTableMap[contextID];
    var view = (cardView && cardView.getPath('model.content.isActive'))? cardView:
        (tableView && tableView.getPath('model.content.isActive'))? tableView: null;
    return view;
  },

  getTableView: function (dataContext) {
    var contextID = (typeof dataContext === 'object')? dataContext.get('id'): dataContext;
    return this.contextTableMap[contextID];
  },

  getCardView: function (dataContext) {
    var contextID = (typeof dataContext === 'object')? dataContext.get('id'): dataContext;
    return this.contextCardMap[contextID];
  },

  getActiveViewTypeForContext: function (dataContext) {
    var view = this.getViewForContext(dataContext);
    if (view) {
      return view.getPath('model.type');
    }
  }

});