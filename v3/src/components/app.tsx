import React from "react";
import { Text } from "./text";
import { useSampleText } from "../hooks/use-sample-text";
import Icon from "../assets/concord.png";

import "./app.scss";

export const App = () => {
  const sampleText = useSampleText();
  return (
    <div className="app">
      <img src={Icon}/>
      <Text text={sampleText} />
    </div>
  );
};
