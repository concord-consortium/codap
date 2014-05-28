// ==========================================================================
//                          DG.Case Fixtures
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

sc_require('models/case_model');

DG.Case.FIXTURES = [

  // TODO: Add your data fixtures here.
  // All fixture records must have a unique primary key (default 'guid').  See 
  // the example below.

  { guid: 1,
    collection: 1,
    stringData: "{1:50,2:15,3:260,4:50,5:'Three'}"
//    data: SC.Object.create({1:1, 2:4})
  },

  { guid: 2,
    collection: 1,
    stringData: "{1:37,2:15,3:196.25,4:60,5:'Two'}"
//    data: SC.Object.create({1:2, 2:5})
  },

  { guid: 3,
    collection: 1,
    stringData: "{1:74,2:15,3:377.6,4:0,5:''}"
//    data: SC.Object.create({1:3, 2:6})
  },

  { guid: 4,
    collection: 1,
    stringData: "{1:33,2:15,3:176.7,4:0,5:'Two'}"
//    data: SC.Object.create({3:3,4:6})
  },

  { guid: 5,
    collection: 1,
    stringData: "{1:19,2:15,3:108.1,4:30,5:'One'}"
//    data: SC.Object.create({3:4,4:7})
  },

  { guid: 6,
    collection: 2,
    stringData: "{1:1,2:140}"
//    data: SC.Object.create({3:5,4:8})
  }

];
