import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const page = readFileSync(process.argv[2] ?? new URL('../docs/search.html', import.meta.url), 'utf8');
const data = page.match(/<script id="guide-data" type="application\/json">([\s\S]+?)<\/script>/)?.[1];
const search = page.match(/\n(function normalize\(value\) \{[\s\S]+?)\nfor \(const name of chapters\)/)?.[1];
assert.ok(data && search, 'The reader must contain its search index and ranking logic');
assert.ok(!/class="urgent-links"|id="urgent-result"/.test(page), 'Use the regular learning results for all topics');
const index = JSON.parse(data);
const findEntries = runInNewContext(search + '\nfindEntries', {entries: index});

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
  ['刚开始跑步，一跑就喘怎么办？', 'Q402'],
  ['一坐就坐一下午多久起来一次', 'Q465'],
  ['20分钟的电影一坐就是一晚上好看吗？', undefined],
  ['每周只能跑三次怎么备战半马', 'Q131'],
  ['每周三跑 半马', 'Q131'],
  ['我一周就能练两回，每次半小时，怎么安排？', 'Q48'],
  ['晚上跑完步饿了要吃东西吗', 'Q242'],
  ['练完都十点了，还要吃晚饭吗', 'Q242'],
  ['工作日晚练会睡不着吗', 'Q302'],
  ['训练前喝咖啡晚上睡不着', 'Q20'],
  ['半马跑两个半小时要吃几包胶', 'Q21'],
  ['早上七点半马几点起来吃早餐', 'Q26'],
  ['跑完半马多久能准备全马', 'Q33'],
  ['史密斯机空杆多重', 'Q466'],
  ['膝盖可以超过脚尖吗', 'Q467'],
  ['卷腹能减肚子吗', 'Q475'],
  ['浮板打腿不前进', 'Q483'],
  ['土豆发芽了还能吃吗', 'Q493'],
  ['水凝胶有用吗', 'Q503'],
  ['头盔摔过还能用吗', 'Q510'],
  ['癫痫能游泳吗', 'Q515'],
  ['深蹲膝盖能超过脚尖吗', 'Q467'],
  ['自行车前刹还是后刹', 'Q479'],
  ['跳绳多长合适', 'Q491'],
  ['奶酪发霉了还能吃吗', 'Q494'],
  ['山里的溪水能喝吗', 'Q502'],
  ['纹身后多久可以游泳', 'Q511'],
  ['拔智齿后几天能跑步', 'Q512'],
];

for (const [query, expected, chapter, evidence] of cases) {
  const {entries} = findEntries(query, chapter, evidence);
  assert.equal(entries[0]?.qid, expected, [query, chapter, evidence].filter(Boolean).join(' / '));
  assert.ok(entries.every(entry => !chapter || entry.chapter === chapter), 'Apply the chapter filter to every result');
  assert.ok(entries.every(entry => !evidence || entry.grades.includes(evidence)), 'Apply the evidence filter to every result');
}

const topThreeCases = [
  ['5公里 半马', ['Q23']],
  ['五公里 半马', ['Q23']],
  ['第一次半马前5公里应该跑多快', ['Q175', 'Q158']],
  ['半马起跑配速', ['Q175', 'Q158']],
  ['第一次越野跑选多少公里', ['Q417']],
];

for (const [query, expected] of topThreeCases) {
  const actual = findEntries(query).entries.slice(0, 3).map(entry => entry.qid);
  assert.ok(expected.some(qid => actual.includes(qid)), `${query}: expected ${expected.join(' or ')} in ${actual.join(', ')}`);
}

const diabetesCases = ['糖尿病可以跑半马吗', '糖尿病每周只能跑三次能跑半马吗'];
for (const query of diabetesCases) {
  const {entries} = findEntries(query);
  assert.match(entries[0]?.qid ?? '', /^Q38[78]$/, query);
  assert.ok(entries.every(entry => entry.chapter === '常见慢病与运动'), query);
}
assert.equal(findEntries('Q23').entries[0]?.basis, '课表示例');
assert.equal(findEntries('Q33').entries[0]?.basis, '课表示例');
assert.equal(findEntries('Q39').entries[0]?.basis, '临床指南');
assert.equal(findEntries('Q354').entries[0]?.basis, '急救指南');

const questionIds = new Set(index.map(entry => entry.qid));
const homeUrl = new URL('../docs/index.html', import.meta.url);
const home = readFileSync(homeUrl, 'utf8');
const chapterLinks = new Set();
for (const [, target] of home.matchAll(/href="(search\.html[^"]*)"/g)) {
  const url = new URL(target, homeUrl);
  const selectedChapter = url.searchParams.get('chapter');
  const query = url.searchParams.get('q');
  if (selectedChapter) chapterLinks.add(selectedChapter);
  if (query) {
    const first = findEntries(query).entries[0];
    assert.ok(first, `The homepage query has no results: ${query}`);
    if (/^Q\d+$/.test(query)) assert.equal(first.qid, query);
  }
}
assert.deepEqual(chapterLinks, new Set(index.map(entry => entry.chapter)), 'Homepage chapters must match the reader');
assert.match(home, /<form[^>]*action="search\.html"[^>]*>/);
assert.match(home, /<input[^>]*name="q"[^>]*>/);
for (const [, asset] of home.matchAll(/(?:href|src)="(assets\/[^"]+)"/g)) {
  assert.ok(existsSync(new URL(asset, homeUrl)), `Missing homepage asset: ${asset}`);
}
for (const [file, example] of [['start-with-two-sessions.html', 'Q48'], ['first-half-marathon.html', 'Q131']]) {
  assert.ok(page.includes(`/${file}"`), `The search home must link to ${file}`);
  const guide = readFileSync(new URL(`../docs/${file}`, import.meta.url), 'utf8');
  assert.ok(guide.includes('href="search.html"'), `${file} must link back to search`);
  const links = Array.from(guide.matchAll(/href="search\.html\?q=(Q\d+)#results"/g), ([, qid]) => qid);
  assert.ok(links.includes(example), `${file} must link to ${example}`);
  assert.ok(links.every(qid => questionIds.has(qid)), `${file} links to a missing question`);
}

console.log(`Verified ${cases.length + topThreeCases.length + diabetesCases.length} search queries and filters, plus source labels, homepage navigation, assets and guide links.`);
