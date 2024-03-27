import iframePhone from "iframe-phone"
import { observable } from "mobx"

// TODO any type
export interface Notification {
  message: any
  callback: iframePhone.ListenerCallback
}
export const notifications = observable.array<Notification>()

export function broadcastNotification(notification: Notification) {
  console.log(`*** broadcastNotificaiton`)
  notifications.push(notification)
  console.log(` ** notifications`, notifications)
}

export function getNotificaiton() {
  return notifications.shift()
}
