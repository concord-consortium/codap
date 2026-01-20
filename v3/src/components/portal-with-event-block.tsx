import { Portal } from "@chakra-ui/react"
import { ReactNode } from "react"

/*
  By default, React events bubble up through portals following the React component hierarchy rather
  than the portaled DOM hierarchy (https://reactjs.org/docs/portals.html#event-bubbling-through-portals).
  This has been the source of much consternation in the React community
  (https://github.com/facebook/react/issues/11387). The semi-official React response is to suggest moving
  the portals outside the parts of the component tree that have potentially interfering event handlers
  (https://github.com/facebook/react/issues/11387#issuecomment-366142349), but given that this requires
  coupling the portaling behavior of a given component to all of its potentially interfering parents,
  this can only safely be accomplished by moving all portaling to the top level of the application, which
  effectively negates the purpose of portaling in the first place. The other suggested approach is to
  implement a portal which prevents events from bubbling up to parents (e.g.
  https://github.com/facebook/react/issues/11387#issuecomment-355395803). Unfortunately, existing portal
  implementations (including Chakra's) apparently rely on the fact that some events bubble up through
  portals. Therefore, this component implements a configurable event-blocking portal which blocks only
  the events that clients specify should be blocked.
 */

const stop = (evt: Event) => evt.stopPropagation()

interface IProps {
  blockedEvents?: string[]
  children: ReactNode
}
export const PortalWithEventBlock = ({ blockedEvents, children, ...portalProps }: IProps) => {
  const handlers: Record<string, (evt: Event) => void> = {}
  blockedEvents?.forEach(name => {
    handlers[name] = stop
    handlers[`${name}Capture`] = stop
  })
  return (
    <div className="portal-event-block" {...handlers}>
      <Portal {...portalProps}>
        {children}
      </Portal>
    </div>
  )
}
