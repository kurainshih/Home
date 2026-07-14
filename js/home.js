"use strict";

const categories = [
    {
        title: "常用入口",
        subtitle: "搜尋、社群與每天會用到的服務",
        icon: "⌁",
        tone: "yellow",
        links: [
            ["Google", "https://www.google.com/"],
            ["Yahoo 奇摩", "https://tw.yahoo.com/"],
            ["PChome 首頁", "https://www.pchome.com.tw/"],
            ["YouTube", "https://www.youtube.com/"],
            ["Facebook", "https://www.facebook.com/"],
            ["Discord", "https://discord.com/channels/@me"],
            ["科技紫微網", "https://astro.click108.com.tw/"],
            ["手機王", "https://www.sogi.com.tw/"]
        ]
    },
    {
        title: "討論社群",
        subtitle: "論壇、同好與經驗分享",
        icon: "◌",
        tone: "orange",
        links: [
            ["伊莉討論區", "https://www07.eyny.com/index.php"],
            ["巴哈姆特", "https://www.gamer.com.tw/"],
            ["Mobile01", "https://www.mobile01.com/forum.php"],
            ["小老婆汽機車資訊網", "https://forum.jorsindo.com/"]
        ]
    },
    {
        title: "信箱與雲端",
        subtitle: "郵件、檔案與照片空間",
        icon: "☁",
        tone: "blue",
        links: [
            ["Gmail", "https://mail.google.com/mail/u/0/#inbox"],
            ["Google Drive", "https://drive.google.com/"],
            ["Dropbox", "https://www.dropbox.com/"],
            ["MEGA", "https://mega.nz/"],
            ["Google 相簿", "https://photos.google.com/"]
        ]
    },
    {
        title: "購物與生活",
        subtitle: "購物、貨運、交通與旅遊",
        icon: "◇",
        tone: "mint",
        links: [
            ["PChome 24h", "https://24h.pchome.com.tw/"],
            ["淘寶網", "https://world.taobao.com/"],
            ["AUTOBUY 自動買", "https://www.autobuy.tw/"],
            ["原價屋", "https://www.coolpc.com.tw/tw/"],
            ["欣亞數位", "https://www.sinya.com.tw/diy/"],
            ["機油倉庫", "https://www.oilwarehouse.com.tw/"],
            ["一路發", "https://www.elf.com.tw/"],
            ["黑貓宅急便", "https://www.t-cat.com.tw/"],
            ["中華郵政郵件查詢", "https://postserv.post.gov.tw/pstmail/main_mail.html"],
            ["台鐵訂票系統", "https://tip.railway.gov.tw/tra-tip-web/tip"],
            ["Klook", "https://www.klook.com/zh-TW/"],
            ["KKday", "https://www.kkday.com/zh-tw/"]
        ]
    },
    {
        title: "數位影音",
        subtitle: "動畫、影音與流行文化",
        icon: "▶",
        tone: "pink",
        links: [
            ["巴哈姆特動畫瘋", "https://ani.gamer.com.tw/"],
            ["動漫花園", "https://share.dmhy.org/"],
            ["Anime1", "https://anime1.me/"],
            ["NHK", "https://www3.nhk.or.jp/"],
            ["ABEMA", "https://abema.tv/"],
            ["第二維度", "https://second-dimension.org/home/"],
            ["ACG Secrets", "https://acgsecrets.hk/"]
        ]
    },
    {
        title: "科技玩家",
        subtitle: "Android、MIUI 與裝置資源",
        icon: "⚙",
        tone: "blue",
        links: [
            ["MIUI Home", "https://home.miui.com/"],
            ["XDA Developers", "https://www.xda-developers.com/"],
            ["小米台灣", "https://www.mi.com/tw/"],
            ["MIUI ROM 專區", "https://mirom.ezbox.idv.tw/"],
            ["MI-Globe", "https://mi-globe.com/"],
            ["MiFirm", "https://mifirm.net/"],
            ["APK.TW", "https://apk.tw/forum.php"]
        ]
    },
    {
        title: "遊戲專區",
        subtitle: "圖鑑、百科與戰績工具",
        icon: "✣",
        tone: "orange",
        links: [
            ["神奇寶貝百科", "https://wiki.52poke.com/wiki/"],
            ["Pokédex 圖鑑", "https://www.pokedex.app/zh/home"],
            ["口袋圖鑑", "https://pokemon.aucy.com/index.php"],
            ["League of Graphs", "https://www.leagueofgraphs.com/zh/tft"]
        ]
    },
    {
        title: "日文學習",
        subtitle: "發音、聲調與語音工具",
        icon: "あ",
        tone: "yellow",
        links: [
            ["OJAD 線上日語聲調辭典", "https://www.gavo.t.u-tokyo.ac.jp/ojad/"],
            ["ReadSpeaker 日本語", "https://readspeaker.jp/"]
        ]
    }
];

const viewLabels = {
    auto: "自動判斷",
    mobile: "手機版",
    tablet: "平板版",
    desktop: "PC 版"
};

const root = document.documentElement;
const categoryGrid = document.querySelector("#categoryGrid");
const emptyState = document.querySelector("#emptyState");
const siteCount = document.querySelector("#siteCount");
const siteFilter = document.querySelector("#siteFilter");
const viewStatus = document.querySelector("#viewStatus");
const viewButtons = [...document.querySelectorAll("[data-view-option]")];
const appsButton = document.querySelector("#googleAppsButton");
const appsMenu = document.querySelector("#googleAppsMenu");

function safeHostname(url) {
    try {
        return new URL(url).hostname.replace(/^www\./, "");
    } catch {
        return "";
    }
}

