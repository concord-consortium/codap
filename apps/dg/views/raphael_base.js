// ==========================================================================
//                          DG.RaphaelBaseView
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
sc_require('utilities/layer_manager');

/** @class

    Use RaphaelBaseView when your rendering will be based on Raphael.

 @extends SC.View
 */
DG.RaphaelBaseView = SC.View.extend(DG.Destroyable,
    /** @scope DG.RaphaelBaseView.prototype */ {

      /**
       @property { Number }  Takes into account any borders the parent views may have
       */
      drawWidth: function () {
        return this.get('frame').width;
      }.property('frame'),

      /**
       @property { Number }  Takes into account any borders the parent views may have
       */
      drawHeight: function () {
        return this.get('frame').height;
      }.property('frame'),

      /**
       @property { R }  Raphael drawing environment
       */
      _paper: null,

      paper: function () {
        return this._paper;
      }.property('_paper'),

      /**
       * @property {DG.LayerManager }
       */
      _layerManager: null,

      layerManager: function () {
        // lazy instantiation because _paper must exist
        if (!this._layerManager) {
          this.initLayerManager();
        }
        return this._layerManager;
      }.property(),

      _plottedElementsMap: null,

      getPlottedElements: function( iIndex) {
        var tElements = this._plottedElementsMap && this._plottedElementsMap[iIndex];
        if( !tElements) {
          tElements = [];
          if( this._plottedElementsMap)
            this._plottedElementsMap[ iIndex] = tElements;
        }
        return tElements;
      },

      shiftPlottedElementsToEndOfMap: function( iIndex) {
        DG.assert(this._plottedElementsMap && this._plottedElementsMap[iIndex]);
        var tMapLength = this._plottedElementsMap.length,
            tElements = this._plottedElementsMap[iIndex];
        if( iIndex < tMapLength - 1) {
          this._plottedElementsMap.splice( iIndex, 1);
          this._plottedElementsMap.push( tElements);
        }
      },

      /**
       During createVisualization, stash elements in here that should be removed and regenerated
       each time drawing happens.
       @property { SC.Array of Raphael element }
       */
      _elementsToClear: null,

      _firstTimeToDraw: true,

      /**
       Initialize _elementsToClear
       */
      init: function () {
        sc_super();
        this._elementsToClear = [];
        this._plottedElementsMap = [];
      },

      /**
       * signal that we're destroyed by nulling out _elementsToClear
       */
      destroy: function () {
        this._elementsToClear = null;
        this._paper = null;
        this._plottedElementsMap.length = 0;
        this._plottedElementsMap = null;

        sc_super();
      },

      /**
       Called each time we have to regenerate or modify the visualization.
       Derived classes should call their sc_super so that _elementsToClear
       are removed.
       */
      createVisualization: function () {

        // If shouldDraw() returns false, no drawing occurs
        if (this.shouldDraw()) {

          // Perform any necessary pre-rendering tasks
          this.willDraw();

          // Perform any necessary rendering
          this.doDraw();

          // Perform any post-rendering tasks
          this.didDraw();
        }

        // TODO: This is a kluge that fixes a problem associated with Raphael 2.0 whereby the first time
        // a view is drawn, text is not drawn in the correct position or with the correct rotation.
        if (this._firstTimeToDraw) {
          this._firstTimeToDraw = false;
          this.invokeLater('displayDidChange', 1);
        }
      },

      /**
       Derived classes may override to perform their own render determination.
       If this function returns false, willDraw(), doDraw() and didDraw() are skipped.
       This base class implementation returns false if the view can't draw, so derived
       classes should make sure to return false if this base class returns false, e.g.
       return derivedClassShouldDraw() && sc_super();
       @returns  {Boolean}   True if willDraw(), doDraw(), didDraw() can/should be called
       */
      shouldDraw: function shouldDraw() {
        // If we've been destroyed don't attempted to draw
        return !SC.none(this._elementsToClear);
      },

      /**
       Derived classes may override to perform their own pre-render preparation.
       If this function returns false, doDraw() and didDraw() are skipped.
       */
      willDraw: function willDraw() {
        // It can happen that _elementsToClear has gotten nulled out. Protect against that
        if (!this._elementsToClear)
          return;

        // Clear elements that get regenerated each time
        this._elementsToClear.forEach(function (iElement) {
          iElement.remove();
        });
        this._elementsToClear = [];
      },

      /**
       Derived classes override to do their drawing.
       */
      doDraw: function doDraw() {
      },

      /**
       Derived classes override to perform any end-of drawing tasks.
       */
      didDraw: function didDraw() {
        // It can happen that _elementsToClear has gotten nulled out. Protect against that
        if (!this._elementsToClear)
          return;

        // The elements to clear need to be in the background. We do it in reverse order
        // so that things drawn last will remain on top
        var tIndex, tLength = this._elementsToClear.length;
        for (tIndex = tLength - 1; tIndex >= 0; tIndex--)
          this._elementsToClear[tIndex].toBack();
      },

      /**
       * Change the size of our paper and recreate the visualization
       */
      updatePaper: function updatePaper() {
        if (this._paper) {
          var tDrawWidth = this.get('drawWidth'),
              tDrawHeight = this.get('drawHeight');

          if ((tDrawWidth <= 0) || (tDrawHeight <= 0))  // Can happen during removal of a view
            return;

          if ((this._paper.width !== tDrawWidth) ||
              (this._paper.height !== tDrawHeight)) {
            this._paper.setSize(tDrawWidth, tDrawHeight);
            this.notifyPropertyChange('paperSize');
            this.invokeLast(this.createVisualization);  // We're a different size, so everything is up for grabs
          }
        }
      }.observes('frame'),

      /**
       This is the root method you usually implement to draw into a view.  The
       basic idea here is to just push HTML strings into the context which will
       be converted to DOM elements by the browser.  This is usually much faster
       than manipulating the DOM yourself.

       Note that firstTime is YES only if render is being called on a new layer.
       This is the only time you want to render the HTML unless the HTML has
       changed.
       */
      render: function render(context, firstTime) {
        sc_super();
        if (this._paper)
          this.createVisualization();
      },

      /**
       * Subclasses can override calling sc_super() and then adding layers at will.
       */
      initLayerManager: function () {
        if (!this._layerManager && this._paper) {
          this._layerManager = new DG.LayerManager(this._paper);
        }
      },

      /**
       This is our opportunity to create the paper on which we'll draw.
       */
      didCreateLayer: function didCreateLayer() {
        /* jshint -W064 */  // Missing 'new' prefix when invoking a constructor. (W064)
        this._paper = Raphael(this.get('layer'),
            this.get('drawWidth'), this.get('drawHeight'));

        this.createVisualization();
      },

      // This is the default implementation, but it's helpful to be explicit here in the code in case we find
      // in the future we need modification
      touchStart: function (evt) {
        return NO; // Allows views up the hierarchy to respond. Particularly the component view
      },
      touchEnd: function (evt) {
        return YES; // We handled it
      },
      touchesDragged: function (evt, touches) {
        return YES; // Ours to deal with
      },
      /*  My commenting this out, we allow marquee select to work in plots
          captureTouch: function( touch) {
            return YES; // Don't let a sub view capture it
          },
      */
      // This is part of a hack to prevent both scroll view and raphael view from responding to touch
      touchPriority: YES
    });
