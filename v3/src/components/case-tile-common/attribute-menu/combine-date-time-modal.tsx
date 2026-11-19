import {
  Box, Button, FormControl, FormLabel, Input, Menu, MenuButton, MenuItemOption, MenuList, MenuOptionGroup,
  ModalBody, ModalCloseButton, ModalFooter, ModalHeader, Text, Tooltip
} from "@chakra-ui/react"
import { ChevronDownIcon } from "@chakra-ui/icons"
import { observer } from "mobx-react-lite"
import React, { useId, useState } from "react"
import { useDataSet } from "../../../hooks/use-data-set"
import { logStringifiedObjectMessage } from "../../../lib/log-message"
import { IAttribute } from "../../../models/data/attribute"
import {
  addCombinedDateTimeAttribute, defaultCombinedAttributeName, getCombineDateTimePreview, getDateTimeRoles,
  isTimeOnlyAttribute
} from "../../../models/data/combine-date-time"
import { createAttributesNotification } from "../../../models/data/data-set-notifications"
import { t } from "../../../utilities/translation/translate"
import { CodapModal } from "../../codap-modal"
import { getAvailableCombineDateTimePartners } from "./combine-date-time-utils"
import AttributeIcon from "../../../assets/icons/attribute-icon.svg"

import "./attribute-menu.scss"

interface IProps {
  attributeId: string
  finalFocusRef?: React.RefObject<HTMLElement>
  isOpen: boolean
  onClose: () => void
}

