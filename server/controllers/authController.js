const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ConsentLog = require('../models/ConsentLog');
const SocioEconomicSurvey = require('../models/SocioEconomicSurvey');
const AppError = require('../utils/AppError');
const sendEmail = require('../utils/sendEmail');
const logger = require('../utils/logger');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/tokenUtils');
const { blacklistToken, isTokenBlacklisted } = require('../config/redis');
const { generateVerificationEmailHTML, generatePasswordResetEmailHTML } = require('../utils/emailTemplates');
const { sendSuccess, sendTokenResponse } = require('../utils/responseHelper');

/**
 * Helper to parse extended registration payload (location, demographics, preferences, consents, survey).
 */
const parseRegistrationPayload = (body) => {
    const {
        name,
        email,
        password,
        role,
        city,
        country,
        location,
        demographics,
        preferences,
        consents,
        survey,
    } = body;

    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanName = name ? name.trim() : '';
    const assignedRole = role === 'researcher' ? 'researcher' : 'user';

    // Location
    const resolvedCity = (location?.city || city || '').trim();
    const resolvedCountry = (location?.country || country || 'India').trim();
    const parsedLocation = {};
    if (resolvedCity) parsedLocation.city = resolvedCity;
    if (resolvedCountry) parsedLocation.country = resolvedCountry;

    // Demographics
    const rawAge = demographics?.ageGroup || body.ageGroup || '';
    const validAges = ['<18', '18-35', '36-60', '>60', 'prefer_not_to_say'];
    const ageGroup = validAges.includes(rawAge) ? rawAge : (rawAge ? 'prefer_not_to_say' : '');

    const rawGender = demographics?.gender || body.gender || '';
    const validGenders = ['male', 'female', 'other', 'prefer_not_to_say'];
    const gender = validGenders.includes(rawGender) ? rawGender : (rawGender ? 'prefer_not_to_say' : '');

    const occupation = (demographics?.occupation || body.occupation || '').trim();

    const parsedDemographics = {
        ageGroup,
        gender,
        occupation
    };

    // Preferences
    const rawMode = preferences?.primaryMode || body.primaryMode || 'public_transport';
    const validModes = ['public_transport', 'private_car', 'private_bike', 'walk_cycle', 'other'];
    const primaryMode = validModes.includes(rawMode) ? rawMode : 'public_transport';

    const parsedPreferences = {
        language: preferences?.language || body.language || 'en',
        currency: preferences?.currency || body.currency || 'INR',
        primaryMode
    };

    // Consents
    const isDataCollection = consents?.data_collection !== undefined
        ? (consents.data_collection === true || consents.data_collection === 'granted')
        : (body.data_collection !== undefined ? (body.data_collection === true || body.data_collection === 'granted') : true);

    const isDemographicConsent = consents?.demographic_data !== undefined
        ? (consents.demographic_data === true || consents.demographic_data === 'granted')
        : (body.demographic_data === true || body.demographic_data === 'granted');

    const isPassiveTracking = consents?.passive_tracking !== undefined
        ? (consents.passive_tracking === true || consents.passive_tracking === 'granted')
        : (body.passive_tracking === true || body.passive_tracking === 'granted');

    const parsedConsents = {
        data_collection: {
            status: isDataCollection ? 'granted' : 'granted',
            updatedAt: new Date()
        },
        demographic_data: {
            status: isDemographicConsent ? 'granted' : 'revoked',
            updatedAt: new Date()
        },
        passive_tracking: {
            status: isPassiveTracking ? 'granted' : 'revoked',
            updatedAt: new Date()
        }
    };

    // Optional Survey
    const parsedSurvey = survey || {};
    if (body.householdIncome) parsedSurvey.householdIncome = body.householdIncome;
    if (body.vehicleCount !== undefined) parsedSurvey.vehicleCount = body.vehicleCount;
    if (body.primaryTransportModeToWork) parsedSurvey.primaryTransportModeToWork = body.primaryTransportModeToWork;

    return {
        cleanName,
        cleanEmail,
        password,
        assignedRole,
        parsedLocation,
        parsedDemographics,
        parsedPreferences,
        parsedConsents,
        parsedSurvey
    };
};

/**
 * Record initial consent logs and optional socio-economic survey.
 */
