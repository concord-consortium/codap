import {
  Badge, Button, Checkbox, Input, ModalBody, ModalCloseButton, ModalFooter, ModalHeader, VisuallyHidden
} from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import React, { RefObject, useEffect, useMemo, useRef, useState } from "react"
import build from "../../../build_number.json"
import pkg from "../../../package.json"
import AboutScreenLogo from "../../assets/codap-about-screen.png"
import { persistentState } from "../../models/persistent-state"
import { AboutDialogView } from "../../models/ui-state-types"
import { t, translateToElements } from "../../utilities/translation/translate"
import { getBuildAssetUrl } from "../../utilities/urls"
import { displayVersion } from "../../utilities/version-utils"
import { CodapModal } from "../codap-modal"
import { ExternalLink } from "../common/external-link"
import {
  kLicensingEmail, kLicensingUrl, kMitLicenseUrl, kSourceCodeUrl, kTermsOfUseUrl, kThirdPartyNoticesFile
} from "./about-dialog-constants"
import { IOssLibrary, OssLibrariesState, useOssLibraries } from "./use-oss-libraries"

import "../codap-modal-v3.scss"
import "./about-dialog.scss"

interface IProps {
  isOpen: boolean
  initialView: AboutDialogView
  returnFocusRef?: RefObject<HTMLElement>
  onClose: () => void
}

export function AboutDialog({ isOpen, initialView, returnFocusRef, onClose }: IProps) {
  const [view, setView] = useState<AboutDialogView>(initialView)

  // Reset the view and save the focus ref when the dialog opens, rather than in an effect,
  // so the initial view is rendered before Chakra moves focus into the dialog.
  const [wasOpen, setWasOpen] = useState(isOpen)
  const [openedReturnFocusRef, setOpenedReturnFocusRef] = useState(returnFocusRef)
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen)
    if (isOpen) {
      setView(initialView)
      setOpenedReturnFocusRef(returnFocusRef)
    }
  }

  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const headerBackButtonRef = useRef<HTMLButtonElement>(null)
  const acknowledgementsButtonRef = useRef<HTMLButtonElement>(null)
  const getStartedButtonRef = useRef<HTMLButtonElement>(null)
  const pendingFocusRef = useRef<RefObject<HTMLElement>>()
  const librariesState = useOssLibraries(isOpen && view !== "welcome")

  // Move focus to the element `showView()` asked for once the new view has rendered.
  useEffect(() => {
    pendingFocusRef.current?.current?.focus()
    pendingFocusRef.current = undefined
  }, [view])

  function showView(newView: AboutDialogView, focusTarget: RefObject<HTMLElement>) {
    pendingFocusRef.current = focusTarget
    setView(newView)
  }

  const titles: Record<AboutDialogView, string> = {
    welcome: t("V3.AboutDialog.welcome.title"),
    about: t("DG.AppController.showAboutTitle"),
    libraries: t("V3.AboutDialog.libraries.title")
  }
  const backButtonContent = <><span aria-hidden="true" className="back-arrow">‹&nbsp;</span>{t("V3.general.back")}</>

  return (
    <CodapModal
      closeOnOverlayClick={false}
      data-testid="about-dialog"
      isOpen={isOpen}
      onClose={onClose}
      isCentered={true}
      isDraggable={false}
      modalWidth="520px"
      initialRef={initialView === "welcome" ? getStartedButtonRef : undefined}
      finalFocusRef={openedReturnFocusRef}
      // CodapModal passes returnFocusOnClose through even when it's undefined, which overrides Chakra's default
      // of true. Without a returnFocusRef, focus should return to whatever had it before the dialog opened.
      returnFocusOnClose={true}
    >
      {/* The row uses the same classes as other v3 modal headers so it gets the same styling. */}
      <div className="chakra-modal__header codap-modal-header-v3">
        {view === "libraries" &&
          <Button
            className="text-button"
            ref={headerBackButtonRef}
            size="xs"
            variant="v3Clear"
            ml="2"
            onClick={() => showView("about", acknowledgementsButtonRef)}
            data-testid="about-dialog-header-back"
          >
            {backButtonContent}
          </Button>
        }
        {/* Chakra names the dialog with the full text of ModalHeader, so only the title goes in it. */}
        <ModalHeader as="h2" className="codap-header-title-v3" p={0} flex="1" boxShadow="none">
          {titles[view]}
        </ModalHeader>
        <ModalCloseButton ref={closeButtonRef} data-testid="modal-close-button"/>
      </div>
      <ModalBody>
        <div className="about-dialog-body">
          {view === "welcome" && <WelcomeView/>}
          {view === "about" &&
            <AboutView
              acknowledgementsButtonRef={acknowledgementsButtonRef}
              librariesState={librariesState}
              onShowLibraries={() => showView("libraries", headerBackButtonRef)}
            />
          }
          {view === "libraries" && <LibrariesView librariesState={librariesState}/>}
        </div>
      </ModalBody>
      <ModalFooter>
        {view === "welcome"
          ? <WelcomeFooter
              getStartedButtonRef={getStartedButtonRef}
              onShowAbout={() => showView("about", closeButtonRef)}
              onClose={onClose}
            />
          : <>
              {view === "libraries" &&
                <Button size="xs" variant="v3Clear" ml="3" onClick={() => showView("about", acknowledgementsButtonRef)}
                    data-testid="about-dialog-footer-back">
                  {backButtonContent}
                </Button>
              }
              <Button size="xs" variant="v3Default" ml="3" onClick={onClose} data-testid="about-dialog-close-button">
                {t("V3.general.close")}
              </Button>
            </>
        }
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

function CodapLogo() {
  return <img className="about-dialog-logo" src={AboutScreenLogo} alt={t("V3.AboutDialog.logoAlt")}/>
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
        <CodapLogo/>
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
          termsOfUse: <ExternalLink href={kTermsOfUseUrl}>{t("V3.AboutDialog.termsOfUse")}</ExternalLink>,
          licensingPage:
            <ExternalLink href={kLicensingUrl}>{t("V3.AboutDialog.license.licensingPage")}</ExternalLink>,
          licensingEmail: <a href={`mailto:${kLicensingEmail}`}>{kLicensingEmail}</a>
        })}
      </p>
      <hr className="about-dialog-divider"/>
      <div className="about-dialog-links">
        <ExternalLink href={kTermsOfUseUrl} showArrow={true}>{t("V3.AboutDialog.termsOfUse")}</ExternalLink>
        <ExternalLink href={kLicensingUrl} showArrow={true}>
          {t("V3.AboutDialog.links.licensingDetails")}
        </ExternalLink>
        <ExternalLink href={kSourceCodeUrl} showArrow={true}>{t("V3.AboutDialog.links.sourceCode")}</ExternalLink>
      </div>
      <Button ref={acknowledgementsButtonRef} variant="v3Clear" size="sm" width="100%" mt="3"
          justifyContent="space-between" onClick={onShowLibraries} data-testid="about-dialog-acknowledgements">
        {t("V3.AboutDialog.acknowledgementsButton")}{" "}
        <span>
          {librariesState.libraries && `${projectCountText(librariesState.libraries.length)} `}
          <span aria-hidden="true">›</span>
        </span>
      </Button>
    </>
  )
}

