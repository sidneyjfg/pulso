-- AlterTable
ALTER TABLE `Sale`
  ADD COLUMN `saleNumber` INTEGER NOT NULL AUTO_INCREMENT,
  ADD UNIQUE INDEX `Sale_saleNumber_key`(`saleNumber`);
