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

          moveDirection: '',

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

            function assignCellRef(iElement) {
              this_.cellRef = iElement;
            }

            function dragLocation() {
              if (this_.props.dragStatus && this_.props.dragStatus.event && this_.cellRef) {
                var tEvent = this_.props.dragStatus.event,
                    tX = tEvent.clientX,
                    tY = tEvent.clientY,
                    tRect = this_.cellRef.getBoundingClientRect();
                if (tX > tRect.x && tX < tRect.x + tRect.width && tY > tRect.y) {
                  if (tY < tRect.y + tRect.height / 2) {
                    this_.moveDirection = 'up';
                    return 'attr-cell-upper';
                  }
                  else if (tY < tRect.y + tRect.height) {
                    this_.moveDirection = 'down';
                    return 'attr-cell-lower';
                  }
                }
              }
              this_.moveDirection = '';
              return '';
            }

            function handleDropIfAny() {
              if( this_.props.dragStatus &&
                  this_.props.dragStatus.op === SC.DRAG_LINK &&
                  this_.props.dropCallback &&
                  this_.moveDirection !== '') {
                this_.props.dropCallback( this_.moveDirection);
              }
            }

            handleDropIfAny();
            var tClassName = 'attr-cell ' + dragLocation();

            return td({
              ref: assignCellRef,
              className: tClassName,
            }, this.props.content);
          }
        };
      })(), []);

});
