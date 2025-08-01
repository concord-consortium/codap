import React, { useState } from "react"
import { Button, FormControl, FormLabel, Input, ModalBody, ModalCloseButton, ModalFooter, ModalHeader, Textarea,
  Tooltip } from "@chakra-ui/react"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { useDataSetMetadata } from "../../../hooks/use-data-set-metadata"
import { updateDataContextNotification } from "../../../models/data/data-set-notifications"
import { formatDate } from "../../../utilities/date-utils"
import { t } from "../../../utilities/translation/translate"
import { CodapModal } from "../../codap-modal"

import "./dataset-info-modal.scss"

interface IProps {
  showInfoModal: boolean;
  setShowInfoModal: any;
}

export const DatasetInfoModal = ({showInfoModal, setShowInfoModal}: IProps) => {
  const data = useDataSetContext()
  const metadata = useDataSetMetadata()
  const [datasetTitle, setDatasetTitle] = useState(data?.displayTitle || "")
  const [description, setDescription] = useState(metadata?.description || "")
  const [source, setSource] = useState(metadata?.source || "")
  let initialImportDate = ""
  try {
    // Display a formatted date if we can interpret the import date as a date
    initialImportDate = formatDate(metadata?.importDate || "") || ""
  } catch (error) {
    // Otherwise, just use the string
    initialImportDate = metadata?.importDate || ""
  }
  const [importDate, setImportDate] = useState(initialImportDate)

  const handleCloseInfoModal = () => {
    data?.applyModelChange(() => {
      data.setUserTitle(datasetTitle)
      metadata?.setDescription(description)
      metadata?.setSource(source)
      try {
        // Save an ISO string if we can parse the submitted string as a date
        metadata?.setImportDate(new Date(importDate).toISOString())
      } catch (error) {
        // Otherwise, just save the string
        metadata?.setImportDate(importDate)
      }
      setShowInfoModal(false)
    }, {
      notify: () => updateDataContextNotification(data)
    })
  }

  const buttons=[{  label: t("DG.AttrFormView.cancelBtnTitle"),
                    tooltip: t("DG.AttrFormView.cancelBtnTooltip"),
                    onClick: ()=>setShowInfoModal(false) },
                 {  label: t("DG.AttrFormView.applyBtnTitle"),
                    tooltip: t("DG.AttrFormView.applyBtnTitle"),
                    onClick: handleCloseInfoModal }
                ]

  return (
    <CodapModal
      isOpen={showInfoModal}
      onClose={()=>setShowInfoModal(false)}
      modalWidth={"280px"}
    >
      <ModalHeader h="30" className="codap-modal-header" fontSize="md" data-testid="codap-modal-header">
        <div className="codap-modal-icon-container" />
        <div className="codap-header-title">{t("DG.TableController.datasetMetadata.title")}</div>
        <ModalCloseButton onClick={handleCloseInfoModal} data-testid="modal-close-button"/>
      </ModalHeader>
      <ModalBody>
        <FormControl display="flex" flexDirection="column" className="dataset-info-modal">
          <FormLabel h="20px" display="flex" flexDirection="row" alignItems="center">
            {t("DG.CaseTable.attributeEditor.name")}
            <Input size="xs" ml={5} placeholder="name" value={datasetTitle} onFocus={(e) => e.target.select()}
                onChange={event => setDatasetTitle(event.target.value)} data-testid="dataset-name-input"
                onKeyDown={(e) => e.stopPropagation()}
            />
          </FormLabel>
          <FormLabel display="flex" flexDirection="row">{t("DG.CaseTable.datasetMetadata.url")}
            <Input size="xs" ml={5} placeholder="source" value={source} onFocus={(e) => e.target.select()}
                  onChange={event => setSource(event.target.value)} data-testid="dataset-source-input"
                  onKeyDown={(e) => e.stopPropagation()}
            />
          </FormLabel>
          <FormLabel display="flex" flexDirection="row" overflow="no-wrap">
              {t("DG.CaseTable.datasetMetadata.creationDate")}
            <Input size="xs" ml={5} placeholder="date" value={importDate} onFocus={(e) => e.target.select()}
                  onChange={event => setImportDate(event.target.value)} data-testid="dataset-date-input"
                  onKeyDown={(e) => e.stopPropagation()}
            />
          </FormLabel>
          <FormLabel>{t("DG.CaseTable.attributeEditor.description")}
            <Textarea size="xs"
                      marginLeft="5px"
                      placeholder={t("DG.TableController.datasetMetadata.descriptionHint")}
                      value={description}
                      onFocus={(e) => e.target.select()}
                      onChange={event => setDescription(event.target.value)}
                      data-testid="dataset-description-input"
                      onKeyDown={(e) => e.stopPropagation()}
            />
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
