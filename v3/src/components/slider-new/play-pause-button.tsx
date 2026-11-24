// PROTOTYPE: play/pause button restyled to match CODAP's other buttons
// (light-blue fill + teal border like the title pill, accent-coloured glyph and label).
import { clsx } from "clsx"
import { t } from "../../utilities/translation/translate"
// Mike's 24x24 icons; their baked-in #006C8E fill is overridden in slider.scss so the colour follows state
import PauseIcon from "./icons/Pause ICON.svg"
import PlayIcon from "./icons/Play ICON.svg"

interface IProps {
  running: boolean
  onClick: () => void
}

export function PlayPauseButton({ running, onClick }: IProps) {
  return (
    <button
      // "Play slider" / "Pause slider" -- these begin with the visible label, as WCAG 2.5.3 asks
      aria-label={running ? t("DG.SliderView.pauseButton") : t("DG.SliderView.playButton")}
      className={clsx("play-pause", running ? "running" : "paused")}
      data-testid="slider-play-pause"
      onClick={onClick}
    >
      <span className="play-pause-face">
        {running
          ? <PauseIcon className="glyph" aria-hidden="true" />
          : <PlayIcon className="glyph" aria-hidden="true" />}
        {/* both words share one grid cell, so the button keeps the wider word's width
            and the readout beside it doesn't shift when the label changes */}
        <span className="play-pause-label">
          <span className={clsx({ hidden: running })}>Play</span>
          <span className={clsx({ hidden: !running })}>Pause</span>
        </span>
      </span>
    </button>
  )
}
