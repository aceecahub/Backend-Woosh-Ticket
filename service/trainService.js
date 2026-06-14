import prisma from "../config/prisma/client.js";

export const getAllTrainService = async () => {
    try {
        const trains = await prisma.train.findMany();
        return trains;
    } catch (error) {
        throw new Error(error.message);
    }
}

export const getTrainByIdService = async (train_id) => {
    const trainId = parseInt(train_id);
    if (isNaN(trainId)) {
        throw new Error("ID Kereta tidak valid.");
    }
    try {
        const train = await prisma.train.findUnique({
            where: { train_id: trainId }
        });
        if (!train) {
            throw new Error("Kereta tidak ditemukan.");
        }
        return train;
    } catch (error) {
        throw new Error(error.message);
    }
}

export const createTrainService = async (data) => {
    const { train_name, train_code, total_seats } = data;
    
    if (!train_name || !train_code) {
        throw new Error("Nama kereta dan kode kereta harus diisi.");
    }
    
    try {
        const existingTrain = await prisma.train.findUnique({
            where: { train_code: train_code },
        });

        if (existingTrain) {
            throw new Error("Kode Kereta sudah ada di database.");
        }

        const train = await prisma.$transaction(async (tx) => {
            const newTrain = await tx.train.create({
                data: {
                    train_name,
                    train_code,
                    total_seats: total_seats ? parseInt(total_seats) : 400,
                },
            });

            // Auto-generate seats for this train (8 coaches, 10 rows, 5 seats per row)
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
                            train_id: newTrain.train_id,
                            coach_number: `Coach ${coach}`,
                            seat_number: `${row.toString().padStart(2, '0')}${letter}`,
                            class: seatClass
                        });
                    }
                }
            }

            await tx.seat.createMany({
                data: seatsData
            });

            return newTrain;
        });

        return train;
    } catch (error) {
        throw new Error(error.message);
    }
}

export const updateTrainService = async (train_id, data) => {
    const trainId = parseInt(train_id);
    if (isNaN(trainId)) {
        throw new Error("ID Kereta tidak valid.");
    }

    const { train_code } = data;
    try {
        if (train_code) {
            const existingTrain = await prisma.train.findUnique({
                where: { train_code: train_code },
            });
            
            if (existingTrain && existingTrain.train_id !== trainId) {
                throw new Error("Kode Kereta sudah digunakan oleh kereta lain.");
            }
        }
        
        if (data.total_seats) {
            data.total_seats = parseInt(data.total_seats);
        }

        const train = await prisma.train.update({
            where: { train_id: trainId },
            data: data,
        });
        return train;
    } catch (error) {
        throw new Error(error.message);
    }
}

export const deleteTrainService = async (train_id) => {
    const trainId = parseInt(train_id);
    if (isNaN(trainId)) {
        throw new Error("ID Kereta tidak valid.");
    }
    try {
        const train = await prisma.train.findUnique({
            where: { train_id: trainId }
        });
        if (!train) {
            throw new Error("Kereta tidak ditemukan.");
        }
        
        await prisma.train.delete({
            where: { train_id: trainId }
        });
        return train;
    } catch (error) {
        throw new Error(error.message);
    }
}