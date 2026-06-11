import {
    createPaymentService,
    processPaymentCallbackService,
    getPaymentByBookingIdService,
} from "../service/paymentService.js";

export const createPaymentController = async (req, res) => {
    try {
        const { booking_id, payment_method } = req.body;
        const payment = await createPaymentService(booking_id, req.user.id, payment_method);
        return res.status(201).json({ message: "Pembayaran berhasil diinisiasi", data: payment });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const paymentCallbackController = async (req, res) => {
    try {
        const { payment_id, status } = req.body;
        const result = await processPaymentCallbackService(payment_id, status || "success");
        return res.status(200).json({ message: "Callback pembayaran berhasil diproses", data: result });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const getPaymentByBookingIdController = async (req, res) => {
    try {
        const payments = await getPaymentByBookingIdService(req.params.bookingId);
        return res.status(200).json({ message: "Data pembayaran berhasil ditampilkan", data: payments });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
