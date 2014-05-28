// ==========================================================================
//                          DG.formulaObjectCoordinator
//
//  Author: William Finzer
//
//  Licensed under the Apache License, Version 2.0 (the "License");
//  Copyright (c) 2014 by The Concord Consortium, Inc. All rights reserved.
//
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

 sc_require('formula/formula_context');

// TODO: This file needs a thorough cleanup.
//  * The notion of more than one output symbol being extant is obsolete
//  * FormulaObjectContext.evaluateVariable is not being called and would break if it were

/**

  A single global instance that can find all the formula objects.

 */
DG.FormulaObjectContext = DG.FormulaContext.extend({

  /**
     Compiles a variable reference into the JavaScript code for accessing
     the appropriate value. For the base FormulaContext, this means
     binding to global constants such as 'pi' and 'e'.
     @param    {String}    iName -- The variable name to be bound
     @returns  {String}    The JavaScript code for accessing the value
     @throws   {VarReferenceError} Base class throws VarReferenceError for
                                   variable names that are not recognized.
    */
   compileVariable: function( iName) {
     var locals = this.get('locals');
     if( locals && !SC.none( locals[iName]))
       return 'c.locals.' + iName + '.evaluate(e)';
     return sc_super();
   },

   /**
     Direct evaluation of the variable without an intervening compilation.
     For the base FormulaContext, this means binding to global constants such as 'pi' and 'e'.
     @param    {String}    iName -- The variable name to be bound
     @returns  {Object}    Return value can be a Number, String, Boolean, error object, etc.
     @throws   {DG.VarReferenceError}  Throws VarReferenceError for variable
                                       names that are not recognized.
    */
   evaluateVariable: function( iName, iEvalContext) {
     var locals = this.get('locals');
     if( locals && !SC.none( locals[iName]))
       return locals[ iName].evaluateDirect( iEvalContext);
     return sc_super();
   }

});

