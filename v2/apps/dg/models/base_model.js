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
/**
 * Created by jsandoe on 10/29/14.
 */
/** @class
 *
 * The base class for "managed objects".
 * Here, "managed objects" means they are model layer objects that are registered
 * with the ModelStore and are a constituent part of CODAP document. Their state
 * is captured entirely by a document save operation and they can be restored
 * entirely by a document restore operation.
 *
 * @extends SC.Object
 */
DG.BaseModel = SC.Object.extend(
  /** @scope DG.BaseModel.prototype */ {
    recordType: function() {
      // Record type should be the constructor function
      return this.constructor;
    }.property().cacheable(),

    recordTypeString: function() {
      return this.toString().replace(/:.*/, '');
    }.property().cacheable(),

    init: function () {
      sc_super();
      // DG.store can be missing in test scenario
      if (!SC.empty(DG.store)) {
        DG.store.register(this.recordType(), this);
      }
      this.verify();
    },

    destroy: function () {
      DG.store.deregister(this.id);
      sc_super();
    },

    /*
       Provide an abstract reference to this object.
     */
    toLink: function() {
      var recordTypeString = this.get('recordTypeString');
      return { type: recordTypeString, id: this.get('id') };
    },
    /**
     Update any properties that need to be updated pre-archive, e.g. layout.

     In general when overriding, call sc_super(), and then do your own thing.

     @function
     */
    willSaveRecord: function() {
    },

    /**
     Restore any properties that need to be updated post-archive, e.g. layout.

     */
    didLoadRecord: function() {
    },

    /*
     * Allows for verification of the initial construction of an object.
     * Verifiers should log to the console, in the case of missing mandatory
     * properties or inconsistencies.
     */
    verify: function () { }
  });
