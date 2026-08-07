import React, { useState, useEffect, useRef } from 'react';
import type { AppTask, AppEvent } from '../../core/domain/models';
import { search } from './search';
import { parseCommands } from './commandParser';
import type { CommandOption } from './commandParser';
import { parseSigils } from '../../core/utils/sigil-parser';

import './launcher.css';

const staticCommands: CommandOption[] = [
    { id: 'docs', label: 'Help, Info, Docs', action: 'NAVIGATE', payload: { route: 'docs' }, static: true },
    { id: 'plan', label: 'Plan', action: 'NAVIGATE', payload: { route: 'plan' }, static: true },
    { id: 'do', label: 'Do', action: 'NAVIGATE', payload: { route: 'do' }, static: true },
    { id: 'minitracker', label: 'Reset Mini Tracker', action: 'RESET_MINITRACKER', static: true },
];

const navAliases = [
    { label: 'docs', id: 'docs' }, { label: 'help', id: 'docs' }, { label: 'info', id: 'docs' },
    { label: 'plan', id: 'plan' }, { label: 'do', id: 'do' },
    { label: 'minitracker', id: 'minitracker' }, { label: 'tracker', id: 'minitracker' }, { label: 'timer', id: 'minitracker' }, { label: 'clock', id: 'minitracker' }
];

const executeCommand = (cmd: CommandOption) => {
    if (window.electronAPI) {
        window.electronAPI.executeLauncherCommand(cmd);
        window.electronAPI.hideLauncher();
    }
};

const MAX_RESULTS = 10;

export function LauncherScreen() {
    const [query, setQuery] = useState('');
    const [tasks, setTasks] = useState<AppTask[]>([]);
    const [events, setEvents] = useState<AppEvent[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const api = window.electronAPI;
        if (api?.onLauncherDataUpdate) {
            api.onLauncherDataUpdate((data) => {
                if (data && typeof data === 'object') {
                    const newTasks = Reflect.get(data, 'tasks');
                    if (Array.isArray(newTasks)) {
                        setTasks(newTasks.filter((obj): obj is AppTask => 
                            typeof obj === 'object' && obj !== null && 
                            typeof Reflect.get(obj, 'id') === 'string' && 
                            typeof Reflect.get(obj, 'title') === 'string' && 
                            typeof Reflect.get(obj, 'status') === 'string'
                        ));
                    }
                    const newEvents = Reflect.get(data, 'events');
                    if (Array.isArray(newEvents)) {
                        setEvents(newEvents.filter((obj): obj is AppEvent => 
                            typeof obj === 'object' && obj !== null && 
                            typeof Reflect.get(obj, 'id') === 'string' && 
                            typeof Reflect.get(obj, 'title') === 'string' && 
                            typeof Reflect.get(obj, 'startTime') === 'string' && 
                            typeof Reflect.get(obj, 'endTime') === 'string'
                        ));
                    }
                }
            });
        }
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    // Combine static search with parsed commands
    const parsed = parseCommands(query, tasks, events);

    // Fuzzy search over static and tasks/events shortcuts
    const searchedStatic: CommandOption[] = [];
    if (query.trim() === '') {
        // No query, show top default suggestions
    } else {
        const matchedAliases = search(query, navAliases);
        const addedIds = new Set<string>();
        matchedAliases.forEach(alias => {
            if (!addedIds.has(alias.id)) {
                const cmd = staticCommands.find(c => c.id === alias.id);
                if (cmd) {
                    searchedStatic.push(cmd);
                    addedIds.add(alias.id);
                }
            }
        });
    }

    const options = [...parsed, ...searchedStatic];

    useEffect(() => {
        setSelectedIndex(0);
        
        if (window.electronAPI?.resizeLauncher) {
            const container = document.querySelector('.launcher-container');
            if (container) {
                // Ensure DOM has updated
                setTimeout(() => {
                    if (!container) return;
                    const h = container.getBoundingClientRect().height;
                    window.electronAPI?.resizeLauncher(Math.ceil(h));
                }, 0);
            }
        }
    }, [query, options.length]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % Math.max(options.length, 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev - 1 + Math.max(options.length, 1)) % Math.max(options.length, 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (options[selectedIndex]) {
                executeCommand(options[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            window.electronAPI?.hideLauncher();
        }
    };

    return (
        <div className="launcher-container" data-launcher="true">
            <div className="launcher-input-row" style={{ position: "relative" }}>
                <div
                    className="launcher-input"
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        color: "transparent",
                        pointerEvents: "none",
                        whiteSpace: "pre-wrap",
                        overflow: "hidden",
                        border: "none",
                        background: "transparent",
                        margin: 0,
                        wordBreak: "break-word",
                    }}
                >
                    {parseSigils(query).tokens.map((t, i) => (
                        // oxlint-disable-next-line react(no-array-index-key)
                        <span key={`${i}-${t.text}`} style={t.type === "sigil" ? { backgroundColor: "rgba(255, 75, 75, 0.4)", borderRadius: "3px" } : {}}>{t.text}</span>
                    ))}
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search or command..."
                    className="launcher-input"
                    spellCheck={false}
                    style={{ background: "transparent", position: "relative" }}
                />
            </div>
            <div className="launcher-results" style={{ display: options.length > 0 ? 'block' : 'none' }}>
                {options.slice(0, MAX_RESULTS).map((opt, i) => (
                    <button
                        key={`${opt.id}-${opt.label}`}
                        className={`launcher-row ${i === selectedIndex ? 'selected' : ''}`}
                        onClick={() => executeCommand(opt)}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
