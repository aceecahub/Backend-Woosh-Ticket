import prisma from "../config/prisma/client.js";
import { generateTicketService } from "./ticketService.js";
import midtransClient from 'midtrans-client';
import dotenv from 'dotenv';

dotenv.config();

// Inisialisasi Midtrans Snap
let snap = new midtransClient.Snap({
    isProduction: false,
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
});

/**
 * CREATE PAYMENT
 */
export const createPaymentService = async (booking_id, userId, payment_method) => {
    const bookingId = parseInt(booking_id);
    if (isNaN(bookingId)) {
        throw new Error("ID Booking tidak valid.");
    }

    try {
        // Ambil data booking DAN data user sekaligus
        const booking = await prisma.booking.findUnique({
            where: { booking_id: bookingId },
            include: {
                user: true // Penting untuk customer_details Midtrans
            }
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
            await prisma.booking.update({
                where: { booking_id: bookingId },
                data: { status: "cancelled" },
            });
            throw new Error("Waktu pembayaran sudah habis. Booking telah dibatalkan otomatis.");
        }

        // Buat parameter transaksi untuk Midtrans
        let parameter = {
            "transaction_details": {
                "order_id": `${booking.booking_code}-${Date.now()}`, // Tambahkan suffix agar order_id unik jika diulang
                "gross_amount": Math.floor(booking.total_price)
            },
            "credit_card": {
                "secure": true
            },
            "customer_details": {
                "first_name": booking.user.full_name,
                "email": booking.user.email,
                "phone": booking.user.phone
            }
        };

        // Ambil snapToken asli dari Midtrans
        const transaction = await snap.createTransaction(parameter);
        const snapToken = transaction.token;

        // Simpan ke database
        const payment = await prisma.payment.create({
            data: {
                booking_id: bookingId,
                payment_method: payment_method || "bank_transfer", // Harus sesuai enum di schema.prisma
                amount: booking.total_price,
                payment_status: "pending",
                snap_token: snapToken,
            },
        });

        return {
            ...payment,
            redirect_url: transaction.redirect_url,
            snap_token: snapToken
        };
    } catch (error) {
        console.error("Midtrans Error:", error);
        throw new Error(error.message);
    }
};

/**
 * PROCESS PAYMENT CALLBACK
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

        const result = await prisma.$transaction(async (tx) => {
            const updatedPayment = await tx.payment.update({
                where: { payment_id: paymentId },
                data: {
                    payment_status: status,
                    payment_date: new Date(),
                },
            });

            if (status === "success") {
                await tx.booking.update({
                    where: { booking_id: payment.booking_id },
                    data: { status: "paid" },
                });
            }

            return updatedPayment;
        });

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
