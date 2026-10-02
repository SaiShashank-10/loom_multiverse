import { expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile, spawnSync } from "node:child_process";
import { promisify } from "node:util";
import { ensureMLConfig, runMLPipeline } from "./ml-execution.js";

const execute = promisify(execFile);
const hasSklearn =
  spawnSync("python", ["-c", "import sklearn,joblib"], {
    windowsHide: true,
  }).status === 0;

it.skipIf(!hasSklearn)(
  "executes a real fitted estimator, held-out predictions, reload verification and artifact hashes",
  async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "loom-real-ml-"));
    try {
      const ml = path.join(root, "ml");
      await fs.mkdir(ml, { recursive: true });
      await fs.writeFile(path.join(ml, "__init__.py"), "");
      await fs.writeFile(
        path.join(ml, "common.py"),
        `import argparse, csv, hashlib, json
from pathlib import Path
def config():
    parser=argparse.ArgumentParser(); parser.add_argument('--config', required=True)
    return json.loads(Path(parser.parse_args().config).read_text())
def rows(cfg):
    with open(cfg['dataset'], newline='') as handle:
        return [(float(r['x']), float(r['y'])) for r in csv.DictReader(handle)]
def split_hash(split):
    return hashlib.sha256(json.dumps(split, sort_keys=True).encode()).hexdigest()
`,
      );
      await fs.writeFile(
        path.join(ml, "preprocess.py"),
        `import json
from pathlib import Path
from .common import config, rows
def preprocess(cfg):
    data=rows(cfg); split={'train': list(range(len(data)-2)), 'test': list(range(len(data)-2,len(data)))}
    Path(cfg['outputDir']).mkdir(parents=True, exist_ok=True)
    Path(cfg['outputDir'],'split.json').write_text(json.dumps(split)); return split
if __name__=='__main__': preprocess(config())
`,
      );
      await fs.writeFile(
        path.join(ml, "train.py"),
        `import json, joblib
from pathlib import Path
from sklearn.linear_model import LinearRegression
from .common import config, rows
def train(cfg):
    data=rows(cfg); split=json.loads(Path(cfg['outputDir'],'split.json').read_text())
    model=LinearRegression(); before=[0.0,0.0]
    model.fit([[data[i][0]] for i in split['train']], [data[i][1] for i in split['train']])
    checkpoint=Path(cfg['outputDir'],'model.joblib'); joblib.dump(model,checkpoint)
    changed=before != [float(model.coef_[0]),float(model.intercept_)]
    Path(cfg['outputDir'],'training.json').write_text(json.dumps({'parametersChanged':changed}))
    return checkpoint
if __name__=='__main__': train(config())
`,
      );
      await fs.writeFile(
        path.join(ml, "evaluate.py"),
        `import json, joblib
from pathlib import Path
from sklearn.metrics import mean_squared_error
from .common import config, rows, split_hash
def evaluate(cfg):
    data=rows(cfg); split=json.loads(Path(cfg['outputDir'],'split.json').read_text())
    checkpoint=Path(cfg['outputDir'],'model.joblib'); model=joblib.load(checkpoint)
    actual=[data[i][1] for i in split['test']]; predicted=model.predict([[data[i][0]] for i in split['test']]).tolist()
    predictions=Path(cfg['outputDir'],'predictions.jsonl')
    predictions.write_text(''.join(json.dumps({'actual':a,'predicted':p})+'\\n' for a,p in zip(actual,predicted)))
    metrics={'runId':cfg['runId'],'dataset':cfg['dataset'],'examples':len(actual),'metrics':{'mse':float(mean_squared_error(actual,predicted))},'checkpoint':str(checkpoint.resolve()),'predictions':str(predictions.resolve()),'datasetFingerprint':cfg['datasetFingerprint'],'splitFingerprint':split_hash(split)}
    Path(cfg['outputDir'],'metrics.json').write_text(json.dumps(metrics)); return metrics
if __name__=='__main__': evaluate(config())
`,
      );
      await fs.writeFile(
        path.join(ml, "verify.py"),
        `import hashlib, json, joblib
from pathlib import Path
from .common import config, rows
def digest(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def verify(cfg):
    output=Path(cfg['outputDir']); metrics=json.loads((output/'metrics.json').read_text())
    split=json.loads((output/'split.json').read_text()); data=rows(cfg); model=joblib.load(metrics['checkpoint'])
    expected=model.predict([[data[i][0]] for i in split['test']]).tolist()
    stored=[json.loads(line)['predicted'] for line in Path(metrics['predictions']).read_text().splitlines()]
    parity=max(abs(a-b) for a,b in zip(expected,stored)); training=json.loads((output/'training.json').read_text())
    proof={'runId':cfg['runId'],'checkpointSha256':digest(metrics['checkpoint']),'predictionsSha256':digest(metrics['predictions']),'datasetFingerprint':cfg['datasetFingerprint'],'splitFingerprint':metrics['splitFingerprint'],'examples':len(stored),'reloadParityMaxAbsError':parity,'parametersChanged':training['parametersChanged'],'heldOutOnly':True,'metricsRecomputed':True}
    (output/'verification.json').write_text(json.dumps(proof)); return proof
if __name__=='__main__': verify(config())
`,
      );
      await fs.writeFile(path.join(root, "dataset.csv"), "x,y\n0,0\n1,2\n2,4\n3,6\n4,8\n5,10\n");
      await ensureMLConfig(root);
      const configPath = path.join(root, "ml-run.json");
      const config = JSON.parse(await fs.readFile(configPath, "utf8"));
      config.dataset = "dataset.csv";
      config.epochs = 1;
      await fs.writeFile(configPath, JSON.stringify(config));
      const result = await runMLPipeline(
        root,
        () => {},
        async (_python, args, cwd, timeout) => {
          await execute("python", args, { cwd, timeout, windowsHide: true });
        },
      );
      expect(result.status, result.error).toBe("completed");
      expect((result.metrics as any).metrics.mse).toBeLessThan(1e-12);
      expect((result.metrics as any).verification.parametersChanged).toBe(true);
      expect((result.metrics as any).verification.reloadParityMaxAbsError).toBe(0);
    } finally {
      if (!path.basename(root).startsWith("loom-real-ml-")) throw new Error("bad fixture");
      await fs.rm(root, { recursive: true, force: true });
    }
  },
  60_000,
);
