# Humanitarian Data Collection System - Complete Documentation

## System Overview

This is a comprehensive humanitarian data collection and management system designed for IDP (Internally Displaced Persons) camps and emergency response operations. The system provides complete data collection workflows from individual registration through service delivery tracking.

## Architecture

- **Frontend**: Next.js 14 with TypeScript and React
- **Backend**: Next.js API Routes
- **Database**: Prisma ORM with SQLite (development) / PostgreSQL (production)
- **Authentication**: JWT-based authentication
- **Styling**: Inline CSS with responsive design

## Core Features

### 1. Registration System
- **Individual Registration**: Complete demographic data collection with vulnerability assessment
- **Household Registration**: Family unit tracking with relationships
- **Unique ID Generation**: Automated ID generation (KH-IDP-0000001 format)
- **8 Vulnerability Categories**: 
  - Unaccompanied Minors
  - Elderly without Support  
  - Pregnant/Lactating Women
  - People with Disabilities
  - Single Parents
  - Chronic Medical Conditions
  - Mental Health Issues
  - Survivors of Violence

### 2. Protection Module
- **Incident Reporting**: Confidential protection incident documentation
- **Severity Classification**: Critical, High, Medium, Low severity levels
- **Referral Pathways**: Automated referral system to protection services
- **Follow-up Tracking**: Case management and resolution tracking

### 3. Health Services
- **Clinical Visits**: Complete medical consultation records
- **Vital Signs Monitoring**: Blood pressure, temperature, pulse, respiratory rate
- **ICD-10 Diagnosis Codes**: Standardized medical coding
- **Medication Prescriptions**: Treatment tracking and medication management
- **Medical History**: Chronic conditions and treatment history

### 4. Nutrition Program
- **Child Screening**: Under-5 malnutrition assessment
- **Anthropometric Measurements**: Weight, height, MUAC (Mid-Upper Arm Circumference)
- **WHO Z-Score Calculations**: Weight-for-age, height-for-age, weight-for-height
- **SAM/MAM Detection**: Severe/Moderate Acute Malnutrition identification
- **Automatic Referrals**: Feeding program referrals based on status
- **MUAC Color Coding**: 
  - Red (<115mm): Severe
  - Orange (115-124mm): Moderate  
  - Yellow (125-134mm): At Risk
  - Green (≥135mm): Normal

### 5. Education Services
- **School Enrollment**: Age-appropriate grade placement (5-17 years)
- **Non-Enrollment Tracking**: 12 barrier categories with priority levels
- **Learning Space Management**: Capacity tracking and utilization
- **Support Services**: Transportation, meals, uniforms, supplies
- **High-Priority Alerts**: Child labor, early marriage, safety concerns

### 6. Distribution Management
- **Multi-Type Distributions**: Food, NFI (Non-Food Items), Hygiene kits
- **Item Tracking**: Detailed inventory with quantities and values
- **Verification Methods**: Signature, fingerprint, QR code, biometric
- **Quality Control**: Item condition and expiry tracking
- **Duplicate Prevention**: Frequency monitoring and alerts

### 7. WASH Services
- **Water Quality**: Testing and monitoring
- **Sanitation Facilities**: Accessibility and condition assessment
- **Hygiene Promotion**: Education and behavior change tracking
- **Infrastructure Monitoring**: Facility utilization and maintenance

### 8. Shelter & NFI
- **Shelter Conditions**: Structural safety and habitability
- **NFI Needs Assessment**: Household item requirements
- **Occupancy Tracking**: Population density and privacy
- **Maintenance Requests**: Repair and upgrade tracking

## Database Schema

### Core Models

#### Individual
```typescript
{
  id: string
  individualCode: string (KH-IDP-0000001)
  fullLegalName: string
  age: number
  gender: MALE | FEMALE | OTHER
  dateOfBirth: DateTime
  householdId: string
  vulnerabilityCategories: JSON array
  registrationDate: DateTime
}
```

#### Household  
```typescript
{
  id: string
  householdCode: string
  familySize: number
  headOfHousehold: string
  siteId: string
  shelterType: string
  contactNumber: string
}
```

#### ProtectionIncident
```typescript
{
  id: string
  individualId: string
  incidentType: string
  severity: CRITICAL | HIGH | MEDIUM | LOW
  description: string
  location: string
  witnesses: JSON
  actionTaken: string
  referralMade: boolean
  followUpRequired: boolean
  status: OPEN | INVESTIGATING | RESOLVED | CLOSED
}
```

