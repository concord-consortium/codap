import { Flex, FormControl, FormLabel, HStack, Input, Radio, RadioGroup, Select, Textarea } from "@chakra-ui/react"
import React, { useEffect, useState } from "react"
import { AttributeType, attributeTypes } from "../../models/data/attribute"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { uniqueName } from "../../utilities/js-utils"
import { CodapModal } from "../codap-modal"
import t from "../../utilities/translation/translate"

interface IEditAttributePropertiesModalContentProps {
  attributeName: string
  description: string
  unit: string
  precision: string
  attrType: AttributeType
  editable: string
  setAttributeName: (name: string) => void
  setDescription: (description: string) => void
  setUnit: (unit: string) => void
  setAttrType: (type: AttributeType) => void
  setEditable: (editable: string) => void
  setPrecision: (precision: string) => void
}

export const EditAttributePropertiesModalContent = ({attributeName, description, unit, precision, attrType,
  editable, setAttributeName, setDescription, setUnit, setAttrType, setEditable, setPrecision,
}: IEditAttributePropertiesModalContentProps) => {

return (
  <Flex className="edit-attribute-modal" direction="column">
    <FormControl className="form-control">
      <FormLabel mb="0">{t("DG.CaseTable.attributeEditor.name")}</FormLabel>
      <Input className="form-input" size="xs" placeholder="attribute" value={attributeName}
            onChange={event => setAttributeName(event.target.value)} data-testid="attr-name-input"
            onKeyDown={(e) => e.stopPropagation()} onFocus={(e) => e.target.select()} />
    </FormControl>
    <FormControl mt="3px" ml="8px">
      <FormLabel mb="1px">{t("DG.CaseTable.attributeEditor.description")}</FormLabel>
      <Textarea w={"calc(100% - 20px)"} mb="8px" size="xs" placeholder="Describe the attribute" value={description}
        onFocus={(e) => e.target.select()} onKeyDown={(e) => e.stopPropagation()}
        onChange={event => setDescription(event.target.value)} data-testid="attr-description-input" />
    </FormControl>
    <FormControl className="form-control">
      <FormLabel mb="0" mr="5px">{t("DG.CaseTable.attributeEditor.type")}</FormLabel>
      <Select size="xs" ml={5} value={attrType} data-testid="attr-type-select"
          onChange={(e) => setAttrType(e.target.value as AttributeType)}>
        <option value={"none"}></option>
        {attributeTypes.map(aType => {
          return (<option key={aType} value={aType} data-testid="attr-type-option">
                    {t(`DG.CaseTable.attribute.type.${aType}`)}
                  </option>)
        })}
      </Select>
    </FormControl>
    <FormControl className="form-control">
      <FormLabel mb="0">{t("DG.CaseTable.attributeEditor.unit")}</FormLabel>
      <Input className="form-input" size="xs" placeholder="unit" ml={5} value={unit} onFocus={(e) => e.target.select()}
        onChange={event => setUnit(event.target.value)} data-testid="attr-unit-input"
        onKeyDown={(e) => e.stopPropagation()} />
    </FormControl>
    <FormControl className="form-control" >
      <FormLabel mb="0">{t("DG.CaseTable.attributeEditor.precision")}</FormLabel>
      <Select size="xs" value={precision} data-testid="attr-precision-select"
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
    </FormControl>
    <FormControl className="form-control" >
      <FormLabel mb="0" aria-label={t("DG.CaseTable.attributeEditor.editable")}>
        {t("DG.CaseTable.attributeEditor.editable")}
      </FormLabel>
      <RadioGroup className="form-input" value={editable} ml={5} onChange={(value) => setEditable(value)}
          data-testid="attr-editable-radio" aria-label={t("DG.CaseTable.attributeEditor.editable")}
          onKeyDown={(e) =>e.stopPropagation()}>
        <HStack>
          <Radio value="true">True</Radio>
          <Radio value="false">False</Radio>
        </HStack>
      </RadioGroup>
    </FormControl>
  </Flex>
)
}

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
  const modalWidth="350px"

  useEffect(() => {
    setAttributeName(columnName)
  },[columnName])

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
      attribute.setUserPrecision(isFinite(+precision) ? +precision : undefined)
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

  return (
    <CodapModal
      isOpen={isOpen}
      onClose={closeModal}
      title={t("DG.TableController.attributeEditor.title")}
      hasCloseButton={true}
      Content={EditAttributePropertiesModalContent}
      contentProps={{attributeName, description, unit, precision, attrType, editable, modalWidth,
        setAttributeName, setDescription, setUnit, setAttrType, setEditable, setPrecision}}
      buttons={[{ label: t("DG.AttrFormView.cancelBtnTitle"),
                  tooltip: t("DG.AttrFormView.cancelBtnTooltip"),
                  onClick: closeModal },
                { label: t("DG.AttrFormView.applyBtnTitle"),
                  onClick: editProperties}]}
    />
  )
}
