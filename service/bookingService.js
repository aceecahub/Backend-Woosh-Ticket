import prisma from "../config/prisma/client.js";

/**
 * Generate kode booking unik: WSH-{timestamp}-{random}
 */
const generateBookingCode = () => {
    const random = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `WSH-${random}`;
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

        // LOGGING UNTUK DEBUGGING (Cek di terminal backend)
        const depTime = new Date(schedule.departure_time);
        const now = new Date();

        // Toleransi: Izinkan booking jika keberangkatan masih dalam 2 jam terakhir (untuk testing)
        // Atau jika depTime di masa depan, pasti lolos.
        const isPast = depTime.getTime() < (now.getTime() - (2 * 60 * 60 * 1000));

        if (isPast) {
            throw new Error(`Jadwal sudah berangkat (Tiket: ${depTime.getHours()}:${depTime.getMinutes()}, Sekarang: ${now.getHours()}:${now.getMinutes()}).`);
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

        // 4. Hitung total harga berdasarkan KELAS KURSI
        let totalPrice = 0;
        seats.forEach(seat => {
            const basePrice = parseFloat(schedule.price);
            if (seat.class === "first_class") totalPrice += basePrice * 2;
            else if (seat.class === "business") totalPrice += basePrice * 1.5;
            else totalPrice += basePrice;
        });

        // 5. Buat booking dalam transaksi
        const bookingCode = generateBookingCode();
        const expiredAt = new Date(now.getTime() + 5 * 60 * 1000); // Batas 5 menit sesuai permintaan user

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

            return newBooking.booking_id;
        });

        // Ambil data lengkap setelah transaksi selesai
        const result = await prisma.booking.findUnique({
            where: { booking_id: booking },
            include: {
                bookingPassengers: { include: { seat: true } },
                schedule: { include: { train: true, departureStation: true, arrivalStation: true } },
            },
        });

        // Konversi Decimal ke Number agar tidak error saat JSON stringify
        const serializedResult = JSON.parse(JSON.stringify(result, (key, value) =>
            typeof value === 'object' && value?.constructor?.name === 'Decimal'
                ? parseFloat(value.toString())
                : value
        ));

        return serializedResult;
    } catch (error) {
        console.error("Service Error Details:", error);
        throw error;
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
        let allSeats = await prisma.seat.findMany({
            where: { train_id: schedule.train_id },
            orderBy: [{ coach_number: "asc" }, { seat_number: "asc" }],
        });

        // FALLBACK: Jika kereta belum punya kursi (data lama), buat otomatis
        if (allSeats.length === 0) {
            const coaches = ["01", "02", "03", "04", "05", "06", "07", "08"];
            const letters = ["A", "B", "C", "D", "F"];
            const seatsData = [];

            for (const coach of coaches) {
                let seatClass = "premium_economy";
                if (coach === "01") seatClass = "first_class";
                else if (coach === "02") seatClass = "business";

                for (let row = 1; row <= 10; row++) {
                    for (const letter of letters) {
                        seatsData.push({
                            train_id: schedule.train_id,
                            coach_number: `Coach ${coach}`,
                            seat_number: `${row.toString().padStart(2, '0')}${letter}`,
                            class: seatClass
                        });
                    }
                }
            }

            await prisma.seat.createMany({ data: seatsData });

            // Ambil ulang setelah dibuat
            allSeats = await prisma.seat.findMany({
                where: { train_id: schedule.train_id },
                orderBy: [{ coach_number: "asc" }, { seat_number: "asc" }],
            });
        }

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
            total_seats: allSeats.length,
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
