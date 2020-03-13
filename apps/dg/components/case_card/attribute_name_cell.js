// sc_require('react/dg-react');
/* global React */

DG.React.ready(function () {
  var
      img = React.DOM.img,
      div = React.DOM.div,
      td = React.DOM.td;

  DG.React.Components.AttributeNameCell = DG.React.createComponent(
      (function () {

        return {

          moveDirection: '',

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

            function clickHandler(iCallback) {
              SC.run(function () {
                this_.dropdown.hide();
                iCallback();
              });
            }

            function renameAttributeClickHandler() {
              clickHandler(this_.props.onBeginRenameAttribute);
            }

            function editAttributeClickHandler() {
              clickHandler(this_.props.editAttributeCallback);
            }

            function editFormulaClickHandler() {
              clickHandler(this_.props.editFormulaCallback);
            }

            function deleteAttributeClickHandler() {
              clickHandler(this_.props.deleteAttributeCallback);
            }

            function rerandomizeClickHandler() {
              clickHandler(this_.props.rerandomizeCallback);
            }

            function newAttributeClickHandler() {
              if (this_.props.newAttributeCallback)
                this_.props.newAttributeCallback();
            }

            var renderStaticContents = function() {
              var tMenuItems = [
                    {
                      label: 'DG.TableController.headerMenuItems.renameAttribute'.loc(),
                      clickHandler: renameAttributeClickHandler
                    },
                    {
                      label: 'DG.TableController.headerMenuItems.editAttribute'.loc(),
                      clickHandler: editAttributeClickHandler
                    },
                    {
                      label: 'DG.TableController.headerMenuItems.editFormula'.loc(),
                      disabled: !this.props.attributeIsEditableCallback(),
                      clickHandler: editFormulaClickHandler
                    },
                    {
                      label: 'DG.TableController.headerMenuItems.randomizeAttribute'.loc(),
                      disabled: !this.props.attributeCanBeRandomizedCallback(),
                      clickHandler: rerandomizeClickHandler
                    },
                    {
                      label: 'DG.TableController.headerMenuItems.deleteAttribute'.loc(),
                      disabled: false,
                      clickHandler: deleteAttributeClickHandler
                    }
                  ].map(function (iItem, iIndex) {
                    return DG.React.Components.DropdownItem({
                              disabled: iItem.disabled,
                              key: 'item-' + iIndex,
                              clickHandler: iItem.clickHandler
                            },
                            iItem.label);
                  }),
                  tNameDiv = div({
                    className: 'react-name-cell'
                  }, this.props.content);
              return DG.React.Components.Dropdown({
                        trigger: tNameDiv,
                        menuItems: tMenuItems,
                        ref: function (iDropdown) {
                          this.dropdown = iDropdown;
                        }.bind(this),
                        onRefCallback: assignCellRef
                      });
            }.bind(this);

            handleDropIfAny();

            var tClassName = 'attr-cell ' + dragLocation(),
                tNewAttrDisabledClass = this.props.newAttributeCallback ? '' : ' disabled',
                tNewAttrButton = this.props.showNewAttrButton &&
                    img({
                      src: static_url('images/add_circle_grey_72x72.png'),
                      className: 'dg-floating-plus dg-wants-touch' + tNewAttrDisabledClass,
                      width: 19,
                      height: 19,
                      title: 'DG.TableController.newAttributeTooltip'.loc(),
                      onClick: newAttributeClickHandler
                    }),
                tContents = this.props.isEditing
                              ? DG.React.Components.SimpleEdit({
                                  className: 'react-data-card-attr-name-input',
                                  value: this.props.attribute.get('name'),
                                  onCompleteEdit: this.props.onEndRenameAttribute
                                })
                              : renderStaticContents();
            return td({
                      className: tClassName,
                      ref: assignCellRef
                    }, tNewAttrButton, tContents);
          }
        };
      }()), []);

});
