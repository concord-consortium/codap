// ==========================================================================
//                            DG.Calculator
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

sc_require('libraries/protovis');

/** @class

  This is a self-contained view that provides calculator functionality. It has
 a fixed height and width, awaiting only a top and left for its specification.

 @extends SC.View
 */
DG.Calculator = SC.View.extend( (function() // closure
/** @scope DG.Calculator.prototype */ {

  // Private closure variables
  var kButtonWidth = 30,
    kButtonHeight = 24,

    kMargin = 3,
    kTopMargin = 10,
    kGap = 2,

    kDoubleButtonWidth = 2 * kButtonWidth + kGap,

    kColumnWidth = kButtonWidth + kGap,
    kRowHeight = kButtonHeight + kGap,

    kColumnCount = 4,
    kRowCount = 5;

  return {  // return from closure

    classNames: ['calculator'],
    backgroundColor: '#333333',

    _justEvaled: NO,  // If the expressions has just been evaluated, pressing
    // number key should wipe it out while arithmetic operation should insert.

    // The view format is the default number format, which after some earlier
    // modification of the Protovis code uses the Unicode minus sign for negative numbers.
    viewFormat: pv.Format.number().fractionDigits( 0, 9).group(""),

    // The export format uses the ASCII minus sign for negative numbers,
    // for use in log statements, etc.
    exportFormat: pv.Format.number().fractionDigits( 0, 9).group("").negativeAffix("-",""),
    
    /**
      Formats values for use by the Calculator view.
      Uses the Unicode minus sign for negative numbers.
     */
    formatForView: function( iValue) {
      if( typeof iValue !== 'number') return String( iValue);
      // pv.Format has been modified separately to use the Unicode minus sign,
      // so this will format negative numbers with the Unicode minus sign.
      return this.viewFormat( iValue);
    },

    /**
      Formats values for export (e.g. for logging).
      Uses the ASCII minus sign for negative numbers.
     */
    formatForExport: function( iValue) {
      if( typeof iValue !== 'number') return iValue;
      // The export format uses the ASCII minus sign for negative numbers.
      return this.exportFormat( iValue);
    },

    clearValue: function() {
      this.editView.set( 'value', '' );
      this._justEvaled = NO;
    },
    insert: function( iToInsert ) {
      if( this._justEvaled && !isNaN( parseInt( iToInsert, 10 ) ) )
        this.clearValue();
      this.editView.replaceSelectionWithString( iToInsert );
      if( !this.editView.get('isFirstResponder'))
        this.editView.becomeFirstResponder();
      this._justEvaled = NO;
    },
    insertSymbol: function( aSymbol ) {
      // Typically parentheses or decimal point
      if( this._justEvaled )
        this.clearValue();
      this.insert( aSymbol );
    },
    calculate: function() {
      var tCurrent = this.editView.get( 'formulaExpression' ),
          tFormula = DG.Formula.create({ source: tCurrent }),
          tValue = '';
      
      // Don't try to evaluate error messages
      if( !SC.empty( tCurrent) && (tCurrent.charAt( 0) === '#'))
        return;
      
      try {
        tValue = tFormula.evaluateDirect();
      }
      catch( err ) {
        tValue = !SC.empty( err.message) ? err.message : String( err);

        // Put a '#' in front of errors so that they stand out and also so that
        // if the user presses return, we can detect that we shouldn't evaluate.
        tValue = '#' + tValue;
      }

      this.editView.set('value', this.formatForView( tValue));
      this._justEvaled = YES;
      DG.logUser( "Calculation done: %@ = %@", tCurrent, this.formatForExport( tValue));
    },

    init: function() {
      sc_super();

      this.setupSubViews();
    },

    /**
     * All buttons and the edit view are setup here.
     */
    setupSubViews: function() {
      var this_ = this;

      // The two views that require special treatment are the editView (because it's not a button)
      // and the equals button (because it is bigger than the others).
      this.editView = DG.FormulaTextEditView.create( {
        layout: { top: 5, left: 5, right: 5, height: 20 },
        value: '',
        continuouslyUpdatesValue: false,
        borderStyle: SC.BORDER_BEZEL,
        keyDown: function( evt) {
          if( this_.handleKeyDown( evt))
            return sc_super();
          else
            return true;  // prevent further handling
        }
      } );
      this.appendChild( this.editView );

      this.set('defaultFirstResponder', this.editView);

      this.equals = SC.ButtonView.create( {
        layout: { bottom: kMargin, left: kMargin + 2 * kColumnWidth,
                  width: kDoubleButtonWidth, height: kButtonHeight },
        title: '=',
        titleMinWidth: 0
      } );
      this.appendChild( this.equals );

      // We assign equal view its action here because then we don't require reference to globals
      this.equals.action = function() {
        this_.calculate();
      };

      // Fix our width and height in terms of the number of rows and columns and the
      // size of the buttons.
      var kTop = kTopMargin + kMargin + this.editView.layout.height;
      this.set( 'layout', { top: 0, left: 0,
          width: 4 * kMargin + kColumnCount * kColumnWidth,
          height: kTop + kRowCount * kRowHeight + kMargin }
      );

      // All but two child views we can lay out automatically. We only need to provide
      // a title and an action.
      // Note that we are using a "deprecated" form of installing actions in button views.
      // But it is clearly better for our purposes than separate action/target recommended
      // by SproutCore.
      var tParams = [
        [ 'C', function() {
          this_.clearValue();
        } ],
        [ '(', function() {
          this_.insertSymbol( '(' );
        } ],
        [ ')', function() {
          this_.insertSymbol( ')' );
        } ],
        [ '/', function() {
          this_.insert( ' / ' );
        } ],
        [ '7', function() {
          this_.insert( '7' );
        } ],
        [ '8', function() {
          this_.insert( '8' );
        } ],
        [ '9', function() {
          this_.insert( '9' );
        } ],
        [ 'X', function() {
          this_.insert( ' * ' );
        } ],
        [ '4', function() {
          this_.insert( '4' );
        } ],
        [ '5', function() {
          this_.insert( '5' );
        } ],
        [ '6', function() {
          this_.insert( '6' );
        } ],
        [ DG.UNICODE.MINUS_SIGN, function() {
          this_.insert(' ' + DG.UNICODE.MINUS_SIGN + ' ');
        } ],
        [ '1', function() {
          this_.insert( '1' );
        } ],
        [ '2', function() {
          this_.insert( '2' );
        } ],
        [ '3', function() {
          this_.insert( '3' );
        } ],
        [ '+', function() {
          this_.insert( ' + ' );
        } ],
        [ '0', function() {
          this_.insert( '0' );
        } ],
        [ '.', function() {
          this_.insertSymbol( '.' );
        } ]
      ];
      var tCounter = 0,
        kNumRows = 5;
      tParams.forEach( function( aParam ) {
        var tRow = Math.floor( tCounter / kColumnCount );
        var tColumn = tCounter % kColumnCount;
        var tButton = SC.ButtonView.create( {
          layout: { bottom: kMargin + (kNumRows - tRow - 1) * kRowHeight,
            left: kMargin + tColumn * kColumnWidth,
            width: kButtonWidth, height: kButtonHeight
          },
          title: aParam[0],
          action: aParam[1],
          titleMinWidth: 0
        } );
        this_.appendChild( tButton );
        tCounter++;
      } );
    },
    
    handleKeyDown: function( evt ) {
      // Weird bug: It is possible to get here after closing the calculator and then switching
      // to another component with the world not looking the way we expect. If so, just bail.
      if( !this ) return NO;
      if( (evt.which === SC.Event.KEY_RETURN) && !evt.isIMEInput) {
        // Some browsers send both keydown & keypress for the RETURN key, and SproutCore
        // forwards both to this handler, so we have to make sure we only handle one.
        // Since other browsers only send keydown and not keypress, we only respond to keydown.
        if( evt.type === 'keydown')
          this.calculate();
      }
      else if( evt.which === SC.Event.KEY_ESC) // <esc>
        this.clearValue();
      else {
        var tChar = String.fromCharCode( evt.which );
        if( this._justEvaled && ("/*-+\t".indexOf( tChar ) === -1) ) {
          this.clearValue();
        }
        else if( tChar === '=' ) {
          this.calculate();
          // We calculated, so we don't want sc_super to do its thing
          return false;
        }
        else
          this._justEvaled = NO;
      }
      return true;
    }

  };  // end return from closure
}()) );  // end closure
