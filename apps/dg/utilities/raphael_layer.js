// ==========================================================================
//                                DG.RaphaelLayer
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

sc_require('libraries/raphael');

/**
 * @class
 *
 * A single RaphaelLayer consists primarily of a pointer to the first element in the layer and a pointer to the
 * last element in the layer.
 *
 * @extends SC.Object
 */
DG.RaphaelLayer = SC.Object.extend(
  {
    /**
     * The layer that precedes this one; i.e. that is visibly 'below' this one. If null, we are the first layer.
     * @property {DG.RaphaelLayer}
     */
    _prevLayer: null,

    /**
     * The first element in this layer. If null, this layer has no elements.
     * @property {Raphael Element}
     */
    _firstElement: null,

    /**
     * The last element in this layer. If null, this layer has no elements.
     * @property {Raphael Element}
     */
    _lastElement: null,

    /**
     * The paper to which all elements belong
     * @property {Raphael Paper}
     */
    _paper: null,

    /**
     * Remove all elements belonging to me.
     */
    clear: function() {
      this.forEach( function( iElement) {
        iElement.remove();
      });
      this._firstElement = this._lastElement = null;
    },

    /**
     * Positions the given element as the last (top) element in this layer.
     * @param iElement {Raphael Element}
     * @return {Raphael Element } The original element
     */
    push: function( iElement) {
      DG.assert( iElement);
      if( !this._lastElement) {
        // We have no elements, so this becomes our first. We need to insert after previous layer's last Element.
        // But if there is no previous layer with a last element, then the given element moves to the paper's back.
        var tLayer;
        for( tLayer = this._prevLayer; tLayer; tLayer = tLayer._prevLayer) {
          if( tLayer && tLayer._lastElement) {
            break;
          }
        }
        if( tLayer) {
          iElement.insertAfter( tLayer._lastElement);
        }
        else
          iElement.toBack();
      }
      else {
        iElement.insertAfter( this._lastElement);
      }
      this._lastElement = iElement;
      if( !this._firstElement ) {
        this._firstElement = iElement;
      }
      DG.assert( iElement.next || (iElement === this._lastElement));
      DG.assert( this.isValid());
      return iElement;
    },

    /**
     * The given element is about to be removed from paper or moved to another layer. If it is either _firstElement or
     * _lastElement, we have to adjust.
     * @param iElement {Raphael Element}
     */
    prepareToMoveOrRemove: function( iElement) {
      if( iElement === this._firstElement) {
        if( this._firstElement === this._lastElement) {
          // After the move there will be no more elements in this layer
          this._firstElement = this._lastElement = null;
        }
        else
          this._firstElement = iElement.next;
      }
      else if( iElement === this._lastElement) {
        this._lastElement = iElement.prev;
      }
    },

    forEach: function( iCallback) {
      var tElement, tNextElement;
      for( tElement = this._firstElement; tElement; tElement = tNextElement) {
        tNextElement = (tElement === this._lastElement) ? null : tElement.next; // In case callback messes up linkage
        iCallback( tElement);
      }
    },

    /**
     * Return true if the given element is in the linked list of elements between _firstElement and _lastElement
     * @param iElement { Raphael Element }
     * @return {Boolean}
     */
    contains: function( iElement) {
      var tElement;
      for( tElement = this._firstElement;
           tElement && tElement.prev !== this._lastElement;
           tElement = tElement.next) {
        if( tElement === iElement)
          return true;
      }
      return false;
    },

    isValid: function() {
      return (!this._firstElement && !this._lastElement) ||
             ((this._firstElement && this._lastElement) &&
             (!this._firstElement.removed && !this._lastElement.removed));
    }

  } );
