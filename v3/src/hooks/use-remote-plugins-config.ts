import { useEffect, useState } from "react"
import { useMemo } from "use-memo-one"
import { PluginMenuConfig } from "../components/tool-shelf/plugin-config-types"
import { urlParams } from "../utilities/url-params"

export function useRemotePluginsConfig() {
  const morePluginsParam = urlParams.morePlugins
  const morePluginsUrl = useMemo(() => {
    return typeof morePluginsParam === "string" ? morePluginsParam : undefined
  }, [morePluginsParam])
  const [status, setStatus] = useState<"initial" | "pending" | "complete" | "error">("initial")
  const [plugins, setPlugins] = useState<PluginMenuConfig>([])

  useEffect(() => {
    async function retrievePluginMenuConfig(url: string) {
      try {
        setStatus("pending")
        const response = await fetch(url)
        if (!response.ok) throw new Error(`Network error: ${response.status}`)
        const jsonResponse = await response.json()
        setPlugins(jsonResponse)
        setStatus("complete")
      } catch (error) {
        console.warn("Unable to load plugin data:", error)
        setStatus("error")
      }
    }

    // TODO: retry periodically on failure?
    if (morePluginsUrl) {
      retrievePluginMenuConfig(morePluginsUrl)
    }
  }, [morePluginsUrl])

  return { status, plugins }
}
