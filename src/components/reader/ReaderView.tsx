import type { CSSProperties, ReactNode } from "react";
import { renderContent } from "@/lib/contentRenderer";
import type { DocNode } from "@/types";
import type { ReaderPrefs, ReaderFont } from "@/hooks/useReaderPrefs";

interface Props {
  title?: string | null | undefined;
  storyTitle?: string | undefined;
  content: DocNode | null;
  prefs: ReaderPrefs;
  footer?: ReactNode | undefined;
}

/**
 * The single source of typographic truth. Writers supply structure only;
 * everything visual is decided here.
 */
export function ReaderView({ title, storyTitle, content, prefs, footer }: Props) {
  const fontMap: Record<ReaderFont, string> = {
    serif: '"Lora", Georgia, serif',
    sans: '"Nunito Sans", ui-sans-serif, system-ui, sans-serif',
    dyslexic: 'OpenDyslexic, Lexend, "Comic Sans MS", sans-serif',
  };

  const style = {
    "--reader-size": `${prefs.size}px`,
    "--reader-leading": String(prefs.leading),
    "--font-reading": fontMap[prefs.font],
    maxWidth: `${prefs.width}ch`,
    textAlign: prefs.justify ? "justify" : "left",
  } as CSSProperties;

  return (
    <article className="mx-auto px-6 pb-32 pt-10" style={style}>
      {storyTitle ? (
        <p className="font-sans text-[0.7rem] uppercase tracking-[0.2em] text-[var(--reader-soft)]">
          {storyTitle}
        </p>
      ) : null}
      {title ? (
        <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-[var(--reader-fg)]">
          {title}
        </h1>
      ) : null}
      <div className="mt-8 h-px w-16 bg-[var(--reader-rule)]" />
      <div className="reader-prose mt-8">{renderContent(content)}</div>
      {footer ? <div className="mt-16">{footer}</div> : null}
    </article>
  );
}
