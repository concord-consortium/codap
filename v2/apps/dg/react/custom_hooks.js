sc_require('react/dg-react');
/* global React */

(function() {

  /**
   * cf. https://reactjs.org/docs/hooks-faq.html#how-to-get-the-previous-props-or-state
   * cf. https://usehooks.com/usePrevious/
   * @param {*} value 
   */
  var usePrevious = function(value) { 
    var ref = React.useRef();
    React.useEffect(function() {
      ref.current = value;
    }, [value]);
    return ref.current;
  };
  DG.React.usePrevious = usePrevious;

  /**
   * Combines useState and useRef hooks to provide a state value that can be referenced
   * from function callbacks that would otherwise close around a stale state value.
   * cf. https://blog.castiel.me/posts/2019-02-19-react-hooks-get-current-state-back-to-the-future/
   * @param {*} initialValue 
   */
  var useRefState = function(initialValue) {
    var stateArray = React.useState(initialValue),
        state = stateArray[0],
        setState = stateArray[1],
        stateRef = React.useRef(state);
    React.useEffect(function() {
      stateRef.current = state;
    }, [state]);
    return [state, stateRef, setState];
  };
  DG.React.useRefState = useRefState;

  /**
   * Calls the specified callback function on a touch/click outside the element.
   * @param {ReactReference} elementRef 
   * @param {function} callback(elt) where elt is the DOM element
   */
  var useCallbackOnOutsideEvent = function(elementRef, callback) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
  };
  DG.React.useCallbackOnOutsideEvent = useCallbackOnOutsideEvent;

  /**
   * Focuses and selects the content of the specified element on mounting the component.
   * @param {ReactReference} elementRef - the element (e.g. <input>) to focus
   */
  var useFocusSelectOnMount = function(elementRef) {
    // focus/select the contents initially
    React.useEffect(function() {
      // didMount
      setTimeout(function() {
        var elt = elementRef.current;
        elt && elt.focus();
        elt && elt.select();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
  };
  DG.React.useFocusSelectOnMount = useFocusSelectOnMount;

  /**
   * Initiates a drag by installing the relevant mouse/touch handlers.
   * @param {string} touchId
   * @param {function(MouseEvent/Touch)} onUpdateDrag
   * @param {function(MouseEvent/Touch)} onEndDrag
   */
  var useDragOnDemand = function(touchId, onUpdateDrag, onEndDrag) {

    React.useEffect(function() {
      function handleMouseMove(e) {
        onUpdateDrag(e);
        stop(e);
      }

      function handleMouseUp(e) {
        onEndDrag();
        stop(e);
      }

      function handleTouch(e) {
        for (var i = 0; i < e.touches.length; ++i) {
          if (e.touches[i].identifier === touchId) {
            // touch is still active
            onUpdateDrag(e.touches[i]);
            return;
          }
        }
        // touch is no longer active
        onEndDrag();
      }

      if (touchId) {
        // An individual 'touchstart' or 'touchmove' may be for some other touch, so we
        // don't care about the type of event, only whether the resize touch is still active.
        document.addEventListener('touchstart', handleTouch, true);
        document.addEventListener('touchmove', handleTouch, true);
        document.addEventListener('touchcancel', handleTouch, true);
        document.addEventListener('touchend', handleTouch, true);
      }
      else {
        document.addEventListener('mousemove', handleMouseMove, true);
        document.addEventListener('mouseup', handleMouseUp, true);
      }

      return function() {
        if (touchId) {
          document.removeEventListener('touchstart', handleTouch, true);
          document.removeEventListener('touchmove', handleTouch, true);
          document.removeEventListener('touchcancel', handleTouch, true);
          document.removeEventListener('touchend', handleTouch, true);
        }
        else {
          document.removeEventListener('mousemove', handleMouseMove, true);
          document.removeEventListener('mouseup', handleMouseUp, true);
        }
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [touchId]);

  };
  DG.React.useDragOnDemand = useDragOnDemand;

})();
