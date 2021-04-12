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

      /** The object has category names as property names and an object of this form for values:
       * { category: { shadingRegions: {Element[]}, shadingCounts: {Element[]}}}
       * @property {Object}
       */
      shadingElementsObject: null,

      /**
       * @property {DG.CellLinearAxisView}
       */
      valueAxisView: null,

      /**
       @property { DG.CellAxisView }
       */
      splitAxisView: function() {
        return this.getPath('parentView.secondaryAxisView');
      }.property(),

      isShowingCountsOrPercents: function () {
        return this.getPath('model.isShowingCount') || this.getPath('model.isShowingPercent');
      }.property(),

      init: function () {
        sc_super();
        this.set('valueAdornments', []);
        this.set('shadingElements', {});
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
      modelPropertiesToObserve: [['valueChange', 'updateToModel'],
        ['isShowingCount', 'updateToModel'], ['isShowingPercent', 'updateToModel'],
        ['valueModels', 'numberOfValuesChanged'], ['countPercentsObject', 'numberOfValuesChanged']],

      valueAxisViewDidChange: function() {
        var tNewView = this.get('valueAxisView');
        if( tNewView && this.valueAdornments) {
          this.valueAdornments.forEach(function( iAdorn) {
            iAdorn.set('valueAxisView', tNewView);
          });
        }
      }.observes('valueAxisView'),

      createElements: function () {
        var tMyElements = this.get('myElements'),
            tShadingElementsObject = {},
            tShadingLayer = this.get('shadingLayer'),
            tCountLayer = this.get('layer'),
            tNumValues = this.getPath('model.valueModels').length,
            tNumRegions = (tNumValues === 1) ? 0 : Math.ceil(tNumValues / 2),
            tNumCounts = tNumValues === 0 ? 0 : tNumValues + 1,
            tAnchor = this.getPath('valueAxisView.orientation') === DG.GraphTypes.EOrientation.kHorizontal ?
                'middle' : 'end';
        DG.ObjectMap.forEach(this.getPath('model.countPercentsObject'), function (iCat, iObj) {
          tShadingElementsObject[iCat] = { shadingRegions: [], shadingCounts: []};
          var tShadingRegions = tShadingElementsObject[iCat].shadingRegions;
          while (tShadingRegions.length < tNumRegions) {
            var tNewRegion = this.get('paper').rect(0, 0, 0, 0)
                .attr({'opacity': 0})
                .addClass('dg-movable-shaded');
            tShadingLayer.push(tNewRegion);
            tMyElements.push(tNewRegion);
            tShadingRegions.push(tNewRegion);
            tNewRegion.animate({'opacity': DG.PlotUtilities.kMovableRegionOpacity},
                DG.PlotUtilities.kDefaultAnimationTime, '<>');
          }
          var tCountElements = tShadingElementsObject[iCat].shadingCounts;
          while (tCountElements.length < tNumCounts) {
            var tNewText = this.get('paper').text(0, 0, '')
                .attr({'opacity': 0, 'text-anchor': tAnchor})
                .addClass('dg-graph-adornment');
            tCountLayer.push(tNewText);
            tMyElements.push(tNewText);
            tCountElements.push(tNewText);
            tNewText.animate({'opacity': 1}, DG.PlotUtilities.kDefaultAnimationTime, '<>');
          }
        }.bind(this));
        this.set('shadingElementsObject', tShadingElementsObject);
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

        var getCellNames = function() {
              var tNames = this.getPath('model.plotModel.secondaryAxisModel.attributeDescription.cellNames');
              if (!tNames || tNames.length === 0)
                tNames = [DG.MovableValueModel.kSingleCellName];
              return tNames;
            }.bind(this),

            adjustNumberOfAdornments = function () {
              var tValues = this.getPath('model.valueModels');
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
              if (tAdornments.length > 1) {
                tCellNames.forEach(function (iCat) {
                  var tScreenCoords = tAdornments.map(function (iAdorn) {
                    return iAdorn.screenCoord(iCat);
                  });
                  // Sort them so that shaded regions work properly
                  tScreenCoords.sort(function(a,b) { return a-b; });
                  // Update the shaded regions
                  var tX, tY, tWidth, tHeight;
                  tScreenCoords.forEach(function (iCoord, iIndex) {
                    if (iIndex % 2 === 0) {
                      var tLabelSpace = DG.MovableValueAdornment.kLabelSpace,
                          tRegion = this.shadingElementsObject[iCat].shadingRegions[iIndex / 2],
                          tCellCoord = tSplitAxisView && tSplitAxisView.cellNameToCoordinate(iCat);
                      if(!DG.isFinite(tCellCoord))
                        tCellCoord = tCellExtent / 2;
                      if (this.getPath('valueAxisView.orientation') === DG.GraphTypes.EOrientation.kHorizontal) {
                        var tRight = iIndex === tScreenCoords.length - 1 ? tPaper.width :
                            tScreenCoords[iIndex + 1];
                        tX = iCoord;
                        tY = tCellCoord - tCellExtent / 2 + tLabelSpace / 2;
                        tWidth = Math.abs(tRight - iCoord);
                        tHeight = Math.abs(tCellExtent - tLabelSpace / 2);
                      } else {
                        var tNextY = (iIndex === tScreenCoords.length - 1) ? 0 :
                            tScreenCoords[iIndex + 1];
                        tX = tCellCoord - tCellExtent / 2;
                        tY = iCoord;
                        tWidth = Math.abs(tCellExtent - tLabelSpace);
                        tHeight = Math.abs(tNextY - iCoord);
                      }
                      tRegion.attr({x: tX, y: tY, width: tWidth, height: tHeight});
                    }
                  }.bind(this));
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
                  tLabelSpace = tAdornments.length > 0 ? DG.MovableValueAdornment.kLabelSpace : 0,
                  tShowCount = this.getPath('model.isShowingCount'),
                  tShowPercent = this.getPath('model.isShowingPercent'),
                  tCountPercentsObject = this.getPath('model.countPercentsObject');
              DG.ObjectMap.forEach(tCountPercentsObject, function (iKey, iCountPercentsArray) {
                var tCountElements = this.shadingElementsObject[iKey].shadingCounts,
                    tCellCoord = tSplitAxisView.cellNameToCoordinate(iKey);
                if( !DG.isFinite(tCellCoord))
                  tCellCoord = tCellExtent / 2;
                iCountPercentsArray.forEach(function (iCountPercentObj, iIndex) {
                  var tLowerCoord = tAxisView.dataToCoordinate(iCountPercentObj.lower),
                      tUpperCoord = tAxisView.dataToCoordinate(iCountPercentObj.upper),
                      tY = tOrientation === DG.GraphTypes.EOrientation.kHorizontal ?
                          tCellCoord - tCellExtent / 2 + tLabelSpace / 2 + 12 :
                          (tLowerCoord + tUpperCoord) / 2,
                      tX = tOrientation === DG.GraphTypes.EOrientation.kHorizontal ?
                          (tLowerCoord + tUpperCoord) / 2 :
                          tCellCoord + tCellExtent / 2 - 5;
                  tCountElements[iIndex].attr({x: tX, y: tY, text: formatValueString(iCountPercentObj)});
                }.bind(this));
              }.bind(this));

            }.bind(this),

        hideShowPercentsAndCounts = function(iShow) {
          DG.ObjectMap.forEach(tCountPercentsObject, function (iKey, iCountPercentsArray) {
            var tCountElements = this.shadingElementsObject[iKey].shadingCounts;
            tCountElements.forEach( function( iElement) {
              if(iShow)
                iElement.show();
              else
                iElement.hide();
            });
          }.bind(this));
        }.bind(this);

        // begin updateToModel
        var tCellNames = getCellNames(),
            tSplitAxisView = this.get('splitAxisView'),
            tCellExtent = tSplitAxisView && tSplitAxisView.get('fullCellWidth'),
            tCountPercentsObject = this.getPath('model.countPercentsObject'),
            tShadingElementsObject = this.get('shadingElementsObject');
        this.get('model').recomputeValueIfNeeded();
        adjustNumberOfAdornments();
        tAdornments.forEach(function (iValueAdornment) {
          iValueAdornment.updateToModel();
        });
        if( this.get('myElements').length === 0 ||
            tCellNames.some(function(iName) {
              return !tShadingElementsObject[iName];  // signifying it's out of date
            }) ||
            Object.keys(tShadingElementsObject).some(function( iKey) {
              return tCellNames.indexOf(iKey) < 0;  // again, it's out of date
            })
        ) {
          this.removeElements();
          this.myElements = [];
          this.createElements();
        }

        adjustShadedRegions();
        if (this.get('isShowingCountsOrPercents')) {
          adjustPercentsAndCounts();
          hideShowPercentsAndCounts(true);
        }
        else
          hideShowPercentsAndCounts(false);
      },

      numberOfValuesChanged: function() {
        this.removeElements();  // Force recomputation from scratch
        this.myElements = [];
        this.updateToModel();
      }

    });

