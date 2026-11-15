import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const page = readFileSync(process.argv[2] ?? new URL('../docs/search.html', import.meta.url), 'utf8');
const data = page.match(/<script id="guide-data" type="application\/json">([\s\S]+?)<\/script>/)?.[1];
const search = page.match(/\n(function normalize\(value\) \{[\s\S]+?)\nfor \(const name of chapters\)/)?.[1];
assert.ok(data && search, 'The reader must contain its search index and ranking logic');
assert.ok(!/class="urgent-links"|id="urgent-result"/.test(page), 'Use the regular learning results for all topics');
const findEntries = runInNewContext(search + '\nfindEntries', {entries: JSON.parse(data)});

const cases = [
  ['退烧后活动胸闷怎么办', 'Q319'],
  ['跑完膝盖疼外侧怎么回事', 'Q330'],
  ['没有胸痛但跑步膝盖外侧疼', 'Q330'],
  ['跑步时膝盖疼怎么办', 'Q329'],
  ['膝盖扭了肿起来怎么办', 'Q331'],
  ['跑步膝盖有响声', 'Q449'],
  ['跑半马要带几个能量胶', 'Q21'],
  ['一跑就喘', 'Q402'],
  ['怎么申请护照', undefined],
  ['跑步机没反应', undefined],
  ['Q329', 'Q329'],
  ['膝盖下楼疼还能跑吗', 'Q329'],
  ['高血压能举铁吗', 'Q381'],
  ['每周只有两次时间怎么练', 'Q48'],
  ['深蹲应该蹲多深', 'Q73'],
  ['练完第二天酸痛还要继续练吗', 'Q327'],
  ['零基础怎么开始跑步', 'Q401'],
  ['运动中胸痛', 'Q353'],
  ['跑着跑着胸口疼', 'Q353'],
  ['每次跑步的时候胸疼同时眼前发黑', 'Q353'],
  ['锻炼时人晕过去没反应怎么办', 'Q354'],
  ['热天跑步晕倒了叫不醒', 'Q354'],
  ['人跑着突然晕了不醒', 'Q354'],
  ['同伴倒地且呼吸异常', 'Q354'],
  ['AED怎么用', 'Q354'],
  ['怎么做心肺复苏', 'Q354'],
  ['热射病', 'Q355'],
  ['运动时突然呼吸困难', 'Q353'],
  ['热天跑步同伴意识模糊怎么办', 'Q355'],
  ['运动中胸痛', 'Q353', '训练相关健康', 'C'],
  ['运动中胸痛', undefined, '训练相关健康', 'A'],
  ['运动中胸痛', undefined, '日常饮食'],
  ['Q354', 'Q354'],
  ['Q354', undefined, '日常饮食', 'A'],
];

for (const [query, expected, chapter, evidence] of cases) {
  const {entries} = findEntries(query, chapter, evidence);
  assert.equal(entries[0]?.qid, expected, [query, chapter, evidence].filter(Boolean).join(' / '));
  assert.ok(entries.every(entry => !chapter || entry.chapter === chapter), 'Apply the chapter filter to every result');
  assert.ok(entries.every(entry => !evidence || entry.grades.includes(evidence)), 'Apply the evidence filter to every result');
}

const {entries: diabetesResults} = findEntries('糖尿病可以跑半马吗');
assert.match(diabetesResults[0]?.qid ?? '', /^Q38[78]$/);
assert.equal(findEntries('Q23').entries[0]?.basis, '课表示例');
assert.equal(findEntries('Q33').entries[0]?.basis, '课表示例');
assert.equal(findEntries('Q39').entries[0]?.basis, '临床指南');
assert.equal(findEntries('Q354').entries[0]?.basis, '急救指南');
console.log(`Verified ${cases.length + 1} search queries and filters, plus source labels.`);
