import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const [dataSource, clientHtml, hostHtml, clientJs, hostJs, rules] = await Promise.all([
  readFile(new URL('js/parent-meeting-data.js', root), 'utf8'),
  readFile(new URL('parent-meeting.html', root), 'utf8'),
  readFile(new URL('parent-meeting-host.html', root), 'utf8'),
  readFile(new URL('js/parent-meeting-client.js', root), 'utf8'),
  readFile(new URL('js/parent-meeting-host.js', root), 'utf8'),
  readFile(new URL('firestore.rules', root), 'utf8')
]);

const data = await import(new URL('js/parent-meeting-data.js', root).href);

assert.equal(data.QUESTIONS.length, 6, 'must include six scenarios');
assert.equal(new Set(data.QUESTIONS.map(question => question.id)).size, 6, 'question ids must be unique');
for (const question of data.QUESTIONS) {
  assert.deepEqual(question.options.map(option => option.key), ['A', 'B', 'C', 'D']);
  assert.ok(question.suggestion, `${question.id} needs a suggested response`);
}

assert.match(dataSource, /在科學班真的好累/);
assert.match(dataSource, /我就爛/);
assert.match(clientHtml, /匿名加入/);
assert.match(hostHtml, /開放作答/);
assert.match(hostHtml, /公布統計/);
assert.match(hostHtml, /顯示解析/);
assert.match(clientJs, /serverTimestamp/);
assert.match(hostJs, /latestSnapshot/);
assert.match(rules, /parent_meeting_sessions/);
assert.match(rules, /\^\[A-Z0-9\]\{6\}\$/);

console.log('parent meeting static smoke test: PASS');
