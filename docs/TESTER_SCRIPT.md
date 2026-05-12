# Ultimate Warrior Challenges — Web App Testing Script

**URL:** [fill in your Vercel/hosted URL]
**Date:** May 2026
**Prepared for:** QA Tester

---

## What is Ultimate Warrior Challenges?

Ultimate Warrior Challenges is a Roman-themed fitness tracking web app for schools. Students run miles in real life, unlock Roman Empire campaigns, and progress through 12 historical storylines. Teachers manage their class of students via the web app. Admins oversee all schools, teachers, and students globally.

There are **three roles** in the system:

- **Admin** — Full control over all schools, teachers, and students across the platform
- **Teacher** — Manages students and logs miles for their assigned school
- **Student** — Tracked by teachers; students interact through a separate desktop app, not this web app

---

## Access Codes

| Role | Code | Notes |
|------|------|-------|
| Admin signup | `ADMIN0E3FCD` | Used to create a new admin account |
| Teacher signup | *(visible in the Access Code column of the Schools table on the admin dashboard)* | Each school has its own unique code |

---

## The Admin Dashboard (`/admin`)

Admins land here after signing in. The top shows four summary cards: total Schools, Teachers, Students, and Miles run across the platform.

Below that is the **Schools table**, which lists every school with columns for name, access code, days into the campaign, number of classes, teachers, students, total miles, average miles per student, and how many students have completed the challenge (reached 78 miles).

The **⋮ (three dot) Actions menu** on each school row has two options:
- **Edit** — opens the school form pre-filled with the current details
- **Delete** — asks for confirmation before removing the school

The **+ Add School** button opens a form for creating a new school. Schools require a name and type (Primary School or Secondary School). The type determines which year groups are available when adding students — **Year 1–6** for Primary, **Year 7–11** for Secondary.

The **+ Add Student** button lets admins directly add students to any school.

At the bottom of the page, a **Deletion Requests** section shows any students that teachers have flagged for removal. Each request can be approved or rejected. If there are no pending requests, this section is hidden entirely.

---

## The Campaigns Page (`/campaigns`)

Teachers land here after signing in. It shows a table of all students in the teacher's school.

Each student row displays: name, Roman nickname, year group, current campaign, total miles, and a rank badge. The **⋮ actions menu** on each row allows editing a student's details or submitting a deletion request.

There is a **search bar** to filter students by name and a **sort dropdown** to order by name, miles, or campaign.

The first time a teacher tries to add a student, a one-time **data authority consent modal** appears. This confirms the teacher has parental/guardian consent to manage student data on the platform.

---

## Campaigns & Progression

There are 12 campaigns students unlock as they accumulate miles:

| # | Name | Miles Required |
|---|------|---------------|
| 1 | The Beginning | 0 |
| 2 | The Foundations | 1 |
| 3 | The Emperor | 3 |
| 4 | The Legion | 6 |
| 5 | The Empire | 10 |
| 6 | The Hero | 15 |
| 7 | The Wall | 21 |
| 8 | The Restorer of The World | 28 |
| 9 | The Enemy | 36 |
| 10 | The Gladiator | 45 |
| 11 | The Fall of Rome | 55 |
| 12 | The Voice of Rome | 66 |

The challenge is considered **complete** at 78 miles. The campaign runs over **200 business days**.

---

## Authentication

Sign-up requires an **access code** to determine whether the account is an admin or teacher. The code is validated before the email/password form is submitted. Invalid codes show an error immediately.

A **Forgot Password** link is available on the sign-in screen. Password resets are sent by email.

Role-based routing is enforced — admins are always sent to `/admin`, teachers to `/campaigns`.

---

## Not Yet Live

- **Oracle / Analytics page** — visible in the nav but currently a placeholder
- **Student desktop app** — a separate application; students do not use this web app
- **Mobile view** — the app is desktop-only; a block screen is shown on small screens

---

*For questions, contact the development team.*
