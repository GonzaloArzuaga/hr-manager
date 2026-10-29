import React, { useState } from "react";
import { getEmployeeAvatar } from "../data/employeeAvatars";

const avatarSizes = {
  sm: "h-6 w-6 text-[0.5rem]",
  md: "h-7 w-7 text-[0.5625rem]",
  lg: "h-9 w-9 text-xs",
};
const avatarStyles = {
  amber: "bg-amber-100 text-amber-800",
  blue: "bg-blue-100 text-blue-800",
  green: "bg-emerald-100 text-emerald-800",
  indigo: "bg-indigo-100 text-indigo-800",
  navy: "bg-blue-900 text-white",
  orange: "bg-orange-100 text-orange-800",
  purple: "bg-indigo-100 text-blue-800",
  red: "bg-rose-100 text-rose-800",
  sky: "bg-sky-100 text-sky-800",
  slate: "bg-slate-200 text-slate-700",
  teal: "bg-teal-100 text-teal-800",
};

function getInitials(name, initials) {
  if (initials) return initials;
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("es"))
    .join("");
}

export default function EmployeeIdentity({
  name,
  employeeId,
  department,
  detail,
  initials,
  avatarUrl,
  avatarStyle = "blue",
  avatarClassName = "",
  size = "md",
  className = "",
  nameClassName = "",
  nameExtra = null,
  metadataClassName = "",
}) {
  const [brokenUrl, setBrokenUrl] = useState(null);
  const candidateUrl = avatarUrl ?? getEmployeeAvatar(name);
  // Si la foto ya no existe (por ejemplo, el empleado la quitó) se muestran las iniciales
  const resolvedAvatarUrl = candidateUrl && candidateUrl !== brokenUrl ? candidateUrl : null;
  const metadata = [
    employeeId ? `Leg. #${employeeId}` : null,
    department,
  ].filter(Boolean).join(" • ");

  return (
    <div className={`flex min-w-0 items-center gap-2 ${className}`}>
      {resolvedAvatarUrl ? (
        <img
          alt=""
          className={`shrink-0 rounded-full object-cover ${avatarSizes[size] ?? avatarSizes.md}`}
          onError={() => setBrokenUrl(resolvedAvatarUrl)}
          src={resolvedAvatarUrl}
        />
      ) : (
        <span
          aria-hidden="true"
          className={`flex shrink-0 items-center justify-center rounded-full font-bold ${avatarSizes[size] ?? avatarSizes.md} ${avatarStyles[avatarStyle] ?? avatarStyles.blue} ${avatarClassName}`}
        >
          {getInitials(name, initials)}
        </span>
      )}
      <span className="min-w-0">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className={`block truncate font-bold text-slate-900 ${nameClassName}`}>
            {name}
          </span>
          {nameExtra}
        </span>
        {(metadata || detail) && (
          <span className={`block truncate text-slate-500 ${metadataClassName}`}>
            {metadata}
            {metadata && detail ? ` • ${detail}` : detail}
          </span>
        )}
      </span>
    </div>
  );
}
