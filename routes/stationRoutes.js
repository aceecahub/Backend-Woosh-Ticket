import { Router } from "express";
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
router.post("/", createStationController);
router.put("/:id", updateStationController);
router.delete("/:id", deleteStationController);

export default router;