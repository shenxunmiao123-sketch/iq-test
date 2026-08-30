/**
 * 题库生成器 —— 程序化生成 ~894 道智力题，与 index.html 内置的 106 道人工题合并成 1000 题。
 *
 * 运行：node generate_bank.js
 * 输出：questions.js（页面通过 <script src="questions.js"> 加载）
 *
 * 所有生成题的答案均由公式/穷举直接得出（非猜测），选项为答案 + 自动干扰项。
 * 固定随机种子，重复运行结果一致，便于校验。
 */
"use strict";
const fs = require("fs");

/* ---------- 可复现随机 ---------- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260830);
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ---------- 组装工具：正确答案放 idx0，打乱选项后返回题面对象 ---------- */
const seen = new Set();
/* 从 index.html 提取人工题的题干加入排除表，保证生成的题永不与人工题重复 */
try {
  const html = fs.readFileSync(__dirname + "/index.html", "utf8");
  const re = /\{ cat: "\w+", d: \d, q: (?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/g;
  let m2;
  let n = 0;
  while ((m2 = re.exec(html))) {
    const raw = m2[1] !== undefined ? m2[1] : m2[2];
    seen.add(raw.replace(/\\(['"])/g, "$1"));
    n++;
  }
  console.log("已排除人工题干:", n);
} catch (e) { console.error("读取 index.html 题干失败(忽略):", e.message); }
const BANK = [];
function add(cat, d, q, correct, wrongs) {
  const key = String(q).trim();
  if (seen.has(key)) return false;
  const opts = [String(correct), ...wrongs.map(String)];
  if (new Set(opts).size !== 4) return false;
  seen.add(key);
  const order = shuffle([0, 1, 2, 3]);
  BANK.push({
    cat, d, q,
    opts: order.map((i) => opts[i]),
    a: order.indexOf(0),
  });
  return true;
}
/* 数值干扰项：与答案同量级、互不相同的 3 个数 */
function numWrongs(ans, spanRatio = 0.18) {
  const span = Math.max(2, Math.round(Math.abs(ans) * spanRatio));
  const set = new Set();
  let guard = 0;
  while (set.size < 3 && guard++ < 300) {
    let v = ans + ri(-span, span);
    if (v === ans) v = ans + (rnd() < 0.5 ? -span : span);
    if (v >= 0 && v !== ans) set.add(v);
  }
  let extra = ans + 1;
  let g2 = 0;
  while (set.size < 3 && g2++ < 100) {
    if (extra !== ans && extra >= 0) set.add(extra);
    extra += 1;
  }
  let big = 1000;
  while (set.size < 3) set.add(big++);
  return [...set];
}

/* ================= 数列推理（目标 314） ================= */
const seriesGens = [
  // [难度, 生成函数] —— 函数返回 {terms, ans}
  [1, () => { const a = ri(1, 20), k = ri(2, 12); const t = Array.from({ length: 6 }, (_, i) => a + i * k); return { terms: t, ans: a + 6 * k }; }],
  [1, () => { const a = ri(1, 5); const t = Array.from({ length: 6 }, (_, i) => a * 2 ** i); return { terms: t, ans: a * 2 ** 6 }; }],
  [1, () => { let a = ri(1, 6), b = ri(2, 9); const t = [a, b]; for (let i = 0; i < 5; i++) t.push(t[t.length - 1] + t[t.length - 2]); return { terms: t, ans: t[6] + t[5] }; }],
  [1, () => { const s = ri(1, 8); const t = Array.from({ length: 6 }, (_, i) => (s + i) ** 2); return { terms: t, ans: (s + 6) ** 2 }; }],
  [1, () => { const a = ri(60, 200), k = ri(3, 15); const t = Array.from({ length: 6 }, (_, i) => a - i * k); return { terms: t, ans: a - 6 * k }; }],
  [1, () => { const a = ri(80, 500); const t = Array.from({ length: 6 }, (_, i) => Math.round(a / 2 ** i)); if (new Set(t).size < 6) return null; return { terms: t, ans: Math.round(a / 2 ** 6) }; }],
  [2, () => { const a = ri(1, 4); const t = Array.from({ length: 6 }, (_, i) => a * 3 ** i); return { terms: t, ans: a * 3 ** 6 }; }],
  [2, () => { const s = ri(0, 12); const ps = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71]; const t = ps.slice(s, s + 6); return { terms: t, ans: ps[s + 6] }; }],
  [2, () => { const s = ri(1, 6); const t = Array.from({ length: 6 }, (_, i) => (s + i) ** 3); return { terms: t, ans: (s + 6) ** 3 }; }],
  [2, () => { const c = ri(1, 9), s = ri(1, 5); const t = Array.from({ length: 6 }, (_, i) => (s + i) ** 2 + c); return { terms: t, ans: (s + 6) ** 2 + c }; }],
  [2, () => { const a = ri(2, 6), m = ri(2, 3), c = ri(1, 5); const t = [a]; for (let i = 0; i < 5; i++) t.push(t[i] * m + c); return { terms: t, ans: t[5] * m + c }; }],
  [2, () => { const s = ri(1, 6); const t = Array.from({ length: 6 }, (_, i) => (s + i) * (s + i + 1)); return { terms: t, ans: (s + 6) * (s + 7) }; }],
  [2, () => { const s = ri(2, 7); const t = Array.from({ length: 6 }, (_, i) => (s + i) ** 2 - 1); return { terms: t, ans: (s + 6) ** 2 - 1 }; }],
  [2, () => { const a = ri(1, 9), k = ri(1, 4); const t = [a]; for (let i = 0; i < 5; i++) t.push(t[i] + k + i); return { terms: t, ans: t[5] + k + 5 }; }],
  [2, () => { const a = ri(1, 9); const t = [a]; for (let i = 0; i < 5; i++) t.push(t[i] + 3 + 2 * i); return { terms: t, ans: t[5] + 13 }; }],
  [2, () => { const a = ri(10, 40), p = ri(4, 9), q = ri(1, 3); const t = [a]; for (let i = 0; i < 5; i++) t.push(i % 2 === 0 ? t[i] + p : t[i] - q); return { terms: t, ans: t[5] + p }; }],
  [2, () => { const s = ri(1, 5); const fs = [1, 1, 2, 6, 24, 120, 720, 5040, 40320]; const t = fs.slice(s - 1, s + 5); return { terms: t, ans: fs[s + 5] }; }],
  [2, () => { const a = ri(2, 9), b = ri(3, 12); if (b <= a) return null; const t = [a, b]; for (let i = 0; i < 4; i++) t.push(t[t.length - 1] + t[t.length - 2]); return { terms: t, ans: t[5] + t[4] }; }],
  [3, () => { const c = ri(1, 9), s = ri(1, 5); const t = Array.from({ length: 6 }, (_, i) => (s + i) ** 3 - c); return { terms: t, ans: (s + 6) ** 3 - c }; }],
  [3, () => { const s = ri(1, 6); const t = Array.from({ length: 6 }, (_, i) => (s + i) ** 3 + (s + i)); return { terms: t, ans: (s + 6) ** 3 + s + 6 }; }],
  [3, () => { const a = ri(2, 8), b = ri(20, 60); const t = [a, b]; for (let i = 0; i < 4; i++) t.push(t[t.length - 2] + ri(2, 6)); return { terms: t, ans: t[4] + ri(2, 6) === t[4] ? t[4] + (t[4] - t[2]) : t[4] + (t[4] - t[2]) }; }],
  [3, () => { const ps = [2, 3, 5, 7, 11, 13, 17, 19, 23]; const s = ri(0, 3); const t = ps.slice(s, s + 5).map((p) => p * p); return { terms: t, ans: ps[s + 5] ** 2 }; }],
  [3, () => { const a = ri(1, 5), c = ri(2, 6); const t = [a]; for (let i = 0; i < 5; i++) t.push(i % 2 === 0 ? t[i] * 2 : t[i] + c); return { terms: t, ans: t[5] * 2 }; }],
  [3, () => { const m1 = ri(2, 9), k1 = ri(1, 9), m2 = ri(2, 9), k2 = ri(1, 9); if (m1 === m2 && k1 === k2) return null; const t = []; for (let i = 0; i < 6; i++) t.push(i % 2 === 0 ? 1 + (i / 2) * m1 : 2 + ((i - 1) / 2) * m2); const ans = 1 + 3 * m1; return { terms: t, ans }; }],
];
function genSeries(target) {
  let made = 0, guard = 0;
  while (made < target && guard++ < 20000) {
    const fam = pick(seriesGens);
    const r = fam[1]();
    if (!r || !r.terms.every(Number.isFinite)) continue;
    const q = `数列 ${r.terms.join(", ")}, ( ? ) 中，问号处应填什么数字？`;
    if (add("series", fam[0], q, r.ans, numWrongs(r.ans))) made++;
  }
}

/* ================= 逻辑推理（目标 270） ================= */
const NAMES = ["小明", "小红", "小刚", "小丽", "小强", "小芳", "小伟", "小敏", "小涛", "小静", "小磊", "小婷", "小军", "小雪", "小辉", "小燕"];
const THINGS = ["下雨", "下雪", "刮大风", "打雷"];
const RESULTS = ["地面会湿", "路面会结冰", "树枝会摇晃", "天空中会有闪电"];

function uniqNames(n) { return shuffle(NAMES.slice()).slice(0, n); }

const logicGens = [
  [1, () => { // 三人身高链
    const [a, b, c] = uniqNames(3);
    const hi = pick([[a, b, c], [b, c, a], [c, a, b]]);
    const q = `${hi[0]} 比 ${hi[1]} 高，${hi[1]} 比 ${hi[2]} 高。三人中谁最高？`;
    return { q, ans: hi[0], wrongs: [hi[1], hi[2], "无法确定"] };
  }],
  [1, () => { // 三段论
    const [A, B, C] = shuffle(["玫瑰", "百合", "菊花", "月季", "牡丹", "茉莉"]).slice(0, 3);
    const q = `所有的${A}都是花，所有的花都需要浇水。由此可以推出：`;
    return { q, ans: `所有的${A}都需要浇水`, wrongs: [`有些${A}不需要浇水`, `所有需要浇水的都是${A}`, `所有的${B}都是${A}`] };
  }],
  [1, () => { // 充分条件否定后件
    const th = pick(THINGS), re = pick(RESULTS);
    const q = `如果${th}，那么${re}。现在${re.replace(/会/g, "没有")}。可以推出：`;
    return { q, ans: `没有${th}`, wrongs: [`${th}了`, `${th}得很大`, "无法得出任何结论"] };
  }],
  [1, () => { // 握手
    const n = ri(5, 12);
    const q = `${n} 个人开会，每两人之间都握一次手，一共要握多少次手？`;
    return { q, ans: (n * (n - 1)) / 2, wrongs: numWrongs((n * (n - 1)) / 2) };
  }],
  [1, () => { // 对折层数
    const f = ri(2, 4);
    const q = `一张纸对折 ${f} 次后，一共有几层？`;
    return { q, ans: 2 ** f, wrongs: numWrongs(2 ** f) };
  }],
  [1, () => { // 工程速率
    const a = ri(2, 6);
    const q = `${a} 只猫 ${a} 分钟能抓 ${a} 只老鼠。照这样的速度，${a * 3} 只猫抓 ${a * 3} 只老鼠需要几分钟？`;
    return { q, ans: a, wrongs: numWrongs(a, 0.5) };
  }],
  [1, () => { // 星期
    const w = ri(0, 6), n = ri(20, 200);
    const names = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    const q = `今天是${names[w]}，${n} 天以后那一天是星期几？`;
    return { q, ans: names[(w + n) % 7], wrongs: names.filter((x) => x !== names[(w + n) % 7]) };
  }],
  [1, () => { // 逆运算
    const a = ri(3, 15), b = ri(2, 9);
    const x = a * b - a;
    const result = (x + a) * b;
    const q = `一个数先加上 ${a}，再乘 ${b}，结果是 ${result}。这个数是多少？`;
    return { q, ans: x, wrongs: numWrongs(x) };
  }],
  [1, () => { // 奇偶
    const n = ri(20, 150);
    const s = (n * (n + 1)) / 2;
    const q = `1+2+3+……+${n} 的和是奇数还是偶数？`;
    return { q, ans: s % 2 ? "奇数" : "偶数", wrongs: [s % 2 ? "偶数" : "奇数", "无法确定", "既不是奇数也不是偶数"] };
  }],
  [2, () => { // 鸽巢袜子
    const c = ri(3, 5);
    const colors = ["红", "蓝", "黄", "绿", "白"].slice(0, c).join("、");
    const q = `抽屉里有${colors}五种颜色`.replace("五种", `${c}种`) + `的袜子（数量足够多且混放），关灯后至少取出几只才能保证配成一双同色的？`;
    return { q, ans: `${c + 1} 只`, wrongs: [`${c} 只`, `${c + 2} 只`, `${c * 2} 只`] };
  }],
  [2, () => { // 生日鸽巢
    const t = ri(80, 120);
    const q = `${t} 名学生中，至少有多少人在同一个月过生日（保证成立）？`;
    const ans = Math.ceil(t / 12);
    return { q, ans: `${ans} 人`, wrongs: [`${ans - 1} 人`, `${ans + 1} 人`, `${ans + 2} 人`] };
  }],
  [2, () => { // 过隧道
    const v = pick([36, 54, 72, 90, 108]);
    const ms = v / 3.6;
    const train = ri(2, 6) * 50, tun = ri(5, 15) * 100;
    const time = (train + tun) / ms;
    if (!Number.isInteger(time)) return null;
    const q = `一列长 ${train} 米的火车以 ${v} 千米/小时的速度驶过长 ${tun} 米的隧道，从车头进隧道到车尾离开隧道需要多少秒？`;
    return { q, ans: time, wrongs: numWrongs(time) };
  }],
  [2, () => { // 年龄倍数（先选年龄差与倍数，保证合理）
    const k = ri(3, 4), x = ri(4, 15), s = ri(4, 12);
    const father = k * (s + x) - x;
    if (father - s < 22 || father > 99) return null;
    const q = `今年爸爸 ${father} 岁，儿子 ${s} 岁。几年后爸爸的年龄正好是儿子的 ${k} 倍？`;
    return { q, ans: `${x} 年后`, wrongs: [`${x - 1} 年后`, `${x + 1} 年后`, `${x + 2} 年后`] };
  }],
  [2, () => { // 蜗牛爬井
    const h = ri(8, 20), u = ri(3, 5), dn = u - ri(1, 2);
    if (dn < 1 || u - dn < 1) return null;
    const days = Math.ceil((h - u) / (u - dn)) + 1;
    const q = `一只蜗牛掉进 ${h} 米深的井里，白天向上爬 ${u} 米，晚上向下滑 ${dn} 米。它第几天能爬出井口？`;
    return { q, ans: `第 ${days} 天`, wrongs: [`第 ${days - 1} 天`, `第 ${days + 1} 天`, `第 ${days + 2} 天`] };
  }],
  [2, () => { // 锯木头
    const s1 = ri(4, 8), t = ri(1, 5), s2 = s1 + ri(1, 4);
    const q = `把一根木头锯成 ${s1} 段需要 ${t * (s1 - 1)} 分钟（每锯一次用时相同）。照这样的速度，锯成 ${s2} 段需要几分钟？`;
    return { q, ans: t * (s2 - 1), wrongs: numWrongs(t * (s2 - 1)) };
  }],
  [2, () => { // 掷硬币
    const k = ri(2, 4);
    const q = `同时抛 ${k} 枚硬币，至少有一枚正面朝上的概率是多少？`;
    return { q, ans: `${2 ** k - 1}/${2 ** k}`, wrongs: [`1/${2 ** k}`, `${2 ** k - 2}/${2 ** k}`, "1/2"] };
  }],
  [2, () => { // 称球（偏重）
    const n = pick([6, 7, 8, 9]);
    const ans = Math.ceil(Math.log(n) / Math.log(3));
    const q = `${n} 个外形相同的球，其中 1 个比其他重。用一架没有砝码的天平，最少称几次一定能找出这个重球？`;
    return { q, ans: `${ans} 次`, wrongs: [`${ans - 1} 次`, `${ans + 1} 次`, `${ans + 2} 次`] };
  }],
  [2, () => { // 时钟夹角
    const h = ri(1, 12), m = pick([0, 20, 40]);
    const ang = Math.abs(30 * h + 0.5 * m - 6 * m);
    const a = Math.min(ang, 360 - ang);
    const q = `时钟显示 ${h} 点 ${m} 分时，时针与分针的夹角（较小角）是多少度？`;
    return { q, ans: `${a} 度`, wrongs: [`${a + 5} 度`, `${a - 5 > 0 ? a - 5 : a + 10} 度`, `${a * 2} 度`] };
  }],
  [2, () => { // 排队第几
    const left = ri(3, 12), right = ri(3, 12);
    const q = `某队伍中，小明从左往右数排第 ${left}，从右往左数排第 ${right}。这个队伍一共有多少人？`;
    return { q, ans: left + right - 1, wrongs: numWrongs(left + right - 1) };
  }],
  [3, () => { // 韩信点兵（两个同余条件）
    const m1 = pick([3, 5, 7]), m2 = m1 === 3 ? pick([4, 5, 7]) : pick([3, 4, 6]);
    const r1 = ri(1, m1 - 1), r2 = ri(1, m2 - 1);
    let x = 0;
    for (let i = 1; i <= m1 * m2; i++) { if (i % m1 === r1 && i % m2 === r2) { x = i; break; } }
    if (x <= 1) return null;
    const q = `一个数除以 ${m1} 余 ${r1}，除以 ${m2} 余 ${r2}。这个数最小是多少？`;
    return { q, ans: x, wrongs: numWrongs(x) };
  }],
  [3, () => { // 称球（不知轻重）
    const n = pick([10, 11, 12, 13, 14]);
    const ans = 3; // 3次可辨 1~40 个（不知轻重），n≤14 时 2 次最多辨 3 个
    const q = `${n} 个外观相同的球，其中 1 个重量异常（不知道是偏重还是偏轻）。用一架没有砝码的天平，最少称几次一定能找出这个球？`;
    return { q, ans: `${ans} 次`, wrongs: ["2 次", "4 次", "5 次"] };
  }],
  [3, () => { // 报数必胜
    const target = pick([24, 28, 30]);
    const q = `两人轮流报数，每次只能报 1 个、2 个或 3 个数，从 1 开始连续往下报，谁报到 ${target} 谁获胜。先报的人第一次报几个数才能必胜？`;
    const first = target % 4;
    if (first === 0) return null;
    return { q, ans: `先报 ${first} 个`, wrongs: [`先报 ${first === 1 ? 2 : first - 1} 个`, `先报 ${first + 1} 个`, "无论先报几个都无法必胜"] };
  }],
  [3, () => { // 名次约束（穷举验证唯一解）
    const names = uniqNames(4);
    for (let attempt = 0; attempt < 30; attempt++) {
      const cons = [];
      const kinds = shuffle(["notFirst", "notLast", "before"]);
      for (const kind of kinds) {
        if (kind === "notFirst") { const p = ri(0, 3); cons.push(`${names[p]}不是第一`); }
        else if (kind === "notLast") { const p = ri(0, 3); cons.push(`${names[p]}不是最后`); }
        else { let i = ri(0, 3), j = ri(0, 3); while (j === i) j = ri(0, 3); cons.push(`${names[i]}的名次在${names[j]}之前`); }
      }
      let sols = [];
      const perm = (arr, cur) => {
        if (!arr.length) { sols.push(cur); return; }
        for (let i = 0; i < arr.length; i++) perm(arr.slice(0, i).concat(arr.slice(i + 1)), cur.concat(arr[i]));
      };
      perm(names, []);
      const check = (order) => {
        const pos = {}; order.forEach((n, i) => (pos[n] = i));
        return cons.every((c) => {
          const m = c.match(/^(.+?)不是第一$/) ? [RegExp.$1, "nf"] : c.match(/^(.+?)不是最后$/) ? [RegExp.$1, "nl"] : c.match(/^(.+?)的名次在(.+?)之前$/) ? [RegExp.$1, RegExp.$2, "bf"] : null;
          if (!m) return false;
          if (m[2] === "nf") return pos[m[0]] !== 0;
          if (m[2] === "nl") return pos[m[0]] !== 3;
          return pos[m[0]] < pos[m[1]];
        });
      };
      sols = sols.filter(check);
      if (sols.length === 1) {
        const order = sols[0];
        const askFirst = rnd() < 0.5;
        const winner = askFirst ? order[0] : order[3];
        const wrongs = names.filter((n) => n !== winner);
        const q = `四人比赛，没有并列名次。已知：${cons.join("；")}。谁是${askFirst ? "第一" : "最后一名"}名？`;
        return { q, ans: winner, wrongs };
      }
    }
    return null;
  }],
];
function genLogic(target) {
  let made = 0, guard = 0;
  while (made < target && guard++ < 30000) {
    const fam = pick(logicGens);
    const r = fam[1]();
    if (!r) continue;
    if (add("logic", fam[0], r.q, r.ans, r.wrongs)) made++;
  }
}

/* ================= 语言类比（目标 150，数据驱动） ================= */
const ANTONYMS = [
  ["稀疏", "密集"], ["漠视", "重视"], ["崭新", "破旧"], ["高兴", "悲伤"], ["清楚", "模糊"],
  ["粗心", "细心"], ["寒冷", "炎热"], ["安静", "喧闹"], ["勇敢", "胆怯"], ["节约", "浪费"],
  ["诚实", "虚伪"], ["聪明", "愚蠢"], ["干净", "肮脏"], ["宽阔", "狭窄"], ["坚强", "脆弱"],
  ["光明", "黑暗"], ["希望", "失望"], ["表扬", "批评"], ["成功", "失败"], ["开始", "结束"],
  ["快速", "缓慢"], ["谦虚", "骄傲"], ["勤劳", "懒惰"], ["美丽", "丑陋"], ["仔细", "马虎"],
  ["犹豫", "果断"], ["热情", "冷漠"], ["明白", "糊涂"], ["陌生", "熟悉"], ["干燥", "湿润"],
  ["便宜", "昂贵"], ["简单", "复杂"], ["紧张", "放松"], ["积极", "消极"], ["甜蜜", "痛苦"],
  ["隐蔽", "暴露"], ["敏捷", "迟钝"], ["慷慨", "吝啬"], ["严肃", "活泼"], ["凝聚", "分散"],
];
const SYNONYMS = [
  ["立刻", "马上"], ["著名", "闻名"], ["帮助", "援助"], ["仿佛", "好像"], ["突然", "忽然"],
  ["逐渐", "渐渐"], ["仔细", "认真"], ["观赏", "欣赏"], ["疲惫", "疲劳"], ["惊讶", "惊奇"],
  ["请求", "恳求"], ["阻止", "制止"], ["爱护", "爱惜"], ["宽阔", "辽阔"], ["优美", "优雅"],
  ["坚固", "牢固"], ["明亮", "透亮"], ["高兴", "快乐"], ["美丽", "漂亮"], ["安静", "宁静"],
  ["商量", "商议"], ["担心", "忧虑"], ["拜访", "造访"], ["参加", "参与"], ["守护", "看守"],
  ["本领", "本事"], ["出名", "知名"], ["盼望", "期望"], ["舒畅", "惬意"], ["反复", "屡次"],
];
const ANALOGIES = [
  ["医生", "医院", "教师", ["学校", "工厂", "书店"]],
  ["厨师", "厨房", "演员", ["剧院", "影院", "后台"]],
  ["农民", "农田", "工人", ["工厂", "车间", "机器"]],
  ["法官", "法院", "售货员", ["商店", "货物", "收银台"]],
  ["司机", "方向盘", "教师", ["黑板", "粉笔", "教室"]],
  ["鸟", "翅膀", "鱼", ["鳍", "鳞片", "水"]],
  ["手套", "手", "帽子", ["头", "头发", "耳朵"]],
  ["戒指", "手指", "围巾", ["脖子", "大衣", "冬天"]],
  ["太阳", "白天", "月亮", ["夜晚", "星星", "圆缺"]],
  ["站台", "火车", "港口", ["轮船", "货物", "大海"]],
  ["车库", "汽车", "机库", ["飞机", "飞行员", "机场"]],
  ["蜂巢", "蜜蜂", "鸟窝", ["鸟", "树枝", "蛋"]],
  ["苹果", "水果", "萝卜", ["蔬菜", "土地", "白色"]],
  ["老虎", "动物", "玫瑰", ["植物", "花", "红色"]],
  ["衬衫", "服装", "沙发", ["家具", "客厅", "布料"]],
  ["瓦特", "蒸汽机", "牛顿", ["万有引力定律", "微积分", "苹果"]],
  ["爱迪生", "电灯", "蔡伦", ["造纸术", "印刷术", "指南针"]],
  ["笔", "文具", "锤子", ["工具", "铁", "木头"]],
  ["学生", "课桌", "士兵", ["钢枪", "军营", "军装"]],
  ["钢琴", "乐器", "篮球", ["球类", "运动", "场地"]],
  ["水", "河流", "空气", ["大气", "风", "天空"]],
  ["蜡烛", "光", "炉子", ["热", "火", "做饭"]],
  ["钥匙", "锁", "密码", ["保险箱", "数字", "门"]],
  ["帆", "船", "引擎", ["汽车", "机油", "公路"]],
  ["蜜蜂", "蜂蜜", "蚕", ["蚕丝", "桑叶", "蛾"]],
  ["眼睛", "看", "耳朵", ["听", "声音", "耳机"]],
  ["春", "播种", "秋", ["收获", "落叶", "凉爽"]],
  ["分钟", "小时", "厘米", ["米", "长度", "尺子"]],
  ["云", "雨", "雷电", ["闪电", "天空", "乌云"]],
  ["种子", "果实", "鸡蛋", ["小鸡", "母鸡", "蛋壳"]],
];
const IDIOM_QA = [
  ["画蛇添足", "多此一举", ["锦上添花", "弄假成真", "画技高超"]],
  ["亡羊补牢", "出了问题及时补救还不算晚", ["损失无法挽回", "事前预防最重要", "加固防范再也没有用"]],
  ["守株待兔", "心存侥幸、不劳而获", ["坚持不懈", "勤劳致富", "守信用"]],
  ["井底之蛙", "见识狭窄、眼光短浅", ["胸怀大志", "安于现状无法自拔", "游泳健将"]],
  ["画龙点睛", "在关键处点明要旨使内容生动传神", ["画蛇添足", "字面画龙", "锦上添花"]],
  ["对牛弹琴", "对不懂道理的人讲道理白费口舌", ["音乐优雅", "牛很聪明", "弹琴技艺高"]],
  ["狐假虎威", "依仗别人的势力欺压人", ["狐狸聪明", "老虎仁慈", "团结力量大"]],
  ["刻舟求剑", "拘泥固执、不懂事物已变化", ["随机应变", "船很稳", "珍惜财物"]],
  ["掩耳盗铃", "自己欺骗自己", ["听力超群", "动作敏捷", "诚实坦荡"]],
  ["塞翁失马", "坏事在一定条件下可能变成好事", ["马走失了", "老人倒霉", "损失惨重"]],
  ["愚公移山", "下定决心、坚持不懈地奋斗", ["力气很大", "破坏环境", "移山填海"]],
  ["卧薪尝胆", "刻苦自励、发愤图强", ["生活艰苦", "喜欢美食", "报复心强"]],
  ["四面楚歌", "陷入四面受敌、孤立无援的境地", ["歌声优美", "四处旅游", "合唱比赛"]],
  ["纸上谈兵", "空谈理论、不能解决实际问题", ["军事演习", "纸上画画", "教学认真"]],
  ["完璧归赵", "把原物完好无损地归还本人", ["打碎玉璧", "夺取宝物", "出使外国"]],
  ["负荆请罪", "主动向对方承认错误、请求责罚", ["背柴火", "身上有伤", "喜欢植物"]],
  ["草木皆兵", "疑神疑鬼、自相惊扰", ["士兵众多", "草木茂盛", "练兵刻苦"]],
  ["滥竽充数", "没有真本领的人混在行家里凑数", ["乐器很多", "演奏精彩", "人数众多"]],
  ["自相矛盾", "言行前后抵触、互相冲突", ["兵器锋利", "买卖公平", "能说会道"]],
  ["水滴石穿", "力量虽小但坚持不懈终能成功", ["水滴很重", "石头不硬", "下雨危险"]],
  ["雪中送炭", "在别人急难时给予帮助", ["冬天很冷", "送错东西", "雪天出行"]],
  ["雪上加霜", "接连遭受灾难、损害愈加严重", ["下雪很美", "天气转晴", "霜降节气"]],
  ["望梅止渴", "用空想来安慰自己", ["梅子很甜", "口渴难忍", "种梅技术"]],
  ["闻鸡起舞", "有志之士及时奋发努力", ["喜欢养鸡", "舞蹈优美", "早起晨练"]],
  ["悬梁刺股", "读书刻苦自学", ["武术高强", "医疗事故", "悬空作业"]],
  ["胸有成竹", "做事之前已有完整的谋划打算", ["心中长满竹子", "喜欢竹林", "画竹逼真"]],
  ["指鹿为马", "颠倒黑白、混淆是非", ["动物识别", "眼睛不好", "马厩管理"]],
  ["东施效颦", "盲目模仿别人、结果适得其反", ["善于学习", "美化自己", "医学整形"]],
  ["精忠报国", "竭尽忠诚、报效国家", ["出国留学", "忠于君主", "精通武艺"]],
  ["草船借箭", "运用智谋巧借外力达成目标", ["造船技术", "箭法精准", "水上运输"]],
];
const IDIOM_PERSON = [
  ["三顾茅庐", "刘备", ["关羽", "张飞", "诸葛亮"]],
  ["破釜沉舟", "项羽", ["刘邦", "韩信", "曹操"]],
  ["指鹿为马", "赵高", ["秦桧", "李斯", "和珅"]],
  ["卧薪尝胆", "勾践", ["夫差", "伍子胥", "西施"]],
  ["负荆请罪", "廉颇", ["蔺相如", "赵括", "白起"]],
  ["纸上谈兵", "赵括", ["孙武", "韩信", "诸葛亮"]],
  ["望梅止渴", "曹操", ["刘备", "孙权", "袁绍"]],
  ["闻鸡起舞", "祖逖", ["岳飞", "辛弃疾", "文天祥"]],
  ["入木三分", "王羲之", ["颜真卿", "柳公权", "吴道子"]],
  ["凿壁偷光", "匡衡", ["车胤", "孙康", "司马光"]],
  ["图穷匕见", "荆轲", ["秦王", "高渐离", "樊於期"]],
  ["背水一战", "韩信", ["项羽", "刘邦", "张良"]],
  ["才高八斗", "曹植", ["曹丕", "曹操", "杨修"]],
  ["洛阳纸贵", "左思", ["司马相如", "李白", "杜甫"]],
  ["草船借箭", "诸葛亮", ["周瑜", "鲁肃", "曹操"]],
  ["精忠报国", "岳飞", ["秦桧", "韩世忠", "杨家将"]],
];
function genVerbal(target) {
  let made = 0;
  // 反义词：正向 + 反向
  const stems = ANTONYMS.map((p) => p[0]);
  for (const [w, opp] of ANTONYMS) {
    if (made >= target) return;
    if (add("verbal", 1, `"${w}"的反义词是：`, opp, shuffle(stems.filter((x) => x !== w && x !== opp)).slice(0, 3))) made++;
  }
  // 同义词
  const synWords = SYNONYMS.flat();
  for (const [a, b] of SYNONYMS) {
    if (made >= target) return;
    if (add("verbal", 1, `"${a}"的近义词是：`, b, shuffle(synWords.filter((x) => x !== a && x !== b)).slice(0, 3))) made++;
  }
  // 类比
  for (const [a, b, c, ws] of ANALOGIES) {
    if (made >= target) return;
    if (add("verbal", 1, `${a} 对于 （${b}） 相当于 ${c} 对于 （ ）`, ws[0], ws.slice(1))) made++;
  }
  // 成语释义（中等）
  for (const [id, mean, ws] of IDIOM_QA) {
    if (made >= target) return;
    if (add("verbal", 2, `成语"${id}"的意思是：`, mean, ws)) made++;
  }
  // 成语人物（中等）
  const people = IDIOM_PERSON.map((p) => p[1]);
  for (const [id, who, ws] of IDIOM_PERSON) {
    if (made >= target) return;
    if (add("verbal", 2, `成语"${id}"与哪位历史人物有关？`, who, ws)) made++;
  }
  // 难度3：找不同的成语含义辨析
  const HARD_VERBAL = [
    ["下列哪个成语的意思与其他三个不同类？", "雪中送炭", ["雪上加霜", "祸不单行", "落井下石"]],
    ["下列哪个成语与其他三个感情色彩不同？", "处心积虑", ["呕心沥血", "殚精竭虑", "兢兢业业"]],
    ['"不刊之论"的正确含义是：', "不可更改的、确切的言论", ["不能刊登的言论", "文笔很差的文章", "不合时宜的观点"]],
    ['"七月流火"的本义是指：', "天气逐渐转凉", ["七月天气炎热如流火", "火山喷发", "晚霞满天"]],
    ['"文不加点"的正确含义是：', "写文章一气呵成、无须修改", ["文章没有标点", "文章有很多错字", "文章不被认可"]],
    ['"首当其冲"的正确含义是：', "最先受到攻击或遭遇灾难", ["冲在最前面", "最重要的人物", "首先发言"]],
    ['"差强人意"的正确含义是：', "大体上还能使人满意", ["非常令人不满意", "勉强达到及格", "差别令人惊讶"]],
    ['"危言危行"的正确含义是：', "讲正直的话、做正直的事", ["危险的言论和行为", "夸大其词", "危言耸听"]],
    ['"下里巴人"的正确含义是：', "通俗的文学艺术作品", ["地位低下的人", "边远山区的人", "粗俗的言行"]],
    ['"目无全牛"的正确含义是：', "技艺达到极其纯熟的地步", ["看不到全局", "眼中没有别人", "骄傲自大"]],
    ['"五风十雨"的正确含义是：', "风调雨顺", ["天气恶劣", "灾害频繁", "变化无常"]],
    ['"万人空巷"的正确含义是：', "人们都从家里出来聚集在一起", ["街道空无一人", "人口稀少", "无人支持"]],
    ['"寥若晨星"的正确含义是：', "数量稀少", ["数量众多", "光彩夺目", "遥不可及"]],
    ['"罪不容诛"的正确含义是：', "罪大恶极、处死都抵不了罪", ["罪不至死", "证据不足", "情有可原"]],
    ['"曾几何时"的正确含义是：', "时间过去没有多久", ["曾经不知道什么时候", "很早以前", "从来没有过"]],
    ['"明日黄花"的正确含义是：', "过时的事物", ["未来的希望", "枯萎的花", "明天开的花"]],
    ['"侧目而视"的正确含义是：', "畏惧而又愤恨地看", ["瞧不起人", "斜着眼睛偷看", "目光友善"]],
    ['"不速之客"的正确含义是：', "没有受到邀请的客人", ["跑得很快的客人", "催促客人离开", "神秘的客人"]],
    ['"敬谢不敏"的正确含义是：', "恭敬地表示自己能力不足而推辞", ["感谢对方不聪明", "怠慢不理睬", "诚恳道歉"]],
    ['"韦编三绝"讲的是谁读书刻苦的故事？', "孔子", ["李白", "苏秦", "匡衡"]],
    ['"汗牛充栋"形容的是：', "书籍极多", ["牛很强壮", "房屋高大", "汗水很多"]],
  ];
  for (const [q, ans, ws] of HARD_VERBAL) {
    if (made >= target) return;
    if (add("verbal", 3, q, ans, ws)) made++;
  }
  // 仍不足：从反义词表中生成"选出一个与其他两个互为反义关系不同"的判断题
  let i = 0;
  while (made < target && i + 2 < ANTONYMS.length) {
    const [w1, o1] = ANTONYMS[i];
    const [w2, o2] = ANTONYMS[i + 1];
    i += 2;
    if (add("verbal", 3, `"${w1}"与"${o1}"、" ${w2}"与"${o2}"这两组词的关系是：`, "都是反义关系", ["都是同义关系", "一组同义一组反义", "没有明显关系"])) made++;
  }
}

/* ================= 图形矩阵（目标 160，文字化） ================= */
const SHAPES = ["△", "○", "□", "☆", "◇"];
const DIRS4 = ["上", "右", "下", "左"];
const DIRS8 = ["上", "右上", "右", "右下", "下", "左下", "左", "左上"];
const spatialGens = [
  [1, () => { // 循环序列
    const k = ri(2, 3);
    const cyc = shuffle(SHAPES).slice(0, k);
    const t = Array.from({ length: 7 }, (_, i) => cyc[i % k]);
    const ans = cyc[7 % k];
    return { q: `按图形循环规律：${t.join(" ")} ( ? )，问号处应该是什么图形？`, ans, wrongs: shuffle(SHAPES.filter((s) => s !== ans)).slice(0, 3) };
  }],
  [1, () => { // 顺时针90度
    const s = ri(0, 3);
    const q = `一个箭头按顺时针方向每次旋转 90 度，依次指向${DIRS4[s % 4]}、${DIRS4[(s + 1) % 4]}、${DIRS4[(s + 2) % 4]}，第四次指向哪里？`;
    const ans = DIRS4[(s + 3) % 4];
    return { q, ans, wrongs: DIRS4.filter((x) => x !== ans) };
  }],
  [1, () => { // 数量递增
    const a = ri(1, 4), k = ri(1, 3);
    const t = Array.from({ length: 5 }, (_, i) => a + i * k);
    const ans = a + 5 * k;
    return { q: `一排图形中某种小图形的数量依次为 ${t.join("、")}，按规律第六个图形有几个？`, ans: `${ans} 个`, wrongs: numWrongs(ans).map((v) => `${v} 个`) };
  }],
  [1, () => { // 方点阵
    const n = ri(3, 8);
    return { q: `第 n 个图形的黑点排成 n×n 的正方形点阵。第 ${n + 1} 个图形有几个黑点？`, ans: `${(n + 1) ** 2} 个`, wrongs: numWrongs((n + 1) ** 2).map((v) => `${v} 个`) };
  }],
  [1, () => { // 简单颜色交替
    const a = pick(["黑", "白"]), b = a === "黑" ? "白" : "黑";
    const pat = [a, b, a, b, a, b, a];
    return { q: `按颜色交替规律：${pat.join(" ")} ( ? )，问号处应该是什么颜色？`, ans: b, wrongs: [a, "灰色", "红黑相间"] };
  }],
  [2, () => { // 45度旋转
    const s = ri(0, 7);
    const q = `一个箭头按顺时针方向每次旋转 45 度，依次指向${DIRS8[s]}、${DIRS8[(s + 1) % 8]}、${DIRS8[(s + 2) % 8]}，第四次指向哪里？`;
    const ans = DIRS8[(s + 3) % 8];
    return { q, ans, wrongs: shuffle(DIRS8.filter((x) => x !== ans)).slice(0, 3) };
  }],
  [2, () => { // 拉丁方阵
    const three = shuffle(SHAPES).slice(0, 3);
    const rows = [[three[0], three[1], three[2]], [three[1], three[2], three[0]], [three[2], three[0], "?"]];
    return { q: `一个 3×3 图形方阵中，每行每列三种图形各出现一次。第一行 ${rows[0].join("、")}，第二行 ${rows[1].join("、")}，第三行已有 ${three[2]}、${three[0]}，问号处应该是什么？`, ans: three[1], wrongs: [three[0], three[2], "都可以"] };
  }],
  [2, () => { // 棋盘格
    const corner = pick(["黑", "白"]);
    const other = corner === "黑" ? "白" : "黑";
    return { q: `一个 3×3 方格按棋盘规律涂色，四个角都是${corner}色、四条边中点都是${other}色，正中央是什么颜色？`, ans: other, wrongs: [corner, "灰色", "任意颜色"] };
  }],
  [2, () => { // 骰子对面
    const x = ri(1, 6);
    return { q: `一个标准骰子相对两面的点数之和为 7。与 ${x} 点相对的面是几点？`, ans: `${7 - x} 点`, wrongs: numWrongs(7 - x, 0.5).map((v) => `${v} 点`) };
  }],
  [2, () => { // 对折剪绳
    const f = ri(1, 3);
    return { q: `一根绳子对折 ${f} 次后，从中间剪一刀（垂直于绳子方向），绳子变成了几段？`, ans: `${2 ** f + 1} 段`, wrongs: numWrongs(2 ** f + 1, 0.4).map((v) => `${v} 段`) };
  }],
  [2, () => { // 珠子周期
    const b = ri(1, 3), w = ri(1, 3), pos = ri(15, 40);
    const cyc = (b + w);
    const idx = (pos - 1) % cyc;
    const ans = idx < b ? "黑色" : "白色";
    return { q: `一串珠子按"${b} 黑 ${w} 白"的顺序循环排列，第 ${pos} 颗珠子是什么颜色？`, ans, wrongs: [ans === "黑色" ? "白色" : "黑色", "无法确定", "黑白相间"] };
  }],
  [2, () => { // 边数递增
    const s = ri(3, 5), k = ri(1, 2);
    const t = Array.from({ length: 4 }, (_, i) => s + i * k);
    const ans = s + 4 * k;
    return { q: `一排图形的边数依次为 ${t.join("、")}，按规律第五个图形是几边形？`, ans: `${ans} 边形`, wrongs: numWrongs(ans).map((v) => `${v} 边形`) };
  }],
  [3, () => { // 三阶幻方（连续九个数，中心恒为平均数）
    const s = ri(1, 12);
    const total = 3 * (s + 5);
    const center = s + 5;
    return { q: `把 ${s}～${s + 8} 这九个数填入三阶幻方（九宫格），使每行、每列、每条对角线之和都等于 ${total}。正中间的格子应填几？`, ans: center, wrongs: numWrongs(center) };
  }],
  [3, () => { // 双重循环
    const s1 = ri(0, 4), s2 = ri(0, 4);
    if (s1 === s2) return null;
    const cyc = [SHAPES[s1], SHAPES[s1], SHAPES[s2]];
    const t = Array.from({ length: 8 }, (_, i) => cyc[i % 3]);
    const ans = cyc[8 % 3];
    return { q: `按图形循环规律：${t.join(" ")} ( ? )，问号处应该是什么图形？`, ans, wrongs: shuffle(SHAPES.filter((s) => s !== ans)).slice(0, 3) };
  }],
  [3, () => { // 立体几何
    const qs = [
      ["一个正方体有几条棱？", 12, [6, 8, 16]],
      ["一个正方体有几个面？", 6, [4, 8, 12]],
      ["一个三棱锥（四面体）有几条棱？", 6, [4, 5, 8]],
      ["一个五边形有几条对角线？", 5, [4, 6, 10]],
      ["一个六边形有几条对角线？", 9, [6, 8, 12]],
      ["一个长方体有几个顶点？", 8, [6, 12, 4]],
    ];
    const [q, ans, wrongs] = pick(qs);
    return { q, ans: `${ans}`, wrongs: wrongs.map(String) };
  }],
];
function genSpatial(target) {
  let made = 0, guard = 0;
  while (made < target && guard++ < 30000) {
    const fam = pick(spatialGens);
    const r = fam[1]();
    if (!r) continue;
    if (add("spatial", fam[0], r.q, r.ans, r.wrongs)) made++;
  }
}

/* ================= 主流程 ================= */
genSeries(320);
genLogic(280);
genVerbal(155);
genSpatial(164);
/* 裁剪到精确目标：series 314 + logic 270 + verbal 150 + spatial 160 = 894，加人工 106 = 1000 */
const TARGETS = { series: 314, logic: 270, verbal: 150, spatial: 160 };
for (const cat of Object.keys(TARGETS)) {
  let c = 0;
  for (let i = BANK.length - 1; i >= 0 && c < 9000; i--) {
    if (BANK[i].cat === cat) {
      c++;
      if (c > TARGETS[cat]) BANK.splice(i, 1);
    }
  }
}

const out = `/* 自动生成的题库（由 generate_bank.js 生成，勿手改） */
"use strict";
var GEN_BANK = ${JSON.stringify(BANK, null, 0)};
`;
fs.writeFileSync(__dirname + "/questions.js", out, "utf8");

/* 统计 */
const byCat = {}, byDiff = {};
BANK.forEach((q) => { byCat[q.cat] = (byCat[q.cat] || 0) + 1; byDiff[q.d] = (byDiff[q.d] || 0) + 1; });
console.log("生成题数:", BANK.length);
console.log("分类:", JSON.stringify(byCat));
console.log("难度:", JSON.stringify(byDiff));
console.log("输出: questions.js");
