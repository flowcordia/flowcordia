import { MoonIcon, SunIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../primitives/Buttons";
import { SimpleTooltip } from "../primitives/Tooltip";

const storageKey = "flowcordia.appearance";

export function FlowcordiaThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `try{document.documentElement.dataset.appearance=localStorage.getItem("${storageKey}")==="dark"?"dark":"light"}catch{document.documentElement.dataset.appearance="light"}`,
      }}
    />
  );
}

export function FlowcordiaThemeToggle({ isCollapsed }: { isCollapsed: boolean }) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const readTheme = () => setDark(document.documentElement.dataset.appearance === "dark");
    const synchronize = (event: StorageEvent) => {
      if (event.key !== storageKey && event.key !== null) return;
      document.documentElement.dataset.appearance = event.newValue === "dark" ? "dark" : "light";
      readTheme();
    };
    readTheme();
    window.addEventListener("storage", synchronize);
    return () => window.removeEventListener("storage", synchronize);
  }, []);

  const label = dark ? "Switch to light mode" : "Switch to dark mode";
  return (
    <SimpleTooltip
      content={label}
      side="right"
      hidden={!isCollapsed}
      asChild
      button={
        <Button
          variant="minimal/medium"
          className={isCollapsed ? "size-8 p-0" : "w-full justify-start"}
          LeadingIcon={dark ? SunIcon : MoonIcon}
          aria-label={label}
          onClick={() => {
            const next = !dark;
            document.documentElement.dataset.appearance = next ? "dark" : "light";
            setDark(next);
            try {
              localStorage.setItem(storageKey, next ? "dark" : "light");
            } catch {
              // Appearance still works when browser storage is unavailable.
            }
          }}
        >
          {!isCollapsed && (dark ? "Light appearance" : "Dark appearance")}
        </Button>
      }
    />
  );
}
