// ==========================================================================
//                            DG.ToolButtonData
//
//  Author:   William Finzer
//
//  Copyright ©2013 KCP Technologies, Inc., a McGraw-Hill Education Company
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

DG.ToolButtonData = [

      { name: 'fileMenu',
        desc: {
          title: 'DG.ToolButtonData.fileMenu.title',  // "File"
          iconName: static_url('images/folder.png'),
          depressedIconName: static_url('images/folder_depressed.png'),
          target: 'DG.appController.fileMenuPane',
          action: 'popup',
          toolTip: 'DG.ToolButtonData.fileMenu.toolTip',  // "Save and open document (ctrl-s and ctrl-o)"
          localize: true
      }},

      { name: 'gameMenu',
        desc: {
          title: 'DG.ToolButtonData.gameMenu.title',  // "Game"
          iconName: static_url('images/dg_ball.png'),
          depressedIconName: static_url('images/dg_ball_depressed.png'),
          target: 'DG.gameSelectionController.menuPane',
          action: 'popup',
          toolTip: 'DG.ToolButtonData.gameMenu.toolTip',  // "Choose the game to play (ctrl-alt-shift-g)"
          localize: true
      }},
      
      { name: 'tableButton',
        desc: {
          title: 'DG.ToolButtonData.tableButton.title', // "Table"
          iconName: static_url('images/table.png'),
          depressedIconName: static_url('images/table_depressed.png'),
          target: 'DG.mainPage',
          action: 'toggleCaseTable',
          toolTip: 'DG.ToolButtonData.tableButton.toolTip', // "Open/close the case table (ctrl-alt-t)"
          localize: true
      }},
      
      { name: 'graphButton',
        desc: {
          title: 'DG.ToolButtonData.graphButton.title', // "Graph"
          iconName: static_url('images/graph.png'),
          depressedIconName: static_url('images/graph_depressed.png'),
          target: 'DG.mainPage',
          action: 'addGraph',
          toolTip: 'DG.ToolButtonData.graphButton.toolTip', // "Make a graph (ctrl-alt-g)"
          localize: true
      }},

      { name: 'sliderButton',
        desc: {
          title: 'DG.ToolButtonData.sliderButton.title',  // "Slider"
          iconName: static_url('images/slider.png'),
          depressedIconName: static_url('images/slider_depressed.png'),
          target: 'DG.mainPage',
          action: 'addSlider',
          toolTip: 'DG.ToolButtonData.sliderButton.toolTip',  // "Make a slider (ctrl-alt-s)"
          localize: true
      }},
      
      { name: 'calcButton',
        desc: {
          title: 'DG.ToolButtonData.calcButton.title',  // "Calc"
          iconName: static_url('images/calc.png'),
          depressedIconName: static_url('images/calc_depressed.png'),
          target: 'DG.mainPage',
          action: 'toggleCalculator',
          toolTip: 'DG.ToolButtonData.calcButton.toolTip',  // "Open/close the calculator (ctrl-alt-c)"
          localize: true
      }},
            
      { name: 'textButton',
        desc: {
          title: 'DG.ToolButtonData.textButton.title',  // "Text"
          iconName: static_url('images/texttool.png'),
          depressedIconName: static_url('images/texttool_depressed.png'),
          target: 'DG.mainPage',
          action: 'addText',
          toolTip: 'DG.ToolButtonData.textButton.toolTip',  // "Make a text object (ctrl-alt-shift-t)"
          localize: true
      }}

//@if(debug)
      , { name: 'mapButton',
        desc: {
          title: 'DG.ToolButtonData.mapButton.title', // "Map"
          iconName: static_url('images/map.png'),
          depressedIconName: static_url('images/map_depressed.png'),
          target: 'DG.mainPage',
          action: 'toggleMap',
          toolTip: 'DG.ToolButtonData.mapButton.toolTip', // "Make a map"
          localize: true
      }}
//@endif

      , { name: 'optionButton',
        desc: {
          title: 'DG.ToolButtonData.optionMenu.title',  // "Options"
          iconName: static_url('images/options.png'),
          depressedIconName: static_url('images/options_depressed.png'),
          target: 'DG.appController.optionMenuPane',
          action: 'popup',
          toolTip: 'DG.ToolButtonData.optionMenu.toolTip',  // "View or change Data Games options"
          localize: true
      }}
];

