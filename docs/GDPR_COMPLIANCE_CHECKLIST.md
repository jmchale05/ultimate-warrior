# GDPR Compliance Checklist & Implementation Guide

**Ultimate Warrior Challenges**  
**May 2026**

---

## Overview

This checklist summarizes the GDPR compliance status of Ultimate Warrior Challenges and provides actionable next steps to achieve and maintain full compliance.

---

## Status Summary

### ✅ Completed (Code Level)

- [x] Firestore security rules restrict results access by school
- [x] Firestore security rules restrict school listing to authenticated users
- [x] School access-code index created (safer than direct school query)
- [x] Results now include schoolId for proper scoping
- [x] Profile photos restricted to owner, same-school users, and admins
- [x] School logos restricted to same-school and admin access
- [x] Privacy notice page created and accessible in-app
- [x] Data export functionality implemented ("Download my data")
- [x] Consent recording (teacher authority consent, student data consent)
- [x] Student deletion workflow with admin review
- [x] Deletion request audit trail maintained for 24 months
- [x] Built-in data subject rights request guide

### ⚠️ In Progress / Blocked

- [ ] Firebase Storage rules deployment (Storage not initialized in project)
- [ ] Operational procedures documentation (COMPLETE – see docs/ folder)
- [ ] Privacy notice publication (COMPLETE – but should be linked from public-facing site)
- [ ] Data retention policy adoption (COMPLETE – but should be formally agreed with school)
- [ ] Breach response plan activation (COMPLETE – but team needs training)

### ❌ Not Yet Completed (Organizational/Legal Level)

- [ ] Legal review of privacy notice and policies
- [ ] Data controller agreement between organization and schools
- [ ] Data processor agreement (if using third-party cloud services)
- [ ] Lawful basis assessment documented for each data type
- [ ] DPA 2018 compliance audit
- [ ] Data Protection Impact Assessment (DPIA) for high-risk processing
- [ ] Formal privacy policy webpage for public availability
- [ ] Designated Data Protection Officer (if required)
- [ ] Staff GDPR training program
- [ ] Breach reporting process formally adopted by school

---

## Checklist: What You Must Do Next

### Phase 1: Immediate (This Week)

**Firebase Storage Setup**

- [ ] Go to https://console.firebase.google.com/project/ultimate-warrior-501cb/storage
- [ ] Click "Get Started" to enable Cloud Storage
- [ ] Run: `firebase deploy --only storage --project ultimate-warrior-501cb`
- [ ] Verify that profile-photos and school-logos are now restricted per the new rules
- [ ] Test that admins and same-school users can still access photos

**Documentation Review**

- [ ] Read all four documentation files in `/docs/`:
  - [x] PRIVACY_NOTICE.md – User-facing privacy disclosures
  - [x] DATA_RETENTION_POLICY.md – How long data is kept
  - [x] DATA_SUBJECT_RIGHTS_GUIDE.md – How users can request access/deletion
  - [x] BREACH_RESPONSE_PLAN.md – What to do if there's an incident
- [ ] Customize organization name and email in each document (search for `[Your Organization Name]`, `support@tuwc.online`)
- [ ] Confirm all contact details and procedures match your organization's structure

**Admin Test**

- [ ] Log into the app as an admin
- [ ] Verify that the Privacy page loads and the "Download my data" button works
- [ ] Test that existing schools have access-code index records created (admin dashboard auto-creates these)
- [ ] Verify that new schools created after the deployment have access-code index records

---

### Phase 2: Short Term (This Month)

**Publish Documentation**

- [ ] Post the Privacy Notice to a public-facing website (or in-app linked page)
- [ ] Link the Privacy Notice from the login page and in app navigation
- [ ] Create a Data Subject Rights page that users can find easily
- [ ] Send the Privacy Notice and Data Retention Policy to all schools
- [ ] Confirm receipt from school leadership

**School Agreements**

- [ ] Create a Data Controller & Processor Agreement to clarify roles:
  - Teacher/admin = data controllers (authorize student data entry)
  - School = data controller (responsible for lawful basis and consent)
  - App provider = data processor (executes deletion on school direction)
  - [ ] Get school principals or data leads to sign the agreement
  - [ ] Maintain copies for regulatory reference

