// ==========================================================================
//                              DG.Destroyable
// 
//  A mixin designed to work with derived classes of SproutCore's SC.Object
//  to simplify the process of destroying properties that need destroying.
//  In particular, the 'autoDestroyProperties' property allows derived
//  classes to specify a set of properties that should be automatically
//  destroyed on destruction of the owning object.
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

DG.Destroyable = {

  concatenatedProperties: ['autoDestroyProperties'],

  /**
    Automatically destroys properties listed in the 'autoDestroyProperties' property.
    Called automatically from SC.Object.destroy().
   */
  destroyMixin: function() {
    var props = this.get('autoDestroyProperties');
    if( props) {
      props.forEach( function( iPropertyName) {
                        this.destroyProperty( iPropertyName);
                      }.bind( this));
    }
  },
  
  /**
    Destroy the property of this object with the specified name.
    The property is assumed to contain an object reference to an
    object which is derived from SC.Object.
    Performs the following actions for the given property:
      -- Calls the willDestroy() method if it exists
      -- Calls the destroy() method
      -- Sets the property to null to allow it to be garbage collected
          Note: If the name of the property begins with an underscore,
                it is assumed to be a private property and is nulled
                out with an explicit assignment. Otherwise, it is nulled
                out with this.set( iPropertyName, null).
    @param    {String}  iPropertyName - The name of the property to destroy
                          If it begins with an underscore, null will be assigned to it.
                          Otherwise, it will be .set() to null
   */
  destroyProperty: function destroyProperty( iPropertyName) {
    var propertyValue = this.get( iPropertyName);

    // We only deal with Object properties
    if( DG.Destroyable.destroyObject( propertyValue)) {
    
      // Set the property to null.
      // Private properties (indicated by leading underscore in name)
      // set the property directly, while public properties use set().
      if( iPropertyName.charAt( 0) === '_')
        this[ iPropertyName] = null;
      else
        this.set( iPropertyName, null);
    }
  }
  
};

/**
  Destroys the specified object, calling willDestroy() (if available) first.
  @param    {Object}    iObject -- The object to destroy
  @returns  {Boolean}   True if iObject was a destroyable object, false otherwise.
 */
DG.Destroyable.destroyObject = function( iObject) {

  // We only deal with objects
  if( iObject && (iObject instanceof SC.Object)) {
  
    // If the object has a willDestroy() method, we call it
    if( iObject.willDestroy) iObject.willDestroy();
    
    // Call the destroy method explicitly
    iObject.destroy();
    
    // Returning true indicates that iObject was a destroyable object
    return true;
  }
  
  // Returning false indicates that iObject was not a destroyable object
  return false;
};


