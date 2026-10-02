from pathlib import Path
import json
import os
import random
def load_config(config_path):
    with open(config_path, 'r') as f:
        config = json.load(f)
    return config
def set_seed(seed):
    random.seed(seed)
    os.environ['PYTHONHASHSEED'] = str(seed)
def get_artifact_path(output_dir, artifact_name):
    return Path(output_dir) / artifact_name
def save_checkpoint(checkpoint, output_dir, checkpoint_name):
    checkpoint_path = get_artifact_path(output_dir, checkpoint_name)
    torch.save(checkpoint, checkpoint_path)
def load_checkpoint(checkpoint_path):
    return torch.load(checkpoint_path)
