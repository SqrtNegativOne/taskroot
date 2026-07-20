  Taskroot does not harvest, store, or care about your gender, languages, or public info. It only
  uses the secure token provided by Google to authorize you to read and write your own tasks to
  the Firestore database.
  
# Design bits
Why doesn't the app allow you to see multiple timelines? It would be hard to code. Also, take things one at a time.

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