Core Registration Database

This is the central table where every individual is registered. Each record is the foundation for all other data points.
Individual ID (Primary Key): An auto-generated, unique alphanumeric identifier for each person (e.g., KH-IDP-0000001). This is crucial for linking all other data sets.
Household ID: A unique ID for each family unit. All members of the same household will share this ID.
Head of Household ID: A variable linking to the Individual ID of the household head.
Personal Information:
Full Legal Name (as per available documentation).
Commonly Used Name.
Date of Birth.
Age (auto-calculated from DoB).
Gender (M, F, Other).
Demographic & Contact Information:
Nationality.
Ethnic Group or Mother Tongue.
Pre-Displacement Address or Village of Origin.
Contact Number (if available).
Location:
Current IDP Site ID (e.g., Site-001).
Zone/Block Number within the site.
Shelter Number.
Vulnerability Status: A multi-select checklist or series of boolean flags to identify specific needs.
Unaccompanied Minor
Child Separated from Parents
Single-headed Household
Pregnant (with an estimated due date)
Lactating Mother
Person with Disability (with a description of the disability)
Elderly (age 60+)
Chronically Ill (with a description of the condition)

1. Protection

This section logs incidents and support for vulnerable individuals.
Incident Log (Linked Table):
Incident ID (Unique ID).
Date and Time of Incident.
Type of Incident (Dropdown: Sexual and Gender-Based Violence (SGBV), physical assault, trafficking, child abuse, harassment, theft).
Location of Incident (e.g., water point, shelter, market).
Perpetrator's ID (Link to Individual ID if known, or text field for description).
Victim's ID (Link to Individual ID).
Referral Status (Dropdown: Referred to Health Team, Referred to Police/Security, Referred to Legal Aid).
Action Taken (Text field for follow-up notes).
Psychosocial Support Record (Linked Table):
Session Date.
Support Type (Dropdown: Individual Counseling, Group Therapy, Play Therapy).
Service Provider (e.g., NGO A, Community Volunteer B).

2. Shelter and Non-Food Items (NFIs)

This section tracks living conditions and material aid distribution.
Shelter Condition (Linked Table):
Last Assessment Date.
Shelter Type (Dropdown: Tent, T-Shelter, communal building).
Condition (Dropdown: Good, Needs Minor Repair, Uninhabitable).
NFI Distribution Log (Linked Table):
Distribution Date.
Household ID.
Item Type (Dropdown: Blanket, Sleeping Mat, Kitchen Set, Mosquito Net, Hygiene Kit, etc.).
Quantity Distributed.
Staff ID (ID of the person who distributed the items).

3. Food Security and Livelihoods

This section tracks food distribution, nutrition, and skills.
Food Distribution Log (Linked Table):
Distribution Date.
Household ID.
Ration Type (Dropdown: General Food Ration, High-Energy Biscuits, WFP Ration).
Quantity (e.g., 5kg of rice, 1 liter of oil).
Nutrition Status (Linked Table):
Individual ID.
Date of Assessment.
Age at Assessment.
Weight (kg).
Height (cm).
Mid-Upper Arm Circumference (MUAC) score.
Livelihood & Skills (Linked Table):
Individual ID.
Previous Occupation (Text field).
Skillset (Multi-select: Carpentry, Tailoring, Agriculture, IT, Teaching).
Interest in Training (Boolean: Yes/No).
Assistance Received (Dropdown: Cash transfer, Vocational Training, Micro-loan).

4. Health

This section logs medical records and health status.
Medical Record (Linked Table):
Individual ID.
Chronic Conditions (Text field).
Known Allergies.
Immunization Log (Linked table with Vaccine Name and Date Administered).
Clinical Visit Log (Linked Table):
Individual ID.
Visit Date.
Symptoms.
Diagnosis (Standardized medical code, e.g., ICD-10).
Treatment Plan.
Medication Prescribed.
Name of Clinician.

5. WASH (Water, Sanitation, and Hygiene)

This section tracks access to WASH facilities and distribution of hygiene items.
Household WASH Profile (Linked Table):
Household ID.
Distance to nearest clean water point (meters).
Access to private latrine (Yes/No).
Number of people sharing latrine (Auto-calculated from Household IDs using the same latrine number).
Hygiene Item Distribution Log (Linked Table):
Distribution Date.
Household ID.
Item Type (Dropdown: Soap, Sanitary pads, Toothpaste).
Quantity.

6. Education

This section focuses on a child's educational journey and progress.
Education Status (Linked Table):
Individual ID (for children 5-17).
Enrollment Status (Dropdown: Enrolled, Not Enrolled).
Learning Space ID (if enrolled).
Last Grade Completed (before displacement).
Reason for Non-Enrollment (Dropdown: Child Labor, Caretaker for Siblings, Fear, No Space, Disability, Reluctance).
Learning Progress (Linked to LMS):
LMS User ID (Unique ID for the EdTech system).
Modules Completed.
Assessment Scores.
Attendance Log for in-person sessions.

7. Safety and Security

This section covers broader camp-level safety and feedback mechanisms.
Security Incident Log (Linked Table):
Incident ID.
Date and Time.
Type of Incident (Dropdown: Fire, flood, inter-group conflict, breach of camp perimeter).
Impact (Dropdown: No injury, Minor injury, Major injury, Fatalities, Property Damage).
Feedback Mechanism Log (Linked Table):
Feedback ID.
Date of Submission.
Type of Feedback (Dropdown: Complaint, Suggestion, Observation).
Concern/Issue (Text field).
Status (Dropdown: Received, In Progress, Resolved).
