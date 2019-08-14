// ==========================================================================
//                            DG.GeojsonUtils
//
//  A collection of utilities for working with Geojson objects.
//
//  Author: William Finzer
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

DG.GeojsonUtils = {

  /**
   *
   * @param iBoundaryValue { {String} | {Object}}
   * @return {{Object} | null}
   */
  boundaryObjectFromBoundaryValue: function( iBoundaryValue) {
    if( typeof iBoundaryValue === 'object') {
      return iBoundaryValue;
    }
    else if((typeof iBoundaryValue === 'string') && iBoundaryValue.startsWith('{')) // Assume it's the geojson itself
    {
      var tObject;
      try{
        tObject = JSON.parse(iBoundaryValue);
      }
      catch (er) {
        console.log( er);
      }
      return {jsonBoundaryObject: tObject};
    }
    else
      return null;
  }

};

