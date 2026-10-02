from pathlib import Path
import json
import os
import random
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
from ml.common import load_config, set_seed, get_artifact_path, save_checkpoint, load_checkpoint
from ml.model import CareerNavigationModel, custom_loss
def train(config):
    set_seed(config['seed'])
    output_dir = Path(config['outputDir'])
    dataset_path = Path(config['dataset'])
    dataset_fingerprint = config['datasetFingerprint']
    run_id = config['runId']
    max_runtime_minutes = config.get('maxRuntimeMinutes', None)

    # Load data and preprocess
    with open(dataset_path, 'r') as f:
        data = json.load(f)
    train_data, val_data = train_test_split(data, test_size=0.2, random_state=config['seed'])

    # Initialize model
    input_ids = Input(shape=(None,), dtype='int32', name='input_ids')
    attention_mask = Input(shape=(None,), dtype='int32', name='attention_mask')
    model = CareerNavigationModel()
    outputs = model(input_ids, attention_mask)
    model.compile(optimizer='adam', loss=custom_loss)

    # Define callbacks
    checkpoint_path = get_artifact_path(output_dir, f'checkpoint_{run_id}.h5')
    checkpoint_callback = ModelCheckpoint(checkpoint_path, save_best_only=True, monitor='val_loss', mode='min', verbose=1)
    early_stopping_callback = EarlyStopping(monitor='val_loss', patience=3, mode='min', verbose=1)

    # Train model
    history = model.fit(
        train_data,
        epochs=config['epochs'],
        batch_size=config['batchSize'],
        validation_data=val_data,
        callbacks=[checkpoint_callback, early_stopping_callback],
        max_epochs=max_runtime_minutes * 60 if max_runtime_minutes else None
    )

    # Save model and history
    save_checkpoint(model, output_dir, f'model_{run_id}.h5')
    with open(get_artifact_path(output_dir, 'history.json'), 'w') as f:
        json.dump(history.history, f)
if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Train a career navigation model.')
    parser.add_argument('--config', type=str, required=True, help='Path to the configuration file.')
    args = parser.parse_args()
    train(load_config(args.config))
