/**
 * Generates OTP for verification
 * @param {number} [otpLength=6] - Optional OTP length
 * @returns {number} An OTP of specified length
 */

const generateOTP = (otpLength = 6) => {
    const digits = "0123456789";
    let otp = "";
    for (let i = 1; i <= otpLength; i++) {
        const index = Math.floor(Math.random() * digits.length);
        otp = otp + digits[index];
    }
    return otp;
};

module.exports = {
    generateOTP,
};