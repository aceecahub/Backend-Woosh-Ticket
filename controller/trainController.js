import {
    createTrainService,
    getAllTrainService,
    getTrainByIdService,
    updateTrainService,
    deleteTrainService
} from "../service/trainService.js";

export const getAllTrainController = async (req, res) => {
    try {
        const trains = await getAllTrainService();
        return res.status(200).json({ message: "Data berhasil ditampilkan", data: trains });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

export const getTrainByIdController = async (req, res) => {
    try {
        const train = await getTrainByIdService(req.params.id);
        return res.status(200).json({ message: "Data berhasil ditampilkan", data: train });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

export const createTrainController = async (req, res) => {
    try {
        const train = await createTrainService(req.body);
        return res.status(200).json({ message: "Data berhasil ditambahkan", data: train });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

export const updateTrainController = async (req, res) => {
    try {
        const train = await updateTrainService(req.params.id, req.body);
        return res.status(200).json({ message: "Data berhasil diubah", data: train });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

export const deleteTrainController = async (req, res) => {
    try {
        const train = await deleteTrainService(req.params.id);
        return res.status(200).json({ message: "Data berhasil dihapus", data: train });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}