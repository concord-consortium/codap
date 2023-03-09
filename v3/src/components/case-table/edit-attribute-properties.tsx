import { Button, FormControl, FormLabel, HStack, Input, ModalBody, ModalCloseButton, ModalFooter, ModalHeader,
  Radio, RadioGroup, Select, Textarea, Tooltip } from "@chakra-ui/react"
import React, { useEffect, useState } from "react"
import { AttributeType, attributeTypes } from "../../models/data/attribute"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { uniqueName } from "../../utilities/js-utils"
import { CodapModal } from "../codap-modal"
import t from "../../utilities/translation/translate"

interface IProps {
  columnName: string
  isOpen: boolean
  onClose: () => void
  onModalOpen: (open: boolean) => void
}

export const EditAttributePropertiesModal = ({columnName, isOpen, onClose, onModalOpen}: IProps,
    ref: any) => {
  const data = useDataSetContext()
  const attribute = data?.attrFromName(columnName)
  const attrId = data?.attrIDFromName(columnName)
  const [attributeName, setAttributeName] = useState(columnName || "attribute")
  const [description, setDescription] = useState("")
  const [unit, setUnit] = useState("")
  const [precision, setPrecision] = useState("")
  const [attrType, setAttrType] = useState<AttributeType | "none">("none")
  const [editable, setEditable] = useState("true")

  useEffect(() => {
    setAttributeName(columnName)
  }, [columnName])

  const editProperties = () => {
    onClose()
    onModalOpen(false)
    if (attribute && attrId) {
      data?.setAttributeName(attrId, () => uniqueName(attributeName,
        (aName: string) => (aName === columnName) || !data.attributes.find(attr => aName === attr.name)
       ))
      attribute.setUserDescription(description)
      attribute.setUserType(attrType === "none" ? undefined : attrType)
      attribute.setUnits(unit)
      attribute.setUserPrecision(precision && isFinite(+precision) ? +precision : undefined)
      attribute.setUserEditable(editable === "true")
    }
  }
  const closeModal = () => {
    onClose()
    onModalOpen(false)
    setAttributeName(attribute?.name || "")
    setDescription(attribute?.userDescription || "")
    setAttrType(attribute?.userType ? attribute?.userType : "none")
    setUnit(attribute?.units || "")
    setPrecision((attribute?.userPrecision)?.toString() || "")
    setEditable((attribute?.userEditable)?.toString() || "true")
  }

  const buttons=[{  label: t("DG.AttrFormView.cancelBtnTitle"),
                    tooltip: t("DG.AttrFormView.cancelBtnTooltip"),
                    onClick: closeModal },
                 {  label: t("DG.AttrFormView.applyBtnTitle"),
                    onClick: editProperties
                 }]
  return (
    <CodapModal
      isOpen={isOpen}
      onClose={onClose}
      modalWidth={"350px"}
    >
      <ModalHeader h="30" className="codap-modal-header" fontSize="md" data-testid="codap-modal-header">
        <div className="codap-modal-icon-container" />
        <div className="codap-header-title">{t("DG.TableController.attributeEditor.title")}</div>
        <ModalCloseButton onClick={onClose} data-testid="modal-close-button"/>
      </ModalHeader>
      <ModalBody>
      <FormControl display="flex" flexDirection="column">
        <FormLabel display="flex" flexDirection="row">{t("DG.CaseTable.attributeEditor.name")}
          <Input size="xs" ml={5} placeholder="attribute" value={attributeName} onFocus={(e) => e.target.select()}
                onChange={event => setAttributeName(event.target.value)} data-testid="attr-name-input"
                onKeyDown={(e) => e.stopPropagation()}
          />
        </FormLabel>
        <FormLabel>{t("DG.CaseTable.attributeEditor.description")}
          <Textarea size="xs" placeholder="Describe the attribute" value={description}
            onFocus={(e) => e.target.select()} onKeyDown={(e) => e.stopPropagation()}
            onChange={event => setDescription(event.target.value)} data-testid="attr-description-input"
          />
        </FormLabel>
        <FormLabel display="flex" flexDirection="row" mr={5}>{t("DG.CaseTable.attributeEditor.type")}
          <Select size="xs" ml={5} value={attrType} data-testid="attr-type-select"
              onChange={(e) => setAttrType(e.target.value as AttributeType)}>
            <option value={"none"}></option>
            {attributeTypes.map(aType => {
              return (<option key={aType} value={aType} data-testid="attr-type-option">
                        {t(`DG.CaseTable.attribute.type.${aType}`)}
                      </option>)
            })}
          </Select>
        </FormLabel>
        <FormLabel display="flex" flexDirection="row">{t("DG.CaseTable.attributeEditor.unit")}
          <Input size="xs" placeholder="unit" ml={5} value={unit} onFocus={(e) => e.target.select()}
            onChange={event => setUnit(event.target.value)} data-testid="attr-unit-input"
            onKeyDown={(e) => e.stopPropagation()}
          />
        </FormLabel>
        <FormLabel display="flex" flexDirection="row" mr={5}>{t("DG.CaseTable.attributeEditor.precision")}
          <Select size="xs" ml={5} value={precision} data-testid="attr-precision-select"
              onChange={(e) => setPrecision(e.target.value)}>
            <option value={""}></option>
            <option value={"0"} data-testid="attr-precision-option">0</option>
            <option value={"1"} data-testid="attr-precision-option">1</option>
            <option value={"2"} data-testid="attr-precision-option">2</option>
            <option value={"3"} data-testid="attr-precision-option">3</option>
            <option value={"4"} data-testid="attr-precision-option">4</option>
            <option value={"5"} data-testid="attr-precision-option">5</option>
            <option value={"6"} data-testid="attr-precision-option">6</option>
            <option value={"7"} data-testid="attr-precision-option">7</option>
            <option value={"8"} data-testid="attr-precision-option">8</option>
          </Select>
        </FormLabel>
        <FormLabel display="flex" flexDirection="row">{t("DG.CaseTable.attributeEditor.editable")}
          <RadioGroup value={editable} ml={5} onChange={(value) => setEditable(value)} data-testid="attr-editable-radio"
            onKeyDown={(e) =>e.stopPropagation()}>
            <HStack>
              <Radio value="true">True</Radio>
              <Radio value="false">False</Radio>
            </HStack>
          </RadioGroup>
        </FormLabel>
      </FormControl>
      </ModalBody>
      <ModalFooter mt="-5">
        {buttons.map((b: any, i)=>{
          const key = `${i}-${b.className}`
          return (
            <Tooltip key={key} label={b.tooltip} h="20px" fontSize="12px"
              color="white" openDelay={1000} placement="bottom" bottom="15px" left="15px"
              data-testid="modal-tooltip">
              <Button key={key} size="xs" variant="ghost" ml="5" onClick={b.onClick} data-testid={`${b.label}-button`}>
                {b.label}
              </Button>
            </Tooltip>
          )
        })}
      </ModalFooter>
    </CodapModal>
  )
}
