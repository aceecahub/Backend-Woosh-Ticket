import express from "express";
import cors from "cors";
import "dotenv/config";

// routes
import authRoutes from "./routes/authRoutes.js";
import stationRoutes from "./routes/stationRoutes.js";
import trainRoutes from "./routes/trainRoutes.js";
import seatRoutes from "./routes/seatRoutes.js";
import scheduleRoutes from "./routes/scheduleRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import ticketRoutes from "./routes/ticketRoutes.js";

// auto-cancel service
import { cancelExpiredBookingsService } from "./service/bookingService.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Register all routes
app.use("/api/auth", authRoutes);
app.use("/api/stations", stationRoutes);
app.use("/api/trains", trainRoutes);
app.use("/api/seats", seatRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/tickets", ticketRoutes);

app.get("/", (req, res) => {
    res.send("WOOSH Ticket API is running!");
});

// ============================================================
// Auto-Cancel Expired Bookings
// Berjalan setiap 60 detik untuk membatalkan booking yang belum dibayar
// ============================================================
const AUTO_CANCEL_INTERVAL = 60 * 1000; // 60 detik
setInterval(async () => {
    await cancelExpiredBookingsService();
}, AUTO_CANCEL_INTERVAL);
console.log(`[Auto-Cancel] Aktif. Cek booking expired setiap ${AUTO_CANCEL_INTERVAL / 1000} detik.`);

const PORT = process.env.PORT;

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
