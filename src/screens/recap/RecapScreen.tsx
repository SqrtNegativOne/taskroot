import React from 'react';
import { TitleBar } from '../../components/shell';
import { TODAY } from '../../core/data';
import { useStored } from '../../core/store';

export function RecapScreen() {
  const [settings] = useStored<any>('settings', { recapDay: '' });
  
  const todayName = TODAY.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const recapDay = (settings.recapDay || '').toLowerCase();
  
  const isTimeForRecap = recapDay === todayName;

  return (
    <div className="app">
      <TitleBar current="recap" today={TODAY} />
      <div className="main" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
        {!isTimeForRecap ? (
           <h2 style={{ color: 'var(--fg)' }}>Come back later. (Today is not {recapDay || 'set in settings'})</h2>
        ) : (
           <h2 style={{ color: 'var(--fg)' }}>Recap Screen Placeholder</h2>
        )}
      </div>
    </div>
  );
}
