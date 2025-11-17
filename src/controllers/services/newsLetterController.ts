import express from "express";
import handleSendEmail from "../../services/emailService";

const handleRegisterNewsletter = async (
  req: express.Request,
  res: express.Response
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      res.status(400).json({
        success: false,
        error: "Invalid email format",
      });
      return;
    }

    // TODO: Persist newsletter subscription in DB (future enhancement)

    // Fire-and-forget confirmation email
    try {
      const html = `
        <div style=\"font-family: Arial, sans-serif;\">\n          <h2>Subscription Confirmed</h2>\n          <p>Thanks for subscribing to the Zenow Academy newsletter!</p>\n          <p>You'll receive updates on new courses, articles, and events.</p>\n        </div>\n      `;
      handleSendEmail(email, "Newsletter Subscription Confirmed", html).catch(() => {});
    } catch {}

    res.json({
      success: true,
      message: "Newsletter registration successful",
    });
    return;
  } catch (error) {
    console.error("Error registering newsletter:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
    return;
}
};

const newsletterController = {
  handleRegisterNewsletter,
};

export default newsletterController;
