# 排球賽程排程系統

這是一個用於生成排球比賽分組和賽程的系統。系統使用React作為前端框架，Express作為後端服務器，並結合Python腳本來處理複雜的排程邏輯。

## 功能特點

- 自動生成比賽分組
- 根據隊伍可用時間生成賽程表
- 支持Excel文件上傳和導出
- 響應式網頁設計
- 直觀的用戶界面

## 技術棧

- 前端：React.js, TailwindCSS
- 後端：Node.js, Express
- 數據處理：Python
- 文件處理：xlsx, multer

## 安裝說明

1. 確保您的系統已安裝：
   - Node.js (v14.0.0 或更高版本)
   - Python (v3.7 或更高版本)
   - npm 或 yarn

2. 克隆專案並安裝依賴：
   ```bash
   git clone [repository-url]
   cd OR_volleyball_system
   npm install
   ```

3. 安裝Python依賴：
   ```bash
   pip install -r requirements.txt
   ```

## 運行方式

chap gpt推薦:

    1. 開發模式：
    ```bash
    npm run dev
    ```
    這將同時啟動前端開發服務器和後端服務器。

    2. 生產模式：
    ```bash
    npm run build
    npm run server
    ```
我個人使用習慣:

    cd OR_volleyball_system
    npm install
    npm run server
    npm start(問你要不要換port就打yes，避免跟server共用同一個port)

## 使用說明

1. 準備輸入文件：
   - referees.xlsx（Excel格式）
   - 臺大盃女排資料表.xlsx（Excel格式）

2. 訪問系統：
   - 開發模式：http://localhost:3000
   - 生產模式：http://localhost:3000

3. 上傳文件並生成：
   第一階段:
   - 點擊上傳按鈕選擇referees.xlsx，表一為評審系所，表二為隊伍分級表
   - 點擊日曆決定賽程起始日期
   - 系統會自動處理並生成group_generate.xlsx，表一為各系所分組，表二為評審衝突表
   - 可以下載生成的結果文件

   第二階段:
   - 點擊上傳按鈕選擇group_generate.xlsx、臺大盃女排資料表.xlsx(表一為評審檔期，表二為隊伍檔期)
   - 系統會自動處理並生成volleyball_schedule.xlsx，表一為每日賽程相關配對結果、表二為各系所分組、表三為各評審的評審次數
   - 可以下載生成的結果文件
   - 跳轉到賽程表介面，可以查看每日賽程相關配對結果，並支援查詢功能，例如根據系所、評審或是日期查看此條件下的賽程

## 文件結構

```
OR_volleyball_system/
├── src/                # 前端源代碼
├── backend/           # 後端代碼
├── public/            # 靜態文件
├── uploads/           # 上傳文件臨時存儲
├── server.js          # Express服務器
└── package.json       # 項目配置
```

## 注意事項

- 確保上傳的Excel文件格式正確
- 系統需要足夠的內存來處理大量數據
- 建議使用Chrome或Firefox瀏覽器

## 貢獻指南

歡迎提交Issue和Pull Request來幫助改進系統。

## 授權

[授權信息]