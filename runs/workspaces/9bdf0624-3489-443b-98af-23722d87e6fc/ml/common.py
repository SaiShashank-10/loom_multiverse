import hashlib
import json
import os
import random
from pathlib import Path


def load_config(config_path):
    config = json.loads(Path(config_path).read_text(encoding="utf-8"))
    required = {"dataset", "datasetFingerprint", "seed", "epochs", "batchSize", "outputDir", "runId"}
    missing = sorted(required.difference(config))
    if missing:
        raise ValueError(f"Missing configuration keys: {', '.join(missing)}")
    return config


def set_seed(seed):
    os.environ["PYTHONHASHSEED"] = str(seed)
    random.seed(seed)
    try:
        import numpy as np
        import tensorflow as tf
        np.random.seed(seed)
        tf.keras.utils.set_random_seed(seed)
    except ImportError:
        pass


def get_artifact_path(output_dir, artifact_name):
    target = Path(output_dir) / artifact_name
    target.parent.mkdir(parents=True, exist_ok=True)
    return target


def atomic_json(path, value):
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_suffix(target.suffix + ".tmp")
    temporary.write_text(json.dumps(value, indent=2, sort_keys=True), encoding="utf-8")
    temporary.replace(target)


def read_jsonl(path):
    with Path(path).open(encoding="utf-8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def write_jsonl(path, rows):
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text("".join(json.dumps(row, sort_keys=True) + "\n" for row in rows), encoding="utf-8")


def sha256_file(path):
    digest = hashlib.sha256()
    with Path(path).open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def stable_hash(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True).encode("utf-8")).hexdigest()
