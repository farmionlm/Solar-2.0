-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "modulePower" REAL NOT NULL,
    "totalKwp" REAL NOT NULL,
    "totalModules" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "ConsumerUnit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monthlyCons" REAL NOT NULL,
    "dailyCons" REAL NOT NULL,
    "requiredKwp" REAL NOT NULL,
    "requiredModules" INTEGER NOT NULL,
    "projectId" TEXT NOT NULL,
    CONSTRAINT "ConsumerUnit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
