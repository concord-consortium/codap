// ==========================================================================
//                            DG.NumberToggleView
//
// Shown when cases have more than one parent in order to provide an interface for hiding and showing
// cases belonging to a particular parent.
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

sc_require('views/raphael_base');

/** @class  DG.NumberToggleView - The base class view for a graph legend.
  
  @extends DG.RaphaelBaseView
*/
DG.NumberToggleView = DG.RaphaelBaseView.extend(

  (function()
  {
    var kArrowWidth = 33,
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

      displayProperties: ['firstDisplayedIndex', 'lastDisplayedIndex'],

      /**
        The model on which this view is based.
        @property { DG.NumberToggleModel }
      */
      model: null,

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
        this.lastDisplayedIndex = this.getPath('model.numberOfParents') - 1;
      },

      doDraw: function doDraw() {
        var toggleNumber = function( iElement) {
            this.get('model' ).toggleChildrenVisibility( iElement.toggleIndex);
            DG.logUser( "Show parent: %@", iElement.toggleIndex + 1);
          }.bind( this ),

          changeAllCaseVisibility = function() {
            this.get('model' ).changeAllCaseVisibility();
            DG.logUser( "Show all parents:");
          }.bind( this ),

          createShowAllElement = function() {
            var tClickHandling = false;
            return this._paper.text( 0, 0, 'DG.NumberToggleView.showAll'.loc() + ' -')
                      .attr( { font: 'caption', cursor: 'pointer', 'text-anchor': 'start',
                                fill: tModel.allCasesAreHidden() ? 'lightGray' : 'black',
                                title: SC.String.loc( 'DG.NumberToggleView.overallTooltip') } )
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

          createNumberElements = function() {
            // Create the number elements and stash their widths
            var tIndex;
            for( tIndex = 0; tIndex < tNumParents; tIndex++ ) {
              var tClickHandling = false,
                  tFill = tModel.allChildrenAreHidden( tIndex) ? 'lightGray' : 'black',
                  tElement = this._paper.text( -100, tY, tIndex + 1)
                    .attr({ font: 'caption', cursor: 'pointer', 'text-anchor': 'start',
                            fill: tFill })
                    .mousedown( function() {
                      tClickHandling = true;
                    })
                    .mouseup( function() {
                      if( tClickHandling)
                        toggleNumber( this);
                      tClickHandling = false;
                    });

              tElement.width = tElement.getBBox().width;  // Assigning new properties to Raphael element for convenience
              tElement.toggleIndex = tIndex;
              tNumberElements.push( tElement);
              tTotalNumberWidth += tElement.width + kSpace;
              this._elementsToClear.push( tElement);
            }
          }.bind( this ),

          positionNumberElements = function() {
            var tX = tFirstX,
                tIndex;
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
            }
            else
              this.get('rightArrow' ).hide();
          }.bind( this);

        // Start of doDraw
        var kSpace = 5,
            tModel = this.get('model' ),
            tNumParents = tModel.get('numberOfParents' ),
            tNameElement = createShowAllElement(),
            tNameBox = tNameElement.getBBox(),
            tY = tNameBox.height / 2,
            tFirstX = tNameBox.x + tNameBox.width + kSpace,
            tNumberDisplayWidth = this._paper.width - tFirstX,
            tNeedRightArrow, tNeedLeftArrow,
            tRightArrow, tLeftArrow,
            tNumberElements = [],
            tTotalNumberWidth = 0,
            tIndex, tCumWidth;
        this._elementsToClear.push( tNameElement);
        if( !DG.isFinite(tFirstX) || !DG.isFinite(tY))
          return; // Apparently not ready to draw yet
        if( tY === 0) {
          // getBBox didn't return a valid value, so we try again later
          this.invokeLast( this.displayDidChange);
          return;
        }

        tNameElement.attr({ y: tY });

        createNumberElements();

        // In this block we compute tNeedLeftArrow, tNeedRightArrow, firstDisplayedIndex, and lastDisplayedIndex
        if( tTotalNumberWidth <= tNumberDisplayWidth) {
          tNeedRightArrow = tNeedLeftArrow = false;
          this.firstDisplayedIndex = 0;
          this.lastDisplayedIndex = tNumParents - 1;
        }
        else if( this.lastDisplayedIndex === tNumParents - 1) {
          tNeedRightArrow = false;
          tNeedLeftArrow = true;
          tCumWidth = kArrowWidth;
          tIndex = tNumParents;
          while( tCumWidth < tNumberDisplayWidth && tIndex > 0) {
            tIndex--;
            tCumWidth += tNumberElements[ tIndex].width + kSpace;
          }
          this.firstDisplayedIndex = tIndex + 1;
        }
        else {
          tNeedRightArrow = true;
          tCumWidth = kArrowWidth;
          tIndex = this.lastDisplayedIndex + 1;
          while( tCumWidth < tNumberDisplayWidth && tIndex > 0) {
            tIndex--;
            tCumWidth += tNumberElements[ tIndex].width + kSpace;
          }
          this.firstDisplayedIndex = tIndex;
          if( this.firstDisplayedIndex === 0)
            tNeedLeftArrow = false;
          else {
            tNeedLeftArrow = true;
            // We have to go through the loop again to accommodate the left arrow
            tCumWidth = 2 * kArrowWidth;
            tIndex = this.lastDisplayedIndex + 1;
            while( tCumWidth < tNumberDisplayWidth && tIndex > 0) {
              tIndex--;
              tCumWidth += tNumberElements[ tIndex].width + kSpace;
            }
            this.firstDisplayedIndex = tIndex + 1;
          }
        }

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
            tScrollBy = Math.min( tFirst, tLast - tFirst);
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
            tNumber = this.getPath('model.numberOfParents' ),
            tScrollBy = Math.min( tNumber - tLast - 1, tLast - tFirst);
        this.incrementProperty( 'lastDisplayedIndex', tScrollBy);
      },

      /**
       * Only need to display if there are more than one parent
       * @return {Boolean}
       */
      shouldShow: function() {
        return this.getPath('model.numberOfParents') > 1;
      },

      /**
       * If the case count changes we need to redisplay, but we can wait awhile
       */
      handleCaseCountChange: function() {
        this.set('lastDisplayedIndex', this.getPath('model.numberOfParents') - 1);
        this.displayDidChange();  // Use displayDidChange so that doDraw doesn't get called too often
      }.observes('model.caseCount'),

      /**
       * If the case count changes we need to redisplay, but we can wait awhile
       */
      handleHiddenCasesChange: function() {
        SC.run( function() {
          this.displayDidChange();
        }.bind( this));
      }.observes('model.dataConfiguration.hiddenCases')

    };
  }()));

