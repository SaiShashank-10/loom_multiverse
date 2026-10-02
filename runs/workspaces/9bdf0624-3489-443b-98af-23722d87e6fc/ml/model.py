import tensorflow as tf


def build_model(training_texts, max_tokens=20000, sequence_length=192, embedding_dim=96):
    vectorizer = tf.keras.layers.TextVectorization(max_tokens=max_tokens, output_mode="int", output_sequence_length=sequence_length, name="text_vectorizer")
    vectorizer.adapt(tf.data.Dataset.from_tensor_slices(training_texts).batch(64))
    inputs = tf.keras.Input(shape=(), dtype=tf.string, name="candidate_job_text")
    tokens = vectorizer(inputs)
    positions = tf.range(start=0, limit=sequence_length, delta=1)
    token_embeddings = tf.keras.layers.Embedding(max_tokens, embedding_dim)(tokens)
    position_embeddings = tf.keras.layers.Embedding(sequence_length, embedding_dim)(positions)
    encoded = token_embeddings + position_embeddings
    attention = tf.keras.layers.MultiHeadAttention(num_heads=4, key_dim=embedding_dim // 4)(encoded, encoded)
    encoded = tf.keras.layers.LayerNormalization()(encoded + attention)
    feed_forward = tf.keras.layers.Dense(embedding_dim * 2, activation="gelu")(encoded)
    feed_forward = tf.keras.layers.Dense(embedding_dim)(feed_forward)
    encoded = tf.keras.layers.LayerNormalization()(encoded + feed_forward)
    pooled = tf.keras.layers.GlobalAveragePooling1D()(encoded)
    pooled = tf.keras.layers.Dropout(0.2)(pooled)
    outputs = tf.keras.layers.Dense(1, activation="sigmoid", name="compatibility")(pooled)
    return tf.keras.Model(inputs=inputs, outputs=outputs, name="career_match_transformer")


def load_model(checkpoint):
    return tf.keras.models.load_model(checkpoint)


def compile_model(model, learning_rate=3e-4):
    model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=learning_rate), loss="binary_crossentropy", metrics=[tf.keras.metrics.BinaryAccuracy(name="accuracy"), tf.keras.metrics.AUC(name="auc")])
    return model
