# Humanitarian Data Collection Forms

Complete implementation of user-friendly forms for collecting humanitarian data based on the PRD specifications.

## Implemented Forms

### 1. Individual Registration Form
**Path:** `/app/registration/individuals/new/page.tsx`

**Features:**
- Multi-step wizard interface with 4 tabs:
  - Basic Information (name, DOB, gender)
  - Demographics (nationality, ethnicity, contact)
  - Location (site, shelter, household)
  - Vulnerability Assessment (comprehensive screening)
- Auto-generation of unique individual IDs (KH-IDP-0000001 format)
- Age calculation and automatic elderly detection
- Household creation or linking to existing households
- Vulnerability indicators with conditional fields
- Real-time validation and error handling

**Key Capabilities:**
- Registers individuals with complete demographic data
- Tracks 8 vulnerability categories
- Links individuals to households and sites
- Supports batch registration workflow

### 2. Protection Incident Reporting Form
**Path:** `/app/protection/incidents/new/page.tsx`

**Features:**
- Confidential incident reporting interface
- Incident classification by severity (critical/high/medium/low)
- Victim search and selection from database
- Perpetrator identification (known or description)
- Location tracking with common site locations
- Referral pathway selection:
  - Health team
  - Police/Security
  - Legal aid
  - Psychosocial support
- Urgent response flagging
- Automatic incident code generation

**Key Capabilities:**
- SGBV and protection incident documentation
- Immediate referral tracking
- Confidentiality safeguards
- Action and follow-up notes

## Additional Forms Ready for Implementation

### 3. Health/Clinical Visit Form
**Features to Include:**
- Patient search and selection
- Symptoms checklist
- ICD-10 diagnosis code selection
- Treatment plan documentation
- Medication prescription tracking
- Follow-up appointment scheduling
- Chronic condition detection
- Immunization records

### 4. Distribution Tracking Forms
**Features to Include:**
- Household/Individual selection
- Distribution type selection:
  - Food rations
  - NFI (Non-Food Items)
  - Hygiene kits
- Quantity tracking
- Distribution verification (signature/fingerprint)
- Stock management integration

### 5. WASH Assessment Form
**Features to Include:**
- Household WASH profile
- Water source distance measurement
- Latrine access and sharing ratio
- Handwashing facility availability
- Hygiene practice observation
- Water quality testing results

### 6. Education Enrollment Form
**Features to Include:**
- Child registration (5-17 years)
- Previous education history
- Current enrollment status
- Learning space assignment
- Attendance tracking
- Non-enrollment reason documentation
- Special needs identification

### 7. Nutrition Assessment Form
**Features to Include:**
- Child measurement (weight, height, MUAC)
- Automatic malnutrition classification
- Referral to feeding programs
- Growth monitoring charts
- Mother/caregiver counseling records

## Form Design Principles

### User Experience
- **Progressive Disclosure:** Multi-step wizards for complex forms
- **Smart Defaults:** Pre-populated common values
- **Inline Validation:** Real-time feedback on errors
- **Search Integration:** Quick lookup for individuals/households
- **Offline Capability:** Local storage for connectivity issues

### Data Quality
- **Required Field Marking:** Clear indication with asterisks
- **Format Validation:** Phone numbers, dates, IDs
- **Duplicate Prevention:** Check for existing records
- **Audit Trail:** Track who entered/modified data

### Accessibility
- **Mobile Responsive:** Works on tablets and phones
- **Large Touch Targets:** Easy selection on touchscreens
- **Clear Labels:** Descriptive field names
- **Help Text:** Contextual guidance for complex fields

## Integration Points

### Dashboard Integration
All forms feed data to:
- Real-time statistics dashboard
- Report generation system
- Alert and notification system
- Data export functionality

### Workflow Automation
- Automatic notifications for urgent cases
- Referral pathway triggers
- Follow-up reminders
- Distribution eligibility checks

## Security Features

### Data Protection
- Role-based access control
- Encrypted sensitive fields
- Audit logging for all changes
- Consent management for data collection

### Privacy Safeguards
- Anonymization options for reports
- Restricted access to protection data
- Separate storage for confidential information
- Data retention policies

## Mobile Data Collection

### Offline Forms
- Local data storage
- Queue for synchronization
- Conflict resolution
- Progress indicators

### Field Features
- GPS location capture
- Photo attachment
- Voice notes
- Barcode/QR scanning

## Training Materials

### Form Guides
- Step-by-step instructions
- Field definitions
- Common scenarios
- Troubleshooting tips

### Data Standards
- Naming conventions
- Date formats
- Required vs optional fields
- Quality indicators

## Performance Optimization

### Fast Data Entry
- Keyboard shortcuts
- Tab navigation
- Auto-complete
- Bulk operations

### Quick Search
- Indexed individual database
- Filtered household lists
- Recent entries access
- Favorites/bookmarks

## Reporting Integration

Each form automatically generates:
- Individual records for reports
- Aggregated statistics
- Trend analysis data
- Alert triggers for critical cases

## Next Steps

1. **Complete Remaining Forms**
   - Implement health, education, and nutrition forms
   - Add distribution tracking interfaces
   - Create WASH assessment tools

2. **Mobile App Development**
   - React Native implementation
   - Offline synchronization
   - Field data collection tools

3. **Training & Deployment**
   - User training materials
   - Data entry guidelines
   - Quality assurance protocols

4. **Advanced Features**
   - Biometric integration
   - Document scanning
   - Multi-language support
   - Voice input capabilities