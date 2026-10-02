from pathlib import Path
import json
import os
import random
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
from ml.common import load_config, set_seed, get_artifact_path, save_checkpoint, load_checkpoint
from ml.model import CareerNavigationModel, custom_loss
def finetune(config):
    config = load_config(config)
    seed = config['seed']
    output_dir = Path(config['outputDir'])
    dataset_path = Path(config['dataset'])
    dataset_fingerprint = config['datasetFingerprint']
    run_id = config['runId']
    pretrained_checkpoint = config['pretrainedCheckpoint']

    set_seed(seed)

    # Load data and preprocess
    with open(dataset_path, 'r') as f:
        data = json.load(f)
    train_data, val_data = train_test_split(data, test_size=0.2, random_state=config['seed'])

    # Initialize model
    input_ids = Input(shape=(None,), dtype='int32', name='input_ids')
    attention_mask = Input(shape=(None,), dtype='int32', name='attention_mask')

    model = CareerNavigationModel(config)
    model.load_weights(pretrained_checkpoint)

    # Freeze layers except the last few
    for layer in model.layers[:-5]:
        layer.trainable = False

    optimizer = tf.keras.optimizers.Adam(learning_rate=config['learning_rate'])
    model.compile(optimizer=optimizer, loss=custom_loss, metrics=['accuracy'])

    # Define callbacks
    checkpoint_path = get_artifact_path(output_dir, 'finetuned_model.h5')
    checkpoint_callback = ModelCheckpoint(checkpoint_path, save_best_only=True, monitor='val_accuracy', mode='max')
    early_stopping_callback = EarlyStopping(monitor='val_loss', patience=3)

    # Train model
    history = model.fit(
        train_data,
        epochs=config['epochs'],
        batch_size=config['batchSize'],
        validation_data=val_data,
        callbacks=[checkpoint_callback, early_stopping_callback]
    )

    # Save final model
    save_checkpoint(model, output_dir, 'finetuned_model.h5')
def main():
    parser = argparse.ArgumentParser(description='Fine-tune a career navigation model.')
    parser.add_argument('--config', type=str, required=True, help='Path to the configuration file.')
    args = parser.parse_args()
    finetune(args.config)
if __name__ == '__main__':
    main()
