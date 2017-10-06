// ==========================================================================
//                            DG.ToolButtonData
//
//  Author:   William Finzer
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

DG.ToolButtonData = {
  tableButton: {
    title: 'DG.ToolButtonData.tableButton.title', // "Table"
    iconClass: 'moonicon-icon-table',
    target: 'DG.appController.caseTableMenuPane',
    action: 'showMenu',
    toolTip: 'DG.ToolButtonData.tableButton.toolTip', // "Open/close the case table (ctrl-alt-t)"
    localize: true,
    isEnabledBinding: SC.Binding.oneWay('DG.currDocumentController.ready'),
    classNames: ['dg-table-button']
  },

  graphButton: {
    title: 'DG.ToolButtonData.graphButton.title', // "Graph"
    iconClass: 'moonicon-icon-graph',
    target: 'DG.mainPage',
    action: 'addGraph',
    toolTip: 'DG.ToolButtonData.graphButton.toolTip', // "Make a graph (ctrl-alt-g)"
    localize: true,
    isEnabledBinding: SC.Binding.oneWay('DG.currDocumentController.ready'),
    classNames: ['dg-graph-button']
  },

  mapButton: {
    title: 'DG.ToolButtonData.mapButton.title', // "Map"
    iconClass: 'moonicon-icon-map',
    target: 'DG.mainPage',
    action: 'addMap',
    toolTip: 'DG.ToolButtonData.mapButton.toolTip', // "Make a map"
    localize: true,
    isEnabledBinding: SC.Binding.oneWay('DG.currDocumentController.ready'),
    classNames: ['dg-map-button']
  },

  sliderButton: {
    title: 'DG.ToolButtonData.sliderButton.title',  // "Slider"
    iconClass: 'moonicon-icon-slider',
    target: 'DG.mainPage',
    action: 'addSlider',
    toolTip: 'DG.ToolButtonData.sliderButton.toolTip',  // "Make a slider (ctrl-alt-s)"
    localize: true,
    classNames: ['dg-slider-button']
  },

  calcButton: {
    title: 'DG.ToolButtonData.calcButton.title',  // "Calc"
    iconClass: 'moonicon-icon-calc',
    target: 'DG.mainPage',
    action: 'toggleCalculator',
    toolTip: 'DG.ToolButtonData.calcButton.toolTip',  // "Open/close the calculator (ctrl-alt-c)"
    localize: true,
    classNames: ['dg-calc-button']
  },

  textButton: {
    title: 'DG.ToolButtonData.textButton.title',  // "Text"
    iconClass: 'moonicon-icon-comment',
    target: 'DG.mainPage',
    action: 'addText',
    toolTip: 'DG.ToolButtonData.textButton.toolTip',  // "Make a text object (ctrl-alt-shift-t)"
    localize: true,
    classNames: ['dg-text-button']
  },

  pluginButton: {
    title: 'DG.ToolButtonData.pluginMenu.title',  // "Utilities"
    iconClass: 'moonicon-icon-plug',
    target: 'DG.appController.pluginMenuPane',
    action: 'showMenu',
    toolTip: 'DG.ToolButtonData.pluginMenu.toolTip',  // "Select a utility component"
    localize: true,
    classNames: ['dg-plugin-button']
  }

};

DG.RightButtonData = {
  undoButton: {
    title: 'DG.mainPage.mainPane.undoButton.title', // "Undo"
    iconClass: 'moonicon-arrow-undo',
    localize: true,
    toolTip: function() {
      var cmd = this.get('nextUndoCommand');
      return (cmd ? cmd.get('undoString') : 'DG.mainPage.mainPane.undoButton.toolTip');  // "Undo the last action"
    }.property('nextUndoCommand'),
    target: 'DG.UndoHistory',
    action: 'undo',
    nextUndoCommandBinding: SC.Binding.oneWay('DG.UndoHistory.nextUndoCommand'),
    isEnabledBinding: SC.Binding.oneWay('DG.UndoHistory.canUndo'),
    isVisibleBinding: SC.Binding.oneWay('DG.UndoHistory.enabled'),
    flowSpacing: { right: 0, top: 17 },
    classNames: ['dg-undo-button']
  },

  redoButton: {
    title: 'DG.mainPage.mainPane.redoButton.title', // "Redo"
    iconClass: 'moonicon-arrow-redo',
    localize: true,
    toolTip: function() {
      var cmd = this.get('nextRedoCommand');
      return (cmd ? cmd.get('redoString') : 'DG.mainPage.mainPane.redoButton.toolTip');  // "Redo the last undone action"
    }.property('nextRedoCommand'),
    target: 'DG.UndoHistory',
    action: 'redo',
    nextRedoCommandBinding: SC.Binding.oneWay('DG.UndoHistory.nextRedoCommand'),
    isEnabledBinding: SC.Binding.oneWay('DG.UndoHistory.canRedo'),
    isVisibleBinding: SC.Binding.oneWay('DG.UndoHistory.enabled'),
    flowSpacing: { right: 20, top: 17 },
    classNames: ['dg-redo-button']
  },

  tileListButton: {
    title: 'DG.ToolButtonData.tileListMenu.title',  // "Tiles"
    iconClass: 'moonicon-icon-tileList',
    target: 'DG.appController.tileMenuPane',
    action: 'showTileList',
    toolTip: 'DG.ToolButtonData.tileListMenu.toolTip',  // "Show the list of tiles in the document"
    localize: true,
    classNames: ['dg-tilelist-button']
  },

  optionButton: {
    title: 'DG.ToolButtonData.optionMenu.title',  // "Options"
    iconClass: 'moonicon-icon-options',
    target: 'DG.appController.optionMenuPane',
    action: 'popup',
    toolTip: 'DG.ToolButtonData.optionMenu.toolTip',  // "View or change CODAP options"
    localize: true,
    classNames: ['dg-option-button']
  },

  guideButton: {
    title: 'DG.ToolButtonData.guideMenu.title',  // "Guide"
    iconClass: 'moonicon-icon-guide',
    target: 'DG.appController.guideMenuPane',
    action: 'popup',
    toolTip: 'DG.ToolButtonData.guideMenu.toolTip',  // "View or change CODAP options"
    localize: true,
    isVisible: false,
    classNames: ['dg-guide-button']
  },

  helpButton: {
    title: 'DG.ToolButtonData.help.title',  // "Guide"
    iconClass: 'moonicon-icon-help',
    target: 'DG.appController.helpMenuPane',
    action: 'popup',
    toolTip: 'DG.ToolButtonData.help.toolTip',  // "View or change CODAP options"
    localize: true,
    isVisible: true,
    classNames: ['dg-help-button']
  }

};

