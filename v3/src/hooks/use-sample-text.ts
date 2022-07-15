import { useState } from "react";
import t from "../utils/translation/translate";

export const useSampleText = () => {
  // `useState` is unnecessary here. But it's used so this function works like a real hook and requires special testing.
  // If this function was only returning "Hello World", we wouldn't need any special approach to testing.
  const [text] = useState(t("INTRO.HELLO"));
  return text;
};
