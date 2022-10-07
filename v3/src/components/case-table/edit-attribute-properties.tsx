import { FormControl, FormLabel, HStack, Input, NumberDecrementStepper, NumberIncrementStepper, NumberInput,
  NumberInputField, NumberInputStepper, Radio, RadioGroup, Select, Textarea }
  from "@chakra-ui/react"
import React, { useEffect, useState } from "react"
import { AttributeType, attributeTypes } from "../../data-model/attribute"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { CodapModal } from "../codap-modal"

interface IEditAttributePorpertiesModalContentProps {
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

export const EditAttributePorpertiesModalContent = ({attributeName, description, unit, precision, attrType,
    editable, setAttributeName, setDescription, setUnit, setAttrType, setEditable, onPrecisionChange
  }: IEditAttributePorpertiesModalContentProps) => {

  // TODO: Uncomment when NumberInputStepper is re-implemented. Otherwise the clicks where not being
  //        captured by the stepper elements
  // const handlePrecisionIncrement = () => {
  //   onPrecisionChange((precision + 1).toString())
  // }

  // const handlePrecisionDecrement = () => {
  //   precision > 0 && onPrecisionChange((precision - 1).toString())
  // }

  return (
    <FormControl display="flex" flexDirection="column" w={350}>
      <FormLabel display="flex" flexDirection="row">name:
        <Input size="xs" ml={5} placeholder="attribute" value={attributeName} onFocus={(e) => e.target.select()}
              onChange={event => setAttributeName(event.target.value)} data-testid="attr-name-input"
              onKeyDown={(e)=>e.stopPropagation()}
        />
      </FormLabel>
      <FormLabel>description:
        <Textarea size="xs" placeholder="Describe the attribute" value={description} onFocus={(e) => e.target.select()}
          onChange={event => setDescription(event.target.value)} data-testid="attr-description-input"
          onKeyDown={(e)=>e.stopPropagation()}
        />
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
          onChange={event => setUnit(event.target.value)} data-testid="attr-unit-input"
          onKeyDown={(e)=>e.stopPropagation()}
        />
      </FormLabel>
      <FormLabel display="flex" flexDirection="row">precision:
        <NumberInput size="xs" min={0} ml={5} data-testid="attr-precision-input" value={precision}
          onFocus={(e) => e.target.select()} onChange={value => onPrecisionChange(value)}
          onKeyDown={(e)=>e.stopPropagation()}
        >
          <NumberInputField placeholder="precision" />
          {/* TODO: There's a weird behavior in the ui that when you click on the stepper, the number input element
                    loses focus and the first input element in the modal gets the focus. Seems like the modal is getting
                    blurred and refocused when you click on the stepper. And when the modal is refocused, it focuses on
                    the first input element in the modal */}
          {/* <NumberInputStepper>
            <NumberIncrementStepper onClick={handlePrecisionIncrement}
            data-testid="precision-input-increment-up"/>
            <NumberDecrementStepper onClick={handlePrecisionDecrement} data-testid="precision-input-incement-down"/>
          </NumberInputStepper> */}
        </NumberInput>
      </FormLabel>
      <FormLabel display="flex" flexDirection="row">editable
        <RadioGroup value={editable} ml={5} onChange={(value)=>setEditable(value)} data-testid="attr-editable-radio"
          onKeyDown={(e)=>e.stopPropagation()}
        >
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
  columnName: string
  isOpen: boolean;
  onClose: () => void;
  onModalOpen: (open: boolean) => void
}

// eslint-disable-next-line react/display-name
export const EditAttributePropertiesModal = ({columnName, isOpen, onClose, onModalOpen}: IProps,
    ref: any) => {
  const data = useDataSetContext()
  const attribute = data?.attrFromName(columnName)
  const [attributeName, setAttributeName] = useState(columnName || "attribute")
  const [description, setDescription] = useState("")
  const [unit, setUnit] = useState("")
  const [precision, setPrecision] = useState(3)
  const [attrType, setAttrType] = useState<AttributeType>("numeric")
  const [editable, setEditable] = useState("true")

  useEffect(() => {
    setAttributeName(columnName)
  },[columnName])

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
      contentProps={{attributeName, description, unit, precision, attrType, editable,
        setAttributeName, setDescription, setUnit, setAttrType, setEditable,
        onPrecisionChange: handlePrecisionChange
      }}
      buttons={[{ label: "Cancel", onClick: closeModal },{ label: "Apply", onClick: editProperties}]}
    />
  )
}
