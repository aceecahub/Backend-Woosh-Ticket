import { register, login } from "../service/authService.js";

export async function registerController(req, res) {
    try {
        const user = await register(req.body);
        res.status(201).json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export async function loginController(req, res) {
    try {
        const user = await login(req.body);
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}