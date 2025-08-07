# Humanitarian Data Collection System Implementation

## Overview
Complete implementation of a comprehensive humanitarian data collection system based on the PRD specifications for IDP/refugee camp management and reporting.

## Implemented Components

### 1. Database Schema (`/prisma/schema-humanitarian.prisma`)
Comprehensive Prisma schema covering all data models:

#### Core Registration
- **Individual**: Complete individual registration with vulnerability flags
- **Household**: Family unit management
- **IDPSite**: Camp/site management with capacity tracking

#### Protection Module
- **ProtectionIncident**: Incident tracking with victim/perpetrator links
- **PsychosocialSupport**: Mental health support sessions

#### Shelter & NFI
- **ShelterAssessment**: Housing condition monitoring
- **NFIDistribution**: Non-food item distribution tracking

#### Food Security & Livelihoods
- **FoodDistribution**: Food ration tracking
- **NutritionAssessment**: Malnutrition screening (MUAC, weight/height)
- **LivelihoodProfile**: Skills and employment tracking

#### Health
- **MedicalRecord**: Individual health records
- **ClinicalVisit**: Visit logs with ICD-10 diagnosis codes
- **Immunization**: Vaccination tracking

#### WASH
- **WASHProfile**: Water and sanitation access
- **HygieneDistribution**: Hygiene item distribution

#### Education
- **EducationStatus**: School enrollment tracking
- **LearningProgress**: Educational achievement monitoring

#### Safety & Security
- **SecurityIncident**: Camp security events
- **FeedbackLog**: Complaint and feedback mechanism

### 2. API Endpoints

#### Registration (`/app/api/registration/`)
- **individuals/route.ts**: 
  - GET: List individuals with filtering (site, household, vulnerability)
  - POST: Register new individuals with auto-generated IDs
  - PUT: Update individual records

#### Protection (`/app/api/protection/`)
- **incidents/route.ts**:
  - GET: List incidents with statistics
  - POST: Report new incidents with referral tracking
  - PUT: Update incident status

#### Health (`/app/api/health/`)
- **clinical-visits/route.ts**:
  - GET: Medical visit history with diagnosis statistics
  - POST: Record clinical visits with chronic condition detection

#### Data Analytics (`/app/api/data/`)
- **statistics/route.ts**:
  - GET: Comprehensive camp statistics including:
    - Demographics (age/gender distribution)
    - Vulnerability breakdown
    - Protection incident trends
    - Health statistics
    - Nutrition status
    - WASH indicators
    - Education enrollment
    - Distribution tracking

## Key Features

### 1. Automatic ID Generation
- Individual codes: `KH-IDP-0000001` format
- Household codes: `HH-` prefix
- Incident codes: `INC-YYYYMMDD-0001` format

### 2. Vulnerability Detection
- Automatic elderly flag for age >= 60
- Comprehensive vulnerability tracking:
  - Unaccompanied minors
  - Separated children
  - Single-headed households
  - Pregnant/lactating mothers
  - Persons with disabilities
  - Chronically ill

### 3. Data Relationships
- Individuals linked to households
- Medical records linked to individuals
- Incidents linked to victims/perpetrators
- Distributions linked to households

### 4. Audit Trail
- All data modifications logged
- User actions tracked
- Timestamps on all records

### 5. Real-time Statistics
- Population tracking by site
- Vulnerability statistics
- Health trends monitoring
- Distribution coverage

## Usage Examples

### Register an Individual
```javascript
POST /api/registration/individuals
{
  "fullLegalName": "John Doe",
  "dateOfBirth": "1990-01-15",
  "gender": "MALE",
  "nationality": "Cambodian",
  "currentSiteId": "site-001",
  "shelterNumber": "A-123"
}
```

### Report Protection Incident
```javascript
POST /api/protection/incidents
{
  "dateTime": "2025-01-07T10:30:00",
  "incidentType": "HARASSMENT",
  "location": "Water Point B",
  "victimId": "individual-123",
  "referralStatus": "REFERRED_PSYCHOSOCIAL"
}
```

### Record Clinical Visit
```javascript
POST /api/health/clinical-visits
{
  "individualId": "individual-123",
  "visitDate": "2025-01-07",
  "symptoms": "Fever, cough",
  "diagnosis": "J06.9",
  "treatmentPlan": "Rest, fluids, paracetamol"
}
```

### Get Camp Statistics
```javascript
GET /api/data/statistics?siteId=site-001
```

## Security Features
- JWT authentication on all endpoints
- Role-based access control ready
- Audit logging for compliance
- Data encryption for sensitive fields

## Integration Points
- Reports can include humanitarian data
- Dashboard visualization ready
- Export capabilities for external reporting
- Real-time notifications for critical events

## Next Steps for Production

1. **Database Migration**
   - Run `npx prisma migrate dev` to create tables
   - Seed initial data (sites, users)

2. **Frontend Development**
   - Registration forms
   - Distribution management UI
   - Health clinic interface
   - Dashboard visualizations

3. **Advanced Features**
   - SMS notifications for appointments
   - QR code scanning for distributions
   - Offline data collection
   - Mobile app for field workers

4. **Reporting**
   - Situation reports (SitReps)
   - Sector-specific reports
   - Donor reports
   - Government compliance reports

## Compliance
System designed to meet:
- Sphere Standards
- UNHCR data protection guidelines
- Health information privacy requirements
- Child protection standards