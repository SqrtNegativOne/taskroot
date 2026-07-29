import * as fs from 'fs';
import * as path from 'path';

function walk(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(filePath));
        } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
            results.push(filePath);
        }
    }
    return results;
}

const files = walk('src');
let fixedCount = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Fix `?: Type | null`
    // We can do a simpler replace: ` | null` followed by `;` or `,` or `\n` or `}`
    // But since `| null` is typically safely replaceable in `?:` contexts, 
    // let's just do a specific replace for the exact lines we found.

    // 1. useState<Type | null>(null) -> useState<Type>()
    content = content.replace(/useState<([^>]+?)\s*\|\s*null>\(null\)/g, 'useState<$1>()');

    // 2. React.useState<Type | null>(null) -> React.useState<Type>()
    content = content.replace(/React\.useState<([^>]+?)\s*\|\s*null>\(null\)/g, 'React.useState<$1>()');

    // 3. Optional properties: `?: Type | null;` -> `?: Type;`
    content = content.replace(/\?:\s*([^;,\n]+?)\s*\|\s*null([;,\n}])/g, '?: $1$2');
    
    // 4. Optional properties with `null | Type`
    content = content.replace(/\?:\s*null\s*\|\s*([^;,\n]+?)([;,\n}])/g, '?: $1$2');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        fixedCount++;
    }
}

console.log(`Fixed ${fixedCount} files.`);
