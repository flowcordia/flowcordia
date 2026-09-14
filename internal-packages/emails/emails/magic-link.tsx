import React from "react";
import { Body, Container, Head, Html, Link, Preview, Text } from "@react-email/components";
import { Footer } from "./components/Footer";
import { EmailBrand } from "./components/EmailBrand";
import { anchor, container, h1, main, paragraphLight } from "./components/styles";

export default function Email({ magicLink }: { magicLink: string }) {
  return (
    <Html>
      <Head />
      <Preview>Log in with this magic link 🪄</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={h1}>Log in to Flowcordia</Text>
          <Link
            href={magicLink}
            target="_blank"
            style={{
              ...anchor,
              display: "block",
            }}
          >
            Click here to log in with this magic link
          </Link>
          <Text
            style={{
              ...paragraphLight,
              display: "block",
              marginBottom: "50px",
            }}
          >
            If you didn&apos;t try to log in, you can safely ignore this email.
          </Text>
          <EmailBrand />
          <Footer />
        </Container>
      </Body>
    </Html>
  );
}
