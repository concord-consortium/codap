/* global React */
// sc_require('react/dg-react');

DG.React.ready(function () {
  var
      // span = React.DOM.span,
      td = React.DOM.td;

  DG.React.Components.AttributeNameCell = DG.React.createComponent(
      (function () {

        /**
         * Props are
         *    content: {span}
         *    dragObject: {Object}
         *    cellLeaveCallback: { function}
         */

        return {

          getInitialState: function () {
            return {
              dragInsideMe: false
            };
          },

          componentDidMount: function () {
          },

          componentWillUnmount: function () {
          },

          componentWillReceiveProps: function (iNewProps) {
            if (!iNewProps.dragObject)
              this.setState({dragInsideMe: false});
          },

          render: function () {
            var this_ = this;

            function handleCellMouseEnter(iEvent) {
              if (this_.props.dragObject) {
                this_.setState({dragInsideMe: true});
              }
              console.log('cellEnter');
            }

            function handleCellLeave(iEvent) {
              if (this_.state.dragInsideMe) {
                // console.log('cellLeave');
                this_.setState({dragInsideMe: false});
              }
              if (this_.props.cellLeaveCallback)
                this_.props.cellLeaveCallback(iEvent);
            }

            return td({
              className: this.state.dragInsideMe ? 'attr-cell-upper' : '',
              onMouseLeave: handleCellLeave,
              onMouseEnter: handleCellMouseEnter
            }, this.props.content);
          }
        };
      })(), []);

});
