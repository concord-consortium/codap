// ==========================================================================
//                      DG.ArchiveUtils Unit Test
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

DG.T = {
  storage: {}
};

DG.Linkable = SC.Object.extend({
  toLink: function() {
    return { type: 'DG.Linkable', id: this.id };
  }
});

module("DG.ArchiveUtils", {
  
  setup: function() {
    DG.T = {};
  },
  
  teardown: function() {
    DG.T = null;
  }
});

test("DG.ArchiveUtils.test", function() {
  var storage = {};
  equals(DG.ArchiveUtils.getLinkCount( null), 0, "length of null object");
  equals(DG.ArchiveUtils.getLinkCount( {}), 0, "length of empty object");
  DG.ArchiveUtils.addLinkID( storage, 'key1', 'DG.Linkable', 1);
  equals(DG.ArchiveUtils.getLinkCount( storage), 1, "length of storage object");
  equals(DG.ArchiveUtils.getLinkCount( storage, 'key1'), 1, "length of 'key1' entry");
  equals(DG.ArchiveUtils.getLinkID( storage, 'key1'), 1, "ID for key1 link");
  DG.ArchiveUtils.addLinkID( storage, 'key2', 'DG.Linkable', 2);
  equals(DG.ArchiveUtils.getLinkCount( storage), 2, "length of storage object");
  equals(DG.ArchiveUtils.getLinkCount( storage, 'key2'), 1, "length of 'key2' entry");
  equals(DG.ArchiveUtils.getLinkID( storage, 'key2'), 2, "ID for key2 link");
  DG.ArchiveUtils.addLinkID( storage, 'key2', 'DG.Linkable', 3);
  equals(DG.ArchiveUtils.getLinkCount( storage, 'key2'), 2, "length of 'key2' entry");
  equals(DG.ArchiveUtils.getLinkID( storage, 'key2'), 2, "ID for key2 link 0");
  equals(DG.ArchiveUtils.getLinkID( storage, 'key2', 0), 2, "ID for key2 link 0");
  equals(DG.ArchiveUtils.getLinkID( storage, 'key2', 1), 3, "ID for key2 link 1");
  DG.ArchiveUtils.addLink( storage, 'key1', DG.Linkable.create({ id: 4 }));
  equals(DG.ArchiveUtils.getLinkCount( storage), 2, "length of storage object");
  equals(DG.ArchiveUtils.getLinkCount( storage, 'key1'), 2, "length of 'key1' entry");
  equals(DG.ArchiveUtils.getLinkID( storage, 'key1'), 1, "ID for key1 link 0");
  equals(DG.ArchiveUtils.getLinkID( storage, 'key1', 0), 1, "ID for key1 link 0");
  equals(DG.ArchiveUtils.getLinkID( storage, 'key1', 1), 4, "ID for key1 link 1");
});

