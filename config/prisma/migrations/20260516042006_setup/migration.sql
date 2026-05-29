-- CreateTable
CREATE TABLE `users` (
    `user_id` INTEGER NOT NULL AUTO_INCREMENT,
    `full_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` ENUM('customer', 'admin') NOT NULL DEFAULT 'customer',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_phone_key`(`phone`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stations` (
    `station_id` INTEGER NOT NULL AUTO_INCREMENT,
    `station_name` VARCHAR(100) NOT NULL,
    `city` VARCHAR(100) NULL,
    `code` VARCHAR(10) NULL,

    UNIQUE INDEX `stations_code_key`(`code`),
    PRIMARY KEY (`station_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trains` (
    `train_id` INTEGER NOT NULL AUTO_INCREMENT,
    `train_name` VARCHAR(100) NOT NULL,
    `train_code` VARCHAR(20) NULL,
    `total_seats` INTEGER NOT NULL DEFAULT 600,

    UNIQUE INDEX `trains_train_code_key`(`train_code`),
    PRIMARY KEY (`train_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `schedules` (
    `schedule_id` INTEGER NOT NULL AUTO_INCREMENT,
    `train_id` INTEGER NULL,
    `departure_station` INTEGER NULL,
    `arrival_station` INTEGER NULL,
    `departure_time` DATETIME(3) NULL,
    `arrival_time` DATETIME(3) NULL,
    `price` DECIMAL(12, 2) NULL,

    PRIMARY KEY (`schedule_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `seats` (
    `seat_id` INTEGER NOT NULL AUTO_INCREMENT,
    `train_id` INTEGER NULL,
    `seat_number` VARCHAR(10) NULL,
    `class` ENUM('economy', 'business', 'vip') NOT NULL DEFAULT 'economy',

    PRIMARY KEY (`seat_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bookings` (
    `booking_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `schedule_id` INTEGER NULL,
    `booking_code` VARCHAR(20) NULL,
    `booking_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `total_price` DECIMAL(12, 2) NULL,
    `status` ENUM('pending', 'paid', 'cancelled', 'completed') NOT NULL DEFAULT 'pending',

    UNIQUE INDEX `bookings_booking_code_key`(`booking_code`),
    PRIMARY KEY (`booking_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking_passengers` (
    `passenger_id` INTEGER NOT NULL AUTO_INCREMENT,
    `booking_id` INTEGER NULL,
    `full_name` VARCHAR(100) NULL,
    `id_number` VARCHAR(30) NULL,
    `seat_id` INTEGER NULL,

    PRIMARY KEY (`passenger_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `payment_id` INTEGER NOT NULL AUTO_INCREMENT,
    `booking_id` INTEGER NULL,
    `payment_method` ENUM('bank_transfer', 'ewallet', 'credit_card') NULL,
    `payment_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `amount` DECIMAL(12, 2) NULL,
    `payment_status` ENUM('pending', 'success', 'failed') NOT NULL DEFAULT 'pending',

    PRIMARY KEY (`payment_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tickets` (
    `ticket_id` INTEGER NOT NULL AUTO_INCREMENT,
    `booking_id` INTEGER NULL,
    `qr_code` VARCHAR(255) NULL,
    `issued_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`ticket_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `schedules` ADD CONSTRAINT `schedules_train_id_fkey` FOREIGN KEY (`train_id`) REFERENCES `trains`(`train_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `schedules` ADD CONSTRAINT `schedules_departure_station_fkey` FOREIGN KEY (`departure_station`) REFERENCES `stations`(`station_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `schedules` ADD CONSTRAINT `schedules_arrival_station_fkey` FOREIGN KEY (`arrival_station`) REFERENCES `stations`(`station_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `seats` ADD CONSTRAINT `seats_train_id_fkey` FOREIGN KEY (`train_id`) REFERENCES `trains`(`train_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_schedule_id_fkey` FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`schedule_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_passengers` ADD CONSTRAINT `booking_passengers_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`booking_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_passengers` ADD CONSTRAINT `booking_passengers_seat_id_fkey` FOREIGN KEY (`seat_id`) REFERENCES `seats`(`seat_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`booking_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`booking_id`) ON DELETE SET NULL ON UPDATE CASCADE;
