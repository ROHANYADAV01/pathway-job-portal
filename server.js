const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'portal.json');

const seedJobs = [
  { id: 'job-1', title: 'Product Designer', company: 'Linear', location: 'Remote', type: 'Full-time', salary: '$120k – $160k', category: 'Design', level: 'Mid–Senior', description: 'Help shape intuitive tools that make work feel effortless. You will partner closely with product and engineering to take ideas from early concepts to polished, shipped experiences.', tags: ['Figma', 'Product design', 'SaaS'], postedAt: '2026-09-25' },
  { id: 'job-2', title: 'Frontend Engineer', company: 'Vercel', location: 'New York, NY', type: 'Full-time', salary: '$140k – $190k', category: 'Engineering', level: 'Senior', description: 'Build fast, accessible interfaces used by developers around the world. Work across our design system, dashboard, and open-source projects with a thoughtful, ambitious team.', tags: ['React', 'TypeScript', 'CSS'], postedAt: '2026-09-24' },
  { id: 'job-3', title: 'Growth Marketing Manager', company: 'Notion', location: 'San Francisco, CA', type: 'Full-time', salary: '$110k – $145k', category: 'Marketing', level: 'Mid-level', description: 'Connect curious teams with tools that help them do their best work. Develop experiments, campaigns, and a clear point of view on how we reach the next generation of Notion users.', tags: ['Growth', 'Strategy', 'B2B'], postedAt: '2026-09-23' },
  { id: 'job-4', title: 'Data Analyst', company: 'Figma', location: 'Remote', type: 'Contract', salary: '$75 – $95 / hr', category: 'Data', level: 'Mid-level', description: 'Turn complex product questions into clear, actionable insights. Build reliable dashboards, uncover trends, and make data accessible to everyone on the team.', tags: ['SQL', 'Analytics', 'Looker'], postedAt: '2026-09-22' },
  { id: 'job-5', title: 'People Operations Lead', company: 'Stripe', location: 'Dublin, Ireland', type: 'Full-time', salary: '€95k – €125k', category: 'People', level: 'Senior', description: 'Build thoughtful people programs that scale with a global team. You will bring care and operational rigor to the moments that shape the employee experience.', tags: ['People ops', 'Operations', 'Culture'], postedAt: '2026-09-21' },
  { id: 'job-6', title: 'Junior UX Researcher', company: 'Headspace', location: 'Austin, TX', type: 'Full-time', salary: '$72k – $92k', category: 'Design', level: 'Entry-level', description: 'Bring the voice of our members into every product decision. Plan and run interviews and usability studies, then help the team turn what we learn into better experiences.', tags: ['Research', 'Usability', 'Qualitative'], postedAt: '2026-09-20' }
];

function readStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ jobs: seedJobs, applications: [] }, null, 2));
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch { return { jobs: seedJobs, applications: [] }; }
}
function saveStore(store) { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2)); }
function send(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' });
  res.end(JSON.stringify(payload));
}
function body(req) {
  return new Promise((resolve, reject) => {
    let data = ''; req.on('data', chunk => { data += chunk; if (data.length > 1e6) reject(new Error('Request too large')); });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'OPTIONS') return send(res, 204, {});
  try {
    if (url.pathname === '/api/jobs' && req.method === 'GET') {
      const store = readStore();
      const q = (url.searchParams.get('q') || '').trim().toLowerCase();
      const location = (url.searchParams.get('location') || '').trim().toLowerCase();
      const category = url.searchParams.get('category') || '';
      const type = url.searchParams.get('type') || '';
      const jobs = store.jobs.filter(job => {
        const searchable = [job.title, job.company, job.description, ...(job.tags || [])].join(' ').toLowerCase();
        return (!q || searchable.includes(q)) && (!location || job.location.toLowerCase().includes(location)) && (!category || job.category === category) && (!type || job.type === type);
      });
      return send(res, 200, { jobs, total: jobs.length });
    }
    if (url.pathname.startsWith('/api/jobs/') && req.method === 'GET') {
      const id = decodeURIComponent(url.pathname.split('/').pop());
      const job = readStore().jobs.find(item => item.id === id);
      return job ? send(res, 200, { job }) : send(res, 404, { error: 'Job not found' });
    }
    if (url.pathname === '/api/jobs' && req.method === 'POST') {
      const data = await body(req);
      const required = ['title', 'company', 'location', 'type', 'category', 'description'];
      if (required.some(field => typeof data[field] !== 'string' || !data[field].trim())) return send(res, 400, { error: 'Please fill in all required fields.' });
      const store = readStore();
      const job = { id: randomUUID(), title: data.title.trim(), company: data.company.trim(), location: data.location.trim(), type: data.type.trim(), salary: (data.salary || 'Compensation not listed').trim(), category: data.category.trim(), level: (data.level || 'Any experience').trim(), description: data.description.trim(), tags: (data.tags || '').split(',').map(tag => tag.trim()).filter(Boolean).slice(0, 8), postedAt: new Date().toISOString().slice(0, 10) };
      store.jobs.unshift(job); saveStore(store); return send(res, 201, { job });
    }
    if (url.pathname.match(/^\/api\/jobs\/[^/]+\/applications$/) && req.method === 'POST') {
      const id = decodeURIComponent(url.pathname.split('/')[3]);
      const data = await body(req);
      if (!data.name?.trim() || !/^\S+@\S+\.\S+$/.test(data.email || '')) return send(res, 400, { error: 'Add your name and a valid email address.' });
      const store = readStore();
      if (!store.jobs.some(job => job.id === id)) return send(res, 404, { error: 'Job not found' });
      const application = { id: randomUUID(), jobId: id, name: data.name.trim(), email: data.email.trim(), note: (data.note || '').trim(), createdAt: new Date().toISOString() };
      store.applications.push(application); saveStore(store); return send(res, 201, { message: 'Application received. Good luck!', applicationId: application.id });
    }
    if (url.pathname.startsWith('/api/')) return send(res, 404, { error: 'Not found' });

    const requested = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const file = path.resolve(ROOT, `.${requested}`);
    if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, { error: 'Not found' });
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  } catch (error) { send(res, 500, { error: error.message || 'Something went wrong' }); }
});

server.listen(PORT, () => console.log(`Pathway is running at http://localhost:${PORT}`));
