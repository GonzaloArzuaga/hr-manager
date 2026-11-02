import React, { Children, Fragment, isValidElement, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Desplegables propios del sistema. Reemplazan a <select> y a <datalist> con una lista
// que ocupa el ancho del campo. Se usan igual que los nativos: value, onChange, name,
// required, disabled y <option> como hijos.

const layoutToken =
  /^(?:(?:sm|md|lg|xl|2xl):)?(?:w-|min-w-|max-w-|flex-|shrink|grow|basis-|col-span-|row-span-|self-|justify-self-|m[trblxy]?-|order-)/;

function textOf(node) {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement(node)) return textOf(node.props.children);
  return "";
}

function readOptions(children, group = null, list = []) {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === Fragment) {
      readOptions(child.props.children, group, list);
    } else if (child.type === "optgroup") {
      readOptions(child.props.children, child.props.label, list);
    } else if (child.type === "option") {
      const label = textOf(child.props.children).replace(/\s+/g, " ").trim();
      list.push({
        value: String(child.props.value ?? label),
        label,
        disabled: Boolean(child.props.disabled),
        group,
      });
    }
  });
  return list;
}

export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("es");
}

function splitClassName(className = "") {
  const tokens = className.split(/\s+/).filter(Boolean);
  return {
    layout: tokens.filter((token) => layoutToken.test(token)).join(" "),
    look: tokens.filter((token) => !layoutToken.test(token)).join(" "),
  };
}

// Posición de la lista: debajo del campo y del mismo ancho; arriba si abajo no entra
export function useFloatingPanel(open, anchorRef) {
  const [style, setStyle] = useState(null);

  useLayoutEffect(() => {
    if (!open) return undefined;
    function place() {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const below = viewportHeight - rect.bottom - 8;
      const above = rect.top - 8;
      const preferred = 15 * parseFloat(getComputedStyle(document.documentElement).fontSize);
      const openUp = below < Math.min(preferred, 160) && above > below;
      const maxHeight = Math.max(120, Math.min(preferred, openUp ? above : below));
      setStyle({
        position: "fixed",
        left: Math.max(8, Math.min(rect.left, window.innerWidth - Math.max(rect.width, 64) - 8)),
        width: Math.max(rect.width, 64),
        maxHeight,
        fontSize: getComputedStyle(anchor).fontSize,
        ...(openUp ? { bottom: viewportHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
      });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchorRef]);

  return style;
}

function useOutsideClose(open, refs, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    function handle(event) {
      if (refs.some((ref) => ref.current?.contains(event.target))) return;
      onClose();
    }
    document.addEventListener("mousedown", handle);
    document.addEventListener("touchstart", handle);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("touchstart", handle);
    };
  }, [open, refs, onClose]);
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="h-[1.1em] w-[1.1em] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronIcon({ open }) {
  return (
    <svg
      aria-hidden="true"
      className={`h-[1.15em] w-[1.15em] shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      viewBox="0 0 24 24"
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// "Nombre — detalle" se muestra en dos líneas: el detalle más chico y gris
function OptionLabel({ label, selected }) {
  const [main, ...detail] = label.split(" — ");
  return (
    <span className="min-w-0 break-words">
      <span className="block">{main}</span>
      {detail.length > 0 && (
        <span className={`mt-0.5 block text-[0.88em] font-normal ${selected ? "text-blue-700/80" : "text-slate-500"}`}>{detail.join(" — ")}</span>
      )}
    </span>
  );
}

// Lista desplegable compartida por Select y SuggestInput
export function OptionPanel({ activeIndex, emptyText, listId, onHover, onPick, options, panelRef, search, selectedValue, style }) {
  const listRef = useRef(null);

  useEffect(() => {
    const active = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!style) return null;
  let lastGroup = null;

  return createPortal(
    <div
      className="hr-dropdown-panel z-[90] flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-700 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.28)]"
      ref={panelRef}
      style={style}
    >
      {search}
      <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1" id={listId} ref={listRef} role="listbox">
        {options.map((option, index) => {
          const header = option.group && option.group !== lastGroup ? option.group : null;
          lastGroup = option.group;
          const selected = option.value === selectedValue;
          const active = index === activeIndex;
          return (
            <Fragment key={`${option.value}-${index}`}>
              {header && (
                <li className="px-3 pb-1 pt-2 text-[0.85em] font-bold uppercase tracking-wider text-slate-400" role="presentation">
                  {header}
                </li>
              )}
              <li
                aria-disabled={option.disabled || undefined}
                aria-selected={selected}
                className={`flex cursor-pointer items-center justify-between gap-2 border-l-[3px] px-3 py-[0.7em] leading-snug ${
                  option.disabled
                    ? "cursor-not-allowed border-transparent text-slate-300"
                    : selected
                      ? "border-blue-700 bg-blue-50 font-semibold text-blue-800"
                      : active
                        ? "border-transparent bg-slate-50 text-slate-900"
                        : "border-transparent"
                } ${option.value === "" ? "text-slate-400" : ""}`}
                data-index={index}
                data-value={option.value}
                id={`${listId}-${index}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => !option.disabled && onPick(option)}
                onMouseMove={() => onHover(index)}
                role="option"
              >
                <OptionLabel label={option.label} selected={selected} />
                {selected && <CheckIcon />}
              </li>
            </Fragment>
          );
        })}
        {options.length === 0 && <li className="px-3 py-3 text-center text-slate-400">{emptyText}</li>}
      </ul>
    </div>,
    document.body,
  );
}

function nextEnabled(options, from, step) {
  if (!options.length) return -1;
  let index = from;
  for (let tries = 0; tries < options.length; tries += 1) {
    index = (index + step + options.length) % options.length;
    if (!options[index].disabled) return index;
  }
  return -1;
}

