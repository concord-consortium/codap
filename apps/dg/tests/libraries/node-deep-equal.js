/*
 * Based on substack's (James Halliday's) node-deep-equal library
 * Simplified the isArguments() and objectKeys() shims (dropped support for older browsers)
 * and default to strict equality comparison (opts = { strict: true }).
 * https://github.com/substack/node-deep-equal
 * License: MIT (https://github.com/substack/node-deep-equal/blob/master/LICENSE)
 */

console.log("nodeDeepEqual Unit Test!");

/* global nodeDeepEqual, isArguments, objectKeys */
sc_require('libraries/node-deep-equal');

var equal = nodeDeepEqual,
    t = {
            ok: function(arg) { return ok(arg); },
            notOk: function(arg) { return ok(!(arg)); },
            deepEqual: function(a, b) { return same(a, b); },
            end: function() {}
        };

/* eslint semi: "off" */
/* jshint asi: true */

module("DG.Libraries", {
  setup: function() {
  },
  teardown: function() {
  }
});

test('equal', function () {
    t.ok(equal(
        { a : [ 2, 3 ], b : [ 4 ] },
        { a : [ 2, 3 ], b : [ 4 ] }
    ));
    t.end();
});

test('not equal', function () {
    t.notOk(equal(
        { x : 5, y : [6] },
        { x : 5, y : 6 }
    ));
    t.end();
});

test('nested nulls', function () {
    t.ok(equal([ null, null, null ], [ null, null, null ]));
    t.end();
});

test('strict equal', function () {
    t.notOk(equal(
        [ { a: 3 }, { b: 4 } ],
        [ { a: '3' }, { b: '4' } ],
        { strict: true }
    ));
    t.end();
});

test('non-objects', function () {
    t.ok(equal(3, 3));
    t.ok(equal('beep', 'beep'));
    t.ok(equal('3', 3, { strict: false }));
    t.notOk(equal('3', 3, { strict: true }));
    t.notOk(equal('3', [3]));
    t.end();
});

test('arguments class', function () {
    t.ok(equal(
        (function(){return arguments})(1,2,3),
        (function(){return arguments})(1,2,3),
        "compares arguments"
    ));
    t.notOk(equal(
        (function(){return arguments})(1,2,3),
        [1,2,3],
        "differenciates array and arguments"
    ));
    t.end();
});

test('test the arguments shim', function () {
    t.ok(isArguments((function(){return arguments})()));
    t.notOk(isArguments([1,2,3]));
    t.end();
});

test('test the keys shim', function () {
    t.deepEqual(objectKeys({ a: 1, b : 2 }), [ 'a', 'b' ]);
    t.end();
});

test('dates', function () {
    var d0 = new Date(1387585278000);
    var d1 = new Date('Fri Dec 20 2013 16:21:18 GMT-0800 (PST)');
    t.ok(equal(d0, d1));
    t.end();
});

// test('buffers', function () {
//     t.ok(equal(Buffer('xyz'), Buffer('xyz')));
//     t.end();
// });

test('booleans and arrays', function () {
    t.notOk(equal(true, []));
    t.end();
})

test('null == undefined', function () {
    t.ok(equal(null, undefined, { strict: false }))
    t.notOk(equal(null, undefined, { strict: true }))
    t.end()
})
