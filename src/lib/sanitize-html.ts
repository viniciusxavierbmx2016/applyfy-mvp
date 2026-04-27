import sanitize from "sanitize-html";

const OPTIONS: sanitize.IOptions = {
  allowedTags: [
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
    "blockquote",
    "code",
    "pre",
    "h1",
    "h2",
    "h3",
    "span",
    "img",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel", "title"],
    span: ["class"],
    img: ["src", "alt", "width", "height", "style", "class"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: sanitize.simpleTransform("a", {
      rel: "noopener noreferrer nofollow",
      target: "_blank",
    }),
  },
};

export function sanitizeHtml(dirty: string): string {
  return sanitize(dirty, OPTIONS);
}

export function stripHtml(html: string): string {
  return sanitize(html, { allowedTags: [], allowedAttributes: {} }).trim();
}
