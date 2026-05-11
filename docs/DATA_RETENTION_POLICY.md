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
| Student name, age, year group | During enrollment + 12 months | Campaign completion, safeguarding records |
| Student profile photo | During enrollment + 12 months | Identity and progress documentation |
| Campaign results (miles, dates) | During enrollment + 12 months | Progress tracking, achievement records |
| Student authority consent record | During enrollment + 24 months | Lawful-basis evidence |
| Deletion requests (pending/approved) | 24 months after closure | Audit trail, safeguarding |

**Trigger for Deletion:**
- Teacher requests student deletion in the App.
- Admin reviews and approves the deletion request.
- Deletion is executed immediately; data is permanently removed within 7 days.
- Deletion request record is retained for 24 months.

**Exception:** If a safeguarding investigation is ongoing, data may be retained beyond the standard period per school's safeguarding policy.

---

### 3.2 Teacher Data

| Data Element | Retention | Reason |
|---|---|---|
| Email, name, role | While active + 24 months | Access logs, audit trails, accountability |
| Privacy consent record | While active + 24 months | Lawful-basis evidence |
| Student authority consent (on behalf of students) | While active + 24 months | Evidence of authority over student data |
| Profile photo | While active + 24 months | Identity and communications |
| Classes, challenges, results created by teacher | While active + 24 months | Historical records, audit |

**Trigger for Deletion:**
- Teacher leaves school or opts out of the App.
- School admin or the data subject requests account deletion.
- Account is marked inactive; data is retained for 24 months.
- After 24 months, account and associated metadata are permanently deleted.

**Exception:** If the teacher is involved in a data-related investigation or safeguarding matter, retention may be extended per school directive.

---

### 3.3 Admin Data

| Data Element | Retention | Reason |
|---|---|---|
| Email, name, admin credentials | While active + 24 months | Access logs, audit trails, accountability |
| Privacy consent record | While active + 24 months | Lawful-basis evidence |
| Deletion request approvals (reviewer name, timestamp, decision) | 24 months | Audit trail, evidence of review |
| Data access logs (if audited) | While active + 24 months | Compliance verification |

**Trigger for Deletion:**
- Admin leaves organization or role.
- Data is retained for 24 months per organizational policy.
- After 24 months, admin account is permanently deleted.

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
| Signup consent (version, timestamp) | 24 months post-account closure | Lawful-basis evidence, regulatory proof |
| Student authority consent (version, timestamp) | 24 months post-account closure | Evidence of authority, GDPR compliance |
| Deletion request records | 24 months | Safeguarding investigation trail |
| Admin review logs | 24 months | Accountability and audit |

---

### 3.6 Platform Logs and Backups

| Data Element | Retention | Reason |
|---|---|---|
| Firebase access logs | 90 days (Google default) | Security monitoring |
| Incremental backups | 30 days | Disaster recovery |
| Full database backups | 24 months | Legal hold, compliance, recovery |

---

## 4. Deletion Procedures

### 4.1 Student Deletion (Teacher-Initiated)

1. **Request:** Teacher opens the student row in the Campaigns page and clicks the delete action.
2. **Reason:** Teacher provides a reason for deletion (minimum 10 characters). Reasons are recorded.
3. **Workflow:** Deletion request is created with status "pending" and stored in the `studentDeletionRequests` collection.
4. **Notification:** An email is sent to all App admins notifying them of the pending request.
5. **Admin Review:** Admin opens the Admin Dashboard, reviews the pending request (student name, reason, requesting teacher), and clicks "Approve" or "Decline."
6. **Execution:** 
   - If approved: `deleteStudentWithCleanup()` is called, which removes the student profile and all associated results within 7 days.
   - If declined: Request status is marked "rejected" and the teacher is notified.
7. **Record Retention:** The deletion request record is retained for 24 months for audit.

### 4.2 Teacher Account Deletion

1. **Request:** Teacher contacts support@tuwc.online requesting account closure.
2. **Verification:** Support verifies teacher identity and school authorization.
3. **Notification:** Admin is notified; App admins are responsible for deciding whether to delete associated student data or archive it.
4. **Execution:** Teacher account is marked inactive. Associated data is retained for 24 months, then automatically deleted (or archived per school policy).
5. **Record:** Deletion is logged with timestamp and approver identity.

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
- **Full backups** are retained for 24 months in case of catastrophic data loss or legal hold.
- Backups are encrypted and stored in Google Cloud secure storage.
- Restore from backup must be justified (e.g., ransomware attack, accidental deletion) and approved by App admins.

---

## 7. Compliance Monitoring

- **Quarterly Review:** App admins review deletion request logs and pending data to ensure retention periods are being followed.
- **Annual Audit:** The data retention policy is audited annually to ensure continued compliance with GDPR, UK DPA 2018, and school policies.
- **Breach Response:** If unauthorized deletion or data loss is discovered, the incident is logged, investigated, and reported per the [Data Breach Response Plan](BREACH_RESPONSE.md).

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

## Appendix: Automated Deletion Schedule

The following automated processes run on the App:

- **Weekly Check:** Checks for deletion requests approved more than 7 days ago and removes data.
- **Monthly Check:** Checks for accounts marked inactive more than 24 months ago and removes metadata (except audit logs).
- **Quarterly Backup Cleanup:** Removes incremental backups older than 30 days.

All automated deletions are logged with timestamp and reason.
