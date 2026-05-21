// backend/src/services/userService.js (FIXED - MERGE)
import { sql, getPool } from '../config/db.js';

const userCache = new Map();
const CACHE_DURATION = 3600000;

// ✅ FIXED: MERGE แทน INSERT (ไม่มี duplicate error)
export const syncUserFromDaikinAD = async (empCode, userName, email, costCenter, sect) => {
    try {
        const pool = getPool();
        await pool.request()
            .input('empCode',     sql.NVarChar(50),  empCode)
            .input('email',       sql.NVarChar(255), email)
            .input('name',        sql.NVarChar(255), userName)
            .input('cost_center', sql.NVarChar(10),  costCenter)
            .input('sect',        sql.NVarChar(100), sect)
            .query(`
                MERGE dbo.ithd_users AS target
                USING (SELECT @empCode AS empCode) AS source
                ON target.empCode = source.empCode
                WHEN MATCHED THEN
                    UPDATE SET
                        email       = @email,
                        name        = @name,
                        cost_center = @cost_center,
                        sect        = @sect
                WHEN NOT MATCHED THEN
                    INSERT (empCode, email, name, cost_center, sect)
                    VALUES (@empCode, @email, @name, @cost_center, @sect);
            `);
        userCache.delete(empCode);
        return { success: true };
    } catch (error) {
        console.error('❌ Sync user error:', error.message);
        throw error;
    }
};

export const getEmailByEmpCode = async (empCode) => {
    if (!empCode) return null;
    if (userCache.has(empCode)) {
        const cached = userCache.get(empCode);
        if (Date.now() - cached.timestamp < CACHE_DURATION) return cached.email;
        userCache.delete(empCode);
    }
    try {
        const pool = getPool();
        const result = await pool.request()
            .input('empCode', sql.NVarChar(50), empCode)
            .query('SELECT email FROM dbo.ithd_users WHERE empCode = @empCode');
        if (result.recordset.length > 0) {
            const email = result.recordset[0].email;
            userCache.set(empCode, { email, timestamp: Date.now() });
            return email;
        }
    } catch (error) {
        console.warn(`Failed to get email for ${empCode}:`, error.message);
    }
    return `${empCode}@dci.daikin.co.jp`;
};

export const getUserByEmpCode = async (empCode) => {
    if (!empCode) return null;
    try {
        const pool = getPool();
        const result = await pool.request()
            .input('empCode', sql.NVarChar(50), empCode)
            .query('SELECT TOP 1 empCode, email, name, cost_center, sect FROM dbo.ithd_users WHERE empCode = @empCode');
        return result.recordset[0] || null;
    } catch (error) {
        console.warn(`Failed to get user ${empCode}:`, error.message);
        return null;
    }
};

export const getNameByEmpCode = async (empCode) => {
    if (!empCode) return 'User';
    try {
        const pool = getPool();
        const result = await pool.request()
            .input('empCode', sql.NVarChar(50), empCode)
            .query('SELECT name FROM dbo.ithd_users WHERE empCode = @empCode');
        if (result.recordset.length > 0) return result.recordset[0].name;
    } catch (error) {
        console.warn(`Failed to get name for ${empCode}:`, error.message);
    }
    return empCode;
};

export const clearUserCache = () => userCache.clear();
export const getCacheStats  = () => ({ size: userCache.size });