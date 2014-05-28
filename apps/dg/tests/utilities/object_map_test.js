// ==========================================================================
//                        DG.ObjectMap Unit Test
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

DG.T = {};

module("DG.ObjectMap", {
  
  setup: function() {
    DG.T = {};
    DG.T.empty = {};
    DG.T.letters1 = { a: "a" };
    DG.T.letters2 = { a: "a", b: "b" };
  },
  
  teardown: function() {
    DG.T = null;
  }
});

test("DG.ObjectMap.length", function() {
  equals(DG.ObjectMap.length( null), 0, "length of null object");
  equals(DG.ObjectMap.length( {}), 0, "length of empty object");
  equals(DG.ObjectMap.length( DG.T.letters1), 1, "length of letters1 object");
  equals(DG.ObjectMap.length( DG.T.letters2), 2, "length of letters2 object");
});

test("DG.ObjectMap.keys", function() {
  same(DG.ObjectMap.keys( null), [], "keys of null object");
  same(DG.ObjectMap.keys( {}), [], "keys of empty object");
  same(DG.ObjectMap.keys( DG.T.letters1), ['a'], "keys of letters1 object");
  same(DG.ObjectMap.keys( DG.T.letters2), ['a','b'], "keys of letters2 object");
});

test("DG.ObjectMap.values", function() {
  same(DG.ObjectMap.values( null), [], "keys of null object");
  same(DG.ObjectMap.values( {}), [], "keys of empty object");
  same(DG.ObjectMap.values( DG.T.letters1), ['a'], "keys of letters1 object");
  same(DG.ObjectMap.values( DG.T.letters2), ['a','b'], "keys of letters2 object");
});

test("DG.ObjectMap.copy", function() {
  var t = {};
  DG.ObjectMap.copy( t, DG.T.letters1);
  equals( DG.ObjectMap.length( t), 1, "copy the correct number of properties");
  equals( t.a, 'a', "copy the correct properties");
  equals( t.b, undefined, "don't copy additional properties");
  DG.ObjectMap.copy( t, DG.T.letters2);
  equals( DG.ObjectMap.length( t), 2, "copy the correct number of properties");
  equals( t.a, 'a', "copy the correct properties");
  equals( t.b, 'b', "copy the correct properties");
});

test("DG.ObjectMap.copySome", function() {
  var t = {};
  DG.ObjectMap.copySome( t, DG.T.letters1, function() { return true; });
  equals( DG.ObjectMap.length( t), 1, "copy the correct number of properties");
  equals( t.a, 'a', "copy the correct properties");
  equals( t.b, undefined, "don't copy additional properties");
  DG.ObjectMap.copySome( t, DG.T.letters2, function( iKey) { return iKey !== "b"; });
  equals( DG.ObjectMap.length( t), 1, "copy the correct number of properties");
  equals( t.a, 'a', "copy the correct properties");
  equals( t.b, undefined, "don't copy additional properties");
  t = {};
  DG.ObjectMap.copySome( t, DG.T.letters2, function( iKey) { return iKey !== "a"; });
  equals( DG.ObjectMap.length( t), 1, "copy the correct number of properties");
  equals( t.b, 'b', "copy the correct properties");
  equals( t.a, undefined, "don't copy additional properties");
});

test("DG.ObjectMap.firstKey", function() {
  equals(DG.ObjectMap.firstKey( null), undefined, "firstKey of null object");
  equals(DG.ObjectMap.firstKey( {}), undefined, "firstKey of empty object");
  ok(DG.ObjectMap.firstKey( DG.T.letters1) !== undefined, "firstKey of letters1 object");
  ok(DG.ObjectMap.firstKey( DG.T.letters2) !== undefined, "firstKey of letters2 object");
});

test("DG.ObjectMap.findKey", function() {
  function keyIsA( iKey, iValue) { return iKey === 'a'; }
  function valueIsA( iKey, iValue) { return iValue === 'a'; }

  equals(DG.ObjectMap.findKey( null), undefined, "findKey of null object");
  equals(DG.ObjectMap.findKey( null, 'a'), undefined, "findKey of null object");
  equals(DG.ObjectMap.findKey( {}), undefined, "findKey of empty object");
  equals(DG.ObjectMap.findKey( {}, 'a'), undefined, "findKey of empty object");
  equals(DG.ObjectMap.findKey( DG.T.letters1), undefined, "findKey of letters1 object");
  equals(DG.ObjectMap.findKey( DG.T.letters1, 'a'), 'a', "findKey of letters1 object");
  equals(DG.ObjectMap.findKey( DG.T.letters1, 'b'), undefined, "findKey of letters1 object");
  equals(DG.ObjectMap.findKey( DG.T.letters2, 'a'), 'a', "findKey of letters2 object");
  equals(DG.ObjectMap.findKey( DG.T.letters2, 'b'), 'b', "findKey of letters2 object");
  equals(DG.ObjectMap.findKey( DG.T.letters2, 'c'), undefined, "findKey of letters2 object");

  equals(DG.ObjectMap.findKey( null, keyIsA), undefined, "findKey of null object");
  equals(DG.ObjectMap.findKey( {}, keyIsA), undefined, "findKey of empty object");
  equals(DG.ObjectMap.findKey( DG.T.letters1, keyIsA), 'a', "findKey of letters1 object");
  equals(DG.ObjectMap.findKey( DG.T.letters2, keyIsA), 'a', "findKey of letters2 object");

  equals(DG.ObjectMap.findKey( null, valueIsA), undefined, "findKey of null object");
  equals(DG.ObjectMap.findKey( {}, valueIsA), undefined, "findKey of empty object");
  equals(DG.ObjectMap.findKey( DG.T.letters1, valueIsA), 'a', "findKey of letters1 object");
  equals(DG.ObjectMap.findKey( DG.T.letters2, valueIsA), 'a', "findKey of letters2 object");
});

test("DG.ObjectMap.findValue", function() {
  equals(DG.ObjectMap.findValue( null), undefined, "findKey of null object");
  equals(DG.ObjectMap.findValue( null, 'a'), undefined, "findKey of null object");
  equals(DG.ObjectMap.findValue( {}), undefined, "findKey of empty object");
  equals(DG.ObjectMap.findValue( {}, 'a'), undefined, "findKey of empty object");
  equals(DG.ObjectMap.findValue( DG.T.letters1), undefined, "findKey of letters1 object");
  equals(DG.ObjectMap.findValue( DG.T.letters1, 'a'), 'a', "findKey of letters1 object");
  equals(DG.ObjectMap.findValue( DG.T.letters1, 'b'), undefined, "findKey of letters1 object");
  equals(DG.ObjectMap.findValue( DG.T.letters2, 'a'), 'a', "findKey of letters2 object");
  equals(DG.ObjectMap.findValue( DG.T.letters2, 'b'), 'b', "findKey of letters2 object");
  equals(DG.ObjectMap.findValue( DG.T.letters2, 'c'), undefined, "findKey of letters2 object");
});

test("DG.ObjectMap.insert/remove", function() {
  var obj = {};
  DG.ObjectMap.insert( obj, 'a', 'a');
  equals(DG.ObjectMap.length( obj), 1, "length after inserting property");
  equals(DG.ObjectMap.firstKey( obj), 'a', "key/name of inserted property");
  equals(obj[ DG.ObjectMap.firstKey( obj)], 'a', "value of inserted property");
  equals(DG.ObjectMap.remove( obj, 'a'), 'a', "remove recently inserted property");
  equals(DG.ObjectMap.length( obj), 0, "length after removing property");
  equals(DG.ObjectMap.remove( obj, 'a'), undefined, "remove non-existent property");
});

