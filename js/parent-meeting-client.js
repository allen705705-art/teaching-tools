import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getFirestore, doc, getDoc, setDoc, onSnapshot, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import {
  APP_TITLE, APP_SUBTITLE, CONTENT_VERSION, FIREBASE_CONFIG, QUESTIONS, CLOSING_ACTIONS,
  OPTION_STYLES, normalizeSessionCode, makeParticipantId
} from './parent-meeting-data.js';

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);
const participantId = makeParticipantId();

const joinView = document.getElementById('joinView');
const activityView = document.getElementById('activityView');
const activityCard = document.getElementById('activityCard');
const codeInput = document.getElementById('sessionCodeInput');
const joinButton = document.getElementById('joinButton');
const joinMessage = document.getElementById('joinMessage');
const connectionStatus = document.getElementById('connectionStatus');

let sessionCode = '';
let sessionData = null;
let unsubscribeSession = null;
let heartbeatTimer = null;
let selectedKey = null;
let ownVote = null;
let renderVersion = 0;

document.getElementById('appTitle').textContent = APP_TITLE;
document.getElementById('appSubtitle').textContent = APP_SUBTITLE;

const initialCode = normalizeSessionCode(new URLSearchParams(location.search).get('session') || '');
codeInput.value = initialCode;
if (initialCode.length === 6) joinMessage.textContent = '已帶入活動代碼，請按「匿名加入」。';

codeInput.addEventListener('input', () => {
  codeInput.value = normalizeSessionCode(codeInput.value);
});
codeInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') joinSession();
});
joinButton.addEventListener('click', joinSession);

async function joinSession() {
  const code = normalizeSessionCode(codeInput.value);
  if (code.length !== 6) {
    setJoinMessage('請輸入 6 碼活動代碼。', true);
    return;
  }

  joinButton.disabled = true;
  setJoinMessage('正在連線…');
  try {
    const sessionRef = doc(db, 'parent_meeting_sessions', code);
    const snapshot = await getDoc(sessionRef);
    if (!snapshot.exists()) throw new Error('找不到這場活動，請確認代碼。');
    if (snapshot.data().contentVersion !== CONTENT_VERSION) {
      throw new Error('題目內容已更新，請向主持人索取新的活動代碼。');
    }

    sessionCode = code;
    sessionStorage.setItem('parentMeetingSessionCode', code);
    await touchPresence();
    heartbeatTimer = window.setInterval(touchPresence, 30000);

    joinView.classList.add('hidden');
    activityView.classList.remove('hidden');
    document.getElementById('activeCode').textContent = code;
    setConnection('已連線', true);

    unsubscribeSession?.();
    unsubscribeSession = onSnapshot(sessionRef, snapshotNow => {
      if (!snapshotNow.exists()) {
        renderUnavailable();
        return;
      }
      sessionData = snapshotNow.data();
      selectedKey = null;
      renderSession();
    }, () => {
      setConnection('連線中斷', false);
      showToast('網路連線中斷，系統會自動重試。');
    });
  } catch (error) {
    setJoinMessage(error.message || '加入失敗，請稍後再試。', true);
    joinButton.disabled = false;
  }
}

async function touchPresence() {
  if (!sessionCode) return;
  try {
    await setDoc(doc(db, 'parent_meeting_sessions', sessionCode, 'participants', participantId), {
      participantId,
      lastSeen: serverTimestamp()
    }, { merge: true });
    setConnection('已連線', true);
  } catch {
    setConnection('重新連線中', false);
  }
}

