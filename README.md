# OakCrest Academy

Home learning hub: math, music, arts, science and tech, with a learning log.

Open it: https://prinzsunny.github.io/oakcrest/

Progress is kept in each device's browser (localStorage) and, when a parent signs in, mirrored to the family's private Firestore account (`assets/cloud.js`). Nothing personal is stored in this repository.

- **Portfolio** (`portfolio/`): a printable record with dates: skills shown (and which are ahead of the learner's age), Soroban milestones, time by subject, artwork and parent observations.
  - Work samples (photos and voice clips) are kept in the device's IndexedDB only: too big to sync, and not in the JSON backup. Print the portfolio to keep them.
  - **Skill check** (`portfolio/check/`): a guided 10-minute session for a grown-up, one skill at a time.
  - **Email weekly summary** opens the parent's mail app with the week's time, plan, new skills and next steps.
- **Plan first** (`assets/oc.js`): today's plan is done in order and carries over until finished; Soroban stops after a 5-minute warm-up and later steps stay locked until the current one is done. Settings on the Plan page can also lock every other page.
- **Parent PIN** (`OC.parent`): grown-up actions (ticking offline steps, unlocking, the Plan page, the skill check) ask for a PIN, stored as a hash and synced. "Forgot the PIN?" signs in with Google again.
- **Brain teaser** (`math/teaser/`): five picture puzzles a day, part of the daily plan, getting harder after a perfect day.
- **Backup / Restore** (on the Learning log page): saves every OakCrest key on the device to one JSON file, and can put it back.
- **Offline** (`sw.js`): pages opened once keep working without internet; updates show as soon as the device is online.

## Checking the site

```
npm i --no-save puppeteer-core@19
node tools/smoke.cjs            # every page
node tools/smoke.cjs math       # pages under one folder
```

Opens each page in headless Chrome (signed in with a fake family account) and lists script errors, missing files and blank pages. It also fills the portfolio with sample data and checks what it shows.
