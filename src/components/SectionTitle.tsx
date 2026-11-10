import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { ContextHelp } from "./ContextHelp";

export function SectionTitle({
  icon: Icon,
  title,
  description,
  help,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  help?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div className="section-heading-top">
        <h2>
          <Icon size={20} aria-hidden="true" />
          <span>{title}</span>
        </h2>
        {help && <ContextHelp title={title}>{help}</ContextHelp>}
      </div>
      {description && <p className="section-description">{description}</p>}
    </div>
  );
}
