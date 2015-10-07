// ==========================================================================
//                        DG.SliderController
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

sc_require('controllers/component_controller');

/** @class

    Coordinating controller for slider components.

 @extends DG.ComponentController
 */
DG.SliderController = DG.ComponentController.extend(
    /** @scope DG.SliderController.prototype */ {

      sliderModel: null,

      axisModel: null,

      sliderView: null,

      axisView: null,

      /**
       Used to animate the mode's value.
       @property { DG.ValueAnimator }
       */
      valueAnimator: null,

      /**
       A record of the animation direction.
       @property { Number }
       */
      animationSign: 1,

      isAnimating: function () {
        // !! guarantees a boolean return for null, undefined, etc.
        return !!this.getPath('valueAnimator.isAnimating');
      }.property('valueAnimator.isAnimating'),

      modelDidChange: function () {
        var sliderModel = this.getPath('model.content');
        this.set('sliderModel', sliderModel);
        if (sliderModel)
          this.set('axisModel', sliderModel.get('axis'));
      }.observes('model'),

      viewDidChange: function () {
        var sliderView = this.getPath('view.contentView');
        this.set('sliderView', sliderView);
        this.set('axisView', sliderView.get('axisView'));
        sliderView.set('controller', this);
      }.observes('view', 'view.contentView'),

      /**
       * Called as action of startButton
       */
      toggleAnimation: function () {
        var tAnimator = this.get('valueAnimator'),
            tSliderModel = this.get('sliderModel'),
            tDirection = tSliderModel.get('animationDirection');
        if (tDirection === DG.SliderTypes.EAnimationDirection.eLowToHigh)
          this.set('animationSign', 1);
        else if (tDirection === DG.SliderTypes.EAnimationDirection.eHighToLow)
          this.set('animationSign', -1);
        if (SC.none(tAnimator)) {
          tAnimator = DG.ValueAnimator.create({
            valueHolder: tSliderModel,
            incrementProvider: this
          });
          this.set('valueAnimator', tAnimator);
        }

        if (tAnimator.get('isAnimating')) {
          tAnimator.endAnimation();
          DG.logUser("sliderEndAnimation: %@", this.getPath('sliderModel.name'));
        }
        else {
          tAnimator.animate();
          DG.logUser("sliderBeginAnimation: %@", this.getPath('sliderModel.name'));
        }
        DG.dirtyCurrentDocument();
      },

      stopAnimation: function () {
        var tAnimator = this.get('valueAnimator');
        if (tAnimator && tAnimator.get('isAnimating')) {
          tAnimator.endAnimation();
          DG.dirtyCurrentDocument();
        }
      },

      /**
       * Called typically by a ValueAnimator to get the amount to increment a value displayed along the axis
       * @property {Number}
       */
      increment: function () {
        var tSliderModel = this.get('sliderModel'),
            tAxisModel = this.get('axisModel'),
            tAxisView = this.get('axisView'),
            tInc = tAxisView && tAxisView.get('increment'),
            tLower = tAxisModel && tAxisModel.get('lowerBound'),
            tUpper = tAxisModel && tAxisModel.get('upperBound'),
            tValue = tSliderModel.get('value'),
            tDirection = tSliderModel.get('animationDirection'),
            tMode = tSliderModel.get('animationMode'),
            tTrial = tValue + this.get('animationSign') * tInc;
        switch (tDirection) {
          case DG.SliderTypes.EAnimationDirection.eBackAndForth:
            if (tTrial > tUpper) {
              this.set('animationSign', -1);
              tInc = tTrial - tUpper;
            }
            else if (tTrial < tLower) {
              this.set('animationSign', 1);
              tInc = tLower - tTrial;
            }
            break;
          case DG.SliderTypes.EAnimationDirection.eLowToHigh:
            if (tTrial > tUpper) {
              tSliderModel.set('value', tLower);
              if (tMode === DG.SliderTypes.EAnimationMode.eOnceOnly) {
                tInc = 0;
                this.stopAnimation();
              }
            }
            break;
          case DG.SliderTypes.EAnimationDirection.eHighToLow:
            if (tTrial < tLower) {
              tSliderModel.set('value', tUpper);
              if (tMode === DG.SliderTypes.EAnimationMode.eOnceOnly) {
                tInc = 0;
                this.stopAnimation();
              }
            }
            break;
        }
        return this.animationSign * tInc;
      }.property('axisView.increment', 'axisModel.lowerBound', 'axisModel.upperBound', 'sliderModel.value'),

      /**
       *
       * @returns {Array}
       */
      createInspectorButtons: function() {
        var tButtons = sc_super();
        tButtons.push(DG.IconButton.create({
              layout: {width: 32},
              classNames: 'slider-values'.w(),
              iconClass: 'moonicon-icon-values',
              showBlip: true,
              target: this,
              action: 'showValuesPane',
              toolTip: 'DG.Inspector.sliderValues.toolTip',
              localize: true
            })
        );
        return tButtons;
      },

      showValuesPane: function () {
        var this_ = this;
        DG.InspectorPickerPane.create({
          classNames: 'inspector-picker'.w(),
          layout: {width: 275, height: 100},
          contentView: SC.View.extend(SC.FlowedLayout,
              {
                layoutDirection: SC.LAYOUT_VERTICAL,
                isResizable: false,
                isClosable: false,
                defaultFlowSpacing: {bottom: 10},
                canWrap: false,
                align: SC.ALIGN_TOP,
                childViews: 'title directionControl modeControl'.w(),
                title: DG.PickerTitleView.extend({
                  title: 'DG.Inspector.values',
                  localize: true,
                  iconURL: static_url('images/icon-values.svg')
                }),
                directionControl: DG.PickerControlView.extend({
                  layout: {height: 24},
                  label: 'DG.Slider.direction',
                  controlView: SC.SelectView.extend({
                    classNames: 'inspector-picker-select slider-direction'.w(),
                    layout: {right: 10, width: 130},
                    localize: true,
                    value: this_.getPath('sliderModel.animationDirection'),
                    valueChanged: function () {
                      this_.setPath('sliderModel.animationDirection', this.get('value'));
                    }.observes('value'),
                    itemTitleKey: 'title',
                    itemValueKey: 'value',
                    items: [
                      {title: 'DG.Slider.lowToHigh', value: DG.SliderTypes.EAnimationDirection.eLowToHigh},
                      {title: 'DG.Slider.backAndForth', value: DG.SliderTypes.EAnimationDirection.eBackAndForth},
                      {title: 'DG.Slider.highToLow', value: DG.SliderTypes.EAnimationDirection.eHighToLow}
                    ]
                  })
                }),
                modeControl: DG.PickerControlView.extend({
                  layout: {height: 24},
                  label: 'DG.Slider.mode',
                  controlView: SC.SelectView.extend({
                    classNames: 'inspector-picker-select slider-mode'.w(),
                    layout: {right: 10, width: 130},
                    localize: true,
                    value: this_.getPath('sliderModel.animationMode'),
                    valueChanged: function () {
                      this_.setPath('sliderModel.animationMode', this.get('value'));
                    }.observes('value'),
                    itemTitleKey: 'title',
                    itemValueKey: 'value',
                    items: [
                      {title: 'DG.Slider.onceOnly', value: DG.SliderTypes.EAnimationMode.eOnceOnly},
                      {title: 'DG.Slider.nonStop', value: DG.SliderTypes.EAnimationMode.eNonStop}
                    ]
                  })
                }),
              }),
          transitionIn: SC.View.SCALE_IN
        }).popup(this.get('inspectorButtons')[0], SC.PICKER_POINTER);
      },

      createComponentStorage: function () {
        var storage = {},
            sliderModel = this.get('sliderModel'),
            axisModel = this.get('axisModel');
        if (sliderModel) {
          this.addLink(storage, 'model', sliderModel);
          if (axisModel) {
            storage.lowerBound = axisModel.get('lowerBound');
            storage.upperBound = axisModel.get('upperBound');
          }
          storage.animationDirection = sliderModel.get('animationDirection');
          storage.animationMode = sliderModel.get('animationMode');
        }
        return storage;
      },

      restoreComponentStorage: function (iComponentStorage, iDocumentID) {
        var sliderModel = this.getPath('model.content');
        if (sliderModel) {
          var modelID = this.getLinkID(iComponentStorage, 'model');
          if (modelID) {
            var globalValue = DG.store.find(DG.GlobalValue, modelID);
            if (globalValue) {
              DG.globalsController.registerGlobalValue(globalValue);
              sliderModel.set('content', globalValue);
            }
          }
          sliderModel.set('animationDirection', iComponentStorage.animationDirection);
          sliderModel.set('animationMode', iComponentStorage.animationMode);
          var axisModel = sliderModel.get('axis');
          if (axisModel && iComponentStorage.lowerBound && iComponentStorage.upperBound)
            axisModel.setLowerAndUpperBounds(iComponentStorage.lowerBound, iComponentStorage.upperBound);
        }
      }

    });

