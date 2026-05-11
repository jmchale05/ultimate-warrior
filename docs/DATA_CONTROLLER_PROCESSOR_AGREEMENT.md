# Data Controller & Processor Agreement
## Ultimate Warrior Challenges

**Effective Date:** [Date]  
**Version:** 1.0

---

## Parties

**Data Controller (School):**  
Name: ___________________________________  
Address: ___________________________________  
Contact: ___________________________________  
Role: School (responsible for lawful basis and parental consent)

**Data Processor (App Provider):**  
Name: [Your Organization Name]  
Address: [Your Address]  
Contact: support@tuwc.online  
Role: App provider (executes deletion and data handling on school direction)

**Affected Teachers/Admins:**  
Name: ___________________________________  
Role: [Teacher/Admin]  
School: ___________________________________

---

## 1. Purpose

This agreement clarifies roles and responsibilities between the school (data controller) and the app provider (data processor) regarding the processing of personal data through Ultimate Warrior Challenges.

**It defines:**
- Who is responsible for lawful basis and parental consent
- How data subject requests are handled
- Deletion and retention procedures
- Security and breach response obligations
- Audit and compliance responsibilities

---

## 2. Data Processed

### Categories of Personal Data

- **Student Data:** Names, ages, year groups, profile photos, campaign results (distance miles), class assignments, consent records
- **Teacher/Admin Data:** Names, email addresses, role, school assignment, consent records, deletion request history
- **Metadata:** Access logs, campaign progress timestamps, school access codes, consent timestamps

### Categories of Data Subjects

- Students in participating schools
- Teachers and staff at participating schools
- School administrators

### Frequency and Duration

- **Frequency:** Continuous (students/teachers log data daily during school year)
- **Duration:** While enrolled/employed + 12–24 months post-termination (per data retention policy)

---

## 3. Purpose and Legal Basis

The school processes personal data for the following purposes:

| Purpose | Legal Basis | Data Type |
|---|---|---|
| Administer school fitness campaigns | Contract (service provision) | Student names, years, results |
| Track student progress | Contract (service provision) | Results, photos, ages |
| Report campaign statistics | Contract (service provision) | Aggregated results |
| School accountability | Legitimate interest | Aggregated results, metadata |
| Safeguarding investigations | Legal obligation | Any personal data |
| Respond to data-subject requests | Legal obligation (GDPR) | Any personal data |

**Important:** The school confirms that:
- It has obtained necessary parental/guardian consent before uploading student data
- It has authority to process this data under school policy
- It has assessed and documented the lawful basis for each purpose

---

## 4. Roles and Responsibilities

### School (Data Controller) Responsibilities

- [ ] Obtain lawful basis (parental consent, school authority) before entering student data
- [ ] Authorize the app provider to store and process data on school's behalf
- [ ] Respond to data-subject access requests within 30 days
- [ ] Authorize deletion of student data when teachers request it
- [ ] Notify the app provider of any data-subject rights requests
- [ ] Maintain records of decisions on deletion requests
- [ ] Ensure staff understand privacy obligations when using the app
- [ ] Notify app provider of any data breaches affecting school data
- [ ] Update this agreement if processing purposes change

### App Provider (Data Processor) Responsibilities

- [ ] Store data in encrypted form on Firebase infrastructure
- [ ] Restrict data access by role (teachers see school data only; admins see all; students see own data)
- [ ] Execute deletion requests only upon school authorization
- [ ] Maintain deletion request audit trail for 24 months
- [ ] Provide data export on request (for subject-access requests)
- [ ] Notify school of suspected breaches within 24 hours
- [ ] Respond to data-subject requests within 30 days of school referral
- [ ] Not use data for any purpose other than app operation
- [ ] Retain data only as long as the agreement is active
- [ ] Provide access to audit logs upon request

### Teachers/Admins (School Agents) Responsibilities

- [ ] Only enter data for students you are authorized to manage
- [ ] Confirm that parents have consented to data entry (per school policy)
- [ ] Use the app only for campaign administration
- [ ] Do not share login credentials
- [ ] Report suspected breaches or unauthorized access immediately
- [ ] Comply with school privacy and data protection policies
- [ ] Do not export or store data outside the app

---

## 5. Data Subject Rights

