import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    server: process.env.DB_HOST,
    database: process.env.DB_NAME,
    options: {
        encrypt: false, // Set to true if you're on Azure
        trustServerCertificate: true, // Change to false for production if you have a valid certificate
    },
};

let pool;

export const connectDB = async () => {
    try {
        if (!pool) {
            pool = await sql.connect(config);
            console.log('✅ Connected to SQL Server database successfully!');
        }
        return pool;
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
        throw err;
    }
};

export const getPool = () => {
    if (!pool) {
        throw new Error('Database pool has not been initialized. Call connectDB() first.');
    }
    return pool;
};

export { sql };
