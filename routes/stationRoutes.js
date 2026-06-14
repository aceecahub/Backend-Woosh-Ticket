import { Router } from "express";
import { verifyToken } from "../middlewares/authLimit.js";
import {
    createStationController,
    getAllStationController,
    getStationByIdController,
    updateStationController,
    deleteStationController
} from "../controller/stationController.js";

const router = Router();

router.get("/", getAllStationController);
router.get("/:id", getStationByIdController);
router.post("/", verifyToken, createStationController);
router.put("/:id", verifyToken, updateStationController);
router.delete("/:id", verifyToken, deleteStationController);

export default router;