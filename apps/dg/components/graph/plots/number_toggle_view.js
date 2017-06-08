// ==========================================================================
//                            DG.NumberToggleView
//
// Shown when cases have more than one parent in order to provide an interface for hiding and showing
// cases belonging to a particular parent.
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

sc_require('views/raphael_base');
sc_require('utilities/rendering_utilities');

/** @class  DG.NumberToggleView - The base class view for a graph legend.

  @extends DG.RaphaelBaseView
*/
DG.NumberToggleView = DG.RaphaelBaseView.extend(

  (function()
  {
    var kLabelFontFamily = 'Montserrat-Regular, sans-serif',
        kLabelFontSize = '11px',
        kCheckFontSize = '18px',
        kArrowWidth = 33,
      ArrowButton = SC.Object.extend({
        paper: null,
        url: null,
        depressedUrl: null,
        action: null,
        target: null,
        arrow: null,
        depressedArrow: null,
        _position: null,
        _state: null,
        kHeight: 19,

        init: function() {
          sc_super();

          var tClickHandling = false,
              this_ = this;
          this._position = { x: 0, y: 0 };
          this.arrow = this.paper.image( this.url, 0, 0, kArrowWidth, this.kHeight)
            .hide()
            .attr( { cursor: 'pointer' })
            // Use mousedown/mouseup here rather than click so that touch will work
            .mousedown( function() {
              tClickHandling = true;
              this_._state = 'depressed';
              this_.show();
            });
          this.depressedArrow = this.paper.image( this.depressedUrl, 0, 0, kArrowWidth, this.kHeight)
            .hide()
            .mouseup( function() {
              if( tClickHandling && this_.action)
                this_.action.call( this_.target);
              tClickHandling = false;
              this_._state = 'normal';
              this_.show();
            } );
        },

          /**
           * @param {String} 'position'
           * @param { Object {x: {Number}, y: {Number}}
           */
        position: function( iKey, iValue) {
          if( iValue) {
            this._position = iValue;
            if( this.arrow)
              this.arrow.attr( this._position);
            if( this.depressedArrow)
              this.depressedArrow.attr( this._position);
          }
          return this._position;
        }.property(),

        show: function() {
          if( !this._state)
            this._state = 'normal';
          switch( this._state) {
            case 'normal':
              this.arrow.show();
              this.depressedArrow.hide();
              break;
            case 'depressed':
              this.depressedArrow.show();
              this.arrow.hide();
              break;
          }
          return this;
        },

        hide: function() {
          this.arrow.hide();
          this.depressedArrow.hide();
          return this;
        }
      }
    );

    /** @scope DG.NumberToggleView.prototype */
    return {

      displayProperties: ['lastMode', 'firstDisplayedIndex', 'lastDisplayedIndex'],

      classNames: 'dg-number-toggle'.w(),

      /**
        The model on which this view is based.
        @property { DG.NumberToggleModel }
      */
      model: null,

      isVisibleBinding: SC.Binding.oneWay('*model.isEnabled'),

      lastModeBinding: '*model.lastMode',

      layout: { left: 0, top: 0, right: 0, height: DG.RenderingUtilities.kCaptionFontHeight },

      /**
       * Zero unless there are more indices than fit in the space in which case it is the index of the leftmost
       * parent.
       * @property{Number}
       */
      firstDisplayedIndex: 0,

      /**
       * Normally the index of the last parent, but if the parent indices don't all fit, the index of the last
       * parent displayed. This gets precedence in display.
       * @property{Number}
       */
      lastDisplayedIndex: 0,

      _leftArrow: null,
      _rightArrow: null,

      /**
       * Lazy initialization of images since they may not be needed.
       * @property {ArrowButton}
       */
      leftArrow: function() {
        if( this._paper && !this._leftArrow ) {
          this._leftArrow = ArrowButton.create( { paper:this._paper, url: static_url('images/arrow_left.png'),
            depressedUrl: static_url('images/arrow_left_depressed.png'), action: this.scrollLeft, target: this } );
        }
        return this._leftArrow;
      }.property(),

      /**
       * Lazy initialization of images since they may not be needed.
       * @property {ArrowButton}
       */
      rightArrow: function() {
        if( this._paper && !this._rightArrow ) {
          this._rightArrow = ArrowButton.create( { paper:this._paper, url: static_url('images/arrow_right.png'),
            depressedUrl: static_url('images/arrow_right_depressed.png'), action: this.scrollRight, target: this } );
        }
        return this._rightArrow;
      }.property(),

      /**
       * We always just need room for one line of text. Return its height.
       *
        @property { Number }
      */
      desiredExtent: function() {
        return DG.RenderingUtilities.kCaptionFontHeight;
      }.property(),

      init: function() {
        sc_super();
        this.lastDisplayedIndex = this.getPath('model.numberOfToggleIndices') - 1;
      },

      doDraw: function doDraw() {
        var toggleNumber = function( iElement) {
            DG.logUser( "Show parent: %@", iElement.toggleIndex + 1);
            SC.run(function() {
              this.set('lastMode', false);
              this.get('model').toggleVisibility(iElement.toggleIndex);
            }.bind(this));
          }.bind( this ),

          changeAllCaseVisibility = function() {
            var tModel = this.get('model');
            SC.run(function() {
              this.set('lastMode', false);
              tModel.changeAllCaseVisibility();
            }.bind(this));
            if( tModel.allCasesAreHidden())
              DG.logUser( "Hide all:");
            else
              DG.logUser( "Show all:");
          }.bind( this ),

          toggleLastMode = function() {
            SC.run(function() {
              var lastMode = this.get('lastMode');
              this.set('lastMode', !lastMode);
            }.bind(this));
          }.bind(this),

          createShowAllElement = function() {
            var tClickHandling = false,
                showHideAllLabel = tModel.allCasesAreVisible()
                                      ? 'DG.NumberToggleView.hideAll'.loc()
                                      : 'DG.NumberToggleView.showAll'.loc(),
                showHideAllTooltip = tModel.allCasesAreVisible()
                                        ? 'DG.NumberToggleView.hideAllTooltip'.loc()
                                        : 'DG.NumberToggleView.showAllTooltip'.loc(),
                kLeftMargin = 6;
            return this._paper.text(kLeftMargin, 0, showHideAllLabel)
                      .attr({ 'font-family': kLabelFontFamily, 'font-size': kLabelFontSize,
                              cursor: 'pointer', 'text-anchor': 'start',
                              fill: 'black', title: showHideAllTooltip })
                      // Use mousedown/mouseup here rather than click so that touch will work
                      .mousedown( function() {
                        tClickHandling = true;
                      })
                      .mouseup( function() {
                        if( tClickHandling)
                          changeAllCaseVisibility();
                        tClickHandling = false;
                      } );
          }.bind( this ),

          createLastElements = function() {
            var isLastMode = this.get('lastMode'),
                lastCheck = isLastMode
                              ? 'DG.NumberToggleView.lastChecked'.loc()
                              : 'DG.NumberToggleView.lastUnchecked'.loc(),
                lastLabel= 'DG.NumberToggleView.lastLabel'.loc(),
                lastTooltip = isLastMode
                                ? 'DG.NumberToggleView.disableLastModeTooltip'.loc()
                                : 'DG.NumberToggleView.enableLastModeTooltip'.loc(),
                tClickHandling = false,
                lastDashElt = this._paper.text(-9999, 0, 'DG.NumberToggleView.lastDash'.loc())
                                .attr({ 'font-family': kLabelFontFamily, 'font-size': kLabelFontSize,
                                        cursor: 'pointer', 'text-anchor': 'start', fill: 'black' }),
                checkElt = this._paper.text(-9999, 0, lastCheck)
                            .attr({ 'font-family': kLabelFontFamily, 'font-size': kCheckFontSize,
                                    cursor: 'pointer', 'text-anchor': 'start',
                                    fill: 'black', title: lastTooltip })
                        // Use mousedown/mouseup here rather than click so that touch will work
                        .mousedown(function() {
                          tClickHandling = true;
                        })
                        .mouseup(function() {
                          if (tClickHandling)
                            toggleLastMode();
                          tClickHandling = false;
                        }),
                lastElt = this._paper.text(-9999, 0, lastLabel)
                            .attr({ 'font-family': kLabelFontFamily, 'font-size': kLabelFontSize,
                                    cursor: 'pointer', 'text-anchor': 'start',
                                    fill: 'black', title: lastTooltip })
                        // Use mousedown/mouseup here rather than click so that touch will work
                        .mousedown(function() {
                          tClickHandling = true;
                        })
                        .mouseup(function() {
                          if (tClickHandling)
                            toggleLastMode();
                          tClickHandling = false;
                        });
            var lastElements = [lastDashElt, checkElt, lastElt];
            lastElements.forEach(function(elt) {
              elt.width = elt.getBBox().width;
            });
            return lastElements;
          }.bind(this),

          createNumberElements = function(lastElements) {
            // Create the number elements and stash their widths
            var tIndex, tClickHandling = false;

            function doMouseDown( iEvent) {
              tClickHandling = true;
            }

            function doMouseUp( iEvent) {
              if( tClickHandling)
                toggleNumber(this);
              tClickHandling = false;
            }

            var addElement = function(elt) {
              tNumberElements.push(elt);
              tTotalNumberWidth += elt.width + kSpace;
              this._elementsToClear.push(elt);
            }.bind(this);

            var tElement;
            for( tIndex = 0; tIndex < tNumParents; tIndex++ ) {
              var tLabel = tModel.getParentLabel(tIndex),
                  tTooltip = tModel.getParentTooltip(tIndex),
                  tFill = tModel.casesForIndexAreHidden( tIndex) ? 'lightGray' : 'black';
              tElement = this._paper.text(-9999, tY, tLabel)
                .attr({ 'font-family': kLabelFontFamily, 'font-size': kLabelFontSize,
                        cursor: 'pointer', 'text-anchor': 'start', fill: tFill, title: tTooltip })
                .mousedown( doMouseDown)
                .mouseup( doMouseUp);

              tElement.width = tElement.getBBox().width;  // Assigning new properties to Raphael element for convenience
              tElement.toggleIndex = tIndex;
              addElement(tElement);
            }
            // Put "Last" elements in array with number elements
            if (lastElements)
              lastElements.forEach(function(elt) { addElement(elt); });
          }.bind( this ),

          positionNumberElements = function() {
            var tX = tFirstX,
                tIndex, tLastIndex = tNumParents;
            if( tNeedLeftArrow) {
              tLeftArrow = this.get('leftArrow').show();
              tLeftArrow.set('position', { x: tX, y: 0 });
              tX += kArrowWidth;
            }
            else
              this.get('leftArrow' ).hide();

            for( tIndex = this.firstDisplayedIndex; tIndex <= this.lastDisplayedIndex; tIndex++) {
              tNumberElements[ tIndex].attr({ x: tX });
              tX += tNumberElements[ tIndex].width + kSpace;
            }

            if( tNeedRightArrow) {
              tRightArrow = this.get('rightArrow').show();
              tRightArrow.set('position', { x: tX - kSpace, y: 0 });
              tX += kArrowWidth;
            }
            else
              this.get('rightArrow' ).hide();

            for (var i = tLastIndex; i < tNumberElements.length; ++i) {
              if (tNumberElements[i]) {
                // adjust placement of checkbox
                var yOffset = i === tNumberElements.length - 2 ? -1 : 0;
                // adjust spacing between checkbox and "Last"
                if (i === tNumberElements.length - 1)
                  tX -= 5;
                tNumberElements[i].attr({ x: tX, y: tY + yOffset });
                tX += tNumberElements[i].width + kSpace;
              }
            }
          }.bind( this);

        // Start of doDraw
        if (!this.get('isVisible')) return;

        var kSpace = 5,
            tModel = this.get('model' ),
            tNumParents = tModel.get('numberOfToggleIndices' ),
            tNameElement = createShowAllElement(),
            tNameBox = tNameElement.getBBox(),
            tLastElements = createLastElements(),
            tY = 2 + tNameBox.height / 2,
            tFirstX = tNameBox.x + tNameBox.width + kSpace,
            tLastElementsWidth = tLastElements.reduce(function(sum, elt) {
                                                        return sum + elt.width + kSpace;
                                                      }, 0),
            tFixedSpace = tFirstX + kSpace + tLastElementsWidth + kSpace,
            tNumberDisplayWidth = this._paper.width - tFixedSpace,
            tNeedRightArrow, tNeedLeftArrow,
            tRightArrow, tLeftArrow,
            tNumberElements = [],
            tTotalNumberWidth = 0,
            tIndex, tCumWidth, tEltWidth;
        this._elementsToClear.push( tNameElement);
        if( !DG.isFinite(tFirstX) || !DG.isFinite(tY))
          return; // Apparently not ready to draw yet
        if( tY === 0) {
          // getBBox didn't return a valid value, so we try again later
          this.invokeLast( this.displayDidChange);
          return;
        }

        tNameElement.attr({ y: tY });

        createNumberElements(tLastElements);

        // In this block we compute tNeedLeftArrow, tNeedRightArrow, firstDisplayedIndex, and lastDisplayedIndex
        if( tTotalNumberWidth <= tNumberDisplayWidth) {
          tNeedRightArrow = tNeedLeftArrow = false;
          this.firstDisplayedIndex = 0;
          this.lastDisplayedIndex = tNumParents - 1;
        }
        else  {
          tNeedRightArrow = this.lastDisplayedIndex < tNumParents - 1;
          tNeedLeftArrow = true;  // assume we'll need it initially
          tCumWidth = kArrowWidth + (tNeedRightArrow ? kArrowWidth : 0);

          // fit as many as possible on the left
          tIndex = this.lastDisplayedIndex + 1;
          while( tIndex > 0) {
            tEltWidth = tNumberElements[tIndex-1].width + kSpace;
            if ((tCumWidth + tEltWidth < tNumberDisplayWidth) || (tIndex === this.lastDisplayedIndex + 1)) {
              tIndex--;
              tCumWidth += tEltWidth;
            }
            else break;
          }
          // would the rest fit without the left arrow?
          var i, tRemainingWidth = 0;
          for (i = 0; i < tIndex; ++i) {
            tRemainingWidth += tNumberElements[i].width + kSpace;
          }
          if (tCumWidth + tRemainingWidth - kArrowWidth < tNumberDisplayWidth) {
            tIndex = 0;
            tCumWidth += tRemainingWidth;
          }

          this.firstDisplayedIndex = tIndex;
          if (this.firstDisplayedIndex === 0) {
            tNeedLeftArrow = false;
            tCumWidth -= kArrowWidth;
          }

          // see if we can fit more on the right
          if (tNeedRightArrow) {
            tIndex = this.lastDisplayedIndex + 1;
            while( tIndex < tNumParents) {
              tEltWidth = tNumberElements[tIndex].width + kSpace;
              if (tCumWidth + tEltWidth < tNumberDisplayWidth) {
                this.lastDisplayedIndex = tIndex++;
                tCumWidth += tEltWidth;
              }
              else break;
            }
            // would the rest fit without the right arrow?
            tRemainingWidth = 0;
            for (i = this.lastDisplayedIndex + 1; i < tNumParents; ++i) {
              tRemainingWidth += tNumberElements[i].width + kSpace;
            }
            if (tCumWidth + tRemainingWidth - kArrowWidth < tNumberDisplayWidth) {
              this.lastDisplayedIndex = tNumParents - 1;
              tNeedRightArrow = false;
            }
          }

          // With certain label combinations it is possible to get stuck.
          // For example, when showing two short labels that just fit and scrolling
          // to the left would reveal a very long label that doesn't fit, the left
          // moving loop won't include the long label (because it doesn't fit), but
          // then the right moving loop will decide that there's room for the other
          // short label, leaving the user in their original state. This code
          // detects such situations by detecting when a scroll action results in
          // the same state as before the scroll, and forcibly scrolls in the
          // intended direction, even though the result may not fit.
          if (this._prevScroll && this._prevScroll.scrollBy &&
              (this.firstDisplayedIndex === this._prevScroll.first) &&
              (this.lastDisplayedIndex === this._prevScroll.last)) {
            if (this._prevScroll.scrollBy < 0) {
              -- this.firstDisplayedIndex;
              -- this.lastDisplayedIndex;
            }
            else {
              ++ this.firstDisplayedIndex;
              ++ this.lastDisplayedIndex;
            }
            tNeedLeftArrow = this.firstDisplayedIndex > 0;
            tNeedRightArrow = this.lastDisplayedIndex < tNumParents - 1;
          }
        }

        this._prevScroll = null;

        positionNumberElements();
      },  // end of doDraw

      /**
       * Left arrow has been pressed.
       * Decrement lastDisplayedIndex so that lower numbered indices will be displayed.
       * The amount to decrement by is the lesser of the firstDisplayedIndex or the difference between
       * the first and last displayed indices.
       */
      scrollLeft: function() {
        var tFirst = this.get('firstDisplayedIndex' ),
            tLast = this.get('lastDisplayedIndex' ),
            tRangeStep = (tLast - tFirst) || 1,
            tScrollBy = Math.min( tFirst, tRangeStep);
        this._prevScroll = { first: tFirst, last: tLast, scrollBy: -tScrollBy };
        this.decrementProperty( 'lastDisplayedIndex', tScrollBy);
      },

      /**
       * Right arrow has been pressed.
       * Increment lastDisplayedIndex so that higher numbered indices will be displayed.
       * The amount to increment by is the lesser of the number of undisplayed higher indices or the difference between
       * the first and last displayed indices.
       */
      scrollRight: function() {
        var tFirst = this.get('firstDisplayedIndex' ),
            tLast = this.get('lastDisplayedIndex' ),
            tRangeStep = (tLast - tFirst) || 1,
            tNumber = this.getPath('model.numberOfToggleIndices' ),
            tScrollBy = Math.min( tNumber - tLast - 1, tRangeStep);
        this._prevScroll = { first: tFirst, last: tLast, scrollBy: tScrollBy };
        this.incrementProperty( 'lastDisplayedIndex', tScrollBy);
      },

      /**
       * @return {Boolean}
       */
      shouldShow: function() {
        return this.getPath('model.isEnabled');
      },

      /**
       * If the case count changes we need to redisplay, but we can wait awhile
       */
      handleCaseCountChange: function() {
        this.set('lastDisplayedIndex', this.getPath('model.numberOfToggleIndices') - 1);
        this.displayDidChange();  // Use displayDidChange so that doDraw doesn't get called too often
      }.observes('model.caseCount'),

      /**
       * If the hidden cases change we need to redisplay, but we can wait awhile
       */
      handleHiddenCasesChange: function() {
        this.displayDidChange();
      }.observes('model.hiddenCases')

    };
  }()));

