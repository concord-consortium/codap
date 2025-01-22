export interface IBasicNotificationValue {
  operation: string
  result: any
}

export interface IGlobalNotificationValue {
  globalValue: number
}

export type ICoreNotificationMessageValues = IBasicNotificationValue | IGlobalNotificationValue

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
