const fs = require('fs');
const data = require('./lint.json');

const promises = data.diagnostics.filter(d => d.code === 'typescript(no-floating-promises)');
const fileFixes = {};

promises.forEach(d => {
    if (!fileFixes[d.filename]) fileFixes[d.filename] = [];
    const span = d.labels[0].span;
    fileFixes[d.filename].push(span);
});

for (const [filename, spans] of Object.entries(fileFixes)) {
    let content = fs.readFileSync(filename, 'utf8');
    spans.sort((a, b) => b.offset - a.offset); // reverse order
    for (const span of spans) {
        content = content.slice(0, span.offset) + 'void ' + content.slice(span.offset);
    }
    fs.writeFileSync(filename, content);
}
console.log('Fixed floating promises');
