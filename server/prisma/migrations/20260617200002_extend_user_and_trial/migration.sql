/*
  Warnings:

  - You are about to drop the column `net` on the `Trial` table. All the data in the column will be lost.
  - Added the required column `results` to the `Trial` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalNet` to the `Trial` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN "grade" TEXT;
ALTER TABLE "User" ADD COLUMN "parentName" TEXT;
ALTER TABLE "User" ADD COLUMN "parentTel" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Trial" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "results" TEXT NOT NULL,
    "totalNet" REAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Trial_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Trial" ("createdAt", "id", "name", "studentId") SELECT "createdAt", "id", "name", "studentId" FROM "Trial";
DROP TABLE "Trial";
ALTER TABLE "new_Trial" RENAME TO "Trial";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
