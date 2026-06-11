import prisma from "../config/prisma/client.js";

/**
 * Generate kode booking unik: WSH-{timestamp}-{random}
 */
const generateBookingCode = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `WSH-${timestamp}-${random}`;
};

/**
 * CREATE BOOKING
 * Alur bisnis:
 * 1. Validasi jadwal ada dan belum berangkat
 * 2. Validasi kursi ada dan milik kereta yang benar
 * 3. Cek kursi belum dibooking orang lain (seat locking)
 * 4. Buat Booking + BookingPassenger dalam transaksi
 * 5. Set expired_at = now + 15 menit (payment timeout)
 */
export const createBookingService = async (userId, data) => {
    const { schedule_id, passengers } = data;
    // passengers: [{ full_name, id_number, seat_id }]

    if (!schedule_id || !passengers || !Array.isArray(passengers) || passengers.length === 0) {
        throw new Error("schedule_id dan daftar passengers wajib diisi.");
    }

    const scheduleId = parseInt(schedule_id);
    if (isNaN(scheduleId)) {
        throw new Error("ID Jadwal tidak valid.");
    }

    try {
        // 1. Validasi jadwal
        const schedule = await prisma.schedule.findUnique({
            where: { schedule_id: scheduleId },
            include: { train: true }
        });

        if (!schedule) {
            throw new Error("Jadwal tidak ditemukan.");
        }

        if (new Date(schedule.departure_time) <= new Date()) {
            throw new Error("Jadwal sudah berangkat. Tidak dapat melakukan pemesanan.");
        }

        // 2. Validasi setiap kursi
        const seatIds = passengers.map((p) => parseInt(p.seat_id));
        if (seatIds.some(isNaN)) {
            throw new Error("ID kursi tidak valid pada salah satu penumpang.");
        }

        const seats = await prisma.seat.findMany({
            where: { seat_id: { in: seatIds } }
        });

        if (seats.length !== seatIds.length) {
            throw new Error("Salah satu kursi tidak ditemukan.");
        }

        // Pastikan semua kursi milik kereta yang sama dengan jadwal
        const invalidSeats = seats.filter((s) => s.train_id !== schedule.train_id);
        if (invalidSeats.length > 0) {
            throw new Error("Salah satu kursi tidak terdaftar pada kereta di jadwal ini.");
        }

        // Cek duplikat seat_id dalam satu booking
        const uniqueSeatIds = new Set(seatIds);
        if (uniqueSeatIds.size !== seatIds.length) {
            throw new Error("Tidak boleh memilih kursi yang sama untuk lebih dari satu penumpang.");
        }

        // 3. Seat locking: cek kursi belum dibooking (status pending/paid)
        const existingBooked = await prisma.bookingPassenger.findMany({
            where: {
                seat_id: { in: seatIds },
                booking: {
                    schedule_id: scheduleId,
                    status: { in: ["pending", "paid"] }
                }
            },
            include: { seat: true }
        });

        if (existingBooked.length > 0) {
            const takenSeats = existingBooked.map((bp) => bp.seat.seat_number).join(", ");
            throw new Error(`Kursi berikut sudah dipesan: ${takenSeats}. Silakan pilih kursi lain.`);
        }

        // 4. Hitung total harga (price dasar * jumlah penumpang)
        const totalPrice = parseFloat(schedule.price) * passengers.length;

        // 5. Buat booking dalam transaksi
        const bookingCode = generateBookingCode();
        const now = new Date();
        const expiredAt = new Date(now.getTime() + 15 * 60 * 1000); // +15 menit

        const booking = await prisma.$transaction(async (tx) => {
            const newBooking = await tx.booking.create({
                data: {
                    user_id: userId,
                    schedule_id: scheduleId,
                    booking_code: bookingCode,
                    total_price: totalPrice,
                    status: "pending",
                    expired_at: expiredAt,
                },
            });

            // Buat BookingPassenger untuk setiap penumpang
            const passengerData = passengers.map((p) => ({
                booking_id: newBooking.booking_id,
                full_name: p.full_name,
                id_number: p.id_number,
                seat_id: parseInt(p.seat_id),
            }));

            await tx.bookingPassenger.createMany({
                data: passengerData,
            });

            // Return booking lengkap
            return tx.booking.findUnique({
                where: { booking_id: newBooking.booking_id },
                include: {
                    bookingPassengers: { include: { seat: true } },
                    schedule: { include: { train: true, departureStation: true, arrivalStation: true } },
                },
            });
        });

        return booking;
    } catch (error) {
        throw new Error(error.message);
    }
};

/**
 * GET BOOKING BY ID
 */
