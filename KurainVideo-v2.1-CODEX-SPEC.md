# Kurain Video v2.1 — Android / iOS / Windows / macOS × Rust 共用核心、模組化與安全更新完整 Codex 開發規格書

> **交付對象**：Codex CLI / Codex IDE / 專案開發者  
> **規格版本**：`2.1.0-crossplatform-desktop.1`（四平台目標規格，不代表已實作）  
> **日期**：2026-10-14  
> **專案識別**：Kurain Video；Android Application ID `com.kurain.video`  
> **既有基準**：`KurainVideo-現況產品規格書.md`（As-built v1.0）、`KurainVideo-v2.0-Android-iOS-Rust-Codex-SPEC.md`（先前跨平台方案）  
> **最重要產品目標**：**Android/Kotlin、iOS/SwiftUI、Windows/macOS/Tauri 共用 Rust 核心；站點規則與資源獨立更新；Android 自架 APK 在安全前提下差異更新；桌面原生 App 使用簽署更新，Windows 發佈 exe 安裝程式、macOS 發佈 app/dmg。**  

> **四平台快速導讀**：第 0–17 章為既有 Android/iOS/Rust/安全更新全規格；第 18–29 章補充 Windows、macOS、Tauri 2、MPV、EXE/DMG 打包、桌面簽署更新與 Phase 10–14。若同一規範衝突，以更具體的平台章節及安全/法律限制為準。
> **規格辨識**：`[現況]` 表示來自提供之 As-built 文件；`[新規格]` 表示本次設計；`[待查]` 表示必須由 Codex 在實際 repo／發布環境核對。

---

## 文件使用方法與完整交付定義

本文件可作為唯一的 **v2.1 四平台開發主規格**。第 0–17 章保留原 Android/iOS/Rust/更新設計，**第 18–29 章是 Windows/macOS 擴充且同等具約束力**；不需先完整閱讀舊版 v2.0 才能理解；但 Codex 必須閱讀現況規格及原始碼以核對現況。原規格沒有交代 iOS Bundle ID、最低 iOS 版本、正式發佈憑證、更新主機 HTTPS、部署型態及目標 NAS 環境的部分，本文件以明確的預設設計／阻擋條件處理，不把假設當已完成事實。

**交付範圍**：Android 原功能不回歸、Rust 共用核心與 UniFFI、SwiftUI iOS App MVP、**Tauri 2/React Desktop Windows `.exe` 與 macOS `.app/.dmg`**、宣告式站點資料包管理、靜態可部署更新服務契約、Android 自架完整／差異 APK 更新、**桌面簽署原生更新**、可驗證下載與回滾、五發布渠道隔離、測試與 CI、發布運維手冊。

**不做**：遠端下發可執行 Rust `.so` / Kotlin `.dex` / Swift binary / 可執行 Script 插件、DRM 解除、繞過登入／驗證碼／存取限制、替換 iOS 原生 App、無權利來源的下載擷取。

## 0. Codex 最高優先級實作指令

1. **Phase 0 先盤點，永不假設規格就是程式現況**。針對既有 Android 1.4.0 (118) 建立 baseline：UI 五分頁、Media3、WebView 偵測、網站套件、遠端協定、下載、更新與持久資料；如果 Gradle 版本不同，以實際 repo 為準並記錄。
2. **保留現有 Android 專案根目錄及 `app/`**，禁止直接將 App 重新建構為新模板、刪除既有功能、改 package ID、重置簽章或丟失下載索引。新增 `rust/`、`ios/`、**`desktop/`**、`shared/`、`tools/`、`distribution/` 與文件目錄即可。
3. **架構模組化 != 安裝分包 != 差異更新**。三個機制各有不同交付方式與驗收；不能只增加 Gradle modules 就宣稱已能部分更新。
4. **原生程式固定隨 App 更新**：Kotlin、Swift、Rust compiled library、播放器 codec、授權實作、原生下載服務、更新器本身都不可由通用站點資料包替換。Android sideload 的差異檔必須重建完整已簽名 APK，再由系統安裝器更新。
5. **站點下載包僅允許宣告式資料及靜態資源**：可調 URL 模板、受限 CSS selector、分類、顯示 metadata、固定能力允許表。不下載執行 JS、Lua、Wasm、DEX、`.so`、遠端 expression/eval；現有 WebView 偵測 JS 作為安裝包內程式資產，更新它需要 App 發版。
6. **發佈渠道不可混用**：`androidSideload` 用自家 HTTPS catalog + APK/patched APK；`androidPlay` 由 Play 更新／Feature Delivery；`iosAppStore` 由 App Store 更新；**`windowsDirect` 是 signed Tauri/NSIS exe，`macosDirect` 是 signed/notarized `.app/.dmg`**；所有渠道共用經簽署的資料包 catalog，但不可熱更新執行程式碼。詳細要求見第 18–29 章。
7. **iOS App Store 構建必須採發佈時 allowlist，嚴格排除未授權或不符審核要求的來源；遠端資料包不能繞過此限制**。iOS 以 SwiftUI + WKWebView + AVPlayer，Android 保留 Views/XML + WebView + Media3。
8. **安全優先**：現況 APK 更新來源預設為 `http://nas.kurain.uk:8080`，必須規劃 HTTPS 遷移、可信簽章 metadata、檔案 SHA-256、回滾保護。不得對既有 HTTP 主機「原地啟用差異檔」當作安全上線。
9. **先 baseline 然後小範圍切換**。所有可替換 Android 功能新增 runtime feature flag；原 Kotlin 實作先保持可恢復；每次切換一個代表性站點／協定流程，並有 parity 測試。
10. **不能假裝完成**：無 macOS/Xcode、實體 iPhone、發佈憑證、NAS、簽章 key 或測試伺服器時標記 `BLOCKED_ENV`；有 mocked test 不代表 E2E 成功。
11. 每完成一階段交付 **程式碼、測試、執行命令、結果、風險、rollback 方式**；不得用 TODO stub 充當已完成功能。不要擅自 commit 或 push（除非操作環境明確授權），禁止在日誌洩漏 Token/Cookie/SSH password。
12. 不盲目修改舊下載與播放快取；資料遷移必須冪等、原子、可回退，包含中斷／磁碟不足／系統殺死的情境。
13. **開發優先序**：`P0` 保住 Android + Rust vertical slice + 宣告式資料包 + 安全更新基礎，**並在 Core 可用後驗證桌面 Phase 10/11**；`P1` iOS MVP + Android 差異更新 + Desktop 進階功能、Win EXE/mac DMG 發布；`P2` 大型資產與進階協定。總階段為 **Phase 0–14**。
14. 若任何需求互相矛盾，優先 **資料安全 > 發布政策 > Android backward compatibility > 測試可重現 > 效能／下載節省**，在 `docs/cross-platform/DECISIONS.md` 留下 ADR。

**建議 Codex 每回合只執行一個 Phase**；但一個 Phase 內的程式碼、測試與報告需完整交付，不能只吐回計畫。

## 1. 基礎依據與目標

### 1.1 來自現況規格的已知事實（As-built；請再由原始碼確認）

| 項目 | Android 現有狀況 |
|---|---|
| 專案 | Kotlin 原生 Android，Views/XML＋程式化 View |
| ID | `com.kurain.video` |
| SDK | minSdk 24；compile/targetSdk 35 |
| Java | JVM target Java 17 |
| 目前版本 | `1.4.0`／versionCode `118`（以執行時原始碼為準） |
| 播放器 | AndroidX Media3／ExoPlayer（Progressive、HLS、DASH、RTSP） |
| 本地 | MediaStore／SAF、搜尋、排序、最近播放與續播 |
| 網頁 | WebView、手動來源偵測、DOM／來源資源檢查、Header／Cookie 上下文 |
| 套件 | 內容來源管理、分類、列表、搜尋、分頁、詳情／集數 |
| 遠端 | HTTP(S)、SMB、FTP、SFTP、WebDAV 目錄與讀取路徑 |
| 下載 | Media3 DownloadManager／Service；目前並行上限 2；另有特定來源下載與 libtorrent4j |
| 儲存 | SharedPreferences、App 私有檔、DownloadIndex／Cache、SAF URI、Keystore |
| 更新 | Android APK 更新，manifest 大小／SHA-256 驗證與系統安裝 |
| 尚未完成 | FFmpeg 軟體影片解碼 fallback、獨立可替換 PlayerEngine、完整 Compose/MVVM/Clean 重構、PiP 等若干目標 |

以上只是「程式碼／文件記載的現況」，**不代表外部來源、SMB／SFTP、特定裝置 codec 已有完整端到端驗證**。

### 1.2 v2.0 要達到的產品狀態

- 同一套 **Rust Shared Core** 可供 Kotlin Android 與 Swift iOS 透過 UniFFI 呼叫，且 Windows/macOS Tauri Rust Host 直接依賴同一組 crates。
- Android 不失去現有五分頁、播放器、下載、遠端、網頁與套件管理功能。
- iOS 提供同一產品概念的五個導覽入口：**本地、網頁、套件、下載、設定**。各頁功能依平台能力與來源授權顯示，不假裝全部平台完全等價。
- 把站點解析、媒體描述資料、統一錯誤、重試策略、部分 HTTP/遠端協定處理逐步集中於 Rust。
- UI、WebView／WKWebView、播放引擎、系統權限、Secure Storage、背景任務由各平台負責。
- Android/iOS 接收到同樣的核心錯誤碼、媒體來源類型與來源解析結果，能在各自播放器做合理決策。
- iOS 第一個可驗收版本：**本機媒體選取、HTTP Progressive/HLS 播放、播放歷史、基本網站瀏覽與可取得的合法來源解析、HTTP(S)/WebDAV 遠端瀏覽、一般檔案下載**。
- Windows/macOS 桌面 App 使用 **Tauri 2 + React/TypeScript + Rust Core**；Windows 提供 NSIS `setup.exe`，macOS 提供 `.app/.dmg`，播放由可驗收且合法再發佈的 DesktopPlayerEngine 管理，詳細規格見第 18–29 章。

### 1.3 非目標（本次不可暗中加入）

- 不要求重寫 Android UI 為 Compose；現有 Views/XML 可沿用。
- 不要求 Rust 直接取代 ExoPlayer/AVPlayer 或實作 FFmpeg 解碼器。
- 不承諾 iOS 原生直接支援 DASH、RTSP、所有字幕格式或所有 Android 來源。
- 不保證可讀取跨來源 iframe、blob/MSE、DRM、站點登入保護或短效 token；不得擴大現有權限。
- 不要求重寫／搬移 Android 所有下載快取格式。
- 不將 APK 更新模式移植到 App Store iOS App。
- 不把各類磁力、YouTube 專用下載、成人站點預設加入 iOS 發布版本。
- 本次不建立雲端帳號同步、後端 API 服務或跨設備同步資料庫。
- 不將 iOS AVPlayer/Android Media3 當成桌面原生播放器；不保證桌面 MPV 是單一 exe 無 sidecar，也不在第一版引入 Linux。

### 1.4 優先級

`P0 = 必需`、`P1 = 第一版後擴充`、`P2 = 研究／可延後`。每項必須標示 `READY`／`IN_PROGRESS`／`DONE`／`BLOCKED_ENV`／`NOT_VERIFIED`，並附驗證紀錄。

---


### 1.5 將「省更新流量」拆成三條可獨立驗收目標（新規格）

| 目標 | 設計 | 可省流量的情況 | 不會解決的情況 |
|---|---|---|---|
| A. 程式模組化 | Rust crates / Android Gradle library / Swift package | 間接：促進小變更與快取 | 模組分開編譯並不等於使用者分開安裝 |
| B. 資料包獨立更新 | HTTPS + 簽署 manifest + 受限 JSON/圖片 | 改站點規則、分類、圖示時僅抓變更的資料包 | 新認證／解碼／原生功能仍需 App 發版 |
| C. 原生安裝差異下載 | Android sideload binary delta + 可靠 fallback | 既有 APK 的相同變體、舊包可取、patch 足夠小時 | Play/iOS 由商店控制更新；patch 不是可執行外掛 |

**效益基準**：基於測試 APK/JSON 包實際檔案度量；不要承諾每次 150MB→5MB。記錄 `fullBytes`、`patchBytes`、`savedBytes`、`savedPercent`、平均安裝耗時、失敗率、fallback 率。不同發佈渠道要分開統計。

### 1.6 平台與版本策略（新規格）

- Android 原有 `minSdk=24`、`targetSdk=35`、`1.4.0 (118)` 是現況文件中的基線；不在未經盤點時升級 SDK。
- iOS `minimumDeploymentTarget` **暫定 16.0（待實際 Xcode/依賴核對）**，但 iOS 26+ 新功能必須使用 availability gate；不得在最低系統直接呼叫高版 API。具體分布由 Codex Phase 0 調查之後在 ADR 鎖定。
- `appVersion`、`coreApiVersion`、`packageSchemaVersion`、`packageVersion`、`catalogSequence` 分別管理，不能把版本字串混用。
- Android sideload 新版仍遵守 `versionCode` 單調遞增／同套件名／簽章相容；每個 CPU ABI、APK 變體獨立標識。iOS `CFBundleIdentifier` 由實際開發帳號設定，不杜撰。

## 2. 系統架構

```text
                          ┌───────────────────────────────────────┐
                          │            Shared Assets              │
                          │ web-scripts / fixtures / schema docs   │
                          └──────────────────┬────────────────────┘
                                             │
┌──────────────────────────────┐   ┌─────────▼────────────────────┐
│ Android (Kotlin, current UI) │   │    Rust Shared Core          │
│                              │   │                              │
│ - Views/XML                  │◀──▶│ - kurain-core                │
│ - Android WebView            │UniFFI│ - kurain-parser             │
│ - Media3 ExoPlayer           │   │ - kurain-sources              │
│ - Media3 DownloadService     │   │ - kurain-network              │
│ - Android Keystore/SAF       │   │ - kurain-remote               │
│ - legacy compatibility       │   │ - kurain-download             │
└──────────────────────────────┘   │ - kurain-ffi (single export)  │
                                   └─────────▲────────────────────┘
                                             │ UniFFI
┌──────────────────────────────┐             │
│ iOS (Swift + SwiftUI)        │◀────────────┘
│ - SwiftUI navigation         │
│ - WKWebView / WKUserScript   │
│ - AVPlayer / AVFoundation    │
│ - URLSession + HLS download  │
│ - Keychain / file importer   │
│ - platform capability gates  │
└──────────────────────────────┘
```

### 2.1 責任與邊界

| 能力 | Rust 共用 | Android 原生 | iOS 原生 | 備註 |
|---|---|---|---|---|
| 媒體類型、來源與統一錯誤 | **P0** | 轉換 Media3 item | 轉換 AVPlayerItem | 共同契約 |
| HTML／API 解析 | **P0** | 舊 parser 過渡適配 | 共用解析結果 | 不憑空補全未取得授權資料 |
| 網頁資料擷取 | 規則判斷 | WebView snapshot | WKUserScript＋受限觀測 | JS 可部分共用、網頁能力不同 |
| 網站套件 registry | **P0/P1** | 既有套件雙軌 | 合規 allowlist | 某些站點只保留 Android |
| 播放 | 媒體描述 | Media3 | AVPlayer | Rust 不負責畫面／解碼 |
| 下載工作邏輯 | **P1** | DownloadManager/Service | URLSession／AVAssetDownloadURLSession | 不直接共享平台持久任務本體 |
| 遠端 HTTP/WebDAV | **P0** | 保留原功能＋切換 | 新實作 adapter | HTTP 可能使用 Rust streaming adapter |
| SFTP | **P1** | 既有實作不破壞 | 視相容庫／測試 | 主機金鑰確認不可退化 |
| SMB/FTP | **P2** | 保留既有實作 | 初期禁用或標示不支援 | 先完成安全性／相容性調查 |
| 播放紀錄 | 共用 schema/規則 | 舊資料遷移／適配 | 新儲存層 | 不強制跨設備同步 |
| 網站登入態／密碼 | 僅處理最小必要短生命週期上下文 | CookieManager／Keystore | WKWebsiteDataStore／Keychain | 不跨站複用 |
| 本機檔案權限 | 無 | MediaStore／SAF | PhotosPicker／fileImporter | App 沙盒差異 |
| 更新 | 無 | APK 更新 | App Store / 發布渠道 | 絕不自行在 iOS 安裝 APK |

**注意**：Rust 對 SMB/SFTP 的可移植性不是已驗證事實。必須先完成庫選型、授權、TLS/SSH、安全性與真實伺服器實測，再宣稱「跨平台共用」。

### 2.2 專案落地目錄（不搬動既有 Android）

```text
<repository-root>/
├── app/                                    # 現有 Android App（保留原位置）
├── gradle/                                 # 如現有存在則保留
├── build.gradle.kts                        # 如現有存在則保留
├── settings.gradle.kts                     # 如現有存在則保留
├── rust/
│   ├── Cargo.toml                          # Workspace
│   ├── Cargo.lock                          # library app workspace 可鎖版本以利重現
│   ├── rust-toolchain.toml                  # 經專案實測後固定 stable 版本
│   ├── crates/
│   │   ├── kurain-core/
│   │   ├── kurain-parser/
│   │   ├── kurain-sources/
│   │   ├── kurain-network/
│   │   ├── kurain-remote/
│   │   ├── kurain-download/
│   │   ├── kurain-ffi/
│   │   └── uniffi-bindgen/                 # 若所選 UniFFI 版需獨立 bindgen binary
│   └── tests/
├── ios/
│   ├── KurainVideo.xcodeproj/              # 或採 XcodeGen；不得偽造不可建置專案
│   ├── KurainVideo/
│   │   ├── App/
│   │   ├── Features/{Local,Web,Sources,Downloads,Settings,Player}/
│   │   ├── Services/{RustCore,Playback,WebDetection,Download,Remote,Storage}/
│   │   └── Resources/
│   └── KurainVideoTests/
├── shared/
│   ├── web-scripts/
│   │   └── webview-video-snapshot.js       # 從 Android 搬出共用版本後，來源只留一份
│   ├── contracts/
│   └── fixtures/
├── scripts/
│   ├── check-env.sh
│   ├── build-rust-android.sh
│   ├── build-rust-ios.sh
│   ├── generate-bindings.sh
│   ├── test-core.sh
│   └── smoke-android.sh
└── docs/cross-platform/
    ├── INVENTORY.md
    ├── MIGRATION_MAP.md
    ├── DECISIONS.md
    ├── COMPATIBILITY.md
    ├── TEST_MATRIX.md
    ├── PHASE_STATUS.md
    └── SECURITY_REVIEW.md
```

若實際專案現有路徑不同，`INVENTORY.md` 必須先建立實際位置；不要硬套上述範例。

### 2.3 相依選型原則

- Rust stable + Cargo workspace；`clippy`、`rustfmt`、`cargo test` 必須可重現。
- Rust/Kotlin/Swift 使用 Mozilla **UniFFI**；選定一個實際可編譯的版本並集中固定，不追未經驗證的實驗性 backend。
- 非同步處理優先 `tokio`；HTTP 可採 `reqwest`＋`rustls`，但須評估 Android/iOS TLS 信任、Cookie、代理、憑證與授權條件。
- JSON 可用 `serde`／`serde_json`；HTML 可用 `scraper` 或等效成熟套件。僅在確有需求時加入重量級依賴。
- 使用「一個 `kurain-ffi` 暴露的穩定接口」管理版本與 ABI；不要讓 App 直接引用每個 Rust crate。
- Android Media3、原始 Gradle plugin 與 Kotlin 版本不得為了引入 UniFFI 而任意升級；先檢查目前版本。
- iOS 最低部署版本：**提案 iOS 16+**，Codex 須在 Phase 0 記錄所選 SDK/Xcode 相容性與理由；不得當作既有已決定事實。
- Android 初版 Rust `.so` 產物支援 `arm64-v8a`；`armeabi-v7a`、`x86_64` 依既有 Android 發行 ABI 與模擬器驗證需求決策，不可默默破壞既有支援。
- iOS 必須能打包真機 arm64 及模擬器適用架構（Apple Silicon 模擬器 arm64；Intel 模擬器按建置環境評估）為 XCFramework；不得混用 Device/Simulator slice。
- 若沒有 Mac，允許在 Linux/Windows 完成 Rust 通用邏輯和 Android，但 iOS 真正編譯與簽章須列 `BLOCKED_ENV`。

---


### 2.4 四層交付架構（新增，取代「全部都可熱更新」的誤解）

```text
       [Android sideload]   [Android Play]         [iOS App Store]
          APK/full/patch      AAB/Play-managed      IPA/App Store-managed
                  \            |                 /
                   \           |                /
           +--------------------------------------------------+
           | Platform App Shell                               |
           | Android Views/XML+Media3 | SwiftUI+AVPlayer       |
           | WebView/WKWebView | Download adapters | Storage  |
           +----------------------+---------------------------+
                                  |
                     UniFFI generated Kotlin/Swift
                                  |
           +----------------------v---------------------------+
           | Rust Shared Core (compiled into App release)    |
           | models | parser | sources | remote | updater     |
           +----------------------+---------------------------+
                                  |
             [Signed versioned declarative package catalog]
                 | rules/json | icons | categories | assets
                 | no remote executable native or script code
                                  |
             CDN/NAS static HTTPS artifact storage

          App release and data package release are SEPARATE.
```

- `App Shell` 強制內建 `embeddedSafeCatalog`，即使離線、伺服器毀損或簽章驗證失敗仍能啟動。
- `Rust Core` 提供 package schema 解譯、版本判斷、驗章及解析；沒有替換 Android/iOS 影像解碼引擎。
- `Distribution` 只提供可審核的 artifacts；下載後與 App 的信任根隔離；更新時不得匯入任意動態程式。
- `Updater` 應部署在 *Android sideload native 層*；Rust 可共用 manifest 校驗與 patch bytes 產生驗證，但安裝動作只在 Android 系統安裝器執行。

### 2.5 發布渠道能力矩陣（Android/iOS 既有三渠道 + 桌面兩渠道）

| 功能 | Android 自架 | Android Play | iOS App Store | Windows Direct | macOS Direct |
|---|---|---|---|---|---|
| 原生程式更新 | signed APK/full/delta | Play 機制 | App Store | Tauri signed updater / NSIS | Tauri signed updater / signed + notarized app |
| 按需原生功能 | 不做 dex loader | 可研究 Play Feature Delivery | 不做 native hot swap | 原生整包安全更新 | 原生整包安全更新 |
| JSON/圖片資料包 | 自架 signed HTTPS | 自架 signed HTTPS + Play policy | 自架 signed HTTPS + Apple policy | 自架 signed HTTPS | 自架 signed HTTPS |
| 大型純資源 | 自架 CDN | 可研究 Play Asset Delivery | 可研究 Background Assets | 自架 CDN | 自架 CDN |
| 更新失敗 | fallback full APK | 平台復原 | 平台復原 | signed reinstall / safe recovery | signed reinstall / safe recovery |
| 站點來源 | 合法與授權 | Play allowlist | iOS 編譯 allowlist | desktop allowlist | desktop allowlist |

