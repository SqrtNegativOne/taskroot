import React from 'react';
import { Icon } from './icon';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = "" }: SearchBarProps) {
  return (
    <div className="task-pane-search" style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
      <Icon name="search" size={14} style={{ color: 'var(--fg-dimmer)' }} />
      <input
        className="search-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        placeholder={placeholder}
        style={{ flex: 1 }}
      />
      {value && (
        <button className="search-clear" onClick={() => onChange('')} aria-label="clear">×</button>
      )}
    </div>
  );
}
