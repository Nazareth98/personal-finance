import { useId, useRef, useState, type ReactNode } from "react";
import { CircleHelp, X } from "lucide-react";

export function ContextHelp({ title, children }: { title: string; children: ReactNode }) {
  const dialogId = useId();
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  function show() {
    dialog.current?.showModal();
    setOpen(true);
  }

  function afterClose() {
    setOpen(false);
    trigger.current?.focus();
  }

  return (
    <>
      <button
        ref={trigger}
        className="context-help-trigger"
        type="button"
        aria-label={`Ajuda sobre ${title}`}
        aria-haspopup="dialog"
        aria-controls={dialogId}
        aria-expanded={open}
        onClick={show}
      >
        <CircleHelp size={18} aria-hidden="true" />
        <span>Ajuda</span>
      </button>
      <dialog
        ref={dialog}
        id={dialogId}
        className="context-help-dialog"
        aria-labelledby={titleId}
        onClose={afterClose}
      >
        <div className="context-help-header">
          <h3 id={titleId}>Ajuda: {title}</h3>
          <button
            className="context-help-close"
            type="button"
            aria-label="Fechar ajuda"
            autoFocus
            onClick={() => dialog.current?.close()}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="context-help-content">{children}</div>
      </dialog>
    </>
  );
}
