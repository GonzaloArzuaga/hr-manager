import React, { useId, useMemo, useRef, useState } from "react";
import { ChevronIcon, OptionPanel, normalizeText, useFloatingPanel } from "./Select";

// Campo de texto libre con sugerencias (reemplaza a <datalist>).
// Se usa como un <input> y recibe la lista en "options".
export default function SuggestInput({ className = "", disabled, id, name, onBlur, onChange, onFocus, onKeyDown, options = [], value = "", ...rest }) {
  const autoId = useId();
  const listId = `${id ?? autoId}-list`;
  const [open, setOpen] = useState(false);
  const [filtering, setFiltering] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const style = useFloatingPanel(open, inputRef);

  const shown = useMemo(() => {
    const list = [...new Set(options.filter(Boolean))].map((option) => ({ value: option, label: option }));
    const needle = normalizeText(String(value).trim());
    if (!filtering || !needle) return list;
    return list.filter((option) => normalizeText(option.label).includes(needle));
  }, [options, value, filtering]);

  function emit(next) {
    const target = { name, value: next, id, type: "text" };
    onChange?.({ target, currentTarget: target, preventDefault() {}, stopPropagation() {} });
  }

  function pick(option) {
    emit(option.value);
    setOpen(false);
    setFiltering(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(event) {
    onKeyDown?.(event);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) setOpen(true);
      setActiveIndex((index) => Math.min(shown.length - 1, index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
    } else if (event.key === "Enter" && open && activeIndex >= 0 && shown[activeIndex]) {
      event.preventDefault();
      pick(shown[activeIndex]);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <span className="relative block" ref={wrapperRef}>
      <input
        {...rest}
        aria-activedescendant={open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        aria-autocomplete="list"
        aria-controls={open ? listId : undefined}
        aria-expanded={open && shown.length > 0}
        autoComplete="off"
        className={`${className} pr-7`}
        disabled={disabled}
        id={id}
        name={name}
        onBlur={(event) => {
          if (!panelRef.current?.contains(event.relatedTarget)) setOpen(false);
          onBlur?.(event);
        }}
        onChange={(event) => {
          onChange?.(event);
          setFiltering(true);
          setActiveIndex(-1);
          setOpen(true);
        }}
        onClick={() => setOpen(true)}
        onFocus={(event) => {
          setFiltering(false);
          setActiveIndex(-1);
          setOpen(true);
          onFocus?.(event);
        }}
        onKeyDown={handleKeyDown}
        ref={inputRef}
        role="combobox"
        value={value}
      />
      <button
        aria-label="Ver opciones"
        className="absolute inset-y-0 right-0 flex items-center px-2"
        disabled={disabled}
        onClick={() => {
          setFiltering(false);
          setOpen((current) => !current);
          inputRef.current?.focus();
        }}
        onMouseDown={(event) => event.preventDefault()}
        tabIndex={-1}
        type="button"
      >
        <ChevronIcon open={open && shown.length > 0} />
      </button>
      {open && shown.length > 0 && (
        <OptionPanel
          activeIndex={activeIndex}
          emptyText=""
          listId={listId}
          onHover={setActiveIndex}
          onPick={pick}
          options={shown}
          panelRef={panelRef}
          selectedValue={value}
          style={style}
        />
      )}
    </span>
  );
}
