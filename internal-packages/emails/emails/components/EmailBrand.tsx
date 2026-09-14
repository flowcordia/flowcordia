import React from "react";
import { Text } from "@react-email/components";
import { sans } from "./styles";

export function EmailBrand() {
  return (
    <Text style={{ ...sans, color: "#ffffff", fontSize: "20px", fontWeight: 600 }}>Flowcordia</Text>
  );
}
