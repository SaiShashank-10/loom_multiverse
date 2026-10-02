import argparse
import json
from pathlib import Path
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score
from ml.common import atomic_json, load_config, read_jsonl, write_jsonl
from ml.predict import checkpoint_for, predict_texts


def evaluate(config_path):
    config = load_config(config_path)
    output = Path(config["outputDir"])
    rows = read_jsonl(output / "test.jsonl")
    labels = [int(row["label"]) for row in rows]
    probabilities = predict_texts(config, [row["text"] for row in rows])
    predicted = [int(value >= 0.5) for value in probabilities]
    metrics = {
        "accuracy": float(accuracy_score(labels, predicted)),
        "precision": float(precision_score(labels, predicted, zero_division=0)),
        "recall": float(recall_score(labels, predicted, zero_division=0)),
        "f1": float(f1_score(labels, predicted, zero_division=0)),
        "roc_auc": float(roc_auc_score(labels, probabilities)),
        "majority_baseline_accuracy": float(max(sum(labels), len(labels) - sum(labels)) / len(labels)),
    }
    predictions_path = output / "predictions.jsonl"
    write_jsonl(predictions_path, [{"rowId": row["rowId"], "actual": label, "probability": probability, "predicted": prediction} for row, label, probability, prediction in zip(rows, labels, probabilities, predicted)])
    split = json.loads((output / "split.json").read_text(encoding="utf-8"))
    evidence = {"runId": config["runId"], "dataset": str(Path(config["dataset"]).resolve()), "examples": len(rows), "metrics": metrics, "checkpoint": str(checkpoint_for(config).resolve()), "predictions": str(predictions_path.resolve()), "datasetFingerprint": config["datasetFingerprint"], "splitFingerprint": split["splitFingerprint"]}
    atomic_json(output / "metrics.json", evidence)
    return evidence


def main():
    parser = argparse.ArgumentParser(description="Evaluate held-out career matching pairs")
    parser.add_argument("--config", required=True)
    evaluate(parser.parse_args().config)


if __name__ == "__main__":
    main()
