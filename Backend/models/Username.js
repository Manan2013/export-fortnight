// models/Username.js
import mongoose from 'mongoose';

const usernameSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
});

const Username = mongoose.model('Username', usernameSchema);

export default Username;
