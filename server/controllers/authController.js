const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const sendEmail = require('../utils/sendEmail');
const logger =require('../utils/logger');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/tokenUtils');
const { blacklistToken } = require('../config/redis');
const { generateVerificationEmailHTML, generatePasswordResetEmailHTML } = require('../utils/emailTemplates');
const { sendSuccess, sendTokenResponse } = require('../utils/responseHelper');

/**
 * Helper to issue tokens and send the final response, avoiding repetition.
 */
const issueTokensAndRespond = (res, user, statusCode, message) => {
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    const userData = {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
    };

    sendTokenResponse(res, statusCode, message, { accessToken, refreshToken }, userData);
};

exports.registerUser = async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body;
        const assignedRole = role === 'researcher' ? 'researcher' : 'user';

        let user = await User.findOne({ email });

        if (user && user.isEmailVerified) {
            return next(new AppError('An account with this email already exists.', 409));
        }

        if (user && !user.isEmailVerified) {
            const verificationToken = user.createEmailVerifyToken();
            await user.save({ validateBeforeSave: false });
            
            // FIX: Create mobile-friendly deep link
            const verifyURL = `waymate://verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;
            const webVerifyURL = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;
            
            await sendEmail({
                to: user.email,
                subject: 'Action Required: Verify Your Email',
                html: generateVerificationEmailHTML(user.name, verifyURL, webVerifyURL)
            });
            return sendSuccess(res, 200, 'An unverified account exists. A new verification email has been sent.');
        }
        
        user = new User({ name, email, password, role: assignedRole });
        
        const verificationToken = user.createEmailVerifyToken();
        await user.save();
        
        // Create both mobile and web deep links
        const mobileVerifyURL = `waymate://verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;
        const webVerifyURL = `https://waymate.vercel.app/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;
        
        await sendEmail({
            to: user.email,
            subject: 'Welcome! Please Verify Your Email',
            html: generateVerificationEmailHTML(user.name, mobileVerifyURL, webVerifyURL)
        });

        logger.info('User partially registered. Verification email sent.', { email, role: assignedRole });
        sendSuccess(res, 201, 'Registration successful. Please check your email to verify your account.');
    } catch (error) {
        next(error);
    }
};

exports.verifyEmail = async (req, res, next) => {
    try {
        const hashedToken = crypto.createHash('sha256').update(req.body.token).digest('hex');
        const user = await User.findOne({
            emailVerificationToken: hashedToken,
            emailVerificationTokenExpires: { $gt: Date.now() }
        });

        if (!user) {
            return next(new AppError('Invalid or expired verification token.', 400));
        }

        user.isEmailVerified = true;
        user.accountStatus = 'active';
        user.emailVerificationToken = undefined;
        user.emailVerificationTokenExpires = undefined;
        await user.save({ validateBeforeSave: false }); 
        
        issueTokensAndRespond(res, user, 200, 'Email verified successfully. You are now logged in.');
    } catch (error) {
        next(error);
    }
};

exports.loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return next(new AppError('Please provide email and password.', 400));
        }
        
        const user = await User.findOne({ email }).select('+password');

        if (!user || !(await user.matchPassword(password))) {
            return next(new AppError('Invalid email or password.', 401));
        }
        if (!user.isEmailVerified) {
            return next(new AppError('Please verify your email before logging in.', 403));
        }
        if (user.accountStatus !== 'active') {
            return next(new AppError(`Your account is currently ${user.accountStatus}. Access denied.`, 403));
        }

        issueTokensAndRespond(res, user, 200, 'Login successful');
    } catch (error) {
        next(error);
    }
};

exports.resendVerificationEmail = async (req, res, next) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            logger.warn(`Verification resend requested for non-existent email: ${email}`);
            return sendSuccess(res, 200, 'If an account with that email exists, a new verification link has been sent.');
        }

        if (user.isEmailVerified) {
            return next(new AppError('This account has already been verified.', 400));
        }

        const verificationToken = user.createEmailVerifyToken();
        await user.save({ validateBeforeSave: false });

        const mobileVerifyURL = `waymate://verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;
        const webVerifyURL = `https://waymate.vercel.app/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;
        
        await sendEmail({
            to: user.email,
            subject: 'Action Required: Verify Your Email',
            html: generateVerificationEmailHTML(user.name, mobileVerifyURL, webVerifyURL)
        });

        logger.info(`Resent verification email to ${email}`);
        sendSuccess(res, 200, 'A new verification email has been sent to your address.');
    } catch (error) {
        next(error);
    }
};

exports.refreshToken = async (req, res, next) => {
    try {
        // MAJOR FIX: Accept refresh token from EITHER cookie (for web) OR body (for mobile)
        const token = req.cookies?.refreshToken || req.body?.refreshToken;
        if (!token) {
            return next(new AppError('Authentication failed. No refresh token found.', 401));
        }

        const decoded = verifyToken(token, 'refresh');
        if (!decoded) {
            return next(new AppError('Authentication failed. Invalid or expired refresh token.', 401));
        }
        
        const user = await User.findById(decoded.id);
        if (!user || user.accountStatus !== 'active') {
            return next(new AppError('Authentication failed. User not found or account is inactive.', 401));
        }

        issueTokensAndRespond(res, user, 200, 'Access token refreshed');
    } catch (error) {
        next(error);
    }
};

exports.logoutUser = async (req, res, next) => {
    try {
        const accessToken = req.headers.authorization?.split(' ')[1];
        if (accessToken) {
            const decoded = jwt.decode(accessToken);
            if (decoded?.jti && decoded?.exp) {
                const expires = decoded.exp - Math.floor(Date.now() / 1000);
                if (expires > 0) await blacklistToken(`at_${decoded.jti}`, expires);
            }
        }

        // ENHANCEMENT: Invalidate refresh token if provided by client
        const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
        if (refreshToken) {
            const decoded = jwt.decode(refreshToken);
            if (decoded?.jti && decoded?.exp) {
                const expires = decoded.exp - Math.floor(Date.now() / 1000);
                if (expires > 0) await blacklistToken(`rt_${decoded.jti}`, expires);
            }
        }

        res.clearCookie('refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
        
        sendSuccess(res, 200, 'Logged out successfully');
    } catch (error) {
        next(error);
    }
};

exports.updatePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id).select('+password');
        
        if (!user) {
             return next(new AppError('User not found.', 404));
        }

        if (!(await user.matchPassword(currentPassword))) {
            return next(new AppError('Your current password is incorrect.', 401));
        }

        user.password = newPassword;
        await user.save();
        
        issueTokensAndRespond(res, user, 200, 'Password updated successfully. Please use your new password to log in.');
    } catch (error) {
        next(error);
    }
};

exports.forgotPassword = async (req, res, next) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (user) {
            const resetToken = user.createPasswordResetToken();
            await user.save({ validateBeforeSave: false });
            const resetURL = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
            await sendEmail({ to: user.email, subject: 'Your Password Reset Request', html: generatePasswordResetEmailHTML(user.name, resetURL) });
        }
        // Always send a success response to prevent email enumeration attacks
        sendSuccess(res, 200, 'If an account with that email exists, a password reset link has been sent.');
    } catch (error) {
        next(error);
    }
};

exports.resetPassword = async (req, res, next) => {
    try {
        const hashedToken = crypto.createHash('sha256').update(req.body.token).digest('hex');
        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetTokenExpires: { $gt: Date.now() }
        });

        if (!user) {
            return next(new AppError('Invalid or expired password reset token.', 400));
        }

        user.password = req.body.password;
        user.passwordResetToken = undefined;
        user.passwordResetTokenExpires = undefined;
        await user.save();

        issueTokensAndRespond(res, user, 200, 'Password reset successfully. You are now logged in.');
    } catch (error) {
        next(error);
    }
};
