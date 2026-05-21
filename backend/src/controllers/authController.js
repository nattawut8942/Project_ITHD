// backend/src/controllers/authController.js
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { sql, getPool } from '../config/db.js';
import { syncUserFromDaikinAD } from '../services/userService.js';

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key-change-this-in-env';
const DAIKIN_API_URL = 'http://websrv01.dci.daikin.co.jp/BudgetCharts/BudgetRestService/api/authen';

export const login = async (req, res) => {
    const { username, password } = req.body || {};

    if (!username || !password) {
        return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    try {
        console.log(`🔌 Calling Daikin AD API for: ${username}`);

        const response = await axios.get(DAIKIN_API_URL, {
            params: { username, password },
            timeout: 10000
        });

        const apiData = Array.isArray(response.data) ? response.data[0] : response.data;

        console.log('=== Daikin API Response ===');
        console.log(JSON.stringify(apiData, null, 2));
        console.log('===========================');

        if (!apiData || apiData === '' || typeof apiData !== 'object') {
            return res.status(401).json({ success: false, message: 'Invalid username or password' });
        }

        const empCode    = String(apiData.EmpCode    || '').trim();
        const shortName  = apiData.ShortName  || '';
        const fullName   = apiData.FullName   || '';
        const email      = apiData.Email      || '';
        const empPic     = apiData.EmpPic     || '';
        const sect       = apiData.SECT_Short || '';
        const costCenter = String(apiData.Cost_Center || '').trim();

        if (!empCode && !shortName) {
            return res.status(401).json({ success: false, message: 'Invalid username or password' });
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
        try {
            const syncResult = await syncUserFromDaikinAD(
                empCode,
                shortName || fullName || username,
                email || `${username}@dci.daikin.co.jp`,
                costCenter,
                sect
            );
        } catch (syncErr) {
            console.warn(`⚠️ User sync warning: ${syncErr.message}`);
        }

        // Generate JWT
        const token = jwt.sign(
            { 
                username, 
                role, 
                name: shortName || fullName || username,
                sect, 
                empcode: empCode, 
                email: email || `${username}@dci.daikin.co.jp`, 
                cost_center: costCenter 
            },
            SECRET_KEY,
            { expiresIn: '8h' }
        );

        console.log(`✅ Login success: ${empCode} | Role: ${role}`);

        return res.json({
            success: true,
            token,
            user: {
                username, 
                role,
                name:        shortName || fullName || username,
                sect,
                empcode:     empCode,
                email:       email || `${username}@dci.daikin.co.jp`,
                cost_center: costCenter,
                empPic
            }
        });

    } catch (error) {
        console.error('❌ Auth Error:', error.message);
        if (error.response?.status === 401) return res.status(401).json({ success: false, message: 'Invalid username or password' });
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') return res.status(503).json({ success: false, message: 'AD Server unavailable.' });
        return res.status(500).json({ success: false, message: 'Authentication service error' });
    }
};

export const logout      = (req, res) => res.json({ success: true });
export const verifyToken = (req, res) => res.json({ success: true, user: req.user });
