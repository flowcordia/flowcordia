import { useEffect, useState } from "react";
import { cn } from "~/utils/cn";

const logos = {
  light: "/brand/flowcordia-logo-black.svg",
  dark: "/brand/flowcordia-logo-white.svg",
};

export function FlowcordiaLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn("flowcordia-logo inline-flex size-8 shrink-0", className)}
      aria-hidden="true"
    >
      <img
        src={logos.light}
        alt=""
        width={381}
        height={359}
        className="flowcordia-logo-light h-full w-full object-contain"
      />
      <img
        src={logos.dark}
        alt=""
        width={381}
        height={359}
        className="flowcordia-logo-dark h-full w-full object-contain"
      />
    </span>
  );
}

export function FlowcordiaFavicon() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const update = () => setDark(root.dataset.appearance === "dark");
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ["data-appearance"] });
    return () => observer.disconnect();
  }, []);
  return <link rel="icon" type="image/svg+xml" href={dark ? logos.dark : logos.light} />;
}
