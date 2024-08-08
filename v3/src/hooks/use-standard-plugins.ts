import { useEffect, useState } from "react"
import { kRootPluginUrl } from "../components/web-view/web-view-utils"

const pluginConfigUrl = `${kRootPluginUrl}/published-plugins.json`

export interface PluginData {
  aegis?: string,
  categories: string[],
  description: string,
  "description-string"?: string,
  height: number,
  icon: string,
  isStandard: "true" | "false", // All have "true" for some reason
  path: string,
  title: string,
  "title-string"?: string,
  visible: boolean | "true" | "false", // Most have "true" or "false" for some reason, but a couple have true
  width: number
}

export function useStandardPlugins() {
  const [status, setStatus] = useState<"pending" | "complete" | "error">("pending")
  const [plugins, setPlugins] = useState<PluginData[]>([])

  useEffect(() => {
    async function retrievePluginConfig() {
      try {
        const response = await fetch(pluginConfigUrl)
        if (!response.ok) throw new Error(`Network error: ${response.status}`)
        const jsonResponse = await response.json()
        setPlugins(jsonResponse)
        setStatus("complete")
      } catch (error) {
        console.warn("Unable to load plugin data:", error)
        setStatus("error")
      }
    }

    // TODO: retry periodically on failure; perhaps a built-in default configuration
    retrievePluginConfig()
  }, [])

  return { status, plugins }
}
