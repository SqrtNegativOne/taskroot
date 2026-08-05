import { describe, it, expect } from 'vitest';
import { fuzzyScore, search } from './search';
import { parseCommands } from './commandParser';

describe('search', () => {
    it('fuzzyScore works correctly', () => {
        expect(fuzzyScore('p', 'plan')).toBeGreaterThan(0);
        expect(fuzzyScore('crft', 'Create From Template')).toBeGreaterThan(0);
        expect(fuzzyScore('x', 'plan')).toBe(-1);
    });

    it('search sorts items by score', () => {
        const items = [
            { label: 'Do homework', id: 1 },
            { label: 'plan homework', id: 2 },
            { label: 'create from template', id: 3 },
            { label: 'add home chore', id: 4 },
        ];

        const results = search('home', items);
        expect(results.length).toBe(3);
        expect(results[0].id).toBe(1); // 'Do homework' -> 'home' is a complete word boundary match

        const results2 = search('crft', items);
        expect(results2.length).toBe(1);
        expect(results2[0].id).toBe(3);
    });
});

describe('parseCommands', () => {
    it('parses plan command correctly', () => {
        const tasks: import('../../core/domain/models').AppTask[] = [{ id: '1', title: 'Buy milk' }];
        const res = parseCommands('plan milk', tasks);
        expect(res.length).toBe(2);
        expect(res[0].action).toBe('PLAN_TASK');
        expect(res[1].action).toBe('PLAN_TASK_EXISTING');
    });

    it('parses do command correctly', () => {
        const tasks: import('../../core/domain/models').AppTask[] = [{ id: '1', title: 'Buy milk' }];
        const res = parseCommands('do milk', tasks);
        expect(res.length).toBe(2);
        expect(res[0].action).toBe('DO_TASK');
        expect(res[1].action).toBe('DO_TASK_EXISTING');
    });

    it('parses add task command correctly', () => {
        const res = parseCommands('add some task', []);
        expect(res.length).toBe(1);
        expect(res[0].action).toBe('ADD_TASK');
        expect(res[0].payload?.taskName).toBe('some task');
    });
});
