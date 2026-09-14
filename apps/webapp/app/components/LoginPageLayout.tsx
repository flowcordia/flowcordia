import { BookOpenIcon } from "lucide-react";
import { Link } from "@remix-run/react";
import { FlowcordiaLogo } from "./FlowcordiaLogo";
import { LinkButton } from "./primitives/Buttons";
import { TextLink } from "./primitives/TextLink";

export function LoginPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex h-full min-h-0 flex-col overflow-y-auto bg-background-dimmed">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-6 py-5 sm:px-10">
        <Link to="/" className="flex items-center gap-2.5 text-lg font-semibold text-text-bright">
          <FlowcordiaLogo />
          Flowcordia
          <span className="text-xs font-normal text-text-dimmed">Beta</span>
        </Link>
        <LinkButton
          to="https://flowcordia-site-beta.vercel.app/docs"
          variant="minimal/small"
          LeadingIcon={BookOpenIcon}
        >
          Documentation
        </LinkButton>
      </header>
      <div className="mx-auto flex w-full max-w-md flex-1 items-center px-6 py-12">
        <div className="w-full">{children}</div>
      </div>
      <footer className="px-6 py-6 text-center text-sm text-text-dimmed">
        <TextLink href="https://github.com/ahamdjin/Flowcordia/issues">
          Report a sign-in problem
        </TextLink>
      </footer>
    </main>
  );
}
