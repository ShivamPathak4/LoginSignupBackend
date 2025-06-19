const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const validateRequest = require('../middleware/validate');
const { body } = require('express-validator');
require('dotenv').config();
// Generate OTP
const generateOTP = () => Math.floor(10000000 + Math.random() * 90000000).toString();

// Send OTP
router.post(
  '/send-otp',

  async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });

      if (user) {
        return res.status(400).json({ message: 'Email already exists' });
      }

      const otp = generateOTP();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await User.findOneAndUpdate(
        { email },
        { otp, otpExpires },
        { upsert: true }
      );

      await sendEmail(
        email,
        'Your OTP Code',
        `Your verification code is: ${otp}\nThis code expires in 10 minutes.`
      );

      res.status(200).json({ message: `OTP sent to email ${otp}` });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Signup
router.post(
  '/signup',
  validateRequest([
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Invalid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('otp').isLength({ min: 8, max: 8 }).withMessage('OTP must be 8 digits'),
  ]),
  async (req, res) => {
    try {
      const { name, email, password, otp } = req.body;
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(400).json({ message: 'Please request an OTP first' });
      }

      if (user.isVerified) {
        return res.status(400).json({ message: 'Email already verified' });
      }

      if (user.otp !== otp || user.otpExpires < new Date()) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      user.name = name;
      user.password = hashedPassword;
      user.isVerified = true;
      user.otp = undefined;
      user.otpExpires = undefined;
      await user.save();

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: '1d',
      });

      res.status(201).json({ token, message: 'Account created successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Login
router.post(
  '/login',
  validateRequest([
    body('email').isEmail().withMessage('Invalid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ]),
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });

      if (!user || !user.isVerified) {
        return res.status(400).json({ message: 'Invalid email or unverified account' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid password' });
      }

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: '1d',
      });

      res.status(200).json({ token, message: 'success' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;