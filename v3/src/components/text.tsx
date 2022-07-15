import React from "react";

interface IProps {
  text: string;
}

export const Text: React.FC<IProps> = ({ text }) => (
  <div>{ text }</div>
);
