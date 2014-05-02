// ==========================================================================
//                          DG.FormulaObject
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

/** @class DG.FormulaObject

  This is a component used by a game component to allow the user to 
  define a formula that the game will use.

  @extends SC.View
*/
DG.FormulaObject = SC.View.extend((function() // closure
/** @scope SC.View.prototype */ {

  // Private closure variables
  var kID = 'formula_object';

  return {  // return from closure

    /**
     *  Called when the DG.FormulaObject is being destroyed.
     */
    destroy: function() {
      // Signal any observers that we're about be destroyed.
      this.notifyPropertyChange('willDestroy');
      sc_super();
    },

    /**
     View of description passed in by external component
     @property { SC.StaticContentView }
     */
    descriptionView: null,

    /**
     * @property{String}
     */
    formula: function() {
      var tTextArea = $('textarea[name|=\"' + this.get('outputSymbol') + '\"]' ),
          tFormula = tTextArea && tTextArea.val();
      return tFormula;
    }.property(),

    /**
     * @property {Object} where each property is named by the local variable with a String value that is its formula
     */
    locals: function() {
      var tResult = {},
          tCounter = 0;
      $('input').each( function( iIndex, iInputElement) {
        var tName = iInputElement.value;
        tCounter++;
        if( !SC.empty(tName)) {
          tResult[ tName] = $('[name=\"formula' + tCounter + '\"]' ).val();
        }
      });
      return tResult;
    }.property(),

    /**
     * @property {Object} where each property is named by the local variable or <outputSymbol> with a String value
     * that is its formula
     */
    formulas: function() {
      var tLocals = this.get('locals' ),
          tOutputSymbol = this.get('outputSymbol' ),
          tFormulas = {};
      tFormulas[ tOutputSymbol] = this.get('formula');
      tFormulas.locals = tLocals;
      return tFormulas;
    }.property(),

    /**
     *  Layout the HTML that provides the interface
     */
    init: function() {
      sc_super();
      this.set( 'layout', { top: 0, left: 0,
                            width: 420,
                            height: 588 } );
      this.set( 'descriptionView', SC.StaticContentView.create(
        { layerId: kID,
          selectStart: function() {
            return true;
          }} ) );
      this.appendChild( this.descriptionView );
      this.buildHTML();
      this.invokeLast( this.postProcessing);
    },

    /**
     * Layout the table of variables, descriptions, and text inputs
     */
    buildHTML: function() {
      var tSymbols = this.get('nameSpaceSymbols' ),
          tOutputSymbol = this.get('outputSymbol' ),
          tDescriptions = this.get('variableDescriptions' ),
          tTable = '<table id="variables">' +
                      '<tr>' +
                        '<th>Variable</th><th>Description</th>' +
                      '</tr>',
          tFormulas = DG.gameSelectionController.getPath('currentGame.formulas' ),
          tFormula = (tFormulas && tFormulas[ tOutputSymbol]) ? tFormulas[ tOutputSymbol] : '',
          tLocals = (tFormulas && tFormulas.locals) ? tFormulas.locals : {},
          tLocalCounter = 1;

      tSymbols.forEach( function( iSymbol, iIndex) {
        tTable += '<tr><td>' + iSymbol + '</td><td>' + tDescriptions[ iIndex] + '</td></tr>';
      });
      tTable += '<tr><td>' + tOutputSymbol + '</td>' +
                '<td><textarea autocapitalize="off" rows="2" cols="50" name=\"' + tOutputSymbol + '\" ' +
                'placeholder="Type your formula here">' + tFormula +
                '</textarea></td>' +
                '</tr>';

      DG.ObjectMap.forEach( tLocals, function( iKey, iValue) {
        tTable += '<tr><td><input autocapitalize="off" type="text" name="local' + tLocalCounter + '" ' +
                  'size="10" placeholder="Your variable" value ="' + iKey + '"/>' +
                  '</td>' +
                          '<td><textarea name="formula' + tLocalCounter +
                  '" rows="2" cols="50" placeholder="Type your formula here">' + iValue +
                  '</textarea></td></tr>';
        tLocalCounter++;
      });

      if( this.get( 'allow_user_variables'))
        tTable += '<tr><td><input autocapitalize="off" type="text" name="local' + tLocalCounter +
                  '" size="10" placeholder="Your variable"/></td>' +
                  '<td><textarea name="formula' + tLocalCounter +
                  '" rows="2" cols="50" placeholder="Type your formula here"></textarea></td>' +
                  '</tr>';
      tTable += '</table>';
      this.descriptionView.set('content', this.get('description') + tTable);
    },

    postProcessing: function() {
      var this_ = this;

      function resizeComponent() {
        var tComponentView = this_.getPath('parentView.parentView' ),
            tHeight = $('#' + kID ).height();
        // This is magic in that we have to know to add in the title bar height and 20 more for padding at top and bottom
        tComponentView.adjust('height', tHeight + DG.ViewUtilities.kTitleBarHeight + 20);
      }

      function handleLocalNameChange() {
        // If there is not an input field that is empty, we add a new row to the table
        var tEmptyCount = 0,
            tRowCount = 0,
            tInputs = $('input' );
        tInputs.each( function( iIndex) {
          tRowCount++;
          if( $(this ).val() === '')
            tEmptyCount++;
        });
        if( tEmptyCount === 0) {
          tRowCount++;
          //Here we are using browser detection to disable placeholder for all IE browsers.  IE10 does not
          //display placeholder on textarea that is generated by javascript correctly.  It behaves
          //as normal text instead of being removed on focus.  Browser detection is used because
          //IE10 falsely reports placeholder as working, but it doesn't work in this use case.
          var placeholderSupported = !SC.browser.isIE,
              placeholderText = placeholderSupported ? 'Type your formula here' : '';
          
          $('table').append(
            '<tr><td><input autocapitalize="off" type="text" name="local' + tRowCount + '"' +
            ' size="10" placeholder="Your variable"/></td>' +
              '<td><textarea autocapitalize="off" name="formula' + tRowCount + '"' +
            'rows="2" cols="50" placeholder="'+placeholderText+'"></textarea></td>' +
            '</tr>'
          );
          this_.invokeLast( this_.postProcessing);
        }
      }

      var tLocalNameFields = $('input');
      tLocalNameFields.change( handleLocalNameChange);

      resizeComponent();
    },

    updateContents: function( iDescription, iOutput, iInputs, iDescriptions, iAllowUserVariables) {
      this.set('description', iDescription);
      this.set('outputSymbol', iOutput);
      this.set('nameSpaceSymbols', iInputs);
      this.set('variableDescriptions', iDescriptions);
      this.set('allow_user_variables', iAllowUserVariables);

      this.buildHTML();
      this.invokeLast( this.postProcessing);
    }

  };  // end return from closure
}()));

