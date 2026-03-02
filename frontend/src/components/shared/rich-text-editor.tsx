"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { TextAlign } from "@tiptap/extension-text-align";
import { Markdown } from "tiptap-markdown";
import {
    Bold, Italic, Underline as UnderlineIcon,
    List, ListOrdered, Table as TableIcon,
    AlignLeft, AlignCenter, AlignRight,
    Heading1, Heading2, Heading3,
    Undo, Redo, Quote, Code as CodeIcon,
    ArrowUpFromLine, ArrowDownToLine, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
    content: string;
    onChange: (markdown: string) => void;
    className?: string;
}

const MenuBar = ({ editor }: { editor: any }) => {
    if (!editor) return null;

    const addTable = () => {
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    };

    return (
        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-100 bg-gray-50/50 sticky top-0 z-10 backdrop-blur-sm">
            <div className="flex items-center gap-0.5 mr-2">
                <Button
                    variant="ghost" size="sm" className={cn("h-8 w-8 p-0", editor.isActive('bold') && "bg-orange-100 text-[#D4A017]")}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    title="Bold"
                >
                    <Bold className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost" size="sm" className={cn("h-8 w-8 p-0", editor.isActive('italic') && "bg-orange-100 text-[#D4A017]")}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    title="Italic"
                >
                    <Italic className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost" size="sm" className={cn("h-8 w-8 p-0", editor.isActive('underline') && "bg-orange-100 text-[#D4A017]")}
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    title="Underline"
                >
                    <UnderlineIcon className="h-4 w-4" />
                </Button>
            </div>

            <div className="w-px h-6 bg-gray-200 mx-1" />

            <div className="flex items-center gap-0.5 mx-2">
                <Button
                    variant="ghost" size="sm" className={cn("h-8 w-8 p-0", editor.isActive('heading', { level: 1 }) && "bg-orange-100 text-[#D4A017]")}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    title="H1"
                >
                    <Heading1 className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost" size="sm" className={cn("h-8 w-8 p-0", editor.isActive('heading', { level: 2 }) && "bg-orange-100 text-[#D4A017]")}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    title="H2"
                >
                    <Heading2 className="h-4 w-4" />
                </Button>
            </div>

            <div className="w-px h-6 bg-gray-200 mx-1" />

            <div className="flex items-center gap-0.5 mx-2">
                <Button
                    variant="ghost" size="sm" className={cn("h-8 w-8 p-0", editor.isActive('bulletList') && "bg-orange-100 text-[#D4A017]")}
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    title="Bullet List"
                >
                    <List className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost" size="sm" className={cn("h-8 w-8 p-0", editor.isActive('orderedList') && "bg-orange-100 text-[#D4A017]")}
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    title="Numbered List"
                >
                    <ListOrdered className="h-4 w-4" />
                </Button>
            </div>

            <div className="w-px h-6 bg-gray-200 mx-1" />

            <div className="flex items-center gap-0.5 mx-2">
                <Button
                    variant="ghost" size="sm" className={cn("h-8 w-8 p-0", editor.isActive({ textAlign: 'left' }) && "bg-orange-100 text-[#D4A017]")}
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    title="Align Left"
                >
                    <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost" size="sm" className={cn("h-8 w-8 p-0", editor.isActive({ textAlign: 'center' }) && "bg-orange-100 text-[#D4A017]")}
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    title="Align Center"
                >
                    <AlignCenter className="h-4 w-4" />
                </Button>
            </div>

            <div className="w-px h-6 bg-gray-200 mx-1" />

            <div className="flex items-center gap-0.5 mx-2">
                <Button
                    variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-[#D4A017]"
                    onClick={addTable}
                    title="Insert Table"
                >
                    <TableIcon className="h-4 w-4" />
                </Button>
                {editor.isActive('table') && (
                    <div className="flex items-center gap-0.5 bg-orange-50 rounded-md px-1 animate-in fade-in zoom-in-95 duration-200">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-orange-600" onClick={() => editor.chain().focus().addColumnBefore().run()} title="Add Col Before"><ArrowUpFromLine className="h-3 w-3 rotate-270" /></Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-orange-600" onClick={() => editor.chain().focus().addColumnAfter().run()} title="Add Col After"><ArrowDownToLine className="h-3 w-3 rotate-270" /></Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-orange-600" onClick={() => editor.chain().focus().addRowBefore().run()} title="Add Row Before"><ArrowUpFromLine className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-orange-600" onClick={() => editor.chain().focus().addRowAfter().run()} title="Add Row After"><ArrowDownToLine className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50" onClick={() => editor.chain().focus().deleteTable().run()} title="Delete Table"><Trash2 className="h-3 w-3" /></Button>
                    </div>
                )}
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-0.5">
                <Button
                    variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400"
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                >
                    <Undo className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400"
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                >
                    <Redo className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};

export function RichTextEditor({ content, onChange, className }: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Link.configure({
                openOnClick: false,
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
            Markdown.configure({
                html: true,
                tightLists: true,
                tightListClass: 'tight',
                bulletListMarker: '-',
                linkify: true,
                breaks: true,
            }),
        ],
        content: content,
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: 'prose prose-sm prose-stone max-w-none focus:outline-none min-h-[500px] p-8 sm:p-12 font-serif leading-relaxed',
            },
        },
        onUpdate: ({ editor }) => {
            // Use the Markdown extension to get the content back as Markdown
            const markdown = (editor.storage as any).markdown.getMarkdown();
            onChange(markdown);
        },
    });

    useEffect(() => {
        if (!editor || content === (editor.storage as any).markdown.getMarkdown()) {
            return;
        }

        editor.commands.setContent(content);
    }, [content, editor]);

    return (
        <div className={cn("border border-gray-200 rounded-xl overflow-hidden bg-white shadow-inner focus-within:ring-1 focus-within:ring-[#D4A017]/30 transition-all", className)}>
            <MenuBar editor={editor} />
            <EditorContent editor={editor} />

            <style jsx global>{`
                .ProseMirror table {
                    border-collapse: collapse;
                    table-layout: fixed;
                    width: 100%;
                    margin: 0;
                    overflow: hidden;
                    border: 1px solid #E5E7EB;
                }
                .ProseMirror td, .ProseMirror th {
                    min-width: 1em;
                    border: 1px solid #E5E7EB;
                    padding: 3px 5px;
                    vertical-align: top;
                    box-sizing: border-box;
                    position: relative;
                }
                .ProseMirror th {
                    font-weight: bold;
                    text-align: left;
                    background-color: #F9FAFB;
                }
                .ProseMirror .selectedCell:after {
                    z-index: 2;
                    content: "";
                    position: absolute;
                    left: 0; right: 0; top: 0; bottom: 0;
                    background: rgba(200, 200, 255, 0.4);
                    pointer-events: none;
                }
                .ProseMirror .column-resize-handle {
                    position: absolute;
                    right: -2px;
                    top: 0;
                    bottom: 0;
                    width: 4px;
                    z-index: 20;
                    background-color: #adf;
                    pointer-events: none;
                }
                .ProseMirror.resize-cursor {
                    cursor: ew-resize;
                    cursor: col-resize;
                }
                .rotate-270 {
                    transform: rotate(-90deg);
                }
            `}</style>
        </div>
    );
}
