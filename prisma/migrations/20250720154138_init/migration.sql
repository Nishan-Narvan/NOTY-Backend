-- CreateEnum
CREATE TYPE "NoteStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'TRASH');

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "status" "NoteStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "Note_status_idx" ON "Note"("status");
