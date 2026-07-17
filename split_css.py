import os
import re

CSS_PATH = 'src/index.css'
with open(CSS_PATH, 'r', encoding='utf-8') as f:
    lines = f.readlines()

def get_line_idx(pattern):
    for i, line in enumerate(lines):
        if pattern in line:
            return i
    return -1

# We will define ranges to extract.
# Format: (start_pattern, end_pattern_or_None, filename, import_path)
extractions = [
    ("/* ── Task pane (left) ", "/* ── Right pane ", "src/features/plan/tasklist.css", "./features/plan/tasklist.css"),
    ("/* ── Month calendar ", "/* ── Day calendar ", "src/features/plan/date-grid.css", "./features/plan/date-grid.css"),
    ("/* ── Day calendar ", "/* DO SCREEN", "src/features/plan/day-timeline.css", "./features/plan/day-timeline.css"),
    ("/* ── Stopwatch hero ", "/* ── Collapsible sections ", "src/features/do/stopwatch.css", "./features/do/stopwatch.css"),
    ("/* ── Distraction log ", "/* ── Kanban ", "src/features/do/distraction-log.css", "./features/do/distraction-log.css"),
    ("/* ── Kanban ", "/* ── Tips ", "src/features/do/kanban.css", "./features/do/kanban.css"),
    ("/* ── Tips ", "/* ── Notes ", "src/features/do/tips.css", "./features/do/tips.css"),
    ("/* ── Notes ", "/* REST SCREEN", "src/features/do/notes.css", "./features/do/notes.css"),
    ("/* REST SCREEN", None, "src/features/rest/rest.css", "./features/rest/rest.css"),
]

imports = []
to_delete = set()

for start_pat, end_pat, filepath, imp_path in extractions:
    start_idx = get_line_idx(start_pat)
    
    if end_pat is None:
        end_idx = len(lines)
    else:
        end_idx = get_line_idx(end_pat)
        # We need to backtrack a little if the end_pat is part of a large block comment, but let's just go up to end_idx - 1 unless it's a big block.
        if "/* ────────" in lines[end_idx-1]:
            end_idx = end_idx - 1
            if "/* ────────" in lines[end_idx-1]:
                 end_idx = end_idx - 1

    if start_idx != -1 and end_idx != -1:
        # Go back slightly for Day calendar end (since DO SCREEN has a big block)
        if "DO SCREEN" in start_pat or "DO SCREEN" in (end_pat or "") or "REST SCREEN" in (end_pat or ""):
            # We already handled it mostly, let's refine
            pass
        
        extracted_lines = lines[start_idx:end_idx]
        
        # Write to file
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(extracted_lines)
            
        imports.append(f"@import '{imp_path}';")
        
        # Mark lines for deletion
        for i in range(start_idx, end_idx):
            to_delete.add(i)

# Reconstruct index.css
new_lines = []
for imp in imports:
    new_lines.append(imp + "\n")

# Put imports at the top, after the :root and general variables?
# Actually it's safer to put them at the top of the file, or exactly where they were.
# But CSS `@import` must be at the very top of the stylesheet.
# Let's insert them at the top, just before :root? Wait, @import must precede all other statements.
# Except @charset.
final_lines = imports + ["\n"] + [line for i, line in enumerate(lines) if i not in to_delete]

with open(CSS_PATH, 'w', encoding='utf-8') as f:
    f.writelines(final_lines)

print(f"Extracted {len(imports)} files.")
