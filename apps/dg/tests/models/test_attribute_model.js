// ==========================================================================
//                        DG.Attribute Unit Test
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

module('DG.Attribute', {
  setup: function() {
    DG.Document.createDocument();
  },
  teardown: function() {
    DG.activeDocument = null;
    DG.store = DG.ModelStore.create();
  }
});

test('test DG.Attribute', function() {
  var tContext = DG.activeDocument.createContext({}),
    tCollectionRecord = tContext.createCollection({
      name: 'Collection',
      description: 'A collection',
      context: tContext
    }),
    tCollectionModel = DG.Collection.create({
      collectionRecord: tCollectionRecord}),
    tAttr = tCollectionModel.createAttribute({ name: 'noFormula' }),
    tFormAttr = tCollectionModel.createAttribute({ name: 'yesFormula', formula: '42' }),
    tID,
    tAnother;

  // creation
  ok(tAttr && tFormAttr, 'Can create attributes.');
  ok(!SC.empty(tAttr.id) && !SC.empty(tFormAttr.id), 'Attributes have IDs.');

  // access
  ok(tCollectionRecord.getAttributeByName('noFormula'), 'Attributes should be gettable from CollectionRecord.');

  tID = tAttr.id;
  tAnother = DG.Attribute.getAttributeByID(tID);
  equals(tAnother, tAttr, 'Can get attribute by DG.Attribute.getAttributeByID.');

  // features
  equals( tAttr.hasFormula(), false, 'Empty attribute has no formula.');
  equals( tFormAttr.hasFormula(), true, 'Formula attribute has a formula.');

  equals( tFormAttr.evalFormula(), 42, 'Simple formulae with no namespace evaluate correctly.');
  tFormAttr.set('formula', 'sqrt(49)');
  equals( tFormAttr.evalFormula(), 7, 'Simple formulae with functions evaluate correctly.');
  tFormAttr.set('formula', 'foo');
  ok( isNaN( tFormAttr.evalFormula()), 'Formulas with unrecognized name reference evaluate to NaN.');

  // deletion
  DG.Attribute.destroyAttribute(tAttr);
  ok(SC.empty(DG.Attribute.getAttributeByID(tID)), "After deletion, attr is inaccessible through DG.Attribute.getAttributeByID");
  ok(SC.empty(DG.store.find('DG.Attribute', tID)), "After deletion, attr is inaccessible through DG.store.find");
});