async function renderSession() {
  const version = ++renderVersion;
  if (!sessionData) return;
  const index = Number(sessionData.questionIndex || 0);
  const phase = sessionData.phase || 'lobby';
  const question = QUESTIONS[Math.min(index, QUESTIONS.length - 1)];

  document.getElementById('progressLabel').textContent = phase === 'finished' ? '活動完成' : `情境 ${index + 1}／${QUESTIONS.length}`;
  document.getElementById('progressFill').style.width = phase === 'finished' ? '100%' : `${((index + 1) / QUESTIONS.length) * 100}%`;
  document.getElementById('phaseLabel').textContent = phaseText(phase);

  if (phase === 'finished') {
    renderClosing();
    return;
  }
  if (phase === 'lobby') {
    renderWaiting('已加入活動', '主持人開始後，題目會自動出現在這裡。');
    return;
  }

  ownVote = await loadOwnVote(question.id);
  if (version !== renderVersion) return;

  if (phase === 'open') renderQuestion(question, ownVote);
  else if (phase === 'closed') renderClosed(question, ownVote);
  else if (phase === 'results' || phase === 'feedback') renderResults(question, ownVote, phase === 'feedback');
  else renderWaiting('請稍候', '等待主持人進行下一步。');
}

async function loadOwnVote(questionId) {
  if (!sessionCode) return null;
  const voteRef = doc(db, 'parent_meeting_sessions', sessionCode, 'votes', `${questionId}_${participantId}`);
  try {
    const snapshot = await getDoc(voteRef);
    return snapshot.exists() ? snapshot.data() : null;
  } catch {
    return null;
  }
}

function renderQuestion(question, vote) {
  selectedKey = vote?.optionKey || null;
  activityCard.innerHTML = '';

  const intro = document.createElement('div');
  intro.innerHTML = `<p class="eyebrow">請選最接近第一反應的答案</p><h2></h2>`;
  intro.querySelector('h2').textContent = question.title;
  activityCard.appendChild(intro);

  const list = document.createElement('div');
  list.className = 'option-list';
  question.options.forEach(option => {
    const button = document.createElement('button');
    button.className = `option-button${selectedKey === option.key ? ' selected' : ''}`;
    button.type = 'button';
    button.setAttribute('aria-pressed', selectedKey === option.key ? 'true' : 'false');
    button.innerHTML = `<span class="option-key">${option.key}</span><span class="option-copy"></span>`;
    button.querySelector('.option-copy').textContent = option.text;
    button.addEventListener('click', () => {
      selectedKey = option.key;
      activityCard.querySelectorAll('.option-button').forEach(el => {
        const selected = el.querySelector('.option-key').textContent === selectedKey;
        el.classList.toggle('selected', selected);
        el.setAttribute('aria-pressed', selected ? 'true' : 'false');
      });
      document.getElementById('submitVoteButton').disabled = false;
    });
    list.appendChild(button);
  });
  activityCard.appendChild(list);

  const controls = document.createElement('div');
  controls.innerHTML = `
    <div class="button-row">
      <button class="btn btn-primary" id="submitVoteButton" ${selectedKey ? '' : 'disabled'}>${vote ? '更新答案' : '送出答案'}</button>
      <button class="btn btn-outline" id="skipVoteButton">暫不作答</button>
    </div>
    <div class="message" id="voteMessage" role="status">${vote ? `你目前的答案是 ${vote.optionKey === 'SKIP' ? '暫不作答' : vote.optionKey + '。可在截止前更新。'}` : '送出前仍可更改選項。'}</div>`;
  activityCard.appendChild(controls);
  document.getElementById('submitVoteButton').addEventListener('click', () => submitVote(question, selectedKey));
  document.getElementById('skipVoteButton').addEventListener('click', () => submitVote(question, 'SKIP'));
}

