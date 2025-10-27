import { createContext, useContext, useState } from 'react'

interface ProgressContextMessageOptions {
  lightbox?: boolean
}

type ProgressContextType = {
  progressMessage?: string
  progressMessageOptions?: ProgressContextMessageOptions
  setProgressMessage: (message?: string, options?: ProgressContextMessageOptions) => void
  clearProgressMessage: () => void
}

export const ProgressContext = createContext<ProgressContextType>({
  progressMessage: undefined,
  progressMessageOptions: undefined,
  setProgressMessage: () => {},
  clearProgressMessage: () => {}
})

export const ProgressProvider = ProgressContext.Provider

export const useProgress = () => useContext(ProgressContext)

export const useProgressContextProviderValue = (): ProgressContextType => {
  const [progressMessage, _setProgressMessage] = useState<string | undefined>(undefined)
  const [progressMessageOptions, setProgressMessageOptions] =
    useState<ProgressContextMessageOptions | undefined>(undefined)

  const setProgressMessage = (message?: string, options?: ProgressContextMessageOptions) => {
    _setProgressMessage(message)
    setProgressMessageOptions(options)
  }

  const clearProgressMessage = () => setProgressMessage(undefined)

  return { progressMessage, progressMessageOptions, setProgressMessage, clearProgressMessage }
}
