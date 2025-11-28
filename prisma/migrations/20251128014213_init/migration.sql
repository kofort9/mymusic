-- CreateTable
CREATE TABLE "Track" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spotifyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "album" TEXT NOT NULL,
    "camelotKey" TEXT NOT NULL,
    "key" INTEGER NOT NULL,
    "mode" INTEGER NOT NULL,
    "bpm" REAL NOT NULL,
    "energy" REAL NOT NULL,
    "valence" REAL NOT NULL,
    "danceability" REAL NOT NULL,
    "acousticness" REAL NOT NULL,
    "instrumentalness" REAL NOT NULL,
    "liveness" REAL NOT NULL,
    "speechiness" REAL NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "timeSignature" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Track_spotifyId_key" ON "Track"("spotifyId");
