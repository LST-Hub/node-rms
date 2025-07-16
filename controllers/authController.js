const db = require("../models/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendOtp = require("../utils/sendOtp");
const speakeasy = require("speakeasy");

exports.signup = async (req, res) => {
  const { full_name, email, company_name, mobile_number, password, agreed_to_terms } = req.body;
  console.log("Received signup request:", req.body);
  
  try {
    const [existingUser] = await db.execute(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: "Email Already Exists" 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generate secret using speakeasy
    const secret = speakeasy.generateSecret({ length: 20 });
    
    // Generate OTP using speakeasy
    const otp = speakeasy.totp({
      secret: secret.base32,
      encoding: "base32",
      step: 60,
      window: 0,
    });

    console.log("Generated OTP:", otp);
    const timestamp = Date.now();
    const otp_expiry = new Date(timestamp + 3 * 60 * 1000); //  3 minute expiry

    const [result] = await db.execute(
      "INSERT INTO users (full_name, email, company_name, mobile_number, agreed_to_terms, password, otp_expiry) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [full_name, email, company_name, mobile_number, agreed_to_terms, hashedPassword, otp_expiry]
    );

    console.log("Database insert result:", result);

    if (result.affectedRows > 0) {
      await sendOtp({ email, otp });
       const apiResponse = {
        secret: secret.base32,
        email: email,
        timestamp: timestamp
      };
      res.status(200).json({ 
        success: true,
        message: "User registered successfully. OTP sent to your email",
        data: [apiResponse]
      });
    } else {
      res.status(400).json({ 
        success: false,
        message: "User registration failed" 
      });
    }
  } catch (error) {
    console.error("Error during user registration:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error" 
    });
  }
};

exports.verifyOtp = async (req, res) => {
  const { secret, otp, timestamp, email } = req.body;
  
  try {
    if (!secret || !otp || !timestamp || !email) {
      return res.status(400).json({
        success: false,
        message: "Please provide secret, otp, timestamp, and email"
      });
    }

    const currentTime = Date.now();
    if (currentTime - timestamp > 3 * 60 * 1000) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired"
      });
    }

    const isValid = speakeasy.totp.verify({
      secret: secret,
      encoding: "base32",
      token: otp,
      step: 60,
      window: 1,
    });

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    const [result] = await db.execute(
      "UPDATE users SET is_verified = 1 WHERE email = ?",
      [email]
    );

    if (result.affectedRows > 0) {
      res.status(200).json({
        success: true,
        message: "OTP Verified successfully"
      });
    } else {
      res.status(400).json({
        success: false,
        message: "User not found"
      });
    }
  } catch (error) {
    console.error("Error during OTP verification:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Validate required parameters
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password"
      });
    }

    // Check if user exists
    const [users] = await db.execute(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const user = users[0];

    // Check if email is verified
    if (!user.is_verified) {
      return res.status(400).json({
        success: false,
        message: "Please verify your email first"
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        full_name: user.full_name 
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    // Response data in array format
    const apiResponse = {
      token: token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        company_name: user.company_name,
        mobile_number: user.mobile_number,
        agreed_to_terms: user.agreed_to_terms
      }
    };

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: [apiResponse]
    });

  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

exports.resendOtp = async (req, res) => {
  const { email } = req.body;
  
  try {
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Please provide email"
      });
    }

    const [users] = await db.execute(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const user = users[0];

    if (user.is_verified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified"
      });
    }

    const secret = speakeasy.generateSecret({ length: 20 });
    
    const otp = speakeasy.totp({
      secret: secret.base32,
      encoding: "base32",
      step: 60,
      window: 0,
    });

    console.log("Resent OTP:", otp);
    const timestamp = Date.now();

    await sendOtp({ email, otp });
    const apiResponse = {
      secret: secret.base32,
      email: email,
      timestamp: timestamp
    };

    res.status(200).json({
      success: true,
      message: "OTP resent successfully to your email",
      data: [apiResponse]
    });

  } catch (error) {
    console.error("Error during OTP resend:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

