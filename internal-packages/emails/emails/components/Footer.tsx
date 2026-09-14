import { Hr, Link, Text } from "@react-email/components";
import React from "react";
import { footer, footerAnchor, hr } from "./styles";

export function Footer() {
  return (
    <>
      <Hr style={hr} />
      <Text style={footer}>
        <Link style={footerAnchor} href="https://flowcordia.com/">
          Flowcordia
        </Link>
        {" | "}
        <Link style={footerAnchor} href="https://flowcordia.com/privacy">
          Privacy
        </Link>
      </Text>
    </>
  );
}
