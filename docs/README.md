# GDPR Compliance Documentation

## Overview

This folder contains all the documentation needed for Ultimate Warrior Challenges to be GDPR-compliant. These documents support both the code-level security controls (implemented in Firestore rules, Storage rules, and data export features) and the organizational/operational aspects of GDPR compliance.

---

## Documents in This Folder

### 1. **PRIVACY_NOTICE.md** ⭐ User-Facing
**What it is:** The official privacy notice that explains to teachers, students, and parents what data is collected and why.

**Who needs to read it:** Everyone using the app; should be published on a public-facing website.

**What to do with it:**
- Customize the organization name, contact email, and addresses
- Have it legally reviewed before publication
- Publish to your website or in-app link
- Send to all schools and parents
- Link from the login page and app navigation ✅ (already linked in app)

**Key sections:**
- Overview and data controller contact
- What data is collected
- Legal basis for processing
- Who data is shared with
- Data security measures
- User rights (access, correction, deletion, etc.)
- Retention schedule
- Breach notification procedures

---

### 2. **DATA_RETENTION_POLICY.md** 📋 Operational
**What it is:** The detailed policy for how long data is retained and when/how it's deleted.

**Who needs to read it:** School admins, data protection leads, and legal teams.

**What to do with it:**
- Review and confirm the retention periods match your school's safeguarding policy
- Share with school leadership for formal adoption
- Train admins on the deletion workflow (students delete via request → admin approval → permanent removal)
- Ensure it's accessible to staff who handle data-subject requests

**Key sections:**
- Retention schedule for each data type (students, teachers, admins, consent records, etc.)
- Deletion procedures (student-initiated, teacher-initiated, data-subject requests)
- Backup and disaster recovery retention
- Compliance monitoring and audit schedule

**Automated processes:**
- Deletion requests approved >7 days ago are automatically executed
- Accounts inactive >24 months are automatically deleted
- Deletion request records and consent records are retained for audit

---

### 3. **DATA_SUBJECT_RIGHTS_GUIDE.md** 🔐 User-Facing
**What it is:** A guide for teachers, students, and parents explaining how to exercise their GDPR rights.

**Who needs to read it:** Data subjects (teachers, students, parents).

**What to do with it:**
- Publish to website or in-app
- Send to schools to share with parents and staff
- Reference in the app's Privacy page ✅ (already linked)
- Print as a one-page handout for staff

**Key sections:**
- Right of access (Subject Access Request) – request a copy of your data
- Right of correction – fix inaccurate data
- Right of erasure – request deletion
- Right to data portability – request data in portable format
- Right to restrict processing – pause processing
- Right to object – object to processing
- Right to lodge a complaint – escalate to ICO

**Tools available:**
- "Download my data" button in app ✅ (already implemented)
- Email support@tuwc.online for requests
- In-app Privacy page with contact info ✅ (already available)

---

### 4. **BREACH_RESPONSE_PLAN.md** 🚨 Operational
**What it is:** The procedure for detecting, reporting, and responding to data breaches.

**Who needs to read it:** App admins, school safeguarding leads, and anyone who might discover a breach.

**What to do with it:**
- Share with admins and brief them on the escalation path
- Train staff on what constitutes a breach and how to report it
- Print and post the emergency contacts
- Run a tabletop exercise annually to practice the response

**Key sections:**
- Breach types and risk classification
- Timeline and escalation (24 hours → internal notification; 72 hours → ICO notification)
- Investigation steps and documentation
- Notification templates for individuals and the ICO
- Post-breach remediation and lessons learned

**Key timelines:**
- Detect and classify: Immediately
- Notify internally: Within 24 hours
- Notify ICO: Within 72 hours
- Notify data subjects: Without undue delay (72 hours if high risk)
- Document incident: Within 10 days

---

### 5. **GDPR_COMPLIANCE_CHECKLIST.md** ✅ Implementation Guide
**What it is:** An actionable checklist with status, next steps, and a roadmap to full GDPR compliance.

**Who needs to read it:** Project leads, school data leads, and compliance teams.

**What to do with it:**
- Print and track progress
- Assign owners to each task
- Use as a project plan for the next 3 months
- Review quarterly

**Key phases:**
- **Phase 1 (This Week):** Set up Firebase Storage, test the app, finalize documentation
- **Phase 2 (This Month):** Publish privacy notice, sign school agreements, train staff, document lawful basis
- **Phase 3 (3 Months):** Formal audit, DPIA, appoint DPO, establish governance committee
- **Phase 4 (Ongoing):** Quarterly reviews, annual audits, regulatory monitoring

**Compliance scorecard:**
- Current status: 3/5 (code complete; organizational/legal pieces pending)
- High-risk gaps: Firebase Storage setup, legal review, school agreements
- Medium-risk gaps: DPIA, staff training, public privacy notice
- Low-risk gaps: DPO appointment, audit trails

---

### 6. **DATA_CONTROLLER_PROCESSOR_AGREEMENT.md** 🤝 Legal
**What it is:** A formal agreement between the school (data controller) and app provider (data processor) clarifying roles and responsibilities.

**Who needs to read it:** School principals, app admins, and legal teams.

**What to do with it:**
- Customize with your organization name, addresses, and contact info
- Have it reviewed by legal counsel
- Have school principals sign it
- Keep copies for regulatory reference
- Update if processing changes

**Key sections:**
- Parties and roles (school = controller, app = processor)
- Data processed and categories of data subjects
- Purpose and legal basis for processing
- Responsibilities of each party
- Data subject rights procedures
- Retention and deletion schedules
- Security measures
- Breach notification procedures
- Audit and compliance rights
- Subprocessors (Google Firebase, Cloud Storage, etc.)
- Term, termination, and data handling after termination

