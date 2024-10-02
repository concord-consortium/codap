import { AbstractPointerSensor, AbstractPointerSensorOptions, PointerEventHandlers, SensorProps } from "@dnd-kit/core"
// import { SyntheticEventName } from "@dnd-kit/core/dist/types";
import { getOwnerDocument } from "@dnd-kit/utilities"

const events: PointerEventHandlers = {
  move: { name: "pointermove" },
  end: { name: "pointerup" },
}

export interface PluginSensorOptions extends AbstractPointerSensorOptions {}

export type PluginSensorProps = SensorProps<PluginSensorOptions>;

export class PluginSensor extends AbstractPointerSensor {
  constructor(props: PluginSensorProps) {
    const { event } = props
    // Pointer events stop firing if the target is unmounted while dragging
    // Therefore we attach listeners to the owner document instead
    const listenerTarget = getOwnerDocument(event.target)

    super(props, events, listenerTarget)
  }

  static activators = [
    {
      eventName: 'onDragStart' as const,
      handler: (
        event: Event,
        { onActivation }: PluginSensorOptions
      ) => {
        // if (!event || event.button !== 0) {
        //   return false
        // }

        onActivation?.({ event })

        console.log(`--- starting drag`)
        return true
      },
    }
  ];
}