官方規則查驗：Android Play Feature Delivery 只能透過 Play/App Bundle 隨選交付；Google Play 禁止以非 Play 機制更新 App 本體或下載外部 dex/JAR/so；Apple App Review 2.5.2 對下載改變功能的程式碼有限制，5.2.3 對未經授權的第三方影音下載有限制。詳見第 16 章來源 URL。

## 3. 現有原始碼映射與重構方式

Codex 必須先閱讀下列表中**實際存在**的類別，建立調用圖、相依方向、現有測試及可抽離純邏輯。來源名稱取自現況文件；若不一致，實際檔案優先。

| 現有位置／類別 | 既有責任 | v2.0 建議處理 | 不可破壞的行為 |
|---|---|---|---|
| `MainActivity.kt` | 主流程與啟動 | 保留 UI/Activity，增加 adapter 注入 | Activity 入口、分享 intent |
| `HomeScreen.kt` | 五分頁、UI、設定 | Android 暫不大改，只替換資料供應器 | 導覽、搜尋、排序、現有設定 |
| `PlaybackActivity.kt` | Media3 播放 | 保留播放器，加入 `PlaybackSource` 轉換 | 手勢、速度、音軌、返回、續播 |
| `VideoSitePlugins.kt` | 網站來源註冊及解析 | 抽共通模型；按來源逐支搬 Rust | 現有站點辨識與可用性 |
| `ExtensionPackages.kt` | 套件管理 | registry schema／feature flag 適配 | 啟用／停用及站點設定 |
| `WebViewVideoSources.kt` | 網頁候選／上下文 | 保留 WebView 擷取，將候選正規化抽 Rust | 使用者手動偵測／手動播放 |
| `webview-video-snapshot.js` | DOM/snapshot | 共享 JS 測試資產；平台另實作注入 | 不能跨來源讀取或繞過瀏覽器限制 |
| `RemoteModels.kt` | 遠端連線模型 | 建立 Rust 契約與 adapter | URI 不含帳密 |
| `RemoteClient.kt` | 協定連線 | 先 HTTP/WebDAV 部分抽出；其他分段 | Range、Seek、認證、安全性 |
| `RemoteStore.kt` | 設定持久化 | 現有 Android store 保留，遷移時做映射 | Keystore 密碼及主機指紋 |
| `RemoteMediaDataSource.kt` | Media3 遠端讀取 | 先不替換，保留 `kvremote://` | 定位讀取與 Seek |
| `PlaybackHistory.kt` | 最近播放及續播 | 共用規則契約＋舊資料 adapter | 最多 50 筆、首尾 5 秒規則 |
| `OfflineMedia.kt` | 下載／離線資料 | 保持 Media3 Index，新增共用 job model | 原有離線項目仍可播放 |
| `MediaDownloadService.kt` | Android 背景下載 | Android 專屬，不遷入 Rust 執行緒 | 同時 2 筆、背景恢復 |
| `DownloadsPanel.kt` | 下載 UI | Android 沿用，將 job view model 正規化 | 排隊、重試、播放、移除 |
| `AppUpdateClient.kt` / `ApkUpdateVerifier.kt` | APK 更新 | Android 專用 | SHA-256、明確確認安裝 |

### 3.1 來源套件遷移政策

- 目前已登記來源包含：Anime1、age動畫、動畫瘋、A/B/C/D、各網站型套件與 APK/API 型套件；**註冊不代表線上可用**。
- **先選一個可控的 fixture 型 parser** 作為 Rust MVP，確保解析回歸結果一致；再挑一個授權且可合法測試的真實來源。
- 站點專用簽章／解密、session 與外部 API 等邏輯，只有在明確合法授權、測試資料及安全檢查足夠時，才可搬移；D 類來源不可直接移植敏感祕鑰到公開客戶端。
- **Android 舊解析器與 Rust 新解析器需雙軌驗證**，不可同日直接全站替換。
- iOS source registry 的內容由合規 allowlist 決定，並支援沒有啟用來源時的空畫面；**不能把 Android 來源自動全數打包 iOS**。

---


### 3.2 原始碼對應至交付模組（強制盤點並產生一覽）

| 原有檔案（As-built 指向） | 既有責任 | v2 所屬層 | 遷移注意事項 |
|---|---|---|---|
| `VideoSitePlugins.kt` | 站點註冊與解析 | Rust parser/sources + Android legacy adapter | 特殊簽章/解密不強制轉 JSON |
| `ExtensionPackages.kt` | 套件啟用、套件頁 | Rust catalog + Android UI | 舊 enabled 設定要保留 |
| `WebViewVideoSources.kt` | 網頁候選來源 | Android WebView + shared detector JS | JS 隨原生 App 編譯發版 |
| `webview-video-snapshot.js` | snapshot / DOM | 內嵌 shared/web-scripts | 不支援遠端 Script 下發 |
| `PlaybackActivity.kt` | Media3 播放 | Android native | 不重寫播放器作為首要工作 |
| `RemoteModels.kt`, `RemoteClient.kt`, `RemoteStore.kt` | SMB/FTP/SFTP/WebDAV/HTTP | Rust remote + adapter | 保留 Android fallback，分協定驗收 |
| `RemoteMediaDataSource.kt` | Media3 遠端 Seek | Android data source | Range/Seek 必須測試 |
| `OfflineMedia.kt`, `MediaDownloadService.kt` | Media3 下載 | Android native | 不破壞索引/路徑/佇列 |
| `PlaybackHistory.kt` | 歷史/續播 | cross-platform model + adapters | 50 筆與 5 秒歸零規則保留 |
| `AppUpdateClient.kt`, `ApkUpdateVerifier.kt` | 自架 APK 更新 | Android sideload updater | 先加信任 metadata，再做 delta |
| `MainActivity.kt`, `HomeScreen.kt` | UI/導航 | Android shell | 五頁與返回狀態不能退化 |

Codex 必須確認：實際 Class/方法、依賴方向、測試、manifest export 狀態、是否有 Gradle flavor、所有下載入口。不能單靠檔名判斷已完成設計。

## 4. Rust Workspace 詳細規格

### 4.1 `kurain-core`（P0）

**責任**：與 UI、網站、平台無關的值物件、驗證、型別、契約、錯誤與重試策略；不得依賴 Android/iOS framework。

**必備型別**：

```text
PlatformKind = ANDROID | IOS
MediaKind = PROGRESSIVE | HLS | DASH | RTSP | REMOTE | TORRENT | UNKNOWN
Availability = SUPPORTED | UNSUPPORTED | REQUIRES_USER_ACTION | EXPIRED
SourceStatus = ENABLED | DISABLED | DEGRADED | UNSUPPORTED_ON_PLATFORM
ErrorCode = INVALID_INPUT | INVALID_URL | NETWORK_TIMEOUT | NETWORK_OFFLINE
          | HTTP_ERROR | AUTH_REQUIRED | ACCESS_DENIED | TOKEN_EXPIRED
          | SOURCE_NOT_FOUND | PARSE_FAILED | UNSUPPORTED_FORMAT
          | UNSUPPORTED_PLATFORM | DRM_PROTECTED | RANGE_UNSUPPORTED
          | TLS_VALIDATION_FAILED | SSH_HOST_KEY_CHANGED
          | CANCELLED | RATE_LIMITED | STORAGE_PERMISSION
          | INTERNAL_ERROR
```

**模型契約（示意欄位，最終以 UniFFI 可生成型別定義並提交為準）**：

```text
MediaItem:
  id: String
  sourceId: String
  title: String
  pageUrl: String?
  thumbnailUrl: String?
  description: String?
  groupId: String?              # 番劇或影集 ID
  episodeId: String?
  durationMs: UInt64?
  updatedAtEpochMs: UInt64?

PlaybackSource:
  id: String
  mediaKind: MediaKind
  uri: String                   # 不允許在 URL 中嵌入 user:pass
  title: String
  mimeType: String?
  qualityLabel: String?
  headers: List<HeaderEntry>    # 僅短生命週期，永不落地/列印
  expiresAtEpochMs: UInt64?
  needsPlatformCookies: Boolean
  remoteResourceId: String?
  drmProtected: Boolean         # true 時本期回覆不支援，不繞過

HeaderEntry:
  name: String
  value: String                 # log/Debug/Crash metadata 一律遮罩

ParseRequest:
  sourceId: String?
  pageUrl: String?
  pageHtml: String?
  capturedCandidates: List<Candidate>
  locale: String?
  platform: PlatformKind

Candidate:
  url: String
  declaredMime: String?
  referer: String?
  origin: String?
  observedAtEpochMs: UInt64?

ParseResult:
  items: List<MediaItem>
  playableSources: List<PlaybackSource>
  warnings: List<CoreWarning>

CoreWarning:
  code: String
  message: String

CoreError:
  code: ErrorCode
  safeMessage: String
  retryable: Boolean
  httpStatus: UInt16?
  sourceId: String?
```

**契約規則**：

1. 所有 URL 必須使用標準 URL parser 驗證；僅按允許的協定執行，禁止無條件跟隨不安全 redirect。
2. 明確保留 Header，但不可跨網域任意複製 Authorization/Cookie。重新導向需再次判斷同源／授權邊界。
3. `PlaybackSource` 是播放期的短生命週期物件，**不是長期播放歷史格式**；歷史只存安全、穩定的媒體 ID／URI 或可重解析資訊。
4. 網頁候選去重必須明確定義基準；至少同一正規化 URL 去重，不得錯把不同授權上下文視為同一可播放來源。
5. 相同 fixture、相同輸入與設定，解析結果排序應可重現。
6. errors 採可序列化穩定 `code`，平台 UI 翻譯文字；不在錯誤字串回傳敏感 URL Query／Cookie。
7. Media type 判斷不能只依副檔名，要綜合已知 MIME、manifest 特徵、來源明確宣告；缺乏證據則 `UNKNOWN`。
8. 對可能超過 FFI 支援整數範圍／時區語意的欄位，明確訂單位與 nullable 方案；禁止默默溢位。

### 4.2 `kurain-parser`（P0）

- 提供純文字 HTML/JSON/HLS manifest 的分析函式與標準化候選結果。
- 使用 `fixtures/` 提供可重播測試，不依賴真實成人網站、雲端私有 API 或無法穩定連線的外部站點。
- 支援 `video`、`source`、常見播放器設定可見欄位、公開可解析 manifest；**不得宣稱可從任意 blob URL 還原完整影片**。
- HLS 相對資源 URI 修正必須遵守 URI 規則，保留 query、fragment 與 manifest 中必要標頭情境；不可任意改寫密鑰或 DRM URI。
- 遇到沒有授權取得的 HTML、iframe、登入資料時回傳明確狀態，避免兜底亂猜影片網址。
- 解析上限：候選最多 100 筆（沿用現況），HTML 大小、重試數與 HTTP response 大小需可配置且具合理限制。
- 狀態語意：**空列表不等於網路錯誤**，Pagination 結束應由來源 API 判定。

### 4.3 `kurain-sources`（P0/P1）

- `SourcePlugin` 內部介面：`id`、`name`、`category`、`capabilities`、`supports(platform)`、`list`、`search`、`detail`、`resolve`；介面不必直接暴露 Rust trait 到 FFI。
- 每個站點具備獨立模組、timeout、重試與 fixture；不得把全部站點寫在單一巨大 `match`。
- `SourceRegistry` 按平台／feature flags／使用者啟用狀態取來源；iOS allowlist 為編譯／配置審核的一部分。
- 已失效／不支援狀態可顯示資訊與原因，不可誤回報「沒有更多影片」。
- 遵循來源服務條款與內容授權；不得新增 Cloudflare/CAPTCHA 自動繞過能力。

### 4.4 `kurain-network`（P0）

- 可重用：timeout、重試與 exponential backoff＋jitter、HTTP 狀態處理、redirect policy、headers allowlist、network client abstraction。
- 建議預設：連線逾時 10 秒、整體請求逾時 30 秒、僅冪等請求可對暫時性失敗最多重試 2 次（**提案值，可依現有行為及測試調整**）。
- `401/403` 不無限重試；`429` 尊重 `Retry-After`；`5xx` 依策略可重試；具備 cancellation。
- HTTPS 預設驗證 TLS 與主機名稱，正式版禁止全域關閉 TLS 驗證。
- Proxy／CA／使用者特定 local HTTP 必須顧及各平台政策；HTTP cleartext 不應整個 App 全域放行。
- DNS 重新解析／redirect 後確認目的位置；主動保護使用者憑證不傳到非預期 host。使用者明確新增私人 NAS 是允許用途，但必須做端點綁定，不能因此允許任意未經確認的來源跨網域存取內網。
- 禁止把 `cookie` 或 `authorization` 出現在 telemetry、exception、URL Query 或 SQLite 日誌。

### 4.5 `kurain-remote`（分階段）

**P0**：HTTP(S) 與 WebDAV 遠端目錄（僅伺服器有合法索引／PROPFIND）及 byte-range；提供一致型別 `RemoteEndpoint`、`RemoteEntry`、`RemoteStreamDescriptor`。

**P1**：SFTP（主機 SHA-256 指紋首次確認；變更拒絕；不得 default trust）；串流 seek 是否可靠需由實機／伺服器測試證明。

**P2**：SMB、FTP。Android 先沿用 `RemoteClient.kt`；iOS 若無可靠已審查依賴，顯示不支援而不是假實作。

介面及要求：

```text
RemoteEndpoint:
  endpointId, displayName, scheme, host, port, rootPath, username?
  credentialReference?   # secure-storage key；絕不可傳明文給一般持久化模型
RemoteEntry:
  resourceId, name, isDirectory, sizeBytes?, modifiedEpochMs?, mimeType?
RemoteStreamDescriptor:
  resourceId, seekSupported, contentLength?, mimeType?, platformOpenToken?
```

- 資料目錄瀏覽必須有取消／世代控制（上一個請求不得覆蓋新目錄）。
- 遠端讀取支援大檔、分段讀取與 Seek；若 Range 不支援應回傳 `RANGE_UNSUPPORTED`，不可悄悄從頭下載大量內容。
- Android 現有 `kvremote://` 仍為內部 resource URI；如果 Rust 不能直接供 Media3 DataSource 使用，維持 Android adapter。
- 遠端密碼留在 Android Keystore／iOS Keychain，Rust 接收需要時限內的最小授權上下文；不得持久保存祕密。

### 4.6 `kurain-download`（P1）

Rust 只負責下載策略／job metadata／retry classification／排程建議，**不宣稱能讓 iOS 背景任務永遠常駐**。

```text
DownloadJob:
  jobId, sourceId, title, type, state, progressPercent?,
  totalBytes?, completedBytes?, createdAtMs, updatedAtMs,
  platformTaskId?, errorCode?, retryCount

DownloadState:
  QUEUED | PREPARING | RUNNING | PAUSED | WAITING_NETWORK
  | WAITING_AUTH | COMPLETED | FAILED | CANCELLED
```

- `PAUSED` 必須以平台實際可暫停／可續傳能力判斷；不可在不可續傳的 HLS 任務上假裝無損續傳。
- Android 原本 Media3 同時執行上限 2 必須保留。
- iOS HLS 使用 AVFoundation 離線資產模型；一般 HTTP 檔案使用 URLSession 背景工作。HLS 不應被一律當成單一 MP4。
- 失效 token 可重新解析時提示或重試，但不可繞過來源授權。
- Android 舊 DownloadIndex／Cache 不做破壞性轉換；Rust job model 為顯示與策略層。

### 4.7 `kurain-ffi`（P0）

**原則：** 對 Kotlin/Swift 輸出單一、高層次、低傳輸次數接口。優先 UniFFI 可穩定生成的純值物件、enum、結果錯誤與 async 方法；不要跨 FFI 直接傳巨大 HTML 樹、Android Context、Media3 Player、Swift AVPlayer 或未界定生命週期的 raw pointer。

必備操作：

| API（概念名稱） | 入參 | 回傳 | 說明 |
|---|---|---|---|
| `coreVersion()` | 無 | `String` | 給灰度切換／診斷 |
| `getCapabilities(platform)` | `PlatformKind` | `Capabilities` | 平台能力不自動誇大 |
| `parseCandidates(request)` | `ParseRequest` | `ParseResult` 或 error | 純解析，P0 首要 |
| `getSources(platform, flags)` | 平台與旗標 | `SourceDescriptor[]` | 可見來源列表 |
| `normalizePlaybackSource(source)` | `PlaybackSource` | 有效來源／error | URL、媒體種類、標頭檢查 |
| `resolveMedia(request)` | `ResolveRequest` | `ResolveResult` | 網站解析，有網路才 async |
| `listRemote(endpointId, path)` | 遠端資源 | `RemoteEntry[]` | P0 HTTP/WebDAV 起 |
| `classifyDownloadFailure(...)` | 失敗上下文 | `RetryDecision` | P1 可先純函式 |

**FFI 錯誤與併發設計：**

- 安裝一個版本鎖定的 UniFFI 工具鏈；Kotlin/Swift binding 由正式腳本生成，生成檔依專案方針提交或在 build 時可重現產生，不能混合不同版本。
- API 在 Rust 內建 timeout/cancellation；Kotlin suspend/協程與 Swift Task 須適配取消。
- 大量事件採平台單次查詢、分頁或明確 `pollEvents`；不用不可控的跨 FFI callback 洪流。
- 單個操作結果大小有限制；不要在 UI 主執行緒同步等待網路／磁碟。
- `panic` 不可跨 FFI 邊界；錯誤做安全轉換，必要時捕捉並返回 `INTERNAL_ERROR`。
- 生命週期：Rust Core 初始化由 App scope 管理；退出頁面可取消 request；不保存 WebView/WKWebView 指標。

---


### 4.8 `kurain-package`（新增 P0，宣告式資料套件）

Rust 模組負責 `PackageCatalogRepository`、`PackageSchemaValidator`、`PackageResolver`、`PackageInstaller`（只寫 App 沙盒資料）、`PackageActivationStore`、`PackageCompatibility`、`PackageRollback`。核心不得直接持有 Android Context 或 Swift UIApplication；檔案存取、時鐘及網路透過抽象界面注入。

- 使用支援明確 version 的 JSON schema，預設只有 selector / declarative URL template / metadata / 有限條件運算。
- 欄位未知時區分 `critical`（拒絕）及向前相容（忽略）；未知 operator 必須拒絕。
- 對輸入文件、CSS selector、URL template、regex 設長度、時間與運算上限；採支援線性時間或可控資源的匹配器。
- 對 JSON/zip 套件驗章、內容 SHA-256、平台 capabilities、schema/core/app min/max、拒絕跨平台來源。
- 每個 package 不得注入 Rust 程式碼、JS/Wasm、原生庫、檔案系統執行操作、外部命令、任意 HTTP headers／cookie 存取。授權資訊只由 App 既定 policy 授予。
- 安裝資料使用 staging → fsync/atomic rename（依平台檔案 API 可能需相應保證）→ active pointer 原子切換；crash 不可留下半個 active package。
- 舊版至少保留最近 1 份完整可用 package，擁有者可選擇回滾；套件禁用不刪除使用者的來源偏好設定。

### 4.9 `kurain-update-protocol`（新增 P0，共用驗證）

提供 `verifyCatalogEnvelope`、`checkPackageCompatibility`、`verifyArtifactDigest`、`selectUpdatePlan`、`shouldFallbackToFull`。提供純函式決策與 Rust unit tests，**不在 Rust 自動執行 App 安裝**。Android 上的 `AndroidApkPatchEngine` 由 native 層封裝；iOS 上只顯示 Store 更新或下載靜態資料。

**建議 update plan 結果**：`UP_TO_DATE`、`DATA_PACKAGES_ONLY`、`APP_FULL_REQUIRED`、`APP_DELTA_ELIGIBLE`、`STORE_UPDATE`、`INCOMPATIBLE`、`OFFLINE_USING_EMBEDDED`、`SECURITY_REJECTED`，並含 machine-readable 原因。

## 5. Android 遷移（保留既有產品）

### 5.1 必須保持的 1.4.0 行為

1. 五分頁：本地、網頁、套件、下載、設定。
2. MediaStore／SAF、資料夾、搜尋排序、歷史／續播。
3. WebView 手動偵測可播放候選、播放／下載／複製、頁面切換清理。
4. 套件列表、分類、搜尋、分頁、詳情／集數、返回原位置。
5. Media3 Progressive/HLS/DASH/RTSP 與既有 gesture、全螢幕、速度、音軌選擇。
6. 遠端 HTTP/SMB/FTP/SFTP/WebDAV 既有流程、認證、安全保護與 Seek。
7. 背景下載、DownloadIndex、已下載媒體、最大同時數 2。
8. APK 更新驗證與使用者確認。
9. 設定與歷史不遺失；簽章、applicationId 保持不變。

### 5.2 建立 Adapter 和灰度切換

Android 端新增（名稱為預期，可以依既有包架構決定）：

```text
app/src/main/java/com/kurain/video/corebridge/
  KurainCoreProvider.kt
  RustSourceResolver.kt
  LegacySourceResolver.kt
  SourceResolverFacade.kt
  PlaybackSourceMapper.kt
  CoreErrorMapper.kt
  FeatureFlagStore.kt
```

- `SourceResolverFacade` 先委派 `LegacySourceResolver`；只有明確開關和已驗收 source ID 才走 `RustSourceResolver`。
- 發生 Rust 解析錯誤時，如果原本 Kotlin 解析路徑存在，僅在同一來源、同一授權邊界下按已定義規則 fallback；不要把 `AUTH_REQUIRED`／`DRM_PROTECTED` 轉成「繞過後重新解析」。
- 選擇新舊解析器不重建整個 Activity；UI 無須知道 Rust 具體類別。
- `PlaybackSourceMapper` 必須正確把 URI、MIME、必要 request headers、遠端識別送至原 Media3 DataSource/MediaItem。
- 不將整個 WebView Cookie jar 搬進 Rust。只有對指定來源、指定時效取得且確有必要的上下文可短暫提供。
- Android JNI／UniFFI 生成與 `.so` 載入失敗要有可觀測但不洩密的錯誤，且能回退舊流程。

### 5.3 Android feature flags

```text
rust_core_enabled                 default=false
rust_candidate_parser_enabled     default=false
rust_source_registry_enabled      default=false
rust_remote_http_enabled          default=false
rust_download_policy_enabled      default=false
```

- 初期只供開發與測試環境明確開啟；穩定後分別調整預設，不做一鍵全功能切換。
- Flags 不應被遠端網站頁面修改；旗標與使用者自選站點設定分離。
- 原有 SharedPreferences 鍵名不要因 Rust 重構而失效。

### 5.4 Android 發布及資料相容

- 不更改 Android 套件簽章、`applicationId`、歷史格式、離線 cache 位置或 remote credential alias，除非明確編寫兼容遷移。
- 每個遷移使用版本化 migration id；先讀後寫、可重跑、保留原始值直到核對完成。
- 播放歷史原有規則：**最多 50 筆，最新置頂；小於 5 秒或距結尾小於 5 秒，續播位置歸零**。
- 對已有使用者資料的升級測試：從 Android 1.4.0 安裝 v2.0，歷史、遠端設定、下載與已安裝權限可用。

