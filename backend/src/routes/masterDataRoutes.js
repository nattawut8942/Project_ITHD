// backend/src/routes/masterDataRoutes.js
import express from 'express';
import { verifyToken, checkCC7510, filterByEmpCode } from '../middleware/authMiddleware.js';


import {
  getAllMasterData,
  getProblemTypes, getProblemSubtypes,
  getLocations, getSubLocations,
  getDeviceTypes,
  createMasterItem, updateMasterItem, deleteMasterItem,
} from '../controllers/masterDataController.js';

const router = express.Router();

router.get('/all',                       verifyToken, filterByEmpCode, getAllMasterData);
router.get('/problem-types',             verifyToken, filterByEmpCode, getProblemTypes);
router.get('/problem-subtypes/:typeId?', verifyToken, filterByEmpCode, getProblemSubtypes);
router.get('/locations',                 verifyToken, filterByEmpCode, getLocations);
router.get('/sub-locations/:locationId?',verifyToken, filterByEmpCode, getSubLocations);
router.get('/device-types',              verifyToken, filterByEmpCode, getDeviceTypes);

router.post('/:table',   verifyToken, filterByEmpCode, checkCC7510, createMasterItem);
router.put('/:table/:id',verifyToken, filterByEmpCode, checkCC7510, updateMasterItem);
router.delete('/:table/:id',verifyToken, filterByEmpCode, checkCC7510, deleteMasterItem);

export default router;