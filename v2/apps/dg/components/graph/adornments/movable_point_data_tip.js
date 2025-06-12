// ==========================================================================
//                            DG.MovablePointDataTip
//
//  Author:   William Finzer
//
//  Copyright (c) 2017 by The Concord Consortium, Inc. All rights reserved.
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

sc_require('components/graph/adornments/data_tip');

/** @class DG.MovablePointDataTip A simple adornment-like class that displays and updates a data tip that shows when the
 *    user hovers over a point.

 @extends DG.DataTip
 */
DG.MovablePointDataTip = DG.DataTip.extend(
    /** @scope DG.MovablePointDataTip.prototype */
    {
      movablePoint: null,

      coordinatesDidChange: function() {
        this.updateTip();
      }.observes('movablePoint.coordinates'),

      getDataTipText: function () {

        var tGraphModel = this.getPath('plotLayer.graphModel'),
            tCoordinates = this.getPath('movablePoint.coordinates'),

            getNameValuePair = function (iKey) {

              var digitsForAxis = function () {
                    return DG.PlotUtilities.findFractionDigitsForAxis(this.getPath('plotLayer.' + iKey + 'AxisView'));
                  }.bind(this),

                  tAttrDesc = tGraphModel.getPath('dataConfiguration.' + iKey + 'AttributeDescription'),
                  tAttr = tAttrDesc.get('attribute'),
                  tAttrID = tAttr ? tAttr.get('id') : null,
                  tIsDate = tAttrDesc.get('attributeType') === DG.Analysis.EAttributeType.eDateTime,
                  tName, tValue;
              if (!SC.none(tAttrID)) {
                tName = tAttr.get('name');
                tValue = tIsDate ? DG.DateUtilities.formatDate( tCoordinates[iKey]) :
                    DG.PlotUtilities.getFormattedNumericValue(tCoordinates[iKey], digitsForAxis);
                return tName + ': ' + tValue;
              }
              return null;
            }.bind( this),

            tTipText = '';

        if (!this.get('showOnlyLegendData')) {
          var tXPair = getNameValuePair('x'),
              tYPair = getNameValuePair('y');
          tTipText = SC.none(tXPair) ? '' : tXPair;
          if (!SC.none(tYPair)) {
            if (tTipText.length > 0)
              tTipText += '\n';
            tTipText += tYPair;
          }
        }
        return tTipText;
      },

      /**
       *  We set the tip origin and the case index before calling sc_super()
       */
      show: function (iX, iY, iR, iIndex) {
        this.set('tipOrigin', {x: iX, y: iY});
        this.set('tipSourceRadius', iR);

        sc_super();
      }

    });

