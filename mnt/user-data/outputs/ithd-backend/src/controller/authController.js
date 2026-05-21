// backend/src/controller/authController_FINAL.js
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { sql, getPool } from '../config/db.js';
import { syncUserFromDaikinAD } from '../services/userService.js';

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key-change-this-in-env';

/**
 * FINAL Auth Controller with User Sync
 * Automatically syncs user to database after successful login
 */
export const login = async (req, res) => {
    const body = req.body || {};
    const query = req.query || {};

    const username = body.username || body.Username || query.username || query.Username;
    const password = body.password || body.Password || query.password || query.Password;

    if (!username || !password) {
        return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    try {
        const apiUrl = 'http://websrv01.dci.daikin.co.jp/BudgetCharts/BudgetRestService/api/authen';
        const response = await axios.get(apiUrl, {
            params: { username, password },
            timeout: 10000
        });

        if (response.data && response.status === 200) {
            const apiData = Array.isArray(response.data) ? response.data[0] : response.data;

            console.log('=== Daikin API Response ===');
            console.log(JSON.stringify(apiData, null, 2));
            console.log('===========================');

            if (!apiData) {
                return res.status(401).json({ success: false, message: 'Invalid username or password' });
            }

            // Extract user data from Daikin API response
            const keys = Object.keys(apiData);
            const codeKey = keys.find(k => k.toLowerCase() === 'empcode') || '';
            const nameKey = keys.find(k => ['shortname', 'empname'].includes(k.toLowerCase())) || '';
            const sectKey = keys.find(k => k.toLowerCase() === 'sect_short') || keys.find(k => k.toLowerCase() === 'sect') || '';
            const emailKey = keys.find(k => k.toLowerCase() === 'email') || '';
            const picKey = keys.find(k => k.toLowerCase() === 'emppic') || '';

            const empCode = codeKey ? apiData[codeKey] : '';
            const shortName = nameKey ? apiData[nameKey] : '';
            const sect = sectKey ? apiData[sectKey] : '';
            const email = emailKey ? apiData[emailKey] : '';
            const empPic = picKey ? apiData[picKey] : '';

            const ccKey = keys.find(k => k.toLowerCase() === 'cost_center') || '';
            const costCenter = ccKey ? String(apiData[ccKey]).trim() : '';

            if (!empCode && !shortName) {
                return res.status(401).json({ success: false, message: 'Invalid username or password' });
            }

            // ✅ Only CC 7510 allowed
            if (costCenter !== '7510') {
                return res.status(403).json({
                    success: false,
                    message: `Access denied. Only Cost Center 7510 (IT Staff) can use this system. Your CC: ${costCenter || 'N/A'}`
                });
            }

            // Check if user is admin/staff in database
            const pool = getPool();
            const adminCheck = await pool.request()
                .input('empCode', sql.NVarChar, empCode)
                .query('SELECT 1 FROM dbo.Stock_UserRole WHERE EmpCode = @empCode');

            const isAdmin = adminCheck.recordset.length > 0;
            const role = isAdmin ? 'Staff' : 'User';

            // ✅ SYNC USER TO DATABASE
            // This creates or updates the user in dbo.Users table
            const syncResult = await syncUserFromDaikinAD(
                empCode,
                shortName || username,
                email || `${username}@dci.daikin.co.jp`, // Fallback email
                costCenter,
                sect
            );

            if (syncResult.success) {
                console.log(`✅ User synced: ${empCode} (${syncResult.action})`);
            } else {
                console.warn(`⚠️ User sync failed: ${syncResult.error}`);
                // Don't fail login if sync fails
            }

            // ✅ Generate JWT token with cost_center
            const token = jwt.sign(
                {
                    username: username,
                    role: role,
                    name: shortName || username,
                    sect: sect,
                    empcode: empCode,
                    email: email || `${username}@dci.daikin.co.jp`,
                    cost_center: costCenter
                },
                SECRET_KEY,
                { expiresIn: '1h' }
            );

            // ✅ Return response with token
            res.json({
                success: true,
                token,
                user: {
                    username,
                    role,
                    name: shortName || username,
                    sect: sect,
                    empcode: empCode,
                    email: email || `${username}@dci.daikin.co.jp`,
                    cost_center: costCenter,
                    empPic: empPic
                }
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid username or password' });
        }
    } catch (error) {
        console.error('AD Auth Error:', error.message);
        if (error.response) {
            return res.status(401).json({ success: false, message: 'Invalid username or password' });
        }
        res.status(500).json({ success: false, message: 'Authentication service unavailable' });
    }
};

/**
 * Logout endpoint (optional - for clearing backend sessions)
 */
export const logout = (req, res) => {
    // Logout is typically handled on frontend by clearing localStorage
    // This endpoint can be used for backend cleanup if needed
    res.json({ success: true, message: 'Logged out successfully' });
};

/**
 * Verify token endpoint (for checking token validity)
 */
export const verifyToken = (req, res) => {
    // If we reach here, middleware already verified the token
    res.json({
        success: true,
        user: req.user,
        message: 'Token is valid'
    });
};
