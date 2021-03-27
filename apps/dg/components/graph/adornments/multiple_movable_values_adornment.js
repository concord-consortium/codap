// ==========================================================================
//                      DG.MultipleMovableValuesAdornment
//
//  Author:   William Finzer
//
//  Copyright (c) 2016 by The Concord Consortium, Inc. All rights reserved.
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

sc_require('components/graph/adornments/plot_adornment');

/** @class  Holds onto an array of MovableValueAdornment and takes charge of displaying alternating
 * shaded areas between them.

 @extends DG.PlotAdornment
 */
DG.MultipleMovableValuesAdornment = DG.PlotAdornment.extend(
    /** @scope DG.MultipleMovableValuesAdornment.prototype */
    {
      /**
       My array of adornments
       @property { [{DG.MovableValueAdornment}] }
       */
      valueAdornments: null,

      /**
       * @property {DG.Layer}
       */
      _shadingLayer: null,
      shadingLayer: function () {
        if (!this._shadingLayer && this.getPath('paperSource.layerManager')) {
          this._shadingLayer = this.getPath('paperSource.layerManager.' + DG.LayerNames.kIntervalShading);
        }
        return this._shadingLayer;
      }.property(),

      /**
       * @property {[Element]}
       */
      shadingElements: null,

      /**
       * @property {[Element]}
       */
      countElements: null,

      isShowingCountElements: function () {
        return this.getPath('model.isShowingCount') || this.getPath('model.isShowingPercent');
      }.property(),

      init: function () {
        sc_super();
        this.set('valueAdornments', []);
        this.set('shadingElements', []);
        this.set('countElements', []);
      },

      destroy: function () {
        this.valueAdornments.forEach(function (iAdorn) {
          iAdorn.destroy();
        });
        sc_super();
      },

      /**
       Concatenated array of ['PropertyName','ObserverMethod'] pairs used for indicating
       which observers to add/remove from the model.

       @property   {Array of [{String},{String}]}  Elements are ['PropertyName','ObserverMethod']
       */
      modelPropertiesToObserve: [['values', 'updateToModel'],
        ['isShowingCount', 'updateToModel'], ['isShowingPercent', 'updateToModel']],

      valueAxisViewDidChange: function() {
        var tNewView = this.get('valueAxisView');
        if( tNewView && this.valueAdornments) {
          this.valueAdornments.forEach(function( iAdorn) {
            iAdorn.set('valueAxisView', tNewView);
          });
        }
      }.observes('valueAxisView'),

      createElements: function () {
        var removeElement = function () {
              tCountLayer.prepareToMoveOrRemove(this);
              this.remove();
            },
            tMyElements = this.get('myElements'),
            tShadingElements = this.get('shadingElements'),
            tCountElements = this.get('countElements'),
            tShadingLayer = this.get('shadingLayer'),
            tCountLayer = this.get('layer'),
            tNumValues = this.getPath('model.values').length,
            tNumRegions = (tNumValues === 1) ? 0 : Math.ceil(tNumValues / 2),
            tNumCounts = this.get('isShowingCountElements') ? (tNumValues === 0 ? 0 : tNumValues + 1) : 0,
            tAnchor = this.getPath('valueAxisView.orientation') === DG.GraphTypes.EOrientation.kHorizontal ?
                'middle' : 'end',
            tElement;
        while (tShadingElements.length < tNumRegions) {
          var tNewRegion = this.get('paper').rect(0, 0, 0, 0)
              .attr({'opacity': 0})
              .addClass('dg-movable-shaded');
          tShadingLayer.push(tNewRegion);
          tMyElements.push(tNewRegion);
          tShadingElements.push(tNewRegion);
          tNewRegion.animate({'opacity': DG.PlotUtilities.kMovableRegionOpacity},
              DG.PlotUtilities.kDefaultAnimationTime, '<>');
        }
        while (tShadingElements.length > tNumRegions) {
          tElement = tShadingElements.pop();
          tShadingLayer.prepareToMoveOrRemove( tElement);
          DG.ArrayUtils.remove(tMyElements, tElement);
          tElement.animate({'opacity': 0}, DG.PlotUtilities.kDefaultAnimationTime, '<>',
              removeElement);
        }

        while (tCountElements.length < tNumCounts) {
          var tNewText = this.get('paper').text(0, 0, '')
              .attr({'opacity': 0, 'text-anchor': tAnchor})
              .addClass('dg-graph-adornment');
          tCountLayer.push(tNewText);
          tMyElements.push(tNewText);
          tCountElements.push(tNewText);
          tNewText.animate({'opacity': 1}, DG.PlotUtilities.kDefaultAnimationTime, '<>');
        }
        while (tCountElements.length > tNumCounts) {
          tElement = tCountElements.pop();
          tCountLayer.prepareToMoveOrRemove( tElement);
          DG.ArrayUtils.remove(tMyElements, tElement);
          tElement.animate({'opacity': 0}, DG.PlotUtilities.kDefaultAnimationTime, '<>',
              removeElement);
        }
      },

      /**
       Pass this down to my valueAdornments.
       And then deal with showing counts and percents
       */
      updateToModel: function () {
        var tAdornments = this.get('valueAdornments'),
            tPaper = this.get('paper');
        if( !tPaper)
          return; //Not ready yet

        var adjustNumberOfAdornments = function () {
              var tValues = this.getPath('model.values');
              while (tValues.length > tAdornments.length) {
                var tNewAdorn = DG.MovableValueAdornment.create({
                  parentView: this.get('parentView'),
                  model: tValues[tAdornments.length],
                  paperSource: this.get('paperSource'),
                  layerName: this.get('layerName'),
                  valueAxisView: this.get('valueAxisView')
                });
                tNewAdorn.createElements();
                tAdornments.push(tNewAdorn);
              }
              while (tValues.length < tAdornments.length) {
                var tIndex = tAdornments.findIndex(function (iAdorn) {
                  return SC.none(iAdorn.get('model'));
                });
                if (tIndex >= 0) {
                  var tAdorn = tAdornments[tIndex];
                  tAdornments.splice(tIndex, 1);
                  tAdorn.destroy();
                }
              }
            }.bind(this),

            adjustShadedRegions = function () {
              // Sort them so that shaded regions work properly
              tAdornments.sort(function (iA1, iA2) {
                return iA1.get('value') - iA2.get('value');
              });

              this.createElements();

              if (tAdornments.length > 1) {
                // Update the shaded regions
                var tX, tY, tWidth, tHeight;
                tAdornments.forEach(function (iAdornment, iIndex) {
                  if (iIndex % 2 === 0) {
                    var tLabelSpace = iAdornment.get('kLabelSpace'),
                        tRegion = this.shadingElements[iIndex / 2],
                        tScreenCoord = iAdornment.get('screenCoord');
                    if (iAdornment.get('orientation') === DG.GraphTypes.EOrientation.kHorizontal) {
                      var tRight = iIndex === tAdornments.length - 1 ? tPaper.width :
                          tAdornments[iIndex + 1].get('screenCoord');
                      tX = tScreenCoord;
                      tY = tLabelSpace / 2;
                      tWidth = tRight - tScreenCoord;
                      tHeight = tPaper.height - tLabelSpace / 2;
                    }
                    else {
                      var tNextY = (iIndex === tAdornments.length - 1) ? 0 :
                          tAdornments[iIndex + 1].get('screenCoord');
                      tX = 0;
                      tY = tNextY;
                      tWidth = tPaper.width - tLabelSpace;
                      tHeight = tScreenCoord - tNextY;
                    }
                    tRegion.attr({x: tX, y: tY, width: tWidth, height: tHeight});
                  }
                }.bind(this));
              }
            }.bind(this),

            adjustPercentsAndCounts = function () {

              function formatValueString(iCPObj) {
                var tCPString = '',
                    tPString = (tShowPercent && !SC.empty(iCPObj.percent)) ?
                        (tShowCount ? '(%@%)' : '%@%').fmt(Math.round(iCPObj.percent)) :
                        '';
                if (tShowCount && !tShowPercent) {
                  tCPString = iCPObj.count.toString();
                }
                else if (tShowPercent && !tShowCount) {
                  tCPString = tPString;
                }
                else if (tShowCount && tShowPercent) {
                  tCPString = '%@ %@'.fmt(iCPObj.count, tPString);
                }
                return tCPString;
              }

              var tAxisView = this.get('valueAxisView'),
                  tOrientation = tAxisView.get('orientation'),
                  tLabelSpace = tAdornments.length > 0 ? tAdornments[0].get('kLabelSpace') : 0,
                  tShowCount = this.getPath('model.isShowingCount'),
                  tShowPercent = this.getPath('model.isShowingPercent'),
                  tCountElements = this.get('countElements'),
                  tCountPercents = this.getPath('model.countPercents');
              tCountPercents.forEach(function (iObj, iIndex) {
                var tLowerCoord = tAxisView.dataToCoordinate(iObj.lower),
                    tUpperCoord = tAxisView.dataToCoordinate(iObj.upper),
                    tY = tOrientation === DG.GraphTypes.EOrientation.kHorizontal ? tLabelSpace / 2 + 12 :
                        (tLowerCoord + tUpperCoord) / 2,
                    tX = tOrientation === DG.GraphTypes.EOrientation.kHorizontal ? (tLowerCoord + tUpperCoord) / 2 : tPaper.width - 5;
                tCountElements[iIndex].attr({x: tX, y: tY, text: formatValueString(iObj)});
              }.bind(this));

            }.bind(this);

        // begin updateToModel
        this.get('model').recomputeValueIfNeeded();
        adjustNumberOfAdornments();
        tAdornments.forEach(function (iValueAdornment) {
          iValueAdornment.updateToModel();
        });

        adjustShadedRegions();
        if (this.get('isShowingCountElements'))
          adjustPercentsAndCounts();
      }

    });