async function submitVote(question, optionKey) {
  const submit = document.getElementById('submitVoteButton');
  const skip = document.getElementById('skipVoteButton');
  submit.disabled = true;
  skip.disabled = true;
  const message = document.getElementById('voteMessage');
  message.textContent = '正在送出…';
  try {
    const current = await getDoc(doc(db, 'parent_meeting_sessions', sessionCode));
    if (!current.exists() || current.data().phase !== 'open' || QUESTIONS[current.data().questionIndex]?.id !== question.id) {
      throw new Error('本題已截止。');
    }
    await setDoc(doc(db, 'parent_meeting_sessions', sessionCode, 'votes', `${question.id}_${participantId}`), {
      questionId: question.id,
      optionKey,
      participantId,
      updatedAt: serverTimestamp()
    });
    ownVote = { questionId: question.id, optionKey };
    renderSubmitted(question, optionKey);
  } catch (error) {
    message.textContent = error.message || '送出失敗，請重試。';
    message.className = 'message error';
    submit.disabled = !selectedKey;
    skip.disabled = false;
  }
}

function renderSubmitted(question, optionKey) {
  const display = optionKey === 'SKIP'
    ? '你選擇暫不作答。'
    : `你選擇了 ${optionKey}：${question.options.find(item => item.key === optionKey)?.text || ''}`;
  activityCard.innerHTML = `
    <div class="center">
      <div class="waiting-mark">✓</div>
      <p class="eyebrow">答案已收到</p>
      <h2>等待主持人公布</h2>
      <p class="lead" style="margin-inline:auto"></p>
      <button class="btn btn-outline" id="editVoteButton">截止前修改答案</button>
    </div>`;
  activityCard.querySelector('.lead').textContent = display;
  document.getElementById('editVoteButton').addEventListener('click', () => renderQuestion(question, ownVote));
}

function renderClosed(question, vote) {
  const text = vote
    ? (vote.optionKey === 'SKIP' ? '你選擇暫不作答。' : `你選擇了 ${vote.optionKey}。`)
    : '你尚未送出答案。';
  activityCard.innerHTML = `
    <div class="center">
      <div class="waiting-mark">■</div>
      <p class="eyebrow">本題已截止</p>
      <h2>等待公布統計</h2>
      <p class="lead" style="margin-inline:auto"></p>
    </div>`;
  activityCard.querySelector('.lead').textContent = text;
}

function renderResults(question, vote, showFeedback) {
  const counts = sessionData.results?.counts || { A: 0, B: 0, C: 0, D: 0 };
  const total = Number(sessionData.results?.total || 0);
  const skipCount = Number(sessionData.results?.skipCount || 0);
  activityCard.innerHTML = `<p class="eyebrow">全場統計</p><h2></h2><p class="lead">有效作答 ${total} 人${skipCount ? `，暫不作答 ${skipCount} 人` : ''}</p><div class="bars" id="resultBars"></div>`;
  activityCard.querySelector('h2').textContent = question.title;
  const bars = document.getElementById('resultBars');

  question.options.forEach(option => {
    const count = Number(counts[option.key] || 0);
    const percent = total ? Math.round((count / total) * 100) : 0;
    const style = OPTION_STYLES[option.key];
    const row = document.createElement('div');
    row.innerHTML = `
      <div class="bar-top"><span class="bar-label">${option.key}　<span></span></span><span class="bar-number">${count} 人　${percent}%</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${percent}%;background:${style.color}"></div></div>`;
    row.querySelector('.bar-label span').textContent = option.text;
    bars.appendChild(row);
  });

  const note = document.createElement('p');
  note.className = 'privacy-note';
  note.textContent = '人數最多不代表唯一正確。請留意每種回應接住了什麼，又可能忽略了什麼。';
  activityCard.appendChild(note);

  if (vote && vote.optionKey !== 'SKIP') {
    const chosen = question.options.find(item => item.key === vote.optionKey);
    const style = OPTION_STYLES[vote.optionKey];
    const feedback = document.createElement('div');
    feedback.className = 'feedback-card';
    feedback.style.borderColor = style.color;
    feedback.style.background = style.soft;
    feedback.innerHTML = `<div class="feedback-title"><span class="option-key" style="background:${style.color}">${chosen.key}</span><span></span></div><p></p>`;
    feedback.querySelector('.feedback-title span:last-child').textContent = `你選的是「${chosen.label}」`;
    feedback.querySelector('p').textContent = chosen.feedback;
    activityCard.appendChild(feedback);
  }

  if (showFeedback) {
    const allTitle = document.createElement('h3');
    allTitle.style.marginTop = '30px';
    allTitle.textContent = '各選項回饋';
    activityCard.appendChild(allTitle);
    question.options.forEach(option => {
      const style = OPTION_STYLES[option.key];
      const feedback = document.createElement('details');
      feedback.className = 'feedback-card';
      feedback.innerHTML = `<summary class="feedback-title" style="cursor:pointer"><span class="option-key" style="background:${style.color}">${option.key}</span><span></span></summary><p style="margin-top:12px"></p>`;
      feedback.querySelector('summary span:last-child').textContent = option.label;
      feedback.querySelector('p').textContent = option.feedback;
      activityCard.appendChild(feedback);
    });
    const suggestion = document.createElement('div');
    suggestion.className = 'suggestion';
    suggestion.innerHTML = '<small>可以這樣說</small><p></p>';
    suggestion.querySelector('p').textContent = `「${question.suggestion}」`;
    activityCard.appendChild(suggestion);
    if (question.safety) {
      const safety = document.createElement('div');
      safety.className = 'safety';
      safety.textContent = `安全提醒：${question.safety}`;
      activityCard.appendChild(safety);
    }
  } else {
    const wait = document.createElement('p');
    wait.className = 'privacy-note';
    wait.textContent = '主持人稍後會公布各選項解析與建議說法。';
    activityCard.appendChild(wait);
  }
}

