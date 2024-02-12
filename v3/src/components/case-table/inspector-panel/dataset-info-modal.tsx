import React, { useState } from "react"
import { Button, FormControl, FormLabel, Input, ModalBody, ModalCloseButton, ModalFooter, ModalHeader, Textarea,
  Tooltip } from "@chakra-ui/react"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { t } from "../../../utilities/translation/translate"
import { CodapModal } from "../../codap-modal"

import "./dataset-info-modal.scss"

interface IProps {
  showInfoModal: boolean;
  setShowInfoModal: any;
}

export const DatasetInfoModal = ({showInfoModal, setShowInfoModal}: IProps) => {
  const data = useDataSetContext()
  const [datasetName, setDataSetName] = useState(data?.name || "")
  const [sourceName, setSourceName] = useState(data?.sourceName || "")
  const [importDate, setImportDate] = useState(data?.importDate || "")
  const [description, setDescription] = useState(data?.description || "")

  const handleCloseInfoModal = () => {
    data?.setName(datasetName)
    data?.setSourceName(sourceName)
    data?.setImportDate(importDate)
    data?.setDescription(description)
    setShowInfoModal(false)
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
            <Input size="xs" ml={5} placeholder="name" value={datasetName} onFocus={(e) => e.target.select()}
                onChange={event => setDataSetName(event.target.value)} data-testid="dataset-name-input"
                onKeyDown={(e) => e.stopPropagation()}
            />
          </FormLabel>
          <FormLabel display="flex" flexDirection="row">{t("DG.CaseTable.datasetMetadata.url")}
            <Input size="xs" ml={5} placeholder="source" value={sourceName} onFocus={(e) => e.target.select()}
                  onChange={event => setSourceName(event.target.value)} data-testid="dataset-name-input"
                  onKeyDown={(e) => e.stopPropagation()}
            />
          </FormLabel>
          <FormLabel display="flex" flexDirection="row" overflow="no-wrap">
              {t("DG.CaseTable.datasetMetadata.creationDate")}
            <Input size="xs" ml={5} placeholder="date" value={importDate} onFocus={(e) => e.target.select()}
                  onChange={event => setImportDate(event.target.value)} data-testid="dataset-name-input"
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
