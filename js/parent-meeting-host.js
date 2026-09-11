import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, collection,
  getDocs, deleteDoc, writeBatch, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import {
  APP_TITLE, CONTENT_VERSION, FIREBASE_CONFIG, QUESTIONS, OPTION_STYLES, normalizeSessionCode
} from './parent-meeting-data.js';

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);

const setupView = document.getElementById('setupView');
const dashboardView = document.getElementById('dashboardView');
const setupMessage = document.getElementById('setupMessage');
const resumeInput = document.getElementById('resumeCodeInput');

let sessionCode = '';
let sessionData = null;
let votes = [];
let participants = [];
let unsubscribeSession = null;
let unsubscribeVotes = null;
let unsubscribeParticipants = null;
let onlineRefreshTimer = null;

resumeInput.addEventListener('input', () => { resumeInput.value = normalizeSessionCode(resumeInput.value); });
resumeInput.addEventListener('keydown', event => { if (event.key === 'Enter') resumeSession(); });
document.getElementById('createButton').addEventListener('click', createSession);
document.getElementById('resumeButton').addEventListener('click', resumeSession);
document.getElementById('copyLinkButton').addEventListener('click', copyJoinLink);
document.getElementById('fullscreenButton').addEventListener('click', () => document.documentElement.requestFullscreen?.());
document.getElementById('openButton').addEventListener('click', openVoting);
document.getElementById('closeButton').addEventListener('click', closeVoting);
document.getElementById('resultsButton').addEventListener('click', publishResults);
document.getElementById('feedbackButton').addEventListener('click', showFeedback);
document.getElementById('nextButton').addEventListener('click', nextQuestion);
document.getElementById('finishButton').addEventListener('click', finishSession);
document.getElementById('resetQuestionButton').addEventListener('click', resetQuestion);
document.getElementById('resetSessionButton').addEventListener('click', resetSession);
document.getElementById('exportButton').addEventListener('click', exportCsv);