---


### 5.5 Android 兩種發佈 variant 的必要隔離（新規格）

- Gradle `productFlavors`（名稱可經 Phase 0 核對後調整）：`sideload`、`play`；**不要變更現行 sideload Application ID / 簽章相容**。
- `sideload` 可編入 `SideloadApkUpdater`、`REQUEST_INSTALL_PACKAGES`（需依實際 Manifest 調查與使用情境合規）；`play` 不得編入自架 APK 下載／安裝路徑；也不得因 server flag 重新開啟。
- `play` 使用受官方支援的 In-App Updates；可選 `feature` 動態模組要透過 Play Feature Delivery，不支援從自家伺服器下載 Kotlin/Rust 程式。
- 兩版都可經 HTTPS 拉取受限 JSON / 靜態資源套件，但 catalogs 必須按發佈 policy 綁定 `distributionChannel` 與 `capabilities`。
- 保留現有版本 package ID；Play 發布是否能沿用簽章、資料及版本序列由實際發佈流程決定，不能假設互通。
- 不在沒有測試情況下修改 `extractNativeLibs`、APK split、ABI、安裝簽章或 Download Index 目錄。

### 5.6 Android 原有多功能完整保留要求

五分頁、遠端協定、站點候選、磁力流程、下載、APK 更新、原生播放器手勢需保持原本 As-built 水準。新版的 `PackageCatalog` 預設覆蓋最簡單／最可重現的站點；難以宣告式支援的 legacy Kotlin 解析保留，不以「全部可更新」為交付假象。站點套件狀態須在 `BUILTIN_LEGACY`、`DECLARATIVE_DATA`、`NATIVE_CORE_REQUIRED` 三者之間清楚標記。

## 6. iOS App 全功能設計（SwiftUI；依平台能力分級）

### 6.1 專案與發布設定

- 新建獨立 Xcode 專案，App 顯示名稱 `Kurain Video`；**Bundle Identifier 不能直接套用 Android `applicationId`**，提出建議值但須由開發者最終核定／簽章。
- iOS UI 採 SwiftUI，NavigationStack + TabView；狀態管理以 Swift Concurrency 和 ViewModel／Service 分層；不導入不必要的第三方重型框架。
- 預設配色延續 Android 清爽藍概念，但採 iOS Human Interface Guidelines；暗色模式可切換。
- 秘密資料 Keychain；一般設定 AppStorage/UserDefaults；可結構化的歷史紀錄使用 SwiftData／SQLite／檔案儲存其一，須在設計決策中說明；不假定 Android SharedPreferences 可直接讀入 iOS。
- 權限文字、ATS 策略、Background Modes、Local Network privacy、下載背景 session identifier 實際根據使用功能設定，不預設全面權限。
- iOS App Store 提交僅使用具有權限且符合服務條款的站點／下載能力；不得預裝成人內容來源或未授權下載功能。

### 6.2 五分頁資訊架構

| Tab | P0 實作 | P1/P2 或差異 |
|---|---|---|
| **本地** | 系統文件選取、已選媒體列表、最近播放、HTTP/WebDAV 入口 | Photos 媒體瀏覽、SFTP；SMB/FTP 研究 |
| **網頁** | 地址列、WKWebView、Back/Forward/Reload、使用者觸發影片偵測面板 | 更完整可觀測能力視 WebKit 限制 |
| **套件** | 已核准來源列表、分類／搜尋／詳情／集數、播放 | 特殊 API 與其他來源逐站驗收 |
| **下載** | HTTP 檔案任務、列表與狀態、完成檔案播放 | HLS 離線下載與完整續傳按實測實作 |
| **設定** | 外觀、播放、網頁、遠端設定、下載策略、來源管理、關於 | 適當的匯入／匯出與診斷 |

### 6.3 本地頁

- 顯示 `裝置檔案`、`遠端儲存`、`最近播放` 入口；不假設 iOS 能任意掃描使用者整個檔案系統。
- 使用 `fileImporter` 及 security-scoped URL；存取權限隨系統提供，必要時做 bookmark 保存及失效重選。
- 已加入影片可格狀／列表、搜尋、排序、標題與可用封面。不能取得的檔案顯示 `需重新授權`。
- 最近播放保留標題、媒體參考、位置／總長度；跨平台一致的 50 筆與 5 秒規則。
- HTTP/WebDAV 遠端目錄有路徑、上一層、刷新、目前目錄搜尋、載入／錯誤／空狀態；無伺服器 Range 支援時明確告知不能 Seek。

### 6.4 網頁頁

- 提供網址欄、首頁捷徑、Back/Forward/Reload、分享網址、手動 `偵測影片` 按鈕。
- 使用 WKWebView、WKUserScript 與安全的 `WKScriptMessageHandler`；內容世界／橋接白名單按最低權限設計，避免受網頁任意控制原生動作。
- **優先共用純 DOM snapshot 邏輯**；針對 WebKit 不支援的 Android 網路層觀測功能須顯示 `僅能偵測頁面可取得的來源`，不可宣稱與 Android 100% 一致。
- 頁面換網址／重載／離開時清除來源候選、停止舊請求，結果用 request generation 防止舊頁覆蓋新頁。
- 偵測候選最多 100 個，去重、分類、顯示品質／格式；提供 `播放`／`下載`（符合平台／授權才顯示）／`複製`。
- 若頁面尚未發出媒體請求，提示使用者先操作原網站播放，再重新偵測。明確無法處理 DRM／跨來源未公開資料。
- Cookie 由 WKWebsiteDataStore 管理；不得把 Android WebView Cookie 匯出當作跨平台同步功能。

### 6.5 套件頁

- `SourceRegistry` 顯示啟用來源、狀態與來源說明；無合規來源時顯示空狀態和說明。
- 各來源提供其本身支援的分類、列表、搜尋、影片卡、詳情／集數／播放來源。
- 分頁採可回復狀態，已取得資料保留，載入錯誤可重試，**只有真正空結果或 API 指示完結才視為末頁**。
- 目前 Android 偏好每頁 6／8／10、背景預載 2／4／6；iOS 若首版未完整支援，需在 `COMPATIBILITY.md` 明寫差異，不能假裝一致。
- 返回播放器後盡量恢復原列表／詳情與 scroll state。

### 6.6 iOS 原生播放器

**P0：**

- `AVPlayer`／`AVPlayerItem`，支援系統能力允許的本地影片、HTTP progressive、HLS。
- 支援播放／暫停、Seek、目前／總時間、緩衝指示、錯誤呈現、全螢幕、播放速度（依媒體支持）、Audio Session 與中斷處理。
- 讀取 `PlaybackSource` 的 MIME、headers、期限與 Cookie 要求，**逐格式驗證**；不保證 AVPlayer 可任意附加自訂 HTTP headers。不能可靠傳入所需 headers 時明確回報，或在有權限前提下重取可直接播放來源；不可用未公開 API 當正式解法。
- 進出播放器應保留來源詳情與瀏覽紀錄；歷史／續播與 Android 共用規則，實際儲存由 iOS 管理。

**P1：** 手勢操作與 Android 交互對齊、外掛字幕、可用音軌／字幕選擇、畫中畫（PiP）、Media controls；須通過實機驗證。

**不承諾：** DASH／RTSP 原生 AVPlayer 支援、所有編碼、FFmpeg SW fallback、DRM 規避；遇到不支援來源回 `UNSUPPORTED_FORMAT` 及可理解的 UI。

### 6.7 iOS 下載

- 一般有權下載檔案：使用背景 `URLSession` task，包含恢復 callbacks、失敗／完成、完成檔案移至受控儲存位置。
- HLS：使用 `AVAssetDownloadURLSession` 的離線資產模式（P1）；不能將 HLS 的下載結果簡單視為 MP4。
- 檢視佇列、下載狀態、網路限制與完成檔案播放；系統不可續傳時要標示真實能力。
- App 被使用者強制結束或系統背景限制時，按 iOS 語意處理，不承諾永久自動續傳。
- 背景 download tasks 及 Rust Core 的 metadata reconcile 應具備冪等性，重啟後不重複建立相同工作。

### 6.8 設定

- 顯示已開啟的來源與是否受平台支援、Web 偵測設定、外觀、播放設定、下載位置／網路策略、遠端端點管理、關於與版本。
- 目前 Android 遠端密碼使用 Keystore；iOS 改用 Keychain。SFTP 指紋驗證若未建好，不得顯示為已支援。
- 關於頁可顯示 `Rust Core version`、平台播放器版本／能力摘要，但不得輸出秘密。
- 提供重設非敏感偏好設定；清空播放歷史與刪除離線內容必須是兩個不同動作並二次確認。

---


### 6.9 iOS 模組與更新的本質差異（新規格）

- Swift Packages / Xcode frameworks 是編譯及維護模組，不等於獨立於 App Store 的可執行碼安裝單位。
- iOS App Store 發佈版 **不實作 APK delta，也不從更新伺服器下載 Rust dynamic library / Swift binary / executable scripts**。
- 自架資料包僅限已審核 App 允許的宣告式站點規則與合法的圖片/靜態資料，不能藉 catalog 解鎖隱藏成人來源或新增未經授權下載功能。
- iOS 26+ 可評估 `Managed Background Assets` 作為大體積靜態資源派送；較舊系統由 `URLSession` 管理一般資料下載。`NSBundleResourceRequest` / On-Demand Resources 在 iOS 27 起已 deprecated，不作為新設計核心。
- 使用 `URLSession` 背景下載一般合法影音、`AVAssetDownloadURLSession` 處理適用的 HLS；要遵守系統排程及使用者強制結束 App 的限制。
- iOS 版本第一次交付：五頁導覽、檔案選擇、HTTP/HLS、WKWebView 可行的來源偵測、歷史、HTTP/WebDAV、授權資料包；DASH/RTSP/SMB/SFTP/P2P 明確標示尚未完成或由後續 Phase 評估。

## 7. 播放引擎抽象契約（平台分工）

不要求現在就做 FFmpeg 解碼器，但要定義平台 adapter，可避免日後各頁面直接耦合 Media3/AVPlayer。

```text
PlayerController (platform interface)
- load(PlaybackSource, resumePositionMs?) -> Result
- play() / pause() / seekTo(positionMs)
- setPlaybackRate(rate)
- selectAudioTrack(trackId)             # optional capability
- selectSubtitleTrack(trackId)          # optional capability
- getState() -> PlayerState
- observeState() -> stream/platform publisher
- release()

PlayerState:
  IDLE | PREPARING | BUFFERING | READY | PLAYING | PAUSED | ENDED | ERROR

PlayerCapabilities:
  progressive, hls, dash, rtsp, speed, seek, pip, externalSubtitles,
  customHttpHeaders, rangeRead, audioTrackSelection
```

**規範**：

- `PlayerController` 在 Kotlin/Swift 各自定義 interface/protocol；跨 Rust FFI 只交換 `PlaybackSource`／能力摘要。
- Android 保留現有 `PlaybackActivity`，透過適配器包裹既有 Media3，不在 Phase 1 強行改寫播放器。
- iOS player adapter 自行決定 `AVPlayer` 的建立、release 與 audio session。
- `drmProtected = true` 且尚無合法授權播放整合時，明確拒絕，不繞過 DRM。

---

## 8. WebView/WKWebView 來源偵測完整流程

```text
使用者開啟網頁
 → 平台瀏覽器正常載入
 → 使用者操作網頁播放器
 → 點「偵測影片」
 → 平台執行當頁允許的 snapshot/資源觀測
 → Candidate[]（最多100筆）
 → Rust parseCandidates / normalize
 → 平台能力與站點授權檢查
 → 候選清單：播放 / 下載 / 複製
 → 點播放
 → 平台 PlayerController
 → 儲存觀看歷史與續播位置
```

### 8.1 分離三種來源

1. **DOM 可見**：`video`／`source`、一般播放器 config、open shadow root、同源可讀 iframe；依平台與頁面 sandbox 實際能力。
2. **已觀測的網路資源**：Android 舊功能可能已記錄 MP4/HLS/DASH；iOS 若無合法可用 API 則不得假裝完整攔截。
3. **專用站點 Plugin**：依合法公開頁面／API 解析，不依賴篡改瀏覽器安全模型。

### 8.2 候選和來源安全

- 排除 `blob:`、`data:`、HLS 分片、key URL 與既有廣告封鎖條件，不作獨立完整影片。
- URL 去重但保留必要安全上下文；禁止輸出原始 Cookie/Authorization。
- 頁面作用域的 Cookie/Referer/Origin/User-Agent 只允許使用者明確選取來源後，送往對應的合法媒體 host。
- 來源過期時，回 `TOKEN_EXPIRED` 或明確錯誤，可提示回網站重新偵測；不可私自繞過授權。
- 網路錯誤不視為影片列表結束，不能覆蓋前一次有效資料。
- 不做 HTTPS TLS 忽略、不開 WebView 任意 file/content access、不建立不受控 JS-to-native 操作能力。

---

## 9. 資料模型、儲存、安全與遷移

### 9.1 資料擁有權

| 資料 | Android | iOS | Rust |
|---|---|---|---|
| 本機媒體 URI／權限 | SAF/MediaStore | security scoped file URL/bookmark | 僅描述，不持有權限 |
| 播放歷史 | 舊格式適配、遷移測試 | 新版持久化 store | 規則與通用 schema |
| 遠端帳密 | Keystore | Keychain | 僅短生命週期使用，禁止常駐記錄 |
| 站點 Cookie | WebView CookieManager | WKWebsiteDataStore | 按需短期上下文，不複製整個 jar |
| 下載狀態 | Media3 Index／Cache | URLSession/HLS metadata | 佇列觀察／可重試規則 |
| 套件啟用設定 | 現有 Preferences + adapter | iOS settings store | 可用來源、enabled schema |

### 9.2 版本化資料 schema

- 所有新持久化模型帶 `schemaVersion`；遷移 id 可查，重複執行無副作用。
- 不能把播放期 `PlaybackSource.headers`／敏感 query 直接寫進歷史資料。
- Android v1.4.0 播放歷史最多 50 筆、首尾 5 秒規則保持。
- 時間統一 epoch milliseconds；持續時間 `durationMs`；容量 bytes；UI 轉本地時間。
- iOS 初版不需 Android→iOS 自動同步；若做使用者主動匯入／匯出，需排除帳密／Cookie 並提供 schema version。

### 9.3 安全檢查

- TLS：正式環境 hostname verification／chain validation，禁止 insecure trust-all。
- HTTP redirect：Host 改變時清除／重新判斷敏感 Header，符合舊有不傳跨主機認證原則。
- SFTP：第一次確認指紋、既有指紋變更拒絕。
- SSRF：區分使用者明確新增的 NAS 端點與不受信任網站回傳的 URL；對後者限制內網／loopback／link-local 連線與 redirect；內網端點授權綁定到指定 host。
- Resource limits：HTML 大小、manifest／列表數量、逾時、解析 recursion、檔案大小與磁碟空間上限。
- Logs：headers、token、密碼、URL secret query 遮罩；Crash reports 與 analytics 不收明文。
- Secret storage：不得將 Keychain／Keystore 明文寫到一般 Preferences 或測試 fixture。
- Privacy：使用者歷史與瀏覽資訊預設裝置內保存，任何遙測都需明確定義與同意。

---

## 9A. 全新獨立資料包交付系統（P0 / 核心更新策略）

### 9A.1 使用者故事與要求

- 使用者僅更新 `site_a` 分類與 CSS selector，不應下載 100 MB App；更新前先驗證 signature、hash、schema、platform、來源權利，更新後以不重啟或安全切換方式生效。
- 使用者在無網路、更新伺服器宕機、Wi-Fi 轉行動網路時，已安裝版本與舊站點規則仍可用，若有登入態不可洩漏。
- 只有使用者啟用的資料包自動下載；不預載所有網站海報／資料（可以手動選擇一鍵更新所有已安裝資料包）。
- 使用者可檢視「已安裝套件／版本／大小／來源／更新日期／是否相容／更新紀錄」，可啟用、停用、在保留版本存在時回滾。
- 沒有合法使用權的站點或被平台 channel policy 禁止的站點，一律不可因外部 catalog 出現而變成可安裝。

### 9A.2 資料包類型與封裝規則

| 類型 | 樣例 | 更新方式 | 是否可執行程式 |
|---|---|---|---|
| `site-rules` | CSS selector、固定 JSON field path、分類、搜尋參數 | HTTPS 簽署包更新 | 否 |
| `site-metadata` | 站點名稱、圖示引用、支援功能、排序、描述 | HTTPS 簽署包更新 | 否 |
| `static-assets` | 合規圖示、封面 placeholder、合法公共資源 | HTTPS 簽署包更新 | 否 |
| `embedded-web-script` | `webview-video-snapshot.js` | **原生 App 發版** | 是，禁止遠端覆蓋 |
| `rust-core` | `libkurain_core.so` / iOS static lib | **原生 App 發版** | 是 |
| `native-codec` | FFmpeg 解碼器或 JNI codec | **原生 App 發版** | 是 |
| `site-special-auth` | HMAC/自訂認證／加解密算法 | **原生 App 發版** | 是 |

資料包 ZIP 建議檔案白名單：`package.json`、`rules.json`、`assets/*.png`、`assets/*.webp`、`README.txt`；禁止嵌入 `.js/.wasm/.dex/.so/.dylib/.framework/.sh/.exe/.py` 或任何非白名單的檔案。拒絕絕對路徑、`..`、symlink/hardlink、路徑大小寫碰撞。解壓檔數、壓縮比與總 bytes 限制必須明訂並測試。

### 9A.3 宣告式規則 DSL 限制

**允許**：選定已取得且有權處理的 DOM 文件，依 CSS selector 擷取文字／屬性；受限 JSON path 欄位擷取；用安全 URL template 合成分類、分頁與影片詳情網址；已知 enum 的 `sourceType` 與 `paginationMode`；限定 `allowedHosts`。

**拒絕**：eval、動態 JavaScript、WASM、任意 regex 不受限引擎、腳本函式、可任意讀寫檔、反射、系統命令、執行 shell、動態下載 `dex/so`、驗證碼繞過、私人 endpoint 掃描、任意 Header 注入、Cookie 偷渡跨網域。已存在的特殊站點流程仍由固定 App 版中經授權的 adapter 處理。

### 9A.4 建議資料包 `package.json` 完整範例

```json
{
  "schemaVersion": 1,
  "packageId": "site.example.catalog",
  "packageVersion": "1.2.3",
  "kind": "site-rules",
  "displayName": "Example Videos",
  "platforms": ["android-sideload", "android-play", "ios-appstore"],
  "minCoreApi": 2,
  "maxCoreApi": 2,
  "minAppVersion": "2.0.0",
  "capabilities": ["catalog", "search", "detail"],
  "allowedHosts": ["media.example.org"],
  "contentPolicy": "licensed-catalog",
  "rightsReference": "internal-approval-EXAMPLE-001",
  "entry": "rules.json",
  "files": [
    {
      "path": "rules.json",
      "sha256": "<64-hex-digest>",
      "size": 512
    }
  ]
}
```

上列 `sha256`、URL 與 rightsReference **全是示意資料，不可作為可發佈值**；發布工具必須實際計算、檢查權限憑據並拒絕 placeholder。

### 9A.5 建議 `rules.json` 範例

```json
{
  "schemaVersion": 1,
  "homepageUrl": "https://media.example.org/",
  "list": {
    "itemSelector": ".video-card",
    "title": {"selector": ".title", "extract": "text"},
    "url": {"selector": "a", "extract": "attribute", "attribute": "href"},
    "poster": {"selector": "img", "extract": "attribute", "attribute": "src"}
  },
  "search": {
    "method": "GET",
    "urlTemplate": "https://media.example.org/search?q={query}&page={page}",
    "pageStartsAt": 1
  },
  "pagination": {"type": "page-number", "parameter": "page"},
  "detail": {
    "title": {"selector": "h1", "extract": "text"},
    "media": {"selector": "video source", "extract": "attribute", "attribute": "src"}
  }
}
```

`urlTemplate` 只允許 `{query}`、`{page}` 等受控變數，必須 URL-encode；拼出網址後再比對 `https` scheme、host allowlist 與 redirect policy。不得宣稱能取得 DRM、MSE blob、跨來源 iframe 或需要特殊簽章的網站。

### 9A.6 本地資料包目錄及恢復

```text
<app-private-data>/kv-packages/
  trust-state.json                 # 已接受最高 sequence（原子寫入）
  catalog/current.envelope.json   # 最近成功驗證 metadata
  active.json                     # packageId -> active package version
  packages/site.example.catalog/
    versions/1.2.2/              # last known good
    versions/1.2.3/              # active immutable
    staging/<uuid>/              # 未驗證完整時不能啟用
  journals/                       # install, activate, rollback transaction
```

Android 置於 App 內部私有儲存；iOS 置於 App container/Application Support，**不得由使用者網頁直接寫入**。檔案權限、資料備份、資料保留、安全儲存策略以各平台實際 API 驗證。每次啟動檢查 journal，`staging` 過期可安全清理；`active` 指向不可變、驗證過的版本。

### 9A.7 資料包安裝狀態機

```text
NOT_INSTALLED -> DISCOVERED -> ELIGIBLE -> QUEUED -> DOWNLOADING
     -> DOWNLOADED -> HASH_VERIFIED -> SCHEMA_VERIFIED -> STAGED
     -> ACTIVATING -> ACTIVE -> (UPDATE_AVAILABLE | DISABLED)
                                 |                    |
                               FAILED              ROLLBACK
                                 |                    |
                    KEEP_LAST_KNOWN_GOOD <-----------+
```

更新中遇到錯誤不得讓已在播放中的影片中斷。採 `immutable package snapshot`，新任務使用新版本，既有解析工作持有舊 snapshot 直到完成。不得在任何 `FAILED` 狀態清空現有 active。

## 9B. 更新中繼資料、簽章、版本與伺服器契約（P0）

### 9B.1 雙層信任

第一層 `Release Catalog Envelope` 由固定在 App 內的 Ed25519 公鑰驗證；第二層下載的每個 `artifact` 再比對已驗證 catalog 的 SHA-256 與位元組大小。HTTPS 提供傳輸安全，但不取代 catalog signature。初始內建 trusted keys 僅隨原生 App 發布，可有多把 key 做輪替；若 key 受侵害，需走受控發版／撤銷機制，**不允許伺服器隨意替換 trust root**。

**簽署範圍避免 JSON canonicalization 問題**：在簽署時把嚴格 schema JSON 寫成固定 UTF-8 bytes（工具端 deterministic serialization），以 `base64(payload bytes)` 封裝，再對原始 payload bytes 做 Ed25519 簽章。客戶端只驗 envelope 上的 `payloadBase64` 解碼 bytes，**不得把 parse 後 JSON 再 serialize 才驗章**。

### 9B.2 Release envelope 範例

