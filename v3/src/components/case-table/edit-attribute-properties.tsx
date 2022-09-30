import { FormControl, FormLabel, HStack, Input, Radio, RadioGroup, Select, Textarea }
  from "@chakra-ui/react"
import React, { useRef, useState, forwardRef } from "react"
import { CalculatedColumn } from "react-data-grid"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { CodapModal } from "../codap-modal"
import { TRow } from "./case-table-types"

interface IEditAttributePorpertiesModalContentProps {
  column:  CalculatedColumn<TRow, unknown>
}

export const EditAttributePorpertiesModalContent = ({column}: IEditAttributePorpertiesModalContentProps) => {
  const data = useDataSetContext()
  const columnNameStr = column.name as string
  const [attributeName, setAttributeName] = useState(columnNameStr || "attribute")
  const [description, setDescription] = useState("")
  const [unit, setUnit] = useState("")
  const [type, setType] = useState("")
  const [editable, setEditable] = useState("true")

  const nameRef = useRef(null)
  const descriptionRef = useRef(null)
  const unitRef = useRef(null)
  const editableRef = useRef(null)

  return (
    <FormControl display="flex" flexDirection="column" w={350}>
      <FormLabel display="flex" flexDirection="row">name:
        <Input size="xs" ml={5} ref={nameRef} placeholder="attribute"
                value={attributeName} onFocus={(e) => e.target.select()}
                onChange={event => setAttributeName(event.target.value)}
        />
      </FormLabel>
      <FormLabel>description:
        <Textarea size="xs" ref={descriptionRef} placeholder="Describe the attribute"
          value={description} onFocus={(e) => e.target.select()}
          onChange={event => setDescription(event.target.value)}
        />
      </FormLabel>
      <FormLabel display="flex" flexDirection="row" mr={5}>type
        <Select size="xs" onChange={(e)=>setType(e.target.value)} ml={5} value={type}>
            <option value=""></option>
            <option value="categorical">categorical</option>
            <option value="numeric">numeric</option>
            <option value="date">date</option>
            <option value="qualitative">qualitative</option>
            <option value="boundary">boundary</option>
            <option value="checkbox">checkbox</option>
        </Select>
      </FormLabel>
      <FormLabel display="flex" flexDirection="row">unit:
        <Input size="xs" ref={unitRef} placeholder="unit" ml={5}
          value={unit} onFocus={(e) => e.target.select()}
          onChange={event => setUnit(event.target.value)}
        />
      </FormLabel>
      <FormLabel display="flex" flexDirection="row">editable
        <RadioGroup onChange={setEditable} value={editable} ml={5} ref={editableRef}>
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
  column: CalculatedColumn<TRow, unknown>
  isOpen: boolean
  onClose: () => void
}

// eslint-disable-next-line react/display-name
export const EditAttributePropertiesModal = forwardRef(({column, isOpen, onClose}: IProps,
    ref: any) => {
  const editProperties = () => {
    onClose()
  }

  return (
    <CodapModal
      ref={ref}
      isOpen={isOpen}
      onClose={onClose}
      title="Attribute Properties"
      hasCloseButton={true}
      Content={EditAttributePorpertiesModalContent}
      contentProps={{column}}
      buttons={[{ label: "Cancel", onClick: onClose },{ label: "Apply", onClick: editProperties}]}
    />
  )
})
