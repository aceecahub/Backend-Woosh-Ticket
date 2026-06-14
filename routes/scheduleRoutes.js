import { Router } from "express";
import { verifyToken } from "../middlewares/authLimit.js";
import {
    getAllScheduleController,
    getScheduleByIdController,
    createScheduleController,
    updateScheduleController,
    deleteScheduleController,
    searchScheduleController
} from "../controller/scheduleController.js";

const router = Router();

// /search MUST be before /:id
router.get("/search", searchScheduleController);
router.get("/", getAllScheduleController);
router.get("/:id", getScheduleByIdController);

// Protected routes (Admin only logic should be here)
router.post("/", verifyToken, createScheduleController);
router.put("/:id", verifyToken, updateScheduleController);
router.delete("/:id", verifyToken, deleteScheduleController);

export default router;
