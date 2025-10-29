import { nanoid } from "nanoid"
import { debugLog, DEBUG_LOGGER } from "./debug"
import { IDocumentModel } from "../models/document/document"
import { AnalyticsCategory, mockGA } from "./analytics"

// Set to true (temporarily) to debug logging to server specifically.
// Otherwise, we assume that console.logs are sufficient.
const DEBUG_LOG_TO_SERVER = !DEBUG_LOGGER

type LoggerEnvironment = "dev" | "production"

const logManagerUrl: Record<LoggerEnvironment, string> = {
  dev: "https://logger.concordqa.org/logs",
  production: "https://logger.concord.org/logs"
}

export interface LogMessage {
  // these top-level properties are treated specially by the log-ingester:
  // https://github.com/concord-consortium/log-ingester/blob/a8b16fdb02f4cef1f06965a55c5ec6c1f5d3ae1b/canonicalize.js#L3
  application: string
  activity?: string
  event: string
  event_value?: string
  run_remote_endpoint?: string
  session: string
  time: number

  // the rest of the properties are packaged into `extras` by the log-ingester
  parameters?: Record<string, unknown>
}

// List of log messages that were generated before a Logger is initialized
// will be sent when possible.
interface PendingMessage {
  time: number
  event: string
  documentTitle: string
  category: AnalyticsCategory
  event_value?: string
  parameters?: Record<string, unknown>
}

type GAEventArgs = Record<string, Maybe<string | number | boolean>>
interface IGAData {
  readonly eventCategory: AnalyticsCategory;
  readonly eventAction: string;
  readonly eventArgs?: GAEventArgs;
  readonly eventLabel: string;
}

// We limit the arguments that are logged to GA to avoid sending too much data.
const kGAEventArgNamesToLog = ["filename", "url"]

function extractGAEventArgs(args?: Record<string, unknown>): Maybe<GAEventArgs> {
  if (!args) return undefined
  const gaEventArgs: GAEventArgs = {}
  for (const argName of kGAEventArgNamesToLog) {
    if (argName in args) {
      const value = args[argName]
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        gaEventArgs[argName] = value
      }
    }
  }
  return Object.keys(gaEventArgs).length > 0 ? gaEventArgs : undefined
}

interface IAnalyticsService {
  gtag?: (type: "event", event: string, data: IGAData) => void;
}

type ILogListener = (logMessage: LogMessage) => void

export class Logger {
  public static isLoggingEnabled =
    typeof window !== "undefined" && window.location.hostname.toLowerCase().endsWith(".concord.org")
    || DEBUG_LOGGER
  private static _instance: Logger
  private static pendingMessages: PendingMessage[] = []

  public static initializeLogger(document: IDocumentModel) {
    debugLog(DEBUG_LOGGER, "Logger#initializeLogger called.")
    this._instance = new Logger(document)
    this.sendPendingMessages()
  }

  public static updateDocument(document: IDocumentModel) {
    if (this._instance) {
      this._instance.document = document
    } else {
      console.error("Logger instance is not initialized.")
    }
  }

  public static log(event: string, args?: Record<string, unknown>, category: AnalyticsCategory = "general") {
    if (!this._instance) return

    const time = Date.now() // eventually we will want server skew (or to add this via FB directly)
    const documentTitle = this._instance.document.title
    if (this._instance) {
      this._instance.formatAndSend(time, event, documentTitle, category, args)
    } else {
      debugLog(DEBUG_LOGGER, "Queueing log message for later delivery", event)
      const event_value = args ? JSON.stringify(args) : undefined
      this.pendingMessages.push({ time, event, documentTitle, category, event_value, parameters: args })
    }
  }

  private static sendPendingMessages() {
    if (!this._instance) return
    for (const message of this.pendingMessages) {
      this._instance.formatAndSend(message.time, message.event, message.documentTitle,
                                    message.category, message.parameters)
    }
    this.pendingMessages = []
  }

  public static get Instance() {
    if (this._instance) {
      return this._instance
    }
    throw new Error("Logger not initialized yet.")
  }

  private document: IDocumentModel
  private session: string
  private logListeners: ILogListener[] = []

  private constructor(document: IDocumentModel) {
    this.document = document
    this.session = nanoid()
  }

  public registerLogListener(listener: ILogListener) {
    this.logListeners.push(listener)
  }

  private formatAndSend(
    time: number, event: string, documentTitle: string,
    category: AnalyticsCategory = "general", args?: Record<string, unknown>,
  ) {
    const event_value = JSON.stringify(args)
    const logMessage = this.createLogMessage(time, event, documentTitle, event_value, args)
    debugLog(DEBUG_LOGGER, "logMessage:", logMessage)
    sendToLoggingService(logMessage)
    sendToAnalyticsService(event, category, extractGAEventArgs(args))
  }

  private createLogMessage(
    time: number,
    event: string,
    documentTitle: string,
    event_value?: string,
    parameters?: Record<string, unknown>,
  ): LogMessage {
    const logMessage: LogMessage = {
      application: "CODAPV3",
      activity: documentTitle,
      session: this.session,
      time,
      event,
      event_value,
      parameters,
    }

    // if (loggingRemoteEndpoint) {
    //   logMessage.run_remote_endpoint = loggingRemoteEndpoint
    // }

    return logMessage
  }
}

function sendToLoggingService(data: LogMessage) {
  // const isProduction = user.portal === productionPortal || data.parameters?.portal === productionPortal
  // const url = logManagerUrl[isProduction ? "production" : "dev"]
  const url = logManagerUrl.dev

  if (!Logger.isLoggingEnabled || !DEBUG_LOG_TO_SERVER) return

  debugLog(DEBUG_LOGGER, "Logger#sendToLoggingService sending", data, "to", url)

  const request = new XMLHttpRequest()

  // request.upload.addEventListener("load", () => user.setIsLoggingConnected(true))
  // request.upload.addEventListener("error", () => user.setIsLoggingConnected(false))
  // request.upload.addEventListener("abort", () => user.setIsLoggingConnected(false))

  request.open("POST", url, true)
  request.setRequestHeader("Content-Type", "application/json; charset=UTF-8")
  request.send(JSON.stringify(data))
}

function sendToAnalyticsService(eventAction: string, eventCategory: AnalyticsCategory, eventArgs?: GAEventArgs) {
  const windowWithPossibleGa = (window as IAnalyticsService)

  const payload: IGAData = {
    eventCategory,
    eventAction,
    eventArgs,
    eventLabel: "CODAPV3"
  }

  try {
    let gtagFunction
    if (Logger.isLoggingEnabled && DEBUG_LOG_TO_SERVER && windowWithPossibleGa.gtag instanceof Function) {
      gtagFunction = windowWithPossibleGa.gtag
    } else if (DEBUG_LOGGER && mockGA.gtag instanceof Function) {
      gtagFunction = mockGA.gtag
    } else {
      return
    }

    gtagFunction("event", eventAction, payload)
  } catch (e) {
    console.error("Unable to send Google Analytics:", e)
  }
}
