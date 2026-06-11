import { Router } from "express";
import { verifyToken } from "../middlewares/authLimit.js";
import {
    createBookingController,
    getBookingByIdController,
    getMyBookingsController,
    cancelBookingController,
    getAvailableSeatsController,
} from "../controller/bookingController.js";

const router = Router();

// /my must be before /:id
router.get("/my", verifyToken, getMyBookingsController);
router.get("/:id", verifyToken, getBookingByIdController);
router.post("/", verifyToken, createBookingController);
router.post("/:id/cancel", verifyToken, cancelBookingController);
router.get("/:scheduleId/available-seats", getAvailableSeatsController);

export default router;
