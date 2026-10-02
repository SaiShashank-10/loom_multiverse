import argparse
from pathlib import Path
from sklearn.model_selection import train_test_split
from ml.common import atomic_json, load_config, read_jsonl, set_seed, stable_hash, write_jsonl


def _dataset_file(dataset):
    path = Path(dataset)
    return path / "pairs.jsonl" if path.is_dir() else path


def preprocess(config_path):
    config = load_config(config_path)
    set_seed(config["seed"])
    rows = read_jsonl(_dataset_file(config["dataset"]))
    if len(rows) < 20:
        raise ValueError("pairs.jsonl needs at least 20 labeled candidate/job pairs")
    required = {"candidate_text", "job_text", "label"}
    for index, row in enumerate(rows):
        if not required.issubset(row) or row["label"] not in (0, 1):
            raise ValueError(f"Invalid row {index}; require candidate_text, job_text and binary label")
        row["text"] = f"candidate: {row['candidate_text']}\njob: {row['job_text']}"
        row["rowId"] = row.get("rowId", stable_hash([index, row["text"], row["label"]]))
    labels = [row["label"] for row in rows]
    train_rows, test_rows = train_test_split(rows, test_size=0.2, random_state=config["seed"], stratify=labels)
    train_rows, validation_rows = train_test_split(train_rows, test_size=0.125, random_state=config["seed"], stratify=[row["label"] for row in train_rows])
    output = Path(config["outputDir"])
    write_jsonl(output / "train.jsonl", train_rows)
    write_jsonl(output / "validation.jsonl", validation_rows)
    write_jsonl(output / "test.jsonl", test_rows)
    identity = {"train": [row["rowId"] for row in train_rows], "validation": [row["rowId"] for row in validation_rows], "test": [row["rowId"] for row in test_rows]}
    atomic_json(output / "split.json", {"splitFingerprint": stable_hash(identity), "rows": identity})


def main():
    parser = argparse.ArgumentParser(description="Validate and split candidate/job matching data")
    parser.add_argument("--config", required=True)
    preprocess(parser.parse_args().config)


if __name__ == "__main__":
    main()
