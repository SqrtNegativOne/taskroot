declare module '@event-calendar/core' {
  import type { SvelteComponent } from 'svelte';

  export class Calendar extends SvelteComponent<{
    plugins: any[];
    options: Record<string, any>;
  }> {
    setOption(name: string, value: any): this;
    getOption(name: string): any;
    getEvents(): any[];
    getEventById(id: string): any;
    addEvent(event: any): any;
    updateEvent(event: any): any;
    removeEventById(id: string): this;
    getView(): any;
    refetchEvents(): this;
    next(): this;
    prev(): this;
    unselect(): this;
    dateFromPoint(x: number, y: number): any;
  }

  export const TimeGrid: any;
  export const Interaction: any;
  export const DayGrid: any;
  export const List: any;
  export const ResourceTimeGrid: any;
  export const ResourceTimeline: any;
}

declare module '@event-calendar/core/index.css';
