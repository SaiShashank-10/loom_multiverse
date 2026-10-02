import postcss from 'postcss';
import ts from 'typescript';

export interface StyleContract { utilityCss: boolean; classes: string[]; rules?: string }

export function styleContract(files: Map<string, string>, target: string): StyleContract | undefined {
  const packages = [...files.keys()].filter((file) => /(?:^|\/)package\.json$/.test(file));
  const roots = packages.map((file) => file.slice(0, -'package.json'.length));
  const root = roots.filter((prefix) => target.startsWith(prefix)).sort((a, b) => b.length - a.length)[0] ?? '';
  const local = [...files].filter(([file]) => file.startsWith(root) && !roots.some((child) => child.length > root.length && file.startsWith(child)));
  const styles = local.filter(([file]) => /\.css$/.test(file));
  if (!styles.length && !local.some(([file]) => file.endsWith('package.json'))) return undefined;
  const classes = new Set<string>();
  const terms = target.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2 && !['src','components','jsx','tsx'].includes(word));
  const rules: Array<{ text: string; score: number }> = [];
  let utilityCss = local.some(([file, source]) => file.endsWith('package.json') && /"(?:tailwindcss|@tailwindcss\/[^"\s]+|@unocss\/[^"\s]+|unocss|windicss|twind|nativewind|bootstrap|bulma|tachyons|primeflex)"/.test(source));
  for (const [, source] of styles) {
    // A directive is a request for a compiler, not evidence that it is installed.
    postcss.parse(source).walkRules((rule) => {
      for (const match of rule.selector.matchAll(/\.([a-zA-Z_][\w-]*)/g)) classes.add(match[1]!);
      const score = terms.filter((term) => rule.selector.toLowerCase().includes(term)).length;
      {
        const parent = rule.parent;
        const text = parent?.type === 'atrule' ? `@${parent.name} ${parent.params} { ${rule.toString()} }` : rule.toString();
        rules.push({ text, score: score || (/^(?::root|body|h[1-6](?:,|$)|button(?:,|$))/.test(rule.selector) ? 1 : 0) });
      }
    });
  }
  return { utilityCss, classes: [...classes], rules: rules.sort((a, b) => b.score - a.score).map((rule) => rule.text).join('\n').slice(0, 4000) };
}

export function styleInstructions(contract?: StyleContract): string {
  if (!contract) return '';
  const equivalence = 'Judge equivalent visual behavior, not identical class names. For example a CSS :hover rule with transform: scale(1.02), box-shadow and a transition can implement reference hover utilities. Verify the actual values rather than requiring utility syntax. Reuse the declared theme tokens; do not invent token names or require renamed variables when existing tokens have equivalent values. Identify concrete missing values or interactions when repair is needed.';
  return contract.utilityCss ? `A utility CSS dependency is declared; preserve its build integration. ${equivalence}` : `This component uses plain CSS. Stitch utility classes are reference data, NOT available runtime styles. Use the existing CSS classes below (with matching DOM nesting), or implement real styles; do not copy undefined Tailwind utilities. ${equivalence} Available classes: ${contract.classes.join(' ').slice(0, 3500)}\nRelevant actual CSS declarations:\n${contract.rules ?? ''}`;
}

/** Catch the observed silent failure: copied utility classes without a utility CSS runtime. */
export function validateStyleBindings(file: string, source: string, contract?: StyleContract) {
  if (contract && !contract.utilityCss && /\.css$/.test(file) && /@tailwind\b|@apply\b|@import\s+(?:url\()?\s*["']tailwindcss/.test(source)) {
    throw new Error(`${file}: Tailwind directives require a declared Tailwind dependency and build integration. The current package uses plain CSS; implement the approved design tokens and styles as real CSS declarations.`);
  }
  if (!contract || contract.utilityCss || !/\.[jt]sx?$|\.(?:vue|svelte|html)$/.test(file)) return;
  if (/\.module\.(?:css|scss)|styled\s*\.|\bcss\s*[`(]/.test(source)) return;
  const known = new Set(contract.classes);
  // Inline stylesheets are legitimate definitions too; do not execute their content.
  for (const block of source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    for (const match of block[1]!.matchAll(/\.([a-zA-Z_][\w-]*)\s*[{,:.\s]/g)) known.add(match[1]!);
  }
  const missing = new Set<string>();
  const values = [...source.matchAll(/\bclass(?:Name)?\s*=\s*["']([^"']+)["']/g)].map(match => match[1]!);
  if (/\.[jt]sx?$/.test(file)) {
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const literals = (node: ts.Node): void => {
      if (ts.isStringLiteralLike(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) values.push(node.text);
      ts.forEachChild(node, literals);
    };
    const visit = (node: ts.Node): void => {
      if (ts.isJsxAttribute(node) && /^(?:class|className)$/.test(node.name.getText(tree)) && node.initializer) literals(node.initializer);
      else ts.forEachChild(node, visit);
    };
    visit(tree);
  }
  for (const value of values) {
    for (const name of value.split(/\s+/)) {
      if (!known.has(name) && /^(?:(?:sm|md|lg|xl|hover|focus|dark):)*(?:(?:bg|text|rounded|shadow|border|gap|grid-cols|items|justify|scale|duration|ease|ring)-|[mp][xytrbl]?-(?:\d|\[))/.test(name)) missing.add(name);
    }
  }
  if (missing.size >= 3) throw new Error(`${file}: undefined utility CSS classes (${[...missing].slice(0, 8).join(', ')}). This project uses plain CSS; translate Stitch classes to the existing stylesheet selectors instead of producing an unstyled UI.`);
}
