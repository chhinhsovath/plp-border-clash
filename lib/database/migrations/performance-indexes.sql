-- Performance Optimization Indexes for Humanitarian Report System
-- These indexes are designed to optimize common query patterns

-- Reports table indexes
-- Primary lookup patterns: organization + status, recent updates, author queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_org_status 
ON "Report"("organizationId", "status") 
INCLUDE ("title", "updatedAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_updated_at 
ON "Report"("updatedAt" DESC) 
WHERE "status" != 'ARCHIVED';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_author_updated 
ON "Report"("authorId", "updatedAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_published_at 
ON "Report"("publishedAt" DESC) 
WHERE "publishedAt" IS NOT NULL;

-- Full-text search index for reports
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_fulltext 
ON "Report" 
USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Composite index for common report filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_org_status_updated 
ON "Report"("organizationId", "status", "updatedAt" DESC);

-- Assessment table indexes
-- Primary patterns: organization queries, location searches, type filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assessments_org_type 
ON "Assessment"("organizationId", "type") 
INCLUDE ("title", "location", "affectedPeople");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assessments_location 
ON "Assessment"("location") 
WHERE "location" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assessments_affected_people 
ON "Assessment"("affectedPeople" DESC) 
WHERE "affectedPeople" > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assessments_date_range 
ON "Assessment"("startDate", "endDate");

-- Assessment full-text search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assessments_fulltext 
ON "Assessment" 
USING gin(to_tsvector('english', title || ' ' || location));

-- User table indexes
-- Pattern: organization membership, activity tracking, role-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_org_active 
ON "User"("organizationId", "isActive") 
WHERE "isActive" = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login 
ON "User"("lastLoginAt" DESC NULLS LAST);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_org 
ON "User"("role", "organizationId") 
WHERE "isActive" = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email 
ON "User"("email") 
WHERE "isActive" = true;

-- Audit log indexes
-- High-volume table, needs efficient querying by org, user, time
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_org_timestamp 
ON "AuditLog"("organizationId", "timestamp" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_timestamp 
ON "AuditLog"("userId", "timestamp" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_action_timestamp 
ON "AuditLog"("action", "timestamp" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_entity 
ON "AuditLog"("entity", "entityId") 
WHERE "entityId" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_severity 
ON "AuditLog"("severity", "timestamp" DESC) 
WHERE "severity" IN ('HIGH', 'CRITICAL');

-- Report sections indexes
-- Pattern: report sections ordering, visibility filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sections_report_order 
ON "ReportSection"("reportId", "order") 
WHERE "isVisible" = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sections_type 
ON "ReportSection"("type") 
WHERE "isVisible" = true;

-- File attachments indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_section 
ON "File"("sectionId") 
WHERE "sectionId" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_size 
ON "File"("fileSize" DESC) 
WHERE "fileSize" > 1048576; -- Files larger than 1MB

-- Comments indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_report_created 
ON "Comment"("reportId", "createdAt" DESC) 
WHERE "isDeleted" = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_user 
ON "Comment"("userId", "createdAt" DESC) 
WHERE "isDeleted" = false;

-- Collaborators indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collaborators_report_active 
ON "ReportCollaborator"("reportId", "isActive") 
WHERE "isActive" = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collaborators_user_active 
ON "ReportCollaborator"("userId", "isActive") 
WHERE "isActive" = true;

-- Notifications indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread 
ON "Notification"("userId", "isRead", "createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_type_created 
ON "Notification"("type", "createdAt" DESC);

-- Organization indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_active 
ON "Organization"("isActive") 
WHERE "isActive" = true;

-- Security alerts indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_alerts_severity_unresolved 
ON "SecurityAlert"("severity", "resolved", "createdAt" DESC) 
WHERE "resolved" = false;

-- Report versions indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_report_versions_report_version 
ON "ReportVersion"("reportId", "version" DESC);

-- Session tracking (if using database sessions)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_user_active 
ON "Session"("userId", "isActive") 
WHERE "isActive" = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_expires_at 
ON "Session"("expiresAt") 
WHERE "expiresAt" > NOW();

-- Partial indexes for common filtered queries
-- Only index active, non-deleted, recent records where applicable

-- Reports that are actively being worked on
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_active_work 
ON "Report"("organizationId", "updatedAt" DESC) 
WHERE "status" IN ('DRAFT', 'IN_REVIEW') AND "updatedAt" > (NOW() - INTERVAL '30 days');

-- Recent audit events (last 90 days for performance)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_recent 
ON "AuditLog"("organizationId", "timestamp" DESC, "action") 
WHERE "timestamp" > (NOW() - INTERVAL '90 days');

-- Active user sessions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_users_last_week 
ON "User"("organizationId", "lastLoginAt" DESC) 
WHERE "lastLoginAt" > (NOW() - INTERVAL '7 days') AND "isActive" = true;

-- Statistics and analytics optimization indexes
-- For dashboard queries and reporting

-- Monthly report statistics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_monthly_stats 
ON "Report"("organizationId", DATE_TRUNC('month', "createdAt"), "status");

-- Daily audit log aggregations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_daily_stats 
ON "AuditLog"("organizationId", DATE_TRUNC('day', "timestamp"), "action", "success");

-- Assessment impact statistics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assessments_impact_stats 
ON "Assessment"("organizationId", "type", "affectedPeople") 
WHERE "affectedPeople" IS NOT NULL;

-- Performance monitoring indexes
-- For tracking system health and usage patterns

-- Query performance tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_slow_queries 
ON "AuditLog"("action", "timestamp") 
WHERE "metadata" ? 'query_time' AND CAST("metadata"->>'query_time' AS INTEGER) > 1000;

-- Error tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_tracking 
ON "AuditLog"("organizationId", "success", "timestamp" DESC, "action") 
WHERE "success" = false;

-- VACUUM and ANALYZE recommendations
-- These should be run regularly on high-traffic tables

-- Analyze table statistics for query planner
ANALYZE "Report";
ANALYZE "Assessment";  
ANALYZE "User";
ANALYZE "AuditLog";
ANALYZE "ReportSection";

-- Set up automatic VACUUM for high-churn tables
-- This would be configured in postgresql.conf or via pg_cron

-- Comments for maintenance
-- Run these commands periodically to maintain index health:
-- REINDEX INDEX CONCURRENTLY idx_audit_logs_org_timestamp;  -- If fragmented
-- DROP INDEX idx_old_unused_index;  -- Remove unused indexes
-- pg_stat_user_indexes -- Monitor index usage
-- pg_stat_user_tables -- Monitor table statistics