from tensorflow.keras.models import Model
from tensorflow.keras.layers import Input, Dense, Embedding, LSTM, concatenate, Dropout
from transformers import TFAutoModelForSequenceClassification, AutoTokenizer

class CareerNavigationModel(Model):
    def __init__(self, config):
        super(CareerNavigationModel, self).__init__()
        self.config = config
        self.tokenizer = AutoTokenizer.from_pretrained(config['transformer_model_name'])
        self.transformer_encoder = TFAutoModelForSequenceClassification.from_pretrained(config['transformer_model_name'], num_labels=1)
        self.embedding_layer = Embedding(input_dim=config['embedding_dim'], output_dim=config['embedding_dim'])
        self.lstm_layer = LSTM(units=config['lstm_units'], return_sequences=True)
        self.dropout_layer = Dropout(rate=config['dropout_rate'])

    def call(self, inputs):
        text_input, resume_input = inputs
        transformer_output = self.transformer_encoder(text_input)[0]
        embedding_output = self.embedding_layer(resume_input)
        lstm_output = self.lstm_layer(embedding_output)
        dropout_output = self.dropout_layer(lstm_output)
        combined_output = concatenate([transformer_output, dropout_output], axis=-1)
        return combined_output

    def get_config(self):
        config = super(CareerNavigationModel, self).get_config()
        config.update({'config': self.config})
        return config

    @classmethod
    def from_config(cls, config):
        return cls(**config)

# Loss function
def custom_loss(y_true, y_pred):
    return tf.keras.losses.binary_crossentropy(y_true, y_pred)
