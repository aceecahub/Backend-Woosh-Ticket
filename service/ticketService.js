import prisma from "../config/prisma/client.js";
import crypto from "crypto";

/**
 * Generate QR Code string (simulasi)
 * Format: WOOSH-{bookingCode}-{timestamp}-{randomHash}
 */
const generateQRCode = (bookingCode) => {
    const timestamp = Date.now();
    const randomHash = crypto.randomBytes(8).toString("hex");
    return `WOOSH-${bookingCode}-${timestamp}-${randomHash}`;
};

/**
 * GENERATE TICKET
 * Alur bisnis:
 * 1. Validasi booking ada dan status = paid
 * 2. Cek tiket belum ada (hindari duplikasi)
 * 3. Generate QR code unik
 * 4. Simpan ke tabel tickets dengan status = issued
 */
export const generateTicketService = async (booking_id) => {
    const bookingId = parseInt(booking_id);
    if (isNaN(bookingId)) {
        throw new Error("ID Booking tidak valid.");
    }

    try {
        const booking = await prisma.booking.findUnique({
            where: { booking_id: bookingId },
            include: {
                schedule: { include: { train: true, departureStation: true, arrivalStation: true } },
                bookingPassengers: { include: { seat: true } },
            },
        });

        if (!booking) {
            throw new Error("Booking tidak ditemukan.");
        }

        if (booking.status !== "paid") {
            throw new Error(`Tiket hanya bisa dibuat untuk booking yang sudah dibayar. Status: ${booking.status}`);
        }

        // Cek tiket sudah ada atau belum
        const existingTicket = await prisma.ticket.findFirst({
            where: { booking_id: bookingId },
        });

        if (existingTicket) {
            throw new Error("Tiket untuk booking ini sudah dibuat sebelumnya.");
        }

        // Generate QR Code
        const qrCode = generateQRCode(booking.booking_code);

        const ticket = await prisma.ticket.create({
            data: {
                booking_id: bookingId,
                qr_code: qrCode,
                status: "issued",
            },
            include: {
                booking: {
                    include: {
                        schedule: { include: { train: true, departureStation: true, arrivalStation: true } },
                        bookingPassengers: { include: { seat: true } },
                    },
                },
            },
        });

        return ticket;
    } catch (error) {
        throw new Error(error.message);
    }
};

/**
 * GET TICKET BY BOOKING ID
 */
export const getTicketByBookingIdService = async (booking_id) => {
    const bookingId = parseInt(booking_id);
    if (isNaN(bookingId)) {
        throw new Error("ID Booking tidak valid.");
    }

    try {
        const ticket = await prisma.ticket.findFirst({
            where: { booking_id: bookingId },
            include: {
                booking: {
                    include: {
                        user: { select: { user_id: true, full_name: true, email: true } },
                        schedule: { include: { train: true, departureStation: true, arrivalStation: true } },
                        bookingPassengers: { include: { seat: true } },
                    },
                },
            },
        });

        if (!ticket) {
            throw new Error("Tiket tidak ditemukan untuk booking ini.");
        }

        return ticket;
    } catch (error) {
        throw new Error(error.message);
    }
};

/**
 * VALIDATE AND USE TICKET (Check-in / Scan QR di Stasiun)
 * Alur bisnis:
 * 1. Cari tiket berdasarkan qr_code
 * 2. Validasi status = issued (belum dipakai/expired)
 * 3. Update status tiket ke used
 * 4. Update status booking ke completed
 */
export const validateAndUseTicketService = async (qr_code) => {
    if (!qr_code) {
        throw new Error("QR Code wajib disertakan.");
    }

    try {
        const ticket = await prisma.ticket.findUnique({
            where: { qr_code },
            include: {
                booking: {
                    include: {
                        schedule: { include: { train: true, departureStation: true, arrivalStation: true } },
                        bookingPassengers: true,
                    },
                },
            },
        });

        if (!ticket) {
            throw new Error("Tiket tidak ditemukan. QR Code tidak valid.");
        }

        if (ticket.status === "used") {
            throw new Error("Tiket sudah digunakan sebelumnya.");
        }

        if (ticket.status === "expired") {
            throw new Error("Tiket sudah kadaluarsa.");
        }

        if (ticket.status !== "issued") {
            throw new Error(`Tiket tidak dapat digunakan. Status: ${ticket.status}`);
        }

        // Update ticket + booking dalam transaksi
        const result = await prisma.$transaction(async (tx) => {
            const updatedTicket = await tx.ticket.update({
                where: { ticket_id: ticket.ticket_id },
                data: { status: "used" },
            });

            await tx.booking.update({
                where: { booking_id: ticket.booking_id },
                data: { status: "completed" },
            });

            return updatedTicket;
        });

        return {
            ticket: result,
            message: "Tiket berhasil divalidasi. Check-in berhasil!",
            detail_perjalanan: {
                kereta: ticket.booking.schedule.train.train_name,
                dari: ticket.booking.schedule.departureStation.station_name,
                ke: ticket.booking.schedule.arrivalStation.station_name,
                tanggal: ticket.booking.schedule.departure_time,
                penumpang: ticket.booking.bookingPassengers.map((p) => ({
                    nama: p.full_name,
                    kursi: p.seat_id,
                })),
            },
        };
    } catch (error) {
        throw new Error(error.message);
    }
};
