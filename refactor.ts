import { Project } from "ts-morph";
import * as fs from "fs";
import * as path from "path";

const project = new Project();

// Add all files manually just in case tsconfig excludes some
project.addSourceFilesAtPaths("src/**/*.ts");
project.addSourceFilesAtPaths("src/**/*.tsx");

const fileMoves: Record<string, string> = {
  // sync
  "src/core/SyncEngine.ts": "src/core/sync/SyncEngine.ts",
  "src/core/SyncEngine.test.ts": "src/core/sync/SyncEngine.test.ts",
  "src/core/GoogleCalendarAPI.ts": "src/core/sync/GoogleCalendarAPI.ts",
  "src/core/GoogleTasksAPI.ts": "src/core/sync/GoogleTasksAPI.ts",
  
  // store
  "src/core/store.tsx": "src/core/store/store.tsx",
  "src/core/store.test.tsx": "src/core/store/store.test.tsx",
  "src/core/api.ts": "src/core/store/api.ts",
  "src/core/data.tsx": "src/core/store/data.tsx",
  "src/core/data.test.ts": "src/core/store/data.test.ts",
  "src/core/settingsSchema.tsx": "src/core/store/settingsSchema.tsx",
  
  // domain
  "src/core/events.ts": "src/core/domain/events.ts",
  "src/core/events.test.ts": "src/core/domain/events.test.ts",
  "src/core/filters.ts": "src/core/domain/filters.ts",
  "src/core/filters.test.ts": "src/core/domain/filters.test.ts",
  "src/core/rrule-utils.ts": "src/core/domain/rrule-utils.ts",
  "src/core/rrule-utils.test.ts": "src/core/domain/rrule-utils.test.ts",
  
  // auth
  "src/core/AuthContext.tsx": "src/core/auth/AuthContext.tsx",
  "src/core/AuthContext.test.tsx": "src/core/auth/AuthContext.test.tsx",
  "src/core/firebase.ts": "src/core/auth/firebase.ts",
  
  // utils
  "src/core/logger.ts": "src/core/utils/logger.ts",
  "src/core/logger.test.ts": "src/core/utils/logger.test.ts",
  "src/core/notifications.tsx": "src/core/utils/notifications.tsx",
  "src/core/notifications.test.tsx": "src/core/utils/notifications.test.tsx",
};

for (const [oldPath, newPath] of Object.entries(fileMoves)) {
  const sf = project.getSourceFile(oldPath);
  if (sf) {
    sf.move(newPath);
  } else {
    console.warn("Could not find file: " + oldPath);
  }
}

project.saveSync();
console.log("Refactoring complete.");
