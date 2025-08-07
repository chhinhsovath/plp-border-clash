import { 
  User, 
  Organization, 
  Report, 
  Section, 
  Template,
  Assessment,
  MediaFile,
  UserRole,
  ReportStatus,
  SectionType,
  AssessmentType,
  ExportFormat,
  CollaboratorPermission,
  AccessPermission
} from '@prisma/client'

// Re-export Prisma types
export type {
  User,
  Organization,
  Report,
  Section,
  Template,
  Assessment,
  MediaFile,
  UserRole,
  ReportStatus,
  SectionType,
  AssessmentType,
  ExportFormat,
  CollaboratorPermission,
  AccessPermission
}

// Auth types
export interface JWTPayload {
  userId: string
  email: string
  role: UserRole
  organizationId: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  organizationName?: string
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T = any> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Report types
export interface ReportWithSections extends Report {
  sections: Section[]
  author: User
  organization: Organization
}

export interface CreateReportInput {
  title: string
  description?: string
  templateId?: string
}

export interface UpdateReportInput {
  title?: string
  description?: string
  status?: ReportStatus
  metadata?: any
  settings?: any
}

// Section types
export interface CreateSectionInput {
  reportId: string
  title: string
  type: SectionType
  content?: any
  order: number
}

export interface UpdateSectionInput {
  title?: string
  content?: any
  order?: number
  isVisible?: boolean
  metadata?: any
}

// Chart data types
export interface ChartData {
  labels: string[]
  datasets: ChartDataset[]
}

export interface ChartDataset {
  label: string
  data: number[]
  backgroundColor?: string | string[]
  borderColor?: string | string[]
  borderWidth?: number
}

// Table data types
export interface TableData {
  columns: TableColumn[]
  rows: any[]
}

export interface TableColumn {
  key: string
  title: string
  type?: 'text' | 'number' | 'date' | 'boolean'
  width?: number
  align?: 'left' | 'center' | 'right'
}

// Assessment data types
export interface AssessmentData {
  location: string
  coordinates?: {
    latitude: number
    longitude: number
  }
  affectedPeople?: number
  households?: number
  sectors?: SectorData[]
}

export interface SectorData {
  name: string
  indicators: Indicator[]
  findings: string
  recommendations: string
}

export interface Indicator {
  name: string
  value: number | string
  unit?: string
  status?: 'critical' | 'warning' | 'normal'
}

// Media types
export interface UploadedFile {
  filename: string
  originalName: string
  mimeType: string
  size: number
  url: string
  thumbnailUrl?: string
}

export interface MediaMetadata {
  photographer?: string
  location?: string
  caption?: string
  date?: Date
  tags?: string[]
}

// Export types
export interface ExportOptions {
  format: ExportFormat
  includeImages?: boolean
  includeCharts?: boolean
  includeTables?: boolean
  customBranding?: boolean
  watermark?: string
}

// Collaboration types
export interface CollaboratorInvite {
  email: string
  permission: CollaboratorPermission
  message?: string
}

// Filter and search types
export interface ReportFilters {
  status?: ReportStatus
  authorId?: string
  organizationId?: string
  startDate?: Date
  endDate?: Date
  search?: string
}

export interface SortOptions {
  field: string
  direction: 'asc' | 'desc'
}

// WebSocket event types
export interface WSMessage {
  type: WSEventType
  data: any
  userId?: string
  reportId?: string
}

export enum WSEventType {
  REPORT_UPDATED = 'REPORT_UPDATED',
  SECTION_UPDATED = 'SECTION_UPDATED',
  USER_JOINED = 'USER_JOINED',
  USER_LEFT = 'USER_LEFT',
  COMMENT_ADDED = 'COMMENT_ADDED',
  EXPORT_COMPLETED = 'EXPORT_COMPLETED'
}