#### HealthVisit
```typescript
{
  id: string
  individualId: string
  visitType: ROUTINE | EMERGENCY | FOLLOW_UP
  symptoms: string[]
  vitalSigns: JSON
  diagnosis: string
  icd10Code: string
  treatment: string
  medications: JSON
  followUpDate: DateTime
}
```

#### NutritionAssessment
```typescript
{
  id: string
  individualId: string
  weight: float
  height: float
  muacScore: float
  nutritionStatus: NORMAL | AT_RISK | MAM | SAM
  zScores: JSON
  referralNeeded: boolean
  treatmentPlan: string
}
```

#### EducationStatus
```typescript
{
  id: string
  individualId: string
  academicYear: string
  enrollmentStatus: ENROLLED | NOT_ENROLLED | DROPPED_OUT | GRADUATED
  grade: string
  learningSpaceId: string
  nonEnrollmentReason: enum
  supportServices: JSON
}
```

#### Distribution
```typescript
{
  id: string
  individualId: string
  householdId: string
  distributionType: FOOD | NFI | HYGIENE | MIXED
  items: JSON
  totalValue: float
  verificationMethod: enum
  distributorName: string
  qualityControl: JSON
}
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Current user info

### Registration
- `GET /api/registration/individuals` - List individuals with search/filter
- `POST /api/registration/individuals` - Register new individual
- `GET /api/registration/households` - List households
- `POST /api/registration/households` - Register new household

### Protection
- `GET /api/protection/incidents` - List incidents with filtering
- `POST /api/protection/incidents` - Report new incident
- `PUT /api/protection/incidents/{id}` - Update incident status

### Health
- `GET /api/health/visits` - List clinical visits
- `POST /api/health/visits` - Record new visit
- `GET /api/health/visits/statistics` - Health analytics

### Nutrition
- `GET /api/nutrition/assessments` - List assessments with filtering
- `POST /api/nutrition/assessments` - Record new assessment
- `GET /api/nutrition/assessments/statistics` - Nutrition analytics

### Education
- `GET /api/education/enrollment` - List enrollments with filtering
- `POST /api/education/enrollment` - Record enrollment/non-enrollment
- `GET /api/education/enrollment/statistics` - Education analytics

### Distributions
- `GET /api/distributions` - List distributions with filtering
- `POST /api/distributions` - Record new distribution
- `GET /api/distributions/statistics` - Distribution analytics

### Reports
- `POST /api/reports` - Generate comprehensive reports
- `GET /api/reports/templates` - Available report templates

## Security Features

### Authentication & Authorization
- JWT token-based authentication
- Token expiration and refresh
- Role-based access control (planned)
- Secure password hashing

### Data Protection
- Input validation with Zod schemas
- SQL injection prevention via Prisma
- XSS protection through React
- Sensitive data encryption for PII

### Audit Trail
- Complete audit logging for all operations
- User action tracking
- Data modification history
- Access logging

## Notification System

### Automated Alerts
- **Critical Health Cases**: Emergency medical referrals
- **SAM/MAM Detection**: Immediate nutrition interventions
- **High-Priority Protection**: Child labor, early marriage, safety threats
- **Distribution Anomalies**: High-value or frequent distributions
- **Education Barriers**: Out-of-school children with urgent needs

### Alert Types
- `HEALTH_EMERGENCY`: Critical medical cases
- `NUTRITION_ALERT`: SAM/MAM detection
- `PROTECTION_URGENT`: High-priority protection cases
- `EDUCATION_ALERT`: Critical enrollment barriers
- `DISTRIBUTION_WARNING`: Irregular distribution patterns

## Data Collection Forms

### 1. Individual Registration Form (`/registration/individuals/new`)
- **Personal Details**: Name, age, gender, DOB
- **Documentation**: ID numbers, documents
- **Contact Information**: Phone, emergency contact
- **Family Composition**: Household relationships
- **Vulnerability Assessment**: 8-category screening
- **Site Assignment**: Camp location and shelter

### 2. Protection Incident Form (`/protection/incidents/new`)
- **Incident Details**: Type, date, location, description
- **Severity Classification**: Auto-calculated based on criteria
- **Witness Information**: Names and contact details
- **Immediate Actions**: Safety measures taken
- **Referral Pathways**: Specialized service referrals
- **Follow-up Planning**: Case management steps

### 3. Clinical Visit Form (`/health/visits/new`)
- **Visit Classification**: Routine, emergency, follow-up
- **Symptom Assessment**: Multi-select symptom checker
- **Vital Signs**: Automated normal/abnormal flagging
- **Clinical Examination**: Physical findings
- **Diagnosis**: ICD-10 coded diagnoses
- **Treatment Plan**: Medications and interventions
- **Referral Requirements**: Specialist or hospital referrals

### 4. Nutrition Assessment Form (`/nutrition/assessment/new`)
- **Child Selection**: Under-5 beneficiary search
- **Anthropometric Data**: Weight, height, MUAC measurement
- **Z-Score Calculation**: Automated WHO standard comparison
- **Edema Check**: Bilateral pitting edema assessment
- **Status Determination**: Auto-classification as Normal/At-Risk/MAM/SAM
- **Referral Generation**: Automatic feeding program referrals
- **Treatment Tracking**: Therapeutic and supplementary feeding

### 5. Education Enrollment Form (`/education/enrollment/new`)
- **Child Search**: School-age (5-17) beneficiary selection
- **Enrollment Decision**: Enroll vs. record non-enrollment
- **School Assignment**: Learning space and grade placement
- **Support Services**: Transportation, meals, supplies, uniforms
- **Barrier Documentation**: 12 non-enrollment reasons
- **Priority Flagging**: High-priority cases for immediate intervention
- **Guardian Consent**: Enrollment authorization

### 6. Distribution Form (`/distribution/new`)
- **Beneficiary Selection**: Individual and household verification
- **Distribution Type**: Food, NFI, hygiene, or mixed
- **Item Details**: Specific items with quantities and values
- **Verification Method**: Signature, biometric, or QR code
- **Quality Control**: Item condition and expiry checking
- **Recipient Verification**: Primary beneficiary or alternate
- **Documentation**: Photos and notes for accountability

## Dashboard & Analytics

### Data Collection Hub (`/data-collection`)
- **Module Overview**: 8 data collection modules
- **Quick Stats**: Real-time beneficiary and service statistics
- **Recent Activities**: Latest system activities from audit log
- **Quick Actions**: Direct access to frequently used forms
- **Critical Alerts**: High-priority cases requiring attention

### Analytics Dashboard (`/dashboard`)
- **Population Overview**: Total individuals, households, sites
- **Vulnerability Analysis**: Risk category breakdown
- **Service Delivery**: Health, nutrition, education, protection metrics
- **Geographic Distribution**: Site-based population mapping
- **Trend Analysis**: Time-series service delivery trends

## Report Generation

### Standard Reports
- **Registration Report**: Population demographics and vulnerability analysis
- **Protection Report**: Incident trends and response effectiveness  
- **Health Report**: Morbidity patterns and service utilization
- **Nutrition Report**: Malnutrition prevalence and program outcomes
- **Education Report**: Enrollment rates and barrier analysis
- **Distribution Report**: Aid distribution tracking and beneficiary reach

### Custom Reports
- **Date Range Filtering**: Flexible reporting periods
- **Geographic Filtering**: Site-specific or multi-site reports
- **Demographic Filtering**: Age, gender, vulnerability-based reports
- **Service-Specific**: Module-focused detailed analysis
- **Executive Summary**: High-level KPI dashboard for leadership

## Technical Implementation

### Form Validation
- **Zod Schema Validation**: Type-safe form validation
- **Real-time Validation**: Field-level validation feedback  
- **Required Field Enforcement**: Mandatory data collection
- **Data Type Validation**: Number, date, email format checking
- **Business Rule Validation**: Age restrictions, duplicate prevention

### Search & Filtering
- **Beneficiary Search**: Name and ID-based search with autocomplete
- **Advanced Filtering**: Multi-criteria filtering for all modules
- **Pagination**: Efficient large dataset handling
- **Sorting**: Configurable column-based sorting
- **Export Capabilities**: CSV and Excel export functionality

### Mobile Responsiveness
- **Responsive Design**: Mobile-first responsive layout
- **Touch-Friendly Interface**: Large buttons and touch targets
- **Offline Capability**: Planned offline form caching
- **Progressive Web App**: PWA features for mobile installation

### Performance Optimization
- **Database Indexing**: Optimized query performance
- **Lazy Loading**: On-demand component loading
- **Caching Strategy**: Redis caching for frequent queries
- **Batch Operations**: Bulk data processing capabilities

## Deployment & Configuration

### Environment Setup
```bash
# Install dependencies
npm install

