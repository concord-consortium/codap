import React, { useEffect, useState } from "react"
import { FormControl, FormLabel, Textarea, Text, Menu, MenuButton, MenuList, MenuItem, MenuDivider }
  from "@chakra-ui/react"
import { CodapModal } from "../codap-modal"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { IAttribute } from "../../data-model/attribute"

interface IFormulaEditorModalProps {
  attribute: IAttribute
  formula: string
  onChangeFormula: (value: string) => void
}

export const FomulaEditorModalContent: React.FC<IFormulaEditorModalProps> =
  ({attribute, formula, onChangeFormula, }: IFormulaEditorModalProps) => {
  const data = useDataSetContext()
  const attributes = data?.attributes


  return (
    <FormControl display="flex" flexDirection="column">
      <Text>Attribute Name: {attribute.name} =
      </Text>
      <FormLabel>Formula:
        <Textarea size="xs" placeholder="Describe the attribute" value={formula} onFocus={(e) => e.target.select()}
          onChange={event => onChangeFormula(event.target.value)} data-testid="attr-formula-input"
          onKeyDown={(e) => e.stopPropagation()}
        />
      </FormLabel>
      <div className="formula-insert-buttons">
        <Menu>
          <MenuButton borderRadius="md" borderWidth="1px" padding="2px 10px">
            Insert Value
          </MenuButton>
          <MenuList>
              {attributes?.map(a => {
                return <MenuItem key={a.name}>{a.name}</MenuItem>
              })}
            <MenuDivider />
              <MenuItem> caseIndex</MenuItem>
            <MenuDivider />
              <MenuItem>boundaries</MenuItem>
            <MenuDivider />
              <MenuItem>e</MenuItem>
              <MenuItem>false</MenuItem>
              <MenuItem>true</MenuItem>
              <MenuItem>π</MenuItem>
          </MenuList>
        </Menu>
        <Menu>
          <MenuButton borderRadius="md" borderWidth="1px" padding="2px 10px">
            Insert Formula
          </MenuButton>
          <MenuList>
            <MenuItem key={"fomulas"}>Formulas</MenuItem>
          </MenuList>
        </Menu>
      </div>
    </FormControl>
  )
}

interface IProps {
  columnName: string
  isOpen: boolean
  onClose: () => void
  onModalOpen: (open: boolean) => void
}

export const FormulaEditorModal = ({columnName, isOpen, onClose, onModalOpen}: IProps,
    ref: any) => {
  const data = useDataSetContext()
  const attribute = data?.attrFromName(columnName)
  const formula = attribute?.formula.display
  const [attributeFormula, setAttributeFormula] = useState(formula || "")

  useEffect(() => {
    setAttributeFormula(attributeFormula)
  },[attributeFormula])

  const editFormula = () => {
    onClose()
    onModalOpen(false)
    if (attribute) {
      attribute.formula.setDisplay(attributeFormula)
    }
  }
  const closeModal = () => {
    onClose()
    onModalOpen(false)
    setAttributeFormula(formula || "")
  }

  return (
    <CodapModal
      isOpen={isOpen}
      onClose={closeModal}
      title="Formula Editor"
      hasCloseButton={true}
      Content={FomulaEditorModalContent}
      contentProps={{attribute, attributeFormula, setAttributeFormula}}
      buttons={[{ label: "Cancel", onClick: closeModal },{ label: "Apply", onClick: editFormula}]}
    />
  )
}

