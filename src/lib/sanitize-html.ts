import DOMPurify from "isomorphic-dompurify";

const CONFIG = {
  ALLOWED_TAGS: [
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "ul",
    "ol",
    "li",
    "a",
    "img",
    "blockquote",
    "code",
    "pre",
    "h1",
    "h2",
    "h3",
    "span",
  ],
  ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "title"],
  ALLOWED_URI_REGEXP: /^(https?:|mailto:|\/|#)/i,
};

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, CONFIG);
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}
