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
      const html = `<html><body style=\"margin:0; padding:0; background:#f5f7fa; font-family:Arial, Helvetica, sans-serif;\"><div style=\"max-width:600px; margin:30px auto; background:#ffffff; border-radius:12px; box-shadow:0 4px 18px rgba(0,0,0,0.06); overflow:hidden;\"><div style=\"background:#1e3a8a; padding:22px; text-align:center;\"><img src=\"https://academy.zenow.in/zenow-academy-logo-medium.svg\" alt=\"Zenow Academy\" style=\"width:180px; filter:brightness(0) invert(1);\" /></div><div style=\"padding:30px; color:#333;\"><h2 style=\"color:#1e3a8a; margin-bottom:14px; text-align:center; font-size:24px;\">Subscription Confirmed</h2><p style=\"font-size:15px; line-height:24px;\">Thanks for subscribing to the Zenow Academy newsletter!</p><p style=\"font-size:15px; line-height:24px;\">You'll receive updates on new courses, articles, and upcoming events.</p><div style=\"text-align:center; margin-top:25px;\"><a href=\"https://academy.zenow.in\" style=\"display:inline-block; padding:12px 24px; background:#1e3a8a; color:#ffffff; text-decoration:none; border-radius:8px; font-size:16px;\">Visit Zenow Academy</a></div></div><div style=\"background:#f1f1f1; padding:15px; text-align:center; color:#888; font-size:13px;\">© 2025 Zenow Academy. All rights reserved.</div></div></body></html>`;
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
