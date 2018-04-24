/* global React */
// sc_require('react/dg-react');

DG.React.ready(function () {
  var
      // span = React.DOM.span,
      span = React.DOM.span/*,
      div = React.DOM.div*/;

  DG.React.Components.AttributeNameCell = DG.React.createComponent(
      (function () {

        /**
         * Props are
         *    content: {span}
         *    dragObject: {Object}
         *    cellLeaveCallback: { function}
         *    dropCallback: { function }
         *    editAttributeCallback: {function}
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

            function editAttributeClickHandler() {
              SC.run(function () {
                this_.dropdown.hide();
                this_.props.editAttributeCallback();
              });
            }

            handleDropIfAny();

            var tClassName = 'attr-cell ' + dragLocation(),
                tMenuItems = [
                  {
                    label: 'DG.TableController.headerMenuItems.editAttribute'.loc(),
                    disabled: false,
                    clickHandler: editAttributeClickHandler
                  },
                  {
                    label: 'DG.TableController.headerMenuItems.editFormula'.loc(),
                    disabled: false
                  },
                  {
                    label: 'DG.TableController.headerMenuItems.randomizeAttribute'.loc(),
                    disabled: false
                  },
                  /*
                                    {label: 'DG.TableController.headerMenuItems.sortAscending'.loc(),
                                      disabled: false },
                                    {label: 'DG.TableController.headerMenuItems.sortDescending'.loc(),
                                      disabled: false },
                  */
                  {
                    label: 'DG.TableController.headerMenuItems.deleteAttribute'.loc(),
                    disabled: false
                  }
                ].map(function (iItem, iIndex) {
                  return DG.React.Components.DropdownItem({
                        disabled: iItem.disabled,
                        key: 'item-' + iIndex,
                        clickHandler: iItem.clickHandler
                      },
                      iItem.label);
                }),
                tAttributeName = DG.React.Components.Dropdown({
                      ref: function (iDropdown) {
                        this.dropdown = iDropdown;
                      }.bind(this)
                    },
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
