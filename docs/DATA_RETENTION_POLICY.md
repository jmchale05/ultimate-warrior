# Data Retention and Deletion Policy

**Ultimate Warrior Challenges**  
**Effective: May 2026**

---

## 1. Purpose

This policy defines how long personal data is retained by Ultimate Warrior Challenges and the procedures for safe and lawful deletion. It supports GDPR compliance, safeguarding responsibilities, and operational record-keeping.

---

## 2. Retention Principles

- **Minimize Storage:** We retain data only as long as necessary for its stated purpose.
- **Legal Compliance:** Retention periods account for school safeguarding records, audit trails, and regulatory obligations.
- **Subject Rights:** Data subjects retain the right to request early deletion, subject to legitimate interests (e.g., safeguarding investigation).
- **Transparency:** All retention periods are documented and disclosed to data subjects via the privacy notice.

---

## 3. Retention Schedule by Data Type

### 3.1 Student Data (Active Enrollment)

| Data Element | Retention | Reason |
|---|---|---|
| Student name, age, year group | During enrollment | Campaign completion and active administration |
| Student profile photo | During enrollment | Identity and progress administration |
| Campaign results (miles, dates) | During enrollment | Progress tracking and achievement |
| Student authority consent record | As required for lawful-basis evidence | Lawful-basis evidence |
| Deletion audit log (minimal pseudonymized metadata) | As required for safeguarding and audit | Audit trail, safeguarding |

**Trigger for Deletion:**
- Teacher requests student deletion in the App.
- Admin reviews and approves the deletion request.
- Student profile and campaign results are permanently deleted immediately when approval is processed.
- A minimal audit log is retained only as long as necessary for safeguarding and audit purposes (request ID, pseudonymized student reference, requester/reviewer IDs, decision, timestamps, and reason-provided flag).

**Exception:** If a safeguarding investigation is ongoing, data may be retained beyond the standard period per school's safeguarding policy.

---

### 3.2 Teacher Data

| Data Element | Retention | Reason |
|---|---|---|
| Email, name, role | While active, then as required | Access logs, audit trails, accountability |
| Privacy consent record | As required for lawful-basis evidence | Lawful-basis evidence |
| Student authority consent (on behalf of students) | As required for lawful-basis evidence | Evidence of authority over student data |
| Profile photo | While active, then as required | Identity and communications |
| Classes, challenges, results created by teacher | While active, then as required | Historical records, audit |

**Trigger for Deletion:**
- Teacher leaves school or opts out of the App.
- School admin or the data subject requests account deletion.
- Staff-account retention and deletion are handled manually outside the App according to school instructions and applicable safeguarding, legal, and audit obligations.

**Exception:** If the teacher is involved in a data-related investigation or safeguarding matter, retention may be extended per school directive.

---

### 3.3 Admin Data

| Data Element | Retention | Reason |
|---|---|---|
| Email, name, admin credentials | While active, then as required | Access logs, audit trails, accountability |
| Privacy consent record | As required for lawful-basis evidence | Lawful-basis evidence |
| Deletion request approvals (reviewer ID, timestamp, decision) | As required for accountability and audit | Audit trail, evidence of review |
| Data access logs (if audited) | As required for compliance verification | Compliance verification |

**Trigger for Deletion:**
- Admin leaves organization or role.
- Staff-account retention and deletion are handled manually outside the App according to applicable safeguarding, legal, and audit obligations.

---

### 3.4 School Data

| Data Element | Retention | Reason |
|---|---|---|
| School name, address, logo | Indefinite | School records are permanent |
| Access code | Indefinite | Account recovery, audit trail |
| Campaign start date | Indefinite | Campaign history |
| School-level deletion requests (count, approval rate) | Indefinite | School safeguarding history |

**Trigger for Deletion:**
- School closures are rare and require explicit, documented approval from school leadership and the App provider.
- Typically, schools are archived rather than deleted.

---

### 3.5 Consent and Audit Records

| Data Element | Retention | Reason |
|---|---|---|
| Signup consent (version, timestamp) | As required for lawful-basis evidence | Regulatory proof |
| Student authority consent (version, timestamp) | As required for lawful-basis evidence | Evidence of authority, GDPR compliance |
| Deletion request records | As required for safeguarding and audit | Safeguarding investigation trail |
| Admin review logs | As required for accountability and audit | Accountability and audit |

---

### 3.6 Platform Logs and Backups

| Data Element | Retention | Reason |
|---|---|---|
| Firebase access logs | 90 days (Google default) | Security monitoring |
| Incremental backups | 30 days | Disaster recovery |
| Full database backups | As required for disaster recovery and legal hold | Legal hold, compliance, recovery |

---

## 4. Deletion Procedures

### 4.1 Student Deletion (Teacher-Initiated)

