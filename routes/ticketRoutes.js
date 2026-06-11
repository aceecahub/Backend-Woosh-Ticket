import { Router } from "express";
import { verifyToken } from "../middlewares/authLimit.js";
import {
    generateTicketController,
    getTicketByBookingIdController,
    scanTicketController,
} from "../controller/ticketController.js";

const router = Router();

router.post("/generate", verifyToken, generateTicketController);
router.get("/booking/:bookingId", verifyToken, getTicketByBookingIdController);
router.post("/scan", verifyToken, scanTicketController);

export default router;
