import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// User Schema with Device ID
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  deviceId: {
    type: String,
    required: [true, 'Device ID is required'],
    unique: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model('User', userSchema);

// ✅ REGISTER
app.post('/register', async (req, res) => {
  try {
    const { username, email, password, deviceId } = req.body;

    if (!username || !email || !password || !deviceId) {
      return res.status(400).json({
        success: false,
        message: 'All fields including deviceId are required'
      });
    }
    console.log('📥 Incoming Register Payload:', req.body);

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    const newUser = new User({ username, email, password, deviceId });
    await newUser.save();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        username: newUser.username,
        email: newUser.email
      }
    });
  } catch (error) {
    console.error('💥 Registration Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message
    });
  }
});

// ✅ LOGIN with Device Lock
app.post('/login', async (req, res) => {
  try {
    const { email, password, deviceId } = req.body;

    if (!email || !password || !deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and deviceId are required'
      });
    }

    const user = await User.findOne({ email, password });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (user.deviceId !== deviceId) {
      return res.status(403).json({
        success: false,
        message: 'Login denied: Unrecognized device'
      });
    }

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
});

app.get('/ping', (req, res) => {
  console.log('🔔 Ping received!');
  res.send('pong');
});


// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({
    success: false,
    message: 'Unexpected server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal error'
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
