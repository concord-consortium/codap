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

    // Logger may not be initialized yet; poll briefly until it is.
    const id = setInterval(() => {
      if (!Logger.isInitialized) {
        return
      }
      clearInterval(id)
      registeredRef.current = true
      Logger.Instance.registerLogListener((logMessage) => {
        const { event, ...data } = logMessage
        emitLogEvent({ event, data, timestamp: Date.now() })
      })
    }, 100)

    return () => clearInterval(id)
  }, [])

  if (!logMonitorEnabled) return null
  return <LogMonitor logFilePrefix="codap-log-events" />
}
