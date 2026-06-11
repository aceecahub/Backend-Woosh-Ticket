import prisma from "../config/prisma/client.js";

export const getAllScheduleService = async () => {
    try {
        const schedules = await prisma.schedule.findMany({
            include: {
                train: true,
                departureStation: true,
                arrivalStation: true
            }
        });
        return schedules;
    } catch (error) {
        throw new Error(error.message);
    }
}

export const getScheduleByIdService = async (schedule_id) => {
    const scheduleId = parseInt(schedule_id);
    if (isNaN(scheduleId)) {
        throw new Error("ID Jadwal tidak valid.");
    }
    try {
        const schedule = await prisma.schedule.findUnique({
            where: { schedule_id: scheduleId },
            include: {
                train: true,
                departureStation: true,
                arrivalStation: true
            }
        });
        if (!schedule) {
            throw new Error("Jadwal tidak ditemukan.");
        }
        return schedule;
    } catch (error) {
        throw new Error(error.message);
    }
}

export const createScheduleService = async (data) => {
    const { train_id, departure_station, arrival_station, departure_time, arrival_time, price } = data;

    if (!train_id || !departure_station || !arrival_station || !departure_time || !arrival_time || !price) {
        throw new Error("Semua data jadwal harus diisi.");
    }

    const trainId = parseInt(train_id);
    const departureStationId = parseInt(departure_station);
    const arrivalStationId = parseInt(arrival_station);

    if (isNaN(trainId) || isNaN(departureStationId) || isNaN(arrivalStationId)) {
        throw new Error("ID Kereta atau ID Stasiun tidak valid.");
    }

    if (departureStationId === arrivalStationId) {
        throw new Error("Stasiun asal dan stasiun tujuan tidak boleh sama.");
    }

    try {
        const trainExists = await prisma.train.findUnique({ where: { train_id: trainId } });
        if (!trainExists) throw new Error("Kereta tidak ditemukan.");

        const depStationExists = await prisma.station.findUnique({ where: { station_id: departureStationId } });
        if (!depStationExists) throw new Error("Stasiun keberangkatan tidak ditemukan.");

        const arrStationExists = await prisma.station.findUnique({ where: { station_id: arrivalStationId } });
        if (!arrStationExists) throw new Error("Stasiun kedatangan tidak ditemukan.");

        const schedule = await prisma.schedule.create({
            data: {
                train_id: trainId,
                departure_station: departureStationId,
                arrival_station: arrivalStationId,
                departure_time: new Date(departure_time),
                arrival_time: new Date(arrival_time),
                price: parseFloat(price)
            },
            include: {
                train: true,
                departureStation: true,
                arrivalStation: true
            }
        });

        return schedule;
    } catch (error) {
        throw new Error(error.message);
    }
}

export const updateScheduleService = async (schedule_id, data) => {
    const scheduleId = parseInt(schedule_id);
    if (isNaN(scheduleId)) {
        throw new Error("ID Jadwal tidak valid.");
    }

    try {
        const currentSchedule = await prisma.schedule.findUnique({
            where: { schedule_id: scheduleId }
        });
        if (!currentSchedule) {
            throw new Error("Jadwal tidak ditemukan.");
        }

        const trainId = data.train_id ? parseInt(data.train_id) : currentSchedule.train_id;
        const departureStationId = data.departure_station ? parseInt(data.departure_station) : currentSchedule.departure_station;
        const arrivalStationId = data.arrival_station ? parseInt(data.arrival_station) : currentSchedule.arrival_station;

        if (departureStationId === arrivalStationId) {
            throw new Error("Stasiun asal dan stasiun tujuan tidak boleh sama.");
        }

        if (data.train_id) {
            const trainExists = await prisma.train.findUnique({ where: { train_id: trainId } });
            if (!trainExists) throw new Error("Kereta tidak ditemukan.");
        }
        if (data.departure_station) {
            const depStationExists = await prisma.station.findUnique({ where: { station_id: departureStationId } });
            if (!depStationExists) throw new Error("Stasiun keberangkatan tidak ditemukan.");
        }
        if (data.arrival_station) {
            const arrStationExists = await prisma.station.findUnique({ where: { station_id: arrivalStationId } });
            if (!arrStationExists) throw new Error("Stasiun kedatangan tidak ditemukan.");
        }

        const updatedData = { ...data };
        if (updatedData.train_id) updatedData.train_id = trainId;
        if (updatedData.departure_station) updatedData.departure_station = departureStationId;
        if (updatedData.arrival_station) updatedData.arrival_station = arrivalStationId;
        if (updatedData.departure_time) updatedData.departure_time = new Date(updatedData.departure_time);
        if (updatedData.arrival_time) updatedData.arrival_time = new Date(updatedData.arrival_time);
        if (updatedData.price) updatedData.price = parseFloat(updatedData.price);

        const schedule = await prisma.schedule.update({
            where: { schedule_id: scheduleId },
            data: updatedData,
            include: {
                train: true,
                departureStation: true,
                arrivalStation: true
            }
        });
        return schedule;
    } catch (error) {
        throw new Error(error.message);
    }
}

