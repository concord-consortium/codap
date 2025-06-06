// ==========================================================================
//                        DG.Attribute Fixtures
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

sc_require('models/attribute_model');

DG.Attribute.FIXTURES = [

  // TODO: Add your data fixtures here.
  // All fixture records must have a unique primary key (default 'guid').  See 
  // the example below.

  { guid: 1,
    name: "push",
    description: "",
    collection: 1 },
  
  { guid: 2,
    name: "startPos",
    description: "",
    collection: 1 },

  { guid: 3,
    name: "endPos",
    description: "",
    collection: 1 },

  { guid: 4,
    name: "score",
    description: "",
    collection: 1 },

  { guid: 5,
    name: "pad",
    description: "",
    collection: 1 },

  { guid: 6,
    name: "game",
    description: "",
    collection: 2 },

  { guid: 7,
    name: "total score",
    description: "",
    collection: 2 }

];