function makeInitial(name) {
    const match = name.trim().match(/[A-Za-z0-9]|[\u3400-\u9fff]/u);
    return match ? match[0].toUpperCase() : "↗";
}

function createSiteLink([name, url], tone) {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
        return null;
    }

    const link = document.createElement("a");
    link.className = "site-link";
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.dataset.search = `${name} ${safeHostname(url)}`.toLocaleLowerCase("zh-Hant-TW");
    link.style.setProperty("--link-tone", tone);

    const initial = document.createElement("span");
    initial.className = "site-initial";
    initial.textContent = makeInitial(name);
    initial.setAttribute("aria-hidden", "true");

    const copy = document.createElement("span");
    copy.className = "site-copy";

    const title = document.createElement("span");
    title.className = "site-name";
    title.textContent = name;

    const domain = document.createElement("span");
    domain.className = "site-domain";
    domain.textContent = safeHostname(url);

    const arrow = document.createElement("span");
    arrow.className = "site-arrow";
    arrow.textContent = "↗";
    arrow.setAttribute("aria-hidden", "true");

    copy.append(title, domain);
    link.append(initial, copy, arrow);
    return link;
}

function renderDirectory() {
    const fragment = document.createDocumentFragment();
    let validLinkCount = 0;

    for (const category of categories) {
        const card = document.createElement("article");
        card.className = "category-card";
        card.dataset.tone = category.tone;
        card.dataset.category = category.title.toLocaleLowerCase("zh-Hant-TW");

        const header = document.createElement("header");
        header.className = "category-header";

        const icon = document.createElement("span");
        icon.className = "category-icon";
        icon.textContent = category.icon;
        icon.setAttribute("aria-hidden", "true");

        const heading = document.createElement("div");
        heading.className = "category-heading";

        const title = document.createElement("h3");
        title.textContent = category.title;

        const subtitle = document.createElement("p");
        subtitle.textContent = category.subtitle;

        heading.append(title, subtitle);
        header.append(icon, heading);

        const list = document.createElement("div");
        list.className = "link-list";

        for (const item of category.links) {
            const link = createSiteLink(item, category.tone);
            if (link) {
                list.append(link);
                validLinkCount += 1;
            }
        }

        card.append(header, list);
        fragment.append(card);
    }

    categoryGrid.replaceChildren(fragment);
    siteCount.textContent = String(validLinkCount);
}

function filterDirectory(value) {
    const query = value.trim().toLocaleLowerCase("zh-Hant-TW");
    let visibleCards = 0;

    for (const card of categoryGrid.querySelectorAll(".category-card")) {
        const categoryMatches = card.dataset.category.includes(query);
        let visibleLinks = 0;

        for (const link of card.querySelectorAll(".site-link")) {
            const matches = !query || categoryMatches || link.dataset.search.includes(query);
            link.hidden = !matches;
            if (matches) visibleLinks += 1;
        }

        card.hidden = visibleLinks === 0;
        if (visibleLinks > 0) visibleCards += 1;
    }

    emptyState.hidden = visibleCards !== 0;
}

function detectedView() {
    if (window.matchMedia("(max-width: 700px)").matches) return "手機版";
    if (window.matchMedia("(max-width: 1050px)").matches) return "平板版";
    return "PC 版";
}

function updateViewStatus(selectedView) {
    viewStatus.textContent = selectedView === "auto"
        ? `自動 · ${detectedView()}`
        : `${viewLabels[selectedView]} · 手動`;
}

function setView(selectedView, persist = true) {
    if (!(selectedView in viewLabels)) selectedView = "auto";
    root.dataset.view = selectedView;

    for (const button of viewButtons) {
        button.setAttribute("aria-pressed", String(button.dataset.viewOption === selectedView));
    }

    updateViewStatus(selectedView);

    if (persist) {
        try {
            localStorage.setItem("kurain-home-view", selectedView);
        } catch {
            // 隱私模式或 file:// 可能拒絕儲存；版型切換本身仍可使用。
        }
    }
}

function savedView() {
    try {
        return localStorage.getItem("kurain-home-view") || "auto";
    } catch {
        return "auto";
    }
}

function setAppsMenu(open) {
    appsMenu.hidden = !open;
    appsButton.setAttribute("aria-expanded", String(open));
}

renderDirectory();
setView(savedView(), false);

document.querySelector("#updatedDate").textContent = new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit"
}).format(new Date());

for (const button of viewButtons) {
    button.addEventListener("click", () => setView(button.dataset.viewOption));
}

siteFilter.addEventListener("input", () => filterDirectory(siteFilter.value));
siteFilter.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        siteFilter.value = "";
        filterDirectory("");
        siteFilter.blur();
    }
});

appsButton.addEventListener("click", () => {
    setAppsMenu(appsButton.getAttribute("aria-expanded") !== "true");
});

document.addEventListener("click", (event) => {
    if (!event.target.closest(".google-launcher")) setAppsMenu(false);
});

document.addEventListener("keydown", (event) => {
    const activeTag = document.activeElement?.tagName;
    if (event.key === "/" && activeTag !== "INPUT" && activeTag !== "TEXTAREA") {
        event.preventDefault();
        siteFilter.focus();
    }

    if (event.key === "Escape" && appsButton.getAttribute("aria-expanded") === "true") {
        setAppsMenu(false);
        appsButton.focus();
    }
});

window.addEventListener("resize", () => {
    if (root.dataset.view === "auto") updateViewStatus("auto");
});

document.querySelector("#backToTop").addEventListener("click", (event) => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
});