const recordConsentLogsAndSurvey = async (userId, consents, surveyData) => {
    try {
        const types = ['data_collection', 'demographic_data', 'passive_tracking'];
        const logs = types.map(type => ({
            userId,
            consentType: type,
            status: consents[type]?.status || 'revoked',
            grantedAt: consents[type]?.updatedAt || new Date(),
            source: 'web_initial_signup'
        }));
        await ConsentLog.insertMany(logs, { ordered: false }).catch(err => {
            logger.warn('Initial consent logs batch insert partial note:', err.message);
        });

        if (surveyData && (surveyData.householdIncome || surveyData.vehicleCount !== undefined || surveyData.primaryTransportModeToWork)) {
            const validIncomes = ['<25k', '25k-50k', '50k-100k', '100k-200k', '>200k', 'prefer_not_to_say'];
            const validWorkModes = ['private_car', 'private_bike', 'public_transport', 'walk_cycle', 'work_from_home', 'other'];

            await SocioEconomicSurvey.findOneAndUpdate(
                { userId },
                {
                    userId,
                    householdIncome: validIncomes.includes(surveyData.householdIncome) ? surveyData.householdIncome : undefined,
                    vehicleCount: surveyData.vehicleCount !== undefined && surveyData.vehicleCount !== '' ? Number(surveyData.vehicleCount) : undefined,
                    primaryTransportModeToWork: validWorkModes.includes(surveyData.primaryTransportModeToWork) ? surveyData.primaryTransportModeToWork : undefined
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            ).catch(err => {
                logger.warn('Initial socio-economic survey creation note:', err.message);
            });
        }
    } catch (err) {
        logger.warn('Error recording initial signup metadata:', err.message);
    }
};

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
        demographics: user.demographics,
        location: user.location,
        preferences: user.preferences,
        consents: user.consents,
    };

    sendTokenResponse(res, statusCode, message, { accessToken, refreshToken }, userData);
};

exports.registerUser = async (req, res, next) => {
    try {
        const {
            cleanName,
            cleanEmail,
            password,
            assignedRole,
            parsedLocation,
            parsedDemographics,
            parsedPreferences,
            parsedConsents,
            parsedSurvey
        } = parseRegistrationPayload(req.body);

        let user = await User.findOne({ email: cleanEmail });

        if (user && user.isEmailVerified) {
            return next(new AppError('An account with this email already exists.', 409));
        }

        if (user && !user.isEmailVerified) {
            user.name = cleanName;
            if (password) user.password = password;
            user.role = assignedRole;
            if (Object.keys(parsedLocation).length > 0) user.location = { ...user.location, ...parsedLocation };
            user.demographics = parsedDemographics;
            user.preferences = { ...user.preferences, ...parsedPreferences };
            user.consents = parsedConsents;

            const verificationToken = user.createEmailVerifyToken();
            await user.save();

            await recordConsentLogsAndSurvey(user._id, parsedConsents, parsedSurvey);

            // Create mobile-friendly and web deep links
            const verifyURL = `waymate://verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;
            const webVerifyURL = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;
            
            await sendEmail({
                to: user.email,
                subject: 'Action Required: Verify Your Email',
                html: generateVerificationEmailHTML(user.name, verifyURL, webVerifyURL)
            });
            return sendSuccess(res, 200, 'An unverified account exists. Profile updated and a new verification email has been sent.');
        }
        
        user = new User({
            name: cleanName,
            email: cleanEmail,
            password,
            role: assignedRole,
            location: parsedLocation,
            demographics: parsedDemographics,
            preferences: parsedPreferences,
            consents: parsedConsents
        });
        
        const verificationToken = user.createEmailVerifyToken();
        await user.save();

        await recordConsentLogsAndSurvey(user._id, parsedConsents, parsedSurvey);
        
        // Create both mobile and web deep links
        const mobileVerifyURL = `waymate://verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;
        const webVerifyURL = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;
        
        await sendEmail({
            to: user.email,
            subject: 'Welcome! Please Verify Your Email',
            html: generateVerificationEmailHTML(user.name, mobileVerifyURL, webVerifyURL)
        });

        logger.info('User registered with demographics & consents. Verification email sent.', { email: cleanEmail, role: assignedRole });
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
        
        const cleanEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: cleanEmail }).select('+password');

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
        const cleanEmail = email ? email.trim().toLowerCase() : '';
        const user = await User.findOne({ email: cleanEmail });

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
        const webVerifyURL = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;
        
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

        if (decoded.jti && (await isTokenBlacklisted(decoded.jti))) {
            return next(new AppError('Authentication failed. Refresh token has been invalidated.', 401));
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
                if (expires > 0) await blacklistToken(decoded.jti, expires);
            }
        }

        // ENHANCEMENT: Invalidate refresh token if provided by client
        const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
        if (refreshToken) {
            const decoded = jwt.decode(refreshToken);
            if (decoded?.jti && decoded?.exp) {
                const expires = decoded.exp - Math.floor(Date.now() / 1000);
                if (expires > 0) await blacklistToken(decoded.jti, expires);
            }
        }

        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
            path: '/',
        };

        res.clearCookie('refreshToken', cookieOptions);
        
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
        const cleanEmail = req.body.email ? req.body.email.trim().toLowerCase() : '';
        const user = await User.findOne({ email: cleanEmail });
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
