import json
from pathlib import Path

from ml.common import read_jsonl
from ml.preprocess import preprocess


def test_preprocess_creates_disjoint_reproducible_splits(tmp_path):
    dataset = tmp_path / "pairs.jsonl"
    rows = [
        {
            "rowId": f"row-{index}",
            "candidate_text": f"candidate skills {index}",
            "job_text": f"job requirements {index}",
            "label": index % 2,
        }
        for index in range(40)
    ]
    dataset.write_text("".join(json.dumps(row) + "\n" for row in rows), encoding="utf-8")
    output = tmp_path / "artifacts"
    config = {
        "dataset": str(dataset),
        "datasetFingerprint": "0" * 64,
        "seed": 42,
        "epochs": 1,
        "batchSize": 4,
        "outputDir": str(output),
        "runId": "test-run",
    }
    config_path = tmp_path / "config.json"
    config_path.write_text(json.dumps(config), encoding="utf-8")

    preprocess(config_path)

    split_ids = []
    for name in ("train", "validation", "test"):
        split = read_jsonl(output / f"{name}.jsonl")
        assert split
        split_ids.extend(row["rowId"] for row in split)
    assert len(split_ids) == len(set(split_ids)) == len(rows)
    split_evidence = json.loads((output / "split.json").read_text(encoding="utf-8"))
    assert len(split_evidence["splitFingerprint"]) == 64


def test_preprocess_rejects_invalid_schema(tmp_path):
    dataset = tmp_path / "pairs.jsonl"
    dataset.write_text("".join(json.dumps({"candidate_text": "x"}) + "\n" for _ in range(20)))
    config = {
        "dataset": str(dataset),
        "datasetFingerprint": "0" * 64,
        "seed": 42,
        "epochs": 1,
        "batchSize": 4,
        "outputDir": str(tmp_path / "artifacts"),
        "runId": "test-run",
    }
    config_path = tmp_path / "config.json"
    config_path.write_text(json.dumps(config), encoding="utf-8")
    try:
        preprocess(config_path)
    except ValueError as error:
        assert "candidate_text, job_text and binary label" in str(error)
    else:
        raise AssertionError("Invalid dataset schema was accepted")