```json
{
  "format": "kv-signed-envelope-v1",
  "keyId": "release-key-2026-01",
  "payloadBase64": "<base64-encoded-json-bytes>",
  "signatureBase64": "<base64-ed25519-signature-over-payload-bytes>"
}
```

解碼後 `payload` 示意：

```json
{
  "schemaVersion": 1,
  "catalogSequence": 204,
  "generatedAt": "2026-10-14T00:00:00Z",
  "expiresAt": "2026-10-21T00:00:00Z",
  "distributionChannel": "android-sideload",
  "appUpdates": {
    "packageName": "com.kurain.video",
    "versionName": "2.0.1",
    "versionCode": 201,
    "variantId": "universal-release-v1",
    "full": {
      "url": "https://updates.example.org/releases/2.0.1/universal.apk",
      "size": 104857600,
      "sha256": "<64-hex-full-apk>"
    },
    "patches": [{
      "fromVersionCode": 200,
      "fromApkSha256": "<64-hex-old-apk>",
      "toVersionCode": 201,
      "toApkSha256": "<64-hex-full-apk>",
      "algorithm": "bsdiff-v1",
      "url": "https://updates.example.org/patches/200-to-201.patch",
      "size": 7340032,
      "sha256": "<64-hex-patch>"
    }]
  },
  "packages": [{
    "packageId": "site.example.catalog",
    "packageVersion": "1.2.3",
    "artifactUrl": "https://updates.example.org/packages/site.example.catalog/1.2.3.zip",
    "size": 8192,
    "sha256": "<64-hex-package>",
    "minCoreApi": 2,
    "channels": ["android-sideload"]
  }]
}
```

此範例 `example.org`、hash 與 versionCode 都是虛構；Codex 必須實作具體的範例產生器輸出真實 hash，不可把 placeholder 用於正式服務。`ios-appstore` catalog **不得出現可自行安裝的 App artifact**，只可包含合規資源包與 `storeVersion` 等提示資訊。

### 9B.3 API 路徑與靜態部署選擇

首版採 **靜態檔案發布 + HTTPS**，無須強制新建複雜後端，便於部署至 NAS / Nginx / Caddy；如需要登入／授權或後台管理才另開控制 API。所有範例以 `https://updates.example.org` 表示，現況 `http://nas.kurain.uk:8080` 不是目標的安全方案。

| Method / Path | 描述 | 必要條件 |
|---|---|---|
| `GET /v2/catalog/android-sideload/stable.json` | 已簽 envelope | HTTPS；Cache-Control/ETag；大小限制 |
| `GET /v2/catalog/android-play/stable.json` | 受限資料包 catalog | 不供 APK 自架更新 |
| `GET /v2/catalog/ios-appstore/stable.json` | iOS 合規資料 catalog | 不得包含 Android-only 成人／未授權來源 |
| `GET /v2/packages/{id}/{version}.zip` | 宣告式資料包 | 固定 digest/size，immutable |
| `GET /v2/releases/{version}/{variant}.apk` | 自架完整 APK | Android sideload only |
| `GET /v2/patches/{from}-{to}-{variant}.patch` | signed catalog reference 的差異檔 | Android sideload only |
| `GET /v2/health` | 可選靜態健康檢查 | 不帶秘密 |

支援 `If-None-Match`、`304`、合理 Cache-Control；**簽署 catalog 的到期日與 rollback sequence 要獨立驗證**，不能因 HTTPS + 304 就跳過校驗。下載 artifact 使用 Range/ETag/If-Range 可恢復時續傳；若無法續傳或 ETag 改變，刪 staging 重下，避免拼接錯檔。不要將憑證／Cookie 轉發給跨主機重導向。

### 9B.4 版本與 rollback 限制

- `catalogSequence` 同 channel 單調遞增，持久化 `highestAcceptedSequence`；同 sequence 只接受完全相同的 payload digest；更小 sequence 視為 rollback attack 並拒絕。
- Catalog `generatedAt` / `expiresAt` 以可信時間來源檢查；當裝置時鐘可能偏移，使用保守策略：**不要接受新不可信 catalog**，但已驗證舊 active 包照常使用。實作需測試大幅時鐘偏移。
- `appVersionCode`、`coreApi`、`packageSchemaVersion` 相互獨立；package 的 `min/max` 不合時不能啟用。先成功安裝新 App 再更新需要更高 core API 的 package。
- 允許 rollback 到**本機已驗證**的 last known good 資料包，不需重新信任舊網路 catalog；遠端發布 rollback 需人工指定新的、較高 sequence 正式重新發版。
- 所有 packages 需通過 `allowedChannels` 與本機 compile-time `AllowedSiteRegistry` 交集；`RemoteCatalog` 不得新增任何超出發佈政策的 native capabilities。

### 9B.5 發布工具（必須完整可執行）

建議實作 `tools/release/`：

```text
tools/release/
  build_catalog.py              # 讀 artifact metadata、驗 schema、產生 payload
  sign_catalog.py               # 使用外部私鑰簽署（只在發布端）
  verify_catalog.py             # CLI 本地驗證
  build_site_package.py         # 白名單 ZIP、digest、schema 驗證
  generate_delta.py             # old signed APK -> new signed APK（sideload）
  verify_delta.py               # 解 patch 並 byte-for-byte 比對新 APK
  publish_artifacts.py          # staging、atomic switch，dry-run
  release-config.example.yaml   # 非密鑰範例
  tests/                        # 正常／惡意／中斷 cases
```

密鑰不能進 Git、不能印在 logs；由本機受保護 key store、CI secret、硬體密鑰或專用 signer 注入。簽章私鑰和 Android APK 簽章是 **不同** key。所有部署動作支援 `--dry-run`、`--channel`、`--verify-only`、可復現清單和最終報告；未通過安全驗證不得 publish。

## 9C. Android Sideload 安全差異 APK 更新（P1）

### 9C.1 更新規則與前置限制

**差異更新只節省下載量，不是 APK 部分安裝。** Android 最後仍必須收到完整、簽章正確且可安裝的新版 APK；這個重新組裝在 App 的私有 staging 目錄完成，再交系統 Package Installer 並由使用者同意。禁止擅自替換 APK 裡的 zip entries 或使用 root 安裝。

Codex 首先盤點現有安裝形態：universal/single APK 或 split APK。僅當 `ApplicationInfo.sourceDir` 可讀、且該 bytes 的 SHA-256 與 patch 要求的舊 APK 完全一致，並且 `splitSourceDirs` 為空或明確支援所對應的完整 split 集合，才允許 delta。**首次 P1 只支援 single universal APK；split APK / AAB / Play 安裝直接使用對應平台策略，不做錯誤單檔 patch。**

### 9C.2 決策規則

```text
Sideload updater:
  catalog signed?                  NO -> reject, keep installed App
  channel=android-sideload?        NO -> reject
  versionCode > installed?         NO -> up-to-date/reject downgrade
  full APK exists & hash valid?    NO -> release invalid
  installed single APK?           NO -> use supported full delivery
  old SHA-256 matches patch base? NO -> download full APK
  patch tool available/space OK?  NO -> download full APK
  patch size < full*0.70?         NO -> download full APK
  patch download+SHA valid?       NO -> retry then full APK
  apply patch reconstructed hash? NO -> discard & full APK
  reconstructed APK signer valid? NO -> reject, no install
  package name / version OK?      NO -> reject
  USER approves package installer? YES -> handoff
```

`0.70` 是初期可設定的門檻，必須由實測成效調整。即使 patch 很小，磁碟不足、CPU／RAM 壓力或換電源環境也可能需要 full update 或延遲。不能在沒有完成實測時啟用 delta 到所有使用者。

### 9C.3 差異檔生成（伺服器）

1. **先完成正式 APK 簽章**，得到 old/new 兩個可安裝 artifact；對 **整個已簽署 APK 位元組** 做 binary diff，不能先 patch unsigned APK 再偷換簽章。
2. 用經安全審查的 `bsdiff` 實作或同等方案生成 patch，記錄 `fromApkSha256`、`toApkSha256`、`patchSha256`、`algorithm`、`variantId`、`size`。
3. 以 reference `bspatch(old, patch) -> reconstructed.apk`，驗證 `SHA256(reconstructed) == SHA256(new)` 且 byte-for-byte identical，測試能由 Android PackageInstaller 安裝同套件新 versionCode。
4. 基於實際 patch:size ratio 決定是否發布差異版本；發現 ratio 過高則只發布 full APK。建置要有 deterministic build / zip 檔案排列改善 patch 命中機會，但不能犧牲簽章或測試。
5. 允許支援最多 N 個熱用舊版（例 3 種）到最新版 patch，N 是發布政策，不保證所有舊版可 patch。不存在對應 patch 時用完整 APK。
6. 不要把 sideload 的 APK patch 放進 Play 版 artifact 或 App 內置 Play 版檢查 API。

### 9C.4 用戶端下載、組裝與安裝

1. `GET catalog` → signature verify → capability gating → 比對 versionCode/variant。
2. 預先評估空間：`reconstructed APK + patch staging + I/O buffer + 安全餘量`；若不足明確提示，不要損害既有快取。
3. 從 `ApplicationInfo.sourceDir` 經受控 File APIs 讀取已安裝 base APK；舊 bytes 摘要不合則回退完整包；不得信任任意使用者提供 old.apk 作為 patch base。
4. 支援下載中斷重啟與限制 Wi-Fi／行動數據；每項 artifact 單獨驗 size/hash，不在 UI 放出任意安裝 URL。
5. patch 套用應流式／限制記憶體，重建於 `filesDir/update-staging`（或空間足夠的 App 私有位置）；Android 低記憶體裝置作單獨測試。
6. 驗證 reconstructed output SHA、APK signer / certificate lineage（發布憑證白名單）、packageName `com.kurain.video`、target `versionCode`、`minSdk` 與安裝相容，再呈現使用者確認。
7. 用 `FileProvider`/`PackageInstaller` 正確授權，委託系統安裝。**安裝權限拒絕或取消時不視為成功**，可在 UI 再次操作。
8. 安裝完成後檢查實際 installed version（下次開啟或系統回調）；清除 staging 與過期 artifact。下載失敗時原 App 不變；已安裝新版本後的 rollback 必須走另一版更高 versionCode 或平台允許的正式機制，不承諾 Android 可任意降級已安裝 APK。

### 9C.5 更新狀態與錯誤碼

| 狀態 | 行為 |
|---|---|
| `CHECKING` | 拉取、驗簽 catalog |
| `NO_UPDATE` | 版本已最新 |
| `PATCH_ELIGIBLE` | 可下載小型 patch |
| `DOWNLOADING_PATCH` / `DOWNLOADING_FULL` | 可取消、顯示 bytes 和速率 |
| `VERIFYING` | hash/signature checks |
| `RECONSTRUCTING` | 顯示百分比或階段，不承諾耗時 |
| `READY_TO_INSTALL` | 提示版本、大小與權限 |
| `WAITING_USER_INSTALL` | 系統安裝 UI |
| `INSTALLED_CONFIRMED` | 確認實際版本後才標示成功 |
| `FALLBACK_FULL` | patch 不可用／失敗時改下載 full |
| `FAILED_RETRYABLE` | 網路、儲存等可重試 |
| `FAILED_SECURITY` | 驗章、簽章、降版、hash 問題，不可繞過 |

**安全錯誤不得自動降級安全檢查**。例如 metadata 簽章錯誤不能繼續取 full APK；只有 `patch bytes` 壞掉但可信 full APK 仍受簽署 catalog 保護，才允許 fallback full。

### 9C.6 實際測試矩陣

- 1.4.0→新版本單 APK、1.4.1→新版、無 patch 可用、不同 ABI/variant、Play/split 安裝、same version、不相容簽章。
- 以 4G 模擬斷線、斷點續傳、Wi-Fi 切換、空間不足、更新中殺死進程、更新中關機、系統安裝器取消、未知來源安裝權限拒絕。
- 下載內容遭竄改、可信 catalog 過期、sequence 倒退、patch base hash mismatch、patch hash mismatch、reconstructed APK hash mismatch、cert mismatch、artifact URL redirect 非 allowlist。
- 成功後 Android 使用者資料、Media3 下載、歷史、套件啟用、遠端資料與設定完全保留。

### 9C.7 舊版 1.4.0 -> v2 的可信更新導入

目前 `1.4.0 (118)` 的既有更新 client 並不知道新 Ed25519 公鑰、catalog sequence 或 delta patch。因此 **不可宣稱舊版可直接安全執行 v2 patch**。先發一個沿用原 package ID／簽章／完整 APK 格式的橋接版本（例如一個遞增的 versionCode，實際版本由 release manager 核定），在 APK 內內建新 trusted public keys 和 HTTPS client。舊版由系統 Package Installer 做簽章相容性檢查，使用者完成安裝後，才正式啟用 signed-catalog 與差異更新。舊 HTTP 管道有遭竄改、降級或阻斷風險，應提供使用者可檢查官方 TLS 下載頁與 APK release fingerprint 的替代遷移路徑，並在升級期間停止宣稱 HTTP metadata 可被信任。

此 bridge deployment 是發佈工作（含人工公告、正式 APK 簽名驗證、版本兼容），不是僅改 code 即完成；Phase 0 應先確認現有發布渠道和簽章歷史。若未完成橋接驗收，新客戶端維持原生完整更新流程，**不得自動進入不安全的 delta release**。

## 9D. 按需資源下載管理（Android + iOS，共通 UX）

### 9D.1 更新策略

設定預設值：`packages.autoUpdate=true`、`packages.wifiOnly=true`（可由使用者調整）、`packages.checkFrequency=24h`、`assets.downloadOnDemand=true`、`packages.keepPreviousVersions=1`、`packages.maxConcurrentDownloads=2`。這些是**建議預設**，不代表現有 App 已有。發版前須依裝置、網路和電量實測。

- 優先只檢查已安裝並啟用包；手動「檢查所有套件更新」才能納入其他可用來源。
- 開啟站點時若無本地規則包：顯示「需要下載資料包」與大小、權限及網路限制；不得自動在行動網路大量下載。
- 已安裝舊規則且新版本可下載時：先用舊規則，背景下載新版、校驗、下一個解析任務切換。
- 未啟用站點不可預載；封面圖片採 LRU 快取、不把照片當 executable package。
- App 版本落後使資料包不相容時：不強制下載不相容包；提示更新 App 或繼續使用已驗證舊包。

### 9D.2 配額與垃圾回收

建議初期可配置：每個站點規則包 max 5MB ZIP、解壓上限 20MB、檔案數上限 100、單檔 max 8MB、static assets 全域配額 300MB。這是**工程初始上限，需要實際測試調整**。清理順序為無引用的 staging → 過期多餘版本 → LRU cache；**永不自動刪除使用者影片、Media3 Download Index、已下載成品或目前 active 資料包**。

### 9D.3 UI 畫面與操作

```text
設定 > 更新與模組
  [App 版本]         Android sideload / Android Play / iOS App Store
  [檢查 App 更新]    展示對應發布渠道；不可混用
  [可用資料包更新]   2 個 / 只有已啟用的資料包
  [立即檢查] [全部更新已啟用資料包]
  [僅 Wi-Fi 自動下載] [自動更新站點規則]
  [套件列表] [下載與儲存空間] [更新紀錄]

套件詳情
  名稱、版本、安裝大小、schema/core compatibility
  更新內容摘要、權利/來源標籤、最後更新時間
  [啟用/停用] [更新] [保留上一版時回滾]

更新工作
  App 更新: 下載 patch 6MB / 完整包 100MB（實際數字）
  驗證中 / 重建中 / 等待系統安裝 / 失敗回退完整包
  套件更新: 下載中 / 驗章中 / 啟用中 / 已完成 / 回滾
```

對 Android 既有「設定」「套件」「下載」頁做最小擴充；不要在原 Android UI 大重寫前新增整套重複導航。iOS 可在 SwiftUI `Settings`、`Extensions` 共用資訊架構但符合 iOS 樣式。

### 9D.4 使用者通知與事件

- 手動 App 檢查結果、失敗時顯示精確原因：`NETWORK`, `LOW_SPACE`, `UNTRUSTED_CATALOG`, `INCOMPATIBLE_CORE`, `PATCH_BASE_MISMATCH`, `INSTALL_CANCELLED`。
- 原生 App 更新不能背景默默安裝；資料包則在設定允許、更新已簽署且通過驗證後可原子啟用。
- 大量下載遵守網路偏好。節省流量顯示需由實際 bytes 計算，例如：`本次下載 7.1MB，對比完整包 105MB 節省 93.2%`；無可比數據則不顯示。
- Telemetry 初版可不連雲，先把非敏感更新結果存在本地 debug 頁；記錄 `catalogSequence`, `packageId`、錯誤碼及耗時，不含 URL query token、Cookie、密碼或私人網站瀏覽清單。

## 9E. iOS App Store 交付與資源模組（P0/P2）

### 9E.1 原生 App 發布策略

- `SwiftUI UI`、`AVPlayer Adapter`、`WKWebView`、`Rust static libraries`、授權處理與下載控制器隨每次原生 App 發版；使用者由 App Store / TestFlight 安裝更新。可在設定呈現新版本提示與商店跳轉，但不得提供安裝 APK、補丁二進位替換或獨立 native code hot swap。
- iOS 來源 catalog 維護獨立 `ios-appstore`；套件白名單以**編譯時預置**政策做交集控制。伺服器不能以包更新讓 App 新增不符審核或未授權內容。必要時連 source adapter 的程式碼／UI entry 都從 release build 移除。
- 外部影片下載功能必須取得對應來源授權，且應保留合規證據；對不符 Apple App Review 5.2.3 的來源，下載選項不可用。
- 如目標發佈平台、App Store 之外的合法替代發佈方案日後改變，另做獨立 ADR 和政策審查，不改寫這個 App Store baseline。

### 9E.2 小型資料包

- 使用共用 `kurain-package` 驗簽下載 JSON ZIP，但 Swift 層透過 `URLSession`/本地安全檔案 API，並尊重 `allowedChannels`、平台 content policy、`CoreApi`。
- 主要動作 `checkUpdates()`、`installPackage()`、`activate()`、`rollback()` 需具可靠回調、取消和 UI 錯誤顯示。
- 不能從 ZIP 直接執行 JS/Wasm/Swift code；也不能把「CSS selector 可更新」當成所有網站解析行為無條件可更新。

### 9E.3 大型靜態資源（P2，非第一版阻擋）

- iOS 26+ 研究 **Managed Background Assets**（依 Xcode 可用 framework、OS availability、設定與 Apple-Hosted 或 self-hosted 需求選型）；在被要求下載的圖片／模型／大型靜態資源才考慮。
- iOS 16–25 的通用 fallback：`URLSession` 經簽署 manifest 下載、hash 驗證、原子快取；不依賴 deprecated On-Demand Resources。
- App Store 的 app thinning 與差異發送是平台管理，**不要在 App 上顯示自行計算的 IPA patch** 或承諾 App Store 更新一定節省多少 MB。
- 防止 App asset 與自家 catalog asset 的儲存配額互相混淆；統計已下載 asset bytes、cache bytes、失敗與退回行為。

### 9E.4 iOS 功能差異與資料保護

| 功能 | iOS 第一版狀態 | 實作限制 |
|---|---|---|
| 本機檔案播放 | P0 | Files picker、security-scoped resource，AVPlayer |
| HTTP/HTTPS、HLS | P0 | AVPlayer、HTTPS、網路例外須明確審核 |
| WKWebView 來源偵測 | P0 有條件 | 允許的 DOM、同源資源觀測、有限 JS；不突破跨來源/DRM |
| 站點規則包 | P0 | 只允許已批准資料型套件 |
| HTTP/WebDAV | P1 | 已驗證權限及安全 URL；Range seek |
| 下載普通檔案 | P1 | URLSession 背景能力受系統管理 |
| HLS 離線 | P1 | AVAssetDownloadURLSession 適用情況 |
| DASH/RTSP | P2 / not promised | 依 AVPlayer 支援度和額外方案評估 |
| SMB/SFTP/FTP | P2 / not promised | 協定權限、認證及實體 NAS 測試 |
| P2P/磁力 | 不列 iOS v2 首發 | 發布審查、網路及依賴風險 |

無法支援項目應顯示 `NOT_SUPPORTED_ON_THIS_PLATFORM`，而不是空白、崩潰或無限 loading。

## 9F. 安全威脅模型與合規閘門（跨平台 P0）

### 9F.1 信任邊界

```text
Internet / web pages / public CDN (untrusted)
              |
         HTTPS + redirect policy
              |
  Signed Catalog & ArtifactVerifier (trusted public key)
              |
    Schema/size/path/host/capability gate
              |
  Private staging -> immutable installed data package
              |
  Platform-approved adapters / UX / playback

  Never: Catalog -> dynamic native code loader
  Never: Rules  -> arbitrary network/credential/file access
```

### 9F.2 必要威脅及對策

| 威脅 | 對策 | 驗收 |
|---|---|---|
| 中間人篡改 catalog | HTTPS + Ed25519 envelope | 改 1 byte 必拒絕 |
| 伺服器回退舊 catalog | Highest sequence monotonic | 舊序列必拒絕 |
| 合法簽章但包不相容 | channel/schema/core/capability 交集 | 不安裝且舊版保留 |
| ZIP slip / zip bomb | 白名單、路徑正規化、總大小/比率/檔數上限 | 惡意 fixture 全部拒絕 |
| 任意站點向內網發請求 | allowedHosts + scheme/redirect/DNS/IP 安全策略 | 阻擋 local/private/metadata endpoint，除非已授權的遠端 NAS 流程 |
| 文件規則讀取憑證 | SecretHandle scope 分離，不把 cookie/token 暴露到 DSL | 資料包無憑證讀取 API |
| 未審核成人/受限來源在 iOS 出現 | 編譯時政策 + server allowedChannels 交集 | iOS 測試必失敗阻擋 |
| 重建 APK 非預期簽章 | 最終 APK hash + 簽章檢查 + OS installer | 不交付給安裝器 |
| 暫存下載滲入使用者影片 | 獨立儲存 namespace / GC policy | 下載索引及媒體不變 |
| App crash during apply | journal + atomic active pointer + last-good | 重啟仍能用舊規則 |
| 日誌敏感資訊 | structured/redacted logging | 測試檢查 token/cookie 不可出現 |
| 時鐘大幅偏移 / catalog 過期 | conservative reject new, use local good | 可離線啟動 |

**自架發布** 建議部署端 TLS、反向代理、HTTP→HTTPS redirect（注意舊 client 的過渡相容）；客戶端不可透過 HTTP 拿第一次 trust key。目標簽章策略及 key rotation procedure 必須在 ADR 記錄、由 release pipeline 測試。

### 9F.3 發布資格 Gate

- 每個來源 package 發布前擁有 `rightsReference`／書面批准或明確自有內容來源記錄；發布腳本拒絕 `UNKNOWN`／`UNVERIFIED` 的權利狀態。
- iOS App Store release catalog 的測試 fixture 必須保證：不含 explicit adult-source modules、不含任意原生 loader/腳本、不含不授權下載行為、不以更新改動原生核心功能。
- Android sideload / Play 亦應遵守當地法律、媒體授權與發佈政策；Android 有能力不代表一定合法或可上架。
- 移動平台提供的網頁播放器使用者自己造訪網站，仍不代表有權繞過 DRM、受限制內容、重用其他 App 的 session 或下載未授權內容。

