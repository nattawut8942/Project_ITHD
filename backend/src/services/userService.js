// backend/src/services/userService.js (UPDATED)
import { sql, getPool } from '../config/db.js';

/**
 * User Service - Handle user-related queries
 * Uses dbo.ithd_users table
 * Caches results to reduce database calls
 */

// Simple in-memory cache (use Redis in production)
const userCache = new Map();
const CACHE_DURATION = 3600000; // 1 hour

/**
 * Get user email by empCode
 * Priority:
 * 1. Check in-memory cache
 * 2. Query database (dbo.ithd_users)
 * 3. Fallback: construct from empCode
 */
export const getEmailByEmpCode = async (empCode) => {
    if (!empCode) return null;

    // Check cache
    if (userCache.has(empCode)) {
        const cached = userCache.get(empCode);
        if (Date.now() - cached.timestamp < CACHE_DURATION) {
            return cached.email;
        }
        userCache.delete(empCode);
    }

    try {
        const pool = getPool();
        const result = await pool.request()
            .input('empCode', sql.NVarChar, empCode)
            .query('SELECT email FROM dbo.ithd_users WHERE empCode = @empCode');

        if (result.recordset.length > 0) {
            const email = result.recordset[0].email;
            
            // Cache it
            userCache.set(empCode, {
                email,
                timestamp: Date.now()
            });
            
            return email;
        }
    } catch (error) {
        console.warn(`Failed to get email for ${empCode}:`, error.message);
    }

    // Fallback: construct from empCode
    const emailPrefix = empCode.toLowerCase().replace(/emp\d+/i, '').trim();
    const email = emailPrefix.includes('@') 
        ? emailPrefix 
        : `${emailPrefix}@dci.daikin.co.jp`;
    
    return email;
};

/**
 * Get user details by empCode from dbo.ithd_users
 */
export const getUserByEmpCode = async (empCode) => {
    if (!empCode) return null;

    try {
        const pool = getPool();
        const result = await pool.request()
            .input('empCode', sql.NVarChar, empCode)
            .query(`
                SELECT empCode, email, name, cost_center, sect
                FROM dbo.ithd_users
                WHERE empCode = @empCode
            `);

        if (result.recordset.length > 0) {
            return result.recordset[0];
        }
    } catch (error) {
        console.warn(`Failed to get user ${empCode}:`, error.message);
    }

    return null;
};

/**
 * Get user name by empCode
 */
export const getNameByEmpCode = async (empCode) => {
    if (!empCode) return 'User';

    try {
        const pool = getPool();
        const result = await pool.request()
            .input('empCode', sql.NVarChar, empCode)
            .query('SELECT name FROM dbo.ithd_users WHERE empCode = @empCode');

        if (result.recordset.length > 0) {
            return result.recordset[0].name;
        }
    } catch (error) {
        console.warn(`Failed to get name for ${empCode}:`, error.message);
    }

    return empCode;
};

/**
 * Sync users from Daikin AD API to dbo.ithd_users
 * Call this periodically to keep user database updated
 */
export const syncUserFromDaikinAD = async (empCode, userName, email, costCenter, sect) => {
    try {
        const pool = getPool();
        
        // Check if user exists by empCode or email
        const checkUser = await pool.request()
            .input('empCode', sql.NVarChar, empCode)
            .input('email', sql.NVarChar, email)
            .query('SELECT empCode FROM dbo.ithd_users WHERE empCode = @empCode OR email = @email');

        if (checkUser.recordset.length === 0) {
            // Insert new user
            await pool.request()
                .input('empCode', sql.NVarChar, empCode)
                .input('email', sql.NVarChar, email)
                .input('name', sql.NVarChar, userName)
                .input('cost_center', sql.NVarChar, costCenter)
                .input('sect', sql.NVarChar, sect)
                .query(`
                    INSERT INTO dbo.ithd_users (empCode, email, name, cost_center, sect)
                    VALUES (@empCode, @email, @name, @cost_center, @sect)
                `);
            
            userCache.delete(empCode);
            console.log(`✅ User synced to dbo.ithd_users: ${empCode}`);
            return { success: true, action: 'inserted' };
        } else {
            // Update existing user (match by empCode or fallback to email)
            const existingEmpCode = checkUser.recordset[0].empCode;
            await pool.request()
                .input('newEmpCode', sql.NVarChar, empCode)
                .input('targetEmpCode', sql.NVarChar, existingEmpCode)
                .input('email', sql.NVarChar, email)
                .input('name', sql.NVarChar, userName)
                .input('cost_center', sql.NVarChar, costCenter)
                .input('sect', sql.NVarChar, sect)
                .query(`
                    UPDATE dbo.ithd_users 
                    SET empCode = @newEmpCode, email = @email, name = @name, cost_center = @cost_center, sect = @sect
                    WHERE empCode = @targetEmpCode
                `);
            
            userCache.delete(empCode);
            userCache.delete(existingEmpCode);
            return { success: true, action: 'updated' };
        }
    } catch (error) {
        console.error(`Failed to sync user ${empCode}:`, error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Clear cache (useful for testing or manual refresh)
 */
export const clearUserCache = () => {
    userCache.clear();
    console.log('User cache cleared');
};

/**
 * Get cache stats (for debugging)
 */
export const getCacheStats = () => {
    return {
        size: userCache.size,
        entries: Array.from(userCache.keys())
    };
};
