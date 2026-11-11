import React from 'react';
import { getStatusStyle, getStatusLabel } from '../utils/styleHelpers';

// One status format used on every page: pill with a colour dot and Thai label.
// `className` lets a page add layout only (margins, alignment), not colour or type.
const StatusBadge = ({ status, className = '' }) => (
    <span
        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-5 ${getStatusStyle(status)} ${className}`}
    >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
        {getStatusLabel(status)}
    </span>
);

export default StatusBadge;
