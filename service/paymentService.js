import prisma from "../config/prisma/client.js";
import { generateTicketService } from "./ticketService.js";

/**
 * CREATE PAYMENT
 * Alur bisnis:
 * 1. Validasi booking ada, milik user, status pending, belum expired
 * 2. Buat record payment dengan status pending
 * 3. Return data pembayaran (simulasi gateway: snap_token)
 */
export const createPaymentService = async (booking_id, userId, payment_method) => {
    const bookingId = parseInt(booking_id);
    if (isNaN(bookingId)) {
        throw new Error("ID Booking tidak valid.");
    }

    if (!payment_method) {
        throw new Error("Metode pembayaran wajib dipilih.");
    }

    const validMethods = ["bank_transfer", "ewallet", "qris", "credit_card"];
    if (!validMethods.includes(payment_method)) {
        throw new Error(`Metode pembayaran tidak valid. Pilih: ${validMethods.join(", ")}`);
    }

    try {
        const booking = await prisma.booking.findUnique({
            where: { booking_id: bookingId },
        });

        if (!booking) {
            throw new Error("Booking tidak ditemukan.");
        }

        if (booking.user_id !== userId) {
            throw new Error("Anda tidak memiliki akses untuk membayar booking ini.");
        }

        if (booking.status !== "pending") {
            throw new Error(`Booking tidak dapat dibayar. Status saat ini: ${booking.status}`);
        }

        // Cek expired
        if (booking.expired_at && new Date(booking.expired_at) < new Date()) {
            // Auto-cancel kalau sudah expired
            await prisma.booking.update({
                where: { booking_id: bookingId },
                data: { status: "cancelled" },
            });
            throw new Error("Waktu pembayaran sudah habis. Booking telah dibatalkan otomatis.");
        }

        // Cek apakah sudah ada payment success
        const existingSuccess = await prisma.payment.findFirst({
            where: { booking_id: bookingId, payment_status: "success" },
        });
        if (existingSuccess) {
            throw new Error("Booking sudah dibayar sebelumnya.");
        }

        // Simulasi snap_token dari payment gateway (Midtrans/Xendit)
        const snapToken = `snap_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

        const payment = await prisma.payment.create({
            data: {
                booking_id: bookingId,
                payment_method,
                amount: booking.total_price,
                payment_status: "pending",
                snap_token: snapToken,
            },
        });

        return {
            ...payment,
            redirect_url: `https://app.sandbox.midtrans.com/snap/v2/vtweb/${snapToken}`,
        };
    } catch (error) {
        throw new Error(error.message);
    }
};

/**
 * PROCESS PAYMENT CALLBACK
 * Alur bisnis:
 * 1. Simulasi callback dari payment gateway
 * 2. Update payment status ke success
 * 3. Update booking status ke paid
 * 4. Generate tiket otomatis
 */
export const processPaymentCallbackService = async (payment_id, status = "success") => {
    const paymentId = parseInt(payment_id);
    if (isNaN(paymentId)) {
        throw new Error("ID Payment tidak valid.");
    }

    try {
        const payment = await prisma.payment.findUnique({
            where: { payment_id: paymentId },
        });

        if (!payment) {
            throw new Error("Payment tidak ditemukan.");
        }

        if (payment.payment_status === "success") {
            throw new Error("Payment sudah diproses sebelumnya.");
        }

        const result = await prisma.$transaction(async (tx) => {
            // Update payment status
            const updatedPayment = await tx.payment.update({
                where: { payment_id: paymentId },
                data: {
                    payment_status: status,
                    payment_date: new Date(),
                },
            });

            if (status === "success") {
                // Update booking status ke paid
                await tx.booking.update({
                    where: { booking_id: payment.booking_id },
                    data: { status: "paid" },
                });
            }

            return updatedPayment;
        });

        // Generate tiket setelah transaksi berhasil (di luar transaksi agar tidak blocking)
        if (status === "success") {
            try {
                const ticket = await generateTicketService(payment.booking_id);
                return { payment: result, ticket };
            } catch (ticketError) {
                console.error("[Payment Callback] Gagal generate tiket:", ticketError.message);
                return { payment: result, ticket: null, ticket_error: ticketError.message };
            }
        }

        return { payment: result };
    } catch (error) {
        throw new Error(error.message);
    }
};

/**
 * GET PAYMENT BY BOOKING ID
 */
export const getPaymentByBookingIdService = async (booking_id) => {
    const bookingId = parseInt(booking_id);
    if (isNaN(bookingId)) {
        throw new Error("ID Booking tidak valid.");
    }

    try {
        const payments = await prisma.payment.findMany({
            where: { booking_id: bookingId },
            orderBy: { payment_id: "desc" },
        });

        if (!payments || payments.length === 0) {
            throw new Error("Data pembayaran tidak ditemukan untuk booking ini.");
        }

        return payments;
    } catch (error) {
        throw new Error(error.message);
    }
};
