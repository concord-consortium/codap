import { Badge, Button, Input, ModalBody, ModalCloseButton, ModalFooter, ModalHeader, VisuallyHidden }
  from "@chakra-ui/react"
import React, { useEffect, useMemo, useRef, useState } from "react"
import build from "../../../build_number.json"
import pkg from "../../../package.json"
import AboutScreenLogo from "../../assets/codap-about-screen.png"
import { t, translateToElements } from "../../utilities/translation/translate"
import { getBuildAssetUrl } from "../../utilities/urls"
import { displayVersion } from "../../utilities/version-utils"
import { CodapModal } from "../codap-modal"
import { ExternalLink } from "../common/external-link"
import {
  kLicensingDetailsUrl, kLicensingEmail, kLicensingUrl, kMitLicenseUrl, kSourceCodeUrl, kTermsOfUseUrl,
  kThirdPartyNoticesFile
} from "./about-dialog-constants"
import { IOssLibrary, OssLibrariesState, useOssLibraries } from "./use-oss-libraries"

import "../codap-modal-v3.scss"
import "./about-dialog.scss"

type AboutDialogView = "about" | "libraries"

interface IProps {
  isOpen: boolean
  onClose: () => void
}

export function AboutDialog({ isOpen, onClose }: IProps) {
  const [view, setView] = useState<AboutDialogView>("about")
  const headerBackButtonRef = useRef<HTMLButtonElement>(null)
  const acknowledgementsButtonRef = useRef<HTMLButtonElement>(null)
  // The Help menu item that opens the dialog is gone once the menu closes,
  // so focus returns to the Help menu button instead.
  const helpMenuButtonRef = useRef<HTMLElement | null>(null)
  const focusAfterViewChange = useRef(false)
  const librariesState = useOssLibraries(isOpen)

  // Set the view and find the help button when the modal opens.
  useEffect(() => {
    if (isOpen) {
      setView("about")
      helpMenuButtonRef.current = document.querySelector<HTMLElement>(".help-menu .menu-anchor")
    }
  }, [isOpen])

  // Update the focus when the view changes.
  useEffect(() => {
    if (focusAfterViewChange.current) {
      focusAfterViewChange.current = false
      const focusTarget = view === "libraries" ? headerBackButtonRef : acknowledgementsButtonRef
      focusTarget.current?.focus()
    }
  }, [view])

  function showView(newView: AboutDialogView) {
    focusAfterViewChange.current = true
    setView(newView)
  }

  const title = view === "about" ? t("DG.AppController.showAboutTitle") : t("V3.AboutDialog.libraries.title")
  const backButtonContent = <><span aria-hidden="true" className="back-arrow">‹&nbsp;</span>{t("V3.general.back")}</>

  return (
    <CodapModal
      isOpen={isOpen}
      onClose={onClose}
      isCentered={true}
      isDraggable={false}
      modalWidth="520px"
      finalFocusRef={helpMenuButtonRef}
    >
      {/* The row uses the same classes as other v3 modal headers so it gets the same styling. */}
      <div className="chakra-modal__header codap-modal-header-v3">
        {view === "libraries" &&
          <Button ref={headerBackButtonRef} size="xs" variant="v3Clear" ml="2" onClick={() => showView("about")}
              data-testid="about-dialog-header-back">
            {backButtonContent}
          </Button>
        }
        {/* Chakra names the dialog with the full text of ModalHeader, so only the title goes in it. */}
        <ModalHeader as="h2" className="codap-header-title-v3" p={0} flex="1" boxShadow="none">
          {title}
        </ModalHeader>
        <ModalCloseButton data-testid="modal-close-button"/>
      </div>
      <ModalBody>
        <div className="about-dialog-body">
          {view === "about"
            ? <AboutView
                acknowledgementsButtonRef={acknowledgementsButtonRef}
                librariesState={librariesState}
                onShowLibraries={() => showView("libraries")}
              />
            : <LibrariesView librariesState={librariesState}/>
          }
        </div>
      </ModalBody>
      <ModalFooter>
        {view === "libraries" &&
          <Button size="xs" variant="v3Clear" ml="3" onClick={() => showView("about")}
              data-testid="about-dialog-footer-back">
            {backButtonContent}
          </Button>
        }
        <Button size="xs" variant="v3Default" ml="3" onClick={onClose} data-testid="about-dialog-close-button">
          {t("V3.general.close")}
        </Button>
      </ModalFooter>
    </CodapModal>
  )
}

function projectCountText(count: number) {
  return count === 1
    ? t("V3.AboutDialog.projectCount")
    : t("V3.AboutDialog.projectCountPlural", { vars: { count } })
}

function resultCountText(count: number) {
  return count === 1
    ? t("V3.AboutDialog.libraries.resultCount")
    : t("V3.AboutDialog.libraries.resultCountPlural", { vars: { count } })
}

function matchesQuery(library: IOssLibrary, lowerCaseQuery: string) {
  return library.name.toLowerCase().includes(lowerCaseQuery) ||
    library.license.toLowerCase().includes(lowerCaseQuery)
}

interface IAboutViewProps {
  acknowledgementsButtonRef: React.RefObject<HTMLButtonElement>
  librariesState: OssLibrariesState
  onShowLibraries: () => void
}

