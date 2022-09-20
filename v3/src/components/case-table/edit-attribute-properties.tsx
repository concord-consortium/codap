import { FormControl, FormLabel, forwardRef, HStack, Input, Radio, RadioGroup, Select, Textarea }
  from "@chakra-ui/react"
import React, { useEffect, useRef, useState } from "react"
import { CodapModal } from "../codap-modal"

export const EditAttributePorpertiesModalContent = forwardRef((ref) => {
  const [attributeName, setAttributeName] = useState("attribute")
  const [description, setDescription] = useState("")
  const [unit, setUnit] = useState("")
  const [type, setType] = useState("")
  const [editable, setEditable] = useState("true")

  const nameRef = useRef(null)
  const descriptionRef = useRef(null)
  const unitRef = useRef(null)
  const editableRef = useRef(null)
  console.log("editable:", editable)
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
})


interface IProps {
  isOpen: boolean
  onClose: () => void
}

export const EditAttributePropertiesModal = forwardRef(({isOpen, onClose}: IProps, ref) => {
  const editProperties = () => {
    onClose()
  }

  const handleClick = () => {
    console.log()
  }

  return (
    <CodapModal
      isOpen={isOpen}
      onClose={onClose}
      title="Attribute Properties"
      hasCloseButton={true}
      Content={EditAttributePorpertiesModalContent}
      contentProps={{ref}}
      buttons={[{ label: "Cancel", onClick: onClose },{ label: "Apply", onClick: editProperties}]}
    />
  )
})
