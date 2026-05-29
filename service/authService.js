import prisma from "../config/prisma/client.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export async function register(data) {
    const { full_name, email, phone, password } = data;

    const existingUser = await prisma.user.findUnique({
        where: { email },
    });
    if (existingUser) {
        throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
        data: {
            full_name,
            email,
            phone,
            password: hashedPassword,
        },
    });
    return user;
}

export async function login(data) {
    const { email, password } = data;
    const user = await prisma.user.findUnique({
        where: {
            email,
        },
    });
    if (!user) {
        throw new Error("Email or Password Invalid!");
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new Error("Email or Password Invalid!");
    }

    const token = jwt.sign({ id: user.user_id }, process.env.JWT_SECRET, {
        expiresIn: "1d",
    });
    return {
        user,
        token,
    };
}
