/**
 * Created by jsandoe on 11/5/14.
 */
module("sproutcore_tests", {
  setup: function () {
  },
  teardown: function () {
  }
});
// We conclude from the following tests that we should add to arrays with the
// sproutcore pushObject rather than the native push method, and that the length
// property is preferred over the documented length method in Array Controllers.
// The length method will not report accurately.
test("test SC.ArrayController", function () {
  var ac = SC.ArrayController.create({}), ar = [1, 2, 3];
  ok(ac.get, 'has get');
  ok(!ac.get('hasContent'), 'Sets hasContent to no when no content yet.');
  equals(ac.length(),0, 'Initial length is zero.');
  ac.set('content', ar);
  ok(ac.get('hasContent'), 'Sets hasContent to yes when content is set.');
  equals(ac.get('length'), 3, 'After adding content we see the new length.');
  equals(ac.length(),3, 'After adding content we see the new length().');
  ar.push(4);
  equals(ac.get('length'), 3, 'After push to underlying array we don\'t see the new length.');
  equals(ac.length(),4, 'After push to underlying array we see the new length().');
  ar.pushObject(5);
  equals(ac.get('length'), 5, 'After pushObject to underlying array we see the new length.');
  equals(ac.length(),5, 'After pushObject to underlying array we see the new length().');
});