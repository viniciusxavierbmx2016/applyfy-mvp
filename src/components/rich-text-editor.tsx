"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Image from "@tiptap/extension-image";
import { useCallback, useEffect, useState } from "react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

interface LinkEditData {
  href: string;
  text: string;
  isButton: boolean;
  color: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Digite aqui...",
  minHeight = "200px",
}: Props) {
  const [linkModal, setLinkModal] = useState(false);
  const [imageModal, setImageModal] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkEditData | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
      }),
      Link.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            class: { default: null, parseHTML: (el) => el.getAttribute("class"), renderHTML: (attrs) => attrs.class ? { class: attrs.class } : {} },
            style: { default: null, parseHTML: (el) => el.getAttribute("style"), renderHTML: (attrs) => attrs.style ? { style: attrs.style } : {} },
          };
        },
      }).configure({ openOnClick: false }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Color,
      TextStyle,
      Image,
    ],
    content: value,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose-editor focus:outline-none",
        style: `min-height: ${minHeight}`,
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  const handleEditorClick = useCallback((e: React.MouseEvent) => {
    if (!editor) return;
    const target = e.target as HTMLElement;
    const anchor = target.closest("a");
    if (anchor) {
      e.preventDefault();
      e.stopPropagation();
      const href = anchor.getAttribute("href") || "";
      const text = anchor.textContent || "";
      const isButton = anchor.classList.contains("editor-button");
      let color = "#6366f1";
      if (isButton && anchor.style.backgroundColor) {
        color = rgbToHex(anchor.style.backgroundColor);
      }
      setEditingLink({ href, text, isButton, color });
      setLinkModal(true);
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="rounded-xl border border-gray-300 dark:border-[#1a1e2e] overflow-hidden focus-within:border-indigo-500/50 transition-colors">
      <Toolbar
        editor={editor}
        onLinkClick={() => { setEditingLink(null); setLinkModal(true); }}
        onImageClick={() => setImageModal(true)}
      />
      <div
        className="bg-white dark:bg-[#0f1320] px-4 py-3 text-sm text-gray-900 dark:text-white"
        onClick={handleEditorClick}
      >
        {editor.isEmpty && (
          <p className="absolute text-gray-400 dark:text-gray-500 pointer-events-none select-none">
            {placeholder}
          </p>
        )}
        <EditorContent editor={editor} />
      </div>

      {linkModal && (
        <LinkModal
          editor={editor}
          editData={editingLink}
          onClose={() => { setLinkModal(false); setEditingLink(null); }}
        />
      )}
      {imageModal && (
        <ImageModal
          editor={editor}
          onClose={() => setImageModal(false)}
        />
      )}
    </div>
  );
}

function rgbToHex(rgb: string): string {
  if (rgb.startsWith("#")) return rgb;
  const match = rgb.match(/\d+/g);
  if (!match || match.length < 3) return "#6366f1";
  const [r, g, b] = match.map(Number);
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return "https://" + trimmed;
}

function LinkModal({
  editor,
  editData,
  onClose,
}: {
  editor: Editor;
  editData: LinkEditData | null;
  onClose: () => void;
}) {
  const isEditing = !!editData;
  const [url, setUrl] = useState(editData?.href || "");
  const [text, setText] = useState(editData?.text || "");
  const [style, setStyle] = useState<"link" | "button">(editData?.isButton ? "button" : "link");
  const [buttonColor, setButtonColor] = useState(editData?.color || "#6366f1");

  function handleSave() {
    if (!url.trim()) return;
    const href = normalizeUrl(url);
    const displayText = text.trim() || url.trim();

    if (isEditing) {
      editor.chain().focus().extendMarkRange("link").deleteSelection().run();
    }

    if (style === "button") {
      editor.chain().focus().insertContent({
        type: "text",
        text: displayText,
        marks: [{
          type: "link",
          attrs: {
            href,
            target: "_blank",
            rel: "noopener noreferrer",
            class: "editor-button",
            style: `background-color: ${buttonColor}; --btn-color: ${buttonColor}`,
          },
        }],
      }).insertContent(" ").unsetMark("link").run();
    } else {
      editor.chain().focus().insertContent({
        type: "text",
        text: displayText,
        marks: [{
          type: "link",
          attrs: { href, target: "_blank", rel: "noopener noreferrer" },
        }],
      }).insertContent(" ").unsetMark("link").run();
    }
    onClose();
  }

  function handleRemove() {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    onClose();
  }

  const previewText = text.trim() || "Clique aqui";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative bg-white dark:bg-[#141416] border border-gray-200 dark:border-[#28282e] rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">
          {isEditing ? "Editar link" : "Inserir link"}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">URL</label>
            <input
              autoFocus
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="exemplo.com.br (https:// automático)"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1320] border border-gray-300 dark:border-[#1a1e2e] rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500/50"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSave(); } }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Texto para exibir</label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Clique aqui (opcional)"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1320] border border-gray-300 dark:border-[#1a1e2e] rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500/50"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSave(); } }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Estilo</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStyle("link")}
                className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-colors ${
                  style === "link"
                    ? "border-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/10"
                    : "border-gray-200 dark:border-[#28282e] hover:border-gray-300 dark:hover:border-[#363640]"
                }`}
              >
                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span className="text-indigo-500 text-xs underline">texto com link</span>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Link</span>
              </button>
              <button
                type="button"
                onClick={() => setStyle("button")}
                className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-colors ${
                  style === "button"
                    ? "border-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/10"
                    : "border-gray-200 dark:border-[#28282e] hover:border-gray-300 dark:hover:border-[#363640]"
                }`}
              >
                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
                </svg>
                <span className="inline-block px-3 py-1 bg-indigo-600 text-white text-[10px] font-semibold rounded-lg">Botão</span>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Botão</span>
              </button>
            </div>
          </div>

          {style === "button" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Cor do botão</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={buttonColor}
                    onChange={(e) => setButtonColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-gray-300 dark:border-[#1a1e2e] cursor-pointer bg-transparent p-0.5"
                  />
                  <input
                    type="text"
                    value={buttonColor}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setButtonColor(v);
                    }}
                    maxLength={7}
                    className="w-28 px-4 py-2.5 bg-gray-50 dark:bg-[#0f1320] border border-gray-300 dark:border-[#1a1e2e] rounded-xl text-sm text-gray-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500/50"
                  />
                  <div className="flex gap-1.5">
                    {["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setButtonColor(c)}
                        className={`w-6 h-6 rounded-full transition-transform ${buttonColor === c ? "ring-2 ring-white ring-offset-2 ring-offset-[#141416] scale-110" : "hover:scale-110"}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preview</label>
                <div className="flex items-center justify-center p-6 rounded-xl bg-gray-100 dark:bg-[#0a0c14] border border-gray-200 dark:border-[#1a1e2e]">
                  <span
                    className="inline-block px-5 py-2 text-white font-semibold text-[0.8125rem] rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.2)] cursor-default select-none"
                    style={{ backgroundColor: buttonColor, letterSpacing: "0.01em" }}
                  >
                    {previewText}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          {isEditing && (
            <button
              type="button"
              onClick={handleRemove}
              className="px-4 py-2.5 text-red-500 hover:text-red-400 hover:bg-red-500/10 text-sm font-medium rounded-xl transition-colors"
            >
              Remover
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-gray-100 dark:bg-[#1d1d21] hover:bg-gray-200 dark:hover:bg-[#28282e] text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl border border-gray-200 dark:border-[#28282e] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!url.trim()}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl disabled:opacity-40 transition-colors"
          >
            {isEditing ? "Salvar" : "Inserir"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ImageModal({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const [url, setUrl] = useState("");
  const [previewError, setPreviewError] = useState(false);

  function handleInsert() {
    if (!url.trim()) return;
    editor.chain().focus().setImage({ src: url.trim() }).run();
    onClose();
  }

  const showPreview = url.trim().length > 0 && !previewError;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative bg-white dark:bg-[#141416] border border-gray-200 dark:border-[#28282e] rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">Inserir imagem</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">URL da imagem</label>
            <input
              autoFocus
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setPreviewError(false); }}
              placeholder="https://exemplo.com/imagem.jpg"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0f1320] border border-gray-300 dark:border-[#1a1e2e] rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500/50"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleInsert(); } }}
            />
          </div>

          {showPreview && (
            <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-[#1a1e2e] bg-gray-50 dark:bg-[#0f1320] p-2">
              <img // eslint-disable-line @next/next/no-img-element
                src={url.trim()}
                alt="Preview"
                className="w-full max-h-48 object-contain rounded-lg"
                onError={() => setPreviewError(true)}
              />
            </div>
          )}

          {previewError && url.trim() && (
            <p className="text-xs text-amber-500">Não foi possível carregar a imagem. Verifique a URL.</p>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-[#1d1d21] hover:bg-gray-200 dark:hover:bg-[#28282e] text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl border border-gray-200 dark:border-[#28282e] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleInsert}
            disabled={!url.trim()}
            className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl disabled:opacity-40 transition-colors"
          >
            Inserir
          </button>
        </div>
      </div>
    </div>
  );
}

function Toolbar({
  editor,
  onLinkClick,
  onImageClick,
}: {
  editor: Editor;
  onLinkClick: () => void;
  onImageClick: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 bg-gray-50 dark:bg-[#1d1d21] border-b border-gray-200 dark:border-[#28282e] px-2 py-1.5">
      <ToolbarBtn
        active={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="Título 1"
        useMouseDown
      >
        H1
      </ToolbarBtn>
      <ToolbarBtn
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Título 2"
        useMouseDown
      >
        H2
      </ToolbarBtn>

      <Divider />

      <ToolbarBtn
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Negrito"
        useMouseDown
      >
        <span className="font-bold">B</span>
      </ToolbarBtn>
      <ToolbarBtn
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Itálico"
        useMouseDown
      >
        <span className="italic">I</span>
      </ToolbarBtn>
      <ToolbarBtn
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Sublinhado"
        useMouseDown
      >
        <span className="underline">U</span>
      </ToolbarBtn>
      <ToolbarBtn
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Tachado"
        useMouseDown
      >
        <span className="line-through">S</span>
      </ToolbarBtn>

      <Divider />

      <ToolbarBtn
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Lista com marcadores"
        useMouseDown
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </ToolbarBtn>
      <ToolbarBtn
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Lista numerada"
        useMouseDown
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <text x="2" y="8" fontSize="7" fontWeight="bold">1</text>
          <text x="2" y="15" fontSize="7" fontWeight="bold">2</text>
          <text x="2" y="22" fontSize="7" fontWeight="bold">3</text>
          <line x1="10" y1="6" x2="22" y2="6" stroke="currentColor" strokeWidth="2" />
          <line x1="10" y1="13" x2="22" y2="13" stroke="currentColor" strokeWidth="2" />
          <line x1="10" y1="20" x2="22" y2="20" stroke="currentColor" strokeWidth="2" />
        </svg>
      </ToolbarBtn>

      <Divider />

      <ToolbarBtn
        active={editor.isActive({ textAlign: "left" })}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        title="Alinhar esquerda"
        useMouseDown
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" d="M3 6h18M3 12h12M3 18h18" />
        </svg>
      </ToolbarBtn>
      <ToolbarBtn
        active={editor.isActive({ textAlign: "center" })}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        title="Centralizar"
        useMouseDown
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" d="M3 6h18M6 12h12M3 18h18" />
        </svg>
      </ToolbarBtn>
      <ToolbarBtn
        active={editor.isActive({ textAlign: "right" })}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        title="Alinhar direita"
        useMouseDown
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" d="M3 6h18M9 12h12M3 18h18" />
        </svg>
      </ToolbarBtn>

      <Divider />

      <ToolbarBtn
        active={editor.isActive("link")}
        onClick={onLinkClick}
        title="Inserir link"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </ToolbarBtn>
      <ToolbarBtn
        active={false}
        onClick={onImageClick}
        title="Inserir imagem"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </ToolbarBtn>
      <ToolbarBtn
        active={editor.isActive("codeBlock")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        title="Bloco de código"
        useMouseDown
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      </ToolbarBtn>
      <ToolbarBtn
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Citação"
        useMouseDown
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 17h3l2-4V7H5v6h3l-2 4zm8 0h3l2-4V7h-6v6h3l-2 4z" />
        </svg>
      </ToolbarBtn>

      <Divider />

      <ToolbarBtn
        active={false}
        onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        title="Limpar formatação"
        useMouseDown
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </ToolbarBtn>
    </div>
  );
}

function ToolbarBtn({
  active,
  onClick,
  title,
  children,
  useMouseDown = false,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  useMouseDown?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={useMouseDown ? undefined : onClick}
      onMouseDown={
        useMouseDown
          ? (e) => {
              e.preventDefault();
              onClick();
            }
          : undefined
      }
      title={title}
      className={`p-1.5 rounded text-xs transition-colors ${
        active
          ? "bg-gray-200 dark:bg-[#28282e] text-gray-900 dark:text-white"
          : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#28282e] hover:text-gray-900 dark:hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-gray-200 dark:bg-[#28282e] mx-1" />;
}
