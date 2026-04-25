"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useState } from "react";

interface Props {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function EmailEditor({
  content,
  onChange,
  placeholder = "Escreva o conteúdo do email...",
}: Props) {
  const [linkModal, setLinkModal] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        code: false,
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
    editorProps: {
      attributes: {
        class: "email-editor-content prose prose-sm prose-invert max-w-none px-4 py-3 focus:outline-none text-sm text-white",
        style: "min-height: 150px",
      },
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;
    if (content === "" && editor.getHTML() !== "<p></p>") {
      editor.commands.clearContent();
    }
  }, [content, editor]);

  if (!editor) {
    return (
      <div className="bg-gray-900/50 border border-white/10 rounded-lg h-[200px] animate-pulse" />
    );
  }

  return (
    <div className="rounded-lg border border-white/10 overflow-hidden focus-within:border-blue-500/50 transition-colors">
      <EmailToolbar editor={editor} onLinkClick={() => setLinkModal(true)} />
      <div className="bg-gray-900/50">
        <EditorContent editor={editor} />
      </div>
      {linkModal && (
        <EmailLinkModal editor={editor} onClose={() => setLinkModal(false)} />
      )}
    </div>
  );
}

function EmailToolbar({ editor, onLinkClick }: { editor: Editor; onLinkClick: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 bg-gray-900/80 border-b border-white/10 px-2 py-1.5">
      <TBtn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Título">
        H2
      </TBtn>
      <TBtn active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Subtítulo">
        H3
      </TBtn>
      <Sep />
      <TBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Negrito">
        <span className="font-bold">B</span>
      </TBtn>
      <TBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Itálico">
        <span className="italic">I</span>
      </TBtn>
      <TBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Sublinhado">
        <span className="underline">U</span>
      </TBtn>
      <Sep />
      <TBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Lista">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </TBtn>
      <TBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Lista numerada">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <text x="2" y="8" fontSize="7" fontWeight="bold">1</text>
          <text x="2" y="15" fontSize="7" fontWeight="bold">2</text>
          <line x1="10" y1="6" x2="22" y2="6" stroke="currentColor" strokeWidth="2" />
          <line x1="10" y1="13" x2="22" y2="13" stroke="currentColor" strokeWidth="2" />
        </svg>
      </TBtn>
      <Sep />
      <TBtn active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Esquerda">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" d="M3 6h18M3 12h12M3 18h18" />
        </svg>
      </TBtn>
      <TBtn active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Centro">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" d="M3 6h18M6 12h12M3 18h18" />
        </svg>
      </TBtn>
      <TBtn active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Direita">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" d="M3 6h18M9 12h12M3 18h18" />
        </svg>
      </TBtn>
      <Sep />
      <TBtn active={editor.isActive("link")} onClick={onLinkClick} title="Link">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </TBtn>
    </div>
  );
}

function TBtn({ active, onClick, title, children }: { active: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`w-8 h-8 flex items-center justify-center rounded text-xs transition-colors ${
        active
          ? "bg-white/10 text-white"
          : "text-gray-400 hover:bg-white/5 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-5 bg-white/10 mx-0.5" />;
}

function EmailLinkModal({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const existing = editor.getAttributes("link").href as string | undefined;
  const [url, setUrl] = useState(existing || "");

  function handleSave() {
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      const href = /^(https?:\/\/|mailto:|tel:)/i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
    onClose();
  }

  function handleRemove() {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative bg-[#141416] border border-[#28282e] rounded-2xl p-5 max-w-sm w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-white mb-4">{existing ? "Editar link" : "Inserir link"}</h3>
        <input
          autoFocus
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://exemplo.com"
          className="w-full px-3 py-2.5 bg-gray-900/50 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSave(); } }}
        />
        <div className="flex gap-2 mt-4">
          {existing && (
            <button type="button" onClick={handleRemove} className="px-3 py-2 text-red-400 hover:text-red-300 text-sm font-medium rounded-lg transition-colors">
              Remover
            </button>
          )}
          <div className="flex-1" />
          <button type="button" onClick={onClose} className="px-3 py-2 text-gray-400 hover:text-white text-sm font-medium rounded-lg transition-colors">
            Cancelar
          </button>
          <button type="button" onClick={handleSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">
            {existing ? "Salvar" : "Inserir"}
          </button>
        </div>
      </div>
    </div>
  );
}
