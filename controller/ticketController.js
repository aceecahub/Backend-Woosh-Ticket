import {
    generateTicketService,
    getTicketByBookingIdService,
    validateAndUseTicketService,
} from "../service/ticketService.js";

export const generateTicketController = async (req, res) => {
    try {
        const { booking_id } = req.body;
        const ticket = await generateTicketService(booking_id);
        return res.status(201).json({ message: "Tiket berhasil dibuat", data: ticket });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const getTicketByBookingIdController = async (req, res) => {
    try {
        const ticket = await getTicketByBookingIdService(req.params.bookingId);
        return res.status(200).json({ message: "Data tiket berhasil ditampilkan", data: ticket });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const scanTicketController = async (req, res) => {
    try {
        const { qr_code } = req.body;
        const result = await validateAndUseTicketService(qr_code);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