export default function Select({
  children,
  className = "",
  defaultValue,
  disabled = false,
  id,
  name,
  onChange,
  placeholder,
  required = false,
  searchable,
  value,
  ...rest
}) {
  const autoId = useId();
  const listId = `${id ?? autoId}-list`;
  const [internal, setInternal] = useState(defaultValue === undefined ? undefined : String(defaultValue));
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const searchRef = useRef(null);
  const typeahead = useRef({ text: "", time: 0 });

  const allOptions = useMemo(() => readOptions(children), [children]);
  const current = value !== undefined && value !== null ? String(value) : internal ?? allOptions[0]?.value ?? "";
  const selected = allOptions.find((option) => option.value === current);
  const listOptions = useMemo(() => {
    const base = allOptions.filter((option) => !(required && option.value === "" ));
    if (!query.trim()) return base;
    const needle = normalizeText(query.trim());
    return base.filter((option) => normalizeText(option.label).includes(needle));
  }, [allOptions, query, required]);
  const withSearch = searchable ?? allOptions.length > 8;
  const style = useFloatingPanel(open, buttonRef);
  const { layout, look } = splitClassName(className);

  function close(focusButton = false) {
    setOpen(false);
    setQuery("");
    if (focusButton) buttonRef.current?.focus();
  }

  useOutsideClose(open, useMemo(() => [buttonRef, panelRef], []), () => close(false));

  function openList() {
    if (disabled) return;
    const selectedIndex = listOptions.findIndex((option) => option.value === current);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : nextEnabled(listOptions, -1, 1));
    setOpen(true);
  }

  useEffect(() => {
    if (open && withSearch) requestAnimationFrame(() => searchRef.current?.focus());
  }, [open, withSearch]);

  useEffect(() => {
    if (open && query) setActiveIndex(nextEnabled(listOptions, -1, 1));
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  function pick(option) {
    if (!option || option.disabled) return;
    if (option.value !== current) {
      if (value === undefined) setInternal(option.value);
      const target = { name, value: option.value, id, type: "select-one" };
      onChange?.({ target, currentTarget: target, preventDefault() {}, stopPropagation() {} });
    }
    close(true);
  }

  function handleKeyDown(event) {
    const key = event.key;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(key)) {
        event.preventDefault();
        openList();
        return;
      }
      if (key.length === 1 && /\S/.test(key)) jumpTo(key, true);
      return;
    }
    if (key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    } else if (key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => nextEnabled(listOptions, index, 1));
    } else if (key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => nextEnabled(listOptions, index < 0 ? listOptions.length : index, -1));
    } else if (key === "Home" && !withSearch) {
      event.preventDefault();
      setActiveIndex(nextEnabled(listOptions, -1, 1));
    } else if (key === "End" && !withSearch) {
      event.preventDefault();
      setActiveIndex(nextEnabled(listOptions, listOptions.length, -1));
    } else if (key === "Enter" || (key === " " && !withSearch)) {
      event.preventDefault();
      pick(listOptions[activeIndex]);
    } else if (key === "Tab") {
      close(false);
    } else if (!withSearch && key.length === 1 && /\S/.test(key)) {
      jumpTo(key, false);
    }
  }

  // Escribir letras salta a la opción que empieza así, como en los desplegables nativos
  function jumpTo(key, selectDirectly) {
    const now = Date.now();
    const text = now - typeahead.current.time < 700 ? typeahead.current.text + key : key;
    typeahead.current = { text, time: now };
    const needle = normalizeText(text);
    const index = listOptions.findIndex((option) => !option.disabled && normalizeText(option.label).startsWith(needle));
    if (index < 0) return;
    if (selectDirectly) pick(listOptions[index]);
    else setActiveIndex(index);
  }

  const shownLabel = selected?.label ?? placeholder ?? "";
  const isPlaceholder = !selected || selected.value === "";

  return (
    <span className={`relative ${/(?:^|\s)(?:w-full|flex-1|w-\[|w-\d|grow|basis-|col-span)/.test(layout) ? "block" : "inline-block"} ${layout}`}>
      <button
        {...rest}
        aria-activedescendant={open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        aria-controls={open ? listId : undefined}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`${look} flex w-full items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60 ${
          open ? "border-blue-500 ring-1 ring-blue-500" : ""
        }`}
        data-value={current}
        disabled={disabled}
        id={id}
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={handleKeyDown}
        ref={buttonRef}
        role="combobox"
        type="button"
      >
        <span className={`min-w-0 truncate ${isPlaceholder ? "text-slate-400" : ""}`}>{shownLabel}</span>
        <ChevronIcon open={open} />
      </button>
      {/* Copia oculta para que el formulario valide "required" y lea el valor con FormData */}
      <select
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        disabled={disabled}
        name={name}
        onChange={() => {}}
        onFocus={() => buttonRef.current?.focus()}
        required={required}
        tabIndex={-1}
        value={current}
      >
        {allOptions.map((option, index) => (
          <option key={`${option.value}-${index}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {open && (
        <OptionPanel
          activeIndex={activeIndex}
          emptyText="Sin resultados"
          listId={listId}
          onHover={setActiveIndex}
          onPick={pick}
          options={listOptions}
          panelRef={panelRef}
          search={
            withSearch ? (
              <div className="border-b border-slate-100 p-1.5">
                <input
                  aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
                  aria-controls={listId}
                  aria-label="Buscar en la lista"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-[0.55em] text-[1em] text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Buscar..."
                  ref={searchRef}
                  value={query}
                />
              </div>
            ) : null
          }
          selectedValue={current}
          style={style}
        />
      )}
    </span>
  );
}