## 10. 測試策略與驗收矩陣

### 10.1 必備自動化測試

**Rust**

- Unit：URL/MIME 分類、HTML 候選、HLS URI、去重、排序、重試策略、錯誤碼、platform capability。
- Fixture：本機 HTML、HLS、JSON、多語標題、無副檔名可辨來源、空列表、授權要求、錯誤 response。
- Security：malformed URL、跨主機 redirect、Cookie 泄漏、敏感 log redaction、HTTP range 行為。
- FFI smoke：Rust build／binding generate／Kotlin smoke／Swift smoke（可用時）。

**Android**

- 跑既有測試；加 SourceResolverFacade 的舊／新分支測試。
- Media3 legacy 播放不退化：HLS、DASH、RTSP、Seek、返回、歷史。
- v1.4.0 → v2.0 更新測試：播放歷史、遠端設定、下載 index、更新 API。
- `rust_core_enabled=false` 在 Rust lib 加載失敗時有可靠 fallback（視編譯配置）；不崩潰。

**iOS**

- ViewModel/mock services：五頁導航、空／錯誤／載入狀態、歷史／續播。
- WKWebView fixture：使用者手動偵測、候選上限、重載清理、來源被替換時舊結果丟棄。
- AVPlayer：本地、HTTP Progressive、HLS、Seek、返回、播放失敗與 session 中斷。
- Background：一般檔案下載及恢復；HLS 下載另按 P1 實測。

### 10.2 驗收案例（必要最小集）

| ID | 項目 | 期待結果 | 時點 |
|---|---|---|---|
| A-001 | 原 Android 1.4.0 回歸 | 原有 UI 主要操作仍能用，測試不退化 | Phase 0 / 4 / 9 |
| R-001 | Rust 工作區 | `cargo fmt --check`, `cargo clippy`, `cargo test` 正常 | Phase 3 |
| F-001 | Kotlin 綁定 | Android 能呼叫 Rust `coreVersion()` 並解析 fixture | Phase 3 |
| F-002 | Swift 綁定 | Xcode 真正連結 Rust 並呼叫同一 API | Phase 6 |
| S-001 | 候選上限 | >100 候選不超過 100、結果穩定 | Phase 4 |
| S-002 | HTML／HLS 解析 | fixture 結果、相對 URI 與 MIME 正確 | Phase 3/4 |
| S-003 | 網頁跳轉 | 舊 snapshot 不可覆蓋新頁候選 | Phase 6 |
| S-004 | 來源錯誤 | auth/timeout/empty page 各自區分 | Phase 3/4 |
| P-001 | Android 播放 | MP4/HLS/DASH/RTSP 的現有路徑保持 | Phase 4 |
| P-002 | iOS 播放 | 本地、HTTP MP4、HLS 的 Seek 和返回可用 | Phase 6 |
| P-003 | 非 iOS 格式 | DASH/RTSP 初版顯示 Unsupported 不崩潰 | Phase 6 |
| H-001 | 歷史 | 最多50筆；小於5秒／結尾前5秒歸零 | Phase 4/6 |
| D-001 | Android 下載 | 既有 index 檔案仍在，可續傳／播放 | Phase 4 |
| D-002 | iOS 檔案下載 | 排隊、完成、離線重播／錯誤正確 | Phase 7 |
| N-001 | WebDAV | 目錄／Range／Seek 在 fixture server 可用 | Phase 7 |
| N-002 | SFTP 安全 | 已知主機 key 改變即拒絕 | Phase 7/9 |
| SEC-001 | 認證資訊 | log、歷史、下載索引不得有明文密碼/私密 header | 每 Phase |
| REL-001 | Rust 失敗 | Android 可關閉旗標回舊行為 | Phase 4 |
| IOS-001 | 發布配置 | 未授權/成人來源不在 App Store build | Phase 6 |

### 10.3 結果回報格式

每個 Phase 的 `PHASE_STATUS.md` 至少列：

```text
- Date:
- Phase:
- Git branch / commit:
- Scope completed:
- Modified files:
- Commands executed:
- Pass / Fail / Blocked:
- Test evidence:
- Compatibility changed:
- Security note:
- Outstanding issues:
- Rollback instruction:
- Next phase gate:
```

`未執行` 一律填 `NOT_VERIFIED`，不以「理論上可以」取代執行紀錄。

---


### 10.4 新增測試：模組／資料包／差異更新（P0/P1）

**Rust 單元測試（必須自動化）**：JSON schema good/bad、min/max CoreApi、channel/capability matrix、CSS/URL extractor allowed vs rejected、URL encoding/allowlisted redirects、Ed25519 verified/modified/key id unknown、digest mismatch、包文件大小與 path traversal、空間不足、斷電時 journal 恢復、sequence replay、兩個 concurrent updates、啟用時仍在解析的舊 snapshot。

**Android instrumented E2E**：測試既有五分頁、MediaStore/SAF、播放歷史、遠端 HTTP Range、Media3 下載、WebView 候選、現有 sites（合法本地 test fixture）、更新顯示；sideload 單 APK delta reconstruct → 系統 installer，可取消、可授權、可 fallback full；Play 版有無自架 updater 類與權限的 binary-level 檢查。

**iOS XCTest/UI**：Swift/Rust FFI、五頁導航、本機 URL/文件權限、HTTP/HLS、網頁 snapshot 有效與跨域限制、合法 catalog 套件下載與 rollback、關閉 app/重新進入背景 session reconciliation、core mismatch、不合規 package 無法顯示。

**發布工具測試**：old/new APK signed artifact byte-equality、基礎 APK hash wrong、target certificate wrong、發版 metadata digest mismatch、未知 signing key、過期 catalog、sequence 回退、失敗部署不覆蓋 stable manifest、CDN cache 不一致。

### 10.5 性能與流量指標（測試目標，非現況測得）

| 指標 | 建議初始目標 | 說明 |
|---|---|---|
| package update 接收惡意輸入 | 0 bypass | 安全必須硬 Gate |
| 資料包更新中 crash 後可恢復 | 100% fixture cases | last-known-good 可開啟 |
| Android APK reconstruction | byte-identical + signer verified | 不可只比較檔案大小 |
| APK delta 傳輸節省 | 以實際成效呈現 | ratio 70% 門檻是設計建議 |
| module install 完整性 | 100% 驗章與 hash | 不以下載成功視為安裝成功 |
| App 更新保留使用者下載與歷史 | 100% 已覆蓋 test cases | 重點資料不能流失 |
| 安裝中低儲存裝置 | 安全失敗、不損資料 | 不要求每次都成功 |
| iOS 有受限來源 | 0 iOS App Store release | compile-time+runtime policy |
| Rust/Kotlin parity | fixture 金樣本相同或明確解釋 | migration gate |

### 10.6 跨版本相容測試組合

| App | Catalog | Site package | 預期 |
|---|---|---|---|
| Android v1.4.0 | 舊 HTTP update API | 既有 Kotlin plugins | 原功能維持，先不自動下載 v2 包 |
| Android v2.0.0 sideload | v2 signed catalog | schema 1 / CoreApi 2 | 更新並可 rollback |
| Android v2.0.0 Play | play catalog | schema 1 / CoreApi 2 | 只接受資料包，原生走商店 |
| iOS v2.0.0 App Store | ios catalog | ios allowed only | 合規資源更新 |
| 舊 CoreApi | 新 minCoreApi 3 package | 任意 | 提示 App 更新，維持舊包 |
| 任何 | 篡改/過期 catalog | 任意 | 不覆寫 active，不當成功 |
| Android sideload split APK | full manifest 提供 universal APK | 任意 | 不可誤 patch 單 base APK |

## 11. Codex 分階段執行計畫（原 Phase 0–9，桌面 Phase 10–14 見第 28 章）

### 階段規則

`P0 = 核心交付`、`P1 = 正式功能/跨平台可用`、`P2 = 進階擴充`。每個 Phase 只能在前一 Phase Gate 已通過或明確存在互不阻擋且可測試的替代時開始。每個 Phase 須在 `docs/cross-platform/PHASE-XX-REPORT.md` 寫 `DONE / BLOCKED_ENV / NOT_VERIFIED`、command、exit code、測試報告、變更檔案、風險、fallback。

### Phase 0 — Repo / 測試 / 更新環境盤點（P0）

**目標**：確認 Android as-built、原本跨平台規格差異、現有更新 URL、APK 發布形式與可在現有機器建置的工具。

**程式／文件交付**：
- 產生 `docs/cross-platform/BASELINE.md`：Gradle 模組、Manifest、版本與 SDK、Android package、簽章策略（不記私鑰）、WebView、site adapters、原生播放器、下載、遠端、重要 preference keys。
- 產生 `docs/cross-platform/INVENTORY.csv`：每個 As-built 功能目前入口、測試、平台分工、migration risk、owner。
- 產生 `docs/cross-platform/DISTRIBUTION.md`：現有更新主機 HTTP、是否可升 HTTPS、單一/分割 APK、ABI、versionCode、簽章/發布流程可用性。
- 建立保護性 regression 測試及 build commands；建立 ADR 與 feature flags 表。

**Gate**：既有 Android baseline 可建、測試可重現；若環境缺失明確報告；不得先刪 Android 功能。

### Phase 1 — Release 信任根與靜態發布協定（P0）

**實作**：`kurain-update-protocol`、Ed25519 signed envelope/metadata、artifact SHA256/大小／channel/sequence、`tools/release` 產生與驗證 release artifacts、mock HTTPS catalog fixture。加入 `android-sideload`/`android-play`/`ios-appstore` channel matrix。

**Gate**：篡改 catalog、未知 key、重播較舊 sequence、metadata schema 不合、取消/超時全部拒絕且不破壞 App。能用本機 fixture 完成 `build → sign → verify`；私鑰不在 repo。

### Phase 2 — Rust 宣告式資料包 + 安全安裝（P0）

**實作**：`kurain-package`、JSON Schema、受限 rules engine、zip path & size checks、PackageRegistry、staging + atomic activate + last known good、version/schema/core/channel/capabilities gates、mock catalog。加入 small clean public fixture package。

**Gate**：能離線啟動 embedded catalog；單站點只下載資料包；更新失敗仍可讀取舊版；惡意 ZIP/未知 operator 被拒絕；無 executor / code loader。

### Phase 3 — Rust Shared Core + UniFFI Kotlin/Swift vertical slice（P0）

**實作**：原 v2.0 Rust `kurain-core/parser/sources/network/remote/download/ffi` 可先 minimal slice；輸出 Kotlin/Swift bindings；一條真實 public fixture catalog → Rust extractor → data model → Android Kotlin UI 的端對端流程；iOS 的 compile/test 在 macOS 條件允許時驗證。

**Gate**：Rust fmt/clippy/test PASS、Android build PASS、FFI call PASS、雙語言 schema contract version test；不重寫播放器、不引入未授權站點。

### Phase 4 — Android 既有站點／功能非破壞性遷移（P0）

**實作**：Android `PackageUpdateRepository`、legacy adapter、feature flags、設定與套件頁更新入口、啟用已安裝資料包、保留原 Kotlin source adapter。移轉一個由 mock/public fixture 可驗證的合法來源；保留套件啟用狀態、播放紀錄、遠端設定、Media3 Download Index。

**Gate**：Android 五分頁、Seek/手勢、下載、遠端功能 regression 不退化；kill-switch 可切回 legacy；站點解析 parity golden tests。

### Phase 5 — Android sideload 安全原生差異更新（P1）

**先完成**：`HTTP→HTTPS` 的發布路徑、正式 signed catalog verification、單 universal APK 發布與簽章相容策略。若無 HTTPS 與正式簽章測試，保持目前 full APK 行為並標記 BLOCKED_SECURITY，**不可把不安全 delta 標完成**。

**實作**：old/new signed APK delta publisher、reconstruction CLI、Android patch downloader/patch runner、installed base hash 檢查、final APK verification、full fallback、系統 installer、設定頁進度、舊下載 state recovery。

**Gate**：在兩個真實已簽署測試 APK 之間修補成功、reconstructed == target bytes、低儲存與中斷安全失敗、安裝取消/權限拒絕正確顯示、Android 全資料保留、split/Play 不適用 delta。並出具實際 bytes saved report。

### Phase 6 — iOS SwiftUI MVP（P1）

**實作**：Xcode 工程、Rust XCFramework 或 static lib bindings、五分頁、本機 Files、HTTP/HLS AVPlayer、WKWebView、history、已批准的 site package 安裝/回滾、合法下載入口與 Store 更新提示。

**Gate**：Simulator 與可用 iPhone 的測試、僅允許 iOS allowlist 來源、最低 iOS 相容驗證、無原生程式碼熱更新、沒有 Android sideload route。若無 macOS，提交可重現的 Xcode 工程／腳本並標記未執行 Apple 編譯。

### Phase 7 — 遠端 / 背景下載進階整合（P1）

**實作**：HTTP/WebDAV 共用接口在 iOS 的 adapter，URLSession background、AVAssetDownloadURLSession（適用且來源有權使用）、播放紀錄、offline retrieval；Android 原有 SMB/FTP/SFTP 行為保持。下載系統統一狀態模型，不共用平台背景服務的內部任務。

**Gate**：HTTP Range/Seek、認證、重新導向保護、背景恢復、重試、低儲存、下載 metadata 一致；針對 SMB/SFTP 沒有 E2E 不可宣稱跨平台 ready。

### Phase 8 — Play Feature Delivery / iOS 大型 Background Assets（P2，可延後）

**前置**：Play 發佈環境與 App Store 身分已具備；先量測 App 是否真的有足夠大的可選功能/asset。

**實作**：視收益將某些符合發布政策的 Android Play 功能改成 `dynamicFeature`，自架 Android 不模擬 Play 模組；iOS 26+ 背景大型資源包採 availability gate，較舊 iOS 仍使用 URLSession 靜態資源下載。

**Gate**：商店通道正確下載／安裝／恢復，與自架 catalog 不互相混用；不導入任意 executable package。

### Phase 9 — 安全／效能／正式發佈品質（P0 for launch）

**實作**：整體 CI、依賴授權與 SBOM、原始碼 secret scan、asset size baseline、release scripts、實體裝置矩陣、NAS 部署手冊、開發者與使用者更新文件、fault-injection 與資料遷移工具。

**Gate**：全部 P0/P1 適用項目有 PASS 或清楚阻擋證據；release signing verification、合法內容來源證據、Android 自架/Play/iOS 發布審核 checklist、回滾與 emergency disable 演練完成。

### 工作項目追蹤清單（可直接建立 Issue）

| Issue | Phase | 優先級 | 簡述 | 驗收 |
|---|---|---|---|---|
| KV-001 | 0 | P0 | 建置與資料 baseline | 報告 + tests |
| KV-002 | 0 | P0 | Distribution channel/flavor inventory | channel ADR |
| KV-003 | 1 | P0 | Ed25519 envelope schema | signature tests |
| KV-004 | 1 | P0 | Signed catalog publisher | build-sign-verify |
| KV-005 | 1 | P0 | Catalog sequence+expiry store | replay tests |
| KV-006 | 2 | P0 | Declarative rules JSON Schema | fixtures |
| KV-007 | 2 | P0 | Safe ZIP package installer | attack tests |
| KV-008 | 2 | P0 | Active pointer & rollback journal | crash tests |
| KV-009 | 3 | P0 | Rust workspace core/ffi | build + contracts |
| KV-010 | 3 | P0 | Android single source Rust adapter | parity |
| KV-011 | 4 | P0 | Extension update UI | Android UI tests |
| KV-012 | 4 | P0 | Legacy source fallback | kill-switch |
| KV-013 | 4 | P0 | Data migration preserving history | regression |
| KV-014 | 5 | P1 | HTTPS update origin migration | TLS and signed metadata |
| KV-015 | 5 | P1 | signed APK binary diff publisher | byte equality |
| KV-016 | 5 | P1 | client patch decision + reconstruct | E2E on device |
| KV-017 | 5 | P1 | APK full fallback + installer UI | fault matrix |
| KV-018 | 6 | P1 | iOS Xcode + Rust bindings | Xcode build |
| KV-019 | 6 | P1 | iOS five pages + AVPlayer | simulator+device |
| KV-020 | 6 | P1 | iOS allowed site packages | iOS policy tests |
| KV-021 | 7 | P1 | Remote HTTP/WebDAV adapters | seek tests |
| KV-022 | 7 | P1 | iOS background/offline download | system lifecycle tests |
| KV-023 | 8 | P2 | Play feature delivery experiment | Play test delivery |
| KV-024 | 8 | P2 | Background Assets experiment | iOS 26+ test |
| KV-025 | 9 | P0 | Multi-platform release checklist | release gate |

## 12. 實際專案目錄與建置／CI 規格（重整版）

### 12.1 不搬動現有 Android App 的目標目錄

```text
KurainVideo/
├── app/                                  # 既有 Android App，位置保留
│   └── src/main/java/com/kurain/video/  # 漸進式新增 adapters
├── build.gradle.kts                      # 保留原檔，依 Phase 0 判斷改動
├── settings.gradle.kts
├── gradle/                               # 原設定保留
├── rust/
│   ├── Cargo.toml
│   ├── Cargo.lock
│   ├── rust-toolchain.toml
│   └── crates/
│       ├── kurain-core/
│       ├── kurain-parser/
│       ├── kurain-sources/
│       ├── kurain-network/
│       ├── kurain-remote/
│       ├── kurain-download/
│       ├── kurain-package/               # 新增可更新資料包核心
│       ├── kurain-update-protocol/       # 新增純驗證與選擇策略
│       └── kurain-ffi/
├── ios/
│   ├── KurainVideo.xcodeproj/             # 或經 ADR 選擇的生成方式
│   ├── KurainVideo/
│   │   ├── App/
│   │   ├── Features/{Local,Web,Extensions,Downloads,Settings}/
│   │   ├── Player/                        # AVPlayer
│   │   ├── Web/                           # WKWebView
│   │   ├── Storage/                       # Keychain, sandbox
│   │   ├── Updates/                       # signed site packages only
│   │   └── Adapters/                      # Rust FFI
│   └── KurainVideoTests/
├── shared/
│   ├── schemas/                           # package, envelope, media contract
│   ├── web-scripts/                       # bundled, NOT remote-updatable code
│   ├── embedded-catalog/
│   ├── fixtures/                           # legal synthetic/public tests
│   └── policy/
│       ├── android-sideload-allowlist.json
│       ├── android-play-allowlist.json
│       └── ios-appstore-allowlist.json
├── distribution/
│   ├── catalog-examples/
│   ├── package-examples/
│   ├── nginx.example.conf
│   └── README.md
├── tools/
│   ├── release/                           # signed publisher, delta tool
│   ├── build-android.sh
│   ├── build-ios.sh
│   └── verify-release.sh
├── docs/cross-platform/
│   ├── BASELINE.md
│   ├── INVENTORY.csv
│   ├── DISTRIBUTION.md
│   ├── DECISIONS.md
│   ├── SECURITY.md
│   ├── PACKAGE-SCHEMA.md
│   ├── UPDATE-PROTOCOL.md
│   ├── DEPLOYMENT.md
│   ├── MIGRATION.md
│   ├── TEST-MATRIX.md
│   └── PHASE-00-REPORT.md ... PHASE-09-REPORT.md
├── desktop/                            # Tauri2/React TS/MPV Adapter（完整結構見 26.1）
└── KurainVideo-v2.1-CODEX-SPEC.md       # 本規格放在根目錄
```

不要把目前 Android 專案強制移到 `android/`，除非完成遷移理由／全 build parity／回滾方案並明確另行批准。

### 12.2 本地工具與最低檢查命令（依實際 repo 調整）

```bash
# Rust core test (Windows/macOS/Linux)
cd rust
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace

# Android -- Windows 可用 gradlew.bat，Linux/macOS ./gradlew
./gradlew :app:assembleDebug
./gradlew :app:testDebugUnitTest

# 發布工具的 sample build-test-verify（具體 option 需由 Codex 實作）
python tools/release/build_site_package.py --input shared/fixtures/sample-site --output build/sample.zip
python tools/release/verify_catalog.py --file build/catalog.signed.json --public-key-file build/test_public_key.pem
python tools/release/verify_delta.py --old build/old.apk --new build/new.apk --patch build/update.patch

# iOS 必須在 macOS + Xcode 執行；先 xcodebuild -list 後決定 scheme
xcodebuild -list -project ios/KurainVideo.xcodeproj
```

**注意**：範例指令中 Android task 名與新 tools 參數是預定 CLI 契約，Codex 應實作相對應指令並依實際 Gradle configuration 產生可運行版本。無正式 key 時只可用測試公私鑰進行本地測試，測試私鑰不得被 App release 信任。

### 12.3 CI workflow（桌面 Windows/mac CI 增項見第 26.3 章）

- `rust-checks`: fmt, clippy, test, schema/FFI tests, fuzz nightly optional。
- `android-regression`: 現有 unit/instrumentation（有 emulator 時）、sideload/play build flavors、Play build 靜態掃描不得包含 sideload updater。
- `release-fixtures`: 生成示例 catalog→簽署→驗證→包安裝→rollback simulation；生成 old/new 測試 APK patch、byte-equality，惡意 payload、APK cert mismatch 測試。
- `ios-build`: macOS runner + pinned Xcode：Swift compile, simulator tests, XCFramework link, channel-policy tests；可用的實體設備測試另記錄。
- `audit`: cargo audit 或等價方式、dependency/SBOM、license review、secret scanning、第三方 source 授權記錄、HTTPS headers check。
- `deployment`: `build -> staging artifacts -> verify integrity -> sign catalog -> staging catalog -> smoke test -> promote stable atomically`。禁止直接改寫已簽署 immutable artifact path。

### 12.4 發布與退回運維

- 每次發版記錄 Channel、Build、versionName/versionCode、variant、coreApi、schema、catalogSequence、signing keyId、完整 APK sha、patch tuple、package list，並保留可核對的 hash 清單。
- `stable` manifest 是最後 promote，之前所有 artifacts 先上傳 immutable path 且通過 smoke test。
- 如果站點包造成解析錯誤：發布較高 `catalogSequence` 的 disable package policy 或新已驗證包，local last-good rollback；不遠端刪原生 App。
- 如果原生 App 有錯：對 sideload 發布修正 App 版（versionCode 升高）或停止提示升級；**不得指望把較舊 versionCode 直接降級安裝**。
- 如果 release key compromised：停止新 catalog 更新、撤回服務端發版權限、用原生 App 更新可信 root／啟用 key rotation rescue plan。不要讓客戶端無驗證接受新 root。

## 13. Definition of Done：不可模糊的完成標準

**功能完整**：Android as-built 既有產品操作無回歸；iOS 指定 MVP P0 功能可用；Rust Core/FFI 無空殼；資料包安裝、更新、回滾全鏈路可測。

