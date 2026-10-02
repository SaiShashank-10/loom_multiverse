import argparse
import json
from pathlib import Path
import numpy as np
import tensorflow as tf
from ml.common import atomic_json, load_config, read_jsonl, set_seed
from ml.model import compile_model, load_model


def _xy(path):
    rows = read_jsonl(path)
    return np.asarray([row["text"] for row in rows]), np.asarray([row["label"] for row in rows])


def finetune(config_path):
    config = load_config(config_path)
    checkpoint_source = config.get("pretrainedCheckpoint")
    if not checkpoint_source:
        raise ValueError("finetune mode requires pretrainedCheckpoint")
    set_seed(config["seed"])
    output = Path(config["outputDir"])
    train_x, train_y = _xy(output / "train.jsonl")
    validation_x, validation_y = _xy(output / "validation.jsonl")
    model = load_model(checkpoint_source)
    for layer in model.layers[:-4]:
        layer.trainable = False
    model = compile_model(model, learning_rate=5e-5)
    before = [weight.numpy().copy() for weight in model.trainable_weights]
    model.fit(train_x, train_y, validation_data=(validation_x, validation_y), epochs=config["epochs"], batch_size=config["batchSize"], callbacks=[tf.keras.callbacks.EarlyStopping(patience=2, restore_best_weights=True)], verbose=2)
    changed = any(not np.array_equal(previous, current.numpy()) for previous, current in zip(before, model.trainable_weights))
    checkpoint = output / "finetuned-model.keras"
    model.save(checkpoint)
    split = json.loads((output / "split.json").read_text(encoding="utf-8"))
    atomic_json(output / "training.json", {"checkpoint": str(checkpoint.resolve()), "parametersChanged": changed, "splitFingerprint": split["splitFingerprint"]})


def main():
    parser = argparse.ArgumentParser(description="Fine-tune a compatible career matching transformer")
    parser.add_argument("--config", required=True)
    finetune(parser.parse_args().config)


if __name__ == "__main__":
    main()
