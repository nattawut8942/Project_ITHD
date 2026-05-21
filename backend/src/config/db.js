// backend/src/config/db.js (FIXED)
// Proper database configuration with environment variables

import sql from 'mssql';
import dotenv from 'dotenv';

// ✅ MUST load .env first!
dotenv.config();

// Debug: Log loaded variables
console.log('📝 Loading environment variables...');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PORT:', process.env.DB_PORT);

// Validate required variables
if (!process.env.DB_HOST) {
    console.error('❌ Error: DB_HOST not found in .env');
    process.exit(1);
}

if (!process.env.DB_USER) {
    console.error('❌ Error: DB_USER not found in .env');
    process.exit(1);
}

if (!process.env.DB_NAME) {
    console.error('❌ Error: DB_NAME not found in .env');
    process.exit(1);
}

// Database Configuration
const config = {
    server: process.env.DB_HOST,           // ✅ MUST be 'server' for mssql
    authentication: {
        type: 'default',
        options: {
            userName: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
        },
    },
    options: {
        database: process.env.DB_NAME,
        instanceName: undefined,
        trustedConnection: process.env.DB_TRUSTED_CONNECTION === 'true',
        trustServerCertificate: true,
        encrypt: process.env.DB_ENCRYPT === 'true' || false,
        rowCollectionOnDone: true,
        rowCollectionOnRequestCompletion: false,
        useColumnNames: true,
    },
};

// Optional: Add port if specified
if (process.env.DB_PORT) {
    config.options.port = parseInt(process.env.DB_PORT);
}

console.log('✅ Database config created:', {
    server: config.server,
    database: config.options.database,
    port: config.options.port || 1433,
    user: process.env.DB_USER,
});

// Create connection pool
const pool = new sql.ConnectionPool(config);

// Connection event handlers
pool.on('error', err => {
    console.error('❌ Database pool error:', err);
});

// Connect to database
export const connectDB = async () => {
    try {
        console.log('🔌 Connecting to database...');
        await pool.connect();
        console.log('✅ Database connected successfully!');
        return pool;
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
        throw err;
    }
};

// Export connection and sql for queries
export const getPool = () => {
    if (!pool.connected) {
        throw new Error('Database pool not connected. Call connectDB() first.');
    }
    return pool;
};

export { sql };

export default { connectDB, getPool, sql };