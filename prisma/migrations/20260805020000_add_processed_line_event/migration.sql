CREATE TABLE "ProcessedLineEvent" (
    "id" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedLineEvent_pkey" PRIMARY KEY ("id")
);
