import {
    createSeatService,
    getAllSeatService,
    getSeatByIdService,
    updateSeatService,
    deleteSeatService
} from "../service/seatService.js";

export const getAllSeatController = async (req, res) => {
    try {
        const seats = await getAllSeatService();
        return res.status(200).json({ message: "Data berhasil ditampilkan", data: seats });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

export const getSeatByIdController = async (req, res) => {
    try {
        const seat = await getSeatByIdService(req.params.id);
        return res.status(200).json({ message: "Data berhasil ditampilkan", data: seat });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

export const createSeatController = async (req, res) => {
    try {
        const seat = await createSeatService(req.body);
        return res.status(200).json({ message: "Data berhasil ditambahkan", data: seat });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

export const updateSeatController = async (req, res) => {
    try {
        const seat = await updateSeatService(req.params.id, req.body);
        return res.status(200).json({ message: "Data berhasil diubah", data: seat });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

export const deleteSeatController = async (req, res) => {
    try {
        const seat = await deleteSeatService(req.params.id);
        return res.status(200).json({ message: "Data berhasil dihapus", data: seat });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}