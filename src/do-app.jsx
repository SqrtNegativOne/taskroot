// Do screen — hero stopwatch + collapsible sections.

function DoApp() {
  React.useEffect(() => { seedDefaults(); }, []);

  return (
    <div className="app app-do">
      <TopBar today={TODAY} current="do" />

      <main className="do-main">
        <Stopwatch />

        <div className="do-sections">
          <Collapsible
            title="distraction log"
            defaultOpen={true}
            badge={<DistractionBadge />}
          >
            <DistractionLog />
          </Collapsible>

          <Collapsible
            title="current tasks"
            defaultOpen={false}
            badge={<KanbanBadge />}
          >
            <Kanban />
          </Collapsible>

          <Collapsible
            title="tips"
            defaultOpen={false}
            badge={<TipsBadge />}
          >
            <TipsList />
          </Collapsible>

          <Collapsible
            title="notes"
            defaultOpen={false}
            badge={<NotesBadge />}
          >
            <NotesList />
          </Collapsible>
        </div>
      </main>
    </div>
  );
}

function DistractionBadge() {
  const [rows] = useStored('distractions', SAMPLE_DISTRACTIONS);
  return <span className="badge-count">{rows.length} {rows.length === 1 ? 'entry' : 'entries'}</span>;
}
function KanbanBadge() {
  const [tasks] = useStored('tasks', SAMPLE_TASKS);
  const active = tasks.filter(t => t.status === 'doing').length;
  return <span className="badge-count">{tasks.length} tasks · {active} active</span>;
}
function TipsBadge() {
  const [tips] = useStored('tips', SAMPLE_TIPS);
  return <span className="badge-count">{tips.length} {tips.length === 1 ? 'tip' : 'tips'}</span>;
}
function NotesBadge() {
  const [notes] = useStored('notes', SAMPLE_NOTES);
  return <span className="badge-count">{notes.length} {notes.length === 1 ? 'note' : 'notes'}</span>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<DoApp />);
