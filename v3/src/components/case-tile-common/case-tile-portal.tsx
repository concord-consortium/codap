import { ReactNode } from "react"
import { PortalWithEventBlock } from "../portal-with-event-block"

/*
  See comment in PortalWithEventBlock for details on the broader problem being addressed here.
  In the specific case of the case table, ReactDataGrid adds an onPointerDown handler to resizable
  column headers to implement user-resizing of columns. That onPointerDown handler calls setPointerCapture,
  which prevents subsequent mouse events from being dispatched in the normal fashion. When portaled
  menus or dialogs are rendered from clicks in the case table header, events targeting the portaled
  menus or dialogs can bubble up to the case table, triggering the onPointerDown handler and preventing
  the portaled menus or dialogs from responding as expected. Therefore, we make use of PortalWithEventBlock
  to implement a case table-specific portal which blocks the onPointerDown event. If necessary, other events
  can be added to the list of blocked events as the need arises.
 */
export const CaseTilePortal = ({ children }: { children: ReactNode }) => {
  return (
    <PortalWithEventBlock blockedEvents={["onPointerDown"]}>
      {children}
    </PortalWithEventBlock>
  )
}
