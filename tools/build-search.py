"""Build the offline reader from the guide's Markdown."""
import argparse
import json
from pathlib import Path
import re
import sys
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "docs/topics-400.md"
OUTPUT = ROOT / "docs/search.html"
REPOSITORY = "https://github.com/jiangweiqi001/sports-nutrition-health"
ENTRY = re.compile(r'^<a name="(q\d+)"></a>\s+^### (.+)$', re.M)
QUESTION = re.compile(r'^- \[(Q\d+)\]\(([^)]+)\) (.+)$', re.M)
FIELD = re.compile(r'^- \*\*([^*]+)\*\*\s+(.+)$', re.M)
# The guide labels individual conclusions; cited grades such as 1A are separate.
EVIDENCE_MARKER = re.compile(r'(?:^|[。；])\s*([ABC])(?=[（。])')
SECTIONS = {
    "抗阻训练": "运动",
    "拉伸与活动度": "运动",
    "有氧训练": "运动",
    "日常饮食": "营养",
    "训练饮食与补剂": "营养",
    "长跑营养": "营养",
    "训练相关健康": "健康",
    "常见慢病与运动": "健康",
}
ALIASES = {
    6: "晚上健身 晚上练 晚练 下班训练 先吃还是先练",
    13: "晚上健身 晚上练 晚练 练完还吃吗 练完回家吃饭 下班练完还要吃吗 下班练完还要吃晚饭吗",
    20: "晚上健身 晚上练 晚练 喝咖啡睡不着 氮泵",
    23: "首半马怎么准备 第一次半马 选课表 备赛起点",
    48: "时间少 没空练 每周只有两次空档 半小时",
    78: "加一档太重 哑铃档位太大 哑铃加重 5公斤到7.5公斤",
    234: "减肥饿肚子 肚子咕咕叫 减脂很饿",
    242: "晚上健身 晚上练 晚练 练完还吃吗 晚饭睡觉",
    274: "越野固体补给 吃胶吃腻了 甜味",
    329: "跑步膝盖疼 膝盖疼 跑步膝疼 下楼疼 膝前痛",
    354: "心肺复苏 心脏骤停 CPR AED 叫不醒 倒地",
    355: "中暑 热射病 高温意识模糊 热天倒地",
    401: "零基础 步行 开始运动 怎么开始",
    403: "跑跑走走 跑走结合 走跑交替",
    422: "时间少 没空练 碎片时间 快走",
    427: "坐垫磨痛 共享单车 小黄车 骑车磨屁股",
    429: "电助力 电自行车 脚踏助力 骑车",
    430: "零基础游泳 不会游泳 怕水 怕深水",
    433: "划船器 手臂酸 划船机 划船动作",
    448: "岔气 跑步肚子疼 肋骨下面疼 右上腹痛",
    461: "家里单杠 免打孔 门框 引体向上",
    463: "睡前拉伸 冷拉伸 没热身 拉伸前热身",
    464: "每天走多少步 一万步 万步 10000步 1万步 计步",
    465: "打断久坐 上班久坐 办公室坐太久 多久起来 坐多久起来一次",
}

def read(path):
    return path.read_text(encoding="utf-8")

def catalog_entries():
    chapter = None
    for line in read(CATALOG).splitlines():
        heading = re.match(r"^#### (.+)（\d+ 题）$", line)
        if heading:
            chapter = heading[1]
        match = QUESTION.match(line)
        if match:
            yield chapter, match.groups()

def read_answers(path):
    content = read(path)
    headings = list(ENTRY.finditer(content))
    answers = {}
    for index, heading in enumerate(headings):
        end = headings[index + 1].start() if index + 1 < len(headings) else len(content)
        fields = FIELD.findall(content[heading.end():end])
        expected = ["怎么做", "成本", "说人话", "收益", "证据等级", "适用与备注", "来源"]
        if [label for label, _ in fields] != expected:
            raise ValueError(f"{path.name} {heading[1]}: incomplete answer")
        if heading[1] in answers:
            raise ValueError(f"{path.name}: repeated anchor {heading[1]}")
        answers[heading[1]] = (heading[2], fields)
    return answers

def build_index():
    entries = []
    cached_answers = {}
    for chapter, (qid, target, question) in catalog_entries():
        if chapter not in SECTIONS:
            raise ValueError(f"{qid}: unknown chapter {chapter}")
        location = urlsplit(target)
        path = (CATALOG.parent / location.path).resolve()
        if not path.is_relative_to(ROOT / "book") or location.fragment != qid.lower():
            raise ValueError(f"{qid}: invalid link {target}")
        if path not in cached_answers:
            cached_answers[path] = read_answers(path)
        title, fields = cached_answers[path][location.fragment]
        number = int(qid[1:])
        evidence = dict(fields)["证据等级"]
        entries.append({
            "id": number, "qid": qid, "section": SECTIONS[chapter], "chapter": chapter,
            "question": question, "title": title, "fields": fields,
            "path": path.relative_to(ROOT).as_posix(), "aliases": ALIASES.get(number, ""),
            "grades": sorted(set(EVIDENCE_MARKER.findall(evidence))),
        })
    catalog_answers = {(ROOT / item["path"], item["qid"].lower()) for item in entries}
    for chapter_path in (ROOT / "book").rglob("*.md"):
        answers = cached_answers.get(chapter_path)
        if answers is None:
            answers = read_answers(chapter_path)
        for anchor in answers:
            if (chapter_path, anchor) not in catalog_answers:
                raise ValueError(f"{chapter_path.relative_to(ROOT)}: {anchor} missing from the catalog")
    entries.sort(key=lambda item: item["id"])
    if not entries or [item["id"] for item in entries] != list(range(1, len(entries) + 1)):
        raise ValueError("The catalog must list each question ID once.")
    return entries

def render(entries):
    template = read(ROOT / "tools/search-template.html")
    # Prevent Markdown copied into the index from ending the JSON script element.
    data = json.dumps(entries, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")
    return (template.replace("{{GUIDE_DATA}}", data)
            .replace("{{QUESTION_COUNT}}", str(len(entries)))
            .replace("{{REPOSITORY}}", REPOSITORY))

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="check whether the offline page is current")
    args = parser.parse_args()
    entries = build_index()
    page = render(entries)
    if args.check:
        if not OUTPUT.is_file() or read(OUTPUT) != page:
            sys.exit("docs/search.html is out of date. Run python tools/build-search.py.")
        print(f"{len(entries)} questions in the current offline reader.")
    else:
        OUTPUT.write_text(page, encoding="utf-8", newline="\n")
        print(f"Wrote docs/search.html with {len(entries)} questions.")

if __name__ == "__main__":
    main()