**流量節省**：至少有 `站點規則獨立更新` 和 `Android sideload 在符合條件時 delta / 不符合時 full fallback` 的可重現數據；不能宣稱所有更新都只下載小包。

**安全完整**：signed catalog、artifact hash、schema/path/size limits、channel/allowlist、replay/expiry、APK signer、iOS App Store policy gate 全部有負面測試。

**維護完整**：逐 Phase report、README、腳本可執行、版本相容矩陣、release steps、失敗清理、emergency stop、Android/Ios 核心功能差異表。

**發布完整**：`BLOCKED_ENV` 與 `NOT_VERIFIED` 項目必須標示，不准把有程式碼但未測試的 SMB/SFTP、iOS 背景下載、Play dynamic feature、iOS Background Assets 標作 DONE。

### 13.1 一律視為「未完成」的情況

- 只新增資料夾與介面，沒有一條 Kotlin→Rust→Ui 的真實成功路徑。
- 只在文件寫「熱更新」，實際仍每次下載 APK 或下載 executable `.so` / `.dex`。
- 下載 patch 後略過 SHA、簽章或錯誤 fallback。
- 宣告式包可執行任意 JS、shell 或讀取任意站點 Cookie。
- iOS build 中僅把不允許的來源藏在遠端 feature flag，但可隨 server catalog 啟用。
- 站點規則失敗就清除原 active 包，或安裝前清空播放歷史、下載索引。
- 沒有 macOS / 真實 APK signed artifacts 卻宣稱 iOS/iPhone 或 delta 完成 E2E。

## 14. 風險與應對（整理為實作門檻）

| 風險 | 影響 | 對策 | 必須於何階段阻擋 |
|---|---|---|---|
| Rust FFI ABI / Swift 6 Sendable | iOS 編譯失敗 | pinned versions、簡化 FFI DTO、macOS CI | 3/6 |
| Android single vs split APK | patch 產出不可安裝 | single universal only in MVP，hash+variant match | 0/5 |
| 自架目前使用 HTTP | manifest/APK 可被替換 | HTTPS + Ed25519 trusted metadata + sha/cert | 1/5 |
| Android 簽名策略未知 | 更新覆蓋安裝失敗 | 查 cert lineage，測試同簽章升級 | 0/5 |
| 站點規則內容能力過大 | 遠端包成任意程式碼 | DSL allowlist & schema gate | 2 |
| 第三方來源版權/上架政策 | App 下架或侵權 | iOS compile-time policy, rights attestation | 0/6/9 |
| 站點特殊簽章或反爬 | JSON 無法涵蓋 | 保留 native legacy adapter，不繞過控制 | 4 |
| 更新期間被系統終止 | 失效/損壞 | immutable staging + journal + last-good | 2/5 |
| data model 重新設計 | Android user data 丟失 | additive migration + rollback + backup tests | 0/4 |
| iOS 背景下載時機 | 不可預測 | URLSession background，無長駐工作保證 | 7 |
| iOS Background Assets 版本差異 | 低版 iOS 不可用 | conditional availability + URLSession fallback | 8 |
| NAS 容量與 CDN caching | 用戶下載錯 patch | immutable hashed artifacts + atomic catalog promotion | 1/5 |
| bsdiff 記憶體占用 | 低階手機 OOM | patched stream/limits/full fallback | 5 |
| Source drift (As-built≠repo) | 開發重複/衝突 | Phase 0 inventory 優先 | 0 |

## 15. 可直接貼給 Codex 的開發指令（分回合）

### 15.1 第一回合：建立安全基線、發布協定與資料包架構

```text
你現在負責 Kurain Video v2.0 Android/iOS/Rust 跨平台模組化開發。
請先完整閱讀專案根目錄的 `KurainVideo-v2.0-CODEX-SPEC.md` 與
`KurainVideo-現況產品規格書.md`，再檢查實際 Android 原始碼。

以新規格的第 0 章為最高實作約束。本回合必須完成 Phase 0，
有餘裕時接續完成 Phase 1，不需要重寫 Android App UI，
不能先大規模搬動舊檔案或刪掉現有 Android 功能。

必須產出：
1. 現有 Android 功能/資料/Gradle/版本/更新方式盤點與 baseline test。
2. Android sideload、Android Play、iOS App Store 三個發佈 channel 設計與 ADR。
3. Signed catalog/Ed25519/metadata schema 的可執行程式與負面測試（如果 Phase 1）。
4. 每個 Phase 的執行指令、測試結果、阻礙、變動檔案與回滾方法。

絕對不可把可下載的 Rust .so、Kotlin dex、Swift code、任意 JS/Wasm
當作跨平台通用熱更新方案。必須保留 Android 原本 Media3、
所有既有下載與播放歷史。沒有憑證／Mac/iPhone/NAS，請標記
BLOCKED_ENV，不可捏造驗收。每回合從上次 report 繼續。
```

### 15.2 第二回合：安全資料包完整落地

```text
依 `KurainVideo-v2.0-CODEX-SPEC.md` 實作 Phase 2 與 Phase 3。
先讀取既有 PHASE reports、git diff、測試結果與 ADR。
實作 kurain-package、宣告式 rules JSON schema、signed catalog verifier、
本地 staging/atomic activate/rollback、Rust parser 與 UniFFI，
完成一個合法 mock/site fixture 的 Android Kotlin→Rust→UI 垂直切片。

執行正向、簽章篡改、ZIP slip、schema mismatch、crash recovery、
channel policy、source parity 等測試。嚴禁任意可執行插件下載。
保留 legacy fallback。產出報告與可直接執行的命令。
```

### 15.3 第三回合：Android 原生差異更新

```text
依規格 Phase 4 / Phase 5 進行 Android 無破壞性遷移與 sideload delta。
先確認 HTTPS + signed catalog 可用、官方 APK 簽章相容、old/new
signed single APK fixtures 已準備；若前提未成立，先補 Phase 1
的安全與測試缺口，不要跳過直接實作發版。

要求：build delta + verify byte equality；device installed APK SHA 匹配
後才允許 patch；最終新 APK SHA / 簽章 / packageName / versionCode
都要驗證；失敗可靠 fallback full；系統安裝須由使用者確認；
Android Play variant 不能使用自架 APK updater。

測試網路中斷、空間不足、錯簽章、取消安裝、split APK、資料保留。
請提出實際下載 bytes 報告，完成 PHASE-04/05-REPORT.md。
```

### 15.4 第四回合：iOS SwiftUI / 擴充協定

```text
依規格 Phase 6、7，保留 Android 所有既有功能，新增 iOS SwiftUI
五分頁、Rust Swift UniFFI、Files、AVPlayer HTTP/HLS、WKWebView、
授權資料包、歷史、合法的遠端與下載功能。

採 App Store iOS allowlist，compile-time and runtime policy gate；
不可下載執行 native library、dex、任意 JS；無法驗證的 DASH/RTSP、
SMB/SFTP 或磁力功能明確標示未支援，不要虛報已完成。

若目前環境無 macOS/Xcode：請交付 Xcode 工程、build 腳本、
可跑的非 macOS Rust tests、BLOCKED_ENV 清單，不要宣稱 iOS build PASS。
```

## 16. 官方資料來源、現況證據與規格假設

### 16.1 使用者提供之現況文件（As-built）

- `KurainVideo-現況產品規格書.md`（2026-10-14）：Android Kotlin Views/XML、Media3、五分頁、WebView 來源偵測、套件系統、SMB/FTP/SFTP/WebDAV/HTTP、DownloadService 與 apk update；也明列某些端到端環境未驗證。
- 先前 `KurainVideo-v2.0-Android-iOS-Rust-Codex-SPEC.md`：Rust/SwiftUI/UniFFI 架構及原本 Phase 0～6，本次合併並重整為 Phase 0～9。
- 上述是文件記錄，**真正 source tree 才是實作最終事實**。iOS 專案與新更新系統不是現況已有功能。

### 16.2 2026-10-14 核對之官方技術／政策參考（外部）

1. Android Play Feature Delivery（適用於 App Bundle，非通用自架 APK 模組）：https://developer.android.com/guide/playcore/feature-delivery/on-demand
2. Android App Bundle（Play 自動產生最佳化 APK）：https://developer.android.com/guide/app-bundle
3. Google Play Device and Network Abuse（非 Play App 本體更新、外部可執行碼限制）：https://support.google.com/googleplay/android-developer/answer/16559646?hl=en
4. Android ApplicationInfo `sourceDir`, `splitSourceDirs`（APK patch base 檢查）：https://developer.android.com/reference/android/content/pm/ApplicationInfo
5. Apple App Review Guidelines（尤其 1.1.4、2.5.2、4.7、5.2.2、5.2.3）：https://developer.apple.com/app-store/review/guidelines/
6. Apple Background Assets（支援大型資源分層下載與更新）：https://developer.apple.com/documentation/backgroundassets
7. Apple On-Demand Resources deprecated（iOS 27+ 建議轉 Background Assets）：https://developer.apple.com/help/app-store-connect/reference/app-uploads/on-demand-resources-size-limits/
8. Apple URLSession background downloads：https://developer.apple.com/documentation/foundation/downloading-files-in-the-background
9. Apple AVAssetDownloadURLSession：https://developer.apple.com/documentation/avfoundation/avassetdownloadurlsession
10. Mozilla UniFFI Kotlin/Swift bindings：https://mozilla.github.io/uniffi-rs/latest/
11. UniFFI Swift bindings / Swift 6 compatibility notes：https://mozilla.github.io/uniffi-rs/latest/swift/overview.html

### 16.3 尚需實際專案／部署環境確認（必須列為未決）

- Android 現有 APK 是 universal 或 split、能否讀 `sourceDir`、正式 APK 簽章與新版本是否相容；沒有這些不能驗收 delta。
- `http://nas.kurain.uk:8080` 是否已升級 HTTPS、部署權限、reverse proxy、NAS 目錄、可用的更新 API path、是否可以新增公開不可變 artifacts。
- Rust library 依賴、UniFFI toolchain、Android ABIs、iOS Swift/Xcode CI 與 iOS target version；需要在 Phase 0 pin 具體版本。
- 現有 Android 所有站點對資料規則 DSL 的適配程度、合法資料權利證據、iOS App Store 上架範圍。
- iOS Bundle ID、Signing Team、App Store Connect / TestFlight 權限、需要支援的實體機型。
- 使用者是否真的從 Google Play 發布；若沒有，`androidPlay` 是預留 delivery channel，不需在 P0 實作動態功能。

### 16.4 非官方工程選擇（非平台保證）

Ed25519 封裝方式、`bsdiff-v1`、patch 70% 判斷門檻、包大小上限、schema 範例、catalog TTL、下載併發、保存上一版、目錄命名與 issue 分配，全部是**本次建議設計**，可由 Codex 透過 ADR 在實測與安全條件下調整。不要把示意 URL/Hash/版本當實際已部署 API。

## 17. 原 Android/iOS 總驗收 Checklist（桌面擴充見第 29 章）

### A. 架構與 Android 保護

- [ ] Phase 0 已對照現況文件與原始碼，並有 baseline / smoke tests。
- [ ] 不搬動或重建既有 Android App；五分頁與播放/下載/遠端功能不退化。
- [ ] Rust crates 和 Kotlin/Swift bindings 可建置，至少一條 Android 真實垂直切片成功。
- [ ] `CoreApi` / package schema / app versions 明確分開。
- [ ] legacy parser/下載/遠端設定保留且 feature flag 可恢復。

### B. 套件化及流量

- [ ] 站點規則可以單獨更新，無需下載 App APK，並顯示實際傳輸 bytes。
- [ ] 資料包限 JSON/圖片等純資料，不執行下載程式碼。
- [ ] Signature、SHA、schema、allowlist、zip limits、host policy 全部驗證。
- [ ] Staging + atomic active + last good + crash recovery 生效。
- [ ] 測試惡意 ZIP、格式錯誤、錯版本、網路斷線、磁碟不足均不破壞舊資料。

### C. Android 自架 APK 差異更新

- [ ] Update server 先完成 HTTPS + signed catalog 安全遷移。
- [ ] 使用舊 **已簽署** 完整 APK 與新 **已簽署** 完整 APK 生成 patch。
- [ ] Installed `sourceDir` 舊 APK hash、single APK 限制與 variant 比對成功。
- [ ] patch result byte-for-byte 等同新 APK，final signer/package/version 全驗證。
- [ ] 差異不值得、old mismatch、資源不足或可恢復失敗時 fallback 完整包。
- [ ] Android 安裝器需要使用者確認，取消/失敗不可顯示成功。
- [ ] Play/iOS 版不含自架 APK install/update path。

### D. iOS 與政策

- [ ] SwiftUI 五分頁、Files、AVPlayer、WKWebView、Rust FFI MVP 完成。
- [ ] iOS App Store 只包含被發佈 policy 允許的站點與合法資源。
- [ ] iOS 不下載可執行程式碼替換原生 App。
- [ ] iOS 資料包 update/rollback 與有效網路偏好。
- [ ] URLSession / AVAssetDownloadURLSession 遵守背景任務限制。
- [ ] 真正在 macOS+Xcode build，在 Simulator/裝置做能力測試；缺環境標記 BLOCKED_ENV。

### E. CI / 維運 / 發版

- [ ] 所有 Phase report 附上命令、結果、測試證據及 rollback 方法。
- [ ] 產生 reproducible signed release manifests 與 immutable artifacts，私鑰未進 repo。
- [ ] 模擬 signing key mismatch / catalog replay / ZIP attack / interrupted update / storage low。
- [ ] 具 staging→verify→promote stable 部署流程與緊急停止更新手冊。
- [ ] Android sideload、Android Play、iOS App Store 各自有獨立 release policy 和驗收。
- [ ] 對使用者可見的更新節省統計以實測下載 bytes 計算，不杜撰節省率。
- [ ] 完整風險清單、版本相容矩陣、權利證據、第三方授權、必要 App Review 準備完成。

---

**第一部分總結**：Android/iOS 規格完整保留；請繼續閱讀第二部分（第 18–29 章），包含新增 Windows/macOS 交付標準、Tauri/Rust/React 架構、播放器、安裝器、更新、CI 與 Codex Phase 10–14。

---

# Part II — Windows / macOS 桌面版完整新增規格（v2.1，與前述 0–17 章共同生效）

> **本 Part II 為 v2.1 新增需求**，不得取代前述 Android 1.4.0 保護、iOS 原生限制、Rust 共用核心、安全資料包、更新信任根與 Phase 0–9。前文只提及 Android/iOS 的三個交付 channel，現在擴展為五個：`androidSideload`、`androidPlay`、`iosAppStore`、`windowsDirect`、`macosDirect`；商店版與未來 Linux 不列入本次桌面最低完成範圍。**本章的 Windows/macOS 都是新開發目標，不是 As-built 已實作功能。**

## 18. 產品目標、平台矩陣與交付定義

### 18.1 使用者故事與非目標

- **桌面一套程式邏輯**：Windows/macOS 使用同一份 React + TypeScript 桌面 UI 與 Tauri 2 host，直接連結既有 `rust/crates/*`，Android/iOS 不強迫改用 Tauri。
- **Windows 安裝並執行**：使用者下載 `KurainVideo_<version>_x64-setup.exe`，執行安裝、建立開始功能表入口、開啟 `KurainVideo.exe`。另提供 `portable.zip`（可選，必須完整包含執行檔與依賴）；不可把「一個 exe」誤解為保證所有 codec/DLL 都是單一檔案。
- **macOS 安裝並執行**：使用者下載 `KurainVideo_<version>_arm64.dmg` 或 `x64.dmg`，將 `KurainVideo.app` 拖到 Applications，正常通過 Gatekeeper。`.app` 是實際可執行包；`.dmg` 是發佈載體。
- **桌面五個主入口**：本地、網頁、套件、下載、設定；播放器使用獨立播放視窗或獨立工作區（MVP 可用獨立原生播放視窗）。
- **影片來源**：本機媒體、直接 HTTP(S)/HLS/DASH/RTSP、可合法取得的網站來源、HTTP/WebDAV 遠端，SFTP/SMB/FTP 依真實環境驗收逐步開啟。
- **可獨立更新**：站點宣告式 JSON、圖片等資料包跨四平台共用；新桌面程式碼（Tauri host、Rust crate、播放器 binary）必須走經簽章的完整 App 更新，不能混成資料包熱更新。
- **不追求未驗證的「完全相同功能」**：Safari/WKWebView vs WebView2、mac sandbox、Windows 檔案路徑、影音授權與網站 API 行為不同，UI 提供 capabilities 與明確降級。
- **非目標**：Linux（未來預留）、瀏覽器 extension、DRM 破解、反爬繞過、全平台同步帳號伺服器、遠端可執行 JS/Lua/Wasm/原生動態庫、未授權串流下載、未經實測的無縫內嵌影片畫面。

### 18.2 支援矩陣（MVP 與後續）

| 項目 | Windows Desktop | macOS Desktop | Android 現況 | iOS 規劃 |
|---|---|---|---|---|
| 技術棧 | Tauri 2, React TS, Rust | Tauri 2, React TS, Rust | Kotlin Views/XML + Media3 | SwiftUI + AVPlayer |
| 第一版建議 OS | Windows 10/11 x64，ARM64 後驗證 | macOS 13+ Apple Silicon，Intel x64 有 runner 時支援 | minSdk 24，保留既有 | iOS 16+ 暫定 |
| 安裝與交付 | NSIS setup.exe，選用 portable.zip／MSI | 已簽 `.app` / `.dmg` | APK／Play | App Store / TestFlight |
| 本機檔案/資料夾 | P0 | P0 | 已有 | P1 |
| HTTP MP4/HLS | P0 | P0 | 已有 | P1 |
| DASH / RTSP | MPV 適配器實測後 P1 | MPV 適配器實測後 P1 | 已有（設備依賴） | 不保證 |
| 網頁來源偵測 | WebView2 可觀測範圍，P1 | WKWebView 可觀測範圍，P1 | 既有 WebView | WKWebView MVP |
| 宣告式站點資料包 | 共用 Rust，P1 | 共用 Rust，P1 | 遷移後 | 依發布政策 |
| HTTP/WebDAV 遠端 | P1 | P1 | 已有部分測試 | P1 |
| SMB/FTP/SFTP 遠端 | P2 真實 NAS 測試 | P2 真實 NAS 測試 | 已有，部分 E2E 待驗收 | P2 / 條件式 |
| 背景下載 | Rust 工作排程 + OS 整合 P1 | Rust 工作排程 + OS 整合 P1 | Media3 既有 | URLSession / AVAssetDownload |
| 原生程式更新 | Tauri signed updater P1 | Tauri signed updater + codesign/notarization P1 | Sideload patch 或 Play | App Store |
| 資料包獨立更新 | signed catalog | signed catalog | signed catalog | signed catalog + allowlist |

第一版 `Windows 10/11 x64` 與 `macOS 13+ arm64` 是本規格建議的**驗收基線而非經官方/實機已確認最低需求**。Phase 10 應依依賴、編譯與測試修正。只具 Windows runner 而沒有 Mac runner 時，macOS 必須標記 `BLOCKED_ENV`，不可宣稱 macOS 已驗收。

### 18.3 必備基本體驗

1. 本機媒體庫首啟提示選擇資料夾，掃描在 Rust 背景 worker 運作，支援搜尋/排序/縮圖/資料夾導航，後續可手動新增或取消監控資料夾。
2. 拖曳檔案或影音網址進主視窗加入播放/下載待處理清單，支援從 Windows 檔案總管 / macOS Finder「開啟方式」接收合法媒體。
3. 影片清單支援清單/網格、右鍵選單、快捷鍵、續播、播放歷史、最近資料夾，未獲授權的路徑不自動刪除。
4. 來源套件支援啟用/停用、版本、來源權限提示、單站點資料包更新與回滾；不可在使用者不知情的情況下下載超大資源。
5. 下載管理至少支援加入/暫停/恢復/取消/失敗重試、來源超時提示、進度（僅在可計算時顯示 %）、目標目錄、磁碟不足處理。
6. 主程式更新顯示版本、簽章驗證結果、下載大小、安裝所需的重啟；不要像「規則套件更新」那樣顯示為免重啟。

## 19. 桌面技術架構、程式依賴與禁止事項

### 19.1 主選型（須落 ADR）

- **桌面 Shell**：Tauri **v2**（鎖定 Phase 10 實測確定的精確 stable 版本，不寫萬年 `*`）。Windows 後端 WebView2，macOS 後端 WKWebView；同一 React 18+/TypeScript/Vite 原始碼（依穩定相容版本鎖定）。
- **Rust 複用**：`desktop/src-tauri` 新增一個 `kurain-desktop` Tauri crate，直接依賴 `kurain-core`、`kurain-parser`、`kurain-sources`、`kurain-network`、`kurain-remote`、`kurain-download`、`kurain-package`、`kurain-update-protocol`。**Desktop 不需要呼叫 Android/iOS 的 UniFFI**，避免 Rust → FFI → Rust 的多餘轉接。
- **UI 通訊**：前端只能經由經 allowlist 的 Tauri Commands/Events 呼叫 host；Tauri host 統一驗證參數與授權後轉呼叫 Rust Domain Services。限制每個 command 可操作的路徑、站點、權限。
- **播放後端**：桌面 P0/P1 使用 `DesktopPlayerEngine` 介面，先實作 `MpvSidecarEngine`（可行性 Spike 驗證後才標 DONE）；後續在適當 native video surface 上使用 `libmpv`/render API 取代 sidecar 是 P2，不應在第一版就假設影片畫面可完美嵌入 Tauri WebView DOM。
- **下載**：共用 Rust 狀態機、持久佇列/metadata；桌面由 process 內 worker 進行可恢復下載；不是 Android DownloadService，也不能依賴 iOS URLSession 背景語義。
- **儲存**：桌面 SQLite（schema migration）存歷史、站點設定、任務狀態，站點包落在 app data 下；Windows DPAPI/Credential Manager / macOS Keychain 儲存密碼與 token，經 platform adapter，不把明文帳密寫在 SQLite 或 log。
- **本機檔案系統**：OS file dialogs / scoped dirs，必要路徑正規化與 symlink 防護；有本機選取記錄並避免 path traversal，禁止前端任意訪問整個磁碟。

### 19.2 進程和信任邊界

```text
Windows: KurainVideo.exe  ────┐
                               ├─ Tauri 2 Host (Rust command dispatcher)
macOS: KurainVideo.app  ──────┘             │
                                           ├─ Rust Workspace shared crates
                React + TypeScript  ◄──────┤  (parser, remote, downloads,
                desktop UI/WebView          │   catalog verification, history)
                                           │
                                           ├─ SQLite + per-OS keychain adapter
                                           │
                                           ├─ signed declarative site data packs
                                           │
                                           └─ DesktopPlayerEngine
                                                    │
                                                    ├─ MpvSidecarEngine (MVP)
                                                    └─ libmpv engine (P2 / proven)

Untrusted remote websites → isolated webview/browser context → sanitized
MediaCandidate → trusted Tauri host → Rust parser → PlayerEngine
NO untrusted website → arbitrary Tauri invoke, filesystem, shell.
```