export const searchScheduleService = async (query) => {
    const { departure_station, arrival_station, date, passengers } = query;

    const where = {};

    if (departure_station) {
        const depId = parseInt(departure_station);
        if (!isNaN(depId)) where.departure_station = depId;
    }

    if (arrival_station) {
        const arrId = parseInt(arrival_station);
        if (!isNaN(arrId)) where.arrival_station = arrId;
    }

    if (date) {
        const startDate = new Date(date);
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 1);
        where.departure_time = { gte: startDate, lt: endDate };
    }

    // Stasiun asal dan tujuan tidak boleh sama
    if (where.departure_station && where.arrival_station && where.departure_station === where.arrival_station) {
        throw new Error("Stasiun asal dan stasiun tujuan tidak boleh sama.");
    }

    try {
        const schedules = await prisma.schedule.findMany({
            where,
            include: {
                train: true,
                departureStation: true,
                arrivalStation: true
            },
            orderBy: { departure_time: "asc" }
        });

        // Jika ada parameter passengers, filter jadwal yang masih punya kursi cukup
        if (passengers) {
            const passengerCount = parseInt(passengers);
            if (!isNaN(passengerCount) && passengerCount > 0) {
                const filtered = [];
                for (const schedule of schedules) {
                    const bookedSeats = await prisma.bookingPassenger.count({
                        where: {
                            booking: {
                                schedule_id: schedule.schedule_id,
                                status: { in: ["pending", "paid"] }
                            }
                        }
                    });
                    const availableSeats = schedule.train.total_seats - bookedSeats;
                    if (availableSeats >= passengerCount) {
                        filtered.push({
                            ...schedule,
                            available_seats: availableSeats
                        });
                    }
                }
                return filtered;
            }
        }

        // Jika tidak filter passengers, tetap hitung available_seats
        const result = await Promise.all(
            schedules.map(async (schedule) => {
                const bookedSeats = await prisma.bookingPassenger.count({
                    where: {
                        booking: {
                            schedule_id: schedule.schedule_id,
                            status: { in: ["pending", "paid"] }
                        }
                    }
                });
                return {
                    ...schedule,
                    available_seats: schedule.train.total_seats - bookedSeats
                };
            })
        );

        return result;
    } catch (error) {
        throw new Error(error.message);
    }
};

export const deleteScheduleService = async (schedule_id) => {
    const scheduleId = parseInt(schedule_id);
    if (isNaN(scheduleId)) {
        throw new Error("ID Jadwal tidak valid.");
    }
    try {
        const schedule = await prisma.schedule.findUnique({
            where: { schedule_id: scheduleId }
        });
        if (!schedule) {
            throw new Error("Jadwal tidak ditemukan.");
        }
        await prisma.schedule.delete({
            where: { schedule_id: scheduleId }
        });
        return schedule;
    } catch (error) {
        throw new Error(error.message);
    }
}