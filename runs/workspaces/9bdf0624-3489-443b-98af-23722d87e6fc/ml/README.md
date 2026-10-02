# Career Matching ML Pipeline

This pipeline trains a bounded TensorFlow transformer that scores compatibility between candidate profiles and job descriptions. It never creates synthetic production data or reports target metrics before measuring a held-out test split.

## Dataset

Set `dataset` in `../ml-run.json` to a local `pairs.jsonl` file, or to a directory containing that file. Each line must be JSON:

```json
{"candidate_text":"Python, SQL, statistics","job_text":"Junior data analyst using SQL and Python","label":1}
```

`label` must be `0` or `1`. Supply at least 20 examples with both labels; a useful model requires substantially more representative, consented examples. The pipeline splits rows into train, validation, and held-out test partitions before fitting the text vectorizer.

## Commands

From the generated project root:

```powershell
python -m venv ml/.venv
ml\.venv\Scripts\python.exe -m pip install -r ml\requirements.txt
ml\.venv\Scripts\python.exe -m pytest ml\tests
```

The orchestrator runs the production stages automatically after `dataset` is configured:

```text
python -m ml.preprocess --config <absolute-run-config.json>
python -m ml.train --config <absolute-run-config.json>
python -m ml.evaluate --config <absolute-run-config.json>
python -m ml.verify --config <absolute-run-config.json>
```

Use `mode: "resume"` with `resumeCheckpoint`, or `mode: "finetune"` with `pretrainedCheckpoint`. Every run receives its own directory under `artifacts/ml/runs`. `metrics.json`, `predictions.jsonl`, and `verification.json` contain measured evidence, dataset/split fingerprints, checkpoint hashes, prediction hashes, parameter-change evidence, and reload parity.
