const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();
const mlConfig = require('./config/ml_config');

exports.expensePrediction = functions.https.onRequest(async (req, res) => {
  try {
    const userId = req.body.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Fetch user's historical transactions
    const transactionsSnapshot = await db.collection('expenses').where('user_id', '==', userId).get();
    const transactions = [];
    transactionsSnapshot.forEach(doc => {
      transactions.push(doc.data());
    });

    if (transactions.length === 0) {
      return res.status(200).json({ predictions: [] });
    }

    // Prepare data for AI model
    const inputData = transactions.map(transaction => ({
      amount: transaction.amount,
      category: transaction.category,
      date: transaction.date.toDate().toISOString()
    }));

    // Call AI model to get predictions
    const predictionResponse = await fetch(mlConfig.mlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(inputData)
    });

    if (!predictionResponse.ok) {
      return res.status(predictionResponse.status).json({ error: 'Failed to get predictions from AI model' });
    }

    const predictions = await predictionResponse.json();

    // Store predictions in Firebase
    const batch = db.batch();
    transactionsSnapshot.forEach(doc => {
      batch.update(doc.ref, { predictions: predictions[doc.id] });
    });

    await batch.commit();

    return res.status(200).json({ predictions });
  } catch (error) {
    console.error('Error processing expense prediction:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});