// Fails when the `any` type keyword appears anywhere in src/. It walks the
// TypeScript syntax tree, so the word "any" in strings or comments is ignored.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';

const root = join(import.meta.dirname, '..', 'src');

function listSourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

const findings = [];

for (const file of listSourceFiles(root)) {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  const visit = (node) => {
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      const { line, character } = source.getLineAndCharacterOfPosition(node.getStart());
      findings.push(`${relative(process.cwd(), file)}:${line + 1}:${character + 1}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

if (findings.length > 0) {
  console.error(`Found the \`any\` type in ${findings.length} place(s):`);
  for (const finding of findings) console.error(`  ${finding}`);
  process.exit(1);
}

console.log('No `any` types in src/.');
