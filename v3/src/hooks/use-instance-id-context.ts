import { createContext, useContext, useMemo } from "react"

export const InstanceIdContext = createContext<string | undefined>(undefined)

const sInstanceIds = new Map<string, number>()

export const useNextInstanceId = (base: string) => {
  return useMemo(() => {
    const nextId = (sInstanceIds.get(base) ?? 0) + 1
    sInstanceIds.set(base, nextId)
    return `${base}-${nextId}`
  }, [base])
}

export const useInstanceIdContext = () => {
  return useContext(InstanceIdContext)
}
