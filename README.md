# ZenStretch

[https://simonxander.github.io/stretch-tts-guide/](https://simonxander.github.io/stretch-tts-guide/)

ZenStretch 是一個基於純 JavaScript (Vanilla JS) 打造的輕量級、具備語音引導 (TTS) 功能的伸展運動 Web App。旨在提供流暢的自訂伸展菜單建立、語音指引、以及運動紀錄追蹤。

## ✨ 核心功能
- **自訂伸展流程**：使用者可以自由建立、排序並編輯專屬的伸展菜單。
- **AI 匯入支援**：支援將 ChatGPT/Claude 等 AI 產生的 JSON 格式直接匯入為伸展流程。
- **語音引導 (TTS)**：運用 Web Speech API 在運動過程中提供即時的語音解說、秒數倒數與休息提醒。
- **跨裝置分享與同步**：
  - **快速分享**：可產生壓縮過的 URL 或 QR Code，讓其他裝置一鍵匯入。
  - **雲端同步**：支援 Google 登入並透過 Firebase Firestore 同步自訂菜單與運動紀錄。
- **雙主題切換**：內建深色/淺色模式，並會根據流程套用專屬的卡片主題色彩。
- **運動歷史紀錄**：具備日曆檢視與紀錄清單，讓使用者追蹤每一天的運動狀況。

## 🛠️ 技術選型
- **前端核心**：Vanilla JavaScript (無使用 Vue / React 等重型框架)
- **建置工具**：[Vite](https://vitejs.dev/)
- **HTML 模組化**：`vite-plugin-html-inject` (將大檔切分為 Partials)
- **資料儲存**：LocalStorage + [Firebase Firestore](https://firebase.google.com/)
- **分享壓縮**：[lz-string](https://github.com/pieroxy/lz-string) (用於縮減 URL 參數長度)

## 🚀 本地開發指南

### 環境需求
- Node.js (建議 v18+)
- npm 或 yarn

### 安裝與啟動
1. 複製專案後，安裝依賴套件：
   ```bash
   npm install
   ```
2. 啟動本地開發伺服器：
   ```bash
   npm run dev
   ```
   預設會在 `http://localhost:3000` 開啟。
3. 建置生產環境版本：
   ```bash
   npm run build
   ```

## 📂 專案目錄結構
```
├── index.html            # 主入口 (僅透過 <load> 標籤組合 partials)
├── vite.config.js        # Vite 設定檔 (配置 html-inject 等)
├── public/               # 靜態資源 (Icon, Manifest)
└── src/
    ├── main.js           # 程式進入點
    ├── partials/         # HTML 碎片檔 (首頁、運動畫面、各類 Modal)
    │   ├── screens/
    │   └── modals/
    ├── styles/           # 樣式表 (CSS 變數、共用元件)
    └── modules/          # 核心業務邏輯模組
        ├── engine.js     # 運動狀態機 (核心倒數與狀態控管)
        ├── stretches.js  # 動作資料管理 (預設菜單與 CRUD)
        ├── history.js    # 歷史紀錄管理
        ├── tts.js        # 語音合成引擎
        ├── firebase.js   # 雲端同步與認證
        └── ui/           # 拆分後的 UI 元件與畫面邏輯
```

## 🤝 貢獻指南
如果您是未來的開發者或是 AI 助理，請務必先閱讀 [`GEMINI.md`](GEMINI.md) 以了解專案的架構慣例與狀態管理機制。
