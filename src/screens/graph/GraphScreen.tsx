import React from 'react';
import { TitleBar } from '../../components/shell';
import { TODAY } from '../../core/data';

export function GraphScreen() {
  return (
    <div className="app">
      <TitleBar current="graph" today={TODAY} />
      <div className="main" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <h2 style={{ color: 'var(--fg)' }}>Graph Screen Placeholder</h2>
      </div>
    </div>
  );
}