# Setup database
npx prisma migrate dev

# Seed initial data
npx prisma seed

# Start development server
npm run dev
```

### Environment Variables
```
DATABASE_URL=sqlite:./dev.db
JWT_SECRET=your-secret-key
NEXTAUTH_SECRET=your-nextauth-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Production Deployment
- **Database Migration**: PostgreSQL production setup
- **JWT Configuration**: Secure token generation
- **HTTPS Setup**: SSL certificate configuration
- **Backup Strategy**: Automated database backups
- **Monitoring**: Application performance monitoring

## System Administration

### User Management
- **Administrator Accounts**: System-wide access
- **Program Officers**: Module-specific access
- **Data Entry Clerks**: Form submission only
- **Read-Only Users**: Report access only

### Data Backup & Recovery
- **Daily Backups**: Automated database backups
- **Point-in-Time Recovery**: Transaction log backups
- **Cross-Site Replication**: Geographic redundancy
- **Disaster Recovery**: Business continuity planning

### Maintenance & Updates
- **Database Maintenance**: Regular optimization and cleanup
- **Software Updates**: Security patches and feature updates
- **Performance Monitoring**: Resource utilization tracking
- **Error Monitoring**: Automated error detection and alerting

## Integration Capabilities

### External Systems
- **UNHCR ProGres**: Refugee registration integration
- **WHO DHIS2**: Health information system sync
- **WFP SCOPE**: Food distribution coordination
- **Financial Systems**: Expense tracking and budgeting

