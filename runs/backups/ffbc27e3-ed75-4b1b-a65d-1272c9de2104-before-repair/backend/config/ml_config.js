module.exports = {
  modelPath: './models/expense_prediction_model.tflite',
  apiKey: process.env.ML_API_KEY,
  maxPredictions: 5,
  confidenceThreshold: 0.8,
};