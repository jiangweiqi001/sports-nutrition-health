import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const page = readFileSync(process.argv[2] ?? new URL('../docs/search.html', import.meta.url), 'utf8');
const data = page.match(/<script id="guide-data" type="application\/json">([\s\S]+?)<\/script>/)?.[1];
const search = page.match(/\n(function normalize\(value\) \{[\s\S]+?)\nfor \(const name of chapters\)/)?.[1];
assert.ok(data && search, 'The reader must contain its search index and ranking logic');
const findEntries = runInNewContext(search + '\nfindEntries', {entries: JSON.parse(data)});

const cases = [
  ['运动中胸痛', 'Q353'],
  ['跑着跑着胸口疼', 'Q353'],
  ['每次跑步的时候胸疼同时眼前发黑', 'Q353'],
  ['锻炼时人晕过去没反应怎么办', 'Q354'],
  ['热天跑步晕倒了叫不醒', 'Q354'],
  ['热天跑步同伴意识模糊怎么办', 'Q355'],
  ['退烧后活动胸闷怎么办', 'Q319'],
  ['跑完膝盖疼外侧怎么回事', 'Q330'],
  ['没有胸痛但跑步膝盖外侧疼', 'Q330'],
  ['跑步时膝盖疼怎么办', 'Q329'],
  ['膝盖扭了肿起来怎么办', 'Q331'],
  ['跑步膝盖有响声', 'Q449'],
  ['跑半马要带几个能量胶', 'Q21'],
  ['怎么申请护照', undefined],
  ['跑步机没反应', undefined],
  ['Q329', 'Q329'],
  ['运动中胸痛', 'Q353', '训练相关健康', 'C'],
  ['运动中胸痛', undefined, '训练相关健康', 'A'],
  ['运动中胸痛', undefined, '日常饮食'],
];

for (const [query, expected, chapter, evidence] of cases) {
  const {entries} = findEntries(query, chapter, evidence);
  assert.equal(entries[0]?.qid, expected, [query, chapter, evidence].filter(Boolean).join(' / '));
}
console.log(`Verified ${cases.length} search queries and filters.`);
