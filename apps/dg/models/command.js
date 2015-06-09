// ==========================================================================
//                      DG.Command
//
//  A template for objects being passed to DG.UndoHistory.
//
//  DG.UndoHistory doesn't require commands to be an instance of this class
//  or a subclass, but whatever object you pass in should implement the same
//  fields and methods as this class.
//
//  Author:   Aaron Unger
//
//  Copyright (c) 2015 by The Concord Consortium, Inc. All rights reserved.
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
  A prototype for the commands to be passed into DG.UndoHistory.
  Note: As long as an object conforms to this API, the DG.UndoHistory doesn't technically care if it's an
  instance of DG.Command or not.
  @extends SC.Object
*/
DG.Command = SC.Object.extend((function() {
  return {

    // Metadata to define
    name: null,
    undoString: null,
    redoString: null,

    isUndoable: true,

    // Functions to override
    execute: function() {},
    undo: function() {},
    redo: function() {
      this.execute();
    }

  }; // return from function closure
})()); // function closure
