// ==========================================================================
//                                DG.LayerManager
// 
//  Author:   William Finzer
//
//  Copyright ©2013 KCP Technologies, Inc., a McGraw-Hill Education Company
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
      this.testValidity();
    },

    /**
     * We have to give layers a chance to update pointers to elements before calling remove
     * @param iElement {Raphael Element }
     */
    removeElement: function( iElement) {
      this.forEach( function( iLayer) {
        iLayer.prepareToMoveOrRemove( iElement);
      });
      iElement.remove();
      this.testValidity();
    },

    testValidity: function() {
      // @if (debug)
      this.forEach( function( iLayer) {
        if( !iLayer.isValid())
          DG.logError('Invalid layer: ' + iLayer.name);
      });
      // @endif
    }

  };
};