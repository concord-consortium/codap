sc_require('react/dg-react');
/* global React */

/**
 * Calls the specified callback function on a touch/click outside the element.
 * @param {ReactReference} elementRef 
 * @param {function} callback(elt) where elt is the DOM element
 */
DG.React.useCallbackOnOutsideEvent = function(elementRef, callback) {
  React.useEffect(function() {
    function onWindowClick(evt) {
      var elt = elementRef.current;
      if (elt && (evt.target !== elt) && !elt.contains(evt.target)) {
        callback(elt);
      }
    }

    // didMount
    window.addEventListener("touchstart", onWindowClick, true);
    window.addEventListener("mousedown", onWindowClick, true);

    // willUnmount
    return function() {
      window.removeEventListener("touchstart", onWindowClick, true);
      window.removeEventListener("mousedown", onWindowClick, true);
    };
  }, []); // !didUpdate
};

/**
 * Focuses and selects the content of the specified element on mounting the component.
 * @param {ReactReference} elementRef - the element (e.g. <input>) to focus
 */
DG.React.useFocusSelectOnMount = function(elementRef) {
  // focus/select the contents initially
  React.useEffect(function() {
    // didMount
    setTimeout(function() {
      var elt = elementRef.current;
      elt && elt.focus();
      elt && elt.select();
    });
  }, []); // !didUpdate
};
