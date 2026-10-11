import React from 'react';

export function BadgeGroup({
  children,
  addonText,
  color = 'gray',
  theme = 'modern',
  align = 'trailing',
  size = 'md',
}) {
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-2.5 py-1',
  };

  const badgeSizeClasses = {
    sm: 'text-[9px] px-1.5 py-0.5',
    md: 'text-[11px] px-2 py-0.5',
    lg: 'text-xs px-2.5 py-1',
  };

  const badgeElement = addonText && (
    <span
      className={`rounded-full bg-outline/20 text-white font-bold tracking-wide flex-shrink-0 ${badgeSizeClasses[size] || badgeSizeClasses.md}`}
    >
      {addonText}
    </span>
  );

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full cursor-pointer transition-all hover:bg-white-container hover:shadow-sm ${
        color === 'gray' ? 'bg-white-container-low text-on-surface-variant border border-outline-variant/50' : 'bg-primary text-white'
      } ${sizeClasses[size] || sizeClasses.md}`}
    >
      {align !== 'trailing' && badgeElement}
      <span className="font-medium px-1 flex-grow truncate">{children}</span>
      {align === 'trailing' && badgeElement}
      <span className="material-symbols-outlined text-[16px] opacity-70 group-hover:opacity-100 flex-shrink-0">
        chevron_right
      </span>
    </div>
  );
}
