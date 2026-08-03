import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Heading1,
  Heading2,
  Pilcrow,
  Undo2,
  Redo2,
  Scissors,
  Minus,
} from "lucide-react";
import { CONTRACT_EDITOR_CSS } from "@/lib/contract";

interface Props {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  className?: string;
}

export function RichTextEditor({ value, onChange, disabled, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Sincroniza somente quando o valor externo difere do conteúdo atual (evita mover o cursor).
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, [value]);

  const emit = () => {
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const cmd = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  };

  const insertHtml = (html: string) => {
    ref.current?.focus();
    document.execCommand("insertHTML", false, html);
    emit();
  };

  const Tool = ({
    icon: Icon,
    label,
    onClick,
  }: {
    icon: typeof Bold;
    label: string;
    onClick: () => void;
  }) => (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      title={label}
      aria-label={label}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="h-8 w-8 p-0"
    >
      <Icon size={15} />
    </Button>
  );

  return (
    <div className={`rounded-lg border border-border bg-card ${className ?? ""}`}>
      <style>{CONTRACT_EDITOR_CSS}</style>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border p-1">
        <Tool icon={Bold} label="Negrito" onClick={() => cmd("bold")} />
        <Tool icon={Italic} label="Itálico" onClick={() => cmd("italic")} />
        <Tool icon={Underline} label="Sublinhado" onClick={() => cmd("underline")} />
        <span className="mx-1 h-5 w-px bg-border" />
        <Tool icon={Heading1} label="Título 1" onClick={() => cmd("formatBlock", "<h1>")} />
        <Tool icon={Heading2} label="Título 2" onClick={() => cmd("formatBlock", "<h2>")} />
        <Tool icon={Pilcrow} label="Parágrafo" onClick={() => cmd("formatBlock", "<p>")} />
        <span className="mx-1 h-5 w-px bg-border" />
        <Tool icon={List} label="Lista" onClick={() => cmd("insertUnorderedList")} />
        <Tool icon={ListOrdered} label="Lista numerada" onClick={() => cmd("insertOrderedList")} />
        <span className="mx-1 h-5 w-px bg-border" />
        <Tool icon={AlignLeft} label="Alinhar à esquerda" onClick={() => cmd("justifyLeft")} />
        <Tool icon={AlignCenter} label="Centralizar" onClick={() => cmd("justifyCenter")} />
        <Tool icon={AlignRight} label="Alinhar à direita" onClick={() => cmd("justifyRight")} />
        <Tool icon={AlignJustify} label="Justificar" onClick={() => cmd("justifyFull")} />
        <span className="mx-1 h-5 w-px bg-border" />
        <Tool icon={Minus} label="Linha horizontal" onClick={() => insertHtml("<hr />")} />
        <Tool
          icon={Scissors}
          label="Quebra de página"
          onClick={() => insertHtml('<div class="page-break"></div><p><br /></p>')}
        />
        <span className="mx-1 h-5 w-px bg-border" />
        <Tool icon={Undo2} label="Desfazer" onClick={() => cmd("undo")} />
        <Tool icon={Redo2} label="Refazer" onClick={() => cmd("redo")} />
      </div>
      <div
        ref={ref}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        className="contract-doc min-h-[420px] max-h-[70vh] overflow-y-auto bg-white p-6 text-black outline-none"
      />
    </div>
  );
}
