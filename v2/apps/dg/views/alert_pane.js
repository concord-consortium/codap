// ==========================================================================
//                            DG.AlertPane
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

  Alert utilities for the DG application.

  @extends SC.AlertPane
*/
DG.AlertPane =
/** @scope DG.AlertPane.prototype */ {

  processArgs: function( iArgs) {

    // Localize any localizable arguments
    if( iArgs.localize) {
      if( !SC.empty( iArgs.message))
        iArgs.message = SC.String.loc( iArgs.message);
      if( !SC.empty( iArgs.description))
        iArgs.description = SC.String.loc( iArgs.description);
      if( !SC.empty( iArgs.caption))
        iArgs.caption = SC.String.loc( iArgs.caption);
      // We don't want SC.AlertPane doing any additional localization
      iArgs.localize = false;
    }
    return iArgs;
  },

  show: function( iArgs) {
    SC.AlertPane.show( DG.AlertPane.processArgs( iArgs));
  },
  
  warn: function( iArgs) {
    SC.run( function() {
      SC.AlertPane.warn( DG.AlertPane.processArgs( iArgs));
    });
  },
  
  info: function( iArgs) {
    SC.AlertPane.info( DG.AlertPane.processArgs( iArgs));
  },
  
  error: function( iArgs) {
    SC.AlertPane.error( DG.AlertPane.processArgs( iArgs));
  },
  
  plain: function( iArgs) {
    SC.AlertPane.plain( DG.AlertPane.processArgs( iArgs));
  }
  
};

