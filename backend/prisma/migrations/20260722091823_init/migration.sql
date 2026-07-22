-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'STEWARD', 'ANALYST', 'VIEWER');

-- CreateEnum
CREATE TYPE "DatasetStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED', 'FAILED');

-- CreateEnum
CREATE TYPE "DatasetSourceType" AS ENUM ('MANUAL_UPLOAD', 'FILE_IMPORT', 'DATABASE_SYNC', 'API_SYNC', 'STREAM_SYNC');

-- CreateEnum
CREATE TYPE "StorageProvider" AS ENUM ('LOCAL', 'S3', 'GCS', 'AZURE_BLOB', 'OTHER');

-- CreateEnum
CREATE TYPE "FileFormat" AS ENUM ('CSV', 'JSON', 'XLSX', 'PARQUET', 'AVRO', 'XML', 'TXT', 'OTHER');

-- CreateEnum
CREATE TYPE "IngestionStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "BusinessCriticality" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "MetadataScope" AS ENUM ('DATASET', 'VERSION', 'COLUMN');

-- CreateEnum
CREATE TYPE "MetadataValueType" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'DATETIME', 'JSON');

-- CreateEnum
CREATE TYPE "MetadataSource" AS ENUM ('MANUAL', 'SYSTEM', 'IMPORTED', 'INFERRED');

-- CreateEnum
CREATE TYPE "ClassificationScope" AS ENUM ('DATASET', 'VERSION', 'COLUMN');

-- CreateEnum
CREATE TYPE "ClassificationSource" AS ENUM ('MANUAL', 'RULE_BASED', 'ML_INFERRED', 'IMPORTED');

-- CreateEnum
CREATE TYPE "ClassificationLevel" AS ENUM ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "QualityRuleScope" AS ENUM ('DATASET', 'COLUMN', 'BOTH');

-- CreateEnum
CREATE TYPE "QualityCategory" AS ENUM ('COMPLETENESS', 'VALIDITY', 'UNIQUENESS', 'CONSISTENCY', 'FRESHNESS', 'CONFORMITY');

-- CreateEnum
CREATE TYPE "QualityIssueStatus" AS ENUM ('PASS', 'FAIL', 'WARN');

-- CreateEnum
CREATE TYPE "QualityRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "QualitySeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "DataConsumerType" AS ENUM ('HUMAN', 'APPLICATION', 'SERVICE', 'DASHBOARD', 'PIPELINE');

