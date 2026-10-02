import argparse
import json
from pathlib import Path
from sklearn.metrics import accuracy_score, f1_score
from ml.common import atomic_json, load_config, read_jsonl, sha256_file
from ml.predict import predict_texts


def verify(config_path):
    config = load_config(config_path)
    output = Path(config["outputDir"])
    metrics = json.loads((output / "metrics.json").read_text(encoding="utf-8"))
    predictions_path = Path(metrics["predictions"])
    stored = read_jsonl(predictions_path)
    test_rows = read_jsonl(output / "test.jsonl")
    labels = [int(row["label"]) for row in test_rows]
    reloaded = predict_texts(config, [row["text"] for row in test_rows], metrics["checkpoint"])
    stored_probabilities = [float(row["probability"]) for row in stored]
    parity = max(abs(expected - actual) for expected, actual in zip(reloaded, stored_probabilities))
    recomputed_predictions = [int(value >= 0.5) for value in reloaded]
    recomputed = {"accuracy": float(accuracy_score(labels, recomputed_predictions)), "f1": float(f1_score(labels, recomputed_predictions, zero_division=0))}
    for name, value in recomputed.items():
        if abs(value - float(metrics["metrics"][name])) > 1e-9:
            raise ValueError(f"Recomputed {name} does not match metrics.json")
    training = json.loads((output / "training.json").read_text(encoding="utf-8"))
    proof = {"runId": config["runId"], "checkpointSha256": sha256_file(metrics["checkpoint"]), "predictionsSha256": sha256_file(predictions_path), "datasetFingerprint": config["datasetFingerprint"], "splitFingerprint": metrics["splitFingerprint"], "examples": len(stored), "reloadParityMaxAbsError": parity, "parametersChanged": bool(training["parametersChanged"]), "heldOutOnly": True, "metricsRecomputed": True}
    atomic_json(output / "verification.json", proof)
    return proof


def main():
    parser = argparse.ArgumentParser(description="Independently verify model and held-out evidence")
    parser.add_argument("--config", required=True)
    verify(parser.parse_args().config)


if __name__ == "__main__":
    main()
