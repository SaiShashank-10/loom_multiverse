import argparse
import json
from pathlib import Path
import numpy as np
import tensorflow as tf
from ml.common import atomic_json, load_config, read_jsonl, set_seed
from ml.model import build_model, compile_model, load_model


def _xy(path):
    rows = read_jsonl(path)
    return np.asarray([row["text"] for row in rows]), np.asarray([row["label"] for row in rows])


def train(config_path):
    config = load_config(config_path)
    set_seed(config["seed"])
    output = Path(config["outputDir"])
    train_x, train_y = _xy(output / "train.jsonl")
    validation_x, validation_y = _xy(output / "validation.jsonl")
    if config.get("mode") == "resume":
        if not config.get("resumeCheckpoint"):
            raise ValueError("resume mode requires resumeCheckpoint")
        model = compile_model(load_model(config["resumeCheckpoint"]), learning_rate=1e-4)
    else:
        model = compile_model(build_model(train_x))
    before = [weight.numpy().copy() for weight in model.trainable_weights]
    model.fit(train_x, train_y, validation_data=(validation_x, validation_y), epochs=config["epochs"], batch_size=config["batchSize"], callbacks=[tf.keras.callbacks.EarlyStopping(patience=2, restore_best_weights=True)], verbose=2)
    changed = any(not np.array_equal(previous, current.numpy()) for previous, current in zip(before, model.trainable_weights))
    checkpoint = output / "model.keras"
    model.save(checkpoint)
    split = json.loads((output / "split.json").read_text(encoding="utf-8"))
    atomic_json(output / "training.json", {"checkpoint": str(checkpoint.resolve()), "parametersChanged": changed, "splitFingerprint": split["splitFingerprint"]})


def main():
    parser = argparse.ArgumentParser(description="Train the career matching transformer")
    parser.add_argument("--config", required=True)
    train(parser.parse_args().config)


if __name__ == "__main__":
    main()
