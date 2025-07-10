// ==========================================================================
//                      DG.MultipleLSRLsAdornmentl
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

sc_require('components/graph/adornments/plot_adornment');

/** @class  Holds onto an array of LSRLAdornment.

 @extends DG.PlotAdornment
 */
DG.MultipleLSRLsAdornment = DG.PlotAdornment.extend(
    /** @scope DG.MultipleLSRLsAdornmentl.prototype */
    {
      /**
       My array of adornments
       @property { [{DG.LSRLAdornment}] }
       */
      lsrlAdornments: null,

      init: function () {
        sc_super();
        this.set('lsrlAdornments', []);
        this.updateToModel();
      },

      destroy: function () {
        this.lsrlAdornments.forEach(function (iAdorn) {
          iAdorn.destroy();
        });
        sc_super();
      },

      /**
       Concatenated array of ['PropertyName','ObserverMethod'] pairs used for indicating
       which observers to add/remove from the model.

       @property   {Array of [{String},{String}]}  Elements are ['PropertyName','ObserverMethod']
       */
      modelPropertiesToObserve: [['lsrls', 'updateToModel'],
        ['isInterceptLocked', 'updateToModel'], ['showSumSquares', 'updateToModel']],

      /**
       Pass this down to my lsrlAdornments.
       And then deal with showing counts and percents
       */
      updateToModel: function () {
        this.get('model').recomputeSlopeAndInterceptIfNeeded();
        var tAdornments = this.get('lsrlAdornments');

        var adjustNumberOfAdornments = function () {
              var tLSRLs = this.getPath('model.lsrls');
              tAdornments.forEach( function( iAdornment, iIndex) {
                if( iIndex < tLSRLs.length) {
                  iAdornment.set('model', tLSRLs[iIndex]);
                }
                else {
                  iAdornment.set('model', null);  // Will later be removed from list of adornments
                }
              });
              while (tLSRLs.length > tAdornments.length) {
                var tNewAdorn = DG.LSRLAdornment.create({
                  parentView: this.get('parentView'),
                  model: tLSRLs[ tAdornments.length], paperSource: this.get('paperSource'),
                  layerName: DG.LayerNames.kAdornments });
                tNewAdorn.createElements();
                tAdornments.push(tNewAdorn);
              }
              while (tLSRLs.length < tAdornments.length) {
                var tIndex = tAdornments.findIndex(function (iAdorn) {
                  return SC.none(iAdorn.get('model'));
                });
                if (tIndex >= 0) {
                  var tAdorn = tAdornments[tIndex];
                  tAdornments.splice(tIndex, 1);
                  tAdorn.destroy();
                }
              }
            }.bind(this);

        // begin updateToModel
        adjustNumberOfAdornments();
        tAdornments.forEach(function (iAdornment) {
          iAdornment.updateToModel();
        });
      }

    });

