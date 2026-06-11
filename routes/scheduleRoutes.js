import { Router } from "express";
import {
    getAllScheduleController,
    getScheduleByIdController,
    createScheduleController,
    updateScheduleController,
    deleteScheduleController,
    searchScheduleController
} from "../controller/scheduleController.js";

const router = Router();

// /search MUST be before /:id to prevent "search" from being treated as an ID
router.get("/search", searchScheduleController);
router.get("/", getAllScheduleController);
router.get("/:id", getScheduleByIdController);
router.post("/", createScheduleController);
router.put("/:id", updateScheduleController);
router.delete("/:id", deleteScheduleController);

export default router;
