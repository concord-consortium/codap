export interface IBasicNotificationValue {
  operation: string
  result: any
}

export interface IGlobalNotificationValue {
  globalValue: number
}

interface IComponentNotificationValue {
  id: number
  type: string
}

export type ICoreNotificationMessageValues = IBasicNotificationValue | IGlobalNotificationValue |
  IComponentNotificationValue

type NotificationCallback = (value: any) => void

export interface INotification<ValuesType> {
  message: {
    action: string
    resource: string
    values: ValuesType
  }
  callback?: NotificationCallback
}

export type ICoreNotification = INotification<ICoreNotificationMessageValues>

export interface ICoreNotifyFunctionEnv {
  notify: (
    message: ICoreNotification["message"],
    callback: NotificationCallback,
    notifyTileId?: string
  ) => void
}
