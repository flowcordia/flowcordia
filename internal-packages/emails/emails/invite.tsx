import { Body, Container, Head, Html, Link, Preview, Text } from "@react-email/components";
import { z } from "zod";
import { Footer } from "./components/Footer";
import { EmailBrand } from "./components/EmailBrand";
import { anchor, container, h1, main, paragraphLight } from "./components/styles";

export const InviteEmailSchema = z.object({
  email: z.literal("invite"),
  orgName: z.string(),
  inviterName: z.string().optional(),
  inviterEmail: z.string(),
  inviteLink: z.string().url(),
});

export default function Email({
  orgName,
  inviterName,
  inviterEmail,
  inviteLink,
}: z.infer<typeof InviteEmailSchema>) {
  return (
    <Html>
      <Head />
      <Preview>{`You've been invited to ${orgName}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={h1}>{`You've been invited to ${orgName}`}</Text>
          <Text style={paragraphLight}>
            {inviterName ?? inviterEmail} has invited you to join their organization on Flowcordia.
          </Text>
          <Link
            href={inviteLink}
            target="_blank"
            style={{
              ...anchor,
              display: "block",
              marginBottom: "50px",
            }}
          >
            Click here to view the invitation
          </Link>

          <EmailBrand />
          <Footer />
        </Container>
      </Body>
    </Html>
  );
}
