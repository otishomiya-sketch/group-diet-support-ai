-- CreateTable
CREATE TABLE "SalonReservation" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "customerUserId" TEXT NOT NULL,
    "menuName" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "SalonReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalonTicket" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "customerUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalSessions" INTEGER,
    "remainingSessions" INTEGER,
    "totalAmount" INTEGER,
    "remainingAmount" INTEGER,
    "pricePerSession" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "SalonTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalonTicketConsumption" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "reservationId" TEXT,
    "sessionsUsed" INTEGER NOT NULL DEFAULT 0,
    "amountUsed" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalonTicketConsumption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalonReservation_salonId_scheduledAt_idx" ON "SalonReservation"("salonId", "scheduledAt");

-- CreateIndex
CREATE INDEX "SalonReservation_customerUserId_scheduledAt_idx" ON "SalonReservation"("customerUserId", "scheduledAt");

-- CreateIndex
CREATE INDEX "SalonTicket_salonId_customerUserId_status_idx" ON "SalonTicket"("salonId", "customerUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SalonTicketConsumption_reservationId_key" ON "SalonTicketConsumption"("reservationId");

-- CreateIndex
CREATE INDEX "SalonTicketConsumption_ticketId_idx" ON "SalonTicketConsumption"("ticketId");

-- AddForeignKey
ALTER TABLE "SalonReservation" ADD CONSTRAINT "SalonReservation_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalonTicket" ADD CONSTRAINT "SalonTicket_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalonTicketConsumption" ADD CONSTRAINT "SalonTicketConsumption_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SalonTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalonTicketConsumption" ADD CONSTRAINT "SalonTicketConsumption_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "SalonReservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
