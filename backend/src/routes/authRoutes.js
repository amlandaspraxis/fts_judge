import express from 'express';
import { login, logout, me, forgotPassword, resetPassword, judgeCodeLogin, audienceOtpLogin, audienceLogin } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { loginLimiter } from '../middleware/rateLimitMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import { validateLogin, validateAudienceLogin } from '../validators/authValidator.js';

const router = express.Router();

router.post('/login', loginLimiter, validate(validateLogin), login);
router.post('/judge-code-login', loginLimiter, judgeCodeLogin);
router.post('/audience-login', loginLimiter, validate(validateAudienceLogin), audienceLogin);
router.post('/audience-otp-login', loginLimiter, audienceOtpLogin);

router.post('/logout', logout);
router.get('/me', authMiddleware, me);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
