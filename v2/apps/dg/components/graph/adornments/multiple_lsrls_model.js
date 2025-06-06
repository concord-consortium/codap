// ==========================================================================
//                      DG.MultipleLSRLsModel
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

sc_require('components/graph/adornments/plot_adornment_model');

/** @class  The model for a set of LSRLAdornment.

 @extends SC.Object
 */
DG.MultipleLSRLsModel = DG.PlotAdornmentModel.extend(
    /** @scope DG.MultipleLSRLsModel.prototype */
    {
      /**
       The current value
       @property { [{DG.LSRLModel} ] }
       */
      lsrls: null,

      /**
       * @property { Boolean }
       */
      showSumSquares: false,

      /**
       * @property { Boolean }
       */
      isInterceptLocked: false,

      numLegendCells: function () {
        var tLegendDesc = this.getPath('plotModel.dataConfiguration.legendAttributeDescription'),
            tNumCells = (SC.none(tLegendDesc) || tLegendDesc.get('isNumeric')) ? 1 :
                tLegendDesc.getPath('attributeStats.numberOfCells');
        return SC.none(tNumCells) ? 1 : Math.max(1, tNumCells);
      }.property(),

      /**
       Private cache.
       @property { Boolean }
       */
      _needsComputing: true,

      init: function () {
        sc_super();
        this.lsrls = [];
        this.synchLSRLs();
      },

      destroy: function () {
        this.get('lsrls').forEach(function (iLSRL) {
          iLSRL.destroy();
        });
        this.lsrls = [];
        sc_super();
      },

      /**
       * Keep my list of LSRLModels in synch
       */
      isVisibleChanged: function () {
        var tIsVisible = this.get('isVisible');
        this.synchLSRLs();
        this.get('lsrls').forEach(function (iLSRLModel) {
          iLSRLModel.set('isVisible', tIsVisible);
        });
      }.observes('isVisible'),

      toggleInterceptLocked: function () {
        this.toggleProperty('isInterceptLocked');
      },

      /**
       * Keep my list of LSRLModels in synch
       */
      isInterceptLockedChanged: function () {
        var tIsLocked = this.get('isInterceptLocked');
        this.get('lsrls').forEach(function (iLSRLModel) {
          iLSRLModel.set('isInterceptLocked', tIsLocked);
        });
      }.observes('isInterceptLocked'),

      /**
       * Keep my list of LSRLModels in synch
       */
      showSumSquaresChanged: function () {
        var tShowing = this.get('showSumSquares');
        this.get('lsrls').forEach(function (iLSRLModel) {
          iLSRLModel.set('showSumSquares', tShowing);
        });
      }.observes('showSumSquares'),

      /**
       *  We do not set that our values need computing because these are only re-evaluated when
       *  the axis attribute changes.
       */
      setComputingNeeded: function () {
        this._needsComputing = true;
        this.get('lsrls').forEach(function (iLSRLModel) {
          iLSRLModel.setComputingNeeded();
        });
      }.observes('plotModel'),

      enableMeasuresForSelectionDidChange: function () {
        var tEnabled = this.get('enableMeasuresForSelection');
        this.get('lsrls').forEach(function (iLSRLModel) {
          iLSRLModel.set('enableMeasuresForSelection', tEnabled);
        });
      }.observes('enableMeasuresForSelection'),

      /**
       True if any of my values needs computing
       @return { Boolean }
       */
      isComputingNeeded: function (iAxis) {
        if (this._needsComputing)
          return true;
      },

      /**
       Pass this down to my lsrls.
       */
      recomputeSlopeAndInterceptIfNeeded: function (iXAxis, iYAxis) {
        if (this.isComputingNeeded()) {
          this._needsComputing = false;
          this.synchLSRLs();
          this.get('lsrls').forEach(function (iLSRL) {
            iLSRL.recomputeSlopeAndInterceptIfNeeded(iXAxis, iYAxis);
          });
        }
      },

      synchLSRLs: function () {
        var this_ = this,
            tLegendAttrDescription = this.getPath('plotModel.dataConfiguration.legendAttributeDescription'),
            tCellNames = tLegendAttrDescription.getPath('attributeStats.categoricalStats.cellNames') || [],
            tLSRLs = this.get('lsrls');
        if (tCellNames.length > 0) {
          // Remove LSRLs for which there is no longer a cell name
          tLSRLs.filter(function (iLSRL) {
            return tCellNames.indexOf(iLSRL.get('categoryName')) < 0;
          }).forEach(function (eLSRL) {
            this_.removeLSRL(eLSRL);
          });
          // Add an LSRL for which a cell name exists but no corresponding LSRL
          tCellNames.filter(function (iName) {
            return tLSRLs.findIndex(function (iLSRL) {
              return iLSRL.get('categoryName') === iName;
            }) < 0;
          }).forEach(function (iName) {
            this_.addLSRLModel(iName);
          });
        } else {
          while (tLSRLs.length > 1) {
            tLSRLs.pop().destroy();
          }
          if (tLSRLs.length === 0)
            this.addLSRLModel('_main_');
        }
      },

      /**
       *
       * @param iCategoryName {string}
       * @return {DG.LSRLModel}
       */
      addLSRLModel: function (iCategoryName) {

        var tLSRLModel = DG.LSRLModel.create({
          plotModel: this.get('plotModel'),
          categoryName: iCategoryName,
          showSumSquares: this.get('showSumSquares'),
          enableMeasuresForSelection: this.get('enableMeasuresForSelection'),
          isInterceptLocked: this.get('isInterceptLocked'),
          isVisible: this.get('isVisible')
        });
        tLSRLModel.set('isInterceptLocked', this.get('isInterceptLocked'));
        this.get('lsrls').push(tLSRLModel);
        this.setComputingNeeded();
        return tLSRLModel;
      },

      removeLSRL: function (iLSRL) {
        var tLsrls = this.get('lsrls'),
            tIndex = tLsrls.indexOf(iLSRL);
        tLsrls.splice(tIndex, 1);
        iLSRL.destroy();
      },

      createStorage: function () {
        var storage = sc_super();
        storage.showSumSquares = this.showSumSquares;
        storage.isInterceptLocked = this.isInterceptLocked;
        storage.lsrls = [];
        this.get('lsrls').forEach(function (iLSRL) {
          storage.lsrls.push(iLSRL.createStorage());
        });
        return storage;
      },

      restoreStorage: function (iStorage) {
        sc_super();
        this.showSumSquares = iStorage.showSumSquares;
        this.isInterceptLocked = iStorage.isInterceptLocked;
        this.get('lsrls').forEach(function (iLSRL) {
          iLSRL.set('showSumSquares', this.showSumSquares);
          iLSRL.set('isInterceptLocked', this.isInterceptLocked);
        }.bind(this));
        if (SC.isArray(iStorage.lsrls)) {
          this.get('lsrls').forEach(function (iLSRL, iIndex) {
            iLSRL.restoreStorage(iStorage.lsrls[iIndex]);
          });
        }
      }

    });
DG.PlotAdornmentModel.registry.multipleLSRLModels = DG.MultipleLSRLsModel;
