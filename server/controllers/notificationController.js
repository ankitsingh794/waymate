const Notification = require('../models/Notification');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/responseHelper'); // 1. Import the helper

/**
 * @desc    Get notifications for the current user with pagination.
 * @route   GET /api/v1/notifications?page=1&limit=10
 * @access  Private
 */
exports.getNotifications = async (req, res, next) => {
    try {
        // --- Pagination ---
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;

        // --- Database Queries ---
        const [notifications, totalCount] = await Promise.all([
            Notification.find({ user: req.user.id })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Notification.countDocuments({ user: req.user.id })
        ]);

        const responseData = {
            count: notifications.length,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalCount / limit),
                totalCount: totalCount
            },
            notifications: notifications, 
        };
        
        return sendSuccess(res, 200, 'Notifications fetched successfully.', responseData);

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Mark all unread notifications as read for the current user.
 * @route   POST /api/v1/notifications/mark-all-read
 * @access  Private
 */
exports.markAllAsRead = async (req, res, next) => {
    try {
        // Find all unread notifications for the user and update their 'read' status to true.
        // Using `updateMany` is highly efficient for bulk updates.
        const result = await Notification.updateMany(
            { user: req.user.id, read: false },
            { $set: { read: true } }
        );

        // The result object contains information about the operation,
        // including how many documents were matched and modified.
        if (result.matchedCount === 0) {
            return res.status(200).json({
                success: true,
                message: 'No new notifications to mark as read.',
            });
        }
        
        res.status(200).json({
            success: true,
            message: `${result.modifiedCount} notification(s) marked as read.`,
        });
    } catch (error) {
        next(error);
    }
};