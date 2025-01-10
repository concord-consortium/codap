export interface IBasicNotificationValue {
  operation: string
  result: any
}

export interface IGlobalNotificationValue {
  globalValue: number
}

export type ICoreNotificationMessageValues = IBasicNotificationValue | IGlobalNotificationValue

export interface INotification<ValuesType> {
  message: {
    action: string
    resource: string
    values: ValuesType
  }
  callback?: (value: any) => void
}

export type ICoreNotification = INotification<ICoreNotificationMessageValues>
