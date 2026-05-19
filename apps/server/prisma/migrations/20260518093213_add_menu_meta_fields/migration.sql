/*
  Warnings:

  - Added the required column `updated_at` to the `menus` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `menus` ADD COLUMN `affix` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `external_link` VARCHAR(500) NULL,
    ADD COLUMN `hidden` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `no_cache` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `redirect` VARCHAR(255) NULL,
    ADD COLUMN `roles` TEXT NULL,
    ADD COLUMN `route_name` VARCHAR(100) NULL,
    ADD COLUMN `title` VARCHAR(100) NULL,
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `name` VARCHAR(100) NOT NULL,
    MODIFY `icon` VARCHAR(100) NULL;

-- AddForeignKey
ALTER TABLE `menus` ADD CONSTRAINT `menus_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `menus`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
