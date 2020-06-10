// ==========================================================================
//                      DG.GlobalsController
// 
//  The controller for all extent global variables.
//  
//  Author:   Kirk Swenson
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

/** @class

  @extends SC.Controller
*/
DG.globalsController = SC.Controller.create( (function() {
/** @scope DG.GlobalsController.prototype */ 

  return {
  
    /**
      Array of objects indicating changes that have occurred.
      @property   {Array of Object}
     */
    globalNameChanges: null,
    
    /**
      Array of strings representing the names of the changed global values.
      @property   {Array of String}
     */
    globalValueChanges: null,
    
    /**
      @private
      Maps from name to global value.
     */
    _globalsMap: {},

    /**
     * Called when a document is closed so that all global values are destroyed.
     */
    reset: function() {
      DG.ObjectMap.forEach( this._globalsMap, function( iKey, iValue){
        this.destroyGlobalValue( iValue);
      }.bind(this));
    },
  
    /**
      Utility function for determining whether the specified name is available.
      @param    {String}    iName -- The proposed name to search for
      @returns  {Boolean}   True if the name is in use, false if it is available.
     */
    isNameInUse: function( iName) {
      return !SC.none( this.getGlobalValueByName( iName));
    },

    /**
      Return the global value with the matching name.
      @param    {String}          iName -- the name of the global value to search for
      @returns  {DG.GlobalValue}  The matching global value or null if not found
     */
    getGlobalValueByName: function( iName) {
      return this._globalsMap[iName];
    },

    getGlobalValueByID: function (iID) {
      return Object.values(this._globalsMap).find(function (gv) {return gv.id === Number(iID);});
    },
  
    /**
      Return the next available global value name using the specified iPrefix (or "v").
      The name is made unique by adding a numeric suffix, so if "v" is the prefix,
      "v1", "v2", "v3", ... will be tried until a unique name is found.
      @param    {String}    (Optional) iPrefix -- The name prefix; defaults to "v".
      @returns  {String}    A unique name for use with the next global value.
     */
    getUniqueName: function( iPrefix) {
      var tCounter = 0,
          tTrialName;
      iPrefix = iPrefix || "v";
      do {
        ++ tCounter;
        tTrialName = iPrefix + tCounter;
      } while( this.isNameInUse( tTrialName));
      return tTrialName;
    },
  
    /**
      Create a global with the specified properties and name prefix.
      @param    {Object}    iProperties -- Properties passed to newly created global value
      @param    {String}    (Optional) iPrefix -- The name prefix; defaults to "v".
      @returns  {DG.GlobalValue}  The newly created global value.
     */
    createGlobalValue: function( iProperties, iPrefix) {
      iProperties = iProperties || {};
      if ( SC.empty(iProperties.document)) {
        iProperties.document = DG.activeDocument;
      }
      if( SC.empty( iProperties.name))
        iProperties.name = this.getUniqueName( iPrefix);
      if( SC.none(iProperties.value))
        iProperties.value = 0.5;
      var tGlobal = DG.GlobalValue.createGlobalValue( iProperties);
      this.registerGlobalValue( tGlobal);
      return tGlobal;
    },
    
    /**
      Destroy the specified global value.
      @param    {DG.GlobalValue}  iGlobalValue -- The global value to destroy
     */
    destroyGlobalValue: function( iGlobalValue) {
      var name = iGlobalValue && iGlobalValue.get('name');
      iGlobalValue.removeObserver('name', this, this.nameDidChange);
      iGlobalValue.removeObserver('value', this, this.valueDidChange);
      delete this._globalsMap[ name];
      DG.GlobalValue.destroyGlobalValue( iGlobalValue);
      this.set('globalNameChanges', [{ oldName: name }]);
      this.valueDidChange();
    },
    
    /**
      Register the global value by adding it to the internal name map and
      adding the necessary observers. Also notifies that 'globalNameChanges'
      have occurred.
      @param    {DG.GlobalValue}  iGlobalValue -- The global value to register
     */
    registerGlobalValue: function( iGlobalValue) {
      var name = iGlobalValue && iGlobalValue.get('name');
      if( !SC.none(name) && !this._globalsMap[name]) {
        this._globalsMap[name] = iGlobalValue;
        iGlobalValue.addObserver('name', this, this.nameDidChange);
        iGlobalValue.addObserver('value', this, this.valueDidChange);
        this.set('globalNameChanges', [{newName: name}]);
      }
    },

    /**
     * When a name changes, we need to update the _globalsMap.
     * This method observes _each_ global value's name.
     * Notifies that 'globalNameChanges' have occurred.
     * @param   {DG.GlobalValue}  iGlobal -- The notifying global value
     */
    nameDidChange: function( iGlobal) {
      var tOldName = DG.ObjectMap.findValue( this._globalsMap, iGlobal),
          tNewName = iGlobal.get('name');
      if( tOldName !== tNewName) {
        this._globalsMap[ tNewName] = iGlobal;
        DG.ObjectMap.remove( this._globalsMap, tOldName);
        this.set('globalNameChanges', [{ oldName: tOldName, newName: tNewName }]);
      }
    },

    /**
      Called when any global value changes its value.
      Notifies that 'globalValueChanges' have occurred.
     */
    valueDidChange: function( iNotifier) {
      var name = iNotifier && iNotifier.get('name'),
          changes = name ? [ name ] : [];
      this.set('globalValueChanges', changes);
    },
    
    stopAnimation: function() {
      DG.ObjectMap.forEach( this._globalsMap,
                            function( iKey, iValue) {
                              if( iValue && iValue.stopAnimation)
                                iValue.stopAnimation();
                            } );
    },
    
    /**
      Returns an array of global variable names in use.
      @returns    {Array of String} The names of the current set of global values
     */
    getGlobalValueNames: function() {
      return DG.ObjectMap.keys( this._globalsMap);
    },
    
    /**
      A namespace is an object which contains name:value pairs for
      every global value. These can be used with the 'with' statement
      to simplify variable references.
      @param    {Object}    ioNamespace -- The object to which the name:value
                                            pairs should be added.
     */
    addGlobalValuesToNamespace: function( ioNamespace) {
      DG.ObjectMap.forEach( this._globalsMap,
                            function( iKey, iValue) {
                              ioNamespace[ iKey] = iValue.get('value');
                            } );
    }

  }; // return from function closure
}())); // function closure
