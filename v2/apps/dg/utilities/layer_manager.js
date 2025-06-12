// ==========================================================================
//                                DG.LayerManager
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

/**
 * @class
 *
 * Holds onto a linked list of DG.RaphaelLayer whose order determines order of display of these layers by the paper
 *
 * @extends SC.Object
 */
DG.LayerManager = function( iPaper) {
  return  {
    /**
     * The first layer. If null, there are not yet any layers.
     * @property {DG.RaphaelLayer}
     */
    _firstLayer: null,

    /**
     * The last layer. If null, there are not yet any layers.
     * @property {DG.RaphaelLayer}
     */
    _lastLayer: null,

    /**
     * The paper shared by all layers
     * @property {Raphael Paper}
     */
    _paper: iPaper,

    /**
     * A new layer will be created on top of all previous layers. If iName is not null, the new layer will be
     * accessible as a named property.
     * Return null if an attempt is being made to create a layer with an already existing name.
     * Otherwise, return the newly created layer.
     * @param iName {String}
     * @param iAfterLayer {DG.RaphaelLayer}
     * @return {DG.LayerManager} to facilitate chained calls
     */
    addNamedLayer: function( iName, iAfterLayer) {
      DG.assert( !SC.empty( iName));

      if( this[iName]) {
        return this[iName];
      }

      var tLayer = DG.RaphaelLayer.create( { _paper: this._paper, name: iName } );
      this[ iName] = tLayer;

      if( iAfterLayer) {
        tLayer._prevLayer = iAfterLayer;
      }
      else if( this._lastLayer) {
        tLayer._prevLayer = this._lastLayer;
        this._lastLayer = tLayer;
      }
      else {  // Our very first layer
        this._firstLayer = this._lastLayer = tLayer;
      }
      return this;
    },

    /**
     *
     * @param iName {String}
     * @return {DG.RaphaelLayer}
     */
    getLayer: function( iName) {
      var tResult;
      this.forEach( function( iLayer) {
        if( iLayer.get('name') === iName)
          tResult = iLayer;
      });
      return tResult;
    },

    layerForElement: function( iElement) {
      var tFoundLayer;
      this.forEach( function( iLayer) {
        if( !tFoundLayer && iLayer.contains( iElement))
          tFoundLayer = iLayer;
      });
      return tFoundLayer;
    },

    forEach: function( iCallback) {
      var tLayer, tPrevLayer;
      for( tLayer = this._lastLayer; tLayer; tLayer = tPrevLayer) {
        tPrevLayer = tLayer._prevLayer;
        iCallback( tLayer);
      }
    },

    /**
     * Move the given element to iToLayer.
     * @param iElement {Raphael Element }
     * @param iFromLayer {DG.RaphaelLayer or String}
     * @param iToLayer {DG.RaphaelLayer or String}
     */
    moveElementFromTo: function( iElement, iFromLayer, iToLayer) {
      // this.testValidity();
      if( iFromLayer === iToLayer)
        return;
      if( typeof iFromLayer === 'string')
        iFromLayer = this[iFromLayer];
      if( typeof iToLayer === 'string')
        iToLayer = this[iToLayer];

      if( iFromLayer.contains( iElement)) {
        iFromLayer.prepareToMoveOrRemove( iElement);
        iToLayer.push( iElement);
      }
      // this.testValidity();
    },

    /**
     * We have to give layers a chance to update pointers to elements before calling remove
     * @param iElement {Raphael Element }
     */
    removeElement: function( iElement, iCallRemove) {
      iCallRemove = iCallRemove && iElement[0].constructor !== SVGCircleElement;
      this.forEach( function( iLayer) {
        iLayer.prepareToMoveOrRemove( iElement);
      });
      if( iCallRemove)
        iElement.remove();
      else {
        iElement.next = null;
        iElement.prev = null;
      }
      // this.testValidity();
    },

    setVisibility: function( iName, iVisibility, iAttrs) {
      if( this[iName]) {
        if( iVisibility)
          this[iName].show( iAttrs);
        else
          this[iName].hide();
      }
    },

    /**
     * The layer manager is valid
     *  - each layer is valid
     *  - no element appears more than once
     */
    testValidity: function() {
      // @if (debug)
      this.forEach( function( iLayer) {
        if( !iLayer.isValid())
          DG.logError('Invalid layer: ' + iLayer.name);
      });
      var tFoundDuplicate = false,
          tMap = {};
      this.forEach( function( iLayer) {
        iLayer.forEach( function( iElement) {
          tFoundDuplicate = tFoundDuplicate || tMap[ iElement.id];
          tMap[ iElement.id] = true;
        });
      });
      if( tFoundDuplicate)
        DG.logError('Found duplicate element');

      if( !DG.RenderingUtilities.testPaperValidity( this._paper))
        DG.logError('Invalid Paper');
      // @endif
    }

  };
};
