import prisma from "../config/prisma/client.js";

export const getAllSeatService = async (seat_id) => {
    try {
        const seats = await prisma.seat.findMany();
        return seats;
    } catch (error) {
        throw new Error(error.message);
    }
};

export const getSeatByIdService = async (seat_id) => {
    const seatId = parseInt(seat_id);
    if (isNaN(seatId)) {
        throw new Error("ID Kursi tidak valid.");
    }

    try {
        const seat = await prisma.seat.findUnique({
            where: { seat_id: seatId },
            include: {
                train: {
                    select: {
                        train_name: true,
                        train_code: true
                    }
                }
            }
        });

        if (!seat) {
            throw new Error("Kursi tidak ditemukan.");
        }

        return seat;
    } catch (error) {
        throw new Error(error.message);
    }
};

/**
 * TAMBAHAN VALIDASI REDUNDANSI PADA CREATE SEAT
 */
export const createSeatService = async (data) => {
    const { train_id, coach_number, seat_number, class: seatClass } = data;

    if (!train_id || !coach_number || !seat_number) {
        throw new Error("Semua field (train_id, coach_number, seat_number) wajib diisi.");
    }

    try {
        // 1. Validasi eksistensi kereta
        const trainExists = await prisma.train.findUnique({
            where: { train_id: parseInt(train_id) }
        });
        if (!trainExists) {
            throw new Error("Kereta tidak ditemukan.");
        }

        // 2. Validasi Redundansi: Cek kombinasi unik secara manual sebelum data dimasukkan
        const duplicateSeat = await prisma.seat.findFirst({
            where: {
                train_id: parseInt(train_id),
                coach_number: coach_number,
                seat_number: seat_number
            }
        });

        if (duplicateSeat) {
            throw new Error(`Kursi nomor ${seat_number} di ${coach_number} sudah terdaftar pada kereta ini.`);
        }

        // 3. Simpan data jika lolos validasi
        const newSeat = await prisma.seat.create({
            data: {
                train_id: parseInt(train_id),
                coach_number,
                seat_number,
                class: seatClass || "premium_economy"
            }
        });

        return newSeat;
    } catch (error) {
        if (error.code === 'P2002') {
            throw new Error("Gagal menyimpan! Kombinasi kereta, gerbong, dan nomor kursi sudah ada.");
        }
        throw new Error(error.message);
    }
};

/**
 * TAMBAHAN VALIDASI REDUNDANSI PADA UPDATE SEAT
 */
export const updateSeatService = async (seat_id, data) => {
    const seatId = parseInt(seat_id);
    const { coach_number, seat_number, class: seatClass } = data;

    if (isNaN(seatId)) {
        throw new Error("ID Kursi tidak valid.");
    }

    try {
        // 1. Ambil data asli kursi sebelum di-update untuk mengetahui train_id miliknya
        const currentSeat = await prisma.seat.findUnique({
            where: { seat_id: seatId }
        });

        if (!currentSeat) {
            throw new Error("Data kursi yang akan diubah tidak ditemukan.");
        }

        // 2. Validasi Redundansi: Jika coach_number atau seat_number diubah, pastikan tidak bentrok dengan data lain
        if (coach_number || seat_number) {
            const checkDuplicate = await prisma.seat.findFirst({
                where: {
                    train_id: currentSeat.train_id, // Tetap menggunakan train_id dari data asli kursi ini
                    coach_number: coach_number || currentSeat.coach_number,
                    seat_number: seat_number || currentSeat.seat_number,
                    NOT: {
                        seat_id: seatId // Kecualikan ID kursi ini sendiri saat pengecekan
                    }
                }
            });

            if (checkDuplicate) {
                throw new Error(`Perubahan ditolak! Kombinasi kursi sudah digunakan oleh data lain di kereta ini.`);
            }
        }

        // 3. Eksekusi update
        const updatedSeat = await prisma.seat.update({
            where: { seat_id: seatId },
            data: {
                coach_number,
                seat_number,
                class: seatClass
            }
        });

        return updatedSeat;
    } catch (error) {
        if (error.code === 'P2002') {
            throw new Error("Perubahan gagal! Kombinasi gerbong dan nomor kursi sudah digunakan.");
        }
        throw new Error(error.message);
    }
};

export const deleteSeatService = async (seat_id) => {
    const seatId = parseInt(seat_id);
    if (isNaN(seatId)) {
        throw new Error("ID Kursi tidak valid.");
    }

    try {
        await prisma.seat.delete({
            where: { seat_id: seatId }
        });

        return { message: "Kursi berhasil dihapus." };
    } catch (error) {
        throw new Error(error.message);
    }
};