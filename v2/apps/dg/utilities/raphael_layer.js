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
    name: null,

    _map: null,
    /**
     * @property {Boolean}
     */
    isVisible: true,

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

    init: function() {
      sc_super();
      if( SC.empty( this.name))
        this.name = 'unnamed';
      this._firstElement = this._lastElement = null;
      this._map = {};
    },

    /**
     * Remove all elements belonging to me.
     */
    clear: function() {
      this.forEach( function( iElement) {
        iElement.remove();
      });
      this._firstElement = this._lastElement = null;
      this._map = {};
    },

    /**
     * Positions the given element as the last (top) element in this layer.
     * @param iElement {Raphael Element}
     * @return {Raphael Element } The original element
     */
    push: function( iElement) {
/*
      this.isValid();
      DG.RenderingUtilities.testPaperValidity( this._paper);
*/
      DG.assert( iElement);
      if( !this._paper.bottom) // We nulled this out in preparation for this push
        this._paper.bottom = iElement;
      if( !this._map[iElement.id]) {  // If it's not already present in the layer
        this._map[iElement.id] = true;
        if (!this._lastElement) {
          // We have no elements, so this becomes our first. We need to insert after previous layer's last Element.
          // But if there is no previous layer with a last element, then the given element moves to the paper's back.
          var tLayer;
          for (tLayer = this._prevLayer; tLayer; tLayer = tLayer._prevLayer) {
            if (tLayer && tLayer._lastElement) {
              break;
            }
          }
          if (tLayer) {
            iElement.insertAfter(tLayer._lastElement);
            // DG.RenderingUtilities.testPaperValidity( this._paper);
          }
          else
            iElement.toBack();
        }
        else {
          iElement.insertAfter(this._lastElement);
          // DG.RenderingUtilities.testPaperValidity( this._paper);
        }
        this._lastElement = iElement;
        if (!this._firstElement) {
          this._firstElement = iElement;
        }
        DG.assert(iElement.next || (iElement === this._lastElement));
      }
/*
      this.isValid();
      DG.RenderingUtilities.testPaperValidity( this._paper);
*/
      return iElement;
    },

    /**
     * The given element is about to be removed from paper or moved to another layer. If it is either _firstElement or
     * _lastElement, we have to adjust.
     * @param iElement {Raphael Element}
     */
    prepareToMoveOrRemove: function( iElement) {
/*
      this.isValid();
      DG.RenderingUtilities.testPaperValidity( this._paper);
*/
      // Special cases for which iElement is at the bottom or top of the paper
      if( iElement === this._paper.bottom) {
        this._paper.bottom = iElement.next;
        if( this._paper.bottom)
          this._paper.bottom.prev = null;
      }
      if( iElement === this._paper.top) {
        this._paper.top = iElement.prev;
        if( this._paper.top)
          this._paper.top.next = null;
      }
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
      if( this._map[ iElement.id]) {
        if( iElement.prev && iElement.prev.next === iElement)
          iElement.prev.next = iElement.next;
        if( iElement.next && iElement.next.prev === iElement)
          iElement.next.prev = iElement.prev;
        delete this._map[iElement.id];
      }
/*
      this.isValid();
      DG.RenderingUtilities.testPaperValidity( this._paper);
*/
    },

    forEach: function( iCallback) {
      var tElement, tNextElement,
          tIndex = 0;
      for( tElement = this._firstElement; tElement; tElement = tNextElement) {
        tNextElement = (tElement === this._lastElement) ? null : tElement.next; // In case callback messes up linkage
        iCallback( tElement, tIndex++);
      }
    },

    /**
     * Return true if the given element is in the linked list of elements between _firstElement and _lastElement
     * @param iElement { Raphael Element }
     * @return {Boolean}
     */
    contains: function( iElement) {
      return this._map[iElement.id];
    },

    /**
     *
     * @param iElement { Raphael Element }
     */
    bringToFront: function( iElement) {
      if( this.contains( iElement)) {
        this.prepareToMoveOrRemove( iElement);
        this.push( iElement);
      }
    },

    /**
     * A layer is valid if
     *  - it is empty, or there is both a first and last element, neither of which is "removed"
     *  - and if not empty you can navigate from first to last elements
     * @returns {boolean|null}
     */
    isValid: function() {
      var tIsValid = true/*,
          tOutput = 'Layer ' + this.name + '-> '*/;
      if(!this._firstElement && !this._lastElement)
        return true;
      if(!this._firstElement || !this._lastElement || this._firstElement.removed || this._lastElement.removed)
        tIsValid = false;
      else {
        var tFoundLast = false;
        this.forEach( function( iElement) {
          tIsValid = tIsValid && this._map[iElement.id];
          tFoundLast = tFoundLast || (iElement === this._lastElement);
          // tOutput += iElement.id + ': ' + DG.RenderingUtilities.svgElementClass( iElement) + ', ';
        }.bind( this));
        tIsValid = tIsValid && tFoundLast;
      }
      // console.log( tOutput);
      if( !tIsValid)
        console.log('Invalid layer: ' + this.name);
      return tIsValid;
    },

    hide: function() {
      this.set('isVisible', false);
      this.forEach( function( iElement) {
        iElement.animate({ 'fill-opacity' : 0, 'stroke-opacity': 0 },
            DG.PlotUtilities.kDefaultAnimationTime, '<>', function () { this.hide(); });
      });
    },

    /**
     *
     * @param iAttrs {Object} if specified, specifies fill-opacity and stroke-opacity to animate to
     */
    show: function( iAttrs) {
      iAttrs = iAttrs || { 'fill-opacity' : 1, 'stroke-opacity': 1 };
      this.set('isVisible', true);
      this.forEach( function( iElement) {
        iElement.show().animate( iAttrs, DG.PlotUtilities.kDefaultAnimationTime, '<>');
      });
    }

  } );
