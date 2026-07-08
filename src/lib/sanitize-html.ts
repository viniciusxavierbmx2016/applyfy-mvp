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

// Permissive allowlist for producer-authored email HTML (buildAccessEmail raw
// path). Email layouts rely on table-based structure and inline styles that the
// page-oriented sanitizeHtml above would strip — so this is a SEPARATE, wider
// allowlist that still blocks the executable/framing vectors (script, on*
// handlers, iframe/object/embed/form/link, javascript:/data: URIs, <style>
// blocks). Only inline style="" survives; <style> blocks do not.
const EMAIL_OPTIONS: sanitize.IOptions = {
  allowedTags: [
    "table", "thead", "tbody", "tfoot", "tr", "td", "th",
    "div", "center", "span", "p", "br", "hr",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "strong", "b", "em", "i", "u", "s", "blockquote", "pre", "code",
    "small", "sub", "sup", "font",
    "ul", "ol", "li", "a", "img",
  ],
  allowedAttributes: {
    // Inline style + presentational attrs on every allowed tag — email clients
    // ignore <head>/external CSS, so layout lives in inline attrs.
    "*": ["style", "class", "align", "valign", "width", "height", "bgcolor", "dir"],
    a: ["href", "target", "rel", "title"],
    img: ["src", "alt", "width", "height", "style", "title"],
    table: ["cellpadding", "cellspacing", "border", "role"],
    td: ["colspan", "rowspan"],
    th: ["colspan", "rowspan", "scope"],
    font: ["color", "face", "size"],
  },
  // No javascript:, no data: — blocks script/exfil URIs in href/src.
  allowedSchemes: ["http", "https", "mailto"],
  // Force a safe rel on links (defense-in-depth for webview/preview rendering;
  // email clients rewrite/sandbox links anyway). Producer's href/target/style
  // are preserved.
  transformTags: {
    a: (tagName, attribs) => ({
      tagName: "a",
      attribs: { ...attribs, rel: "noopener noreferrer" },
    }),
  },
};

export function sanitizeEmailHtml(html: string): string {
  return sanitize(html, EMAIL_OPTIONS);
}
