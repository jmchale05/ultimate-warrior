# Data Breach Response Plan

**Ultimate Warrior Challenges**  
**Effective: May 2026**

---

## 1. Purpose

This document defines the procedures for detecting, reporting, and remediating personal data breaches in compliance with GDPR Article 33 and UK Data Protection Act 2018.

**Definitions:**
- **Personal Data Breach:** Unauthorized or accidental destruction, loss, alteration, or disclosure of personal data.
- **Likelihood of Risk:** A breach that could result in physical, material, or non-material damage to individuals (e.g., identity theft, discrimination, financial loss, reputational harm).

---

## 2. Breach Detection and Classification

### 2.1 Types of Breaches

| Breach Type | Examples | Risk Level |
|---|---|---|
| **Unauthorized Access** | Hacker gains access to student data; teacher credentials compromised | High |
| **Data Loss** | Database accidentally deleted; backup corruption | High |
| **Unauthorized Disclosure** | Student data emailed to wrong recipient; data publicly exposed | High |
| **Accidental Deletion** | Teacher/admin permanently deletes data without authorization | High/Medium |
| **Malware/Ransomware** | Malicious software encrypts or exfiltrates data | High |
| **Insider Threat** | Employee/admin accesses or modifies data improperly | High/Medium |
| **Configuration Error** | Firebase rules misconfigured, allowing public access | High |
| **Physical Loss** | Device with cached data is stolen; unsecured printouts lost | Medium |

### 2.2 Risk Assessment

Upon discovery of a potential breach, assess the likelihood of risk to individuals:

- **High Risk:** Data includes names, ages, emails, photos, health/fitness data, or consent records. Individuals could face identity theft, discrimination, or stigmatization.
- **Medium Risk:** Data is partially identifiable or aggregated (e.g., campaign results without names).
- **Low Risk:** Encrypted data with strong security; breach does not expose sensitive identifiers.

**Decision:** If **High or Medium Risk**, proceed to Notification (Section 3).  
If **Low Risk**, document and monitor (Section 4).

---

## 3. Breach Notification Procedure

### 3.1 Timeline

| Action | Deadline |
|---|---|
| **Detect and Classify** | Immediately upon discovery |
| **Internal Notification** | Within 24 hours |
| **Authority Notification (ICO)** | Within 72 hours of becoming aware (unless low risk) |
| **Data Subject Notification** | Without undue delay (within 72 hours or as soon as safe) |
| **Documentation** | Within 10 days |

### 3.2 Step 1: Internal Notification (24 hours)

**Who to notify:**
- App admins
- School safeguarding lead (if student data involved)
- Data controller (e.g., school principal, organization leadership)

**What to include:**
- Description of the breach (what, when, how discovered).
- Data affected (type, number of individuals, sensitivity).
- Preliminary risk assessment (High/Medium/Low).
- Initial containment steps taken.
- Contact for further information.

**Communication method:** Email or secure messaging (not public channels).

### 3.3 Step 2: Containment (Immediate)

**Actions to take within 1–4 hours:**

1. **Isolate:** If still ongoing, disable affected accounts, rotate compromised credentials, revoke API keys.
2. **Secure:** Patch vulnerabilities, update Firebase rules, reset access codes.
3. **Preserve:** Do not delete evidence; preserve logs, backups, and access records for investigation.
4. **Assess:** Determine the scope (how many users, which data, how long exposed).

**Example responses:**
- Compromised teacher account: Reset password, revoke sessions, audit data access.
- Public data exposure: Change Firebase rules to restrict access, delete cached copies.
- Ransomware: Isolate infected systems, restore from clean backup, engage security professionals.

### 3.4 Step 3: Authority Notification (within 72 hours)

**Who:** ICO (UK) or relevant EU data protection authority.

**Method:** 
- Online form or email: https://ico.org.uk/make-a-report/
- Email templates available below.

**What to include:**

1. **Contact Details:**
   - Organization name and contact.
   - Data controller (school or organization).
   - Data Protection Officer (if designated).

