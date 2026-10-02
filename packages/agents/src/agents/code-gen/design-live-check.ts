import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { config } from '@loom/shared/config';
import { createTier2LLM } from '../../llm/index.js';
import { ensureOllamaReady } from '../../llm/ollama-health.js';
import { ApplicationWorkerTeam, InterfaceIndex } from './application-workers.js';
import { loadDesignReference, designEvidenceFor, designHash } from './design-reference.js';

/** Opt-in live model exercise. Writes an isolated preview, never replaces client source. */
async function main() {
  const project = process.argv[2];
  if (!project || !/^[\w-]+$/.test(project)) throw new Error('Usage: design-live-check.ts <project-id> (React Job Search fixture)');
  if (config.LLM_PROVIDER !== 'ollama') throw new Error('This live check requires the configured local Ollama provider');
  const modelFlag = process.argv.indexOf('--model');
  const modelName = modelFlag >= 0 ? process.argv[modelFlag + 1] : config.OLLAMA_CODE_MODEL;
  if (!modelName || !/^[\w./:-]+$/.test(modelName)) throw new Error('Invalid local model name');
  const root = path.resolve('runs/workspaces', project);
  const checkpoint = JSON.parse(await fs.readFile(path.join(root, 'pipeline-checkpoint.json'), 'utf8'));
  const reference = await loadDesignReference(root, checkpoint.context.stitch);
  if (!reference) throw new Error('An approved UI reference is required');
  const output = path.join(root, '.loom-design', 'live-check', new Date().toISOString().replace(/[:.]/g, '-'));
  await fs.mkdir(output, { recursive: true });
  console.log(`Live check output: ${output}`);
  const startedAt = Date.now();
  let calls = 0;
  const report: Record<string, unknown> = { project, model: modelName, design: reference.fingerprint, scope: 'One React Job Search result card using existing CSS; not a full pipeline run', passed: false };
  try {
    await ensureOllamaReady(config.OLLAMA_BASE_URL, modelName, console.log);
    const model = createTier2LLM({ model: modelName, maxTokens: 4096, contextWindow: 16384, temperature: 0.1 });
    const invoke = model.invoke.bind(model);
    model.invoke = async (...args: Parameters<typeof invoke>) => {
      const call = ++calls;
      console.log(`Inference ${call} started`);
      const response = await invoke(...args);
      await fs.writeFile(path.join(output, `response-${call}.json`), JSON.stringify({ content: response.content, usage: response.usage_metadata }, null, 2));
      console.log(`Inference ${call} completed`);
      return response;
    };
    const index = new InterfaceIndex();
    index.add('src/index.css', await fs.readFile(path.join(root, 'src/index.css'), 'utf8'));
    const file = { path: 'src/components/JobCard.jsx', description: 'Job Search & Skill Match result card ONLY. Export default function JobCard({job}). Render company mark, title, company, location, workplace, salary, posted age, sample match badge, matched skills, gap hint, accessible working save/unsave toggle, and details anchor. Use the existing shared CSS classes. Parent owns navigation, search, filters and rails; do not implement those inside this card. job fields: id,title,company,location,workplace,salary,posted,match,skills (string array),gap,color. Label match as a sample score.' };
    const content = await new ApplicationWorkerTeam(() => model).generate(file, 'React application matching the approved Stitch design. This bounded fixture tests an individual frontend worker and its design reviewer with real local-model inference.', {
      structure: 'src/index.css\nsrc/components/JobCard.jsx',
      interfaces: index.forFile(file.path, file.description),
      styling: index.stylingFor(file.path),
      constraints: 'Use React JSX and import React/useState from react. Only external import allowed is react. Stylesheet is loaded by the host. All fixture data is explicitly sample data. Use semantic HTML, not images of the interface. Do not implement network requests in this presentation component.',
      design: designEvidenceFor(reference, file.path, file.description),
    });
    await fs.writeFile(path.join(output, 'JobCard.jsx'), content);
    const compiled = ts.transpileModule(content, { compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } }).outputText;
    await fs.writeFile(path.join(output, 'JobCard.cjs'), compiled);
    const require = createRequire(path.join(output, 'host.cjs'));
    const React = require('react');
    const { renderToStaticMarkup } = require('react-dom/server');
    const Component = require('./JobCard.cjs').default;
    const job = { id: 'sample', title: 'Junior Frontend Engineer', company: 'Stripe, Inc.', location: 'San Francisco, CA', workplace: 'Hybrid', salary: '$105,000 – $125,000 / yr', posted: '1d ago', match: 94, skills: ['React 18', 'TypeScript', 'Tailwind CSS', 'REST APIs'], gap: 'Next.js SSR', color: '#635bff' };
    const markup = renderToStaticMarkup(React.createElement(Component, { job }));
    for (const text of [job.title, job.company, 'TypeScript', '94']) if (!markup.includes(text)) throw new Error(`Rendered result is missing ${text}`);
    if (!/<button\b/.test(markup) || !/<a\b/.test(markup)) throw new Error('Missing save button or details link');
    await fs.writeFile(path.join(output, 'rendered.html'), markup);
    await fs.writeFile(path.join(output, 'main.jsx'), `import React from 'react';\nimport {createRoot} from 'react-dom/client';\nimport JobCard from './JobCard.jsx';\nimport '/src/index.css';\ncreateRoot(document.getElementById('root')).render(<main style={{maxWidth:900,margin:'32px auto',padding:16}}><p>Live model output · sample data · isolated verification</p><JobCard job={${JSON.stringify(job)}} /></main>);\n`);
    await fs.writeFile(path.join(output, 'index.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Live design generation check</title></head><body><div id="root"></div><script type="module" src="./main.jsx"></script></body></html>');
    Object.assign(report, { passed: true, sourceSha256: designHash(content), renderedBytes: markup.length, visualReview: 'pending' });
    console.log(`Preview path: /${path.relative(root, output).replace(/\\/g, '/')}/index.html`);
  } catch (error) {
    report.error = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    Object.assign(report, { calls, elapsedSeconds: Math.round((Date.now() - startedAt) / 1000) });
    await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  }
}
main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