### API Integration
- **RESTful APIs**: Standard HTTP-based integration
- **Webhook Support**: Real-time event notifications
- **Bulk Import/Export**: CSV and Excel file handling
- **Data Synchronization**: Multi-system data consistency

## Compliance & Standards

### Humanitarian Standards
- **Core Humanitarian Standard**: Quality and accountability
- **Sphere Standards**: Minimum humanitarian response standards
- **IASC Guidelines**: Inter-Agency Standing Committee compliance
- **Do No Harm**: Conflict sensitivity integration

### Data Protection
- **GDPR Compliance**: European data protection regulation
- **Data Minimization**: Collect only necessary information
- **Purpose Limitation**: Use data only for stated purposes
- **Retention Policies**: Automatic data purging after retention period

### Technical Standards
- **Accessibility**: WCAG 2.1 AA compliance
- **Internationalization**: Multi-language support framework
- **API Standards**: RESTful API design principles
- **Security Standards**: OWASP security guidelines

## Training & Support

### User Training
- **Administrator Training**: 3-day comprehensive training
- **End-User Training**: 1-day module-specific training
- **Refresher Training**: Quarterly skill updates
- **Train-the-Trainer**: Local capacity building

### Documentation
- **User Manual**: Step-by-step operational guide
- **Technical Documentation**: System architecture and API docs
- **Video Tutorials**: Screen-recorded training materials
- **FAQ Database**: Common questions and solutions

### Support Channels
- **Help Desk**: Email and phone support
- **Online Chat**: Real-time technical assistance
- **User Community**: Peer support forum
- **Emergency Support**: 24/7 critical issue response

## Future Enhancements

### Phase 2 Features
- **Mobile App**: Native iOS and Android applications
- **Offline Capability**: Full offline data collection and sync
- **Advanced Analytics**: Machine learning insights
- **Workflow Automation**: Rule-based process automation

### Integration Roadmap
- **Biometric Integration**: Fingerprint and iris scanning
- **GPS Coordination**: Location-based services
- **Satellite Integration**: Remote area connectivity
- **Blockchain**: Immutable audit trails

### Scalability Planning
- **Microservices**: Service-oriented architecture
- **Load Balancing**: High-availability clustering
- **Global Deployment**: Multi-region distribution
- **Performance Optimization**: Advanced caching and CDN

---

## Contact Information

**System Administrator**: admin@humanitarian-system.org  
**Technical Support**: support@humanitarian-system.org  
**Emergency Contact**: +1-555-HELP-NOW

**Documentation Version**: 1.0  
**Last Updated**: 2025-08-07  
**System Version**: v1.0.0

This documentation provides a complete reference for the Humanitarian Data Collection System. For additional technical details, please refer to the inline code comments and API documentation.