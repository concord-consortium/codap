// sc_require('react/dg-react');
/* global ReactDOMFactories */

DG.React.ready(function () {
  var
      img = ReactDOMFactories.img,
      div = ReactDOMFactories.div,
      td = ReactDOMFactories.td;

  DG.React.AttributeNameCell = DG.React.createComponent(
      (function () {

        return {
          cellRef: null,
          cellWidth: null,
          moveDirection: '',

          componentDidMount: function () {
            this.componentDidRender();
          },

          componentDidUpdate: function () {
            this.componentDidRender();
          },

          componentDidRender: function () {
            if (this.cellRef && this.props.onColumnWidthChanged) {
              var bounds = this.cellRef.getBoundingClientRect();
              if (bounds.width !== this.cellWidth) {
                this.cellWidth = bounds.width;
                this.props.onColumnWidthChanged(this.cellWidth);
              }
            }
          },

          showDragTip: function (iShow) {
            if (iShow && !this.tipIsShowing) {
              var tRect = this.cellRef.getBoundingClientRect(),
                  tData = this.props.dragStatus.dragObject.data,
                  tSourceKeyAttributeName = tData.attribute.get('name'),
                  tSourceCollectionName = tData.collection.get('name'),
                  tSourceContextName = tData.context.get('name'),
                  tDestKeyAttribute = this.props.attribute,
                  tDestCollectionName = tDestKeyAttribute.getPath('collection.name'),
                  tDestContextName = tDestKeyAttribute.getPath('collection.dataSet.dataContextRecord.name'),
                  tDestKeyAttributeName = tDestKeyAttribute.get('name'),
                  tTip = "DG.Collection.joinTip".loc(tSourceCollectionName,
                      tSourceContextName, tDestCollectionName, tDestContextName,
                      tSourceKeyAttributeName, tDestKeyAttributeName);
              var tTipView = DG.mainPage.getPath('mainPane.tipView');
              tTipView.invokeLater(function () {
                tTipView.show(
                    {x: tRect.left, y: tRect.top + tRect.height}, tTip);
              }, 10);
              this.tipIsShowing = true;
            } else if (!iShow && this.tipIsShowing) {
              DG.mainPage.getPath('mainPane.tipView').hide();
              this.tipIsShowing = false;
            }
          },

          render: function () {
            var this_ = this;

            function assignCellRef(iElement) {
              this_.cellRef = iElement;
            }

            function dragLocation() {
              var tResult = '';
              this_.moveDirection = '';
              if (this_.props.dragStatus && this_.props.dragStatus.event && this_.cellRef) {
                var tEvent = this_.props.dragStatus.event,
                    tX = tEvent.clientX,
                    tY = tEvent.clientY,
                    tRect = this_.cellRef.getBoundingClientRect(),
                    tDragType = this_.props.dragStatus.dragType;
                if (tX > tRect.x && tX < tRect.x + tRect.width && tY > tRect.y &&
                    tY < tRect.y + tRect.height) {
                  switch (tDragType) {
                    case 'ownContext':
                      if (tY < tRect.y + tRect.height / 2) {
                        this_.moveDirection = 'up';
                        tResult = 'attr-cell-upper';
                      } else if (tY < tRect.y + tRect.height) {
                        this_.moveDirection = 'down';
                        tResult = 'attr-cell-lower';
                      }
                      break;
                    case 'foreignContext':
                      this_.moveDirection = 'join';
                      tResult = 'attr-cell-all';
                  }
                }
              }
              return tResult;
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

            function hideAttributeClickHandler() {
              clickHandler(this_.props.hideAttributeCallback);
            }

            function deleteAttributeFormulaClickHandler() {
              clickHandler(this_.props.deleteAttributeFormulaCallback);
            }

            function recoverAttributeFormulaClickHandler() {
              clickHandler(this_.props.recoverAttributeFormulaCallback);
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

            var renderStaticContents = function () {
              var hasFormula = this.props.attribute.get('formula') !== '',
                  hasDeletedFormula = this.props.attribute.hasDeletedFormula(),
                  tDeleteFormulaLabel = hasDeletedFormula ? 'DG.TableController.headerMenuItems.recoverFormula'.loc() :
                      'DG.TableController.headerMenuItems.deleteFormula'.loc(),
                  tMenuItems = [
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
                      label: tDeleteFormulaLabel,
                      disabled: !this.props.attributeIsEditableCallback() || (!hasFormula && !hasDeletedFormula),
                      clickHandler: hasDeletedFormula ? recoverAttributeFormulaClickHandler :
                          deleteAttributeFormulaClickHandler
                    },
                    {
                      label: 'DG.TableController.headerMenuItems.randomizeAttribute'.loc(),
                      disabled: !this.props.attributeCanBeRandomizedCallback(),
                      clickHandler: rerandomizeClickHandler
                    },
                    {
                      label: 'DG.TableController.headerMenuItems.hideAttribute'.loc(),
                      disabled: !this.props.attributeCanBeHiddenCallback(),
                      clickHandler: hideAttributeClickHandler
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
                      title: 'DG.TableController.newAttributeTooltip'.loc(),
                      onClick: newAttributeClickHandler
                    }),
                tColumnWidth = this.props.columnWidthPct != null
                    ? (Math.round(this.props.columnWidthPct * 1000) / 10) + '%'
                    : undefined,
                tContents = this.props.isEditing
                    ? DG.React.SimpleEdit({
                      className: 'react-data-card-attr-name-input',
                      value: this.props.attribute.get('name'),
                      onCompleteEdit: this.props.onEndRenameAttribute
                    })
                    : renderStaticContents();
            this.showDragTip(this.moveDirection === 'join');
            return td({
              className: tClassName,
              ref: assignCellRef,
              style: {width: tColumnWidth}
            }, tNewAttrButton, tContents);
          }
        };
      }()), []);

});
