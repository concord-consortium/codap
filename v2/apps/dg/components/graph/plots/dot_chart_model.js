// ==========================================================================
//                          DG.DotChartModel
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

sc_require('components/graph/plots/chart_model');

/** @class  DG.DotChartModel - The model for a plot with categorical axes

 @extends DG.ChartModel
 */
DG.DotChartModel = DG.ChartModel.extend(
    /** @scope DG.DotChartModel.prototype */
    {
      /**
       * Override
       * @property {Boolean}
       */
      displayAsBarChart: false,

      /**
       *
       * @param iPlace {DG.GraphTypes.EPlace}
       * @return { class }
       */
      getDesiredAxisClassFor: function( iPlace) {
        if( iPlace === this.get('primaryAxisPlace'))
          return DG.CellAxisModel;
        else if(iPlace === this.get('secondaryAxisPlace')) {
          return SC.none( this.get('secondaryVarID')) ? DG.AxisModel : DG.CellAxisModel;
        }
        else return sc_super();
      },

      lastValueControls: function () {

        var tControls = sc_super(),
            this_ = this,
            kControlValues = {
              row: 'DG.Inspector.graphRow'.loc(),
              column: 'DG.Inspector.graphColumn'.loc(),
              cell: 'DG.Inspector.graphCell'.loc()
            },
            tNumOnX = this.getPath('xAxis.numberOfCells'),
            tNumOnY = this.getPath('yAxis.numberOfCells');

        function changePercentKind(iKind) {

          function doChangePercentKind(iPlot) {
            iPlot.setPath('plottedCount.percentKind', iKind);
          }

          doChangePercentKind(this_);
          this_.get('siblingPlots').forEach(doChangePercentKind);
        }

        function mapValueToPercentKind(iValue) {
          var tKind = -1;
          switch (iValue) {
            case kControlValues.row:
              tKind = DG.Analysis.EPercentKind.eRow;
              break;
            case kControlValues.column:
              tKind = DG.Analysis.EPercentKind.eColumn;
              break;
            case kControlValues.cell:
              tKind = DG.Analysis.EPercentKind.eCell;
          }
          return tKind;
        }

        function mapPercentKindToValue(iPercentKind) {
          var tValue = '';
          switch (iPercentKind) {
            case DG.Analysis.EPercentKind.eRow:
              tValue = kControlValues.row;
              break;
            case DG.Analysis.EPercentKind.eColumn:
              tValue = kControlValues.column;
              break;
            case DG.Analysis.EPercentKind.eCell:
              tValue = kControlValues.cell;
              break;
          }
          return tValue;
        }

        if (tNumOnX > 1 && tNumOnY > 1) {
          tControls.push(
              SC.RadioView.create({
                items: [kControlValues.row, kControlValues.column, kControlValues.cell],
                value: 'DG.Inspector.graphRow'.loc(),
                layoutDirection: SC.LAYOUT_VERTICAL,
                layout: {height: 65},
                classNames: 'dg-inspector-radio'.w(),
                valueDidChange: function () {
                  changePercentKind(mapValueToPercentKind(this.value));
                }.observes('value'),
                init: function () {
                  sc_super();
                  this_.addObserver('plottedCount', this, this.addIsShowingPercentObserver);
                  this.addIsShowingPercentObserver();
                },
                addIsShowingPercentObserver: function () {
                  var tPlottedCount = this_.get('plottedCount'),
                      tPercentKind;
                  if (tPlottedCount) {
                    tPlottedCount.addObserver('isShowingPercent', this, this.isShowingPercentChanged);
                    tPercentKind = tPlottedCount.get('percentKind');
                    this.set('value', mapPercentKindToValue(tPercentKind));
                  }
                  this.isShowingPercentChanged();
                },
                isShowingPercentChanged: function () {
                  this.set('isEnabled', this_.getPath('plottedCount.isShowingPercent'));
                },
                destroy: function () {
                  var tPlottedCount = this_.get('plottedCount');
                  if (tPlottedCount)
                    tPlottedCount.removeObserver('isShowingPercent', this, this.isShowingPercentChanged);
                  this_.removeObserver('plottedCount', this, this.addIsShowingPercentObserver);
                }
              })
          );
        }
        return tControls;
      }.property('plot'),

    });