2. **Breach Description:**
   - Date of the breach and date of discovery.
   - Description: what happened, how long exposure lasted.
   - Cause (if known): e.g., misconfigured rules, compromised credentials, malware.

3. **Data Affected:**
   - Categories of personal data (e.g., names, ages, results).
   - Categories of data subjects (students, teachers, admins).
   - Estimated number affected.
   - Sensitivity (e.g., whether student photos or health data involved).

4. **Impact Assessment:**
   - Likelihood of harm to individuals (e.g., identity theft, discrimination).
   - Risk mitigation steps taken.

5. **Contact:** Name and phone/email for ICO follow-up.

**Example Email Template:**

```
To: casework@ico.org.uk
Subject: Personal Data Breach Notification – Ultimate Warrior Challenges

Dear ICO,

This email notifies a personal data breach affecting students and teachers in UK schools.

Organization: [Your Organization]
Data Controller: [School/Organization]
Contact: [Your name, email, phone]
Breach Date: [Date discovered]

Breach Description:
On [date], we discovered that [describe breach]. The breach occurred due to [cause]. 
Approximately [number] individuals were affected.

Data Affected:
- Categories: Student names, ages, school year, campaign results, photos
- Data Subjects: [Number] students and [number] teachers
- Severity: High – includes identifiable student information

Impact:
Students could face identity theft or profiling risk. Results are now secured and 
individuals will be notified.

Mitigation:
- Accessed accounts have been disabled or passwords reset.
- Firebase security rules have been updated to prevent further exposure.
- We are investigating the root cause.

We will provide a full incident report within 10 days.

Regards,
[Your name and title]
```

### 3.5 Step 4: Data Subject Notification (without undue delay)

**Who:** All individuals whose data was breached.

**Method:** Email or direct contact (whichever is most practical and secure).

**What to include:**

1. **Clear Description:** What happened in non-technical language.
2. **Data Affected:** What data is involved (names, results, etc.).
3. **Timeline:** When the breach occurred and when discovered.
4. **Measures Taken:** What you've done to stop the breach and secure the data.
5. **Recommended Actions:** What individuals should do (e.g., change passwords, monitor accounts).
6. **Contact:** Where to ask questions (support email, phone).
7. **Rights:** Link to the privacy notice and data subject rights guide.

**Example Email Template:**

```
Subject: Important Security Notice – Ultimate Warrior Challenges Data Breach

Dear [Name/Parent/Guardian],

We are writing to inform you of a security incident affecting Ultimate Warrior Challenges 
that may have exposed your or your child's personal data.

What Happened:
On [date], we discovered unauthorized access to [describe affected system]. 
This access may have exposed the following information:
- Names, ages, and year groups
- Campaign results (distances logged)
- Profile photos
- School names

What We Did:
- We immediately secured the affected system and reset all passwords.
- We reviewed access logs to determine the scope of the breach.
- We are cooperating with law enforcement (if applicable).
- We will implement additional security measures to prevent this in future.

What You Should Do:
- If you have a password, change it immediately and use a strong, unique password.
- Monitor your email and personal information for suspicious activity.
- Be cautious of phishing emails asking for your details.
- Contact your bank if you have concerns about financial fraud.

Your Rights:
You have the right to:
- Request a copy of the data we hold about you.
- Request correction or deletion of inaccurate data.
- Lodge a complaint with the ICO: https://ico.org.uk/

Questions?
Please contact support@tuwc.online or call [phone]. We are available [hours].

Regards,
[Organization] Team
```

---

## 4. Investigation and Documentation

### 4.1 Investigation Steps (within 10 days)

1. **Root Cause Analysis:**
   - How did the breach occur? (e.g., weak credentials, misconfigured rules, phishing)
   - How long was the data exposed?
   - What data was accessed?

2. **Scope Assessment:**
   - Total number of individuals affected.
   - Categories of data involved.
   - Whether other systems are at risk.

3. **Forensic Review:**
   - Review access logs and Firebase audit trails.
   - Identify unauthorized access patterns.
   - Check for data exfiltration or unauthorized modifications.

