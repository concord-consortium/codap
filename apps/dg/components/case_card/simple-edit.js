/* global ReactDOMFactories */

DG.React.ready(function () {
  var input = ReactDOMFactories.input;

  /**
   * This uncontrolled component (https://reactjs.org/docs/uncontrolled-components.html)
   * wraps a regular <input> element to provide a simple reusable editing component.
   */
  DG.React.Components.SimpleEdit = DG.React.createComponent(
    (function () {

      /**
       * props are
       *    className: {string} - className attribute applied to the input element
       *    value: {string} - initial value of edit
       *    onCompleteEdit(value?: string): {function} - Called with final value at completion of edit;
       *                                                 `undefined` => canceled/completed with no change.
       */
      var inputElt = null;

      function onWindowClick(evt) {
        if (evt.target !== inputElt && !inputElt.contains(evt.target)) {
          inputElt.blur();
        }
      }

      return {

        componentDidMount: function() {
          window.addEventListener("touchstart", onWindowClick, true);
          window.addEventListener("mousedown", onWindowClick, true);
          setTimeout(function() {
            inputElt.focus();
            inputElt.select();
          });
        },

        componentWillUnmount: function() {
          window.removeEventListener("touchstart", onWindowClick, true);
          window.removeEventListener("mousedown", onWindowClick, true);
        },

        cancelEdit: function() {
          this.props.onCompleteEdit();
        },

        completeEdit: function(value) {
          var result = value !== this.props.value
                        ? value
                        : undefined;
          this.props.onCompleteEdit(result);
        },

        render: function() {
          return input({
            className: this.props.className + ' dg-wants-mouse dg-wants-touch',
            type: 'text',
            ref: function(elt) {
              inputElt = elt;
            },
            defaultValue: this.props.value,
            onKeyDown: function (evt) {
              var handled = true;
              switch (evt.keyCode) {
                case 27:
                  this.cancelEdit();
                  break;
                case 13:
                  this.completeEdit(evt.target.value);
                  break;
                default:
                  handled = false;
                  break;
              }
              if (handled) {
                evt.preventDefault();
                evt.stopPropagation();
              }
            }.bind(this),
            onBlur: function(evt) {
              this.completeEdit(evt.target.value);
            }.bind(this)
          });
        }
      };
    })());
});
