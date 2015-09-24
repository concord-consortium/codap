// ==========================================================================
//                            DG.ObjectMap
// 
//  A collection of utilities for manipulating objects as associative arrays
//  or maps.
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

DG.ObjectMap = {

  /**
    Returns the number of properties the object has.
    Returns 0 for undefined or null objects.
    
    @param {Object} iObject   The object whose properties should be counted
    @returns {Number}       The object's property count
   */
  length: function( iObject) {
    return Object.keys( iObject || {}).length;
  },

  /**
    Returns an array of strings representing the property names of the object.
    The order of the returned elements is not specified by the standard.
    Returns an empty array for undefined or null objects.
    
    @param {Object} iObject   The object whose properties names should be returned
    @returns {Array of String}  Array of property name strings
   */
  keys: function( iObject) {
    return Object.keys( iObject || {});
  },
  
  /**
    Returns an array of values representing the property values of the object.
    The order of the returned elements is not specified by the standard.
    Returns an empty array for undefined or null objects.
    
    @param {Object} iObject   The object whose properties names should be returned
    @returns {Array of values}  Array of property values
   */
  values: function( iObject) {
    var tValues = [];
    DG.ObjectMap.forEach( iObject, function( iKey, iValue) { tValues.push( iValue); } );
    return tValues;
  },
  
  /**
    Copies the properties of iSrcObject into ioDstObject. This is a shallow copy which
    overwrites any properties of ioDstObject with the corresponding properties of iSrcObject.
    Note: See SC.clone(), SC.copy(), and SC.mixin() for alternative implementations with
    different implementations than this.
    
    @param {Object} ioDstObject   The object to copy properties into
    @param {Object} iSrcObject    The object to copy properties from
   */
  copy: function( ioDstObject, iSrcObject) {
    DG.ObjectMap.forEach( iSrcObject, function( iKey, iValue) { ioDstObject[iKey] = iValue; });
  },
  
  /**
    Copies some of the properties of iSrcObject into ioDstObject. iFilterFunc determines
    which properties should be copied, returning true for those that should be copied,
    false otherwise. This is a shallow copy which overwrites any properties of ioDstObject 
    with the corresponding properties of iSrcObject.
    
    @param {Object} ioDstObject   The object to copy properties into
    @param {Object} iSrcObject    The object to copy properties from
    @param {Function} iFilterFunc(iKey,iValue)  Returns true for properties to copy
   */
  copySome: function( ioDstObject, iSrcObject, iFilterFunc) {
    DG.ObjectMap.forEach( iSrcObject,
                          function( iKey, iValue) {
                            if( iFilterFunc( iKey, iValue))
                              ioDstObject[iKey] = iValue;
                          });
  },
  
  /**
    Applies the specified function to each property of the specified object.
    The order in which the properties are visited is not specified by the standard.
    
    The function passed to forEach should have the following signature:
    
    function( iKey, iValue)
    
    @param {Object}   iObject   The object whose properties should be iterated
    @param {Function} iFunction The function to be called for each entry
   */
  forEach: function( iObject, iFunction) {
    if( !iObject) return;
    for( var tKey in iObject) {
      if( iObject.hasOwnProperty( tKey))
        iFunction( tKey, iObject[ tKey]);
    }
  },
  
  /**
    Returns the name/key of the "first" property of the specified object.
    Since the order in which the elements are visited is not specified by the standard,
    which element will be returned as the "first" element is not guaranteed.
    It is likely, however, that for a given object, every call to this function will
    return the same key. This function is useful for clients that need access to some
    element of the map, but aren't particular about which element they get.
    Returns undefined for undefined or null objects.
    
    @param {Object} iObject   The object whose properties names should be returned
    @returns {String}       Property name/key or undefined
   */
  firstKey: function( iObject) {
    return DG.ObjectMap.findKey( iObject, function( iKey, iValue) { return true; });
  },
  
  /**
    Returns the name/key of the "first" property of the specified object that matches
    the specified criterion. The match criterion can be specified as a string, in which
    case the property name is matched, or more commonly as a function, which is applied
    to the elements of the object until the function returns true for one of them,
    at which point that element's name/key is returned.
    If no matching property is found, the function returns undefined.
    The order in which properties are visited is not specified by the standard.
    
    The match function should have the signature:
    Boolean matchFunc( iKey, iValue) { ... }
    where iKey is the key/name of the property and iValue is its value.

    @param {Object}             iObject   The object whose properties names should be returned
    @param {String | Function}  iMatch String to match against the property names OR
                    Function to apply until the first match is found
    @returns {String}       Property name/key of first match or undefined
   */
  findKey: function( iObject, iMatch) {
    if( !iObject || !iMatch) return undefined;
    
    // iMatch can be a key name to match or a match function
    var tKeyName, tFunction = iMatch;
    if( SC.typeOf( iMatch) !== SC.T_FUNCTION) {
      tKeyName = String( iMatch);
      tFunction = function( iKey, iValue) {
              return iKey === tKeyName;
            };
    }
    for( var tKey in iObject) {
      if( iObject.hasOwnProperty( tKey) && tFunction( tKey, iObject[ tKey]))
        return tKey;
    }
    return undefined;
  },
  
  /**
    Returns the name/key of the "first" property of the specified object whose value
    matches the specified value. The comparison is performed with ===. For more
    elaborate comparisons, use the findKey() method with an appropriate function.
    The order in which properties are visited is not specified by the standard.
    
    @param {Object} iObject   The object whose properties names should be returned
    @param {      iValue}   Value to match against the property values
    @returns {String}       Property name/key of first match or undefined
   */
  findValue: function( iObject, iValue) {
    var tValue = iValue;
    return DG.ObjectMap.findKey( iObject, function( iKey, iValue) { return iValue === tValue; });
  },
  
  /**
    Inserts the specified key:value pair into the specified object's map/property list.
    
    @param {Object} iObject   The object whose properties names should be returned
    @param {Object} iKey    The key/name of the property to be inserted
    @param {Object} iValue    The value of the property to be inserted
   */
  insert: function( iObject, iKey, iValue) {
    iObject[ iKey] = iValue;
  },
  
  /**
    Removes the property with the specified key/name from the specified object's map/property list.
    
    @param {Object} iObject   The object whose properties names should be returned
    @param {Object} iKey    The key/name of the property to be removed
    @returns            The value of the property removed
   */
  remove: function( iObject, iKey) {
    var tValue = iKey ? iObject[ iKey] : undefined;
    delete iObject[ iKey];
    return tValue;
  },

  /**
   * Assigns each 'own' property of iObj2 to iObj1.
   *
   * @param iObj1 {*}
   * @param iObj2 {*}
   * @returns {*}
   */
  join: function( iObj1, iObj2) {
    DG.ObjectMap.forEach( iObj2, function( iKey, iValue) {
      iObj1[ iKey] = iValue;
    });
    return iObj1;
  }

};