Tauri WebView2/WKWebView 是應用程式的 UI/網頁呈現層，**不應當成萬能解碼器**。網站播放、HLS、DASH、RTSP 的端到端能力以實際 MPV backend 和來源驗收為準。

### 19.3 React/TypeScript 桌面可重用元件與 Rust API

- `UI Shell`: Navbar, Sidebar, Toolbar, Dialog, Toast, Table, Grid, Tab, Theme, Responsive Layout, i18n（首發繁體中文，保留英文字串鍵）。
- `Domain TS contracts`: 從 `shared/schemas` 產生 TS types，不能手動維護第二套不一致的 schema；Rust→TS bridge 使用已測試 generator 或可驗證 JSON Schema。
- `Rust commands` 強制：`list_local_media`, `select_media_dirs`, `get_playback_history`, `open_media`, `set_playback_position`, `get_sources`, `fetch_site_catalog`, `list_packages`, `install_data_package`, `list_remote_endpoints`, `list_remote_dir`, `test_remote_endpoint`, `get_download_jobs`, `enqueue_download`, `pause_download`, `resume_download`, `cancel_download`, `check_app_update`, `install_app_update`。
- 每個 command 有: `requestId`、對應 DTO（部分操作需 `idempotencyKey`）、狀態錯誤碼、取消能力、不得讓 UI 直接持有 secrets；播放器/下載/更新的狀態使用有序 events + 初始 snapshot，UI 視圖刷新不得產生重複任務。
- 前端不能使用 Node.js API 直接呼叫磁碟或啟動 shell；若需 OS 服務，由最小權限 Tauri plugin / Rust command 執行。

### 19.4 核心 DTO 與序列化示例（契約定義）

```json
{
  "sourceId": "local:example-file-id",
  "displayName": "Example.mp4",
  "sourceKind": "LOCAL_FILE",
  "uri": "kurain-file://media/opaque-id",
  "containerHint": "mp4",
  "headersRef": null,
  "resumeMs": 183000,
  "capabilities": {"seek": true, "download": false},
  "policy": {"legalRightVerified": true, "platformAllowed": true}
}
```

**強制**：使用 opaque IDs 而不是讓 React 隨意傳絕對 path / storage credentials；`headersRef` 僅為主機內的短效 credential handle，不能將 Cookie/Token 加入 URL query 或 IPC log。DTO 中 `legalRightVerified` 不能由網站任意自行聲稱，必須由來源權利政策及使用者允許條件判斷。版本化欄位應以現有 `kurain-core` 契約為單一真相，以上 JSON 是建議新增欄位示例，不能無檢查地覆蓋已有模型。

## 20. 桌面 UI／頁面／操作細節

### 20.1 Windows / macOS 主畫面布局

```text
┌───────────────────────────────────────────────────────────────────────────────┐
│ Kurain Video      [搜尋影片、網站、套件]           [下載狀態] [主題] [設定]       │
├──────────────┬────────────────────────────────────────────────────────────────┤
│ 本地         │ 來源切換 / 麵包屑路徑 / 篩選 / 排序 / 網格-清單                  │
│ 網頁         ├────────────────────────────────────────────────────────────────┤
│ 套件         │  媒體卡片／資料夾／站點影片列表                                  │
│ 下載         │  點兩下播放；右鍵操作；選擇資料夾／拖曳新增                       │
│ 設定         │                                                                │
├──────────────┴────────────────────────────────────────────────────────────────┤
│ 狀態列：來源數 | 已掃描/正在掃描 | 網路狀態 | 新版 / 資料包更新                │
└───────────────────────────────────────────────────────────────────────────────┘
```

- **共用桌面 UI 不是 Android XML 或 iOS SwiftUI 翻譯**：桌面可有左側導航、可調側欄、多欄列表、鍵盤操作、視窗縮放與資料夾批次加入；保留五個功能概念即可。
- **首次啟動 Wizard**：初始語言/主題 → 選來源資料夾（可跳過） → 播放器引擎檢查（codec/sidecar/license） → 隱私與更新偏好 → 完成。
- **本地**：搜尋檔名/metadata、資料夾節點、排序（名稱/日期/大小/播放進度）、封面 lazy load、單/多選，掃描進度可取消。
- **網頁**：地址列、返回/前進、重新整理、偵測影片按鈕、候選來源表（格式/解析度/host/標頭狀態），使用者明確按播放或下載；不能在瀏覽網頁時偷偷大量保存 Cookie。
- **套件**：站點分組、更新狀態/頻率、影片卡、分類/搜尋/分頁、來源失效重試、規則包「上一版」回滾；只顯示允許合法訪問的來源。
- **下載**：Queue、Active、Paused、Failed、Completed 篩選；檔案目的地/進度/剩餘預估（未知顯示 `—`）、重試原因、查看日誌（遮罩敏感資料）。
- **設定**：一般（UI/語言）、播放器（硬解開關/字幕/音軌/快捷鍵）、來源（站點/遠端）、下載（存放路徑/併發/網路）、儲存管理（快取大小/清除）、更新（程式/資料包/通道）、關於（版本/第三方授權）。
- **播放器**：MVP 獨立視窗可顯示媒體名稱、時間、暫停/Seek、音量、字幕/音軌、全螢幕，視窗關閉後把位置持久化並回到上次頁面。P1 改善與主 UI 視窗整合，但須通過平台渲染測試。

### 20.2 快捷鍵、滑鼠與原生整合

| 動作 | 預設 | 注意事項 |
|---|---|---|
| 播放/暫停 | Space（影片視窗焦點內） | 網頁表單聚焦時不可誤觸 |
| 全螢幕 | F / Alt+Enter（Win）；F / macOS 標準全螢幕支援 | macOS Cmd+Ctrl+F 由系統處理時不得衝突 |
| Seek -/+ 10 秒 | 左／右 | 長按鍵設防抖；只在有 Seek 能力時生效 |
| 音量 | 上／下 | 網頁輸入框不攔截 |
| 開啟檔案 | Ctrl+O / Cmd+O | 系統原生 chooser |
| 開啟資料夾 | Ctrl+Shift+O / Cmd+Shift+O | 非法 / 無權限時有提示 |
| 搜尋 | Ctrl+F / Cmd+F | 分頁語義；網頁內搜尋需要另命令 |
| 設定 | Ctrl+, / Cmd+, | 可修改快捷鍵且檢查衝突 |

- 支援系統檔案關聯、拖拉檔案進入程式、剪貼簿貼合法 URL、OS 開機自啟（可選預設關）、多視窗與螢幕 DPI/HiDPI、深色模式；某平台無法達成須列 `BLOCKED/NOT_SUPPORTED`。
- 鍵鼠操作、focus trap、螢幕閱讀器基本標籤、字級縮放、縮放比例/Windows 高 DPI/mac Retina 確保功能可用。
- 關閉主視窗有下載時提示「背景繼續／停止並退出」，若採系統托盤模式必須有明顯退出入口；macOS close vs quit 行為遵守慣例並測試。

## 21. 桌面播放器後端詳細契約

### 21.1 `DesktopPlayerEngine` 介面

```rust
// 設計示例。Codex 須整合現有 kurain-core DTO；不可盲貼形成雙軌資料模型。
#[async_trait::async_trait]
pub trait DesktopPlayerEngine: Send + Sync {
    async fn open(&mut self, source: DesktopPlayableSource) -> Result<PlaybackSession, PlayerError>;
    async fn play(&mut self) -> Result<(), PlayerError>;
    async fn pause(&mut self) -> Result<(), PlayerError>;
    async fn seek_to_ms(&mut self, position_ms: u64) -> Result<(), PlayerError>;
    async fn set_volume(&mut self, volume: f32) -> Result<(), PlayerError>;
    async fn set_speed(&mut self, speed: f32) -> Result<(), PlayerError>;
    async fn current_state(&self) -> Result<PlaybackState, PlayerError>;
    async fn close(&mut self) -> Result<(), PlayerError>;
}
```

- `PlaybackSession` 必須有不可猜測 session ID；播放狀態包括 `CREATED, PREPARING, BUFFERING, PLAYING, PAUSED, ENDED, FAILED, CLOSED`；收到超時/斷線有明確 retry/backoff，任何 retry 不得重覆套用外站一次性權限。
- 播放狀態每 1–5 秒發送 snapshot 供 UI 更新；歷史保存節流/原子提交，最後關閉時盡力 flush；進度小於 5 秒或距結束小於 5 秒時沿用原 Android 歸零語義（桌面可由共用規則統一）。
- 解碼策略 `auto / hw / sw` 在桌面 P1 納入設定；要把 fallback 及支援 codec 探測結果回報 UI。不能宣稱 CPU 核心數就是解碼執行緒數。

### 21.2 MPV sidecar MVP（P0 Spike → P1 正式）

- `MpvSidecarEngine` 啟動受控播放進程，明確定義 `--no-config`/最小配置/隔離工作目錄/執行檔 hash，使用受權限保護的本地 IPC（Windows Named Pipe 或平台受支援的安全 IPC、macOS per-user 0700 socket directory）控制；**禁止接受網頁任意 shell command**。
- MPV 播放二進位需為對應 `windows-x64`／`macos-arm64`／`macos-x64` 逐架構打包，不使用未檢驗/來源不明的 `mpv.exe`；開發前完成 mpv、FFmpeg、第三方 codec 的 **GPL/LGPL/license + redistributables** 審核，未通過不可隨 App 一起發佈。
- `PlayerWindow` MVP 可採獨立、受控的 MPV 原生視窗，回到 App 時保存位置；不要第一回合就將 `HWND`/`NSView` 或 MPV GPU rendering 硬塞進 WebView DOM。
- 不可把 Cookie、Bearer Token、API 私鑰、含帳密的 URL 寫到**命令列參數、進程列表、一般日誌、命名 pipe 全域位置或世界可讀的檔案**；來源需授權時先由 Rust `RemoteStreamGateway` 在 localhost / loopback 綁定隨機 port、短生命週期能力 token（或其他經 threat-model 驗證的安全 bridge），播放器只拿代理串流，Gateway 防 CSRF/SSRF、限制 localhost、驗證會話、處理 Range、到期即撤銷；該橋接初期可標為 P1，不可用不安全方式冒充已完成。
- Gateway 不得當作可繞過網站認證、DRM 或跨主機權限政策的中繼服務。對受保護來源若安全傳遞尚未實作，顯示 `AUTHENTICATED_STREAM_NOT_SUPPORTED`，可改選已獲授權的本地檔案播放。
- MPV 異常退出時應關閉 IPC handle、不重覆啟動孤兒進程，主程式可重新開啟播放且保留最近進度；卸載時應停止 sidecar，Windows Defender/macOS Gatekeeper 不可被安裝器繞過。

### 21.3 格式測試矩陣

| 來源/codec | Windows | macOS | 需要記錄 |
|---|---|---|---|
| 本機 H.264/AAC MP4 | P0 | P0 | 起播時間、音畫、Seek、續播 |
| HTTP MP4 Range | P0 | P0 | Range、重定向、超時/斷點 |
| HLS（含 AES-128 合法授權來源） | P1 | P1 | Manifest、相對 URI、正確音軌 |
| MPEG-DASH | P1 | P1 | Manifest/representation/seek |
| RTSP | P1 | P1 | LAN 裝置協定與 timeout |
| HEVC/H.265、AV1 8/10-bit | P2 | P2 | 依 GPU/driver/codec 替換策略，不能全裝置保證 |
| ASS/SRT 字幕、外掛音軌 | P1 | P1 | 字幕編碼/同步/字型/切換 |
| HDR、Dolby Vision、DRM | 非預設保證 | 非預設保證 | 測試系統能力，DRM 不承諾 |

## 22. 桌面網站偵測、來源套件、權限隔離

1. `BrowserHost` 將可信主程式 UI WebView 與**不可信遠端網頁**完全隔離：站點視窗不可使用 Tauri `invoke`、檔案、shell、剪貼簿等 host 特權；遠端內容導覽及開外部網址走 allowlist 與使用者操作。
2. 由宿主獨立維護 `WebCandidateDetector`，重用 `shared/web-scripts/webview-video-snapshot.js` 在各平台**允許範圍**的 page injection；WebView2/WKWebView 網路可觀測能力不等同 Android `shouldInterceptRequest`，不能承諾攔截任何 iframe/Blob/MSE/WebSocket/DRM。
3. 來源候選去重、上限、失效清理、Origin/Referer/Cookie 原則與 Android 現況一致；跨站/不同帳號 cookie jar 嚴格隔離；使用者確認候選後才傳 trusted Rust parser。
4. `kurain-sources` 的規則包與簽署 catalog 跨平台共用，但 `windowsDirect` / `macosDirect` 有自己的站點 allowlist，還需遵守內容來源版權、服務條款與當地法律。禁止透過資料包投放執行 JS、WASM、Python/Lua 載入器、新二進位、任意 shell 命令。
5. HTTPS/TLS 開啟 hostname/憑證驗證；遇到頁面驗證或短效 cookies 不自動繞過網站驗證；CSP、Tauri capability scope、navigation allowlist 必須具負面測試。
6. 安全驗收：惡意站點呼叫 `window.__TAURI__`/invoke、shell execute、任意 file read、跨站 cookie、注入 URL scheme、偽造下載包、超大壓縮包全部拒絕；站點錯誤應可重試或回退，不影響本地播放器。

## 23. 本機掃描、遠端協定、下載與持久資料

### 23.1 LocalLibrary（MVP）

- 資料來源 `LocalFolderPermission`（由使用者挑選），Rust scanner 採 bounded concurrency、可取消、最大遍歷深度/數量可設、處理 symlink cycle/網路磁碟 timeout，封面抽取與檔案索引不同 worker。
- 目錄移除不等於刪檔；物理檔案不存在時標示 `MISSING`；掃描時避免一次將大量縮圖放進 RAM。Windows 長路徑與 UNC、macOS `/Volumes` 外接磁碟及 APFS 權限都要測試。
- OS 檔案關聯與外部開啟事件使用明確可解析 URI，並拒絕路徑 traversal、`file://` 執行檔開啟以及非媒體檔濫觸發。
- SQLite schema：`media_item`（id/path_hash/title/size/mtime/duration/scan_version）、`media_folder`、`playback_history`、`remote_endpoint`（credential_ref，不存密碼）、`site_package`、`download_job`、`app_update_attempt`；所有 Schema migration 納入單元/升版/回滾測試。

### 23.2 RemoteBrowser

- `kurain-remote` 需要可取消列表、目錄分頁、Range/Seek、認證失敗與超時錯誤碼；HTTP/WebDAV 優先整合，SMB/SFTP/FTP 複用舊邏輯前先寫 Rust 接頭與同樣檔案 fixtures，不能直接把 Android Kotlin 遠端程式當成 desktop 可編譯。
- SFTP host key pinning，Keychain/DPAPI credential refs，HTTPS redirect 不把 Authorization 洩給跨主機；不得允許惡意站點 JSON 讓 Rust 開始掃描任意 LAN IP（防 SSRF）。
- NAS 檔案若不支援 Range，播放器 seek 必須顯示能力受限，不可假裝精準跳轉。

### 23.3 DesktopDownloadWorker

- `DownloadJob` 狀態：`QUEUED`, `RUNNING`, `PAUSING`, `PAUSED`, `VERIFYING`, `COMPLETED`, `FAILED_RETRYABLE`, `FAILED_FINAL`, `CANCELED`。
- 索引/排程存 SQLite；下載到 `.part`，支援 Range/ETag/If-Range 的來源才續傳，否則刪暫存安全重下；完成前 verify 長度/hash（有權威 metadata 時）後原子 rename，不能超寫到路徑外。
- 來源 Content-Length 未提供/Chunked transfer 時顯示未知大小；複合 HLS/DASH 的離線輸出與單 MP4 要區分；不可未經授權擅自處理 DRM。
- 預設並行 `2`（桌面可在 UI 設定），同來源/同目標檔互斥、防重複工作；網路斷線重試退避，退避上限及最大重試次數需配置，系統關閉前 flush；開機恢復 `RUNNING` job 為 `PAUSED_RECOVERABLE` 並重新評估下載來源有效性。
- App 更新前需協調下載：停止寫入、checkpoint、重啟恢復；升版 schema 須 migration forward/backward compatibility plan；若 OS 強制退出不得造成目標檔損壞。
- Windows `AppData`、macOS `Application Support` 不直接儲存用戶影片（除非有選擇 app-managed 資料夾）；下載位置由使用者選擇並安全保存。

### 23.4 Desktop Secure Storage

- Windows 使用 DPAPI/Credential Manager（由可用 Rust lib 封裝並測試同使用者讀寫/登出）；macOS 使用 Keychain；敏感 token 最多以短效 handle 進入 Rust core，通訊/錯誤/log/redaction 審核。
- 多使用者 Windows/macOS 帳號隔離，各使用者設定/更新包不應互相覆蓋；更新簽署公鑰是可公開常數，私鑰絕不存用戶端。
- `factory reset` 和 `uninstall` 區分應用程式快取、播放歷史、下載檔、系統 Keychain；刪除前提示與清楚範圍。

## 24. Windows EXE / macOS APP、DMG 打包與正式發佈

### 24.1 Windows 交付契約（P0/P1）

**必要產物**：

```text
releases/<version>/windows/x64/
├── KurainVideo_<version>_x64-setup.exe   # NSIS 安裝程式，下載後可直接執行
├── KurainVideo_<version>_x64-setup.exe.sig # Tauri updater 簽章（依 pinned Tauri 實際輸出）
├── KurainVideo_<version>_x64-portable.zip # P2：內含 exe + 必要 sidecar/DLL/資源
├── SHA256SUMS.txt
└── release-metadata.json
```

- `KurainVideo.exe` 為**程式本體可執行檔**；`*-setup.exe` 為**安裝程式**，兩者必須在文件/UI 文字區分。必須滿足使用者要求「Windows 下載 exe 執行」，第一個交付以 NSIS `setup.exe` 為準；portable 為可選增強。
- NSIS 做版本/安裝位址/桌面捷徑選擇/卸載/升版資料保留；對 USB/移動式需求，可選 portable ZIP，不在沒有真正封裝能力下承諾**單一 exe 包含全部 codec/DLL**。
- `WebView2 Evergreen Runtime` 檢查：若未安裝，安裝器提供 Microsoft 官方 bootstrapper 或合理提示；不得直接假設 Edge Browser = WebView2 Runtime。不要私自包進過時固定版 WebView2 binary。
- Windows 的 `msi` 為 P2 可選，用於公司部署；若需要 MSI，在 Windows runner + WiX 建置，避免標成跨系統皆可產生。
- Authenticode code signing 對正式發佈 P1 必須有簽章與 timestamp 驗證；無商業憑證時 P0 開發測試可交 unsigned build，但最終上線 Gate 為 `BLOCKED_SIGNING`。不因 unsigned installer 仍能安裝就宣稱安全／SmartScreen 無提醒。
- 64-bit x64 是 MVP；arm64 需獨立 runner/native libs/播放器驗收。更新 catalog 透過 `target=windows` + `arch=x86_64/aarch64` 選擇，不可交叉派送。

### 24.2 macOS 交付契約（P0/P1）

```text
releases/<version>/macos/arm64/
├── KurainVideo_<version>_arm64.dmg       # drag-install 發佈包
├── KurainVideo.app                       # 包含正確 Info.plist / binaries / resources
├── KurainVideo.app.tar.gz                # Tauri updater artifact（依實際版本決定）
├── KurainVideo.app.tar.gz.sig
├── SHA256SUMS.txt
└── release-metadata.json
```

- macOS 本機 runner 使用 Xcode/Command Line Tools 建構 `.app` 與 `.dmg`，`arm64` Apple Silicon P0；Intel `x86_64` 需要分開 build/test 或組 universal（**不預設 universal 已可建置**）。
- 發佈到一般使用者前必須以 Developer ID Application codesign（包含 helper/sidecar/框架／原生庫），啟用 Hardened Runtime，使用 Apple `notarytool` notarize、staple ticket，並在 Gatekeeper 已啟用的乾淨 macOS 環境驗證。
- `Info.plist` / entitlements 僅申請實際使用權限，Apple sandbox/下載、磁碟書籤、網路訪問需視**實際發佈渠道**而定；若未上 Mac App Store，不可把 iOS App Store 更新政策誤套到 Direct Distribution。是否需 App Sandbox 做 ADR 並配合 macOS OS 權限。
- 未簽署/未公證發佈會影響 Gatekeeper；開發測試包與正式包標示清楚。不可要求用戶關閉 Gatekeeper 當作正式流程。

### 24.3 共通版本與依賴紀錄

- 版本 `appVersion` SemVer、Windows PE file version、macOS `CFBundleShortVersionString`/build number、Tauri bundle version 與 catalog `platform/arch/channel` 必須由單一 release metadata 產生，不能手工不同步。
- 交付 SBOM、license notices、binary origin/hash、播放器 backend 憑證／授權聲明、FFmpeg/mpv redistributable 條款、第三方圖片/字體授權；含 `GPL`/`LGPL` 的組合需在發佈前完成獨立法律審查，不能僅因 Rust/Tauri 本身可用就假設播放器可再發佈。
- Tauri 官方 Windows 輸出預設 `setup.exe/MSI`、macOS `.app/.dmg`，具體 artifact 及 updater 檔名**以 pinned Tauri v2 真實 CI 產物為準**，上方命名是本專案 release packaging 最終輸出命名方案。

## 25. 五個發佈 Channel 與更新協定擴展

### 25.1 發佈渠道表（本章取代前文只有三渠道的範圍限制）

| Channel | 原生 App 交付 | 原生 App 更新 | 宣告式資料包更新 |
|---|---|---|---|
| `androidSideload` | APK | signed full/verified delta APK + system installer | signed catalog + policy |
| `androidPlay` | Play App Bundle | Google Play In-App Updates/Play feature | signed catalog + store policy |
| `iosAppStore` | TestFlight / App Store | App Store | signed catalog + store policy |
| `windowsDirect` | Authenticode NSIS `setup.exe` | Tauri signed updater（P1） | signed catalog + desktop allowlist |
| `macosDirect` | Developer ID / notarized `.app` / `.dmg` | Tauri signed updater（P1） | signed catalog + desktop allowlist |

- **必須分辨 2 種簽章**：一是本規格的 **Ed25519 signed metadata/catalog**（站點資料包/自家 release 指示），二是 **Tauri updater updater artifacts signatures**（Tauri 內建驗證），及 OS code signing（Windows Authenticode/macOS Developer ID）。不可拿三者互相代替或省略。
- 初次正式上線原生 App 更新優先使用 **Tauri 官方 signed updater** 與完整更新 artifact，不能把 Android APK 的 `bsdiff` 邏輯直接套到 `.exe`、`.dmg` 或 `.app`。
- 若未來要桌面原生更新也只傳 delta：先做 PoC，必須驗證 pinned old build 的完整 bundle bytes / signing / sidecar hashes / recovery; macOS bundle 必須最終 codesign + notarization 正常，Windows 重建結果與原簽 installer 完全一致，再做 staged roll-out，作為 P3 獨立 ADR，不阻擋 P1 發佈。
- 資料包 JSON/圖示獨立更新：下載、verify signature/hash、staging、atomic activate、last-good rollback；與第 9A–9F 章相同，不允許任何 `.exe/.dll/.dylib/.so` 進入資料包。

