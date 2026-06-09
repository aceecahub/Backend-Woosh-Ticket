import express from "express";
import cors from "cors";
import "dotenv/config";

// routes
import authRoutes from "./routes/authRoutes.js";
import stationRoutes from "./routes/stationRoutes.js";
import trainRoutes from "./routes/trainRoutes.js";
import seatRoutes from "./routes/seatRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/stations", stationRoutes);
app.use("/api/trains", trainRoutes);
app.use("/api/seats", seatRoutes);

app.get("/", (req, res) => {
    res.send("API is running!");
});

const PORT = process.env.PORT;

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});