4. **Corrective Actions:**
   - Technical fixes (update rules, patch vulnerabilities, rotate credentials).
   - Process changes (e.g., require MFA, enforce stricter password policies).
   - Training for staff (e.g., phishing awareness).

### 4.2 Incident Report (within 10 days)

Document the breach with:

**Report Contents:**
1. **Executive Summary:** What happened and impact.
2. **Breach Details:** Date, discovery method, duration, cause.
3. **Data Affected:** Categories and number of individuals.
4. **Investigation Findings:** Root cause, scope, forensic evidence.
5. **Impact Assessment:** Likelihood of harm to individuals.
6. **Response Actions:** Notifications sent, technical fixes, process changes.
7. **Lessons Learned:** How to prevent similar breaches.
8. **Recommendations:** Additional security improvements.

**Storage:** Incident reports are retained for **3 years** for regulatory and safeguarding purposes.

---

## 5. Low-Risk Breaches (No Notification Required)

If a breach is classified as Low Risk (unlikely to cause harm), you may choose not to notify individuals, but you must:

1. **Document:** Keep records of the breach, assessment, and why notification was not required.
2. **Report to Authority:** Some breaches (even low risk) must still be reported to the ICO if they reflect systemic issues.
3. **Review:** Periodically reassess whether circumstances have changed.

**Example:** A breach of encrypted, anonymized, or non-sensitive data with strong compensating controls.

---

## 6. Role and Responsibilities

| Role | Responsibility |
|---|---|
| **App Admin** | Detects breaches, classifies risk, coordinates response. |
| **School Safeguarding Lead** | Notified of student-data breaches; advises on safeguarding implications. |
| **Data Controller** | Authorizes authority and individual notifications; ensures compliance. |
| **Data Protection Officer** | Oversees investigation and documentation; ensures GDPR compliance. |
| **IT/Security Team** | Performs forensics, applies technical fixes, secures evidence. |
| **Communications** | Drafts and sends individual notifications; manages external inquiries. |

---

## 7. Breach Prevention and Resilience

### 7.1 Prevention Measures

- **Access Control:** Implement role-based rules; require strong passwords; enable MFA for admins.
- **Encryption:** Encrypt data in transit (TLS) and at rest (Firebase encryption).
- **Monitoring:** Review access logs monthly; alert on unusual patterns.
- **Updates:** Keep Firebase and dependencies current; patch vulnerabilities promptly.
- **Backups:** Maintain encrypted backups offline; test restore procedures quarterly.

### 7.2 Resilience Measures

- **Incident Response Team:** Designate clear leads for detection, investigation, and communication.
- **Communication Plan:** Pre-draft templates and establish escalation paths.
- **Training:** Conduct annual data protection training for all staff.
- **Testing:** Run tabletop exercises annually to practice breach response.

---

## 8. Contacts and Escalation

### 8.1 Internal Escalation

1. **Discovery:** Report to App Admin immediately.
2. **Assessment:** App Admin consults with Data Protection Officer or legal.
3. **Decision:** Data Controller approves response plan.
4. **Notification:** Admin notifies ICO and data subjects per timeline.

### 8.2 External Contacts

| Contact | Role | Email/Phone |
|---|---|---|
| **ICO (UK)** | Regulator | casework@ico.org.uk, 0303 123 1113 |
| **School Safeguarding Lead** | Local escalation | [School-specific contact] |
| **Google Support** | Firebase emergencies | https://cloud.google.com/support |
| **Police** | If criminal activity | https://www.police.uk/ |

---

## 9. Record Keeping

All breach records must be retained for **3 years**, including:
- Breach description and discovery method.
- Risk assessment and decision rationale.
- Notifications sent (emails, dates).
- Incident report and investigation findings.
- Corrective actions taken.

---

## 10. Review and Update

This plan is reviewed:
- **Annually** or after a significant breach.
- When GDPR, UK DPA, or school policies change.
- When new threats or vulnerabilities emerge.

Updates are communicated to all stakeholders.

---

**Plan Owner:** [Your name/title]  
**Last Reviewed:** May 2026  
**Next Review:** May 2027
