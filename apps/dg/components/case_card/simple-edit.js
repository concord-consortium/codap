sc_require('react/dg-react');
sc_require('react/custom_hooks');
/* global createReactFC, PropTypes, React, ReactDOMFactories */

DG.React.ready(function () {
  var useCallbackOnOutsideEvent = DG.React.useCallbackOnOutsideEvent,
      useFocusSelectOnMount = DG.React.useFocusSelectOnMount,
      input = ReactDOMFactories.input;

  /**
   * This uncontrolled component (https://reactjs.org/docs/uncontrolled-components.html)
   * wraps a regular <input> element to provide a simple reusable editing component.
   */
  var config = {
    displayName: "SimpleEdit",
    propTypes: {
      // className attribute applied to the input element
      className: PropTypes.string,
      // initial value of edit
      value: PropTypes.string,
      // onCompleteEdit(value?: string)
      // Called with final value at completion of edit;
      //  `undefined` => canceled/completed with no change.
      onCompleteEdit: PropTypes.func.isRequired
    }
  };
  function SimpleEdit(props) {
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
      defaultValue: props.value || "",
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
  }
  // two-stage definition required for React-specific eslint rules
  DG.React.SimpleEdit = createReactFC(config, SimpleEdit);
});
