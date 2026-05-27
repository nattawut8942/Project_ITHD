// backend/src/controller/masterDataController.js
import { sql, getPool } from '../config/db.js';

const tables = {
    problem_types: 'dbo.ithd_problem_types',
    problem_subtypes: 'dbo.ithd_problem_subtypes',
    locations: 'dbo.ithd_locations',
    sub_locations: 'dbo.ithd_sub_locations',
    device_types: 'dbo.ithd_device_types',
};

// GET all problem types
export const getProblemTypes = async (req, res) => {
    try {
        const pool = getPool();
        const result = await pool.request()
            .query(`SELECT * FROM ${tables.problem_types} WHERE is_active=1 ORDER BY id`);
        res.json({ success: true, data: result.recordset });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// GET subtypes by type_id
export const getProblemSubtypes = async (req, res) => {
    try {
        const { typeId } = req.params;
        const pool = getPool();
        const result = await pool.request()
            .input('type_id', sql.Int, typeId || 0)
            .query(`SELECT * FROM ${tables.problem_subtypes} WHERE is_active=1 ${typeId ? 'AND type_id=@type_id' : ''} ORDER BY id`);
        res.json({ success: true, data: result.recordset });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// GET all locations
export const getLocations = async (req, res) => {
    try {
        const pool = getPool();
        const result = await pool.request()
            .query(`SELECT * FROM ${tables.locations} WHERE is_active=1 ORDER BY id`);
        res.json({ success: true, data: result.recordset });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// GET sub-locations by location_id
export const getSubLocations = async (req, res) => {
    try {
        const { locationId } = req.params;
        const pool = getPool();
        const result = await pool.request()
            .input('location_id', sql.Int, locationId || 0)
            .query(`SELECT * FROM ${tables.sub_locations} WHERE is_active=1 ${locationId ? 'AND location_id=@location_id' : ''} ORDER BY id`);
        res.json({ success: true, data: result.recordset });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// GET device types
export const getDeviceTypes = async (req, res) => {
    try {
        const pool = getPool();
        const result = await pool.request()
            .query(`SELECT * FROM ${tables.device_types} WHERE is_active=1 ORDER BY id`);
        res.json({ success: true, data: result.recordset });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// GET all master data at once (for Open Ticket modal)
export const getAllMasterData = async (req, res) => {
    try {
        const pool = getPool();
        const [types, subtypes, locs, sublocs, devices] = await Promise.all([
            pool.request().query(`SELECT * FROM ${tables.problem_types} WHERE is_active=1 ORDER BY id`),
            pool.request().query(`SELECT * FROM ${tables.problem_subtypes} WHERE is_active=1 ORDER BY id`),
            pool.request().query(`SELECT * FROM ${tables.locations} WHERE is_active=1 ORDER BY id`),
            pool.request().query(`SELECT * FROM ${tables.sub_locations} WHERE is_active=1 ORDER BY id`),
            pool.request().query(`SELECT * FROM ${tables.device_types} WHERE is_active=1 ORDER BY id`),
        ]);
        res.json({
            success: true,
            data: {
                problemTypes: types.recordset,
                problemSubtypes: subtypes.recordset,
                locations: locs.recordset,
                subLocations: sublocs.recordset,
                deviceTypes: devices.recordset,
            }
        });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── CRUD helpers ──────────────────────────────────────────────

// CREATE
export const createMasterItem = async (req, res) => {
    const { table } = req.params;
    const tbl = tables[table];
    if (!tbl) return res.status(400).json({ success: false, message: 'Invalid table' });
    try {
        const pool = getPool();
        const { name, icon, parent_id } = req.body;
        if (!name?.trim()) return res.status(400).json({ success: false, message: 'name is required' });

        let query = '';
        const request = pool.request().input('name', sql.NVarChar, name.trim());

        if (table === 'problem_subtypes') {
            request.input('type_id', sql.Int, parent_id);
            query = `INSERT INTO ${tbl} (type_id, name) VALUES (@type_id, @name); SELECT SCOPE_IDENTITY() as id`;
        } else if (table === 'sub_locations') {
            request.input('location_id', sql.Int, parent_id);
            query = `INSERT INTO ${tbl} (location_id, name) VALUES (@location_id, @name); SELECT SCOPE_IDENTITY() as id`;
        } else {
            if (icon) request.input('icon', sql.NVarChar, icon);
            query = `INSERT INTO ${tbl} (name${icon ? ', icon' : ''}) VALUES (@name${icon ? ', @icon' : ''}); SELECT SCOPE_IDENTITY() as id`;
        }
        const result = await request.query(query);
        res.status(201).json({ success: true, id: result.recordset[0].id });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// UPDATE
export const updateMasterItem = async (req, res) => {
    const { table, id } = req.params;
    const tbl = tables[table];
    if (!tbl) return res.status(400).json({ success: false, message: 'Invalid table' });
    try {
        const pool = getPool();
        const { name, icon, is_active } = req.body;
        const fields = [];
        const request = pool.request().input('id', sql.Int, id);
        if (name !== undefined) { request.input('name', sql.NVarChar, name); fields.push('name=@name'); }
        if (icon !== undefined) { request.input('icon', sql.NVarChar, icon); fields.push('icon=@icon'); }
        if (is_active !== undefined) { request.input('is_active', sql.Bit, is_active); fields.push('is_active=@is_active'); }
        if (!fields.length) return res.status(400).json({ success: false, message: 'No fields to update' });
        await request.query(`UPDATE ${tbl} SET ${fields.join(',')} WHERE id=@id`);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// DELETE (soft delete)
export const deleteMasterItem = async (req, res) => {
    const { table, id } = req.params;
    const tbl = tables[table];
    if (!tbl) return res.status(400).json({ success: false, message: 'Invalid table' });
    try {
        const pool = getPool();
        await pool.request().input('id', sql.Int, id)
            .query(`UPDATE ${tbl} SET is_active=0 WHERE id=@id`);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};