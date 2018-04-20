/* global React */
// sc_require('react/dg-react');

DG.React.ready(function () {
  var
      // span = React.DOM.span,
      span = React.DOM.span,
      div = React.DOM.div;

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
              dragInsideMe: false,
              showPopup: false
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
              if (this_.props.dragStatus &&
                  this_.props.dragStatus.op === SC.DRAG_LINK &&
                  this_.props.dropCallback &&
                  this_.moveDirection !== '') {
                this_.props.dropCallback(this_.moveDirection);
              }
            }

            handleDropIfAny();
            var tClassName = 'attr-cell ' + dragLocation(),
                tMenuItems = [
                  'DG.TableController.headerMenuItems.editAttribute'.loc(),
                  'DG.TableController.headerMenuItems.editFormula'.loc(),
                  'DG.TableController.headerMenuItems.randomizeAttribute'.loc(),
                  'DG.TableController.headerMenuItems.sortAscending'.loc(),
                  'DG.TableController.headerMenuItems.sortDescending'.loc(),
                  'DG.TableController.headerMenuItems.deleteAttribute'.loc()
                ].map(function (iItem) {
                  return div({className: 'react-data-card-attribute-menu'}, iItem);
                }),
                tAttributeName = DG.React.Components.Dropdown({},
                    DG.React.Components.DropdownTrigger({},
                        span({
                          ref: assignCellRef,
                          className: tClassName
                        }, this.props.content)),
                    DG.React.Components.DropdownContent({}, tMenuItems));

            return tAttributeName;
          }
        };
      })(), []);

});
