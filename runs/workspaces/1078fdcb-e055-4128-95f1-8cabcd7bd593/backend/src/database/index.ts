import mongoose from 'mongoose';
import { config } from '../config';

const connectToDatabase = async () => {
  try {
    await mongoose.connect(config.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('Failed to connect to MongoDB', error);
    process.exit(1);
  }
};

const User = mongoose.model('User', new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
}));

const RoutePlan = mongoose.model('RoutePlan', new mongoose.Schema({
  user_id: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
  cities: [{ type: String, required: true }],
}));

const Accommodation = mongoose.model('Accommodation', new mongoose.Schema({
  route_plan_id: { type: mongoose.Types.ObjectId, ref: 'RoutePlan', required: true },
  name: { type: String, required: true },
}));

const PassDocument = mongoose.model('PassDocument', new mongoose.Schema({
  user_id: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
  document_type: { type: String, required: true },
}));

const Bill = mongoose.model('Bill', new mongoose.Schema({
  route_plan_id: { type: mongoose.Types.ObjectId, ref: 'RoutePlan', required: true },
  amount: { type: Number, required: true },
}));

export {
  connectToDatabase,
  User,
  RoutePlan,
  Accommodation,
  PassDocument,
  Bill,
};
```

This code sets up the connection to a MongoDB database using Mongoose and defines models for the `users`, `route_plans`, `accommodations`, `pass_documents`, and `bills` collections. The `connectToDatabase` function is responsible for establishing the connection, and the models are exported for use in other parts of the application.