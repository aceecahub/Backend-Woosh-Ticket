import prisma from "../config/prisma/client.js"

export const getAllStationService = async () => {
    const stations = await prisma.station.findMany();
    return stations;
}

export const getStationByIdService = async (station_id) => {
    const stationId = parseInt(station_id);
    if (isNaN(stationId)) {
        throw new Error("ID Stasiun tidak valid.");
    }
    try {
        const station = await prisma.station.findUnique({
            where: { station_id: stationId }
        });
        if (!station) {
            throw new Error("Stasiun tidak ditemukan.");
        }
        return station;
    } catch (error) {
        throw new Error(error.message);
    }
}

export const createStationService = async (data) => {
    const { station_name, city, code } = data;
    if (!station_name || !city || !code) {
        throw new Error("Semua data station harus diisi.");
    }
    try {
        const existingStation = await prisma.station.findUnique({
            where: { code: code },
        });

        if (existingStation) {
            throw new Error("Kode Stasiun sudah ada di database.");
        }

        const station = await prisma.station.create({
            data: {
                station_name,
                city,
                code,
            },
        });

        return station;
    } catch (error) {
        throw new Error(error.message);
    }
}

export const updateStationService = async (station_id, data) => {
    const stationId = parseInt(station_id);
    if (isNaN(stationId)) {
        throw new Error("ID Stasiun tidak valid.");
    }
    const { code } = data;
    try {
        const existingStation = await prisma.station.findUnique({
            where: { code: code },
        });
        if (existingStation) {
            throw new Error("Kode Stasiun sudah ada di database.");
        }
        
        const station = await prisma.station.update({
            where: { station_id: stationId },
            data: data,
        });
        return station;
    } catch (error) {
        throw new Error(error.message);
    }
}

export const deleteStationService = async (station_id) => {
    const stationId = parseInt(station_id);
    if (isNaN(stationId)) {
        throw new Error("ID Stasiun tidak valid.");
    }
    try {
        const station = await prisma.station.findUnique({
            where: { station_id: stationId }
        });
        if (!station) {
            throw new Error("Stasiun tidak ditemukan.");
        }
        await prisma.station.delete({
            where: { station_id: stationId }
        });
        return station;
    } catch (error) {
        throw new Error(error.message);
    }
}
