import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: "Akses ditolak. Token tidak ditemukan." });
    }

    // Format: "Bearer <token>"
    const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : authHeader;

    if (!token) {
        return res.status(401).json({ message: "Akses ditolak. Token tidak ditemukan." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: decoded.id };
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Token sudah kadaluarsa. Silakan login ulang." });
        }
        return res.status(401).json({ message: "Token tidak valid." });
    }
};