Both parties commit to supporting data-subject rights under GDPR:

### Right of Access (Subject Access Requests)

- **Timeline:** School responds within 30 days
- **Responsibility:** App provider exports data; school delivers to data subject
- **Process:** 
  1. Data subject emails school or uses app's "Download my data" feature
  2. If email request, school forwards to app provider
  3. App provider compiles and exports within 5 days
  4. School delivers to data subject within 30 days

### Right of Rectification (Correction)

- **Timeline:** School authorizes correction; app provider updates within 5 days
- **Process:**
  1. Data subject or teacher requests correction
  2. School authorizes the correction
  3. App provider updates in Firestore and confirms completion
  4. School notifies data subject

### Right of Erasure (Deletion)

- **Timeline:** School authorizes; app provider deletes within 7 days
- **Process:**
  1. Teacher/school initiates deletion request in app
  2. Admin (school representative) reviews and approves/rejects
  3. If approved, app provider executes deletion within 7 days
  4. Deletion request record retained for 24 months for safeguarding
- **Exceptions:** Data may not be deleted if required by law, ongoing investigation, or safeguarding hold

### Right to Restrict Processing

- **Timeline:** School authorizes; app provider implements within 5 days
- **Process:**
  1. Data subject requests restriction
  2. School authorizes restriction
  3. App provider restricts processing (e.g., stops new result entries)
  4. Data is retained but not actively processed

### Right to Data Portability

- **Timeline:** Within 30 days
- **Process:**
  1. Data subject requests export
  2. App provider exports in JSON format
  3. School delivers to data subject

---

## 6. Data Retention and Deletion

The parties agree to the following retention schedule:

| Data Type | Retention Period | Deletion Trigger |
|---|---|---|
| Active student profile | During enrollment | School requests deletion via app; admin approves |
| Student results | 12 months post-deletion | Automatic deletion after 12 months |
| Teacher account | 24 months post-termination | Automatic deletion after 24 months |
| Admin account | 24 months post-termination | Automatic deletion after 24 months |
| Deletion request records | 24 months | Automatic deletion after 24 months |
| Consent records | 24 months post-termination | Automatic deletion after 24 months |
| School record | Indefinite | Unless school closure (rare, requires written authorization) |

**Important:** School may request early deletion of data at any time. App provider will honor requests within 7 days (unless a legal hold or safeguarding investigation prevents deletion).

---

## 7. Security Measures

The app provider commits to:

- **Encryption in Transit:** All data is encrypted via HTTPS/TLS
- **Encryption at Rest:** Data stored on Firebase is encrypted by Google Cloud
- **Access Control:** 
  - Teachers access only their school's data
  - Students access only their own data
  - Admins access all data with audit logging
  - Role-based security rules enforced in Firestore
- **Authentication:** Multi-factor authentication (MFA) recommended for admins
- **Backup:** Encrypted backups retained for 30 days (incremental) and 24 months (full)
- **Monitoring:** Access logs reviewed for suspicious activity
- **Updates:** Firebase, dependencies, and security patches updated regularly

The school commits to:

- Ensure staff use strong, unique passwords
- Not share login credentials between staff
- Report suspected unauthorized access immediately
- Comply with the app provider's security recommendations

---

## 8. Data Breach Notification

### School's Obligations

If school discovers a breach affecting app data:
1. Notify app provider within 24 hours at support@tuwc.online
2. Provide description of breach, data affected, and timeline
3. Cooperate with app provider's investigation
4. Follow Breach Response Plan (provided separately)

### App Provider's Obligations

If app provider discovers a breach:
1. Notify school within 24 hours
2. Provide breach description, data affected, timeline
3. Conduct investigation and provide findings within 10 days
4. Assist school in notifying data subjects and ICO (if required)
5. Implement corrective actions to prevent recurrence

### Joint Obligations

- Notify data subjects without undue delay (within 72 hours if high risk)
- Notify ICO within 72 hours if required under GDPR Article 33
- Maintain breach record for 3 years
- Conduct post-incident review and document lessons learned

---

## 9. Audit and Compliance

### School's Right to Audit

School may request:
- [ ] Access to Firebase audit logs (read-only)
- [ ] Proof of encryption and security measures
- [ ] Deletion request records
- [ ] Data subject request logs
- [ ] Incident reports

