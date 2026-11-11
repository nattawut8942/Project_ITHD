import React, { useState } from 'react';

// Employee photos come from the company photo server. The whole photo is shown
// (object-contain, no crop); the minimum size keeps it legible.
const PHOTO_HOST = 'http://dcidmc.dci.daikin.co.jp/PICTURE';
const MIN_SIZE = 48;

export const employeePhotoUrl = (empCode) =>
  empCode ? `${PHOTO_HOST}/${encodeURIComponent(empCode)}.jpg` : null;

const initialsOf = (name) => {
  const parts = String(name || '?').trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
};

export default function EmployeeAvatar({ empCode, src, name, size = MIN_SIZE, className = '', tone = 'bg-paper' }) {
  const [failed, setFailed] = useState(false);
  const url = src || employeePhotoUrl(empCode);
  const px = Math.max(MIN_SIZE, Number(size) || MIN_SIZE);

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line ${tone} ${className}`}
      style={{ width: px, height: px }}
    >
      {url && !failed ? (
        <img
          src={url}
          alt={name || ''}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-contain"
        />
      ) : (
        <span className="text-sm font-bold text-slate-600" aria-hidden="true">{initialsOf(name)}</span>
      )}
    </span>
  );
}
