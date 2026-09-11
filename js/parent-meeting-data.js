export const APP_TITLE = '高二家長的角色：接住情緒，與孩子互助共好';
export const APP_SUBTITLE = '家長會互動討論｜支持不是替孩子移除所有挫折';

export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAov-9uW6FZQmf41-PPJ4-plvqR-Bu6zg4',
  authDomain: 'teaching-test-5fd1c.firebaseapp.com',
  projectId: 'teaching-test-5fd1c',
  storageBucket: 'teaching-test-5fd1c.firebasestorage.app',
  messagingSenderId: '404776287999',
  appId: '1:404776287999:web:6b14120c71c8962fe396ca'
};

export const OPTION_STYLES = {
  A: { color: '#b86b25', soft: '#fff0df' },
  B: { color: '#b64b48', soft: '#fdeceb' },
  C: { color: '#247568', soft: '#e5f3ef' },
  D: { color: '#456c91', soft: '#eaf1f7' }
};

export const QUESTIONS = [
  {
    id: 'q1',
    title: '「在科學班真的好累，我想休息，不想準備了。」',
    options: [
      { key: 'A', text: '那就先停下來吧，開心最重要。', label: '過度包容', feedback: '情緒被接住，但也可能讓孩子學到，不舒服時挑戰就會被移除。' },
      { key: 'B', text: '大家都累，你再撐一下就好了。', label: '高風險回應', feedback: '保留了要求，卻忽略情緒；孩子可能覺得「說了也沒用」。' },
      { key: 'C', text: '我知道你很累。我們先看看是需要休息，還是真的想放棄。', label: '支持＋界線', feedback: '先理解疲累，再區分「需要休息」與「逃離挑戰」，最後回到下一步。' },
      { key: 'D', text: '這是你的事，你自己決定。', label: '過度放手', feedback: '把自主當成完全不介入，孩子可能在最需要支持時感到被丟下。' }
    ],
    suggestion: '我知道你真的很累。我們可以先休息，但休息後還是要一起決定下一步。'
  },
  {
    id: 'q2',
    title: '「老師要求太多，我不想交作業了。」',
    options: [
      { key: 'A', text: '我直接跟老師反映，請老師不要要求這麼多。', label: '過度包容', feedback: '大人太快介入，孩子少了練習溝通、安排與解決問題的機會。' },
      { key: 'B', text: '老師一定有他的道理，你照做就對了。', label: '高風險回應', feedback: '直接站在權威一方，容易讓孩子停止說明真正的困難。' },
      { key: 'C', text: '先告訴我是哪一部分讓你覺得撐不住，我們看看哪些可以由你先處理。', label: '支持＋界線', feedback: '先理解問題，再把可處理的部分交還孩子；必要時家長才提供協助。' },
      { key: 'D', text: '你都高二了，自己的事情自己處理。', label: '過度放手', feedback: '強調責任卻沒有提供支持，對仍在學習自主管理的高二生可能過快。' }
    ],
    suggestion: '你可以先想想自己能處理哪一部分；真的超過你的能力，我們再一起找資源。'
  },
  {
    id: 'q3',
    title: '考差後說：「反正我就是不會，我就爛。」',
    options: [
      { key: 'A', text: '沒關係啦，一次考不好不要想太多。', label: '過度包容', feedback: '安慰有用，但若停在「沒關係」，可能錯過從失敗中學習的機會。' },
      { key: 'B', text: '就是你之前沒有好好準備。', label: '高風險回應', feedback: '把失敗快速歸因於態度，容易引發防衛與羞愧。' },
      { key: 'C', text: '看得出來你很挫折。等情緒緩一點，我們一起找出這次卡在哪裡。', label: '支持＋界線', feedback: '允許挫折存在，同時要求回頭檢視策略，建立可改善的行動。' },
      { key: 'D', text: '那我立刻幫你找補習班。', label: '過度包容', feedback: '資源不是問題，但太快替孩子安排，容易跳過孩子自己的反思與選擇。' }
    ],
    suggestion: '考差可以難過，但我們不能只停在難過。等一下你告訴我，下次最想改哪一件事？'
  },
  {
    id: 'q4',
    title: '「別人都比我強，我想退出競賽。」',
    options: [
      { key: 'A', text: '不喜歡就不要做，別勉強自己。', label: '過度包容', feedback: '尊重選擇沒錯，但太快同意退出，可能讓孩子用退出迴避挫敗。' },
      { key: 'B', text: '都做兩個月了，怎麼可以放棄！', label: '高風險回應', feedback: '只要求堅持，卻忽略目標是否仍有意義，也可能讓孩子更抗拒。' },
      { key: 'C', text: '退出可以討論，但先分清楚：是不喜歡，還是因為害怕做不好？', label: '支持＋界線', feedback: '允許重新選擇，但要求先理解自己的動機，再承擔決定。' },
      { key: 'D', text: '你自己決定就好，我不管。', label: '過度放手', feedback: '自主不是孤軍奮戰；家長仍可提供思考框架與陪伴。' }
    ],
    suggestion: '你可以退出，但我希望你不是因為害怕輸才退出。先把原因想清楚，再做決定。'
  },
  {
    id: 'q5',
    title: '「同學都比我厲害，我覺得自己不適合待在這裡。」',
    options: [
      { key: 'A', text: '不要跟別人比，做自己就好。', label: '過度包容', feedback: '是善意安慰，但可能太快把孩子的真實挫敗感蓋掉。' },
      { key: 'B', text: '你能進來就代表你有實力，不要想太多。', label: '高風險回應', feedback: '用道理反駁感受，孩子可能覺得自己的困難沒有被看見。' },
      { key: 'C', text: '最近發生了什麼，讓你開始覺得自己不適合？', label: '支持＋界線', feedback: '先找出具體事件與想法，再討論可行調整，不立即否定或撤退。' },
      { key: 'D', text: '那我們乾脆換環境。', label: '過度包容', feedback: '環境調整有時必要，但不宜在尚未理解問題前直接替孩子撤除挑戰。' }
    ],
    suggestion: '我不急著說你想錯了。你先告訴我，是哪些事情讓你有這種感覺？'
  },
  {
    id: 'q6',
    title: '孩子明顯狀態不好，卻說：「沒事，我不想講。」',
    options: [
      { key: 'A', text: '好，你想說再說。之後完全不再問。', label: '過度放手', feedback: '尊重界線，但若完全退出，可能錯過孩子需要大人持續關注的訊號。' },
      { key: 'B', text: '你一定有事，現在就跟我講清楚。', label: '高風險回應', feedback: '強迫揭露容易破壞安全感，讓孩子更不願意說。' },
      { key: 'C', text: '好，我現在不追問。但我有點擔心你，晚一點我會再來關心你。', label: '支持＋界線', feedback: '尊重當下不說的權利，同時清楚表達，大人不會因此停止關心。' },
      { key: 'D', text: '直接去問他的同學或老師發生什麼事。', label: '高風險回應', feedback: '一般情況下可能破壞信任；若涉及安全疑慮，才需要主動尋求協助。' }
    ],
    suggestion: '你現在可以不說，但我會繼續關心你。等你準備好，我願意聽。',
    safety: '如果觀察到自傷、受暴、失聯或其他立即安全風險，不應只等待孩子主動開口，應盡快聯絡學校或合適的專業資源。'
  }
];

export const CLOSING_ACTIONS = [
  ['接住', '我知道你現在真的很挫折。'],
  ['釐清', '你現在需要的是休息、方法，還是協助？'],
  ['設界線', '可以休息，但這件事仍需要處理。'],
  ['還責任', '你想怎麼做？下一步由你選，我可以陪你。']
];

export function normalizeSessionCode(value = '') {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

export function makeParticipantId() {
  const key = 'parentMeetingParticipantId';
  let value = localStorage.getItem(key);
  if (!value) {
    value = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(key, value);
  }
  return value;
}