App provider will provide within 10 business days.

### Compliance Certifications

App provider commits to:
- [ ] Comply with GDPR and UK Data Protection Act 2018
- [ ] Support school's compliance with Education Regulations
- [ ] Provide evidence of security controls upon request
- [ ] Notify school of any regulatory investigations or enforcement actions
- [ ] Not transfer data to third parties without school authorization

---

## 10. Subprocessors (Third Parties)

App provider uses the following subprocessors:

| Subprocessor | Purpose | Location | Privacy Policy |
|---|---|---|---|
| Google Firebase | Data storage and hosting | US/EU | https://policies.google.com/privacy |
| Google Cloud Storage | Profile photo and logo storage | US/EU | https://policies.google.com/privacy |
| Firebase Extensions | Email notifications for deletion requests | US/EU | https://policies.google.com/privacy |

School acknowledges and agrees to the use of these subprocessors. School will notify app provider immediately if it objects to any subprocessor.

---

## 11. Term and Termination

### Term

This agreement is effective on [Date] and continues while the school uses the app, unless terminated earlier.

### Termination by School

School may terminate use of the app by:
1. Notifying app provider in writing 30 days in advance
2. Confirming all data has been exported or deleted
3. Confirming no outstanding data-subject requests

**Effect:** All app access is revoked; data is retained per the retention schedule or deleted at school's request.

### Termination by App Provider

App provider may terminate if:
1. School breaches this agreement and does not cure within 30 days
2. School fails to pay (if applicable)
3. Regulatory action or legal obligation requires termination

**Effect:** School is notified; data is exported upon request or deleted per retention schedule.

### Data After Termination

- Deletion request records, audit logs, and consent records are retained for 24 months
- School may request export of remaining data within 30 days of termination
- Remaining data is deleted per the retention schedule

---

## 12. Dispute Resolution

If school and app provider disagree on data handling:

1. **Informal Resolution (10 days):** Parties discuss and try to resolve directly
2. **Formal Escalation (10 days):** Issues escalated to senior representatives
3. **Mediation (30 days, optional):** If unresolved, parties may seek mediation
4. **Regulatory Complaint:** Either party may lodge a complaint with the ICO

---

## 13. Changes to This Agreement

App provider may update this agreement:
- For technical or compliance reasons (notify school 30 days in advance)
- If GDPR or UK DPA 2018 changes (notify school immediately)

School may request revisions at any time. If school does not accept changes, it may terminate the agreement.

---

## 14. Contacts

### For Data Subject Requests or Privacy Questions

**Email:** support@tuwc.online  
**Response Time:** Within 5 working days

### For Urgent Breaches or Security Issues

**Email:** support@tuwc.online  
**Phone:** [Your Phone]  
**On-Call:** [Your On-Call Process]

### For School Inquiries

**Designated Contact:** ___________________________________  
**Email:** ___________________________________  
**Phone:** ___________________________________

---

## Signatures

By signing below, both parties agree to the terms and responsibilities outlined in this Data Controller & Processor Agreement.

### School (Data Controller)

**Authorized Signatory:**  
Name: ___________________________________  
Title: ___________________________________  
School: ___________________________________  
Date: ___________________________________  
Signature: ___________________________________

### App Provider (Data Processor)

**Authorized Signatory:**  
Name: ___________________________________  
Title: ___________________________________  
Organization: [Your Organization Name]  
Date: ___________________________________  
Signature: ___________________________________

---

## Appendix: Definitions

**Data Controller:** The school; determines the purposes and means of data processing.  
**Data Processor:** The app provider; processes data on behalf of the controller.  
**Personal Data:** Information related to an identified or identifiable person.  
**Processing:** Any operation performed on data (collection, storage, retrieval, use, deletion).  
**Data Subject:** An individual whose personal data is processed (student, teacher, admin).  
**Breach:** Unauthorized or accidental destruction, loss, or disclosure of data.  
**GDPR:** General Data Protection Regulation (EU Regulation 2016/679).  
**UK DPA 2018:** UK Data Protection Act 2018.  
**ICO:** Information Commissioner's Office (UK regulator).

---

**Version:** 1.0  
**Effective:** May 2026  
**Next Review:** May 2027
