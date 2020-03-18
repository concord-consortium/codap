sc_require('react/dg-react');
sc_require('react/custom_hooks');
/* global createReactFactory, React, ReactDOMFactories */

DG.React.ready(function () {
  var useCallbackOnOutsideEvent = DG.React.useCallbackOnOutsideEvent,
      useFocusSelectOnMount = DG.React.useFocusSelectOnMount,
      input = ReactDOMFactories.input;

  /**
   * This uncontrolled component (https://reactjs.org/docs/uncontrolled-components.html)
   * wraps a regular <input> element to provide a simple reusable editing component.
   * 
   * props are
   *    className: {string} - className attribute applied to the input element
   *    value: {string} - initial value of edit
   *    onCompleteEdit(value?: string): {function} - Called with final value at completion of edit;
   *                                                 `undefined` => canceled/completed with no change.
   */
  DG.React.SimpleEdit = createReactFactory(function(props) {

    // reference to <input> DOM element
    var inputRef = React.useRef();

    // complete the edit on outside touches/clicks
    useCallbackOnOutsideEvent(inputRef, function(elt) { elt.blur(); });

    // focus/select the contents initially
    useFocusSelectOnMount(inputRef);

    function cancelEdit() {
      props.onCompleteEdit();
    }

    function completeEdit(value) {
      props.onCompleteEdit(value !== props.value ? value : undefined);
    }

    return input({
      className: props.className + ' dg-wants-mouse dg-wants-touch',
      type: 'text',
      ref: inputRef,
      defaultValue: props.value,
      onKeyDown: function (evt) {
        var handled = true;
        switch (evt.keyCode) {
          case 27:
            cancelEdit();
            break;
          case 13:
            completeEdit(evt.target.value);
            break;
          default:
            handled = false;
            break;
        }
        if (handled) {
          evt.preventDefault();
          evt.stopPropagation();
        }
      },
      onBlur: function(evt) {
        completeEdit(evt.target.value);
      }
    });
  });
});