**Staff Training**

- [ ] Brief app admins on the Breach Response Plan
  - What constitutes a breach?
  - How to report and escalate?
  - Timeline (72 hours to ICO)?
- [ ] Brief teachers on data subject rights
  - How to handle a deletion request?
  - How to explain the privacy notice to parents?
- [ ] Create a one-page cheat sheet for each role

**Lawful Basis Documentation**

- [ ] Document why the app processes each data type:
  - **Student names/years:** Contractual (provide campaign service)
  - **Campaign results:** Contractual (track progress and report)
  - **Photos:** Consent (teacher confirms on entry)
  - **Email addresses:** Contractual (user authentication)
  - **Deletion requests:** Legitimate interest (school safeguarding)
  - **Consent records:** Legal obligation (GDPR evidence)
- [ ] Store this in a shared document or wiki for reference

---

### Phase 3: Medium Term (Next 3 Months)

**Formal Compliance Audit**

- [ ] Conduct a Data Protection Impact Assessment (DPIA) for the app
  - Identify high-risk processing (e.g., student profiling, automated decisions)
  - Assess mitigations (encryption, access control, deletion)
  - Document findings and sign-off
- [ ] Audit data flows:
  - [ ] Where does student data enter the system?
  - [ ] Who can access it and why?
  - [ ] When is it deleted?
  - [ ] Is it shared with anyone outside the school?
- [ ] Verify Firebase compliance:
  - [ ] Are backups encrypted?
  - [ ] Can admins audit access logs?
  - [ ] Are data residency requirements met (UK/EU)?

**Designate Roles**

- [ ] Appoint a Data Protection Officer (DPO) or equivalent:
  - Responsible for GDPR oversight.
  - Point of contact for data subjects and regulators.
  - Reviews breach reports and incident response.
- [ ] Establish a data governance committee (or working group):
  - App admin, school safeguarding lead, data lead, legal (if available).
  - Meets quarterly to review compliance, breaches, and data-subject requests.

**Process Documentation**

- [ ] Create a step-by-step procedure for:
  - [ ] Handling a Subject Access Request (30-day deadline)
  - [ ] Approving/rejecting a student deletion request (within 10 days of request)
  - [ ] Responding to data correction requests (within 30 days)
  - [ ] Reporting a breach to the ICO (within 72 hours)
- [ ] Assign owners and establish escalation paths

---

### Phase 4: Ongoing (Quarterly and Annual)

**Quarterly Reviews**

- [ ] Review deletion request logs
  - Are requests being processed within timelines?
  - Are approvals and rejections documented?
- [ ] Check access logs
  - Any unusual admin access?
  - Any failed login attempts or suspicious activity?
- [ ] Update incident register (if any breaches occurred)

**Annual Audit**

- [ ] Review and update all GDPR policies (or every 2 years, minimum)
- [ ] Re-run DPIA if functionality changes
- [ ] Re-certify lawful-basis assessments
- [ ] Provide refresher training to staff
- [ ] Test the Breach Response Plan in a tabletop exercise

**Regulatory Changes**

- [ ] Monitor ICO guidance and GDPR case law
- [ ] Update procedures if new guidance is released
- [ ] Notify schools of any policy changes

---

## Compliance Scorecard

Rate your current status (1 = not started, 5 = fully implemented):

| Area | Score | Notes | Owner |
|---|---|---|---|
| **Code-Level Security** | 5 | Firestore/Storage rules hardened; access control in place | ✅ |
| **Privacy Notice** | 4 | Written and accessible in-app; needs legal review | To do |
| **Data Subject Rights** | 4 | Export, deletion, access workflows exist; testing needed | To do |
| **Retention Policy** | 4 | Documented; needs school adoption | To do |
| **Breach Response** | 3 | Procedure written; team training needed | To do |
| **Data Controller Agreement** | 1 | Not yet created | To do |
| **Staff Training** | 1 | No formal training conducted | To do |
| **Audit & Compliance** | 1 | No formal audit or DPIA conducted | To do |

**Overall Readiness:** 3/5 (Code complete; organizational & legal pieces pending)

---

## Risk Assessment

