import { v4 as uuid } from "uuid"
import { LogEventMethod, LogEventName } from "./logger-types"
// import { IStores } from "../models/stores/stores"
import { debugLog, DEBUG_LOGGER } from "./debug"
import { IDocumentModel } from "../models/document/document"

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
  event_value: string
  run_remote_endpoint?: string
  session: string
  time: number

  // the rest of the properties are packaged into `extras` by the log-ingester
  parameters: any
}

// List of log messages that were generated before a Logger is initialized
// will be sent when possible.
interface PendingMessage {
  time: number
  event: LogEventName
  parameters?: Record<string, unknown>
  method?: LogEventMethod
}

type ILogListener = (logMessage: LogMessage) => void

export class Logger {
  public static isLoggingEnabled = false
  private static _instance: Logger
  private static pendingMessages: PendingMessage[] = []

  public static initializeLogger(document: IDocumentModel) {
  //Logging is enabled when origin server within this domain.
    // const logFromServer = "concord.org"
    // this.isLoggingEnabled = window.location.hostname.toLowerCase().endsWith(logFromServer) || DEBUG_LOGGER

    debugLog(DEBUG_LOGGER, "Logger#initializeLogger called.")
    console.log("in initializeLogger")
    this._instance = new Logger(document)
    this.sendPendingMessages()
  }

  // public static updateAppContext(appContext: Record<string, any>) {
  //   Object.assign(this._instance.appContext, appContext)
  // }

  public static log(event: LogEventName, parameters?: Record<string, unknown>) {
    console.log("in log event", event, parameters, this._instance)
    const time = Date.now() // eventually we will want server skew (or to add this via FB directly)
    if (this._instance) {
      this._instance.formatAndSend(time, event, parameters)
    } else {
      debugLog(DEBUG_LOGGER, "Queueing log message for later delivery", LogEventName[event])
      this.pendingMessages.push({ time, event, parameters })
    }
  }

  private static sendPendingMessages() {
    if (!this._instance) return
    for (const message of this.pendingMessages) {
      this._instance.formatAndSend(message.time, message.event, message.parameters, message.method)
    }
    this.pendingMessages = []
  }

  public static get Instance() {
    if (this._instance) {
      return this._instance
    }
    throw new Error("Logger not initialized yet.")
  }

  // public static get stores() {
  //   return this._instance?.stores
  // }

  // private stores: IStores
  // private appContext: Record<string, any> = {}
  private document: IDocumentModel
  private session: string
  private logListeners: ILogListener[] = []

  // private constructor(stores: IStores, appContext = {}) {
  private constructor(document: IDocumentModel) {
    // this.stores = stores
    this.document = document
    this.session = uuid()
  }

  public registerLogListener(listener: ILogListener) {
    this.logListeners.push(listener)
  }

  private formatAndSend(time: number,
      event: LogEventName, parameters?: Record<string, unknown>, method?: LogEventMethod) {
    const eventString = LogEventName[event]
    console.log("eventString", eventString)
    const logMessage = this.createLogMessage(time, eventString, parameters, method)
    console.log("logMessage", logMessage)
    // sendToLoggingService(logMessage, this.stores.user)
    // sendToLoggingService(logMessage)
    // for (const listener of this.logListeners) {
    //   listener(logMessage)
    // }
  }

  private createLogMessage(
    time: number,
    event: string,
    parameters?: {section?: string},
    method: LogEventMethod = LogEventMethod.DO
  ): LogMessage {
    // const {
    //   appConfig: { appName },
    //   studentWorkTabSelectedGroupId,
    //   persistentUI: { activeNavTab, navTabContentShown, problemWorkspace, teacherPanelKey },
    //   user: { activityUrl, classHash, id, isStudent, isTeacher, portal, type, currentGroupId,
    //           loggingRemoteEndpoint, firebaseDisconnects, loggingDisconnects, networkStatusAlerts
    // }} = this.stores
console.log("in createLogMessage document", this.document)
    const logMessage: LogMessage = {
      // application: appName,
      application: "CODAP",
      // activity: activityUrl,
      activity: this.document.title,
      session: this.session,
      // ...this.document,
      time,
      event,
      event_value: method,
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
  const url = logManagerUrl.production
  debugLog(DEBUG_LOGGER, "Logger#sendToLoggingService sending", data, "to", url)
  if (!Logger.isLoggingEnabled) return

  const request = new XMLHttpRequest()

  // request.upload.addEventListener("load", () => user.setIsLoggingConnected(true))
  // request.upload.addEventListener("error", () => user.setIsLoggingConnected(false))
  // request.upload.addEventListener("abort", () => user.setIsLoggingConnected(false))

  request.open("POST", url, true)
  request.setRequestHeader("Content-Type", "application/json charset=UTF-8")
  request.send(JSON.stringify(data))
}