async function createSession() {
  setSetupMessage('正在建立活動…');
  document.getElementById('createButton').disabled = true;
  try {
    let code = '';
    for (let attempt = 0; attempt < 8; attempt += 1) {
      code = randomCode();
      const snapshot = await getDoc(doc(db, 'parent_meeting_sessions', code));
      if (!snapshot.exists()) break;
      code = '';
    }
    if (!code) throw new Error('暫時無法產生活動代碼，請重試。');

    await setDoc(doc(db, 'parent_meeting_sessions', code), {
      title: APP_TITLE,
      contentVersion: CONTENT_VERSION,
      questionIndex: 0,
      phase: 'lobby',
      results: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    connectDashboard(code);
  } catch (error) {
    setSetupMessage(error.message || '建立失敗，請稍後再試。', true);
    document.getElementById('createButton').disabled = false;
  }
}

async function resumeSession() {
  const code = normalizeSessionCode(resumeInput.value);
  if (code.length !== 6) {
    setSetupMessage('請輸入 6 碼活動代碼。', true);
    return;
  }
  setSetupMessage('正在讀取活動…');
  try {
    const snapshot = await getDoc(doc(db, 'parent_meeting_sessions', code));
    if (!snapshot.exists()) throw new Error('找不到這場活動。');
    if (snapshot.data().contentVersion !== CONTENT_VERSION) {
      throw new Error('這是更新前的活動，請建立新活動以使用新的選項順序。');
    }
    connectDashboard(code);
  } catch (error) {
    setSetupMessage(error.message || '讀取失敗，請稍後再試。', true);
  }
}

function connectDashboard(code) {
  sessionCode = code;
  localStorage.setItem('parentMeetingHostSession', code);
  setupView.classList.add('hidden');
  dashboardView.classList.remove('hidden');
  document.getElementById('sessionCode').textContent = code;
  const url = makeJoinUrl(code);
  document.getElementById('joinUrl').textContent = url;
  drawQr(url);
  setConnection('已連線', true);

  unsubscribeSession?.();
  unsubscribeVotes?.();
  unsubscribeParticipants?.();

  unsubscribeSession = onSnapshot(doc(db, 'parent_meeting_sessions', code), snapshot => {
    if (!snapshot.exists()) {
      setConnection('活動已刪除', false);
      return;
    }
    sessionData = snapshot.data();
    renderDashboard();
  }, () => setConnection('重新連線中', false));

  unsubscribeVotes = onSnapshot(collection(db, 'parent_meeting_sessions', code, 'votes'), snapshot => {
    votes = snapshot.docs.map(item => item.data());
    renderMetrics();
  });

  unsubscribeParticipants = onSnapshot(collection(db, 'parent_meeting_sessions', code, 'participants'), snapshot => {
    participants = snapshot.docs.map(item => item.data());
    renderMetrics();
  });

  window.clearInterval(onlineRefreshTimer);
  onlineRefreshTimer = window.setInterval(renderMetrics, 15000);
}

function renderDashboard() {
  if (!sessionData) return;
  const index = Number(sessionData.questionIndex || 0);
  const phase = sessionData.phase || 'lobby';
  const question = QUESTIONS[Math.min(index, QUESTIONS.length - 1)];
  const finished = phase === 'finished';

  document.getElementById('questionProgress').textContent = finished ? '活動完成' : `情境 ${index + 1}／${QUESTIONS.length}`;
  document.getElementById('phaseLabel').textContent = phaseText(phase);
  document.getElementById('phasePill').querySelector('span:last-child').textContent = phaseText(phase);
  document.getElementById('phasePill').className = `status-pill ${phase === 'open' ? 'online' : ''}`;
  document.getElementById('progressFill').style.width = finished ? '100%' : `${((index + 1) / QUESTIONS.length) * 100}%`;
  document.getElementById('questionTitle').textContent = finished ? '活動已結束，家長端正在顯示收束畫面。' : question.title;

  const options = document.getElementById('hostOptions');
  options.innerHTML = '';
  if (!finished) {
    question.options.forEach(option => {
      const style = OPTION_STYLES[option.key];
      const row = document.createElement('div');
      row.className = 'host-option';
      row.innerHTML = `<span class="option-key" style="background:${style.color}">${option.key}</span><span></span>`;
      row.querySelector('span:last-child').textContent = option.text;
      options.appendChild(row);
    });
  }

  document.getElementById('openButton').disabled = finished || phase === 'open';
  document.getElementById('openButton').textContent = phase === 'closed' || phase === 'results' || phase === 'feedback' ? '重新開放' : '開放作答';
  document.getElementById('closeButton').disabled = phase !== 'open';
  document.getElementById('resultsButton').disabled = phase !== 'closed';
  document.getElementById('feedbackButton').disabled = phase !== 'results';
  document.getElementById('nextButton').disabled = finished || phase !== 'feedback';
  document.getElementById('finishButton').disabled = finished;
  document.getElementById('resetQuestionButton').disabled = finished;

  const showResults = phase === 'results' || phase === 'feedback';
  document.getElementById('resultsSection').classList.toggle('hidden', !showResults);
  document.getElementById('feedbackSection').classList.toggle('hidden', phase !== 'feedback');
  if (showResults) renderResults(question);
  if (phase === 'feedback') renderFeedback(question);
  renderMetrics();
}

function renderMetrics() {
  if (!sessionData) return;
  const question = QUESTIONS[Number(sessionData.questionIndex || 0)];
  const onlineThreshold = Date.now() - 75000;
  const online = participants.filter(item => item.lastSeen?.toMillis?.() >= onlineThreshold).length;
  const answered = question ? votes.filter(item => item.questionId === question.id).length : 0;
  document.getElementById('onlineCount').textContent = String(online);
  document.getElementById('answeredCount').textContent = String(answered);
}

function renderResults(question) {
  const counts = sessionData.results?.counts || { A: 0, B: 0, C: 0, D: 0 };
  const total = Number(sessionData.results?.total || 0);
  const skipCount = Number(sessionData.results?.skipCount || 0);
  const bars = document.getElementById('hostBars');
  bars.innerHTML = '';
  question.options.forEach(option => {
    const count = Number(counts[option.key] || 0);
    const percent = total ? Math.round((count / total) * 100) : 0;
    const row = document.createElement('div');
    row.innerHTML = `<div class="bar-top"><span class="bar-label">${option.key}　<span></span></span><span class="bar-number">${count} 人　${percent}%</span></div><div class="bar-track"><div class="bar-fill" style="width:${percent}%;background:${OPTION_STYLES[option.key].color}"></div></div>`;
    row.querySelector('.bar-label span').textContent = option.text;
    bars.appendChild(row);
  });
  document.getElementById('resultSummary').textContent = `有效作答 ${total} 人，暫不作答 ${skipCount} 人。人數最多不代表唯一正確。`;
}

function renderFeedback(question) {
  const container = document.getElementById('feedbackCards');
  container.innerHTML = '';
  question.options.forEach(option => {
    const style = OPTION_STYLES[option.key];
    const card = document.createElement('div');
    card.className = 'feedback-card';
    card.style.background = style.soft;
    card.innerHTML = `<div class="feedback-title"><span class="option-key" style="background:${style.color}">${option.key}</span><span></span></div><p></p>`;
    card.querySelector('.feedback-title span:last-child').textContent = option.label;
    card.querySelector('p').textContent = option.feedback;
    container.appendChild(card);
  });
  document.getElementById('suggestionText').textContent = `「${question.suggestion}」`;
  const safety = document.getElementById('safetyText');
  safety.classList.toggle('hidden', !question.safety);
  safety.textContent = question.safety ? `安全提醒：${question.safety}` : '';
}

async function openVoting() {
  await updateSession({ phase: 'open', results: null });
}

async function closeVoting() {
  await updateSession({ phase: 'closed' });
}

async function publishResults() {
  const question = QUESTIONS[Number(sessionData.questionIndex || 0)];
  const latestSnapshot = await getDocs(collection(db, 'parent_meeting_sessions', sessionCode, 'votes'));
  const currentVotes = latestSnapshot.docs
    .map(item => item.data())
    .filter(item => item.questionId === question.id);
  const counts = { A: 0, B: 0, C: 0, D: 0 };
  let skipCount = 0;
  currentVotes.forEach(vote => {
    if (vote.optionKey === 'SKIP') skipCount += 1;
    else if (Object.hasOwn(counts, vote.optionKey)) counts[vote.optionKey] += 1;
  });
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  await updateSession({
    phase: 'results',
    results: { questionId: question.id, counts, total, skipCount, publishedAt: new Date().toISOString() }
  });
}

async function showFeedback() {
  await updateSession({ phase: 'feedback' });
}

async function nextQuestion() {
  const index = Number(sessionData.questionIndex || 0);
  if (index >= QUESTIONS.length - 1) {
    await finishSession();
    return;
  }
  await updateSession({ questionIndex: index + 1, phase: 'lobby', results: null });
}

async function finishSession() {
  if (!window.confirm('要結束活動並在家長端顯示收束畫面嗎？')) return;
  await updateSession({ phase: 'finished' });
}

async function resetQuestion() {
  if (!sessionData) return;
  const question = QUESTIONS[Number(sessionData.questionIndex || 0)];
  if (!window.confirm(`要清除「情境 ${Number(sessionData.questionIndex || 0) + 1}」的所有答案嗎？此操作無法復原。`)) return;
  const targets = await getDocs(collection(db, 'parent_meeting_sessions', sessionCode, 'votes'));
  const matching = targets.docs.filter(item => item.data().questionId === question.id);
  await deleteInBatches(matching);
  await updateSession({ phase: 'open', results: null });
  showToast('本題答案已清除並重新開放。');
}

async function resetSession() {
  if (!window.confirm('要清除整場活動的所有匿名答案與在線紀錄嗎？此操作無法復原。')) return;
  const voteDocs = await getDocs(collection(db, 'parent_meeting_sessions', sessionCode, 'votes'));
  const participantDocs = await getDocs(collection(db, 'parent_meeting_sessions', sessionCode, 'participants'));
  await deleteInBatches([...voteDocs.docs, ...participantDocs.docs]);
  await updateSession({ questionIndex: 0, phase: 'lobby', results: null });
  showToast('整場資料已清除。');
}

async function deleteInBatches(docs) {
  for (let offset = 0; offset < docs.length; offset += 450) {
    const batch = writeBatch(db);
    docs.slice(offset, offset + 450).forEach(item => batch.delete(item.ref));
    await batch.commit();
  }
}

async function exportCsv() {
  const snapshot = await getDocs(collection(db, 'parent_meeting_sessions', sessionCode, 'votes'));
  const allVotes = snapshot.docs.map(item => item.data());
  const rows = [['題號', '情境', '選項', '人數', '有效票百分比']];
  QUESTIONS.forEach((question, index) => {
    const questionVotes = allVotes.filter(item => item.questionId === question.id);
    const valid = questionVotes.filter(item => item.optionKey !== 'SKIP');
    question.options.forEach(option => {
      const count = valid.filter(item => item.optionKey === option.key).length;
      const percent = valid.length ? `${Math.round(count / valid.length * 100)}%` : '0%';
      rows.push([index + 1, question.title, option.key, count, percent]);
    });
    rows.push([index + 1, question.title, '暫不作答', questionVotes.filter(item => item.optionKey === 'SKIP').length, '']);
  });
  const csv = '\ufeff' + rows.map(row => row.map(csvCell).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = `家長會匿名統計_${sessionCode}.csv`;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
  showToast('統計檔已匯出。');
}

async function updateSession(patch) {
  try {
    await updateDoc(doc(db, 'parent_meeting_sessions', sessionCode), { ...patch, updatedAt: serverTimestamp() });
  } catch {
    showToast('操作失敗，請確認網路後重試。');
  }
}

function csvCell(value) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint32Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, value => chars[value % chars.length]).join('');
}

function makeJoinUrl(code) {
  const url = new URL('parent-meeting.html', location.href);
  url.searchParams.set('session', code);
  return url.href;
}

function drawQr(url) {
  const canvas = document.getElementById('qrCanvas');
  if (window.QRCode?.toCanvas) {
    window.QRCode.toCanvas(canvas, url, { width: 190, margin: 1, color: { dark: '#214f48', light: '#ffffff' } });
  } else {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#214f48';
    ctx.font = '700 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('請使用下方加入連結', canvas.width / 2, canvas.height / 2);
  }
}

async function copyJoinLink() {
  try {
    await navigator.clipboard.writeText(document.getElementById('joinUrl').textContent);
    showToast('家長加入連結已複製。');
  } catch {
    showToast('無法自動複製，請手動選取連結。');
  }
}

function phaseText(phase) {
  return ({ lobby: '等待開始', open: '作答開放中', closed: '作答已截止', results: '統計已公布', feedback: '解析已公布', finished: '活動已結束' })[phase] || '等待中';
}

function setSetupMessage(text, isError = false) {
  setupMessage.textContent = text;
  setupMessage.className = `message${isError ? ' error' : ''}`;
}

function setConnection(text, online) {
  const status = document.getElementById('connectionStatus');
  status.className = `status-pill ${online ? 'online' : 'warn'}`;
  status.querySelector('span:last-child').textContent = text;
}

function showToast(text) {
  const toast = document.getElementById('toast');
  toast.textContent = text;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 2600);
}

const savedSession = normalizeSessionCode(localStorage.getItem('parentMeetingHostSession') || '');
if (savedSession.length === 6) resumeInput.value = savedSession;
