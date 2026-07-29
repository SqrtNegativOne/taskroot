import { Project, SyntaxKind, Node } from 'ts-morph';

const project = new Project({
    tsConfigFilePath: "tsconfig.json",
});

project.addSourceFilesAtPaths("src/**/*.{ts,tsx}");
const sourceFiles = project.getSourceFiles();

let fixedCount = 0;

function removeNullFromType(typeText: string): string {
    return typeText
        .replace(/\|\s*null\b/g, '')
        .replace(/\bnull\s*\|/g, '')
        .trim();
}

console.log(`Analyzing and fixing ${sourceFiles.length} source files...`);
for (const sf of sourceFiles) {
    let fileModified = false;
    
    // Optional properties in Interfaces/Types
    sf.getDescendantsOfKind(SyntaxKind.PropertySignature).forEach(prop => {
        if (prop.hasQuestionToken()) {
            const typeNode = prop.getTypeNode();
            if (typeNode && typeNode.getText().includes('null')) {
                const newType = removeNullFromType(typeNode.getText());
                prop.setType(newType);
                fileModified = true;
                fixedCount++;
            }
        }
    });

    // Optional properties in Classes
    sf.getDescendantsOfKind(SyntaxKind.PropertyDeclaration).forEach(prop => {
        if (prop.hasQuestionToken()) {
            const typeNode = prop.getTypeNode();
            if (typeNode && typeNode.getText().includes('null')) {
                const newType = removeNullFromType(typeNode.getText());
                prop.setType(newType);
                fileModified = true;
                fixedCount++;
            }
        }
    });

    // Optional parameters
    sf.getDescendantsOfKind(SyntaxKind.Parameter).forEach(param => {
        if (param.hasQuestionToken()) {
            const typeNode = param.getTypeNode();
            if (typeNode && typeNode.getText().includes('null')) {
                const newType = removeNullFromType(typeNode.getText());
                param.setType(newType);
                fileModified = true;
                fixedCount++;
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
                    const newType = removeNullFromType(typeArg.getText());
                    // Hacky way to set type arguments in ts-morph: 
                    // replace the type arg node with new string, and remove the argument
                    call.removeArgument(0);
                    // For type args, we have to recreate the call expression, or we can just replace text
                    // But ts-morph supports manipulating type arguments, though it's tricky.
                    // Instead, let's just replace the whole text of the call expression:
                    const oldText = call.getText();
                    const newText = oldText.replace(typeArg.getText(), newType).replace(/\(null\)$/, '()');
                    call.replaceWithText(newText);
                    fileModified = true;
                    fixedCount++;
                }
            }
        }
    });

    if (fileModified) {
        sf.saveSync();
    }
}

console.log(`Fixed ${fixedCount} potentially unnecessary null uses.`);