**Signature line:**
- School authorized signatory (e.g., principal)
- App provider authorized signatory

---

## How to Use These Documents

### For Implementation (Next 3 Months)

1. **Week 1:**
   - [ ] Customize all documents with your organization details
   - [ ] Set up Firebase Storage and deploy storage rules
   - [ ] Test data export and deletion workflows in the app

2. **Week 2:**
   - [ ] Have PRIVACY_NOTICE.md reviewed by legal counsel
   - [ ] Publish privacy notice to website and in-app
   - [ ] Create a DATA_CONTROLLER_PROCESSOR_AGREEMENT signed copy

3. **Week 3:**
   - [ ] Send Privacy Notice and Data Retention Policy to all schools
   - [ ] Train app admins on Breach Response Plan
   - [ ] Distribute DATA_SUBJECT_RIGHTS_GUIDE to staff and parents

4. **Month 2:**
   - [ ] Get school principals to sign the controller/processor agreement
   - [ ] Conduct a formal DPIA (Data Protection Impact Assessment)
   - [ ] Appoint a Data Protection Officer or governance lead

5. **Month 3:**
   - [ ] Conduct a compliance audit
   - [ ] Document lawful basis for each data type
   - [ ] Establish a governance committee and review schedule

### For Ongoing Compliance (Quarterly and Annual)

- **Quarterly:** Review deletion request logs, check access logs, update incident register
- **Annual:** Re-run DPIA, update policies if GDPR guidance changes, conduct staff training, test breach response

### If a Data Breach Occurs

1. Open **BREACH_RESPONSE_PLAN.md**
2. Follow the timeline and escalation procedure
3. Use the notification templates
4. Document everything and retain for 3 years

### If a Data Subject Makes a Request (Access, Deletion, Correction, etc.)

1. Open **DATA_SUBJECT_RIGHTS_GUIDE.md**
2. Follow the procedure for the request type
3. Meet the deadline (30 days for access/deletion, 10 days for others)
4. Document the request and outcome

---

## Key Timelines at a Glance

| Task | Deadline |
|---|---|
| Firebase Storage setup | This week |
| Privacy Notice published | 2 weeks |
| Staff trained on breach response | 2 weeks |
| Data Controller Agreement signed | 3 weeks |
| DPIA completed | 1 month |
| Subject Access Request responded to | 30 days |
| Deletion Request approved/executed | 30 days (review), 7 days (execution) |
| Breach reported to ICO | 72 hours |
| Breach notification to individuals | 72 hours (if high risk) |
| Data subject request responded to | 10–30 days (depends on type) |

---

## FAQ

### Q: Do I need all these documents?
**A:** Yes. GDPR requires a documented, transparent approach. These documents demonstrate accountability. Together they cover transparency (Privacy Notice), retention (Retention Policy), rights (Subject Rights Guide), incident management (Breach Plan), implementation (Checklist), and roles (Controller/Processor Agreement).

### Q: Can I skip the legal review?
**A:** Not recommended. Have at least the Privacy Notice and Controller/Processor Agreement reviewed by a data protection lawyer before publication. A breach due to non-compliance could result in ICO enforcement and fines up to £17.5 million or 4% of global revenue.

### Q: Do teachers/students need to read all these documents?
**A:** No. 
- **Teachers/Admins:** Focus on the Privacy Notice, Data Subject Rights Guide, and parts of the Retention Policy relevant to their role
- **Students/Parents:** Focus on the Privacy Notice and Data Subject Rights Guide
- **Data Protection Lead:** Read everything
- **Legal/Governance:** Read everything, especially Controller/Processor Agreement and DPIA

### Q: What if I disagree with a retention period?
**A:** Modify the retention policy to match your school's safeguarding and data governance needs, but ensure that deletions still happen within reasonable periods. GDPR requires data minimization (keep only what's necessary) and defines retention as a principle. Very long retention (e.g., 5 years) would need strong justification (e.g., ongoing legal hold, statutory requirement).

### Q: How often should these documents be reviewed?
**A:** 
- After any significant change in the app (new features, data types, processing purposes)
- If GDPR guidance or UK DPA 2018 is updated
- If a breach or compliance issue is discovered
- At minimum, annually

### Q: What if a school wants to add custom terms?
**A:** The Controller/Processor Agreement can be customized. Both parties should discuss and agree on any additional clauses regarding liability, indemnification, fees, or specific security requirements. Ensure changes don't contradict GDPR principles.

---

## Support and Contacts

**For questions about these documents:**  
Email: support@tuwc.online

**For GDPR regulatory inquiries:**  
- UK: https://ico.org.uk/
- EU: Contact your national data protection authority

**For legal advice:**  
Consult an employment/data protection lawyer familiar with GDPR and UK education regulations.

---

## Document Versions

| Document | Version | Last Updated | Next Review |
|---|---|---|---|
| Privacy Notice | 2026-05 | May 2026 | May 2027 |
| Data Retention Policy | 1.0 | May 2026 | May 2027 |
| Data Subject Rights Guide | 1.0 | May 2026 | May 2027 |
| Breach Response Plan | 1.0 | May 2026 | May 2027 |
| GDPR Compliance Checklist | 1.0 | May 2026 | May 2027 |
| Controller/Processor Agreement | 1.0 | May 2026 | May 2027 |

---

**Created:** May 2026  
**Status:** Ready for implementation  
**Owner:** [Your name/title]
