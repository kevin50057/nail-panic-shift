-- 全球排行榜。每台裝置（pid）每個模式只留一筆最佳分。重跑安全（IF NOT EXISTS）。
CREATE TABLE IF NOT EXISTS scores (
  mode    TEXT    NOT NULL,          -- main | boss
  pid     TEXT    NOT NULL,          -- 遊戲在裝置上產生的隨機代號
  name    TEXT    NOT NULL,
  score   INTEGER NOT NULL,
  note    TEXT,
  updated INTEGER NOT NULL,          -- 拿到這個最佳分的時間（毫秒）
  PRIMARY KEY (mode, pid)
);
CREATE INDEX IF NOT EXISTS scores_rank ON scores (mode, score DESC, updated);

-- 洗版限制用：只存「IP＋日期」的雜湊前 8 bytes，一小時後刪除。
CREATE TABLE IF NOT EXISTS hits (
  ip TEXT    NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS hits_ip ON hits (ip, at);