function WelcomeView() {
  return (
    <div className="about-dialog-identity">
      <CodapLogo/>
      <p className="about-dialog-text welcome-dialog-margin">{t("V3.AboutDialog.welcome.intro")}</p>
    </div>
  )
}

interface IWelcomeFooterProps {
  getStartedButtonRef: RefObject<HTMLButtonElement>
  onShowAbout: () => void
  onClose: () => void
}

const WelcomeFooter = observer(function WelcomeFooter({
  getStartedButtonRef, onShowAbout, onClose
}: IWelcomeFooterProps) {
  return (
    <>
      <Checkbox
        size="sm"
        mr="auto"
        isChecked={persistentState.hideWelcome}
        data-testid="about-dialog-hide-welcome"
        onChange={e => persistentState.setHideWelcome(e.target.checked)}
      >
        {t("V3.AboutDialog.welcome.dontShowAgain")}
      </Checkbox>
      <Button size="xs" variant="v3Clear" ml="3" onClick={onShowAbout} data-testid="about-dialog-show-about">
        {t("V3.AboutDialog.welcome.aboutButton")}
      </Button>
      <Button
        ref={getStartedButtonRef}
        size="xs"
        variant="v3Default"
        ml="3"
        onClick={onClose}
        data-testid="about-dialog-get-started"
      >
        {t("V3.AboutDialog.welcome.getStarted")}
      </Button>
    </>
  )
})

interface ILibrariesViewProps {
  librariesState: OssLibrariesState
}

function LibrariesView({ librariesState }: ILibrariesViewProps) {
  const [query, setQuery] = useState("")
  const lowerCaseQuery = query.trim().toLowerCase()
  const matches = useMemo(() => {
    const libraries = librariesState.libraries ?? []
    return libraries.filter(library => matchesQuery(library, lowerCaseQuery))
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
      <Input
        size="sm"
        mt="3"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={searchLabel}
        aria-label={searchLabel}
        data-testid="about-dialog-library-search"
      />
      <div
        className="about-dialog-library-list"
        tabIndex={0}
        role="region"
        aria-label={t("V3.AboutDialog.libraries.title")}
      >
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
