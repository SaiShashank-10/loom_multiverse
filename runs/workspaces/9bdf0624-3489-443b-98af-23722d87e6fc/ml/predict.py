import argparse
import json
from pathlib import Path
import numpy as np
from ml.common import load_config
from ml.model import load_model


def checkpoint_for(config):
    training = Path(config["outputDir"]) / "training.json"
    if not training.exists():
        raise FileNotFoundError("No trained model exists. Run ml.train or ml.finetune first.")
    checkpoint = Path(json.loads(training.read_text(encoding="utf-8"))["checkpoint"])
    if not checkpoint.exists():
        raise FileNotFoundError(f"Trained checkpoint is unavailable: {checkpoint}")
    return checkpoint


def predict_texts(config, texts, checkpoint=None):
    model = load_model(checkpoint or checkpoint_for(config))
    values = model.predict(np.asarray(texts), batch_size=config["batchSize"], verbose=0)
    return np.asarray(values).reshape(-1).astype(float).tolist()


def predict(config_path):
    config = load_config(config_path)
    texts = config.get("texts") or ([config["text"]] if config.get("text") else None)
    if not texts:
        raise ValueError("Prediction config requires text or texts")
    return predict_texts(config, texts)


def main():
    parser = argparse.ArgumentParser(description="Run trained career matching inference")
    parser.add_argument("--config", required=True)
    print(json.dumps({"predictions": predict(parser.parse_args().config)}))


if __name__ == "__main__":
    main()