1. **Request:** Teacher opens the student row in the Campaigns page and clicks the delete action.
2. **Reason:** Teacher provides a reason for deletion (minimum 10 characters). Reasons are recorded.
3. **Workflow:** Deletion request is created with status "pending" and stored in the `studentDeletionRequests` collection.
4. **Notification:** An email is sent to all App admins notifying them of the pending request.
5. **Admin Review:** Admin opens the Admin Dashboard, reviews the pending request (student name, reason, requesting teacher), and clicks "Approve" or "Decline."
6. **Execution:** 
   - If approved: `deleteStudentWithCleanup()` is called, which permanently deletes the student profile and associated results.
   - If declined: Request status is marked "rejected" and the teacher is notified.
7. **Record Retention:** A minimal deletion audit log is retained only as long as necessary for safeguarding and audit purposes.

### 4.2 Teacher Account Deletion

1. **Request:** Teacher contacts support@tuwc.online requesting account closure.
2. **Verification:** Support verifies teacher identity and school authorization.
3. **Handling:** Teacher-account retention and deletion are handled manually outside the App by the school and app provider.
4. **Execution:** Any deletion or anonymization action is carried out according to school instructions and applicable safeguarding, legal, and audit obligations.
5. **Record:** Manual decisions should be documented by the responsible controller or processor.

### 4.3 Data Subject Rights Requests (GDPR)

1. **Subject Access Request:** User emails support@tuwc.online or uses the "Download my data" button in the App.
2. **Verification:** Support verifies user identity.
3. **Compilation:** All data is compiled from Firestore (profile, school, results, consent records, deletion requests).
4. **Export:** Data is exported as JSON and delivered within 30 days.
5. **Record:** Request is logged with date, user, and delivery date.

### 4.4 Deletion on Data Subject Request

1. **Request:** User requests deletion by email with "Right to Erasure" in the subject line.
2. **Assessment:** Support evaluates whether data is subject to a legal hold, safeguarding investigation, or legitimate interest that would extend retention.
3. **Decision:** Support approves or declines, with reasoning, within 10 working days.
4. **Execution:** If approved, data is marked for deletion and removed within 30 days. Deletion request is logged.
5. **Confirmation:** User is notified of deletion completion.

---

## 5. Retention Override (Legitimate Interests and Legal Holds)

Data may be retained beyond the standard period if:

1. **Safeguarding Investigation:** A school safeguarding concern or law-enforcement investigation is ongoing. Retention is extended per the direction of the investigating authority.
2. **Litigation Hold:** Legal proceedings are underway. Data is retained per legal counsel's direction.
3. **Regulatory Audit:** A regulatory authority requests data. Data is retained per the authority's direction.
4. **School Policy:** The school's data retention or safeguarding policy specifies longer retention. This must be documented and communicated to data subjects.

**Record:** Any retention override must be logged with justification, approver, and expected end date.

---

## 6. Backup and Disaster Recovery

- **Incremental backups** are retained for 30 days for disaster recovery.
- **Full backups** are retained only as long as required for catastrophic data recovery or legal hold.
- Backups are encrypted and stored in Google Cloud secure storage.
- Restore from backup must be justified (e.g., ransomware attack, accidental deletion) and approved by App admins.

---

## 7. Compliance Monitoring

- This policy should be reviewed periodically by the responsible controller and app provider.
- If unauthorized deletion or data loss is discovered, the incident should be logged, investigated, and handled under the applicable breach-response process.

---

## 8. Roles and Responsibilities

| Role | Responsibility |
|---|---|
| **Teacher** | Initiates student deletion requests with appropriate reasons. Does not delete data directly. |
| **School Admin** | Reviews and approves/rejects student deletion requests. Manages school-level settings. |
| **App Admin** | Oversees platform-wide deletions, ensures retention policy compliance, responds to GDPR requests. |
| **Data Subject** | Can request access, correction, deletion, or portability at any time. |

---

## 9. Data Retention in the Privacy Notice

This retention policy is summarized in the App's Privacy Notice, which all users see at signup and can access anytime via the Privacy page. The Privacy Notice includes:

- Retention periods for each data type.
- Procedures for requesting deletion or access.
- Contact information for privacy requests.
- Reference to this full policy document.

---

## 10. Policy Updates

This policy is reviewed annually and updated if:
- GDPR, UK DPA 2018, or other relevant law changes.
- School safeguarding or data retention policies are updated.
- App functionality or data model changes.
- Incidents or audits reveal compliance gaps.

Changes are communicated to all data subjects via email and in-App notification.

---

## Appendix: Operational Notes

- Student profile/results deletion occurs when an approved deletion request is processed.
- Staff-account retention and deletion are handled manually outside the App.
- Manual deletion decisions should be documented by the responsible organization.
