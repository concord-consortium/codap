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
    iconName: static_url('images/icon-table.svg'),
    depressedIconName: static_url('images/icon-table.svg'),
    target: 'DG.mainPage',
    action: 'openCaseTablesForEachContext',
    toolTip: 'DG.ToolButtonData.tableButton.toolTip', // "Open/close the case table (ctrl-alt-t)"
    localize: true,
    isEnabledBinding: SC.Binding.oneWay('DG.currDocumentController.ready'),
    iconExtent: { width: 27, height: 20 },
    classNames: ['dg-table-button']
  },

  graphButton: {
    title: 'DG.ToolButtonData.graphButton.title', // "Graph"
    iconName: static_url('images/icon-graph.svg'),
    depressedIconName: static_url('images/icon-graph.svg'),
    target: 'DG.mainPage',
    action: 'addGraph',
    toolTip: 'DG.ToolButtonData.graphButton.toolTip', // "Make a graph (ctrl-alt-g)"
    localize: true,
    isEnabledBinding: SC.Binding.oneWay('DG.currDocumentController.ready'),
    iconExtent: { width: 22, height: 20 },
    classNames: ['dg-graph-button']
  },

  mapButton: {
    title: 'DG.ToolButtonData.mapButton.title', // "Map"
    iconName: static_url('images/icon-map.svg'),
    depressedIconName: static_url('images/icon-map.svg'),
    target: 'DG.mainPage',
    action: 'addMap',
    toolTip: 'DG.ToolButtonData.mapButton.toolTip', // "Make a map"
    localize: true,
    isEnabledBinding: SC.Binding.oneWay('DG.currDocumentController.ready'),
    iconExtent: { width: 20, height: 20 },
    classNames: ['dg-map-button']
  },

  sliderButton: {
    title: 'DG.ToolButtonData.sliderButton.title',  // "Slider"
    iconName: static_url('images/icon-slider.svg'),
    depressedIconName: static_url('images/icon-slider.svg'),
    target: 'DG.mainPage',
    action: 'addSlider',
    toolTip: 'DG.ToolButtonData.sliderButton.toolTip',  // "Make a slider (ctrl-alt-s)"
    localize: true,
    iconExtent: { width: 25, height: 21 },
    classNames: ['dg-slider-button']
  },

  calcButton: {
    title: 'DG.ToolButtonData.calcButton.title',  // "Calc"
    iconName: static_url('images/icon-calc.svg'),
    depressedIconName: static_url('images/icon-calc.svg'),
    target: 'DG.mainPage',
    action: 'toggleCalculator',
    toolTip: 'DG.ToolButtonData.calcButton.toolTip',  // "Open/close the calculator (ctrl-alt-c)"
    localize: true,
    iconExtent: { width: 16, height: 20 },
    classNames: ['dg-calc-button']
  },

  textButton: {
    title: 'DG.ToolButtonData.textButton.title',  // "Text"
    iconName: static_url('images/icon-comment.svg'),
    depressedIconName: static_url('images/icon-comment.svg'),
    target: 'DG.mainPage',
    action: 'addText',
    toolTip: 'DG.ToolButtonData.textButton.toolTip',  // "Make a text object (ctrl-alt-shift-t)"
    localize: true,
    iconExtent: { width: 22, height: 20 },
    classNames: ['dg-text-button']
  }

};

DG.RightButtonData = {
  undoButton: {
    title: 'DG.mainPage.mainPane.undoButton.title', // "Undo"
    iconName: static_url('images/arrow-undo.svg'),
    depressedIconName: static_url('images/arrow-undo.svg'),
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
    flowSpacing: { right: 0, top: 18 },
    iconExtent: { width: 20, height: 20 },
    classNames: ['dg-undo-button']
  },

  redoButton: {
    title: 'DG.mainPage.mainPane.redoButton.title', // "Redo"
    iconName: static_url('images/arrow-redo.svg'),
    depressedIconName: static_url('images/arrow-uredo.svg'),
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
    flowSpacing: { right: 20, top: 18 },
    iconExtent: { width: 20, height: 20 },
    classNames: ['dg-redo-button']
  },

  tileListButton: {
    title: 'DG.ToolButtonData.tileListMenu.title',  // "Tiles"
    iconName: static_url('images/icon-tileList.svg'),
    depressedIconName: static_url('images/icon-tileList.svg'),
    target: 'DG.appController.tileMenuPane',
    action: 'showTileList',
    toolTip: 'DG.ToolButtonData.tileListMenu.toolTip',  // "Show the list of tiles in the document"
    localize: true,
    iconExtent: { width: 30, height: 20 },
    classNames: ['dg-tilelist-button']
  },

  optionButton: {
    title: 'DG.ToolButtonData.optionMenu.title',  // "Options"
    iconName: static_url('images/icon-options.svg'),
    depressedIconName: static_url('images/icon-options.svg'),
    target: 'DG.appController.optionMenuPane',
    action: 'popup',
    toolTip: 'DG.ToolButtonData.optionMenu.toolTip',  // "View or change CODAP options"
    localize: true,
    iconExtent: { width: 20, height: 20 },
    classNames: ['dg-option-button']
  },

  guideButton: {
    title: 'DG.ToolButtonData.guideMenu.title',  // "Guide"
    iconName: static_url('images/icon-guide.svg'),
    depressedIconName: static_url('images/icon-guide.svg'),
    target: 'DG.appController.guideMenuPane',
    action: 'popup',
    toolTip: 'DG.ToolButtonData.guideMenu.toolTip',  // "View or change CODAP options"
    localize: true,
    iconExtent: { width: 21, height: 20 },
    isVisible: false,
    classNames: ['dg-guide-button']
  }

};