-- CreateEnum
CREATE TYPE "UsageEventType" AS ENUM ('VIEW', 'QUERY', 'DOWNLOAD', 'EXPORT', 'REFRESH', 'API_CALL', 'SHARE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dataset" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "businessDomain" TEXT,
    "sourceSystem" TEXT,
    "sourceType" "DatasetSourceType" NOT NULL DEFAULT 'MANUAL_UPLOAD',
    "status" "DatasetStatus" NOT NULL DEFAULT 'DRAFT',
    "criticality" "BusinessCriticality" NOT NULL DEFAULT 'MEDIUM',
    "ownerUserId" TEXT NOT NULL,
    "stewardUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Dataset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatasetVersion" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "storageProvider" "StorageProvider" NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileFormat" "FileFormat" NOT NULL,
    "mimeType" TEXT,
    "fileSizeBytes" BIGINT NOT NULL,
    "checksum" TEXT,
    "rowCount" BIGINT,
    "columnCount" INTEGER,
    "ingestionStatus" "IngestionStatus" NOT NULL DEFAULT 'RECEIVED',
    "processedAt" TIMESTAMP(3),
    "uploadedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatasetVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatasetColumn" (
    "id" TEXT NOT NULL,
    "datasetVersionId" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "isNullable" BOOLEAN NOT NULL DEFAULT true,
    "isPrimaryKey" BOOLEAN NOT NULL DEFAULT false,
    "isUnique" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "profileJson" JSONB,
    "profiledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatasetColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetadataEntry" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "datasetVersionId" TEXT,
    "datasetColumnId" TEXT,
    "scope" "MetadataScope" NOT NULL,
    "key" TEXT NOT NULL,
    "valueType" "MetadataValueType" NOT NULL,
    "valueText" TEXT,
    "valueNumber" DECIMAL(65,30),
    "valueBoolean" BOOLEAN,
    "valueDateTime" TIMESTAMP(3),
    "valueJson" JSONB,
    "source" "MetadataSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetadataEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatasetTag" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DatasetTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassificationLabel" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "level" "ClassificationLevel" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassificationLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassificationAssignment" (
    "id" TEXT NOT NULL,
    "classificationLabelId" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "datasetVersionId" TEXT,
    "datasetColumnId" TEXT,
    "scope" "ClassificationScope" NOT NULL,
    "source" "ClassificationSource" NOT NULL DEFAULT 'MANUAL',
    "confidence" DECIMAL(65,30),
    "rationale" TEXT,
    "appliedByUserId" TEXT,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassificationAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityRule" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scope" "QualityRuleScope" NOT NULL,
    "category" "QualityCategory" NOT NULL,
    "severity" "QualitySeverity" NOT NULL DEFAULT 'MEDIUM',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "configJson" JSONB,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QualityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityRun" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "datasetVersionId" TEXT NOT NULL,
    "status" "QualityRunStatus" NOT NULL DEFAULT 'QUEUED',
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "totalChecks" INTEGER NOT NULL DEFAULT 0,
    "passedChecks" INTEGER NOT NULL DEFAULT 0,
    "failedChecks" INTEGER NOT NULL DEFAULT 0,
    "warningChecks" INTEGER NOT NULL DEFAULT 0,
    "qualityScore" DECIMAL(65,30),
    "notes" TEXT,
    "executedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QualityRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityIssue" (
    "id" TEXT NOT NULL,
    "qualityRunId" TEXT NOT NULL,
    "qualityRuleId" TEXT NOT NULL,
    "datasetColumnId" TEXT,
    "status" "QualityIssueStatus" NOT NULL,
    "severity" "QualitySeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "observedValue" TEXT,
    "expectedValue" TEXT,
    "affectedRows" BIGINT,
    "detailsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QualityIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustScoreSnapshot" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "datasetVersionId" TEXT NOT NULL,
    "overallScore" DECIMAL(65,30) NOT NULL,
    "qualityScore" DECIMAL(65,30) NOT NULL,
    "completenessScore" DECIMAL(65,30) NOT NULL,
    "freshnessScore" DECIMAL(65,30) NOT NULL,
    "usageScore" DECIMAL(65,30) NOT NULL,
    "classificationScore" DECIMAL(65,30) NOT NULL,
    "formulaVersion" TEXT NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrustScoreSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataValueSnapshot" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "datasetVersionId" TEXT NOT NULL,
    "overallScore" DECIMAL(65,30) NOT NULL,
    "businessCriticalityScore" DECIMAL(65,30) NOT NULL,
    "qualityScore" DECIMAL(65,30) NOT NULL,
    "freshnessScore" DECIMAL(65,30) NOT NULL,
    "usageScore" DECIMAL(65,30) NOT NULL,
    "formulaVersion" TEXT NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataValueSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataConsumer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DataConsumerType" NOT NULL,
    "externalId" TEXT,
    "description" TEXT,
    "ownerUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataConsumer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageEvent" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "datasetVersionId" TEXT,
    "consumerId" TEXT NOT NULL,
    "performedByUserId" TEXT,
    "eventType" "UsageEventType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rowsRead" BIGINT,
    "bytesRead" BIGINT,
    "durationMs" INTEGER,
    "queryFingerprint" TEXT,
    "queryText" TEXT,
    "eventJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Dataset_slug_key" ON "Dataset"("slug");

-- CreateIndex
CREATE INDEX "Dataset_name_idx" ON "Dataset"("name");

-- CreateIndex
CREATE INDEX "Dataset_businessDomain_idx" ON "Dataset"("businessDomain");

-- CreateIndex
CREATE INDEX "Dataset_sourceType_idx" ON "Dataset"("sourceType");

-- CreateIndex
CREATE INDEX "Dataset_status_idx" ON "Dataset"("status");

-- CreateIndex
CREATE INDEX "Dataset_criticality_idx" ON "Dataset"("criticality");

-- CreateIndex
CREATE INDEX "DatasetVersion_datasetId_createdAt_idx" ON "DatasetVersion"("datasetId", "createdAt");

-- CreateIndex
CREATE INDEX "DatasetVersion_datasetId_ingestionStatus_idx" ON "DatasetVersion"("datasetId", "ingestionStatus");

-- CreateIndex
CREATE UNIQUE INDEX "DatasetVersion_datasetId_versionNumber_key" ON "DatasetVersion"("datasetId", "versionNumber");

-- CreateIndex
CREATE INDEX "DatasetColumn_datasetVersionId_name_idx" ON "DatasetColumn"("datasetVersionId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "DatasetColumn_datasetVersionId_ordinal_key" ON "DatasetColumn"("datasetVersionId", "ordinal");

-- CreateIndex
CREATE UNIQUE INDEX "DatasetColumn_datasetVersionId_normalizedName_key" ON "DatasetColumn"("datasetVersionId", "normalizedName");

-- CreateIndex
CREATE INDEX "MetadataEntry_datasetId_scope_key_idx" ON "MetadataEntry"("datasetId", "scope", "key");

-- CreateIndex
CREATE INDEX "MetadataEntry_datasetVersionId_idx" ON "MetadataEntry"("datasetVersionId");

-- CreateIndex
CREATE INDEX "MetadataEntry_datasetColumnId_idx" ON "MetadataEntry"("datasetColumnId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE INDEX "DatasetTag_tagId_idx" ON "DatasetTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "DatasetTag_datasetId_tagId_key" ON "DatasetTag"("datasetId", "tagId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassificationLabel_code_key" ON "ClassificationLabel"("code");

-- CreateIndex
CREATE INDEX "ClassificationAssignment_datasetId_scope_idx" ON "ClassificationAssignment"("datasetId", "scope");

-- CreateIndex
CREATE INDEX "ClassificationAssignment_classificationLabelId_idx" ON "ClassificationAssignment"("classificationLabelId");

-- CreateIndex
CREATE INDEX "ClassificationAssignment_datasetVersionId_idx" ON "ClassificationAssignment"("datasetVersionId");

-- CreateIndex
CREATE INDEX "ClassificationAssignment_datasetColumnId_idx" ON "ClassificationAssignment"("datasetColumnId");

-- CreateIndex
CREATE UNIQUE INDEX "QualityRule_code_key" ON "QualityRule"("code");

-- CreateIndex
CREATE INDEX "QualityRule_scope_idx" ON "QualityRule"("scope");

-- CreateIndex
CREATE INDEX "QualityRule_category_idx" ON "QualityRule"("category");

-- CreateIndex
CREATE INDEX "QualityRule_isActive_idx" ON "QualityRule"("isActive");

-- CreateIndex
CREATE INDEX "QualityRun_datasetId_createdAt_idx" ON "QualityRun"("datasetId", "createdAt");

-- CreateIndex
CREATE INDEX "QualityRun_datasetVersionId_createdAt_idx" ON "QualityRun"("datasetVersionId", "createdAt");

-- CreateIndex
CREATE INDEX "QualityRun_status_idx" ON "QualityRun"("status");

-- CreateIndex
CREATE INDEX "QualityIssue_qualityRunId_idx" ON "QualityIssue"("qualityRunId");

-- CreateIndex
CREATE INDEX "QualityIssue_qualityRuleId_idx" ON "QualityIssue"("qualityRuleId");

-- CreateIndex
CREATE INDEX "QualityIssue_datasetColumnId_idx" ON "QualityIssue"("datasetColumnId");

-- CreateIndex
CREATE INDEX "QualityIssue_status_idx" ON "QualityIssue"("status");

-- CreateIndex
CREATE INDEX "QualityIssue_severity_idx" ON "QualityIssue"("severity");

-- CreateIndex
CREATE INDEX "TrustScoreSnapshot_datasetId_calculatedAt_idx" ON "TrustScoreSnapshot"("datasetId", "calculatedAt");

-- CreateIndex
CREATE INDEX "TrustScoreSnapshot_datasetVersionId_calculatedAt_idx" ON "TrustScoreSnapshot"("datasetVersionId", "calculatedAt");

-- CreateIndex
CREATE INDEX "DataValueSnapshot_datasetId_calculatedAt_idx" ON "DataValueSnapshot"("datasetId", "calculatedAt");

-- CreateIndex
CREATE INDEX "DataValueSnapshot_datasetVersionId_calculatedAt_idx" ON "DataValueSnapshot"("datasetVersionId", "calculatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DataConsumer_externalId_key" ON "DataConsumer"("externalId");

-- CreateIndex
CREATE INDEX "DataConsumer_type_idx" ON "DataConsumer"("type");

-- CreateIndex
CREATE INDEX "DataConsumer_name_idx" ON "DataConsumer"("name");

-- CreateIndex
CREATE INDEX "UsageEvent_datasetId_occurredAt_idx" ON "UsageEvent"("datasetId", "occurredAt");

-- CreateIndex
CREATE INDEX "UsageEvent_datasetVersionId_occurredAt_idx" ON "UsageEvent"("datasetVersionId", "occurredAt");

-- CreateIndex
CREATE INDEX "UsageEvent_consumerId_occurredAt_idx" ON "UsageEvent"("consumerId", "occurredAt");

-- CreateIndex
CREATE INDEX "UsageEvent_eventType_occurredAt_idx" ON "UsageEvent"("eventType", "occurredAt");

-- AddForeignKey
ALTER TABLE "Dataset" ADD CONSTRAINT "Dataset_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dataset" ADD CONSTRAINT "Dataset_stewardUserId_fkey" FOREIGN KEY ("stewardUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetVersion" ADD CONSTRAINT "DatasetVersion_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetVersion" ADD CONSTRAINT "DatasetVersion_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetColumn" ADD CONSTRAINT "DatasetColumn_datasetVersionId_fkey" FOREIGN KEY ("datasetVersionId") REFERENCES "DatasetVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetadataEntry" ADD CONSTRAINT "MetadataEntry_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetadataEntry" ADD CONSTRAINT "MetadataEntry_datasetVersionId_fkey" FOREIGN KEY ("datasetVersionId") REFERENCES "DatasetVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetadataEntry" ADD CONSTRAINT "MetadataEntry_datasetColumnId_fkey" FOREIGN KEY ("datasetColumnId") REFERENCES "DatasetColumn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetTag" ADD CONSTRAINT "DatasetTag_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetTag" ADD CONSTRAINT "DatasetTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassificationAssignment" ADD CONSTRAINT "ClassificationAssignment_classificationLabelId_fkey" FOREIGN KEY ("classificationLabelId") REFERENCES "ClassificationLabel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassificationAssignment" ADD CONSTRAINT "ClassificationAssignment_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassificationAssignment" ADD CONSTRAINT "ClassificationAssignment_datasetVersionId_fkey" FOREIGN KEY ("datasetVersionId") REFERENCES "DatasetVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassificationAssignment" ADD CONSTRAINT "ClassificationAssignment_datasetColumnId_fkey" FOREIGN KEY ("datasetColumnId") REFERENCES "DatasetColumn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassificationAssignment" ADD CONSTRAINT "ClassificationAssignment_appliedByUserId_fkey" FOREIGN KEY ("appliedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityRule" ADD CONSTRAINT "QualityRule_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityRun" ADD CONSTRAINT "QualityRun_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityRun" ADD CONSTRAINT "QualityRun_datasetVersionId_fkey" FOREIGN KEY ("datasetVersionId") REFERENCES "DatasetVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityRun" ADD CONSTRAINT "QualityRun_executedByUserId_fkey" FOREIGN KEY ("executedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityIssue" ADD CONSTRAINT "QualityIssue_qualityRunId_fkey" FOREIGN KEY ("qualityRunId") REFERENCES "QualityRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityIssue" ADD CONSTRAINT "QualityIssue_qualityRuleId_fkey" FOREIGN KEY ("qualityRuleId") REFERENCES "QualityRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityIssue" ADD CONSTRAINT "QualityIssue_datasetColumnId_fkey" FOREIGN KEY ("datasetColumnId") REFERENCES "DatasetColumn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustScoreSnapshot" ADD CONSTRAINT "TrustScoreSnapshot_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustScoreSnapshot" ADD CONSTRAINT "TrustScoreSnapshot_datasetVersionId_fkey" FOREIGN KEY ("datasetVersionId") REFERENCES "DatasetVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataValueSnapshot" ADD CONSTRAINT "DataValueSnapshot_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataValueSnapshot" ADD CONSTRAINT "DataValueSnapshot_datasetVersionId_fkey" FOREIGN KEY ("datasetVersionId") REFERENCES "DatasetVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataConsumer" ADD CONSTRAINT "DataConsumer_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_datasetVersionId_fkey" FOREIGN KEY ("datasetVersionId") REFERENCES "DatasetVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "DataConsumer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