### 25.2 Desktop signed updater 狀態機

```text
IDLE → CHECKING → UPDATE_AVAILABLE → DOWNLOADING → VERIFYING
     → READY_TO_INSTALL → CLOSING_WORKERS → INSTALLING → RESTARTING → SUCCESS
                          │                     │
                          └── FAILED / CANCELLED / RETRYABLE ──┘
```

- 檢查 endpoint: HTTPS、固定 trusted pubkey、`platform/arch/channel`、版本單調、expiry、catalog replay protection；使用者可手動檢查、選網路下載、查看 changelog。Tauri updater 的 payload 簽章驗證不可關閉。
- 桌面正在播放或下載時，允許 postpone 安裝並顯示已下載版本；實際 install 前 checkpoint / stop sidecar / flush SQLite / stage 適當回復資訊。
- 更新失敗不得刪除使用者媒體或遠端端點／資料包；安裝後執行健康啟動檢查（Rust database migration、UI ready、player probe）並產生診斷報告。若 Tauri/OS updater 不支援自動程式回滾，不要謊稱 rollback，應有下載舊版 signed installer 與危險版本停止發佈手冊。
- 支援 stable/beta 渠道需 UI 明確選擇且受到 downgrade policy 及 schema 相容性保護；不允許任意網頁網址修改 updater key / endpoint。

### 25.3 發佈 Schema 延伸（契約示例）

```json
{
  "schemaVersion": 2,
  "channel": "stable",
  "catalogSequence": 42,
  "releases": {
    "windows": {
      "x86_64": {
        "version": "2.1.0",
        "deliveryChannel": "windowsDirect",
        "installerKind": "nsis",
        "fullArtifactRef": "sha256:EXAMPLE_ONLY",
        "tauriUpdaterSignatureRef": "sha256:EXAMPLE_SIG"
      }
    },
    "macos": {
      "aarch64": {
        "version": "2.1.0",
        "deliveryChannel": "macosDirect",
        "installerKind": "dmg",
        "fullArtifactRef": "sha256:EXAMPLE_ONLY",
        "tauriUpdaterArtifactKind": "app.tar.gz",
        "tauriUpdaterSignatureRef": "sha256:EXAMPLE_SIG"
      }
    }
  }
}
```

這只是**外層自家 catalog schema 延伸示例**，不等於 Tauri updater 官方 `latest.json` 的格式。Codex 必須提供明確轉換器、獨立測試 fixture、精確 artifact URL / sha256 / signature；不能讓此示例直接餵給 Tauri updater 當可執行配置。

## 26. 專案目錄擴展、Windows/mac CI 與發佈腳本

### 26.1 新增目錄（與前文 12.1 合併，不要改舊 Android app/ 位置）

```text
KurainVideo/
├── app/                            # Android 1.4.0 原專案，保留
├── ios/                            # SwiftUI 新平台
├── rust/
│   ├── crates/                      # 原共用 crates（不可複製另起第二份）
│   └── Cargo.toml                   # workspace includes kurain-desktop 或 workspace members 規則
├── desktop/
│   ├── package.json / pnpm-lock.yaml
│   ├── vite.config.ts / tsconfig.json
│   ├── src/
│   │   ├── app/                     # 路由、佈局、狀態管理
│   │   ├── pages/{Local,Web,Sources,Downloads,Settings}/
│   │   ├── components/{MediaCard,FileTree,PlayerControls,UpdateDialog}/
│   │   ├── adapters/tauri-client.ts
│   │   ├── contracts/               # generated; do not manual duplicate
│   │   └── styles/
│   ├── src-tauri/
│   │   ├── Cargo.toml               # depends on ../../rust/crates/*
│   │   ├── tauri.conf.json
│   │   ├── capabilities/             # main host strictly permission-scoped
│   │   ├── icons/
│   │   ├── bin/                     # pinned approved mpv sidecar per target (if legal)
│   │   └── src/
│   │       ├── main.rs
│   │       ├── commands/
│   │       ├── bridges/
│   │       ├── player/{mod.rs,mpv_sidecar.rs,stream_gateway.rs}/
│   │       ├── storage/{sqlite.rs,secrets.rs,migrations.rs}/
│   │       ├── local_library/
│   │       └── updates/
│   ├── tests/{unit,contract,e2e}/
│   └── README.md
├── shared/
│   ├── schemas/
│   ├── web-scripts/
│   ├── fixtures/
│   └── policy/{windows-direct-allowlist.json,macos-direct-allowlist.json}/
├── tools/release/                   # 簽章、update catalog、發版工具延伸
├── distribution/
│   ├── windows/{nsis,signing,README.md}/
│   ├── macos/{signing,notarize,README.md}/
│   └── catalogs/
├── scripts/
│   ├── desktop-build.ps1
│   ├── desktop-build.sh
│   ├── desktop-test.ps1
│   └── desktop-test.sh
└── docs/cross-platform/
    ├── DESKTOP-ADR.md
    ├── DESKTOP-SECURITY.md
    ├── DESKTOP-TEST-MATRIX.md
    ├── DESKTOP-LICENSES.md
    ├── WINDOWS-RELEASE.md
    ├── MACOS-RELEASE.md
    ├── PHASE-10-REPORT.md ... PHASE-14-REPORT.md
    └── PHASE_STATUS.md             # 更新到 Phase 0-14
```

**Cargo 工作區的路徑衝突規則**：`desktop/src-tauri` 的 crate 可以用 path dependencies，若使用 `rust/Cargo.toml` 當 workspace root，需明確確認 Cargo workspace membership 及 `target` 共用目錄，不要建立互相衝突的 nested workspaces；在 Phase 10 用 `cargo metadata` 驗證唯一來源。

### 26.2 開發命令（意圖級；指令精確性以實測與 README 為準）

```powershell
# Windows / PowerShell（根目錄）
cd desktop
pnpm install --frozen-lockfile
pnpm lint
pnpm test
pnpm tauri dev
pnpm tauri build --bundles nsis
# 預期輸出：Windows NSIS setup.exe，並核對輸出目錄及簽章
```

```bash
# macOS / bash-zsh（根目錄）
cd desktop
pnpm install --frozen-lockfile
pnpm lint
pnpm test
pnpm tauri dev
pnpm tauri build --bundles app,dmg
# 正式版再進行 Developer ID codesign + notarytool + stapler + Gatekeeper smoke test
```

上述 `pnpm tauri` 需先正確安裝 Tauri CLI/插件、pin dependency 與 Rust toolchain；對可能隨版變更的 CLI flags，Phase 10 必須用 `tauri build --help` 和 build log 修正 README，不能硬套示例。

### 26.3 CI Pipeline（必要）

```text
PR: rust-test, schema-contract-test, desktop-ts-lint-test,
    Windows Tauri compile + smoke, macOS Tauri compile + smoke

Tag Release: validate signed catalog + source policy
   ├─ windows-latest x64: release build → approved sidecars → Authenticode
   │   → NSIS exe → code sign verify → updater sign → SHA256 → upload staging
   ├─ macos-latest arm64: release build → codesign all nested binaries
   │   → Hardened Runtime → notarytool → staple → dmg → update artifact sign
   │   → Gatekeeper smoke → SHA256 → upload staging
   └─ optional: macOS Intel runner/build (if available/tested)

Promote: asset inventory + integration tests + signature verification
     → signed catalog immutable publish → stable rollout 5%→25%→100%
     → rollback/kill-switch only in approved release metadata
```

- CI Secrets：Windows signing cert / password / HSM、Apple Developer ID / App Store Connect API / notary profile、Tauri updater private key、catalog signer private key，**一律 CI secret manager**，不進 GitHub repo、spec、diagnostics 或 release manifests。
- Build matrix for app `os + arch + channel + appVersion + coreApiVersion + packageSchemaVersion`，不能因桌面建置把 Android/iOS runner 改壞。
- smoke：UI 起動/關閉、檔案選擇、影片起播、進度續播、打開瀏覽器、資料包更新/回滾、更新簽名錯誤、sidecar 缺檔、OS 版本/權限、離線啟動。CI 環境不能完成的 GPU/實體 macOS 影片測試必須落 QA 矩陣且保持 `NOT_VERIFIED`。
- 最低 release 產物附 checksums / license report / SBOM / source commit SHA / build commands / tests / known limitations。

## 27. Desktop 安全/性能/故障驗收矩陣

| ID | 驗收 | Windows | macOS | 判定 |
|---|---|---|---|---|
| DESK-001 | 開啟安裝器安裝並啟動主介面 | P0 | N/A | 真實 VM/PC PASS |
| DESK-002 | 拖 `.dmg` 安裝 `.app`，Gatekeeper 正常啟動 | N/A | P0/P1 | 真實 Mac PASS |
| DESK-003 | 本地 MP4/HTTP Range 播放、Seek、暫停、續播 | P0 | P0 | 記錄影片 fixture/time |
| DESK-004 | 開啟 1,000 個 mock 媒體索引不卡死 UI | P1 | P1 | benchmark 數據、不宣稱固定 FPS |
| DESK-005 | WebView2/WKWebView 來源偵測、不信任頁無 Tauri 系統權限 | P1 | P1 | host permission negative tests |
| DESK-006 | 合法站點資料包更新/驗簽/回滾 | P1 | P1 | stale/signed/tampered fixtures |
| DESK-007 | 下載中網路斷線/重啟/磁碟不足/ETag 變化 | P1 | P1 | 無 corrupt 完成檔 |
| DESK-008 | HTTP/WebDAV NAS、有效 Range Seek、跨主機 redirect 不洩密 | P1 | P1 | 測試服務 + 異常狀態 |
| DESK-009 | 更新簽章錯誤/舊 catalog replay/架構不合 | P1 | P1 | 全拒絕且不傷舊資料 |
| DESK-010 | 影片/下載進行中更新 App，可暫緩並安全復原 | P1 | P1 | 真實安裝生命週期 |
| DESK-011 | sidecar crash/消失 / 版本不符 / 未簽可執行檔 | P0/P1 | P0/P1 | 使用者可診斷，無孤兒進程 |
| DESK-012 | 多顯示器/HiDPI/Retina、快捷鍵、無障礙基本功能 | P1 | P1 | 手動回歸證據 |
| DESK-013 | Windows 簽章、mac notarization、第三方授權合格 | P1 | P1 | 發佈 gate，不可假通過 |
| DESK-014 | 連續播放 2 小時+、記憶體、CPU/硬解降級 | P2 | P2 | 真實裝置性能報告 |
| DESK-015 | 站點資料包任意可執行檔/惡意規則被拒絕 | P0/P1 | P0/P1 | Rust threat test + integration |

- 每項需 `PASS / FAIL / BLOCKED_ENV / NOT_VERIFIED`、測試版本、系統 OS build、硬體 CPU/GPU、fixture source、開發 commit、執行指令/截圖/日誌。
- 不能拿 Windows build 成功取代 macOS 端到端驗收，也不能拿 Tauri window 顯示成功取代 MPV codec/seek 驗收。
- 效能目標為**建議指標**而非已測成果：冷啟動 p95、載入 1,000 筆列表時間、掃描吞吐、連續播放記憶體、下載 bytes、signed update bytes、sidecar crash recovery、增量包比例；先定 baseline 再定量化門檻並寫 `DESKTOP-TEST-MATRIX.md`。

## 28. Codex 新增 Phase 10–14 與問題追蹤清單

> **執行優先序**：沿用前文 Phase 0–9 的安全基礎；桌面可在 Phase 3 Rust 核心穩定後與 iOS 並行，但不能跳過簽署 package/catalog 核心。不論如何**先 Phase 10 實測可建置最小雙平台窗口**，再做大量 UI/播放器。舊章節中的 `0～9` 不再是專案全部階段；專案現在為 `Phase 0～14`。下列每個階段皆按第 11 章 `Phase Gate` 回報。

### Phase 10 — Windows/macOS Desktop Spike & ADR（P0）

**目的**：確認桌面技術、建置、發佈與 MPV 授權可行性，不做假完成的 UI。

**工作**：
1. 讀原本 Phase 0–9 docs、實際 Rust workspace、現有 repo；新建 `desktop/` Tauri v2 React TS baseline 及 Cargo path dependency；鎖 Rust/Node/pnpm/Tauri versions。
2. Windows `pnpm tauri dev` + NSIS x64 build、WebView2 runtime 檢查、主窗口 Tauri command 呼叫 Rust `kurain-core` 健康檢查；macOS 同樣編譯並驗證 `.app` build。
3. MPV sidecar vs libmpv feasibility/license Spike：短片起播、seek、window cleanup、程序啟動與安全 IPC，形成 `DESKTOP-ADR.md`、`DESKTOP-LICENSES.md`，選方案後才進入播放器正式功能。
4. 盤點 Desktop signed updater/codesign/notary/runner/CI 發佈憑證與來源管理，明確 `BLOCKED_ENV` 項目；不要暗中取消 Android 的原本更新方案。
5. 完成最小權限 `capabilities`、禁止 remote page invoke 的反向測試，確保 React 前端與不可信網站 WebView 嚴格分離。

**DoD**：Windows + macOS 各自真實 runner 可編譯最小應用（無 runner 的一方 `BLOCKED_ENV`）；Rust host command 實作/測試、可檢視兩種 release artifacts、設計/風險報告。

### Phase 11 — LocalLibrary + Basic Player（P0）

**工作**：檔案/資料夾 chooser、Rust 背景掃描、SQLite migrations、UI 本地列表/搜尋/排序/拖放、MPV sidecar 本機 H.264/AAC/HTTP Progressive 播放、Seek/暫停/續播/錯誤處理、IPC crash recovery、安全帳密庫 adapter、快捷鍵。

**DoD**：兩 OS 上的本機和 HTTP 影片從 UI 點擊到播放器操作閉環；連續啟動/關閉、player crash/重啟不破壞歷史；DESK-003 PASS。

### Phase 12 — Sources / Web / Remote / Downloads（P1）

**工作**：不信任 WebView 隔離、共用偵測腳本與 Rust 解析、站點瀏覽/資料包更新與 rollback、WebDAV/HTTP 瀏覽/Seek、桌面下載 SQLite worker、進度重啟續傳、secure stream gateway；SMB/FTP/SFTP 要真實測試後再開旗標。

**DoD**：DESK-005～008/015 規格要求通過；來源認證不能出現在 shell args / 日誌，未授權來源給明確錯誤。

### Phase 13 — Windows EXE / macOS DMG 安裝與安全更新（P1）

**工作**：NSIS `setup.exe`，macOS `.app/.dmg`，x64/arm64 variants、WebView2 runtime、sidecar packing/licensing、Windows Authenticode、Apple codesign/notarytool/staple、Tauri updater signed metadata、下載暫緩/更新關閉 worker/健康回報、mac/Windows CI signing；先發 complete updater artifact，不暗許 binary delta。

**DoD**：乾淨 Windows PC 可執行 setup.exe 升版且保留設定；乾淨 macOS 安裝簽章/公證後 `.app` 啟動且可更新；非簽更新全拒絕、更新 bytes 可統計。缺 signing 就標 `BLOCKED_SIGNING` 並保留測試包。

### Phase 14 — QA、效能、正式跨四平台協作驗收（P1/P2）

**工作**：Android 1.4.0 no-regression + iOS 狀態重新核對、桌面 release matrix、各平台資料包 schema 相容、分發 policy/security/license 審查、長時間播放/下載/多次更新壓力測試、運維 rollback/runbook、維護 `PHASE_STATUS.md`。

**DoD**：實際通過的項目 PASS、未測明確標記；Release bundles／updater artifacts／checksums／SBOM／signed catalogs 可由 CI/release scripts 重現。

### Issue 任務追蹤（建議）

| ID | Phase | P | Work Item | Acceptance |
|---|---|---|---|---|
| KV-026 | 10 | P0 | Tauri/React bootstrap + Rust direct crate | Win/mac dev build |
| KV-027 | 10 | P0 | desktop capability model + untrusted page security | deny malicious invoke |
| KV-028 | 10 | P0 | MPV sidecar/license feasibility | signed source + playback Spike |
| KV-029 | 11 | P0 | local library scan/cache/database | 1,000 mock file test |
| KV-030 | 11 | P0 | desktop player state, seek, subtitle base | Win/mac playback smoke |
| KV-031 | 11 | P0 | launch/file association/drag/drop/shortcuts | UI E2E |
| KV-032 | 12 | P1 | website candidates + signed packages | security/parity tests |
| KV-033 | 12 | P1 | WebDAV + RemoteStreamGateway | Range/credentials tests |
| KV-034 | 12 | P1 | durable download worker/restore | resume + crash recovery |
| KV-035 | 13 | P1 | Win NSIS + WebView2 + signature | clean Win install |
| KV-036 | 13 | P1 | mac dmg/app + notarization | Gatekeeper enabled Mac |
| KV-037 | 13 | P1 | Tauri signed updater + channel catalog | invalid signature rejected |
| KV-038 | 14 | P1 | CI matrix/release reports/SBOM | reproducible build evidence |
| KV-039 | 14 | P2 | performance/codec regression/full matrix | measured report |

## 29. Codex 直接使用指令、驗收總表與參考來源

### 29.1 直接貼給 Codex 的啟動指令（全平台）

```text
請以 `KurainVideo-v2.1-CODEX-SPEC.md` 作為唯一主開發規格：
- Part I（第 0–17 章）為 Android 1.4.0 保護、iOS、Rust 核心、
  安全資料包與 Android 差異更新的原始完整規格；
- Part II（第 18–29 章）新增 Windows + macOS 桌面版，
  Windows 使用 Tauri 2 + Rust + React TS 包成 NSIS setup.exe，
  macOS 使用同一套 Tauri UI 包成簽章並公證的 .app/.dmg。

先盤點實際專案與 Phase 0–9 report，根據先前完成進度挑選
最早未完成的 phase；若 Rust shared core 足夠成熟，同步執行
Phase 10 desktop spike，再逐步 Phase 11–14。
不可重建既有 Android app/、不可破壞下載歷史/套件功能。

不要只寫計畫：每回合完成該 Phase 的實際程式碼、
可執行測試、build 指令、變更清單、驗收結果、
BLOCKED_ENV / BLOCKED_SIGNING、rollback 與文件更新。
對沒有 Mac/Xcode/Apple Developer ID/Windows signing cert/正式
mpv 授權的項目保持未通過，不要捏造 PASS。

絕不可做遠端可執行模組熱更新、DRM/登入驗證繞過或未授權下載。
Windows 的 exe 與 installer exe 區分清楚；不要宣稱沒有 sidecar
或依賴時可做單檔 portable exe。桌面原生更新先用 Tauri signed
updater + full artifact，資料包才使用獨立簽署更新與回滾。
```

### 29.2 Windows/macOS 最終增加驗收 Checklist

- [ ] `desktop/` 是同一份 React/TS UI，沒有 Windows/macOS 各寫一套前端。
- [ ] Rust 與 Android/iOS 共用一份 crates 原始碼；桌面 Rust 直接依賴 crates，無一套重複核心。
- [ ] Windows x64 交付可執行的 `setup.exe`，安裝後 `KurainVideo.exe` 起動；WebView2 依賴處理正確。
- [ ] macOS arm64 交付 `.app` / `.dmg`，Gatekeeper 已開啟環境能啟動；簽章 + notarization 可證明。
- [ ] local/HTTP 播放與歷史可用；sidecar 執行、安全 IPC、權限與授權報告具證據。
- [ ] 五個主入口可用並能以桌面交互操作，不使用觸控行動版 UI 硬套桌面。
- [ ] 網頁為不可信環境，不能任意 Tauri invoke/filesystem/shell。
- [ ] 站點資料包與 Android/iOS 使用同版 Rust rules/schema/catalog；無可執行熱更新。
- [ ] Tauri updater 獨立簽章驗證、五渠道 policy 正確，App 更新前暫緩下載工作。
- [ ] 文件與 CI 提供 Win/mac runner、build log、SBOM/licenses、checksum、rollback 手冊；無環境時明確標記。

### 29.3 官方工程參考（2026-10-14 核對，後續以開發時官方最新版為準）

- Tauri v2 Windows Installer / NSIS MSI： https://v2.tauri.app/distribute/windows-installer/
- Tauri v2 macOS `.app` bundle： https://v2.tauri.app/distribute/macos-application-bundle/
- Tauri v2 `.dmg`： https://v2.tauri.app/distribute/dmg/
- Tauri v2 Updater（必須產生/驗證 artifact signature）： https://v2.tauri.app/plugin/updater/
- Tauri v2 capabilities / remote-webview 權限： https://v2.tauri.app/security/capabilities/
- Microsoft WebView2 Runtime distribution： https://learn.microsoft.com/microsoft-edge/webview2/concepts/distribution
- Apple Notarization（Developer ID、Hardened Runtime、notarytool）： https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution
- mpv Copyright/license（GPL/LGPL 條件視精確 build 與 linked libraries）： https://github.com/mpv-player/mpv/blob/master/Copyright

### 29.4 舊章節與 v2.1 一致性規則

1. 原 `1.2`、`2`、`12.1` 章只畫 Android/iOS，**現在加上本 Part II 的 Windows/macOS，四平台採同一 Rust 核心**；其餘與 Part II 不衝突的要求繼續有效。
2. 原 `2.5`、`9B`、`9F` 三個發布渠道，現在擴增為五個；`windowsDirect/macosDirect` 不套 iOS App Store 或 Android APK updater 的規則；資料包仍限靜態宣告。
3. 原 `11` 章 Phase 0–9 與 Issue KV-001～KV-025 完整保留，新增 Phase 10–14、KV-026～KV-039；後續所有進度總表、CI 與報告必須以 Phase 0–14 表示。
4. 原 `15` 章 Codex 首次開發指令仍可用（偏手機版本），**新全平台 Codex 應用本章 29.1**。本章不能因缺 Mac CI、簽章或 mpv 合法再發佈前提而提早宣稱四平台完成。
5. 本文件所有路徑/檔名/版本前述舉例若與實際 repo 衝突，先寫 ADR/phase report，再修改腳本與規格；不得由 Codex 偷偷跳過任何平台功能或資料保護要求。

**v2.1 最終產品結論**：Kurain Video 形成四平台產品：Android（Kotlin/Media3）、iOS（SwiftUI/AVPlayer）、Windows（Tauri/React + Rust/desktop player，NSIS `.exe`）、macOS（Tauri/React + Rust/desktop player，`.app/.dmg`），共享 Rust Domain Core、宣告式站點規則與驗證過的資料包更新；原生 App 的安全更新分別按平台發佈與簽章機制處理。規格設計與測試計畫不是已交付產品，只有具實際 build、E2E、簽章與授權驗證的項目才能標 `DONE`。**
