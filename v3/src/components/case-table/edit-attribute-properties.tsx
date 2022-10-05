import { FormControl, FormLabel, HStack, Input, NumberDecrementStepper, NumberIncrementStepper, NumberInput,
  NumberInputField, NumberInputStepper, Radio, RadioGroup, Select, Textarea }
  from "@chakra-ui/react"
import React, { useEffect, useState } from "react"
import { CalculatedColumn } from "react-data-grid"
import { AttributeType, attributeTypes, IAttribute } from "../../data-model/attribute"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { CodapModal } from "../codap-modal"
import { TRow } from "./case-table-types"

interface IEditAttributePorpertiesModalContentProps {
  attribute: IAttribute;
  attributeName: string;
  description: string;
  unit: string;
  precision: number;
  attrType: AttributeType;
  editable: string;
  setAttributeName: (name: string) => void;
  setDescription: (description: string) => void;
  setUnit: (unit: string) => void;
  setAttrType: (type: AttributeType) => void;
  setEditable: (editable: string) => void;
  onPrecisionChange: (precision: string) => void;
}

export const EditAttributePorpertiesModalContent = ({attribute, attributeName, description, unit, precision, attrType,
    editable, setAttributeName, setDescription, setUnit, setAttrType, setEditable, onPrecisionChange
  }: IEditAttributePorpertiesModalContentProps) => {

  return (
    <FormControl display="flex" flexDirection="column" w={350}>
      <FormLabel display="flex" flexDirection="row">name:
        <Input size="xs" ml={5} placeholder="attribute" value={attributeName} onFocus={(e) => e.target.select()}
              onChange={event => setAttributeName(event.target.value)} data-testid="attr-name-input" />
      </FormLabel>
      <FormLabel>description:
        <Textarea size="xs" placeholder="Describe the attribute" value={description} onFocus={(e) => e.target.select()}
          onChange={event => setDescription(event.target.value)} data-testid="attr-description-input"/>
      </FormLabel>
      <FormLabel display="flex" flexDirection="row" mr={5}>type
        <Select size="xs" ml={5} value={attrType} onChange={(e)=>setAttrType(e.target.value as AttributeType)}>
          <option value={""}></option>
          {attributeTypes.map(aType => {
            return (<option key={aType} value={aType} data-testid="attr-type-option">{aType}</option>)})
          }
        </Select>
      </FormLabel>
      <FormLabel display="flex" flexDirection="row">unit:
        <Input size="xs" placeholder="unit" ml={5} value={unit} onFocus={(e) => e.target.select()}
          onChange={event => setUnit(event.target.value)} data-testid="attr-unit-input" />
      </FormLabel>
      <FormLabel display="flex" flexDirection="row">precision:
        <NumberInput size="xs" min={0} ml={5} data-testid="attr-precision-input"
          value={precision || 3} onFocus={(e) => e.target.select()}
          onChange={value => onPrecisionChange(value)} >
          <NumberInputField placeholder="precision" />
          <NumberInputStepper>
            <NumberIncrementStepper data-testid="precision-input-increment-up"/>
            <NumberDecrementStepper data-testid="precision-input-incement-down"/>
          </NumberInputStepper>
        </NumberInput>
      </FormLabel>
      <FormLabel display="flex" flexDirection="row">editable
        <RadioGroup value={editable} ml={5} onChange={(value)=>setEditable(value)} data-testid="attr-editable-radio">
          <HStack>
            <Radio value="true">True</Radio>
            <Radio value="false">False</Radio>
          </HStack>
        </RadioGroup>
      </FormLabel>
    </FormControl>
  )
}

interface IProps {
  column: CalculatedColumn<TRow, unknown>;
  isOpen: boolean;
  onClose: () => void;
  onModalOpen: (open: boolean) => void
}

// eslint-disable-next-line react/display-name
export const EditAttributePropertiesModal = ({column, isOpen, onClose, onModalOpen}: IProps,
    ref: any) => {
  const data = useDataSetContext()
  const columnNameStr = column.name as string
  const attribute = data?.attrFromName(columnNameStr)
  const [attributeName, setAttributeName] = useState(columnNameStr || "attribute")
  const [description, setDescription] = useState("")
  const [unit, setUnit] = useState("")
  const [precision, setPrecision] = useState(3)
  const [attrType, setAttrType] = useState<AttributeType>("numeric")
  const [editable, setEditable] = useState("true")

  useEffect(() => {
    setAttributeName(columnNameStr)
  },[columnNameStr])

  const handlePrecisionChange = (value: string) => {
    setPrecision(parseInt(value, 10))
  }

  const editProperties = () => {
    onClose()
    onModalOpen(false)

    if (attribute) {
      attribute.setName(attributeName)
      attribute.setUserDescription(description)
      attribute.setUserType(attrType)
      attribute.setUnits(unit)
      attribute.setUserFormat(precision.toString())
      attribute.setUserEditable(editable === "true")
    }
  }
  const closeModal = () => {
    onClose()
    onModalOpen(false)
  }

  return (
    <CodapModal
      isOpen={isOpen}
      onClose={closeModal}
      title="Attribute Properties"
      hasCloseButton={true}
      Content={EditAttributePorpertiesModalContent}
      contentProps={{column, attribute, attributeName, description, unit, precision, attrType, editable,
        setAttributeName, setDescription, setUnit, setAttrType, setEditable,
        onPrecisionChange: handlePrecisionChange
      }}
      buttons={[{ label: "Cancel", onClick: closeModal },{ label: "Apply", onClick: editProperties}]}
    />
  )
}