export const getBookingByIdService = async (booking_id) => {
    const bookingId = parseInt(booking_id);
    if (isNaN(bookingId)) {
        throw new Error("ID Booking tidak valid.");
    }

    try {
        const booking = await prisma.booking.findUnique({
            where: { booking_id: bookingId },
            include: {
                user: { select: { user_id: true, full_name: true, email: true, phone: true } },
                schedule: { include: { train: true, departureStation: true, arrivalStation: true } },
                bookingPassengers: { include: { seat: true } },
                payments: true,
                tickets: true,
            },
        });

        if (!booking) {
            throw new Error("Booking tidak ditemukan.");
        }

        return booking;
    } catch (error) {
        throw new Error(error.message);
    }
};

/**
 * GET BOOKINGS BY USER
 */
export const getBookingsByUserService = async (userId) => {
    try {
        const bookings = await prisma.booking.findMany({
            where: { user_id: userId },
            include: {
                schedule: { include: { train: true, departureStation: true, arrivalStation: true } },
                bookingPassengers: { include: { seat: true } },
                payments: true,
                tickets: true,
            },
            orderBy: { booking_date: "desc" },
        });
        return bookings;
    } catch (error) {
        throw new Error(error.message);
    }
};

/**
 * CANCEL BOOKING
 * Hanya bisa dibatalkan jika status masih pending atau paid
 */
export const cancelBookingService = async (booking_id, userId) => {
    const bookingId = parseInt(booking_id);
    if (isNaN(bookingId)) {
        throw new Error("ID Booking tidak valid.");
    }

    try {
        const booking = await prisma.booking.findUnique({
            where: { booking_id: bookingId },
        });

        if (!booking) {
            throw new Error("Booking tidak ditemukan.");
        }

        if (booking.user_id !== userId) {
            throw new Error("Anda tidak memiliki akses untuk membatalkan booking ini.");
        }

        if (booking.status === "cancelled") {
            throw new Error("Booking sudah dibatalkan sebelumnya.");
        }

        if (booking.status === "completed") {
            throw new Error("Booking sudah selesai dan tidak dapat dibatalkan.");
        }

        const cancelledBooking = await prisma.booking.update({
            where: { booking_id: bookingId },
            data: { status: "cancelled" },
            include: {
                bookingPassengers: { include: { seat: true } },
                schedule: { include: { train: true, departureStation: true, arrivalStation: true } },
            },
        });

        return cancelledBooking;
    } catch (error) {
        throw new Error(error.message);
    }
};

/**
 * GET AVAILABLE SEATS
 * Menampilkan kursi yang BELUM dibooking untuk jadwal tertentu
 */
export const getAvailableSeatsService = async (schedule_id) => {
    const scheduleId = parseInt(schedule_id);
    if (isNaN(scheduleId)) {
        throw new Error("ID Jadwal tidak valid.");
    }

    try {
        const schedule = await prisma.schedule.findUnique({
            where: { schedule_id: scheduleId },
            include: { train: true },
        });

        if (!schedule) {
            throw new Error("Jadwal tidak ditemukan.");
        }

        // Ambil semua kursi untuk kereta ini
        const allSeats = await prisma.seat.findMany({
            where: { train_id: schedule.train_id },
            orderBy: [{ coach_number: "asc" }, { seat_number: "asc" }],
        });

        // Ambil kursi yang sudah dibooking (pending/paid) untuk jadwal ini
        const bookedPassengers = await prisma.bookingPassenger.findMany({
            where: {
                booking: {
                    schedule_id: scheduleId,
                    status: { in: ["pending", "paid"] },
                },
            },
            select: { seat_id: true },
        });

        const bookedSeatIds = new Set(bookedPassengers.map((bp) => bp.seat_id));

        const availableSeats = allSeats.filter((seat) => !bookedSeatIds.has(seat.seat_id));

        return {
            schedule_id: scheduleId,
            train_name: schedule.train.train_name,
            total_seats: schedule.train.total_seats,
            booked_count: bookedSeatIds.size,
            available_count: availableSeats.length,
            seats: availableSeats,
        };
    } catch (error) {
        throw new Error(error.message);
    }
};

/**
 * CANCEL EXPIRED BOOKINGS (Auto-cancel)
 * Dipanggil periodik dari index.js
 * Membatalkan semua booking pending yang sudah melewati expired_at
 */
export const cancelExpiredBookingsService = async () => {
    try {
        const now = new Date();

        const expiredBookings = await prisma.booking.findMany({
            where: {
                status: "pending",
                expired_at: { lt: now },
            },
        });

        if (expiredBookings.length === 0) return 0;

        const bookingIds = expiredBookings.map((b) => b.booking_id);

        await prisma.booking.updateMany({
            where: { booking_id: { in: bookingIds } },
            data: { status: "cancelled" },
        });

        console.log(`[Auto-Cancel] ${expiredBookings.length} booking expired berhasil dibatalkan.`);
        return expiredBookings.length;
    } catch (error) {
        console.error("[Auto-Cancel] Error:", error.message);
        return 0;
    }
};
