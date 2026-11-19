import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { Label, Slider, SliderTrack } from "react-aria-components"
import { ValueTextSliderThumb } from "./value-text-slider-thumb"

function TestSlider({ isDisabled = false }: { isDisabled?: boolean }) {
  const [value, setValue] = useState(50)
  return (
    <Slider value={value} onChange={setValue} isDisabled={isDisabled}>
      <Label>Speed</Label>
      <SliderTrack>
        <ValueTextSliderThumb valueText={`${value} mph`}/>
      </SliderTrack>
    </Slider>
  )
}

describe("ValueTextSliderThumb", () => {
  it("announces the value text, labeled by the slider's label", () => {
    render(<TestSlider/>)
    const input = screen.getByRole("slider", { name: "Speed" })
    expect(input).toHaveAttribute("aria-valuetext", "50 mph")
    expect(input).toHaveAttribute("value", "50")
  })

  it("updates the value text as the value changes", async () => {
    const user = userEvent.setup()
    render(<TestSlider/>)
    const input = screen.getByRole("slider")
    act(() => input.focus())
    await user.keyboard("{ArrowRight}")
    expect(input).toHaveAttribute("value", "51")
    expect(input).toHaveAttribute("aria-valuetext", "51 mph")
  })

  it("renders the class and data attributes that SliderThumb's styles use", async () => {
    const user = userEvent.setup()
    render(<TestSlider/>)
    const input = screen.getByRole("slider")
    // eslint-disable-next-line testing-library/no-node-access -- the thumb is the input's styled container
    const thumb = input.closest(".react-aria-SliderThumb")
    expect(thumb).toBeInTheDocument()
    expect(thumb).not.toHaveAttribute("data-focus-visible")
    await user.tab()
    expect(thumb).toHaveAttribute("data-focus-visible", "true")
  })

  it("is disabled with the slider", () => {
    render(<TestSlider isDisabled={true}/>)
    const input = screen.getByRole("slider")
    expect(input).toBeDisabled()
    // eslint-disable-next-line testing-library/no-node-access -- the thumb is the input's styled container
    expect(input.closest(".react-aria-SliderThumb")).toHaveAttribute("data-disabled", "true")
  })
})
