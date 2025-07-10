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

      axisView: function() {
        return this.getPath('view.contentView.axisView');
      }.property(),

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
      }.property(),

      isAnimatingDidChange: function() {
        this.notifyPropertyChange('isAnimating');
      }.observes('*valueAnimator.isAnimating'),

      modelDidChange: function () {
        var sliderModel = this.getPath('model.content');
        this.set('sliderModel', sliderModel);
        if (sliderModel)
          this.set('axisModel', sliderModel.get('axis'));
      }.observes('model'),

      /**
       * Called as action of startButton
       */
      toggleAnimation: function () {

        var beginAnimation = function() {
          var tAxisModel = this.get('axisModel'),
              tLower = tAxisModel && tAxisModel.get('lowerBound'),
              tUpper = tAxisModel && tAxisModel.get('upperBound'),
              tAxisView = this.get('axisView'),
              tValue = tSliderModel.get('value'),
              tInc = this.getPath('sliderModel.restrictToMultiplesOf') ||
                  (tAxisView && tAxisView.get('increment'));
          if (tDirection === DG.SliderTypes.EAnimationDirection.eLowToHigh && (tValue + tInc >= tUpper)) {
            tSliderModel.set('value', tLower);
          }
          else if (tDirection === DG.SliderTypes.EAnimationDirection.eHighToLow && (tValue - tInc <= tLower)) {
            tSliderModel.set('value', tUpper);
          }
          tAnimator.set('maxPerSecond', this.getPath('sliderModel.maxPerSecond'));
          tAnimator.animate();
          DG.logUser("sliderBeginAnimation: %@", this.getPath('sliderModel.name'));
        }.bind(this);

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
          beginAnimation();
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
            tRestrictToMultiplesOf = tSliderModel.get('restrictToMultiplesOf'),
            tInc = tRestrictToMultiplesOf || (tAxisView && tAxisView.get('increment')),
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
              if (tMode === DG.SliderTypes.EAnimationMode.eOnceOnly) {
                if( !DG.isNumeric(tRestrictToMultiplesOf))
                  tSliderModel.set('value', tUpper);
                tInc = 0;
                this.stopAnimation();
              }
              else
                tSliderModel.set('value', tLower);
            }
            break;
          case DG.SliderTypes.EAnimationDirection.eHighToLow:
            if (tTrial < tLower) {
              if( !DG.isNumeric(tRestrictToMultiplesOf))
                tSliderModel.set('value', tLower);
              if (tMode === DG.SliderTypes.EAnimationMode.eOnceOnly) {
                tInc = 0;
                this.stopAnimation();
              }
              else
                tSliderModel.set('value', tUpper);
            }
            break;
        }
        return this.animationSign * tInc;
      }.property(),

      incrementDidChange: function() {
        this.notifyPropertyChange('increment');
      }.observes('*axisView.increment', '*axisModel.lowerBound', '*axisModel.upperBound', '*sliderModel.value'),

      /**
       *
       * @returns {Array}
       */
      createInspectorButtons: function() {
        var tButtons = sc_super();
        tButtons.push(DG.IconButton.create({
              layout: {width: 32},
              classNames: 'dg-slider-values'.w(),
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

        var
            noTypeCheck = function( iValue) {
              return iValue;
            },

            typeCheck = function (iValue) {
              if (!DG.isNumeric(iValue) || iValue === 0)
                iValue = null;
              else
                iValue = Number(iValue);
              return iValue;
            },

            setupAction = function (iSpecs) {
              var params = Object.assign(iSpecs, {
                name: 'slider.change',
                _newValue: null,
                _prevValue: null,
                executeNotification: {
                  action: 'notify',
                  resource: 'component',
                  values: {
                    operation: 'change slider value',
                    type: 'DG.SliderView'
                  }
                },
                execute: function () {
                  this._prevValue = this_.getPath(this.valueKey);
                  this._newValue = this.typeCheckFunc( this.controlView.get('value'));
                  if (this._newValue === this._prevValue) {
                    this.causedChange = false;
                  }
                  this_.setPath(this.valueKey, this._newValue);
                },
                undo: function () {
                  this_.setPath(this.valueKey, this._prevValue);
                },
                redo: function () {
                  this_.setPath(this.valueKey, this._newValue);
                }
              });
              DG.UndoHistory.execute(DG.Command.create(params));
            };

        DG.InspectorPickerPane.create({
          classNames: 'dg-inspector-picker'.w(),
          layout: {width: 275, height: 100},
          contentView: SC.View.extend(SC.FlowedLayout,
              {
                layoutDirection: SC.LAYOUT_VERTICAL,
                isResizable: false,
                isClosable: false,
                defaultFlowSpacing: {bottom: 10},
                canWrap: false,
                align: SC.ALIGN_TOP,
                childViews: 'title multiples maxPerSecond directionControl modeControl'.w(),
                title: DG.PickerTitleView.extend({
                  title: 'DG.Inspector.values',
                  localize: true,
                  iconURL: static_url('images/icon-values.svg')
                }),
                multiples: SC.View.extend(SC.FlowedLayout, {
                  layoutDirection: SC.LAYOUT_HORIZONTAL,
                  isResizable: false,
                  isClosable: false,
                  defaultFlowSpacing: {right: 10},
                  canWrap: false,
                  align: SC.ALIGN_LEFT,
                  layout: {height: 24},
                  childViews: 'label input'.w(),
                  label: SC.LabelView.create({
                    layout: {width: 132},
                    value: 'DG.Slider.multiples'.loc(),
                    classNames: 'dg-inspector-picker-tag'.w(),
                  }),
                  input: SC.TextFieldView.create({
                    layout: {width: 80},
                    type: 'number',
                    classNames: 'dg-inspector-input'.w(),
                    applyImmediately: false,
                    value: this.getPath('sliderModel.restrictToMultiplesOf'),
                    valueChanged: function () {
                      setupAction({
                        controlView: this,
                        undoString: 'DG.Undo.slider.changeMultiples',
                        redoString: 'DG.Redo.slider.changeMultiples',
                        log: "sliderMaxPerSecond: { \"name\": \"%@\", \" restrictMultiplesOf to\": \"%@\" }".
                        loc(this_.getPath('sliderModel.name'), this.get('value')),
                            valueKey: 'sliderModel.restrictToMultiplesOf',
                        typeCheckFunc: typeCheck
                      });
                    }.observes('value')
                  })
                }),
                maxPerSecond: SC.View.extend(SC.FlowedLayout, {
                  layoutDirection: SC.LAYOUT_HORIZONTAL,
                  isResizable: false,
                  isClosable: false,
                  defaultFlowSpacing: {right: 10},
                  canWrap: false,
                  align: SC.ALIGN_LEFT,
                  layout: {height: 24},
                  childViews: 'label input'.w(),
                  label: SC.LabelView.create({
                    layout: {width: 190},
                    value: 'DG.Slider.maxPerSecond'.loc(),
                    classNames: 'dg-inspector-picker-tag'.w(),
                  }),
                  input: SC.TextFieldView.create({
                    layout: {width: 60},
                    type: 'number',
                    classNames: 'dg-inspector-input'.w(),
                    applyImmediately: false,
                    value: this.getPath('sliderModel.maxPerSecond'),
                    valueChanged: function () {
                      setupAction({
                        controlView: this,
                        undoString: 'DG.Undo.slider.changeSpeed',
                        redoString: 'DG.Redo.slider.changeSpeed',
                        log: "sliderMaxPerSecond: { \"name\": \"%@\", \"maxPerSecond to\": \"%@\" }".
                              loc(this_.getPath('sliderModel.name'), this.get('value')),
                        valueKey: 'sliderModel.maxPerSecond',
                        typeCheckFunc: typeCheck
                      });
                    }.observes('value')
                  })
                }),
                directionControl: DG.PickerControlView.extend({
                  layout: {height: 24},
                  label: 'DG.Slider.direction',
                  controlView: SC.SelectView.extend({
                    classNames: 'dg-inspector-picker-select dg-slider-direction'.w(),
                    layout: {right: 10, width: 130},
                    localize: true,
                    value: this_.getPath('sliderModel.animationDirection'),
                    valueChanged: function () {
                      setupAction({
                        controlView: this,
                        undoString: 'DG.Undo.slider.changeDirection',
                        redoString: 'DG.Redo.slider.changeDirection',
                        log: "sliderAnimationDirection: { \"name\": \"%@\", \"to\": \"%@\" }".loc(this_.getPath('sliderModel.name'),
                            DG.SliderTypes.directionToString(this.get('value'))),
                        valueKey: 'sliderModel.animationDirection',
                        typeCheckFunc: noTypeCheck
                      });
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
                    classNames: 'dg-inspector-picker-select dg-slider-mode'.w(),
                    layout: {right: 10, width: 130},
                    localize: true,
                    value: this_.getPath('sliderModel.animationMode'),
                    valueChanged: function () {
                      setupAction({
                        controlView: this,
                        undoString: 'DG.Undo.slider.changeRepetition',
                        redoString: 'DG.Redo.slider.changeRepetition',
                        log: "sliderRepetitionMode: { \"name\": \"%@\", \"to\": \"%@\" }".loc(this_.getPath('sliderModel.name'),
                            DG.SliderTypes.modeToString(this.get('value'))),
                        valueKey: 'sliderModel.animationMode',
                        typeCheckFunc: noTypeCheck
                      });
                    }.observes('value'),
                    itemTitleKey: 'title',
                    itemValueKey: 'value',
                    items: [
                      {title: 'DG.Slider.onceOnly', value: DG.SliderTypes.EAnimationMode.eOnceOnly},
                      {title: 'DG.Slider.nonStop', value: DG.SliderTypes.EAnimationMode.eNonStop}
                    ]
                  })
                })
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
          storage.restrictToMultiplesOf = sliderModel.get('restrictToMultiplesOf');
          storage.maxPerSecond = sliderModel.get('maxPerSecond');
          storage.userTitle = sliderModel.get('userChangedTitle');
        }
        return storage;
      },

      restoreComponentStorage: function (iComponentStorage, iDocumentID) {
        sc_super();
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
          sliderModel.set('restrictToMultiplesOf', iComponentStorage.restrictToMultiplesOf);
          sliderModel.set('maxPerSecond', iComponentStorage.maxPerSecond);
          sliderModel.set('userChangedTitle', iComponentStorage.userChangedTitle);
          var axisModel = sliderModel.get('axis');
          if (axisModel && !SC.none( iComponentStorage.lowerBound) && !SC.none( iComponentStorage.upperBound))
            axisModel.setLowerAndUpperBounds(iComponentStorage.lowerBound, iComponentStorage.upperBound);
        }
      }

    });

