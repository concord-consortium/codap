import React, { useState } from "react"
import { FormControl, FormLabel, Input, Textarea } from "@chakra-ui/react"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import t from "../../utilities/translation/translate"
import { CodapModal } from "../codap-modal"

import "./dataset-info-modal.scss"

interface IDatasetInformationModalContentProps {
  datasetName: string;
  sourceName: string;
  importDate: string;
  description: string;
  setDataSetName: (name: string) => void;
  setSourceName: (sourceName: string) => void;
  setImportDate: (date: string) => void;
  setDescription: (description: string) => void;
}
const DatasetInformationModalContent = ({datasetName, sourceName, importDate, description,
  setDataSetName, setSourceName, setImportDate, setDescription
}: IDatasetInformationModalContentProps) => {
  return (
    <FormControl display="flex" flexDirection="column">
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
                  placeholder={t("DG.TableController.datasetMetadata.descriptionHint")}
                  value={description}
                  onFocus={(e) => e.target.select()}
                  onChange={event => setDescription(event.target.value)}
                  data-testid="dataset-description-input"
                  onKeyDown={(e) => e.stopPropagation()}
        />
      </FormLabel>
    </FormControl>
  )
}

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

  return (
    <CodapModal
      isOpen={showInfoModal}
      onClose={handleCloseInfoModal}
      title={t("DG.TableController.datasetMetadata.title")}
      hasCloseButton={true}
      Content={DatasetInformationModalContent}
      contentProps={{ modalWidth: "280px", datasetName, sourceName, importDate, description,
        setDataSetName, setSourceName, setImportDate, setDescription
      }}
      buttons={[{ label: t("DG.AttrFormView.cancelBtnTitle"),
                  tooltip: t("DG.AttrFormView.cancelBtnTooltip"),
                  onClick: ()=>setShowInfoModal(false) },
                { label: t("DG.AttrFormView.applyBtnTitle"),
                  tooltip: t("DG.AttrFormView.applyBtnTitle"),
                  onClick: handleCloseInfoModal }
              ]}
    />
  )
}
