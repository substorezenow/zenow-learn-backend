const SendOtp = async (mobileNumber: any, otp: any) => {
  const API_KEY = process.env.FAST2SMSAPIKEY || "";
  const OTP_URL = process.env.FAST2SMSURL || "";

  if (!API_KEY || !OTP_URL) {
    throw new Error("Fast2SMS API key or URL not configured");
  }

  const payload = {
    variables_values: `${otp}`,
    route: "otp", // q -> message, otp -> otp
    numbers: `${mobileNumber}`,
  };

  try {
    const response = await fetch(OTP_URL, {
      method: "POST",
      headers: {
        authorization: API_KEY,
      },
      body: new URLSearchParams(payload),
    });

    const data: any = await response.json();

    if (data.return === true) {
      return "success";
    } else {
      // console.error("Failed to send OTP");
      return "error";
    }
  } catch (error) {
    // console.error("Error:", error);
    return "error";
  }
};

export default SendOtp;