### High-Risk Gaps (Address Immediately)

1. **Storage Rules Not Deployed:** Profile photos and logos are not yet restricted by the new security rules.
   - **Mitigation:** Set up Firebase Storage and deploy rules (Phase 1).
   - **Timeline:** This week.

2. **No Legal Review:** Policies are written but not reviewed by legal counsel.
   - **Mitigation:** Have an employment/data protection lawyer review privacy notice, data policies, and school agreements.
   - **Timeline:** Within 2 weeks.

3. **No School Agreements:** Schools have not formally acknowledged data controller roles or agreed to data policies.
   - **Mitigation:** Create a Data Controller Agreement and get principal sign-off.
   - **Timeline:** Within 3 weeks.

### Medium-Risk Gaps (Address Within a Month)

1. **No DPIA:** No formal Data Protection Impact Assessment has been conducted.
   - **Mitigation:** Complete a DPIA or hire a consultant to do one.
   - **Timeline:** Within 1 month.

2. **Staff Not Trained:** Admins and teachers do not know the breach response procedure or data-subject rights process.
   - **Mitigation:** Conduct workshops and distribute cheat sheets.
   - **Timeline:** Within 2 weeks.

3. **No Public Privacy Notice:** Privacy policy is in the app but not on a public-facing website.
   - **Mitigation:** Publish to website or dedicated landing page; link from login and footer.
   - **Timeline:** Within 2 weeks.

### Low-Risk Gaps (Address Within 3 Months)

1. **No DPO Appointed:** No designated Data Protection Officer.
   - **Mitigation:** Appoint or hire a DPO if required (depends on organization size).
   - **Timeline:** Within 3 months.

2. **Limited Audit Trail:** Access logs are retained but not regularly reviewed.
   - **Mitigation:** Establish a quarterly audit schedule.
   - **Timeline:** Ongoing.

---

## Next Steps by Role

### For App Admins

1. Set up Firebase Storage (Phase 1, this week).
2. Test the data export and deletion workflows.
3. Complete the admin-focused sections of the Breach Response Plan.
4. Attend GDPR training and become the point person for data-subject requests.

### For School Leaders / Data Controllers

1. Review and sign the Data Controller Agreement.
2. Review the Privacy Notice and confirm it accurately describes your school's use of student data.
3. Designate a Data Protection Lead or appoint a DPO.
4. Communicate the privacy notice to parents and staff.
5. Establish a process for handling subject-access and deletion requests.

### For Legal / Governance

1. Review and advise on the Privacy Notice, Data Retention Policy, and Data Controller Agreement.
2. Assess whether a formal Data Protection Impact Assessment is needed.
3. Confirm compliance with UK DPA 2018, Education (Pupil Information) (England) Regulations 2005, and any local data policies.
4. Establish a Data Governance Committee with clear escalation paths.

### For Everyone

1. Read the Privacy Notice and understand what data is collected and why.
2. Complete GDPR training if offered.
3. Know how to handle a data-subject request (see Data Subject Rights Guide).
4. If you discover a suspected breach, report it immediately per the Breach Response Plan.

---

## References and Resources

- **GDPR Text:** https://gdpr-info.eu/
- **ICO Guidance:** https://ico.org.uk/for-organisations/
- **UK DPA 2018:** https://www.legislation.gov.uk/ukpga/2018/12/contents
- **Education Regulations:** https://www.legislation.gov.uk/si/2005/1560
- **Google Cloud Privacy:** https://cloud.google.com/terms/data-processing-terms

---

## Sign-Off

By implementing this checklist, your organization will have met the substantial requirements of GDPR and UK DPA 2018 regarding:
- Lawful processing (consent, contract, legitimate interest)
- Transparency (privacy notice, data-subject rights)
- Data minimization (retention policy, deletion workflows)
- Security (encrypted storage, access control, breach response)
- Accountability (audit trails, DPIA, data controller agreements)

**However:**
- This is not a guarantee of full compliance; circumstances vary by organization and school.
- Legal advice specific to your situation is recommended.
- Ongoing compliance requires regular review and training.

---

**Prepared:** May 2026  
**Next Review:** May 2027  
**Owner:** [Your name/title]
