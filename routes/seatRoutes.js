import { Router } from "express";
import {
    createSeatController,
    getAllSeatController,
    getSeatByIdController,
    updateSeatController,
    deleteSeatController
} from "../controller/seatController.js";

const router = Router();

router.get("/", getAllSeatController);
router.get("/:id", getSeatByIdController);
router.post("/", createSeatController);
router.put("/:id", updateSeatController);
router.delete("/:id", deleteSeatController);

export default router;