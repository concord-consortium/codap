import { Logger } from "../logger"

export function handleLogLaraData(obj: Record<string, unknown>) {
  if (typeof obj.run_remote_endpoint === "string") {
    Logger.setRunRemoteEndpoint(obj.run_remote_endpoint)
  }
  Logger.log("laraData", obj)
}
