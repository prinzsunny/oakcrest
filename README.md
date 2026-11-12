# OakCrest Academy

Home learning hub: math, music, arts, science and tech, with a learning log.

Open it: https://prinzsunny.github.io/oakcrest/

Progress is kept in each device's browser (localStorage) and, when a parent signs in, mirrored to the family's private Firestore account (`assets/cloud.js`). Nothing personal is stored in this repository.

- **Portfolio** (`portfolio/`): a printable record with dates: skills shown (and which are ahead of the learner's age), Soroban milestones, time by subject, artwork and parent observations.
- **Backup / Restore** (on the Learning log page): saves every OakCrest key on the device to one JSON file, and can put it back.
- **Offline** (`sw.js`): pages opened once keep working without internet; updates show as soon as the device is online.

## Checking the site

```
npm i --no-save puppeteer-core@19
node tools/smoke.cjs            # every page
node tools/smoke.cjs math       # pages under one folder
```

Opens each page in headless Chrome (signed in with a fake family account) and lists script errors, missing files and blank pages. It also fills the portfolio with sample data and checks what it shows.