function AboutView({ acknowledgementsButtonRef, librariesState, onShowLibraries }: IAboutViewProps) {
  const version = displayVersion(pkg.version)
  const year = new Date().getFullYear()
  return (
    <>
      <div className="about-dialog-identity">
        <img className="about-dialog-logo" src={AboutScreenLogo} alt={t("V3.AboutDialog.logoAlt")}/>
        <div>{t("V3.app.fullName")}</div>
        <div className="about-dialog-version">
          {t("V3.AboutDialog.version", { vars: { version, build: build.buildNumber } })}
        </div>
        <div className="about-dialog-copyright">{t("V3.AboutDialog.copyright", { vars: { year } })}</div>
      </div>
      <hr className="about-dialog-divider"/>
      <h3 className="about-dialog-heading">{t("V3.AboutDialog.license.heading")}</h3>
      <p className="about-dialog-text">
        {translateToElements("V3.AboutDialog.license.p1", {
          freeOpenSource: <strong>{t("V3.AboutDialog.license.freeOpenSource")}</strong>,
          mitLicense: <ExternalLink href={kMitLicenseUrl}>{t("V3.AboutDialog.license.mitLicense")}</ExternalLink>
        })}
      </p>
      <p className="about-dialog-text">
        {translateToElements("V3.AboutDialog.license.p2", {
          yourUse: <strong>{t("V3.AboutDialog.license.yourUse")}</strong>,
          termsOfUse: <ExternalLink href={kTermsOfUseUrl}>{t("V3.AboutDialog.license.termsOfUse")}</ExternalLink>,
          licensingPage:
            <ExternalLink href={kLicensingUrl}>{t("V3.AboutDialog.license.licensingPage")}</ExternalLink>,
          licensingEmail: <a href={`mailto:${kLicensingEmail}`}>{kLicensingEmail}</a>
        })}
      </p>
      <hr className="about-dialog-divider"/>
      <div className="about-dialog-links">
        <ExternalLink href={kTermsOfUseUrl} showArrow={true}>{t("V3.AboutDialog.links.termsOfUse")}</ExternalLink>
        <ExternalLink href={kLicensingDetailsUrl} showArrow={true}>
          {t("V3.AboutDialog.links.licensingDetails")}
        </ExternalLink>
        <ExternalLink href={kSourceCodeUrl} showArrow={true}>{t("V3.AboutDialog.links.sourceCode")}</ExternalLink>
      </div>
      <Button ref={acknowledgementsButtonRef} variant="v3Clear" size="sm" width="100%" mt="3"
          justifyContent="space-between" onClick={onShowLibraries} data-testid="about-dialog-acknowledgements">
        {t("V3.AboutDialog.acknowledgementsButton")}{" "}
        <span>
          {librariesState.status === "loaded" && `${projectCountText(librariesState.libraries.length)} `}
          <span aria-hidden="true">›</span>
        </span>
      </Button>
    </>
  )
}

interface ILibrariesViewProps {
  librariesState: OssLibrariesState
}

function LibrariesView({ librariesState }: ILibrariesViewProps) {
  const [query, setQuery] = useState("")
  const lowerCaseQuery = query.trim().toLowerCase()
  const matches = useMemo(() => {
    if (librariesState.status !== "loaded") return []
    return librariesState.libraries.filter(library => matchesQuery(library, lowerCaseQuery))
  }, [librariesState, lowerCaseQuery])

  function renderLibraries() {
    if (librariesState.status === "loading") {
      return <p className="about-dialog-library-status">{t("V3.AboutDialog.libraries.loading")}</p>
    }
    if (librariesState.status === "error") {
      return <p className="about-dialog-library-status">{t("V3.AboutDialog.libraries.loadError")}</p>
    }
    if (matches.length === 0) {
      return (
        <p className="about-dialog-library-status">
          {t("V3.AboutDialog.libraries.noMatches", { vars: { query: query.trim() } })}
        </p>
      )
    }
    return (
      <ul>
        {matches.map(({ name, version, license }) => (
          <li key={`${name}@${version}`} className="about-dialog-library">
            <span className="about-dialog-library-name">{name}</span>
            <span>{version}</span>
            <Badge>{license}</Badge>
          </li>
        ))}
      </ul>
    )
  }

  const searchLabel = t("V3.AboutDialog.libraries.searchLabel")
  return (
    <>
      <p>{t("V3.AboutDialog.libraries.intro")}</p>
      <Input size="sm" mt="3" value={query} onChange={e => setQuery(e.target.value)}
        placeholder={searchLabel} aria-label={searchLabel} data-testid="about-dialog-library-search"/>
      <div className="about-dialog-library-list">
        {renderLibraries()}
      </div>
      <VisuallyHidden aria-live="polite">
        {librariesState.status === "loaded" ? resultCountText(matches.length) : ""}
      </VisuallyHidden>
      <p className="about-dialog-libraries-footer">
        {translateToElements("V3.AboutDialog.libraries.footer", {
          noticesLink:
            <ExternalLink href={getBuildAssetUrl(kThirdPartyNoticesFile)} showArrow={true}>
              {t("V3.AboutDialog.libraries.noticesLink")}
            </ExternalLink>
        })}
      </p>
    </>
  )
}
