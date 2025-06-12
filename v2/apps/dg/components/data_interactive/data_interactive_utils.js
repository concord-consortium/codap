// ==========================================================================
//                          DG.DataInteractiveUtils
//
//  A collection of utilities for working with Data Interactives (plugins).
//
//  Copyright (c) 2017 by The Concord Consortium, Inc. All rights reserved.
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

DG.DataInteractiveUtils = {

  /**
   * Returns an archivable object containing properties for the specified attribute
   * @param iAttribute {DG.Attribute}
   * @return {Object}
   */
  getAttributeProperties: function(iAttribute, iProps) {
    var props = Object.assign({}, iAttribute && iAttribute.toArchive(), iProps);
    // clients expect 'id' rather than 'guid'
    if (iAttribute && iAttribute.get('id'))
      props.id = iAttribute.get('id');
    return props;
  },

  /**
   * Returns an array of archivable objects containing properties for the specified attributes
   * @param iAttributes {[DG.Attribute]}
   * @param iRequestSpecs {[Object]}
   * @return {Object}
   */
  mapAttributeProperties: function(iAttributes, iRequestSpecs) {
    return iAttributes && iAttributes.map(function(attr, index) {
            // append 'clientName' to returned properties
            var spec = iRequestSpecs && iRequestSpecs[index],
                clientName = spec && spec.clientName,
                addProps = clientName ? { clientName: clientName } : null;
            return DG.DataInteractiveUtils.getAttributeProperties(attr, addProps);
          });
  }

};

