import React from "react";
import { Body, Head, Html, Link, Preview, Text } from "@react-email/components";
import { EmailBrand } from "./components/EmailBrand";
import { Footer } from "./components/Footer";
import { anchor, main, paragraphLight } from "./components/styles";

export default function Email({ name }: { name?: string }) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Flowcordia</Preview>
      <Body style={main}>
        <EmailBrand />
        <Text style={paragraphLight}>Hello {name ?? "there"},</Text>
        <Text style={paragraphLight}>Welcome to Flowcordia.</Text>
        <Text style={paragraphLight}>
          Open your workspace to create a workflow, connect your repository, or review your runs.
        </Text>
        <Text style={paragraphLight}>
          <Link style={anchor} href="https://flowcordia.com/docs">
            Documentation
          </Link>
          {" | "}
          <Link style={anchor} href="https://flowcordia.com/contact">
            Contact
          </Link>
        </Text>
        <Footer />
      </Body>
    </Html>
  );
}
