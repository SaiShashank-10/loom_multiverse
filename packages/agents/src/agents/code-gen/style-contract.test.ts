import { expect, it, vi } from 'vitest';
import { styleContract, validateStyleBindings } from './style-contract.js';
import { generateSource } from './source-output.js';

const plain = { utilityCss: false, classes: ['job-card', 'badge'] };
const bad = 'export default () => <article className="bg-white rounded-xl p-5 text-blue-600">Role</article>;';

it('checks static classes inside JSX templates and conditional class expressions', () => {
  const template = 'export const Button = () => <button className={`btn ${extra} hover:scale-102 hover:shadow-lg bg-secondary text-primary`}>Save</button>';
  expect(() => validateStyleBindings('Button.tsx', template, plain)).toThrow('undefined utility CSS');
  expect(() => validateStyleBindings('Button.tsx', 'export const Button = () => <button className={active ? "bg-blue-500 p-4 rounded-lg" : "badge"}>Save</button>', plain)).toThrow('undefined utility CSS');
  expect(() => validateStyleBindings('Button.tsx', 'export const Button = () => <button className={`badge ${extra}`}>Save</button>', plain)).not.toThrow();
});

it('includes abbreviated shared selectors and hover declarations in review evidence', () => {
  const contract = styleContract(new Map([
    ['package.json', '{}'],
    ['styles.css', ':root { --brand: blue; } .btn { background: var(--brand); transition: transform 200ms; } .btn:hover { transform: scale(1.02); box-shadow: 0 10px 15px #0003; }'],
  ]), 'src/components/Button.tsx');
  expect(contract?.rules).toContain('.btn:hover');
  expect(contract?.rules).toContain('scale(1.02)');
});

it('does not mistake generated Tailwind directives for an installed styling runtime', () => {
  const files = new Map([['package.json', '{"dependencies":{"react":"*"}}']]);
  expect(styleContract(files, 'src/global.css')?.utilityCss).toBe(false);
  files.set('src/global.css', '@tailwind base; @tailwind utilities;');
  const contract = styleContract(files, 'src/Card.tsx');
  expect(contract?.utilityCss).toBe(false);
  expect(() => validateStyleBindings('src/global.css', files.get('src/global.css')!, contract)).toThrow('declared Tailwind dependency');
  expect(() => validateStyleBindings('src/Card.tsx', bad, contract)).toThrow('undefined utility CSS');
  expect(() => validateStyleBindings('src/global.css', ':root { --ink: #123; } body { color: var(--ink); }', contract)).not.toThrow();
});

it('rejects copied utility styles without runtime while allowing real plain CSS and inline styles', () => {
  expect(() => validateStyleBindings('JobCard.jsx', bad, plain)).toThrow('undefined utility CSS');
  expect(() => validateStyleBindings('JobCard.jsx', 'export default () => <article className="job-card">Role</article>;', plain)).not.toThrow();
  expect(() => validateStyleBindings('JobCard.jsx', bad, { ...plain, utilityCss: true })).not.toThrow();
  expect(() => validateStyleBindings('JobCard.jsx', bad, { utilityCss: false, classes: ['bg-white', 'rounded-xl', 'p-5', 'text-blue-600'] })).not.toThrow();
});

it('keeps stylesheet runtime scoped to the component package in a multi-project workspace', () => {
  const files = new Map([
    ['web/package.json', '{"dependencies":{"react":"*"}}'],
    ['web/styles.css', '.job-card { color: blue; }'],
    ['admin/package.json', '{"devDependencies":{"tailwindcss":"*"}}'],
    ['admin/styles.css', '@import "tailwindcss";'],
  ]);
  expect(styleContract(files, 'web/src/Card.jsx')).toMatchObject(plainWithCard());
  expect(styleContract(files, 'web/src/Card.jsx')?.rules).toContain('color: blue');
  expect(styleContract(files, 'admin/src/Card.jsx')?.utilityCss).toBe(true);
  expect(styleContract(files, 'api/server.js')).toBeUndefined();
});
function plainWithCard() { return { utilityCss: false, classes: ['job-card'] }; }

it('repairs undefined utility classes through the normal source writer', async () => {
  const invoke = vi.fn().mockResolvedValueOnce({ content: JSON.stringify({ content: bad }) })
    .mockResolvedValueOnce({ content: JSON.stringify({ content: 'export default () => <article className="job-card">Role</article>;' }) });
  const result = await generateSource({ invoke } as any, { path: 'JobCard.jsx', description: 'Job card' }, 'React', 'Frontend', { styling: plain, design: 'Approved card' });
  expect(result).toContain('className="job-card"');
  expect(invoke).toHaveBeenCalledTimes(2);
  expect(invoke.mock.calls[1]![0][1].content).toContain('undefined utility CSS');
  expect(invoke.mock.calls[1]![0][1].content).toContain('Available classes: job-card badge');
});
