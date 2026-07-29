import { Project, SyntaxKind, TypeGuards, Node } from 'ts-morph';

const project = new Project({
    tsConfigFilePath: "tsconfig.json",
});

project.addSourceFilesAtPaths("src/**/*.{ts,tsx}");
const sourceFiles = project.getSourceFiles();

let unnecessaryCount = 0;

console.log(`Analyzing ${sourceFiles.length} source files for optional properties and parameters with '| null'...`);
for (const sf of sourceFiles) {
    let fileHasIssue = false;
    
    // Optional properties in Interfaces/Types
    sf.getDescendantsOfKind(SyntaxKind.PropertySignature).forEach(prop => {
        if (prop.hasQuestionToken()) {
            const typeNode = prop.getTypeNode();
            if (typeNode && typeNode.getText().includes('null')) {
                console.log(`[${sf.getFilePath()}:${prop.getStartLineNumber()}] Optional property has '| null': ${prop.getText()}`);
                unnecessaryCount++;
            }
        }
    });

    // Optional parameters
    sf.getDescendantsOfKind(SyntaxKind.Parameter).forEach(param => {
        if (param.hasQuestionToken()) {
            const typeNode = param.getTypeNode();
            if (typeNode && typeNode.getText().includes('null')) {
                console.log(`[${sf.getFilePath()}:${param.getStartLineNumber()}] Optional parameter has '| null': ${param.getText()}`);
                unnecessaryCount++;
            }
        }
    });
    
    // useState<T | null>(null)
    sf.getDescendantsOfKind(SyntaxKind.CallExpression).forEach(call => {
        if (call.getExpression().getText() === "useState" || call.getExpression().getText() === "React.useState") {
            const typeArgs = call.getTypeArguments();
            const args = call.getArguments();
            if (typeArgs.length === 1 && args.length === 1 && args[0].getText() === "null") {
                const typeArg = typeArgs[0];
                if (typeArg && typeArg.getText().includes('null')) {
                    console.log(`[${sf.getFilePath()}:${call.getStartLineNumber()}] useState with null: ${call.getText()}`);
                    unnecessaryCount++;
                }
            }
        }
    });
}

console.log(`Found ${unnecessaryCount} potentially unnecessary null uses.`);
