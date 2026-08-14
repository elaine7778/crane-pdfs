(() => {
  const data = window.CRANE_DATA;
  const root = document.getElementById("root");
  if (!data || !root) throw new Error("塔机数据或页面根节点缺失");

  // PDF 源文件地址配置：
  // 本地模式：留空字符串（走 ./pdfs/ 相对路径）
  // 在线模式：填对象存储/GitHub Releases 的根地址，如 "https://example.com/crane-pdfs"
  const PDF_BASE_URL = "https://github.com/elaine7778/crane-pdfs/releases/download/v1.0";

  // PDF 下载访问密码（方案A：网页密码门禁）
  // 用户点击"下载源说明书"时需输入此密码；验证通过后本会话内无需重复输入。
  // 修改此处密码并重新部署即可完成"授权管理"。
  const PDF_ACCESS_PASSWORD = "scg401tadiao";

  const SESSION_PDF_AUTH_KEY = "crane-pdf-auth";

  const isPdfAuthorized = () => sessionStorage.getItem(SESSION_PDF_AUTH_KEY) === "yes";

  // 多通道下载配置（方案2：自动降级）
  // 国内访问 GitHub 直连可能超时，按顺序探测以下通道，选择第一个可用的：
  // 1. 原地址直连（GitHub Releases）
  // 2. ghfast.top 加速镜像
  // 3. gh-proxy.com 加速镜像
  const PDF_CHANNELS = [
    "",                                     // 直连
    "https://ghfast.top/",                  // 镜像1
    "https://gh-proxy.com/",                // 镜像2
  ];
  const CHANNEL_TIMEOUT_MS = 6000;          // 每通道探测超时

  // 智能下载：先同步开空白标签（防弹窗拦截），并行探测各通道，
  // 用最快的通道导航到下载地址；全部超时则直连兜底。
  function smartDownload(url) {
    // 1) 用户手势内同步开标签，保证不被浏览器拦截
    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) {
      // 极端情况弹窗被拦截，退化为当前窗口跳转
      window.location.href = url;
      return;
    }
    // 2) 并行探测，选最快通道
    const candidates = PDF_CHANNELS.map((prefix) => prefix + url);
    let resolved = false;
    let pending = candidates.length;
    const controller = new AbortController();
    const globalTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        win.location.href = url; // 全部超时，直连兜底
      }
    }, CHANNEL_TIMEOUT_MS + 3000);
    const pick = (candidate) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(globalTimer);
      win.location.href = candidate;
    };
    candidates.forEach((candidate) => {
      const timer = setTimeout(() => {
        pending -= 1;
        if (pending <= 0 && !resolved) {
          pick(url); // 所有探测超时，直连兜底
        }
      }, CHANNEL_TIMEOUT_MS);
      fetch(candidate, { method: "HEAD", mode: "no-cors", signal: controller.signal })
        .then(() => {
          clearTimeout(timer);
          pick(candidate);
        })
        .catch(() => {
          clearTimeout(timer);
          pending -= 1;
          if (pending <= 0 && !resolved) {
            pick(url);
          }
        });
    });
  }

  // GitHub Release 资产名映射表：
  // 因 GitHub 资产名不允许中文字符，上传时中文/全角字符被替换为点号。
  // 此映射把网页数据中的原始文件名（中文）解析为 GitHub 上的实际文件名。
  const PDF_NAME_MAP = {"科曼萨CM160 ES51配置（平头）.pdf":"CM160.ES51.pdf","H6012-6A-138ZW+b（2014）.pdf":"H6012-6A-138ZW+b.2014.pdf","JST6513正文-2020.07.pdf":"JST6513.-2020.07.pdf","JST6516正文B.pdf":"JST6516.B.pdf","JST7022使用说明书正文-2020.6.27.pdf":"JST7022.-2020.6.27.pdf","JST7530使用说明书正文.pdf":"JST7530.pdf","L400-25塔式起重机操作手册.pdf":"L400-25.pdf","L400-25塔机防台风补充说明书（沿海）.pdf":"L400-25-fangtaifeng.pdf","L630-50标准说明书2022-6-27(1).pdf":"L630-50.2022-6-27.1.pdf","L630-50塔机防台风补充说明书（沿海）2022.09.13.pdf":"L630-50.2022.09.13.pdf","QTZ125(H6015-10)(60m独立高度)（2017）.pdf":"QTZ125.H6015-10.60m.2017.pdf","QTZ125（ZJ6018）说明书（含基础螺栓形式）（2020）.PDF":"QTZ125.ZJ6018.2020.PDF","QTZ125（ZJ6019）说明书-JZ（201510）.pdf":"QTZ125.ZJ6019.-JZ.201510.pdf","QTZ160(H6020-10)塔机安装使用说明书.pdf":"QTZ160.H6020-10.pdf","虎霸QTZ160(H6020-10)（60M独立高度）.pdf":"QTZ160.H6020-10.60M.pdf","QTZ200(STC7020P).pdf":"QTZ200.STC7020P.pdf","QTZ250(H7020-10).pdf":"QTZ250.H7020-10.pdf","QTZ250(TC7525-16D).pdf":"QTZ250.TC7525-16D.pdf","QTZ315(STC7528).pdf":"QTZ315.STC7528.pdf","QTZ315(W350-20T.pdf":"QTZ315.W350-20T.pdf","QTZ500(W600-25U).pdf":"QTZ500.W600-25U.pdf","QTZ80 XGA6012-6S安装手册（2012）.pdf":"QTZ80.XGA6012-6S.2012.pdf","QTZP160(T6515-10).pdf":"QTZP160.T6515-10.pdf","虎霸QTZp250_T7022-12_塔机安装使用说明书V181002A.pdf":"QTZp250_T7022-12_.V181002A.pdf","QTZP315(T7527-18).pdf":"QTZP315.T7527-18.pdf","R335-16RB产品样本 2022.03.21.pdf":"R335-16RB.2022.03.21.pdf","SFT160(T6518-10).pdf":"SFT160.T6518-10.pdf","ST6015说明书（2008）.pdf":"ST6015.2008.pdf","ST80.116安装说明书.pdf":"ST80.116.pdf","STC100B(6013-8)塔式起重机说明书.pdf":"STC100B.6013-8.pdf","STC125A说明书(第一册).pdf":"STC125A.pdf","STC160B塔式起重机说明书（第一册）-Q17M001-21.5.6.pdf":"STC160B.-Q17M001-21.5.6.pdf","STC250A说明书第1册(全变频版7020)2019.8.30.pdf":"STC250A.1.7020.2019.8.30.pdf","STC600A说明书第一册（19.11.6）.pdf":"STC600A.19.11.6.pdf","STC600A塔式起重机说明书（第二册）.pdf":"STC600A.pdf","STL230-18t塔机安装使用说明书（Z603D).pdf":"STL230-18t.Z603D.pdf","STL230安装使用说明附录.PDF":"STL230.PDF","STT153A-10(65m臂) .pdf":"STT153A-10.65m.pdf","STT200A-10t安装说明3.01.pdf":"STT200A-10t.3.01.pdf","STT253B-12t安装说明书（四川宇鑫60M）.pdf":"STT253B-12t.60M.pdf","STT403-24T 平头塔安装使用说明（2016）.pdf":"STT403-24T.2016.pdf","T1200-64W_操作手册-202008（双小车）_148.pdf":"T1200-64W_.-202008._148.pdf","T6513-8E操作手册-125tm（201611）.pdf":"T6513-8E.-125tm.201611.pdf","T6515-10B 操作手册.pdf":"T6515-10B.pdf","T6520-10E操作手册中文-KA.pdf":"T6520-10E.-KA.pdf","T7020-12KA 操作手册 （新机构08.07）(四川宇鑫).pdf":"T7020-12KA.08.07.pdf","虎霸T7025-10-202104-003.pdf":"T7025-10-202104-003.pdf","虎霸T7535-18-202009-001（杰斯).pdf":"T7535-18-202009-001.pdf","TC5613-6说明书.pdf":"TC5613-6.pdf","TC6015A-10B-131ZW+b（46m独高）.pdf":"TC6015A-10B-131ZW+b.46m.pdf","TC6015A-10E-131ZW+b（60m独高）.pdf":"TC6015A-10E-131ZW+b.60m.pdf","TC6513-8标准中文说明书 (QTZ125)（201807）.pdf":"TC6513-8.QTZ125.201807.pdf","TC7035B-16说明书.pdf":"TC7035B-16.pdf","W350-20HA 操作手册（2020.05.18）(1).pdf":"W350-20HA.2020.05.18.1.pdf","W6013-6A 操作手册（2020）.pdf":"W6013-6A.2020.pdf","W6017-10B 操作手册（20200207）.pdf":"W6017-10B.20200207.pdf","W6017-8B操作手册组合（20200207-KA.pdf":"W6017-8B.20200207-KA.pdf","W6513-8B操作手册（20200707）.pdf":"W6513-8B.20200707.pdf","W6515-10B 操作手册（20200805）.pdf":"W6515-10B.20200805.pdf","W7015-10E操作手册（20200516）.pdf":"W7015-10E.20200516.pdf","W750-40U 操作手册.pdf":"W750-40U.pdf","WA6010-6A 操作手册（ETI 2022版） （20220226）一字型起升.pdf":"WA6010-6A.ETI.2022.20220226.pdf","WA6515-8B操作手册（20211012）一字型起升.pdf":"WA6515-8B.20211012.pdf","WA7025-12E 操作手册 （20210220）.pdf":"WA7025-12E.20210220.pdf","XGA5610-6S使用说明书(第一册 安装手册）.pdf":"XGA5610-6S.pdf","XGA6013-6S 安装手册（2012）.pdf":"XGA6013-6S.2012.pdf","XGT125Ⅳ(6513-8)说明书 45-65m（20181022）.pdf":"XGT125.6513-8.45-65m.20181022.pdf","XGT6010C-6S1使用说明书（第一册：安装手册）(2021).pdf":"XGT6010C-6S1.2021.pdf","XGT6013-6S1说明书（安装手册）1.10（2012）.pdf":"XGT6013-6S1.1.10.2012.pdf","XGT6015A-8S安装手册（2009）.pdf":"XGT6015A-8S.2009.pdf","XGT6015B-8S说明书（2004）.pdf":"XGT6015B-8S.2004.pdf","XGT6515-10S安装手册60.2米（2003）.pdf":"XGT6515-10S.60.2.2003.pdf","XGT6515C-10S使用说明书50.5米（2005）.pdf":"XGT6515C-10S.50.5.2005.pdf","XGT6515E-10S使用说明书（51m）（2011）.pdf":"XGT6515E-10S.51m.2011.pdf","XGT7018-10S安装手册（2002）.pdf":"XGT7018-10S.2002.pdf","XGT7026-12S1使用说明书（第一册：安装手册）（202107）.pdf":"XGT7026-12S1.202107.pdf","XGT7527A-18S说明书（20191026临时版）(1).pdf":"XGT7527A-18S.20191026.1.pdf","XGT7528A-18S1使用说明书（第一册：安装手册）(2).pdf":"XGT7528A-18S1.2.pdf","XGT7530-20说明书.pdf":"XGT7530-20.pdf","XGTT125C(6015L-10).pdf":"XGTT125C.6015L-10.pdf","ZJ7020-10t说明书20190101.pdf":"ZJ7020-10t.20190101.pdf","ZJT7022-12t说明书 20190620.pdf":"ZJT7022-12t.20190620.pdf","ZSL750说明书-四川北路.pdf":"ZSL750.-.pdf","ZTT6010X-6简易版塔式起重机使用说明书.pdf":"ZTT6010X-6.pdf","ZTT6013(40.5米）塔式起重机使用说明书.pdf":"ZTT6013.40.5.pdf","ZTT6513-8塔式起重机使用说明书（L68B3)（2020）.pdf":"ZTT6513-8.L68B3.2020.pdf","ZTT6517-10塔式起重机使用说明书（L69)（2020）.pdf":"ZTT6517-10.L69.2020.pdf","ZTT7023-12塔式起重机使用说明书（2021）.pdf":"ZTT7023-12.2021.pdf"};

  const resolvePdfUrl = (url) => {
    if (!PDF_BASE_URL) return url;
    const filename = url.split("/").pop();
    const actualName = PDF_NAME_MAP[filename] || filename;
    return `${PDF_BASE_URL}/${encodeURIComponent(actualName)}`;
  };

  const money = new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0,
  });

  const state = {
    query: { boom: 70, radius: 60, weight: 3 },
    results: [],
    costOpen: false,
    cost: { duration: 6, billing: "ceil", height: 100, quantity: 1, entryTimes: 1, footing: false },
    libraryFilters: { keyword: "", type: "all" },
    previewModel: null,
    previewFromLibrary: false,
  };

  const escapeHtml = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  function selectedBoom(model, requiredBoom) {
    return model.boomOptions.find((value) => value >= requiredBoom) ?? null;
  }

  function estimatedCapacity(model, radius) {
    const ratedMoment = model.tipLoad * model.maxRadius;
    return Math.min(model.maxLoad, ratedMoment / Math.max(radius, 1));
  }

  function recommend(query) {
    return data.models
      .map((model) => {
        const boom = selectedBoom(model, query.boom);
        if (boom == null || query.radius > boom || query.radius > model.maxRadius) return null;
        const capacity = estimatedCapacity(model, query.radius);
        if (capacity + 1e-9 < query.weight) return null;
        const price = data.priceTable[model.priceKey];
        const margin = ((capacity - query.weight) / query.weight) * 100;
        const score =
          (boom - query.boom) * 0.9 +
          (model.maxRadius - query.radius) * 0.25 +
          Math.max(0, margin - 15) * 0.06 +
          (price?.monthly?.h100 ?? 99999) / 100000;
        return { model, boom, capacity, margin, score };
      })
      .filter(Boolean)
      .sort((a, b) => a.score - b.score);
  }

  function priceAtHeight(price, height) {
    if (height <= 100) return price.monthly.h100 ?? null;
    if (height <= 150) return price.monthly.h150 ?? null;
    if (height <= 200) return price.monthly.h200 ?? null;
    return null;
  }

  function costEstimate(result) {
    const price = data.priceTable[result.model.priceKey];
    const monthly = priceAtHeight(price, state.cost.height);
    if (monthly == null) return null;
    const billedMonths = state.cost.billing === "ceil" ? Math.ceil(state.cost.duration) : state.cost.duration;
    const rent = monthly * billedMonths * state.cost.quantity;
    const entry = price.entry * state.cost.entryTimes * state.cost.quantity;
    const footing = state.cost.footing ? price.footing * state.cost.quantity : 0;
    return { result, price, monthly, billedMonths, rent, entry, footing, total: rent + entry + footing };
  }

  // 自定义 Logo 配置：
  // 在网站根目录放一张 logo 图片（推荐 PNG，透明底，正方形），文件名任意，
  // 修改下方 LOGO_URL 指向它即可。例如 "logo.png" 或 "my-logo.svg"。
  // 留空字符串则显示默认的品牌字母 "T"。
  const LOGO_URL = "logo.png";

  const brandMark = () => LOGO_URL
    ? `<img class="brandMarkImg" src="${escapeHtml(LOGO_URL)}" alt="logo" />`
    : `<span class="brandMark">T</span>`;

  function renderShell() {
    root.innerHTML = `
      <main id="top">
        <header class="topbar">
          <a class="brand" href="#top" aria-label="返回顶部">
            ${brandMark()}
            <span><b>塔机选型台</b><small>TOWER CRANE SELECTOR</small></span>
          </a>
          <nav aria-label="页面导航">
            <a href="#selector">智能选型</a>
            <button id="open-library" type="button">型号库 <span>${data.modelCount}</span></button>
            <button id="open-price" type="button">价格通知</button>
          </nav>
        </header>

        <section class="hero">
          <div class="heroCopy">
            <h1>从 <span>${data.modelCount}</span> 个型号中，<br />找到合适的塔机。</h1>
            <p>输入臂长、最大幅度和最重构件重量，依据说明书起重性能保守预选。</p>
            <div class="heroMeta">
              <div><strong>${data.modelCount}</strong><span>塔机型号</span></div>
              <div><strong>${Object.keys(data.priceTable).length}</strong><span>价格档位</span></div>
            </div>
          </div>
          <div class="craneGraphic" aria-hidden="true">
            <div class="graphicGrid"></div><div class="mast"></div><div class="apex"></div>
            <div class="boomLine"></div><div class="counterBoom"></div>
            <div class="craneRunner">
              <div class="trolley"></div>
              <div class="cable"></div>
              <div class="hook">J</div>
            </div>
            <div class="groundLine"></div>
            <div class="loadZone">
              <div class="box boxW"></div>
              <div class="box boxW"></div>
              <div class="box boxO"></div>
            </div>
          </div>
        </section>

        <section class="selectorWrap" id="selector">
          <div class="sectionIntro">
            <span>01 / 输入工况</span><h2>开始智能选型</h2>
            <p>重量按构件位于输入幅度处进行保守预选，最终必须查看对应性能页复核。</p>
          </div>
          <form class="selector" id="selector-form">
            <label><span class="step">01</span><span class="fieldText"><b>所需臂长</b><small>起重臂工作长度</small></span><span class="inputWrap"><input id="boom" type="number" min="30" max="90" step="0.5" value="70" required /><i>m</i></span></label>
            <label><span class="step">02</span><span class="fieldText"><b>最大幅度</b><small>回转中心至吊点</small></span><span class="inputWrap"><input id="radius" type="number" min="2" max="90" step="0.5" value="60" required /><i>m</i></span></label>
            <label><span class="step">03</span><span class="fieldText"><b>最重构件</b><small>含吊具后的总重量</small></span><span class="inputWrap"><input id="weight" type="number" min="0.1" max="64" step="0.1" value="3" required /><i>t</i></span></label>
            <button class="primaryButton" type="submit"><span>生成推荐方案</span><b>→</b></button>
          </form>
          <p class="formError" id="form-error" hidden></p>
        </section>

        <section class="costPlanner" id="cost-planner">
          <div class="costPlannerHeader">
            <div><span>01B / 费用测算（可选）</span><h2>比较满足工况型号的预计费用</h2><p>月租、进出场费和基础费均沿用集团价格通知档位。</p></div>
            <button class="costToggleButton" id="cost-toggle" type="button" aria-expanded="false"><span>开启费用测算</span><b>＋</b></button>
          </div>
          <div class="costPlannerPanel" id="cost-panel" hidden>
            <div class="costFields">
              <label><span>计划工期（月）</span><input id="cost-duration" type="number" min="0.1" max="120" step="0.1" value="6" /></label>
              <label><span>计费方式</span><select id="cost-billing"><option value="ceil">不足整月按整月</option><option value="actual">按实际月份估算</option></select></label>
              <label><span>安装高度</span><select id="cost-height"><option value="100">≤100m</option><option value="150">101–150m</option><option value="200">151–200m</option></select></label>
              <label><span>设备数量（台）</span><input id="cost-quantity" type="number" min="1" max="20" step="1" value="1" /></label>
              <label><span>进出场次数</span><input id="cost-entry-times" type="number" min="0" max="20" step="1" value="1" /></label>
              <label class="checkField"><input id="cost-footing" type="checkbox" /><span><b>计入基础预埋费</b><small>按每台一次估算</small></span></label>
            </div>
            <p class="costFormula">预计总费用＝月租×计费月数×数量＋进出场费×次数×数量＋基础预埋费（可选）。</p>
          </div>
        </section>

        <section class="resultsSection" id="results"></section>

        <section class="priceSection">
          <div><span>03 / 价格依据</span><h2>价格有出处，匹配有说明</h2></div>
          <p>价格表代表型号直接采用对应档位；表中没有的型号，按额定级别、塔机类型、最大幅度、最大起重量及臂端起重量匹配最接近档位。</p>
          <button id="open-price-bottom" type="button">预览价格通知原件 <b>↗</b></button>
        </section>

        <footer><div class="brand footerBrand">${brandMark()}<span><b>塔机选型台</b><small>内部选型辅助工具</small></span></div><p>数据来源：塔机说明书及集团机械内部租赁价格通知</p></footer>
      </main>
      <div id="modal-root"></div>
    `;
  }

  function resultsHeader() {
    const count = state.results.length;
    return `
      <div class="resultHeader">
        <div><span>02 / 推荐结果</span><h2>${count ? `找到 ${count} 个可选型号` : "暂无满足条件的型号"}</h2></div>
        <div class="queryPills"><span>臂长 ${state.query.boom}m</span><span>幅度 ${state.query.radius}m</span><span>构件 ${state.query.weight}t</span></div>
      </div>`;
  }

  function resultCard(item, index) {
    const { model } = item;
    const price = data.priceTable[model.priceKey];
    const estimate = state.costOpen ? costEstimate(item) : null;
    return `
      <article class="resultCard ${index === 0 ? "best" : ""}" data-model="${escapeHtml(model.model)}">
        <div class="rank"><span>${String(index + 1).padStart(2, "0")}</span>${index === 0 ? "<b>优先推荐</b>" : ""}</div>
        <div class="modelRow"><div><small>${escapeHtml(model.type)}塔机</small><h3>${escapeHtml(model.model)}</h3></div><span class="${model.priceBasis === "价格表代表型号" ? "exact" : "matched"}">${escapeHtml(model.priceBasis)}</span></div>
        <div class="capacityHero"><span>预选工况能力</span><strong>${item.capacity.toFixed(2)}<i>t</i></strong><div class="capacityBar"><span style="width:${Math.min(100, (state.query.weight / item.capacity) * 100)}%"></span></div><small>需求 ${state.query.weight}t · 估算余量 ${item.margin.toFixed(0)}%</small><div class="independentHeight ${model.maxIndependentHeight ? "" : "na"}"><span>最大独立高度（仅供参考）</span><b>${model.maxIndependentHeight ? `${model.maxIndependentHeight.toFixed(1)}<i>m</i>` : "—"}</b></div></div>
        <dl class="specGrid"><div><dt>建议臂长</dt><dd>${item.boom} m</dd></div><div><dt>最大幅度</dt><dd>${model.maxRadius} m</dd></div><div><dt>整机最大吊重</dt><dd>${model.maxLoad} t</dd></div><div><dt>最大臂端吊重</dt><dd>${model.tipLoad} t</dd></div></dl>
        <div class="priceStrip"><div><span>≤100m 月租参考</span><strong>${money.format(price.monthly.h100)}</strong><small>不含税</small></div><p>匹配 ${escapeHtml(price.label)}<br />参照 ${escapeHtml(model.priceReference)}</p></div>
        ${state.costOpen ? `<div class="costEstimateStrip"><span>预计总费用 · 不含税</span>${estimate ? `<strong>${money.format(estimate.total)}</strong><small>${estimate.billedMonths}个月 × ${state.cost.quantity}台 · 月租 ${money.format(estimate.monthly)} · 进出场 ${money.format(estimate.entry)}${state.cost.footing ? ` · 基础 ${money.format(estimate.footing)}` : ""}</small>` : `<strong>暂无该高度月租标准</strong>`}</div>` : ""}
        <button class="previewButton" type="button"><span>${model.previewPages.length ? `查看全部 ${model.previewPages.length} 页性能资料` : "查看源说明书（未检出完整性能表）"}</span><b>↗</b></button>
      </article>`;
  }

  function costComparison() {
    if (!state.costOpen || !state.results.length) return "";
    const estimates = state.results.slice(0, 12).map(costEstimate).filter(Boolean).sort((a, b) => a.total - b.total);
    if (!estimates.length) return `<div class="costComparison"><h3>当前安装高度暂无可比价格</h3></div>`;
    return `
      <section class="costComparison">
        <div class="comparisonHeader"><div><span>费用对比 / 当前推荐型号</span><h3>按预计总费用从低到高排列</h3></div><button id="print-cost" type="button">打印费用对比</button></div>
        <div class="comparisonMeta"><span>工期 ${state.cost.duration}个月</span><span>高度 ${state.cost.height}m</span><span>${state.cost.quantity}台 · 进出场${state.cost.entryTimes}次</span></div>
        <div class="tableScroll"><table><thead><tr><th>型号</th><th>价格档位</th><th>月租</th><th>租金</th><th>进出场费</th><th>基础费</th><th>预计总费用</th></tr></thead><tbody>${estimates.map((item) => `<tr><td>${escapeHtml(item.result.model.model)}</td><td>${escapeHtml(item.price.label)}</td><td>${money.format(item.monthly)}</td><td>${money.format(item.rent)}</td><td>${money.format(item.entry)}</td><td>${state.cost.footing ? money.format(item.footing) : "未计入"}</td><td><strong>${money.format(item.total)}</strong></td></tr>`).join("")}</tbody></table></div>
      </section>`;
  }

  function renderResults() {
    const container = document.getElementById("results");
    container.innerHTML = resultsHeader();
    if (!state.results.length) {
      container.innerHTML += `<div class="emptyState"><strong>没有找到同时满足三个参数的机型</strong><p>建议降低最大幅度或构件重量，或在型号库中直接查阅说明书。</p><a href="#selector">返回修改参数</a></div>`;
    } else {
      container.innerHTML += `<div class="resultGrid">${state.results.slice(0, 12).map(resultCard).join("")}</div>`;
    }
    container.innerHTML += costComparison();
    container.innerHTML += `<div class="safetyNote"><span>!</span><p><b>重要说明：</b>系统按最大吊重与臂端吊重进行保守预选。最终方案必须打开对应性能页，按实际臂长、倍率、幅度、起升高度和吊具重量复核。</p></div>`;
    container.querySelectorAll(".resultCard").forEach((card) => {
      card.querySelector(".previewButton").addEventListener("click", () => {
        const model = data.models.find((item) => item.model === card.dataset.model);
        openPreview(model, false);
      });
    });
    document.getElementById("print-cost")?.addEventListener("click", () => window.print());
  }

  function libraryModels() {
    const keyword = state.libraryFilters.keyword.trim().toLowerCase();
    return data.models.filter((model) => {
      const keywordMatch = !keyword || model.model.toLowerCase().includes(keyword) || model.documents.some((doc) => doc.name.toLowerCase().includes(keyword));
      const typeMatch = state.libraryFilters.type === "all" || model.type === state.libraryFilters.type;
      return keywordMatch && typeMatch;
    });
  }

  function libraryListHTML(models) {
    return {
      count: `当前显示 ${models.length} 个型号`,
      list: models.map((model) => `<button type="button" data-model="${escapeHtml(model.model)}"><span><b>${escapeHtml(model.model)}</b><small>${model.maxRadius}m · ${model.maxLoad}t · ${escapeHtml(data.priceTable[model.priceKey].label)}</small></span><i>${model.previewPages.length ? `${model.previewPages.length}页性能资料` : "查看源说明书"} ↗</i></button>`).join("")
    };
  }

  function openLibrary() {
    const models = libraryModels();
    document.getElementById("modal-root").innerHTML = `
      <div class="modalBackdrop" id="library-backdrop">
        <section class="libraryModal" role="dialog" aria-modal="true" aria-label="全部塔机型号">
          <header><div><span>型号资料库</span><h2>${data.modelCount} 个塔机型号</h2><p>点击型号可查看全部性能页并下载源说明书。</p></div><button class="closeModal" type="button" aria-label="关闭型号库">×</button></header>
          <div class="libraryFilters"><input id="library-search" type="search" placeholder="搜索型号或说明书文件名" value="${escapeHtml(state.libraryFilters.keyword)}" /><select id="library-type"><option value="all">全部塔机类型</option><option value="平臂" ${state.libraryFilters.type === "平臂" ? "selected" : ""}>平臂塔机</option><option value="动臂" ${state.libraryFilters.type === "动臂" ? "selected" : ""}>动臂塔机</option></select></div>
          <div class="libraryCount" id="library-count">当前显示 ${models.length} 个型号</div>
          <div class="libraryList" id="library-list">${models.map((model) => `<button type="button" data-model="${escapeHtml(model.model)}"><span><b>${escapeHtml(model.model)}</b><small>${model.maxRadius}m · ${model.maxLoad}t · ${escapeHtml(data.priceTable[model.priceKey].label)}</small></span><i>${model.previewPages.length ? `${model.previewPages.length}页性能资料` : "查看源说明书"} ↗</i></button>`).join("")}</div>
        </section>
      </div>`;
    const modalRoot = document.getElementById("modal-root");
    modalRoot.querySelector(".closeModal").addEventListener("click", closeModal);
    modalRoot.querySelector("#library-backdrop").addEventListener("mousedown", (event) => { if (event.target.id === "library-backdrop") closeModal(); });
    modalRoot.querySelectorAll("#library-list button").forEach((button) => button.addEventListener("click", () => openPreview(data.models.find((model) => model.model === button.dataset.model), true)));
    const applyFilters = () => {
      state.libraryFilters.keyword = document.getElementById("library-search").value;
      state.libraryFilters.type = document.getElementById("library-type").value;
      const filtered = libraryModels();
      const html = libraryListHTML(filtered);
      document.getElementById("library-count").textContent = html.count;
      document.getElementById("library-list").innerHTML = html.list;
      document.getElementById("modal-root").querySelectorAll("#library-list button").forEach((button) => button.addEventListener("click", () => openPreview(data.models.find((model) => model.model === button.dataset.model), true)));
    };
    modalRoot.querySelector("#library-search").addEventListener("input", applyFilters);
    modalRoot.querySelector("#library-type").addEventListener("change", applyFilters);
  }

  function openPreview(model, fromLibrary) {
    if (!model) return;
    state.previewModel = model;
    state.previewFromLibrary = fromLibrary;
    const modalRoot = document.getElementById("modal-root");
    modalRoot.innerHTML = `
      <div class="modalBackdrop" id="preview-backdrop">
        <section class="previewModal" role="dialog" aria-modal="true" aria-label="${escapeHtml(model.model)}说明书预览">
          <header><div><span>${escapeHtml(model.type)}塔机</span><h2>${escapeHtml(model.model)}</h2><p>${model.previewPages.length ? `共 ${model.previewPages.length} 页起重性能资料` : "说明书中未检出可确认的完整起重性能表"}</p></div><div class="previewHeaderActions">${fromLibrary ? `<button id="back-library" type="button">← 返回型号库</button>` : ""}<button class="closeModal" type="button" aria-label="关闭预览">×</button></div></header>
          <div class="previewSpecs"><span>最大幅度 <b>${model.maxRadius}m</b></span><span>最大吊重 <b>${model.maxLoad}t</b></span><span>最大臂端 <b>${model.tipLoad}t</b></span><span>价格匹配 <b>${escapeHtml(data.priceTable[model.priceKey].label)}</b></span></div>
          <div class="manualCanvas manualPages">${model.previewPages.length ? model.previewPages.map((entry, index) => `<figure><figcaption>起重性能 ${index + 1} / ${model.previewPages.length} · PDF第 ${entry.page} 页</figcaption><img src="${escapeHtml(entry.image)}" alt="${escapeHtml(model.model)}说明书第${entry.page}页" loading="${index < 2 ? "eager" : "lazy"}" /></figure>`).join("") : `<div class="emptyState"><strong>未找到可确认的完整起重性能表</strong><p>当前文件可能仅为安装说明书。请下载源PDF，向厂家索取正式起重性能资料后再选型。</p></div>`}</div>
          <footer><p>请放大查看臂长—幅度—起重量表，并结合实际倍率、吊具及起升高度复核。</p><div class="previewActions">${model.documents.map((document, index) => { const url = escapeHtml(resolvePdfUrl(document.url)); const name = `${model.documents.length > 1 ? `在新标签页打开/下载资料${index + 1}：` : "在新标签页打开/下载源说明书："}${escapeHtml(document.name)}`; return PDF_ACCESS_PASSWORD ? `<span class="pdfDownloadItem"><a href="${url}" target="_blank" rel="noopener noreferrer" data-pdf-url="${url}" data-pdf-authorized="false" class="pdfProtected">${name}<i class="pdfLock">🔒</i></a></span>` : `<a href="${url}" target="_blank" rel="noopener noreferrer">${name}</a>`; }).join("")}</div></footer>
        </section>
      </div>`;
    modalRoot.querySelector(".closeModal").addEventListener("click", closeModal);
    modalRoot.querySelector("#preview-backdrop").addEventListener("mousedown", (event) => { if (event.target.id === "preview-backdrop") closeModal(); });
    modalRoot.querySelector("#back-library")?.addEventListener("click", openLibrary);

    if (PDF_ACCESS_PASSWORD) {
      const alreadyAuthorized = isPdfAuthorized();
      modalRoot.querySelectorAll("a.pdfProtected").forEach((link) => {
        if (alreadyAuthorized) {
          link.dataset.pdfAuthorized = "true";
          link.querySelector(".pdfLock")?.remove();
        } else {
          link.addEventListener("click", (event) => {
            event.preventDefault();
            promptPdfPassword(link);
          });
        }
      });
    }
  }

  function promptPdfPassword(link) {
    if (isPdfAuthorized()) {
      link.dataset.pdfAuthorized = "true";
      link.querySelector(".pdfLock")?.remove();
      smartDownload(link.dataset.pdfUrl);
      return;
    }
    const modalRoot = document.getElementById("modal-root");
    const existing = modalRoot.querySelector("#pdf-password-box");
    if (existing) existing.remove();
    const box = document.createElement("div");
    box.id = "pdf-password-box";
    box.className = "pdfPasswordBox";
    box.innerHTML = `
      <div class="pdfPasswordInner">
        <b>输入访问密码下载源说明书</b>
        <small>请联系管理员获取 PDF 下载密码</small>
        <input id="pdf-password-input" type="password" placeholder="请输入下载密码" autocomplete="off" />
        <p id="pdf-password-error" class="pdfPasswordError" hidden>密码错误，请重试</p>
        <div class="pdfPasswordActions">
          <button id="pdf-password-cancel" type="button">取消</button>
          <button id="pdf-password-confirm" type="button">确认下载</button>
        </div>
      </div>`;
    const previewActions = link.closest(".previewActions");
    previewActions.appendChild(box);
    const input = box.querySelector("#pdf-password-input");
    input.focus();
    const confirm = () => {
      if (input.value === PDF_ACCESS_PASSWORD) {
        sessionStorage.setItem(SESSION_PDF_AUTH_KEY, "yes");
        box.remove();
        link.dataset.pdfAuthorized = "true";
        link.querySelector(".pdfLock")?.remove();
        showChannelPicker(link.dataset.pdfUrl);
      } else {
        box.querySelector("#pdf-password-error").hidden = false;
        input.value = "";
        input.focus();
      }
    };
    box.querySelector("#pdf-password-confirm").addEventListener("click", confirm);
    box.querySelector("#pdf-password-cancel").addEventListener("click", () => box.remove());
    input.addEventListener("keydown", (event) => { if (event.key === "Enter") confirm(); });
  }

  // 通道选择：密码通过后展示可用的下载通道，自动推荐最快的一个
  function showChannelPicker(url) {
    const modalRoot = document.getElementById("modal-root");
    const existing = modalRoot.querySelector("#pdf-channel-box");
    if (existing) existing.remove();
    const box = document.createElement("div");
    box.id = "pdf-channel-box";
    box.className = "pdfChannelBox";
    const labels = ["最快通道（自动检测）", "镜像 ghfast.top", "镜像 gh-proxy.com", "GitHub 直连"];
    const urls = [null, ...PDF_CHANNELS.slice(1).map((p) => p + url), url];
    const tags = ["推荐", "镜像", "镜像", "国内可能超时"];
    box.innerHTML = `
      <div class="pdfChannelInner">
        <b>选择下载通道</b>
        <small>推荐点"最快通道"，国内直连 GitHub 通常会超时</small>
        <div class="pdfChannelList">
          ${urls
            .map(
              (u, i) => `<button class="pdfChannelBtn${i === 3 ? " danger" : ""}${i === 0 ? " primary" : ""}" type="button" data-url="${u || ""}" data-auto="${u ? "0" : "1"}"><span>${labels[i]}</span><em>${tags[i]}</em></button>`
            )
            .join("")}
        </div>
        <button class="pdfChannelCancel" type="button">取消</button>
      </div>`;
    modalRoot.appendChild(box);
    const close = () => box.remove();
    box.querySelectorAll(".pdfChannelBtn").forEach((btn) => {
      btn.addEventListener("click", () => {
        close();
        if (btn.dataset.auto === "1") {
          smartDownload(url);
        } else {
          window.open(btn.dataset.url, "_blank", "noopener,noreferrer");
        }
      });
    });
    box.querySelector(".pdfChannelCancel").addEventListener("click", close);
  }

  function openPrice() {
    const modalRoot = document.getElementById("modal-root");
    modalRoot.innerHTML = `
      <div class="modalBackdrop" id="price-backdrop"><section class="priceModal" role="dialog" aria-modal="true" aria-label="集团机械租赁价格通知预览"><header><div><span>价格依据</span><h2>关于调整集团机械租赁价格的通知</h2><p>共2页 · 价格测算按通知档位执行</p></div><button class="closeModal" type="button" aria-label="关闭预览">×</button></header><div class="pricePages"><img src="./manuals/price-notice-p1.webp" alt="价格通知第1页" /><img src="./manuals/price-notice-p2.webp" alt="价格通知第2页" /></div></section></div>`;
    modalRoot.querySelector(".closeModal").addEventListener("click", closeModal);
    modalRoot.querySelector("#price-backdrop").addEventListener("mousedown", (event) => { if (event.target.id === "price-backdrop") closeModal(); });
  }

  function closeModal() {
    document.getElementById("modal-root").replaceChildren();
    state.previewModel = null;
  }

  function bindEvents() {
    document.getElementById("selector-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const query = {
        boom: Number(document.getElementById("boom").value),
        radius: Number(document.getElementById("radius").value),
        weight: Number(document.getElementById("weight").value),
      };
      const error = document.getElementById("form-error");
      if (!query.boom || !query.radius || !query.weight) {
        error.textContent = "请完整填写臂长、最大幅度和最重构件重量。";
        error.hidden = false;
        return;
      }
      if (query.radius > query.boom) {
        error.textContent = "最大幅度不能大于所需臂长，请核对输入。";
        error.hidden = false;
        return;
      }
      error.hidden = true;
      state.query = query;
      state.results = recommend(query);
      renderResults();
      document.getElementById("results").scrollIntoView({ behavior: "smooth" });
    });
    document.getElementById("open-library").addEventListener("click", openLibrary);
    document.getElementById("open-price").addEventListener("click", openPrice);
    document.getElementById("open-price-bottom").addEventListener("click", openPrice);
    document.getElementById("cost-toggle").addEventListener("click", () => {
      state.costOpen = !state.costOpen;
      const panel = document.getElementById("cost-panel");
      panel.hidden = !state.costOpen;
      const button = document.getElementById("cost-toggle");
      button.setAttribute("aria-expanded", String(state.costOpen));
      button.querySelector("span").textContent = state.costOpen ? "收起费用条件" : "开启费用测算";
      button.querySelector("b").textContent = state.costOpen ? "−" : "＋";
      renderResults();
    });
    const costBindings = {
      "cost-duration": ["duration", Number], "cost-billing": ["billing", String], "cost-height": ["height", Number],
      "cost-quantity": ["quantity", Number], "cost-entry-times": ["entryTimes", Number], "cost-footing": ["footing", (element) => element.checked],
    };
    Object.entries(costBindings).forEach(([id, [key, convert]]) => {
      document.getElementById(id).addEventListener("change", (event) => {
        state.cost[key] = key === "footing" ? convert(event.target) : convert(event.target.value);
        renderResults();
      });
    });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeModal(); });
  }

  renderShell();
  state.results = recommend(state.query);
  renderResults();
  bindEvents();
})();
