import { Router } from "express";
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
router.post("/", createTrainController);
router.put("/:id", updateTrainController);
router.delete("/:id", deleteTrainController);

export default router;