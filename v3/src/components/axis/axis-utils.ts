

export const getCategoricalLabelPlacement = (place: AxisPlace) => {
  switch (place) {
    case "bottom":
      return "bottom"
    case "left":
      return "left"
  }
}