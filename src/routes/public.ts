import newsletterController from "../controllers/services/newsLetterController";
import express from "express";

const router = express.Router();

router.post(
  "/register-newsletter",
  newsletterController.handleRegisterNewsletter
);

const publicRoutes = router;

export default publicRoutes;