function renderClosing() {
  activityCard.innerHTML = `
    <div class="center">
      <p class="eyebrow">活動完成</p>
      <h2>家長可以帶走的四個動作</h2>
      <p class="lead" style="margin-inline:auto">陪伴的目的，是讓孩子逐漸有能力面對不舒服。</p>
      <div class="closing-grid" id="closingGrid"></div>
      <div class="quote" style="text-align:left">情緒，我願意接住。<br>問題，我陪你分析。<br>選擇，你學著決定。<br>責任，你慢慢承擔。</div>
      <p>高二，是從「被照顧」走向「能為自己負責」的重要練習期。</p>
    </div>`;
  const grid = document.getElementById('closingGrid');
  CLOSING_ACTIONS.forEach(([action, words], index) => {
    const item = document.createElement('div');
    item.className = 'closing-item';
    item.innerHTML = `<strong>${index + 1}　${action}</strong><span></span>`;
    item.querySelector('span').textContent = `「${words}」`;
    grid.appendChild(item);
  });
}

function renderWaiting(title, copy) {
  activityCard.innerHTML = `<div class="center"><div class="waiting-mark">…</div><p class="eyebrow">等待中</p><h2></h2><p class="lead" style="margin-inline:auto"></p></div>`;
  activityCard.querySelector('h2').textContent = title;
  activityCard.querySelector('.lead').textContent = copy;
}

function renderUnavailable() {
  window.clearInterval(heartbeatTimer);
  renderWaiting('活動已關閉', '請向主持人確認新的活動代碼。');
  setConnection('活動已關閉', false);
}

function phaseText(phase) {
  return ({ lobby: '等待主持人開始', open: '作答開放中', closed: '作答已截止', results: '統計已公布', feedback: '解析已公布', finished: '謝謝參與' })[phase] || '等待中';
}

function setJoinMessage(text, isError = false) {
  joinMessage.textContent = text;
  joinMessage.className = `message${isError ? ' error' : ''}`;
}

function setConnection(text, online) {
  connectionStatus.className = `status-pill ${online ? 'online' : 'warn'}`;
  connectionStatus.querySelector('span:last-child').textContent = text;
}

function showToast(text) {
  const toast = document.getElementById('toast');
  toast.textContent = text;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 2600);
}
