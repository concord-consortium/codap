import { Button, FormControl, FormLabel, HStack, Input, ModalBody, ModalCloseButton, ModalFooter, ModalHeader,
  Radio, RadioGroup, Select, Textarea, Tooltip } from "@chakra-ui/react"
import React, { useEffect, useState } from "react"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { logMessageWithReplacement } from "../../../lib/log-message"
import { AttributeType, attributeTypes } from "../../../models/data/attribute-types"
import { updateAttributesNotification } from "../../../models/data/data-set-notifications"
import { DatePrecision } from "../../../utilities/date-utils"
import { uniqueName } from "../../../utilities/js-utils"
import { t } from "../../../utilities/translation/translate"
import { CodapModal } from "../../codap-modal"
import AttributeIcon from "../../../assets/icons/attribute-icon.svg"

import "./attribute-menu.scss"

// for use in menus of attribute types
const selectableAttributeTypes = ["none", ...attributeTypes] as const
type SelectableAttributeType = typeof selectableAttributeTypes[number]

type YesNoValue = "yes" | "no"

interface IProps {
  attributeId: string
  isOpen: boolean
  onClose: () => void
}

export const EditAttributePropertiesModal = ({ attributeId, isOpen, onClose }: IProps) => {
  const data = useDataSetContext()
  const attribute = data?.attrFromID(attributeId)
  const columnName = attribute?.name || "attribute"
  const [attributeName, setAttributeName] = useState(columnName)
  const [description, setDescription] = useState("")
  const [units, setUnits] = useState("")
  const [precision, setPrecision] = useState(attribute?.precision)
  const [userType, setUserType] = useState<SelectableAttributeType>("none")
  const [editable, setEditable] = useState<YesNoValue>("yes")

  useEffect(() => {
    // reset the dialog contents from the attribute on each invocation
    setAttributeName(attribute?.name || "attribute")
    setDescription(attribute?.description ?? "")
    setUnits(attribute?.units ?? "")
    setPrecision(attribute?.precision)
    setUserType(attribute?.userType ?? "none")
    setEditable(attribute?.editable ? "yes" : "no")
  }, [attribute, isOpen])

  const applyChanges = () => {
    if (attribute && attributeId) {
      data?.applyModelChange(() => {
        if (attributeName !== attribute.name) {
          const newName = uniqueName(attributeName,
            (aName: string) => (aName === columnName) || !data?.attributes.find(attr => aName === attr.name)
          )
          attribute.setName(newName)
        }
        if (description !== (attribute.description ?? "")) {
          attribute.setDescription(description || undefined)
        }
        if (units !== (attribute.units ?? "")) {
          attribute.setUnits(units || undefined)
        }
        if (userType !== (attribute.userType ?? "none")) {
          attribute.setUserType(userType === "none" ? undefined : userType)
        }
        if (precision !== attribute.precision) {
          attribute.setPrecision(precision)
        }
        if ((editable === "yes") !== attribute.editable) {
          attribute.setEditable(editable === "yes")
        }
      }, {
        notify: updateAttributesNotification([attribute], data),
        undoStringKey: "DG.Undo.caseTable.editAttribute",
        redoStringKey: "DG.Redo.caseTable.editAttribute",
        log: logMessageWithReplacement("Edit attribute: %@", { name: attribute.name })
      })
    }
    closeModal()
  }

  const closeModal = () => {
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation()
    if (e.key === "Escape") {
      closeModal()
    }
    if (e.key === "Enter") {
      applyChanges()
    }
  }

  const buttons = [
    {
      label: t("DG.AttrFormView.cancelBtnTitle"), tooltip: t("DG.AttrFormView.cancelBtnTooltip"), onClick: closeModal
    },
    { label: t("DG.AttrFormView.applyBtnTitle"), onClick: applyChanges, default: true }
  ]

  function toDatePrecision(pStr: string) {
    return !pStr || isFinite(Number(pStr)) ? undefined : pStr as DatePrecision
  }
  function toDatePrecisionStr(p: typeof precision) {
    return p == null || typeof p === "number" ? "" : p
  }

  function toNumPrecision(pStr: string) {
    return isFinite(Number(pStr)) ? Number(pStr) : undefined
  }
  function toNumPrecisionStr(p: typeof precision) {
    return p == null || typeof p === "string" ? "" : `${p}`
  }

  const getPrecisionMenu = () => {
    if (userType === "date" || (userType === "none" && attribute?.type === "date")) {
      return (
        <Select size="xs" ml={5} value={toDatePrecisionStr(precision)} data-testid="attr-precision-select"
                        onChange={(e) => setPrecision(toDatePrecision(e.target.value))}>
          {Object.values(DatePrecision).map(p => {
            return (
              <option value={p} key={`precision-${p}`} data-testid={`attr-precision-option-${p}`}>
                {p}
              </option>
            )
          })}
        </Select>
      )
    } else {
      const isDisabled = !["none", "date", "numeric"].includes(userType)
      const value = isDisabled ? "" : toNumPrecisionStr(precision)
      return (
        <Select size="xs" ml={5} value={value} disabled={isDisabled}
            data-testid="attr-precision-select"
            onChange={(e) => setPrecision(toNumPrecision(e.target.value))}>
          <option value={""}></option>
          {[...Array(10).keys()].map(pNum => {
            const precisionStr = `${pNum}`
            return (
              <option value={pNum} key={`precision-${pNum}`} data-testid={`attr-precision-option-${pNum}`}>
                {precisionStr}
              </option>
            )
          })}
        </Select>
      )
    }
  }

  return (
    <CodapModal
      isOpen={isOpen}
      onClose={closeModal}
      modalWidth={"265px"}
      modalHeight={"300px"}
    >
      <ModalHeader h="30" className="codap-modal-header" fontSize="md" data-testid="codap-modal-header">
        <div className="codap-modal-icon-container">
          <AttributeIcon className="codap-modal-icon" />
        </div>
        <div className="codap-header-title">{t("DG.TableController.attributeEditor.title")}</div>
        <ModalCloseButton onClick={closeModal} data-testid="modal-close-button"/>
      </ModalHeader>
      <ModalBody>
        <FormControl display="flex" flexDirection="column">
          <FormLabel className="edit-attribute-form-row">
            {t("DG.CaseTable.attributeEditor.name")}
            <Input size="xs" ml={5} placeholder="attribute" value={attributeName} onFocus={(e) => e.target.select()}
                  onChange={event => setAttributeName(event.target.value)} data-testid="attr-name-input"
                  onKeyDown={handleKeyDown}
            />
          </FormLabel>
          <FormLabel>{t("DG.CaseTable.attributeEditor.description")}
            <Textarea size="xs" placeholder="Describe the attribute" value={description}
              onFocus={(e) => e.target.select()} onKeyDown={handleKeyDown}
              onChange={event => setDescription(event.target.value)} data-testid="attr-description-input"
            />
          </FormLabel>
          <FormLabel mr={5} className="edit-attribute-form-row">{t("DG.CaseTable.attributeEditor.type")}
            <Select size="xs" ml={5} value={userType} data-testid="attr-type-select"
                onChange={(e) => setUserType(e.target.value as AttributeType)}
                onMouseDown={(e) => e.stopPropagation()}>
              {selectableAttributeTypes.map(aType => {
                return (<option key={aType} value={aType} data-testid="attr-type-option"
                                onMouseDown={(e)=>e.stopPropagation()}>
                          {t(`DG.CaseTable.attribute.type.${aType}`)}
                        </option>)
              })}
            </Select>
          </FormLabel>
          <FormLabel className="edit-attribute-form-row">{t("DG.CaseTable.attributeEditor.unit")}
            <Input size="xs" placeholder="unit" ml={5} value={units} onFocus={(e) => e.target.select()}
              onChange={event => setUnits(event.target.value)} data-testid="attr-unit-input"
              onKeyDown={handleKeyDown}
            />
          </FormLabel>
          <FormLabel className="edit-attribute-form-row" mr={5}>{t("DG.CaseTable.attributeEditor.precision")}
            {getPrecisionMenu()}
          </FormLabel>
          <FormLabel className="edit-attribute-form-row editable">{t("DG.CaseTable.attributeEditor.editable")}
            <RadioGroup value={attribute?.hasFormula ? "no" : editable} ml={5} data-testid="attr-editable-radio"
              onChange={(value) => setEditable(value as YesNoValue)}
              onKeyDown={handleKeyDown}>
              <HStack>
                <Radio value="yes" isDisabled={attribute?.hasFormula}>{t("V3.general.yes")}</Radio>
                <Radio value="no">{t("V3.general.no")}</Radio>
              </HStack>
            </RadioGroup>
          </FormLabel>
        </FormControl>
      </ModalBody>
      <ModalFooter mt="-5">
        {buttons.map((b: any, i)=>{
          const key = `${i}-${b.label}`
          return (
            <Tooltip key={key} label={b.tooltip} h="20px" fontSize="12px"
              color="white" openDelay={1000} placement="bottom" bottom="15px" left="15px"
              data-testid="modal-tooltip">
              <Button key={key} size="xs" variant={`${b.default ? "default" : ""}`} ml="5" onClick={b.onClick}
                      _hover={{backgroundColor: "#72bfca", color: "white"}} data-testid={`${b.label}-button`}>
                {b.label}
              </Button>
            </Tooltip>
          )
        })}
      </ModalFooter>
    </CodapModal>
  )
}
