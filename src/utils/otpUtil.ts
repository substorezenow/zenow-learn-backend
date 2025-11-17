import crypto from 'crypto';

// Function to generate a secure 6-digit OTP
function generateOTP(length = 6) {
  const digits = "0123456789";
  let otp = "";

  // Generate OTP by selecting random digits
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, digits.length);
    otp += digits[randomIndex];
  }

  return otp;
}
 
export default generateOTP;
