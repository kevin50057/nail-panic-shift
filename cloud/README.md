# 部署到 Cloudflare（遊戲網站＋全球排行榜）

這個資料夾讓遊戲跑在 Cloudflare Workers 上：

- `dist/` 的遊戲檔案用 Workers Static Assets 提供（靜態檔請求免費、不限次數）。
- `/api/*` 是全球排行榜，資料存在 D1 資料庫。

推到 `main` 後，`.github/workflows/deploy.yml` 會自動：

1. 建立 D1 資料庫（已存在就沿用）
2. 套用資料表（`schema.sql`，重跑安全）
3. 部署

沒設定下面兩個 secrets 時，這個流程會直接略過、不會失敗。

## 一次性設定（約 5 分鐘）

1. **註冊 Cloudflare**：<https://dash.cloudflare.com/sign-up>，免費方案即可。
2. **打開一次 Workers & Pages**：左側選單 → Workers & Pages。如果要你選 `workers.dev` 子網域就選一個，這會是網址的一部分。
3. **複製帳號 ID**：在 Workers & Pages 頁面右側（或帳號首頁右側）找到 **Account ID**，複製起來。
4. **建立 API Token**：
   - 右上角頭像 → My Profile → API Tokens → **Create Token**
   - 找到 **Edit Cloudflare Workers** 範本 → **Use template**
   - 在 Permissions 多加一列：**Account → D1 → Edit**
   - Account Resources 選你的帳號，Zone Resources 選 All zones（或任一）
   - Continue to summary → **Create Token**，複製 token（只會顯示一次）
5. **貼到 GitHub**：repo → Settings → Secrets and variables → Actions → **New repository secret**，新增兩個：
   - `CLOUDFLARE_API_TOKEN`：上一步的 token
   - `CLOUDFLARE_ACCOUNT_ID`：第 3 步的帳號 ID
6. **部署**：把分支合併進 `main`，或到 repo 的 Actions → Deploy to Cloudflare → **Run workflow**。
   約 1～2 分鐘後，Deploy 步驟的紀錄最後會印出網址：`https://nail-panic.<你的子網域>.workers.dev`

之後每次推到 `main` 都會自動更新網站。排行榜資料不會因為重新部署而消失。

## 費用

免費方案每天 10 萬次 Worker 請求、D1 每天 500 萬列讀取／10 萬列寫入。
超過當天額度只會讓排行榜暫時回錯誤（遊戲照常能玩，本機榜照常），**不會自動收費**；
要付費必須自己升級 Workers Paid。

## 排行榜規則（`src/index.js`）

- 每台裝置（遊戲自動產生的隨機代號）每個模式只留最佳分；名字以最後一次上傳為準。
- 擋掉：不合理的分數（依天數／波數設上限）、髒字與網址名字、同一台裝置 10 秒內重送、同一 IP 每分鐘超過 12 次。
- IP 只存「IP＋日期」的雜湊前 8 bytes，一小時後刪除。
- 分數是玩家那端算的，**無法完全防作弊**；有人亂灌時可在 Cloudflare 後台的 D1 主控台刪掉該筆：
  `DELETE FROM scores WHERE name = '…';`

## 其他網址也想用全球榜

例如繼續用原本的 OpenAI 託管：在 `dist/index.html` 和 `dist/rush/index.html` 的 `<head>` 加上

```html
<meta name="board-api" content="https://nail-panic.<你的子網域>.workers.dev/api">
```

API 已開 CORS。Claude 卡片版不允許連外，所以那邊只會有本機排行。

## 本機開發

```bash
cd cloud
npx wrangler@4.158.0 d1 execute nail-panic-board --local --file=schema.sql
npx wrangler@4.158.0 dev        # http://localhost:8787
```
