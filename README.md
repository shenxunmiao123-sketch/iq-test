# iqCeshi · 模型智商检测

纯前端的「大模型智商测试」单页工具。用户填入 OpenAI 兼容接口的地址、密钥和模型名，浏览器直接调用接口做一套智力测验（数列推理 / 逻辑推理 / 语言类比 / 图形矩阵，共 48 题随机抽取、选项随机排序），自动判分并换算成参考智商（IQ）分数，附带本机排行榜。

## 功能

- **整 1000 道题**：106 道人工精选 + 894 道程序生成（`generate_bank.js` 按模板生成，答案由公式/穷举直接得出），4 个类别：数列推理（344）、逻辑推理（299）、语言类比（175）、图形矩阵（182）
- **三级难度**：简单（1 分）/ 中等（1.5 分）/ 困难（2 分），按难度**配额抽题**（40% / 40% / 20%）、**加权计分**（难题分值更高）
- **每周自动换题**：以「年份 + 周数」为种子从全库确定性抽取本周题库（每类 50 题、共 200 题），新的一周自动轮换；同周内每次测试再随机抽题、选项随机排序
- **答案解析容错**：兼容只输出字母、思维链较长（"答案是X"/"选项X"/英文回答）等多种模型输出格式
- 支持任意 OpenAI 兼容接口（OpenAI / 各类中转站 / DeepSeek / Ollama 等）
- 自动判分，按加权正确率换算 IQ（加权正确率 50% ≈ 100 分，满分 ≈ 145 分）
- 分类正确率条形图、难度分布统计、复制结果、localStorage 本机排行榜
- 兼容推理模型（自动重试不支持 `temperature` 的接口，120 秒超时）
- 「测试连接」按钮先发探测请求，避免盲目跑全套才发现跨域问题
- 密钥只保存在浏览器 localStorage（可选），不经过任何第三方

## 如何扩充题库

两种方式：

**1. 人工加题**：编辑 `index.html` 里的 `CURATED_BANK` 数组，每题一个对象：

```js
{ cat: "series", d: 2, q: "题干……", opts: ["选项A", "选项B", "选项C", "选项D"], a: 1 },
```

**2. 批量生成**：编辑 `generate_bank.js`（模板/参数/目标数量在 `genSeries(320)` 等调用与 `TARGETS` 中），然后运行：

```bash
node generate_bank.js   # 输出 questions.js，页面自动加载
```

生成器会自动读取 `index.html` 的人工题干做排除，保证生成的题与人工题不重复；改完代码后运行一遍校验流程（总数 / 去重 / 选项完整性 / 抽题配额）即可上线。

**部署时 `index.html` 与 `questions.js` 必须一起上传。**

## Worker 反代安全说明

`worker.js` 内置三层防护（方案：让泄露的地址无害化）：

1. **路径白名单**：仅放行 `/v1/chat/completions` 与 `/v1/models`，无法当通用代理用；
2. **Origin 白名单**：只有 `ALLOWED_ORIGIN_RULES` 中列出的页面域名能调用，其他网站/嵌入页一律 403 且**不转发上游**（不消耗额度）；
3. **内置频控**：单 IP 每分钟 30 次、每天 1000 次（内存版，Worker 重启清零）。

**部署后必做的两处核对**（都在 `worker.js` 顶部）：

- `UPSTREAM`：你的中转站地址（只留 `https://域名`）；
- `ALLOWED_ORIGIN_RULES`：第一行默认匹配任意 `*.github.io`，**建议改成你的确切 Pages 地址**（如 `/^https:\/\/shenxun1234\.github\.io$/i`）；最后一行 `null` 是本地 `file://` 打开用的，正式上线后建议删除。

如需更严格的防刷，可在 Cloudflare 控制台为该 Worker 另配 Rate Limiting 规则，与内置频控叠加生效。Worker 不存储、不记录任何请求数据。

## 本地预览

直接双击打开 `index.html` 即可；或在本目录起一个静态服务：

```bash
npx serve .
# 或
python -m http.server 8080
```

浏览器访问对应地址（如 http://localhost:8080）。

## 部署到 GitHub Pages

1. 在 GitHub 新建一个仓库（如 `model-iq-test`），把 `index.html` 推上去：

   ```bash
   git init
   git add index.html icon.svg
   git commit -m "init: model IQ test"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/model-iq-test.git
   git push -u origin main
   ```

2. 仓库 **Settings → Pages → Source** 选择 `main` 分支 `/ (root)`，保存。
3. 等待 1~2 分钟，访问 `https://<你的用户名>.github.io/model-iq-test/` 确认页面正常。

## 接入 sub2api 外接菜单

在 sub2api 管理后台「外接菜单」设置里添加一个菜单项：

| 字段 | 填写内容 |
|------|----------|
| 菜单名称 | 模型智商检测 |
| 可见角色 | 普通用户 |
| 页面 URL | `https://<你的用户名>.github.io/model-iq-test/` |
| SVG 图标 | 上传本目录的 `icon.svg` |

保存设置后，用户端侧边栏即出现入口。

## 常见问题

**提示 CORS 跨域错误 / Failed to fetch？**
部分 API 站点不允许浏览器网页直接调用接口。项目内置两道防线：

1. 页面上的「**测试连接**」按钮会先发一个探测请求，避免盲目跑完整套题才发现连不上；
2. 部署本项目附带的 **Cloudflare Worker 反代**（`worker.js`），彻底解决：

   1. 注册/登录 [Cloudflare](https://dash.cloudflare.com/) → **Workers & Pages → Create Worker**；
   2. 把 `worker.js` 全部内容粘贴进编辑器，把文件顶部的 `UPSTREAM` 改成你的中转站地址（只保留 `https://域名`，不带 `/v1`）；
   3. 部署后得到 `https://xxx.workers.dev`；
   4. 回到智商检测页面，**API 地址填这个 Workers 地址**即可（页面会自动拼 `/v1/chat/completions`）。

   密钥仍只在用户浏览器与 Worker 之间加密传输，Worker 不存储任何数据。

**分数准吗？**
仅供娱乐和参考。它衡量的是模型在一套文字化智力题上的正确率，不代表专业心理测量智商，也不同于 MMLU / GPQA 等学术基准的排名。

**推理模型（o1 / R1 等）超时？**
单题超时设为 120 秒。若仍超时，可把并发数调低、或换非推理模型再测。
