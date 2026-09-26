const state = { query: '', location: '', category: '', type: '', jobs: [], selectedId: null, jobSuggestions: [], locationSuggestions: [] };
const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const initials = name => name.split(/\s+/).map(word => word[0]).join('').slice(0, 2).toUpperCase();
const logoColor = name => ['orange', 'blue', 'purple', 'dark'][[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 4];

async function loadSuggestions() {
  try {
    const response = await fetch('/api/jobs');
    const data = await response.json();
    if (!response.ok) return;
    state.jobSuggestions = [...new Set(data.jobs.flatMap(job => [job.title, job.company]).filter(Boolean))].sort();
    state.locationSuggestions = [...new Set(data.jobs.map(job => job.location).filter(Boolean))].sort();
  } catch {
    // Search still works when suggestions are unavailable.
  }
}

async function loadJobs() {
  const params = new URLSearchParams();
  if (state.query) params.set('q', state.query);
  if (state.location) params.set('location', state.location);
  if (state.category) params.set('category', state.category);
  if (state.type) params.set('type', state.type);
  $('#results-count').textContent = 'Finding the right roles…';
  try {
    const response = await fetch(`/api/jobs?${params}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load jobs');
    state.jobs = data.jobs;
    if ($('#sort-select').value === 'title') state.jobs.sort((a, b) => a.title.localeCompare(b.title));
    renderJobs();
  } catch (error) {
    $('#results-count').textContent = 'Could not reach the job board';
    $('#job-list').innerHTML = `<div class="empty-state"><h3>Let’s try that again</h3><p>${escapeHtml(error.message)}</p></div>`;
  }
}
function renderJobs() {
  const count = state.jobs.length;
  $('#results-count').textContent = `${count} ${count === 1 ? 'opportunity' : 'opportunities'} to explore`;
  $('#empty-state').classList.toggle('hidden', count !== 0);
  $('#job-list').innerHTML = state.jobs.map(job => `<article class="job-card" tabindex="0" role="button" data-job="${escapeHtml(job.id)}" aria-label="View ${escapeHtml(job.title)} at ${escapeHtml(job.company)}"><div class="job-main"><div class="company-logo ${logoColor(job.company)}">${escapeHtml(initials(job.company))}</div><div><div class="job-title">${escapeHtml(job.title)}</div><div class="job-company">${escapeHtml(job.company)}</div></div></div><div class="job-attrs"><span class="pin">⌖</span>${escapeHtml(job.location)}</div><div class="job-salary">${escapeHtml(job.salary)}</div><span class="job-type ${job.type === 'Contract' ? 'contract' : ''}">${escapeHtml(job.type)}</span></article>`).join('');
  document.querySelectorAll('.job-card').forEach(card => {
    card.addEventListener('click', () => openJob(card.dataset.job));
    card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openJob(card.dataset.job); } });
  });
}
function openModal(content) { $('#modal-content').innerHTML = content; $('#job-modal').classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
function closeModal() { $('#job-modal').classList.add('hidden'); document.body.style.overflow = ''; state.selectedId = null; }
async function openJob(id) {
  state.selectedId = id;
  openModal('<div class="eyebrow">A PLACE TO DO GOOD WORK</div><h2>Finding the details…</h2>');
  try {
    const response = await fetch(`/api/jobs/${encodeURIComponent(id)}`), data = await response.json();
    if (!response.ok) throw new Error(data.error);
    const job = data.job;
    openModal(`<div class="eyebrow">${escapeHtml(job.category)} · ${escapeHtml(job.level)}</div><h2 id="modal-title">${escapeHtml(job.title)}</h2><p class="detail-company">${escapeHtml(job.company)} · ${escapeHtml(job.location)}</p><div class="detail-meta"><span>${escapeHtml(job.type)}</span><span>${escapeHtml(job.salary)}</span></div><p class="detail-description">${escapeHtml(job.description)}</p><div class="detail-tags">${(job.tags || []).map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div><button class="button button-dark" id="apply-button">Apply for this role <span>→</span></button>`);
    $('#apply-button').addEventListener('click', showApplicationForm);
  } catch (error) { openModal(`<h2>Couldn’t open this role</h2><p class="modal-subtitle">${escapeHtml(error.message)}</p>`); }
}
function showApplicationForm() {
  openModal(`<div class="eyebrow">MAKE YOUR NEXT MOVE</div><h2 id="modal-title">Apply for this role</h2><p class="modal-subtitle">Share a few details and the team can get in touch.</p><form class="modal-form" id="application-form"><label>Your name<input name="name" required placeholder="Jamie Rivera" autocomplete="name"></label><label>Email address<input name="email" type="email" required placeholder="jamie@example.com" autocomplete="email"></label><label class="wide">A note for the team <span style="font-weight:400">(optional)</span><textarea name="note" placeholder="What makes this role feel like a good fit?"></textarea></label><button class="button button-dark wide">Send my application <span>→</span></button></form>`);
  $('#application-form').addEventListener('submit', submitApplication);
}
async function submitApplication(event) {
  event.preventDefault();
  const form = event.currentTarget, button = form.querySelector('button'); button.disabled = true; button.textContent = 'Sending…';
  try {
    const response = await fetch(`/api/jobs/${encodeURIComponent(state.selectedId)}/applications`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error);
    openModal(`<div class="eyebrow">ONE GOOD STEP FORWARD</div><h2 id="modal-title">You’re on your way. ✳</h2><p class="modal-subtitle">${escapeHtml(data.message)}</p><button class="button button-dark" id="done-button">Back to the roles <span>→</span></button>`);
    $('#done-button').addEventListener('click', closeModal);
  } catch (error) { button.disabled = false; button.textContent = 'Send my application →'; showToast(error.message); }
}
function showPostForm() {
  openModal(`<div class="eyebrow">GREAT TEAMS START WITH GOOD PEOPLE</div><h2 id="modal-title">Post a thoughtful role.</h2><p class="modal-subtitle">Tell us about the opportunity. It will appear on the job board right away.</p><form class="modal-form" id="post-form"><label>Job title<input name="title" required placeholder="Senior Product Designer"></label><label>Company<input name="company" required placeholder="Your company"></label><label>Location<input name="location" required placeholder="Remote or city, country"></label><label>Job type<select name="type"><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option></select></label><label>Category<select name="category"><option>Design</option><option>Engineering</option><option>Marketing</option><option>Data</option><option>People</option><option>Operations</option><option>Sales</option></select></label><label>Experience level<input name="level" placeholder="Mid-level"></label><label class="wide">Salary or compensation<input name="salary" placeholder="$100k – $130k"></label><label class="wide">Role description<textarea name="description" required placeholder="What will this person work on? What makes your team a good place to do it?"></textarea></label><label class="wide">Skills or tags <span style="font-weight:400">(comma separated)</span><input name="tags" placeholder="Research, Figma, Collaboration"></label><button class="button button-dark wide">Publish this role <span>→</span></button></form>`);
  $('#post-form').addEventListener('submit', submitPost);
}
async function submitPost(event) {
  event.preventDefault(); const form = event.currentTarget, button = form.querySelector('button'); button.disabled = true; button.textContent = 'Publishing…';
  try {
    const response = await fetch('/api/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error);
    state.query = ''; state.location = ''; state.category = ''; $('#search-input').value = ''; $('#location-input').value = '';
    document.querySelectorAll('.filter-chip').forEach(chip => chip.classList.toggle('selected', !chip.dataset.category));
    closeModal(); await Promise.all([loadJobs(), loadSuggestions()]); window.location.hash = 'jobs'; showToast('Your role is live on Pathway ✳');
  } catch (error) { button.disabled = false; button.textContent = 'Publish this role →'; showToast(error.message); }
}
let toastTimer;
function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('visible'), 3000); }
function search() { state.query = $('#search-input').value.trim(); state.location = $('#location-input').value.trim(); loadJobs(); }

function hideSuggestions(menu) {
  menu.classList.add('hidden');
  menu.previousElementSibling.setAttribute('aria-expanded', 'false');
}
function showSuggestions(input, menu, values) {
  const query = input.value.trim().toLowerCase();
  const matches = values.filter(value => value.toLowerCase().includes(query)).slice(0, 12);
  menu.innerHTML = matches.length
    ? matches.map(value => `<button class="suggestion-option" type="button" role="option" data-value="${escapeHtml(value)}"><span class="suggestion-icon">${input.id === 'location-input' ? '⌖' : '⌕'}</span><span>${escapeHtml(value)}</span><span class="suggestion-enter">↵</span></button>`).join('')
    : '<div class="suggestion-empty">No matching suggestions. You can still search for this.</div>';
  menu.classList.remove('hidden');
  input.setAttribute('aria-expanded', 'true');
  menu.querySelectorAll('.suggestion-option').forEach(option => option.addEventListener('click', () => {
    input.value = option.dataset.value;
    hideSuggestions(menu);
    input.focus();
  }));
}

const jobSearchInput = $('#search-input');
const locationSearchInput = $('#location-input');
const jobSuggestionMenu = $('#job-suggestions');
const locationSuggestionMenu = $('#location-suggestions');
jobSearchInput.addEventListener('focus', () => showSuggestions(jobSearchInput, jobSuggestionMenu, state.jobSuggestions));
jobSearchInput.addEventListener('input', () => showSuggestions(jobSearchInput, jobSuggestionMenu, state.jobSuggestions));
locationSearchInput.addEventListener('focus', () => showSuggestions(locationSearchInput, locationSuggestionMenu, state.locationSuggestions));
locationSearchInput.addEventListener('input', () => showSuggestions(locationSearchInput, locationSuggestionMenu, state.locationSuggestions));
document.addEventListener('click', event => {
  if (!jobSuggestionMenu.parentElement.contains(event.target)) hideSuggestions(jobSuggestionMenu);
  if (!locationSuggestionMenu.parentElement.contains(event.target)) hideSuggestions(locationSuggestionMenu);
});

$('#search-button').addEventListener('click', search);
$('#search-input').addEventListener('keydown', event => { if (event.key === 'Enter') search(); });
$('#location-input').addEventListener('keydown', event => { if (event.key === 'Enter') search(); });
document.querySelectorAll('.filter-chip').forEach(chip => chip.addEventListener('click', () => { state.category = chip.dataset.category; document.querySelectorAll('.filter-chip').forEach(item => item.classList.toggle('selected', item === chip)); loadJobs(); }));
$('#sort-select').addEventListener('change', () => { if ($('#sort-select').value === 'title') state.jobs.sort((a, b) => a.title.localeCompare(b.title)); else state.jobs.sort((a, b) => b.postedAt.localeCompare(a.postedAt)); renderJobs(); });
$('#clear-filters').addEventListener('click', () => { state.query = ''; state.location = ''; state.category = ''; $('#search-input').value = ''; $('#location-input').value = ''; document.querySelectorAll('.filter-chip').forEach(chip => chip.classList.toggle('selected', !chip.dataset.category)); loadJobs(); });
document.querySelectorAll('[data-open-post]').forEach(button => button.addEventListener('click', showPostForm));
$('.modal-close').addEventListener('click', closeModal);
$('#job-modal').addEventListener('click', event => { if (event.target === $('#job-modal')) closeModal(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });
$('.menu-toggle').addEventListener('click', () => $('header nav').classList.toggle('open'));
$('#newsletter-form').addEventListener('submit', event => { event.preventDefault(); event.currentTarget.classList.add('hidden'); $('.newsletter-success').classList.remove('hidden'); });
loadJobs();
loadSuggestions();
