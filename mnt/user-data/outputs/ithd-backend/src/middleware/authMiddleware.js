// backend/src/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key-change-this-in-env';

/**
 * Verify JWT token from request headers
 * Extracts user data and attaches to req.user
 */
export const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]; // "Bearer TOKEN"

    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded; // { username, role, name, sect, empcode, cost_center }
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};

/**
 * Check if user belongs to Cost Center 7510 (IT Staff)
 * Used for routes that should only be accessible by IT team
 */
export const checkCC7510 = (req, res, next) => {
    if (req.user.cost_center !== '7510') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Only Cost Center 7510 (IT Staff) can perform this action.'
        });
    }
    next();
};

/**
 * Middleware to filter requests by empCode
 * End users can only see/modify their own tickets
 * IT Staff (CC 7510) can see all
 */
export const filterByEmpCode = (req, res, next) => {
    // Attach user info to request for use in controllers
    req.empCode = req.user.empcode;
    req.costCenter = req.user.cost_center;
    req.isITStaff = req.user.cost_center === '7510';
    
    next();
};
