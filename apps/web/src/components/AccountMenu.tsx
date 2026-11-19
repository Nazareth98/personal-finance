import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { AccountIcon, EditIcon, Icon, LogOutIcon, MoonIcon, useFloatingLayer } from '@personal-finance/ui';

type AccountMenuProps = { darkTheme: boolean; onToggleTheme: () => void; onSignOut: () => void; onEditHolder?: () => void };

/**
 * Menu da conta (D-042, opção A): reúne tema e “Sair” num só lugar — no cabeçalho até 1000 px e
 * no rodapé da sidebar no desktop. “Sair” continua pedindo confirmação em quem chama.
 */
export function AccountMenu({ darkTheme, onToggleTheme, onSignOut, onEditHolder }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), list = useRef<HTMLDivElement>(null), menuId = useId();
  // Top layer: a sidebar recolhida (overflow hidden) cortava o menu.
  useFloatingLayer(open, trigger, list);
  const items = () => Array.from(root.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? []);

  useEffect(() => {
    if (!open) return;
    items()[0]?.focus();
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  function close() { setOpen(false); trigger.current?.focus(); }
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!open) return;
    const list = items(), index = list.indexOf(document.activeElement as HTMLElement);
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      list[(index + (event.key === 'ArrowDown' ? 1 : list.length - 1)) % list.length]?.focus();
    } else if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); list[event.key === 'Home' ? 0 : list.length - 1]?.focus(); }
    else if (event.key === 'Tab') setOpen(false);
  }

  return <div className="account-menu" ref={root} onKeyDown={onKeyDown}>
    <button ref={trigger} type="button" className="account-menu__trigger" aria-haspopup="menu" aria-expanded={open}
      aria-controls={open ? menuId : undefined} aria-label="Menu da conta" title="Menu da conta" onClick={() => setOpen(value => !value)}>
      <Icon icon={AccountIcon} size="sm" /><span className="account-menu__label">Conta</span>
    </button>
    {open && <div ref={list} id={menuId} role="menu" aria-label="Menu da conta" popover="manual" className="ui-floating account-menu__list">
      <button type="button" role="menuitemcheckbox" aria-checked={darkTheme} className="account-menu__item" onClick={onToggleTheme}>
        <Icon icon={MoonIcon} size="sm" /><span>Tema escuro</span><span className="account-menu__switch" aria-hidden="true" />
      </button>
      {onEditHolder && <button type="button" role="menuitem" className="account-menu__item" onClick={() => { close(); onEditHolder(); }}>
        <Icon icon={EditIcon} size="sm" /><span>Nome do titular</span>
      </button>}
      <button type="button" role="menuitem" className="account-menu__item account-menu__item--danger"
        onClick={() => { close(); onSignOut(); }}>
        <Icon icon={LogOutIcon} size="sm" /><span>Sair</span>
      </button>
    </div>}
  </div>;
}
