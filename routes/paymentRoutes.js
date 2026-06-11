import { Router } from "express";
import { verifyToken } from "../middlewares/authLimit.js";
import {
    createPaymentController,
    paymentCallbackController,
    getPaymentByBookingIdController,
} from "../controller/paymentController.js";

const router = Router();

router.post("/", verifyToken, createPaymentController);
router.post("/callback", paymentCallbackController); // Simulasi gateway callback (tanpa auth)
router.get("/booking/:bookingId", verifyToken, getPaymentByBookingIdController);

export default router;