DG.formulaObjectCoordinator = SC.Object.create(
  {
    init: function() {
      sc_super();
      this.formulaContext = DG.FormulaObjectContext.create();
    },

    /**
     * Returns the DG.FormulaObject whose output symbol (i.e. the
     * symbol being defined) matches the specified iOutputSymbol.
     * @param {String}  iOutputSymbol -- The name of the symbol being defined
     * @returns {DG.FormulaObject | null} The DG.FormulaObject (view) that matches iOutputSymbol
     */
    findFormulaObject: function( iOutputSymbol) {
      var tFormulaObjects = DG.mainPage.getComponentsOfType( DG.FormulaObject),
          tFormula = null;
      tFormulaObjects.forEach( function( iObject) {
        if( iObject.get('outputSymbol') === iOutputSymbol)
          tFormula = iObject;
      });
      return tFormula;
    },

    /**
     *  Guarantees the existence of a DG.FormulaObject which defines the symbol
     *  specified as 'iOutput' in terms of 'iInputs' and 'iDescriptions'.
     *  Callable via the 'requestFormulaObject' command of the game API.
     *  Creates a new DG.FormulaObject for 'iOutput' if one does not already exist.
     *  @param  {String}          iOutput -- The name of the symbol being defined
     *  @param  {Array of String} iInputs -- The names of the available reference symbols
     *  @param  {Array of String} iDescriptions -- Descriptions of the available reference symbols,
     *                                             corresponding one-to-one with iInputs
     *  @returns  {Boolean}  True if an appropriate DG.FormulaObject was found or created
     *  TODO: Consider a single array of Objects with 'name' and 'description' properties.
     */
    requestFormulaObject: function( iTitle, iDescription, iOutput, iInputs, iDescriptions, iAllowUserVariables) {
      var tFormulaObject = this.findFormulaObject( iOutput);
      if( SC.none( tFormulaObject)) {
        var tComponentView = DG.currDocumentController().
                                addFormulaObject( DG.mainPage.get('docView'), null,
                                                  iTitle, iDescription, iOutput, iInputs, iDescriptions,
                                                  iAllowUserVariables);
        tFormulaObject = tComponentView && tComponentView.get('contentView');
        if( tFormulaObject) {
          // We want to be notified before the FormulaObject is destroyed.
          tFormulaObject.addObserver('willDestroy', this, '_willDestroyFormulaObject');
        }
      }
      return true;
    },
    
    /**
     *  Callable via the 'updateFormulaObject' command of the game API.
     *  If there is a formula object of iOutput, the given information will be passed to it so that
     *  it can update its contents.
     *  @param  {String}          iOutput -- The name of the symbol being defined
     *  @param  {Array of String} iInputs -- The names of the available reference symbols
     *  @param  {Array of String} iDescriptions -- Descriptions of the available reference symbols,
     *                                             corresponding one-to-one with iInputs
     *  @returns  {Boolean}  True if an appropriate DG.FormulaObject was found or created
     *  Note: Consider a single array of Objects with 'name' and 'description' properties.
     */
    updateFormulaObject: function( iDescription, iOutput, iInputs, iDescriptions, iAllowUserVariables) {
      var tFormulaObject = this.findFormulaObject( iOutput);
      if( !SC.none( tFormulaObject)) {
        tFormulaObject.updateContents( iDescription, iOutput, iInputs, iDescriptions, iAllowUserVariables);
      }
      return true;
    },

    /**
     *  Evaluates the formula for the specified iOutput symbol using the specified iInputs.
     *  Callable via the 'requestFormulaValue' command of the game API.
     *  @param  {String}    iOutput -- The name of the symbol being defined
     *  @param  {Object}    iInputs -- Namespace of referenceable property:value pairs
     *  @returns  {Object | false}  On success, an object with the following properties:
     *                                tResult[iOutput] -- The result of the evaluation
     *                                tResult.formula  -- The formula used for evaluation
     *                              On failure, returns false
     *  Note: the API would be cleaner if this function always returned an Object, with
     *  tResult.success indicating success/failure, for instance.
     */
    requestFormulaValue: function( iOutput, iInputs) {
      var tResult = { error: '', formula: ''},
          tFormulaObject = this.findFormulaObject( iOutput),
          tFormula = this.getFormulaForObject( iOutput, tFormulaObject ),
          tLocals = this.getLocalsForObject( tFormulaObject );
      if( !SC.empty( tFormula)) {
        var tContext = this.get('formulaContext'),
            tLocalFormulas = {};
        DG.ObjectMap.forEach( tLocals,
                              function( iProperty, iFormulaString) {
                                tLocalFormulas[ iProperty] = DG.Formula.create({
                                                                  source: iFormulaString,
                                                                  context: tContext});
                              });
        try {
          // Evaluate the formula and store the formula and its result
          tResult[ iOutput] = this._evaluateFormula( tFormula, tLocalFormulas, iInputs);
        }
        catch(e) {
          tResult[ iOutput] = null;
          tResult.error = e;
        }
        tResult.formula = tFormula;
        
        // Whenever the game requests a value, we stash the requested formula, so
        // that it can be saved/restored with the document and preserved across
        // closing the formula object or the document.
        if( tFormulaObject)
          this.stashFormulaForObject( tFormulaObject);
        
        return tResult;
      }
      else
        return false;
    },
    
    /**
     *  Returns the formula for the specified output from either the specified
     *  iFormulaObject or from the formulas stored with the DG.GameSpec.
     *  The fallback to the formulas stored in DG.GameSpec is what allows
     *  evaluation to proceed even after the DG.FormulaObject is closed.
     *  @param  {String}            iOutput -- the name of the symbol whose formula is returned
     *  @param  {DG.FormulaObject}  iFormulaObject -- [Optional] The DG.FormulaObject whose
     *                                  formula should be returned. If null/undefined, return
     *                                  the formula for iOutput stored with the DG.GameSpec.
     *  @returns  {String}          The formula returned
     */
    getFormulaForObject: function( iOutput, iFormulaObject) {
      if( iFormulaObject)
        return iFormulaObject.get('formula');

      var gameFormulas = DG.gameSelectionController.getPath('currentGame.formulas');
      return gameFormulas && gameFormulas[iOutput];
    },
    
    /**
     *  Returns the "local variables" object defined either for the specified
     *  iFormulaObject or from the formulas stored with the DG.GameSpec.
     *  The fallback to the formulas stored in DG.GameSpec is what allows
     *  evaluation to proceed even after the DG.FormulaObject is closed.
     *  @param  {DG.FormulaObject}  iFormulaObject -- [Optional] The DG.FormulaObject whose
     *                                  locals should be returned. If null/undefined, return
     *                                  the locals stored with the DG.GameSpec.
     *  @returns  {Object}          The local variables object { "varName": DG.Formula, ... }
     */
    getLocalsForObject: function( iFormulaObject) {
      if( iFormulaObject)
        return iFormulaObject.get('locals');

      var gameFormulas = DG.gameSelectionController.getPath('currentGame.formulas');
      return gameFormulas && gameFormulas.locals;
    },

    /**
     *  Stash the formula for the specified iFormulaObject with the GameSpec.
     *  (Will be stashed with the DG.GameContext when that becomes available.)
     *  This allows the formula to outlive the FormulaObject that created it,
     *  so that it can be saved/restored with the document, for instance.
     */
    stashFormulaForObject: function( iFormulaObject) {
      if( iFormulaObject) {
        var gameSpec = DG.gameSelectionController.get('currentGame');
        if( gameSpec) {
          gameSpec.set('formulas', iFormulaObject.get('formulas'));
        }
      }
    },

    /** @private
     *  Evaluate the specified formula in the context of the properties in the specified
     *  context.
     *  @param  {String}  iFormula -- The formula to be evaluated
     *  @param  {Object}  iEvalContext -- Object whose properties are referencable by the formula.
     */
    _evaluateFormula: function( iFormula, iLocals, iEvalContext) {
      var tContext = this.get('formulaContext');
      tContext.set('locals', iLocals);
      tContext.set('eVars', iEvalContext);
      var tFormula = DG.Formula.create( {source: iFormula, context: tContext });
      return tFormula.evaluate( iEvalContext);
    },

    /** @private
     *  Called when a DG.FormulaObject is about to be destroyed.
     *  Calls stashFormulaForObject() to save the formula before it is destroyed.
     *  @param  {DG.FormulaObject}  iFormulaObject -- The DG.FormulaObject being destroyed
     */
    _willDestroyFormulaObject: function( iFormulaObject) {
      this.stashFormulaForObject( iFormulaObject);
    }
  });