export const CombineDateTimeModal = observer(function CombineDateTimeModal(
  { attributeId, finalFocusRef, isOpen, onClose }: IProps
) {
  const { data, metadata } = useDataSet()
  const attribute = data?.getAttribute(attributeId)
  const partners = isOpen && data ? getAvailableCombineDateTimePartners(data, metadata, attributeId) : []
  // the dialog is mounted each time it opens, so its initial state is the starting state of each invocation
  const [partnerId, setPartnerId] = useState<string | undefined>(() => partners[0]?.id)
  const [newName, setNewName] = useState(() => defaultName(partners[0]))
  // once the user edits the name, changing the partner no longer replaces it with a default
  const [isNameEdited, setIsNameEdited] = useState(false)
  const partner = partners.find(p => p.id === partnerId)
  const roles = attribute && partner ? getDateTimeRoles(attribute, partner) : undefined
  const preview = roles ? getCombineDateTimePreview(roles) : undefined
  // the attribute the menu was opened from is fixed; the dialog chooses the attribute for the other role
  const isAttributeTime = roles ? roles.timeAttr === attribute : !!attribute && isTimeOnlyAttribute(attribute)
  const dateLabel = t("V3.CaseTable.combineDateTime.dateAttribute")
  const timeLabel = t("V3.CaseTable.combineDateTime.timeAttribute")
  const fixedLabel = isAttributeTime ? timeLabel : dateLabel
  const partnerLabel = isAttributeTime ? dateLabel : timeLabel
  // the partner MenuButton isn't a form field, so a FormLabel can't label it; use aria-labelledby instead
  const partnerLabelId = useId()
  const partnerValueId = useId()

  function defaultName(_partner?: IAttribute) {
    const _roles = data && attribute && _partner ? getDateTimeRoles(attribute, _partner) : undefined
    return data && _roles ? defaultCombinedAttributeName(data, _roles) : ""
  }

  const handlePartnerChange = (id: string) => {
    setPartnerId(id)
    if (!isNameEdited) setNewName(defaultName(partners.find(p => p.id === id)))
  }

  const handleNameChange = (name: string) => {
    setNewName(name)
    setIsNameEdited(true)
  }

  const applyChanges = () => {
    // nothing to create, e.g. if a plugin removed the partner while the dialog was open
    if (!roles) return
    if (data) {
      let newAttr: IAttribute | undefined
      data.applyModelChange(() => {
        newAttr = addCombinedDateTimeAttribute(data, roles, newName)
      }, {
        notify: () => createAttributesNotification(newAttr ? [newAttr] : [], data),
        undoStringKey: "DG.Undo.caseTable.createAttribute",
        redoStringKey: "DG.Redo.caseTable.createAttribute",
        // a function, so the message is built after the action has created the attribute
        log: () => logStringifiedObjectMessage("Combine date and time: %@", {
          name: newAttr?.name,
          date: roles.dateAttr.name,
          time: roles.timeAttr.name,
          formula: newAttr?.formula?.display
        }, "data")
      })
    }
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation()
    if (e.key === "Escape") {
      onClose()
    }
    if (e.key === "Enter") {
      applyChanges()
    }
  }

  const buttons = [
    {
      label: t("DG.AttrFormView.cancelBtnTitle"), tooltip: t("DG.AttrFormView.cancelBtnTooltip"), onClick: onClose,
      testId: "combine-date-time-cancel-button"
    },
    {
      label: t("V3.CaseTable.combineDateTime.create"), onClick: applyChanges, default: true, isDisabled: !roles,
      testId: "combine-date-time-create-button"
    }
  ]

  return (
    <CodapModal
      data-testid="combine-date-time-modal"
      finalFocusRef={finalFocusRef}
      isOpen={isOpen}
      onClose={onClose}
      modalWidth={"340px"}
      modalHeight={"auto"}
    >
      <ModalHeader h="30" className="codap-modal-header" fontSize="md" data-testid="codap-modal-header">
        <div className="codap-modal-icon-container" aria-hidden="true">
          <AttributeIcon className="codap-modal-icon" />
        </div>
        <div className="codap-header-title">{t("V3.CaseTable.combineDateTime.title")}</div>
        <ModalCloseButton onClick={onClose} data-testid="modal-close-button"/>
      </ModalHeader>
      <ModalBody className="combine-date-time-body">
        <Text className="combine-date-time-fixed" data-testid="combine-date-time-fixed">
          {t("V3.CaseTable.combineDateTime.fixedAttribute", { vars: [fixedLabel, attribute?.name ?? ""] })}
        </Text>
        <Box>
          <Text id={partnerLabelId} className="combine-date-time-label">{partnerLabel}</Text>
          <Menu matchWidth>
            <MenuButton as={Button} className="attr-menu-select combine-date-time-select"
                aria-labelledby={`${partnerLabelId} ${partnerValueId}`}
                data-testid="combine-date-time-partner" rightIcon={<ChevronDownIcon />}>
              <span id={partnerValueId}>{partner?.name || "\u00A0"}</span>
            </MenuButton>
            <MenuList data-testid="combine-date-time-partner-menu-list">
              <MenuOptionGroup type="radio" value={partnerId}
                  onChange={(value) => handlePartnerChange(value as string)}>
                {partners.map(p => (
                  <MenuItemOption key={p.id} value={p.id} data-testid="combine-date-time-partner-option">
                    {p.name}
                  </MenuItemOption>
                ))}
              </MenuOptionGroup>
            </MenuList>
          </Menu>
        </Box>
        <FormControl>
          <FormLabel className="combine-date-time-label">{t("V3.CaseTable.combineDateTime.newName")}</FormLabel>
          <Input size="sm" className="combine-date-time-input" value={newName} onFocus={(e) => e.target.select()}
              onChange={event => handleNameChange(event.target.value)} onKeyDown={handleKeyDown}
              data-testid="combine-date-time-name-input"
          />
        </FormControl>
        {preview &&
          <Text className="combine-date-time-preview" data-testid="combine-date-time-preview">
            {t("V3.CaseTable.combineDateTime.preview",
              { vars: [preview.dateValue, preview.timeValue, preview.result] })}
          </Text>
        }
      </ModalBody>
      <ModalFooter>
        {buttons.map((b, i) => {
          const key = `${i}-${b.label}`
          return (
            <Tooltip key={key} label={b.tooltip} h="20px" fontSize="12px"
              color="white" openDelay={1000} placement="bottom" bottom="15px" left="15px"
              data-testid="modal-tooltip">
              <Button size="xs" variant={`${b.default ? "default" : ""}`} ml="5" onClick={b.onClick}
                  isDisabled={b.isDisabled}
                  _hover={{backgroundColor: "#72bfca", color: "white"}} data-testid={b.testId}>
                {b.label}
              </Button>
            </Tooltip>
          )
        })}
      </ModalFooter>
    </CodapModal>
  )
})
