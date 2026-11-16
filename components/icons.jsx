import React from "react";

// Íconos de las acciones. Criterio único para los botones:
//   - CheckIcon: confirma un formulario (registrar, asignar, guardar, enviar).
//   - PlusIcon: agrega un elemento a una lista (nuevo tramo, nuevo tipo de turno).
//   - DownloadIcon / UploadIcon: bajar o subir un archivo.
function Svg({ className = "h-3 w-3", children }) {
  return (
    <svg aria-hidden="true" className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" viewBox="0 0 24 24">
      {children}
    </svg>
  );
}

export function CheckIcon({ className }) {
  return <Svg className={className}><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>;
}

export function PlusIcon({ className }) {
  return <Svg className={className}><path d="M12 5v14M5 12h14" /></Svg>;
}

export function DownloadIcon({ className }) {
  return <Svg className={className}><path d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14" /></Svg>;
}

export function UploadIcon({ className }) {
  return <Svg className={className}><path d="M12 15V4m0 0L8 8m4-4l4 4M5 19h14" /></Svg>;
}

export function CalendarIcon({ className = "h-[1.15em] w-[1.15em]" }) {
  return <Svg className={className}><path d="M8 3v3m8-3v3M4 9h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" /></Svg>;
}

export function ClockIcon({ className = "h-[1.15em] w-[1.15em]" }) {
  return <Svg className={className}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Svg>;
}

export function ChevronLeftIcon({ className = "h-3.5 w-3.5" }) {
  return <Svg className={className}><path d="M15 18l-6-6 6-6" /></Svg>;
}

export function ChevronRightIcon({ className = "h-3.5 w-3.5" }) {
  return <Svg className={className}><path d="M9 6l6 6-6 6" /></Svg>;
}
