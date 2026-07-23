const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const coreDir = path.join(srcDir, 'core');

const fileMap = {
  // sync
  'SyncEngine.ts': 'sync',
  'SyncEngine.test.ts': 'sync',
  'GoogleCalendarAPI.ts': 'sync',
  'GoogleTasksAPI.ts': 'sync',
  
  // store
  'store.tsx': 'store',
  'store.test.tsx': 'store',
  'api.ts': 'store',
  'api.test.ts': 'store',
  'data.tsx': 'store',
  'data.test.ts': 'store',
  'settingsSchema.tsx': 'store',
  'settingsSchema.test.ts': 'store',
  
  // domain
  'events.ts': 'domain',
  'events.test.ts': 'domain',
  'filters.ts': 'domain',
  'filters.test.ts': 'domain',
  'rrule-utils.ts': 'domain',
  'rrule-utils.test.ts': 'domain',
  
  // auth
  'AuthContext.tsx': 'auth',
  'AuthContext.test.tsx': 'auth',
  'firebase.ts': 'auth',
  
  // utils
  'logger.ts': 'utils',
  'logger.test.ts': 'utils',
  'notifications.tsx': 'utils',
  'notifications.test.tsx': 'utils',
};

const moduleMap = {};
for (const [file, folder] of Object.entries(fileMap)) {
  const mod = file.replace(/\.tsx?$/, '');
  moduleMap[mod] = folder + '/' + mod;
}

// 1. Create directories
const dirs = [...new Set(Object.values(fileMap))];
dirs.forEach(d => {
  const p = path.join(coreDir, d);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

// 2. Move files
for (const [file, folder] of Object.entries(fileMap)) {
  const oldPath = path.join(coreDir, file);
  const newPath = path.join(coreDir, folder, file);
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
  }
}

// 3. Update imports
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const p = path.join(dir, file);
    const stat = fs.statSync(p);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(p));
    } else {
      if (p.endsWith('.ts') || p.endsWith('.tsx')) {
        results.push(p);
      }
    }
  });
  return results;
}

const allFiles = walk(srcDir);
for (const file of allFiles) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  const inCoreFolder = file.startsWith(coreDir);
  const fileCoreSubfolder = inCoreFolder ? path.basename(path.dirname(file)) : null;

  // Replace /core/X with /core/folder/X (for components outside core)
  const regexOutside = /(['"])((?:\.\.\/)+)core\/([a-zA-Z0-9_-]+)(['"])/g;
  content = content.replace(regexOutside, (match, q1, dots, mod, q2) => {
    if (moduleMap[mod]) {
      changed = true;
      return q1 + dots + 'core/' + moduleMap[mod] + q2;
    }
    return match;
  });

  // Replace ./X with ../folder/X (for files inside core/subfolder)
  if (inCoreFolder && fileCoreSubfolder) {
    const regexInside = /(['"])(\.\/)([a-zA-Z0-9_-]+)(['"])/g;
    content = content.replace(regexInside, (match, q1, dot, mod, q2) => {
      if (moduleMap[mod]) {
        const targetFolder = moduleMap[mod].split('/')[0];
        changed = true;
        if (targetFolder === fileCoreSubfolder) {
          // Same subfolder, keep ./X
          return q1 + './' + mod + q2;
        } else {
          // Different subfolder, use ../targetFolder/X
          return q1 + '../' + targetFolder + '/' + mod + q2;
        }
      }
      return match;
    });
  }

  // Handle special case where a core file imports from another core file using ../ instead of ./
  // Very unlikely but good to check, though regexInside handles ./ and regexOutside handles ../../core
  // What if a core file imports `../../core/X`? Unlikely.
  
  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
  }
}

console.log("Refactoring manual script complete.");
