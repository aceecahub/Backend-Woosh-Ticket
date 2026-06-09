import {
    createStationService,
    getAllStationService,
    getStationByIdService,
    updateStationService,
    deleteStationService
} from "../service/stationService.js";

export const getAllStationController = async (req, res) => {
    try {
        const stations = await getAllStationService();
        return res.status(200).json({ message: "Data berhasil ditampilkan", data: stations });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

export const getStationByIdController = async (req, res) => {
    try {
        const station = await getStationByIdService(req.params.id);
        return res.status(200).json({ message: "Data berhasil ditampilkan", data: station });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

export const createStationController = async (req, res) => {
    try {
        const station = await createStationService(req.body);
        return res.status(200).json({ message: "Data berhasil ditambahkan", data: station });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

export const updateStationController = async (req, res) => {
    try {
        const station = await updateStationService(req.params.id, req.body);
        return res.status(200).json({ message: "Data berhasil diubah", data: station });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

export const deleteStationController = async (req, res) => {
    try {
        const station = await deleteStationService(req.params.id);
        return res.status(200).json({ message: "Data berhasil dihapus", data: station });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}
