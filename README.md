<div align="center">

# Pathway

### Find work that feels like a good fit.

An approachable job portal for thoughtful teams and the people who want to work with them.

[Explore the features](#-what-you-can-do) · [Run it locally](#-run-it-locally) · [Read the API](#-api)

![Pathway project preview](docs/preview.svg)

</div>

## ✳ What you can do

- **Explore roles:** search by title, company, or location with scrollable suggestions; filter by category and sort results.
- **Get the details:** open a listing to see its description, compensation, experience level, and skills.
- **Apply:** send your name, email, and a note to the hiring team.
- **Post a role:** publish a job listing directly from the employer form.

## ↗ Run it locally

**Requirements:** Node.js 18 or newer. There are no third-party packages to install.

```bash
git clone YOUR_REPOSITORY_URL
cd pathway-job-portal
npm start
```

Open [http://localhost:3000](http://localhost:3000). To restart the server automatically while developing, run `npm run dev`.

## 🧭 Project structure

| File | Purpose |
| --- | --- |
| `server.js` | Node.js API and static file server |
| `index.html` | Page structure and content |
| `styles.css` | Responsive visual design |
| `app.js` | Search, suggestions, job details, and forms |
| `package.json` | Project metadata and run scripts |
| `docs/preview.svg` | Project preview artwork |

## ⚙ API

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/api/jobs?q=&location=&category=&type=` | List and filter jobs |
| `GET` | `/api/jobs/:id` | Get a job’s details |
| `POST` | `/api/jobs` | Publish a job |
| `POST` | `/api/jobs/:id/applications` | Submit an application |

## 💾 Data

On first run, Pathway creates sample listings and stores jobs and applications locally in `data/portal.json`. That file is ignored by Git. The local JSON store is useful for a demo; a public service should use a managed database and add employer accounts and secure applicant-data handling.

## 🖼 Screenshots

The preview above is a project illustration. For a portfolio, add real screenshots of the running app to `docs/screenshots/` and embed them here.

