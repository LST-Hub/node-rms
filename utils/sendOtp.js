const { createTransport } = require("nodemailer");

const sendOtp = async ({ email, otp }) => {
  try {
    const transporter = createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: process.env.EMAIL_SERVER_PORT,
      secure: process.env.EMAIL_SERVER_SECURE ,
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    });

    const status = await transporter.sendMail({
      from: `"Info" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: "OTP Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">OTP Verification</h2>
          <p>Your OTP verification code is:</p>
          <h1 style="background-color: #f0f0f0; padding: 20px; text-align: center; color: #007bff; letter-spacing: 5px;">${otp}</h1>
          <p>This code will expire in 3 minute.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
      `,
    });

    return status;
  } catch (e) {
    console.error("Error in sendOtp:", e);
    throw e; 
  }
};

module.exports = sendOtp;