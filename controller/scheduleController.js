import {
    getAllScheduleService,
    getScheduleByIdService,
    createScheduleService,
    updateScheduleService,
    deleteScheduleService,
    searchScheduleService
} from "../service/scheduleService.js";

export const getAllScheduleController = async (req, res) => {
    try {
        const schedules = await getAllScheduleService();
        return res.status(200).json({ message: "Data jadwal berhasil ditampilkan", data: schedules });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const getScheduleByIdController = async (req, res) => {
    try {
        const schedule = await getScheduleByIdService(req.params.id);
        return res.status(200).json({ message: "Data jadwal berhasil ditampilkan", data: schedule });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const createScheduleController = async (req, res) => {
    try {
        const schedule = await createScheduleService(req.body);
        return res.status(201).json({ message: "Jadwal berhasil ditambahkan", data: schedule });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const updateScheduleController = async (req, res) => {
    try {
        const schedule = await updateScheduleService(req.params.id, req.body);
        return res.status(200).json({ message: "Jadwal berhasil diubah", data: schedule });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const deleteScheduleController = async (req, res) => {
    try {
        const schedule = await deleteScheduleService(req.params.id);
        return res.status(200).json({ message: "Jadwal berhasil dihapus", data: schedule });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const searchScheduleController = async (req, res) => {
    try {
        const schedules = await searchScheduleService(req.query);
        return res.status(200).json({ message: "Hasil pencarian jadwal", data: schedules });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
