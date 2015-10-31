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
    tCollectionModel = tContext.createCollection({
      name: 'Collection',
      description: 'A collection',
      context: tContext
    }),
    tAttr = tCollectionModel.createAttribute({
      name: 'noFormula',
      precision: 5,
      description: 'a no formula attribute',
      editable: true
    }),
    tFormAttr = tCollectionModel.createAttribute({ name: 'yesFormula', formula: '42' }),
    tID,
    tAnother;

  // creation
  ok(tAttr && tFormAttr, 'Can create attributes.');
  ok(!SC.empty(tAttr.id) && !SC.empty(tFormAttr.id), 'Attributes have IDs.');

  // access
  ok(tCollectionModel.getAttributeByName('noFormula'), 'Attributes should be gettable from CollectionRecord.');

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

test('test DG.Attribute formulas', function() {
  var tContext = DG.activeDocument.createContext({}),
    tParentCollectionModel = tContext.createCollection({
      name: 'Parent',
      description: 'A collection',
      context: tContext
    }),
    tChildCollectionModel = tContext.createCollection({
      name: 'Child',
      description: 'A collection',
      parent: tParentCollectionModel,
      context: tContext
    }),
    formulaAttrSpecs = [
      {collection: tParentCollectionModel, name: 'ppCopy', formula: 'parentStr', expect: 'parent'},
      {collection: tParentCollectionModel, name: 'ppCaseIndex', formula: 'caseIndex', expect: 2},
      {collection: tParentCollectionModel, name: 'ppAbs', formula: 'abs(parentNum)', expect: 4},
      {collection: tParentCollectionModel, name: 'ppAcos', formula: 'acos(pi/parentNum)', expect: Math.acos(Math.PI/4)},
      {collection: tParentCollectionModel, name: 'ppAsin', formula: 'asin(pi/parentNum)', expect: Math.asin(Math.PI/4)},
      {collection: tParentCollectionModel, name: 'ppAtan', formula: 'atan(pi/parentNum)', expect: Math.atan(Math.PI/4)},
      {collection: tParentCollectionModel, name: 'ppBoolean', formula: 'boolean(parentNum)', expect: true},
      {collection: tParentCollectionModel, name: 'ppCeil', formula: 'ceil(parentNum/3)', expect: 2},
      {collection: tParentCollectionModel, name: 'ppExp', formula: 'exp(parentNum)', expect: Math.exp(4)},
      {collection: tParentCollectionModel, name: 'ppFloor', formula: 'floor(parentNum/3)', expect: 1},
      {collection: tParentCollectionModel, name: 'ppFrac', formula: 'frac(parentNum/3)', expect: 4/3 - 1},
      {collection: tParentCollectionModel, name: 'ppLn', formula: 'ln(parentNum)', expect: Math.log(4)},
      {collection: tParentCollectionModel, name: 'ppLog', formula: 'round(log(parentNum), 8)', expect: Math.round(Math.log10(4)*Math.pow(10,8))/Math.pow(10,8)},
//      {collection: tParentCollectionModel, name: 'ppMax', formula: 'max(parentNum,3)', expect: 4},
//      {collection: tParentCollectionModel, name: 'ppMin', formula: 'min(parentNum,3)', expect: 3},
      {collection: tParentCollectionModel, name: 'pcMax', formula: 'max(childNum)', expect: 11},
      {collection: tParentCollectionModel, name: 'pcMin', formula: 'min(childNum)', expect: 9},
      {collection: tParentCollectionModel, name: 'ppNumber', formula: 'number(1)', expect: 1},
      {collection: tParentCollectionModel, name: 'ppPow', formula: 'pow(parentNum,2)', expect: 16},
      {collection: tParentCollectionModel, name: 'ppRound', formula: 'round(parentNum/3)', expect: 1},
      {collection: tParentCollectionModel, name: 'ppSin', formula: 'sin(parentNum)', expect: Math.sin(4)},
      {collection: tParentCollectionModel, name: 'ppSqrt', formula: 'sqrt(parentNum)', expect: 2},
      {collection: tParentCollectionModel, name: 'ppString', formula: 'parentStr + string(parentNum)', expect: 'parent4'},
      {collection: tParentCollectionModel, name: 'ppTan', formula: 'tan(parentNum)', expect: Math.tan(4)},
      {collection: tParentCollectionModel, name: 'ppTrunc', formula: 'trunc(parentNum/5)', expect: 0},
      {collection: tParentCollectionModel, name: 'pcCount', formula: 'count(childNum)', expect: 3},
      {collection: tParentCollectionModel, name: 'pcCountExpr', formula: 'count(childNum>=10)', expect: 2},
      {collection: tParentCollectionModel, name: 'pcMean', formula: 'mean(childNum)', expect: 10},
      {collection: tParentCollectionModel, name: 'pcMedian', formula: 'median(childNum)', expect: 10},
      {collection: tParentCollectionModel, name: 'pcSum', formula: 'sum(childNum)', expect: 30},
      {collection: tParentCollectionModel, name: 'pcFirst', formula: 'first(childNum)', expect: 9},
      {collection: tParentCollectionModel, name: 'pcLast', formula: 'last(childStr)', expect: 'child11'},
      {collection: tParentCollectionModel, name: 'ppPrev', formula: 'prev(parentNum)', expect: 3},
      {collection: tParentCollectionModel, name: 'ppNext', formula: 'next(parentNum)', expect: 5},

      {collection: tChildCollectionModel, name: 'ccCopy', formula: 'childStr', expect: 'child'},
      {collection: tChildCollectionModel, name: 'ccSqrt', formula: 'sqrt(childNum)', expect: 3},
      {collection: tChildCollectionModel, name: 'ccCaseIndex', formula: 'caseIndex', expect: 1},
      {collection: tChildCollectionModel, name: 'cpCopy', formula: 'parentStr', expect: 'parent'},
      {collection: tChildCollectionModel, name: 'cpSqrt', formula: 'sqrt(parentNum)', expect: 2},
      {collection: tChildCollectionModel, name: 'cpLog', formula: 'round(log(parentNum), 8)', expect: Math.round(Math.log10(4)*Math.pow(10,8))/Math.pow(10,8)},
      {collection: tChildCollectionModel, name: 'ccFirst', formula: 'first(childNum)', expect: 9},
      {collection: tChildCollectionModel, name: 'ccLast', formula: 'last(childStr)', expect: 'child11'},
      {collection: tChildCollectionModel, name: 'ccPrev', formula: 'prev(childNum,8)', expect: 8},
      {collection: tChildCollectionModel, name: 'ccNext', formula: 'next(childStr,child12)', expect: 'child10'},
    ],
    parentCase,
    childCase;

  // create some source attributes
  tParentCollectionModel.createAttribute({ name: 'parentNum'});
  tParentCollectionModel.createAttribute({ name: 'parentStr'});
  tChildCollectionModel.createAttribute({ name: 'childNum'});
  tChildCollectionModel.createAttribute({ name: 'childStr'});
  // create a couple of cases
  tParentCollectionModel.createCase({values: {parentNum: 3, parentStr: 'parent3'}});
  parentCase = tParentCollectionModel.createCase({values: {parentNum: 4, parentStr: 'parent'}});
  tParentCollectionModel.createCase({values: {parentNum: 5, parentStr: 'parent4'}});

  childCase = tChildCollectionModel.createCase({values: {childNum: 9, childStr: 'child'}, parent: parentCase});
  tChildCollectionModel.createCase({values: {childNum: 10, childStr: 'child10'}, parent: parentCase});
  tChildCollectionModel.createCase({values: {childNum: 11, childStr: 'child11'}, parent: parentCase});

  formulaAttrSpecs.forEach(function (spec) {
    spec.attr = spec.collection.createAttribute({name: spec.name, formula: spec.formula});
  });

  formulaAttrSpecs.forEach(function (spec) {
    var value = spec.attr.evalFormula(spec.collection === tParentCollectionModel?
        parentCase: childCase);
    equals(value, spec.expect, "Formula: " + spec.formula);
  });
});