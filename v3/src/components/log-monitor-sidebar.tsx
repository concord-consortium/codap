import { useEffect, useRef } from "react"
import { LogMonitor, emitLogEvent } from "@concord-consortium/log-monitor"
import { Logger } from "../lib/logger"
import { booleanParam, urlParams } from "../utilities/url-params"

const logMonitorEnabled = booleanParam(urlParams.logMonitor)

export function LogMonitorSidebar() {
  const registeredRef = useRef(false)

  useEffect(() => {
    if (!logMonitorEnabled || registeredRef.current) {
      return
    }
    registeredRef.current = true
    // Static registerLogListener handles pre-init registration via pending queue,
    // so no polling needed.
    Logger.registerLogListener((logMessage) => {
      const { event, ...data } = logMessage
      emitLogEvent({ event, data, timestamp: Date.now() })
    })
  }, [])

  if (!logMonitorEnabled) {
    return null
  }
  return <LogMonitor logFilePrefix="codap-log-events" />
}
