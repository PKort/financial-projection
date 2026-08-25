import React from 'react';

export function EditIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></svg>;
}

export function DeleteIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></svg>;
}

export function IconButton({ title, colorClass, onClick, children }: {
  title: string;
  colorClass: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
}) {
  return <button type="button" title={title} onClick={onClick} className={`inline-flex h-8 w-8 items-center justify-center rounded border border-gray-700 bg-gray-800 ${colorClass} hover:bg-gray-700`}>{children}</button>;
}
