-- CreateTable
CREATE TABLE "CoinList" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "CoinPlatform" (
    "coinId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "CoinMarketInfo" (
    "coinId" TEXT NOT NULL,
    "fdv" BIGINT,
    "price" JSONB NOT NULL,
    "marketCap" JSONB NOT NULL,
    "supply" JSONB NOT NULL,
    "allTimeHigh" JSONB NOT NULL,
    "allTimeLow" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "ChatIntent" (
    "hash" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "MesageResponse" (
    "hash" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "risk" JSONB,
    "insight" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "MessageResponseChat" (
    "hash" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "CoinList_id_key" ON "CoinList"("id");

-- CreateIndex
CREATE INDEX "CoinList_name_symbol_idx" ON "CoinList"("name", "symbol");

-- CreateIndex
CREATE INDEX "CoinPlatform_name_address_idx" ON "CoinPlatform"("name", "address");

-- CreateIndex
CREATE UNIQUE INDEX "CoinPlatform_coinId_name_address_key" ON "CoinPlatform"("coinId", "name", "address");

-- CreateIndex
CREATE UNIQUE INDEX "CoinMarketInfo_coinId_key" ON "CoinMarketInfo"("coinId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatIntent_hash_key" ON "ChatIntent"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "MesageResponse_hash_key" ON "MesageResponse"("hash");

-- CreateIndex
CREATE INDEX "MesageResponse_marketId_idx" ON "MesageResponse"("marketId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageResponseChat_hash_key" ON "MessageResponseChat"("hash");

-- AddForeignKey
ALTER TABLE "CoinPlatform" ADD CONSTRAINT "CoinPlatform_coinId_fkey" FOREIGN KEY ("coinId") REFERENCES "CoinList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MesageResponse" ADD CONSTRAINT "MesageResponse_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "CoinMarketInfo"("coinId") ON DELETE RESTRICT ON UPDATE CASCADE;
