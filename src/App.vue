<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { getAiSettings, getInquiries, getInquiry, loginAdmin, logoutAdmin, restoreAdminSession, submitInquiry, updateAiSettings } from './api'

const screen = ref('home')
const adminUser = ref(null)
const loginUsername = ref('admin')
const loginPassword = ref('')
const loginError = ref('')
const loginBusy = ref(false)
const inquiries = ref([])
const pagination = ref({ page: 1, limit: 25, total: 0, totalPages: 1 })
const tableBusy = ref(false)
const tableError = ref('')
const selected = ref(null)
const detailBusy = ref(false)
const filter = ref({ search: '', status: '', priority: '', page: 1, limit: 25, sortBy: 'createdAt', sortOrder: 'desc' })
const prompt = ref('')
const promptInfo = ref({ version: null, updatedAt: null })
const settingBusy = ref(false)
const settingMessage = ref('')
const form = ref({ name: '', email: '', phone: '', service: '', message: '', consentToStore: false })
const formTouched = ref(false)
const formBusy = ref(false)
const formStatus = ref('')

const emailOk = (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
const phoneOk = (value) => !value || /^[+\d][\d\s().-]{5,24}$/.test(value)
const formErrors = computed(() => ({
  name: form.value.name.trim().length > 100 ? 'Please keep your name under 100 characters.' : '',
  email: !emailOk(form.value.email) ? 'Enter a valid email address.' : '',
  phone: !phoneOk(form.value.phone) ? 'Enter a valid phone number.' : '',
  contact: !form.value.email.trim() && !form.value.phone.trim() ? 'Add an email address or phone number so we can reply.' : '',
  message: form.value.message.trim().length < 10 ? 'Tell us a little more (at least 10 characters).' : form.value.message.length > 5000 ? 'Please keep the message under 5,000 characters.' : '',
  consent: !form.value.consentToStore ? 'We need your permission to store this inquiry.' : '',
}))
const canSend = computed(() => Object.values(formErrors.value).every((value) => !value))

function date(value) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'
}
function classFor(value) {
  return String(value || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-')
}
function clearForm() {
  form.value = { name: '', email: '', phone: '', service: '', message: '', consentToStore: false }
  formTouched.value = false
}
async function sendInquiry() {
  formTouched.value = true
  formStatus.value = ''
  if (!canSend.value) return
  formBusy.value = true
  try {
    await submitInquiry({
      name: form.value.name.trim() || null,
      email: form.value.email.trim() || null,
      phone: form.value.phone.trim() || null,
      service: form.value.service || null,
      message: form.value.message.trim(),
      consentToStore: form.value.consentToStore,
    })
    formStatus.value = 'Transmission received. We’ll be in touch soon.'
    clearForm()
  } catch (error) {
    formStatus.value = error.message
  } finally { formBusy.value = false }
}
async function loadInquiries() {
  tableBusy.value = true; tableError.value = ''
  try {
    const data = await getInquiries(filter.value)
    inquiries.value = data.items || []
    pagination.value = data.pagination || pagination.value
  } catch (error) { tableError.value = error.message } finally { tableBusy.value = false }
}
async function signIn() {
  loginError.value = ''
  if (!loginUsername.value.trim() || !loginPassword.value) { loginError.value = 'Enter your username and password.'; return }
  loginBusy.value = true
  try {
    const session = await loginAdmin(loginUsername.value.trim(), loginPassword.value)
    adminUser.value = session.user
    await loadInquiries()
    if (tableError.value) throw new Error(tableError.value)
    screen.value = 'dashboard'
    loginPassword.value = ''
  } catch (error) { adminUser.value = null; loginError.value = error.message } finally { loginBusy.value = false }
}
async function openDetail(id) {
  detailBusy.value = true; selected.value = null
  try { selected.value = await getInquiry(id) } catch (error) { tableError.value = error.message } finally { detailBusy.value = false }
}
async function openSettings() {
  screen.value = 'settings'; settingMessage.value = ''; settingBusy.value = true
  try {
    const data = await getAiSettings()
    prompt.value = data.companyPrompt || ''
    promptInfo.value = data
  } catch (error) { settingMessage.value = error.message } finally { settingBusy.value = false }
}
async function savePrompt() {
  if (!prompt.value.trim() || prompt.value.length > 5000) { settingMessage.value = 'The prompt must contain 1–5,000 characters.'; return }
  settingBusy.value = true; settingMessage.value = ''
  try {
    promptInfo.value = await updateAiSettings(prompt.value.trim())
    prompt.value = promptInfo.value.companyPrompt
    settingMessage.value = `Saved as prompt version ${promptInfo.value.version ?? 'new'}.`
  } catch (error) { settingMessage.value = error.message } finally { settingBusy.value = false }
}
async function logout() {
  try { await logoutAdmin() } catch (_) { /* Local logout still clears UI state. */ }
  adminUser.value = null; selected.value = null; screen.value = 'home'
}
async function restoreSession() {
  try { adminUser.value = (await restoreAdminSession()).user } catch (_) { adminUser.value = null }
}
let typingTimer
function queueSearch() { clearTimeout(typingTimer); typingTimer = setTimeout(() => { filter.value.page = 1; loadInquiries() }, 300) }
onMounted(restoreSession)
onBeforeUnmount(() => clearTimeout(typingTimer))
</script>

<template>
  <main class="site-shell">
    <header class="topbar">
      <button class="brand" @click="screen = 'home'" aria-label="Go to inquiry form"><span class="brand-mark">✦</span><span>SIGNAL<br>STATION</span></button>
      <div class="top-actions">
        <template v-if="adminUser">
          <button class="nav-button" :class="{ active: screen === 'dashboard' }" @click="screen = 'dashboard'; loadInquiries()">INBOX</button>
          <button class="nav-button" :class="{ active: screen === 'settings' }" @click="openSettings">SETTINGS</button>
          <button class="nav-button danger" @click="logout">LOG OUT</button>
        </template>
        <button v-else class="nav-button" :class="{ active: screen === 'login' }" @click="screen = 'login'">ADMIN ACCESS</button>
      </div>
    </header>

    <section v-if="screen === 'home'" class="home-grid">
      <div class="hero-copy">
        <p class="eyebrow">CUSTOMER UPLINK // OPEN</p>
        <h1>Need a hand?<br><span>Send a signal.</span></h1>
        <p class="lede">Tell us what’s on your mind and our team will pick up the transmission.</p>
        <div class="pixel-orbit" aria-hidden="true"><i></i><i></i><i></i><b>✦</b></div>
      </div>
      <form class="pixel-panel inquiry-form" @submit.prevent="sendInquiry" novalidate>
        <div class="panel-title"><span>NEW INQUIRY</span><small>01 / 01</small></div>
        <p class="demo-warning" role="note"><strong>DEMO ONLY</strong> Do not enter real names, email addresses, phone numbers, passwords, customer messages, or confidential information. Submitted text may be stored and analysed by an AI service.</p>
        <label>Your name <input v-model="form.name" maxlength="100" autocomplete="name" placeholder="Alex Morgan"></label>
        <p v-if="formTouched && formErrors.name" class="field-error">{{ formErrors.name }}</p>
        <div class="two-fields">
          <label>Email <input v-model="form.email" type="email" maxlength="254" autocomplete="email" placeholder="alex@email.com"></label>
          <label>Phone <input v-model="form.phone" maxlength="25" autocomplete="tel" placeholder="+372 ..."></label>
        </div>
        <p v-if="formTouched && (formErrors.email || formErrors.phone || formErrors.contact)" class="field-error">{{ formErrors.email || formErrors.phone || formErrors.contact }}</p>
        <label>What can we help with?
          <select v-model="form.service"><option value="">Select a topic (optional)</option><option>General inquiry</option><option>Product or service</option><option>Account support</option><option>Partnership</option><option>Other</option></select>
        </label>
        <label>Message <textarea v-model="form.message" maxlength="5000" placeholder="Write your message here…"></textarea></label>
        <p v-if="formTouched && formErrors.message" class="field-error">{{ formErrors.message }}</p>
        <label class="checkline"><input v-model="form.consentToStore" type="checkbox"><span>I agree that my details can be stored to respond to this inquiry.</span></label>
        <p v-if="formTouched && formErrors.consent" class="field-error">{{ formErrors.consent }}</p>
        <p v-if="formStatus" class="form-status" :class="{ error: formStatus.includes('could not') }">{{ formStatus }}</p>
        <button class="primary-button" :disabled="formBusy"><span>{{ formBusy ? 'SENDING…' : 'SEND TRANSMISSION' }}</span><b>→</b></button>
      </form>
    </section>

    <section v-else-if="screen === 'login'" class="login-wrap">
      <form class="pixel-panel login-panel" @submit.prevent="signIn">
        <p class="eyebrow">RESTRICTED FREQUENCY</p><h1>Admin<br><span>console.</span></h1>
        <label>Username <input v-model="loginUsername" autocomplete="username" maxlength="100" placeholder="admin"></label>
        <label>Password <input v-model="loginPassword" type="password" autocomplete="current-password" maxlength="200" placeholder="Enter password"></label>
        <p class="hint">Demo credentials: <strong>admin</strong> / <strong>demo-admin-password</strong>. Authentication uses a revocable HttpOnly cookie; the password is never stored in browser storage.</p>
        <p v-if="loginError" class="field-error">{{ loginError }}</p>
        <button class="primary-button" :disabled="loginBusy"><span>{{ loginBusy ? 'VERIFYING…' : 'ENTER CONSOLE' }}</span><b>→</b></button>
      </form>
    </section>

    <section v-else-if="screen === 'dashboard'" class="admin-layout">
      <div class="admin-heading"><div><p class="eyebrow">ADMIN CONSOLE // LIVE FEED</p><h1>Inquiry <span>inbox.</span></h1></div><button class="square-button" @click="loadInquiries" :disabled="tableBusy" title="Refresh">↻</button></div>
      <div class="filter-bar pixel-panel">
        <input v-model="filter.search" @input="queueSearch" maxlength="200" placeholder="Search names, messages, services…">
        <select v-model="filter.status" @change="filter.page = 1; loadInquiries()"><option value="">All statuses</option><option value="RECEIVED">Received</option><option value="PROCESSING">Processing</option><option value="READY">Ready</option><option value="NEEDS_REVIEW">Needs review</option><option value="DUPLICATE">Duplicate</option><option value="ANALYSIS_FAILED">Analysis failed</option></select>
        <select v-model="filter.priority" @change="filter.page = 1; loadInquiries()"><option value="">All priorities</option><option value="URGENT">Urgent</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></select>
      </div>
      <p v-if="tableError" class="field-error table-message">{{ tableError }}</p>
      <div class="table-wrap pixel-panel">
        <div v-if="tableBusy" class="loading">TUNING IN…</div>
        <table v-else><thead><tr><th>Received</th><th>Customer</th><th>Service / message</th><th>AI analysis</th><th>Status</th><th></th></tr></thead>
          <tbody><tr v-for="item in inquiries" :key="item.id"><td>{{ date(item.createdAt) }}</td><td><strong>{{ item.customerName || 'Unknown' }}</strong><small>{{ item.contact }}</small></td><td><strong>{{ item.requestedService || 'General inquiry' }}</strong><small>{{ item.messagePreview }}</small></td><td><span class="tag" :class="classFor(item.priority)">{{ item.priority || 'unrated' }}</span><small>{{ item.category || 'Awaiting analysis' }}</small></td><td><span class="tag" :class="classFor(item.status)">{{ item.status }}</span></td><td><button class="text-button" @click="openDetail(item.id)">VIEW →</button></td></tr>
          <tr v-if="!inquiries.length"><td colspan="6" class="empty">No incoming signals match this filter.</td></tr></tbody>
        </table>
      </div>
      <div class="pager"><span>{{ pagination.total }} total {{ pagination.total === 1 ? 'inquiry' : 'inquiries' }}</span><div><button class="nav-button" :disabled="pagination.page <= 1" @click="filter.page--; loadInquiries()">← PREV</button><span>{{ pagination.page }} / {{ pagination.totalPages }}</span><button class="nav-button" :disabled="pagination.page >= pagination.totalPages" @click="filter.page++; loadInquiries()">NEXT →</button></div></div>
      <aside v-if="selected || detailBusy" class="detail-drawer"><button class="close" @click="selected = null">×</button><p v-if="detailBusy" class="loading">LOADING SIGNAL…</p><template v-else><p class="eyebrow">INQUIRY DOSSIER</p><h2>{{ selected.original.name || 'Unknown customer' }}</h2><p>{{ selected.original.email || selected.original.phone || 'No contact supplied' }}</p><div class="detail-block"><b>Original message</b><p>{{ selected.original.message }}</p></div><div class="detail-block"><b>AI summary</b><p>{{ selected.analysis.summary || 'No AI summary available.' }}</p><div class="tags"><span class="tag" :class="classFor(selected.analysis.priority)">{{ selected.analysis.priority || 'unrated' }}</span><span class="tag">{{ selected.analysis.category || 'uncategorized' }}</span><span class="tag">{{ selected.analysis.confidence != null ? `${Math.round(selected.analysis.confidence * 100)}% confidence` : 'no confidence score' }}</span></div></div><div v-if="selected.analysis.reply.draft" class="detail-block"><b>Suggested reply</b><p>{{ selected.analysis.reply.draft }}</p></div></template></aside>
    </section>

    <section v-else-if="screen === 'settings'" class="settings-wrap">
      <div class="admin-heading"><div><p class="eyebrow">ADMIN CONSOLE // CONFIGURATION</p><h1>AI <span>settings.</span></h1></div><button class="nav-button" @click="screen = 'dashboard'">← INBOX</button></div>
      <div class="pixel-panel settings-panel"><div class="panel-title"><span>COMPANY CONTEXT PROMPT</span><small>MAX 5,000</small></div><p>Describe your business, services, tone, and handling rules. This context is applied to future inquiry analysis.</p><textarea v-model="prompt" maxlength="5000" :disabled="settingBusy" placeholder="Example: We are a local studio that…"></textarea><div class="settings-footer"><small>Version {{ promptInfo.version ?? '—' }} · Last updated {{ date(promptInfo.updatedAt) }}</small><button class="primary-button" :disabled="settingBusy" @click="savePrompt"><span>{{ settingBusy ? 'SAVING…' : 'SAVE PROMPT' }}</span><b>→</b></button></div><p v-if="settingMessage" class="form-status">{{ settingMessage }}</p></div>
    </section>
  </main>
</template>
