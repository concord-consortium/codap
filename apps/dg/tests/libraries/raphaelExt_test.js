/**
 * Created by jsandoe on 7/23/14.
 */
sc_require('libraries/raphael');
sc_require('libraries/raphaelExt');

module("DG.Libraries", {
  setup: function() {
  },
  teardown: function() {
  }
});

test( "Verifies addClass and removeClass", function () {
    var paper = new Raphael(10, 10, 90, 90);
    var circle = paper.circle(5, 5, 5);
    equals(circle.node.className.baseVal, '', 'before adding class');
    circle.addClass('classA');
    circle.addClass('classB');
    equals(circle.node.className.baseVal, 'classA classB', 'after adding classB');
    circle.removeClass('class');
    equals(circle.node.className.baseVal, 'classA classB', 'after removing class');
    circle.addClass('classC');
    equals(circle.node.className.baseVal, 'classA classB classC', 'after adding classC');
    circle.removeClass('classB');
    equals(circle.node.className.baseVal, 'classA classC', 'after removing classB');
    circle.removeClass('classA');
    equals(circle.node.className.baseVal, 'classC', 'after removing classA');
    circle.removeClass('classC');
    equals(circle.node.className.baseVal, '', 'after removing classC');
    circle.removeClass('classC');
    equals(circle.node.className.baseVal, '', 'after attempting to remove classC from empty');
  }

);