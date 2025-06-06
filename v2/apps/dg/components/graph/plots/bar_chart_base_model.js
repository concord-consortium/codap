// ==========================================================================
//                          DG.BarChartBaseModel
//
//  Author:   William Finzer, Kirk Swenson
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

sc_require('components/graph/plots/chart_model');
sc_require('components/graph/plots/numeric_plot_model_mixin');

/** @class  DG.BarChartBaseModel - The model for a plot with categorical axes

 @extends DG.ChartModel
 */
DG.BarChartBaseModel = DG.ChartModel.extend(DG.NumericPlotModelMixin,
    /** @scope DG.BarChartBaseModel.prototype */
    {
      /**
       * Override
       * @property {Boolean}
       */
      displayAsBarChart: true,

      /**
       * For non-computed bar charts, whether to show count or percent
       * @property {DG.Analysis.EBreakdownType}
       */
      breakdownType: DG.Analysis.EBreakdownType.eCount,

      /**
       * Whether the bar height is computed from a formula.
       * @property {Boolean}
       */
      isBarHeightComputed: false,

      /**
       * We want an 'other' axis for count or percent.
       * @property {Boolean}
       */
      wantsOtherAxis: true,

      /**
       * When making a copy of a plot (e.g. for use in split) the returned object
       * holds those properties that should be assigned to the copy.
       * @return {{}}
       */
      getPropsForCopy: function() {
        var tResult = sc_super();
        return $.extend( tResult, {
          breakdownType: this.get('breakdownType')
        });
      },

      /**
       *
       * @param iPlace {DG.GraphTypes.EPlace}
       * @return { class }
       */
      getDesiredAxisClassFor: function( iPlace) {
        if( iPlace === this.get('primaryAxisPlace'))
          return DG.CellAxisModel;
        return sc_super();
      },

      /**
       * Change the value corresponding to the given key
       * @param iKey {String} Should be 'breakdownType'
       * @param iValue {Boolean}
       */
      changeBreakdownType: function( iKey, iValue) {
        var tInitialValue = this.get(iKey);
        DG.UndoHistory.execute(DG.Command.create({
          name: "graph.changeBreakdownType",
          undoString: 'DG.Undo.graph.changeBreakdownType',
          redoString: 'DG.Redo.graph.changeBreakdownType',
          log: ("change %@ from %@ to %@").fmt(iKey, tInitialValue, iValue),
          execute: function() {
            this.set(iKey, iValue);
          }.bind(this),
          undo: function() {
            this.set(iKey, tInitialValue);
          }.bind(this)
        }));
      },

      lastConfigurationControls: function () {
        var tControls = sc_super(),
            this_ = this,
            kRowHeight = 18,
            kChartRadioCount = 0,     // === DG.Analysis.EBreakdownType.eCount
            kChartRadioPercent = 1,   // === DG.Analysis.EBreakdownType.ePercent
            kChartRadioFormula = 2;

        function mapModelValuesToRadioValue() {
          return this_.get('isBarHeightComputed')
                  ? kChartRadioFormula
                  : this_.get('breakdownType');
        }

        tControls.push(
            SC.LabelView.create({
              layout: {height: kRowHeight},
              value: 'DG.Inspector.displayScale',
              localize: true
            })
        );

        tControls.push(
            SC.RadioView.create({
              itemTitleKey: 'title',
              itemValueKey: 'value',
              items: [
                { value: kChartRadioCount, title: 'DG.Inspector.graphCount'.loc() },
                { value: kChartRadioPercent, title: 'DG.Inspector.graphPercent'.loc() },
                { value: kChartRadioFormula, title: 'DG.Inspector.graphFormula'.loc() }
              ],
              value: mapModelValuesToRadioValue(this_),
              layoutDirection: SC.LAYOUT_VERTICAL,
              layout: {height: 3.5 * kRowHeight},
              classNames: 'dg-inspector-radio'.w(),
              valueDidChange: function () {
                var currValue = mapModelValuesToRadioValue(this_);
                switch(this.value) {
                  case kChartRadioCount:
                  case kChartRadioPercent:
                    if (currValue !== kChartRadioFormula) {
                      // we're not switching plot type
                      this_.changeBreakdownType('breakdownType', this.value);
                      break;
                    }
                    // so it will be copied to the new plot
                    this_.set('breakdownType', this.value);
                    /* falls through */
                  case kChartRadioFormula:
                    // we're switching to/from a computed bar chart
                    this_.set('isBarHeightComputed', this.value === kChartRadioFormula);
                    DG.mainPage.mainPane.hideInspectorPicker();
                    break;
                }
              }.observes('value')
            })
        );
        return tControls;
      }.property('plot'),

      /**
       Each axis should rescale based on the values to be plotted with it.
       @param iAllowScaleShrinkage{Boolean} Default is false
       @param iAnimatePoints {Boolean} Default is true
       @param iLogIt {Boolean} Default is false
       @param iUserAction {Boolean} Default is false
       */
      rescaleAxesFromData: function (iAllowScaleShrinkage, iAnimatePoints, iLogIt, iUserAction) {
        if (iAnimatePoints === undefined)
          iAnimatePoints = true;
        this.doRescaleAxesFromData([this.get('secondaryAxisPlace')], iAllowScaleShrinkage, iAnimatePoints, iUserAction);
        if (iLogIt)
          DG.logUser("rescaleBarChart");
      },

      /**
       * @return {Object} the saved data.
       */
      createStorage: function () {
        var tStorage = sc_super();

        tStorage.breakdownType = this.breakdownType;

        return tStorage;
      },

      /**
       * @param iStorage
       */
      restoreStorage: function (iStorage) {
        sc_super();
        if (!SC.none(iStorage.breakdownType)) {
          this.set( 'breakdownType', iStorage.breakdownType);
        }
      }


    });
