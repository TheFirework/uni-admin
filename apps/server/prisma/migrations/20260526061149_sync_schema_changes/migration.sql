/*
  Warnings:

  - You are about to drop the column `roles` on the `menus` table. All the data in the column will be lost.
  - You are about to drop the column `permissions` on the `roles` table. All the data in the column will be lost.
  - You are about to drop the column `role_ids` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `dictionary` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `permissions` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[name]` on the table `menus` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `menus` DROP COLUMN `roles`,
    ADD COLUMN `permission` TEXT NULL,
    ALTER COLUMN `updated_at` DROP DEFAULT;

-- AlterTable
ALTER TABLE `roles` DROP COLUMN `permissions`;

-- AlterTable
ALTER TABLE `users` DROP COLUMN `role_ids`;

-- DropTable
DROP TABLE `dictionary`;

-- DropTable
DROP TABLE `permissions`;

-- CreateTable
CREATE TABLE `sys_dict_type` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dict_code` VARCHAR(100) NOT NULL,
    `dict_name` VARCHAR(100) NOT NULL,
    `status` INTEGER NOT NULL DEFAULT 1,
    `is_system` INTEGER NOT NULL DEFAULT 0,
    `remark` TEXT NULL,
    `create_by` VARCHAR(50) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_by` VARCHAR(50) NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `sys_dict_type_dict_code_key`(`dict_code`),
    INDEX `sys_dict_type_dict_code_idx`(`dict_code`),
    INDEX `sys_dict_type_status_idx`(`status`),
    INDEX `sys_dict_type_is_deleted_idx`(`is_deleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sys_dict_data` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dict_code` VARCHAR(100) NOT NULL,
    `dict_label` VARCHAR(100) NOT NULL,
    `dict_value` VARCHAR(255) NOT NULL,
    `tag_type` VARCHAR(20) NULL,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `status` INTEGER NOT NULL DEFAULT 1,
    `remark` TEXT NULL,
    `create_by` VARCHAR(50) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_by` VARCHAR(50) NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `is_deleted` INTEGER NOT NULL DEFAULT 0,

    INDEX `sys_dict_data_dict_code_idx`(`dict_code`),
    INDEX `sys_dict_data_status_idx`(`status`),
    INDEX `sys_dict_data_is_deleted_idx`(`is_deleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `menus_name_key` ON `menus`(`name`);

-- AddForeignKey
ALTER TABLE `sys_dict_data` ADD CONSTRAINT `sys_dict_data_dict_code_fkey` FOREIGN KEY (`dict_code`) REFERENCES `sys_dict_type`(`dict_code`) ON DELETE RESTRICT ON UPDATE CASCADE;
