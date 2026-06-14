import { Router } from "express";
import { verifyToken } from "../middlewares/authLimit.js";
import {
    createTrainController,
    getAllTrainController,
    getTrainByIdController,
    updateTrainController,
    deleteTrainController
} from "../controller/trainController.js";

const router = Router();

router.get("/", getAllTrainController);
router.get("/:id", getTrainByIdController);
router.post("/", verifyToken, createTrainController);
router.put("/:id", verifyToken, updateTrainController);
router.delete("/:id", verifyToken, deleteTrainController);

export default router;