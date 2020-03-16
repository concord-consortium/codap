/* global React */

DG.React.ready(function () {
  var div = React.DOM.div;

  /**
   * Provides a vertical column-resizing control handle.
   * Loosely patterned after https://github.com/MonsantoCo/column-resizer.
   */
  DG.React.Components.ColumnResizeHandle = DG.React.createComponent(
    (function () {

      /**
       * props are
       *  className: {string} - className attribute applied to the dom element
       *  enabled: {boolean} - enable/disable resizing
       *  containerWidth: {number} - width of table in pixels
       *  columnWidth: {number} - width of column to resize in pixels
       *  minWidth: {number} - minimum width of column in pixels
       *  maxWidth: {number} - maximum width of column in pixels
       *  onResize(width: number): {function} - Called with updated value of width property
       */
      var resizeTouchId = null,
          deltaStart = null;

      function stop(e) {
        e.preventDefault();
        e.stopPropagation();
      }

      return {

        getInitialState: function() {
          return {
            isResizing: false,
            resizeWidth: null
          };
        },

        componentDidMount: function() {
          this.componentDidRender();
        },

        componentDidUpdate: function() {
          this.componentDidRender();
        },

        componentDidRender: function() {
          if (this.state.resizeWidth !== this.props.columnWidth)
            this.setState({ resizeWidth: this.props.columnWidth });
        },

        render: function() {
          var style = this.state.resizeWidth != null
                        ? { left: this.state.resizeWidth }
                        : null;
          return (this.props.enabled || this.state.isResizing) &&
            div({
              className: this.props.className + ' column-resize-handle dg-wants-mouse dg-wants-touch',
              onMouseDown: this.handleMouseDown,
              onTouchStart: this.handleInitialTouch,
              style: style
            },
            div({
              className: "column-resize-handle-render" +
                          (this.state.isResizing ? " is-resizing" : "")
            }));
        },

        beginResize: function(e) {
          deltaStart = e.pageX - this.state.resizeWidth;
          this.setState({ isResizing: true });
        },

        continueResize: function(e) {
          var newWidth = e.pageX - deltaStart,
              minWidth = this.props.minWidth || 20,
              maxWidth = this.props.containerWidth - minWidth;
          newWidth = Math.max(newWidth, minWidth);
          newWidth = Math.min(newWidth, maxWidth);
          deltaStart = e.pageX - newWidth;
          if (newWidth !== this.state.resizeWidth) {
            if (this.props.onResize)
              this.props.onResize(newWidth);
            else
              this.setState({ resizeWidth: newWidth });
          }
        },

        endResize: function() {
          this.setState({ isResizing: false });
        },

        handleMouseDown: function(e) {
          if (!this.props.enabled || (e.button !== 0)) return;
          this.beginResize(e);
          document.addEventListener('mousemove', this.handleMouseMove, true);
          document.addEventListener('mouseup', this.handleMouseUp, true);
          stop(e);
        },

        handleMouseMove: function(e) {
          this.continueResize(e);
          stop(e);
        },

        handleMouseUp: function(e) {
          this.endResize();
          document.removeEventListener('mousemove', this.handleMouseMove, true);
          document.removeEventListener('mouseup', this.handleMouseUp, true);
          stop(e);
        },

        handleInitialTouch: function(e) {
          if (!this.props.enabled) return;

          var touch = e.changedTouches[0];
          resizeTouchId = touch.identifier;
          this.beginResize(touch);

          // An individual 'touchstart' or 'touchmove' may be for some other touch, so we
          // don't care about the type of event, only whether the resize touch is still active.
          document.addEventListener('touchstart', this.handleSubsequentTouch, true);
          document.addEventListener('touchmove', this.handleSubsequentTouch, true);
          document.addEventListener('touchcancel', this.handleSubsequentTouch, true);
          document.addEventListener('touchend', this.handleSubsequentTouch, true);
          stop(e);
        },

        handleSubsequentTouch: function(e) {
          for (var i = 0; i < e.touches.length; ++i) {
            if (e.touches[i].identifier === resizeTouchId) {
              // resize touch is still active
              this.continueResize(e.touches[i]);
              return;
            }
          }
          // resize touch is no longer active
          this.endResize();

          document.removeEventListener('touchstart', this.handleSubsequentTouch, true);
          document.removeEventListener('touchmove', this.handleSubsequentTouch, true);
          document.removeEventListener('touchcancel', this.handleSubsequentTouch, true);
          document.removeEventListener('touchend', this.handleSubsequentTouch, true);
        }
      };
    })());
});
