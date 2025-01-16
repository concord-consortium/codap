import { ICoreNotificationMessageValues, INotification } from "./notification-core-types"

export interface IDragNotificationValue {
    operation: string
    text?: string
    attribute: {
      id: number
      name?: string
      title?: string
    },
    collection?: {
      id: number
      name: string
      title: string
    }
    context: {
      id: number
      name: string
      title: string
    }
    [key: string]: any
  }

  export type IFullNotificationMessageValues = ICoreNotificationMessageValues | IDragNotificationValue

  export type IFullNotification = INotification<IFullNotificationMessageValues>
