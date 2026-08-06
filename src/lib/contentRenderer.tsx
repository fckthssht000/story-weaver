/**
 * Renders constrained Tiptap JSON into React elements.
 *
 * Non-negotiable rule: nothing here reads inline styles, colours or sizes from
 * the document. Typography is owned entirely by the reader's CSS.
 */
import { Fragment, type ReactNode } from "react";
import type { DocNode } from "@/types";

function renderMarks(text: ReactNode, marks: DocNode["marks"]): ReactNode {
  if (!marks?.length) return text;
  return marks.reduce<ReactNode>((acc, mark) => {
    switch (mark.type) {
      case "bold":
        return <strong>{acc}</strong>;
      case "italic":
        return <em>{acc}</em>;
      case "strike":
        return <s>{acc}</s>;
      case "code":
        return <code>{acc}</code>;
      default:
        return acc;
    }
  }, text);
}

function renderNode(node: DocNode, key: number): ReactNode {
  const children = node.content?.map((child, i) => renderNode(child, i));

  switch (node.type) {
    case "doc":
      return <Fragment key={key}>{children}</Fragment>;
    case "paragraph":
      return <p key={key}>{children?.length ? children : <br />}</p>;
    case "heading": {
      const level = Math.min(Math.max(Number(node.attrs?.["level"] ?? 2), 1), 3);
      if (level === 1) return <h1 key={key}>{children}</h1>;
      if (level === 2) return <h2 key={key}>{children}</h2>;
      return <h3 key={key}>{children}</h3>;
    }
    case "blockquote":
      return <blockquote key={key}>{children}</blockquote>;
    case "bulletList":
      return <ul key={key}>{children}</ul>;
    case "orderedList":
      return <ol key={key}>{children}</ol>;
    case "listItem":
      return <li key={key}>{children}</li>;
    case "horizontalRule":
      return <hr key={key} />;
    case "hardBreak":
      return <br key={key} />;
    case "image": {
      const src = typeof node.attrs?.["src"] === "string" ? node.attrs["src"] : "";
      const alt = typeof node.attrs?.["alt"] === "string" ? node.attrs["alt"] : "";
      if (!src) return null;
      return <img key={key} src={src} alt={alt} loading="lazy" />;
    }
    case "text":
      return <Fragment key={key}>{renderMarks(node.text ?? "", node.marks)}</Fragment>;
    default:
      return children ? <Fragment key={key}>{children}</Fragment> : null;
  }
}

export function renderContent(doc: DocNode | null | undefined): ReactNode {
  if (!doc) return null;
  return renderNode(doc, 0);
}

/** Plain-text extraction, used for excerpts and word counts. */
export function docToText(doc: DocNode | null | undefined): string {
  if (!doc) return "";
  let out = "";
  const walk = (n: DocNode) => {
    if (n.type === "text") out += n.text ?? "";
    if (n.content) {
      n.content.forEach(walk);
      if (["paragraph", "heading", "blockquote", "listItem"].includes(n.type)) out += " ";
    }
  };
  walk(doc);
  return out.replace(/\s+/g, " ").trim();
}

export function wordCount(doc: DocNode | null | undefined): number {
  const text = docToText(doc);
  return text ? text.split(" ").length : 0;
}

export function readingMinutes(words: number) {
  return Math.max(1, Math.round(words / 220));
}
