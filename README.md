# Task√oot

Highly opinionated and highly powerful task management application for personal use only.
- Optimistic React UI ↔️ store.tsx ↔️ SyncEngine ↔️ API Wrappers ↔️ Google Tasks+Calendar API / Firebase
- All offline data in localStorage ⇒ 0 loading screens.
- Uses bun. ...this isn't really a feature, sorry
- GRAPH MODE.
- Mediocre UI. Like, it's good enough I guess. It's pretty good.
- Neat sound effects that I stole from a twitter post about them

```
  Disclaimer: Taskroot does not harvest, store, or care about your gender, languages, or public info. 
  It only uses the secure token provided by Google to authorize you to read and write your own tasks 
  to the Firestore database.
  Regardless, if you feel this is false advertising, as the log in page for the application promises 
  to do those things, when in real life it doesn't, you are free to email or whatsapp me your private
  information.
```

# Deep Linking (Custom URI Scheme)
Taskroot registers the `taskroot://` protocol to allow external apps or scripts to open it to a specific screen. When triggered, it will focus the existing Taskroot window and navigate to the requested route.

**Examples:**
- `taskroot://wrap` opens the wrap screen.
- `taskroot://plan` opens the plan screen.

**Usage from Python (Windows):**
```python
import os
os.startfile('taskroot://wrap')
```