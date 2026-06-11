import {
    createBookingService,
    getBookingByIdService,
    getBookingsByUserService,
    cancelBookingService,
    getAvailableSeatsService,
} from "../service/bookingService.js";

export const createBookingController = async (req, res) => {
    try {
        const booking = await createBookingService(req.user.id, req.body);
        return res.status(201).json({ message: "Booking berhasil dibuat", data: booking });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const getBookingByIdController = async (req, res) => {
    try {
        const booking = await getBookingByIdService(req.params.id);
        return res.status(200).json({ message: "Data booking berhasil ditampilkan", data: booking });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const getMyBookingsController = async (req, res) => {
    try {
        const bookings = await getBookingsByUserService(req.user.id);
        return res.status(200).json({ message: "Data booking berhasil ditampilkan", data: bookings });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const cancelBookingController = async (req, res) => {
    try {
        const booking = await cancelBookingService(req.params.id, req.user.id);
        return res.status(200).json({ message: "Booking berhasil dibatalkan", data: booking });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const getAvailableSeatsController = async (req, res) => {
    try {
        const result = await getAvailableSeatsService(req.params.scheduleId);
        return res.status(200).json({ message: "Data kursi tersedia", data: result });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
