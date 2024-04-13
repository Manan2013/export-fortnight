import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import Student from './models/Student.js';
import nodemailer from 'nodemailer';
import OTPModel from './models/OTPModel.js';
import dotenv from 'dotenv';
import Username from './models/Username.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Survey from './models/Survey.js';

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 5000;

var connectionString = "mongodb+srv://itsmanan13:Mpurohit%401307@student-data.jycsadw.mongodb.net/StudentDB?retryWrites=true&w=majority&appName=Student-Data";

// Connect to MongoDB Atlas
mongoose.connect(connectionString, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

// Middleware
app.use(express.json());

// Utility functions
// generate OTP
const generateOTP = () => {
  const otpLength = 6;
  const digits = '0123456789';
  let OTP = '';
  for (let i = 0; i < otpLength; i++) {
    OTP += digits[Math.floor(Math.random() * 10)];
  }
  return OTP;
};

// save OTP to db
const saveOTP = async (email, otp) => {
  try {
    await OTPModel.create({ email, otp });
    console.log('OTP saved successfully');
  } catch (error) {
    console.error('Failed to save OTP:', error);
  }
};

// Routes
app.post('/signup', async (req, res) => {
  console.log(req.body);
  const { scholarNumber, studentName, email, contactNumber } = req.body;

  try {
    // Retrieve all students from the 'Students' collection
    const student = await Student.findOne({ scholarNumber });
    console.log(student);
    // Check if any student was found
    if (student) {
      // Return the student found
      res.status(200).json({ message: 'Authentication successful', email });
    } else {
      // No students found
      res.status(404).json({ message: 'Authentication failed' });
    }
  } catch (error) {
    // Handle errors
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Send email endpoint
app.post('/send-email', async (req, res) => {
  const { email } = req.body;

  // 1. generate otp
  // 2. store it to db
  // 3. send it as part of mail (html body)

  const otp = generateOTP();
  saveOTP(email, otp);

  // Create a transporter object using SMTP transport
  let transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    port: Number(process.env.EMAIL_PORT),
    auth: {
      user: process.env.EMAIL_USER, // Your Gmail email address
      pass: process.env.EMAIL_PASS // app password
      // pass: 'Mpurohit@1307' // original password
    },
    secure: Boolean(process.env.EMAIL_SECURE)
    // debug: true //Enable debugging
  });

  // Setup email data
  let mailOptions = {
    from: process.env.EMAIL_USER, // Sender address
    to: email, // Recipient address
    subject: 'Email Verification', // Subject line
    html: `<html lang="en">
    <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
        background-color: #f4f4f4;
        text-align: center;
      }
      .container {
        max-width: 600px;
        margin: 50px auto;
        padding: 20px;
        background-color: #fff;
        border-radius: 5px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      h1 {
        color: #333;
        margin-bottom: 20px;
      }
      p {
        color: #666;
        margin-bottom: 20px;
      }
      .otp {
        font-size: 24px;
        font-weight: bold;
        color: #007bff;
      }
    </style>
    </head>
    <body>
    <div class="container">
      <h1>Email Verification</h1>
      <p>Your OTP for email verification is:</p>
      <p class="otp">${otp}</p>
    </div>
    </body>
    </html>`
  };

  // Send email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
      res.status(500).json({ message: 'Failed to send email' });
    } else {
      console.log('Email sent: ' + info.response);
      res.status(200).json({ message: 'Email sent successfully' });
    }
  });
});

// verify the OTP
app.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  try {
    // Retrieve correct otp for this email
    const otpModel = await OTPModel.findOne({ email });
    console.log(otpModel);
    // Check if entered otp is same as the one in db
    if (otpModel.otp === otp) {
      // Success
      res.status(200).json({ message: 'OTP verified successfully' });
    } else {
      // Failure
      res.status(404).json({ message: 'OTP verification failed' });
    }
  } catch (error) {
    // Handle errors
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
})

// Check username availability endpoint
app.get('/check-username', async (req, res) => {
  const { username } = req.query;

  try {
    const existingUser = await Username.findOne({ username });
    const isAvailable = !existingUser;
    res.json({ available: isAvailable });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Define the route to save user account
app.post('/save-user-account', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Hash the password using bcrypt
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create a new document using the Username model
    await Username.create({ username, password: hashedPassword });

    res.status(200).json({ message: 'User account saved successfully' });
  } catch (error) {
    console.error('Error saving user account:', error);
    res.status(500).json({ message: 'Failed to save user account' });
  }
});

// endpoint to login the user
app.post('/user-login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await Username.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: 'Invalid username' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Generate JWT token
    const token = jwt.sign({ username: user.username }, process.env.JWTPRIVATEKEY);

    res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// endpoint to submit user response to the questionnaire
app.post('/submit-questionnaire', async (req, res) => {
  const token = req.headers.authorization.split(' ')[1]; // Extract the token from the Authorization header
  try {
    // Verify the token
    const decodedToken = jwt.verify(token, process.env.JWTPRIVATEKEY);
    const username = decodedToken.username; // Extract the username from the decoded token

    // Use the decoded token to get the user ID or any other information if needed

    // Evaluate the mental health using the answers array
    const countGreaterThanOrEqualTo2 = req.body.answers.reduce((acc, answer) => acc + (parseInt(answer) >= 2 ? 1 : 0), 0);

    let diagnosis = '';
    if ((parseInt(req.body.answers[0]) >= 2 || parseInt(req.body.answers[1]) >= 2) && countGreaterThanOrEqualTo2 >= 5) {
      diagnosis = 'Major depressive syndrome';
    } else if ((parseInt(req.body.answers[0]) >= 2 || parseInt(req.body.answers[1]) >= 2) && countGreaterThanOrEqualTo2 >= 2 && countGreaterThanOrEqualTo2 <= 4) {
      diagnosis = 'Other depressive syndrome';
    } else {
      diagnosis = 'No depressive syndrome';
    }


    // Save the survey result to the 'Survey' collection using create method
    await Survey.create({
      username: username,
      diagnosis: diagnosis
    });

    res.status(200).json({ message: `Diagnosis: ${diagnosis}`, username });

  } catch (error) {
    console.error('Error submitting questionnaire:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
