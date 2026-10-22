window.__ModuleLoader__.load({
  id: '@xyb-openharness-dsh-plugins/xyb-workbench',
  factory: (require) => {
    const React = require('react')
    const h = React.createElement
    let bridge
    const apiRoot = '/api/xyb-workbench'
    // 与 dsh/mineru.js 的 MINERU_TOKEN_URL 必须一致：这个地址出现在后端错误消息里时，
    // 前端就据此判定"这是 Token 问题"（见 mineruAlert）。改一处要同时改另一处。
    const MINERU_TOKEN_URL = 'https://mineru.net/apiManage/token'
    const brandLogo = 'data:image/png;base64,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'
    const baseStyle = { color: '#34413c', background: '#fbfaf7', minHeight: '100%', fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Text","PingFang SC",sans-serif' }
    const cardStyle = { background: '#fff', border: '1px solid #e9e9e1', borderRadius: 18, padding: 20, marginTop: 16 }
    const orangeButton = { border: 0, borderRadius: 999, padding: '10px 15px', background: '#e88755', color: '#fff', font: 'inherit', fontWeight: 700, cursor: 'pointer' }
    const subtleButton = { ...orangeButton, background: '#e7f3ed', color: '#315746' }
    const inputStyle = { border: '1px solid #e1e7df', borderRadius: 11, padding: '10px 12px', font: 'inherit', width: '100%', background: '#fff' }
    const styleText = `
      .xyb-app { --paper:#fbfaf7; --ink:#34413c; --sub:#78847e; --line:#e9e9e1; --mint:#dff1e9; --mint-deep:#32745c; --orange:#e88755; --pink:#f8e7e7; --blue:#eaf1f5; --yellow:#f4edcf; color:var(--ink); background:var(--paper); min-height:100%; font-size:14px; line-height:1.55; }
      .xyb-app * { box-sizing:border-box; }
      .xyb-app button,.xyb-app input,.xyb-app select { font:inherit; }
      .xyb-app button { cursor:pointer; }
      .xyb-app button:focus-visible,.xyb-app input:focus-visible { outline:3px solid #e8875590; outline-offset:2px; }
      .xyb-shell { max-width:1580px; min-height:100%; margin:auto; display:block; }
      .xyb-frame { width:100%; height:100%; min-height:0; display:flex; flex-direction:column; overflow:hidden; position:relative; }
      .xyb-workspace { display:flex; flex:1 1 auto; min-height:0; min-width:0; }
      .xyb-app { flex:1 1 auto; min-width:0; min-height:0!important; height:100%; overflow:auto; }
      .xyb-rail { border-right:1px solid var(--line); background:#f8f8f3; padding:24px 14px; display:flex; flex-direction:column; gap:24px; }
      .xyb-brand { display:flex; align-items:center; gap:10px; padding:0 8px; }
      .xyb-brand-mark { width:28px; height:28px; object-fit:contain; display:block; flex:none; }
      .xyb-brand strong { display:block; font-size:16px; letter-spacing:.01em; }
      .xyb-brand small,.xyb-rail-label { display:block; font-size:11px; color:var(--sub); }
      .xyb-rail-label { padding:0 10px 8px; letter-spacing:.08em; }
      .xyb-rail-nav { display:grid; gap:4px; }
      .xyb-rail-nav button { border:0; background:transparent; color:#66736c; text-align:left; border-radius:11px; padding:10px 11px; }
      .xyb-rail-nav button:hover,.xyb-rail-nav button.active { background:var(--mint); color:#2e6d55; }
      .xyb-rail-nav button.active { font-weight:650; }
      .xyb-rail-bottom { margin-top:auto; padding:14px 10px 0; border-top:1px solid var(--line); color:var(--sub); font-size:11px; overflow-wrap:anywhere; }
      .xyb-version { display:block; margin-top:9px; color:var(--muted); font-size:11px; letter-spacing:.04em; }
      .xyb-main { min-width:0; }
      .xyb-topbar { min-height:48px; padding:6px 12px 6px var(--dsh-frame-leading-clearance,12px); border-bottom:1px solid #e8e5e6; background:#f8f5f6; display:flex; align-items:center; gap:10px; position:sticky; top:0; z-index:5; flex-wrap:wrap; }
      .xyb-brandline { display:flex; align-items:center; gap:7px; flex:none; color:#503b47; font-size:12.5px; font-weight:700; }
      .xyb-brandline .xyb-brand-mark { width:28px; height:28px; }
      .xyb-top-hint { flex:1 1 200px; min-width:120px; color:#938991; font-size:11.5px; }
      .xyb-agent-actions { display:flex; align-items:center; gap:6px; flex:0 0 auto; margin-left:auto; }
      .xyb-agent-toggle { border:0; border-radius:999px; background:#bd788d; color:white; padding:5px 14px; font-size:12px; font-weight:700; }
      .xyb-agent-hide { border:1px solid #e4dce0; background:transparent; color:#68545e; border-radius:999px; padding:4px 9px; }
      .xyb-chat-pane { flex:none; min-width:0; height:100%; overflow:hidden; background:#fff; border-left:1px solid #e8e1e5; }
      .xyb-chat-content { width:100%; height:100%; }
      .xyb-chat-splitter { width:7px; flex:none; cursor:col-resize; background:#f8f5f6; border-left:1px solid #eee8eb; border-right:1px solid #eee8eb; touch-action:none; }
      .xyb-chat-splitter:focus-visible { outline:3px solid #bd788d; outline-offset:-2px; }
      .xyb-crumb,.xyb-local { color:var(--sub); font-size:12px; }
      .xyb-crumb { display:flex; align-items:center; gap:9px; }
      .xyb-local { display:flex; align-items:center; gap:7px; color:#658b75; }
      .xyb-local:before { content:''; width:7px; height:7px; background:#73aa88; border-radius:50%; }
      .xyb-top-actions { display:flex; align-items:center; gap:12px; }
      .xyb-version-badge { display:inline-flex; align-items:center; border:1px solid #e6e0e3; background:#f0edef; color:#8a7f86; border-radius:999px; padding:3px 9px; font-size:11px; font-weight:500; letter-spacing:.02em; white-space:nowrap; }
      .xyb-text-button { border:1px solid var(--line); background:#fff; border-radius:100px; padding:5px 10px; color:#526b5e; font-size:12px; }
      .xyb-settings { position:relative; }.xyb-settings summary { list-style:none; }.xyb-settings summary::-webkit-details-marker { display:none; }
      .xyb-settings-panel { position:absolute; z-index:10; right:0; top:34px; width:min(300px,80vw); background:#fff; border:1px solid var(--line); border-radius:14px; padding:16px; box-shadow:0 16px 40px #34413c20; }
      .xyb-settings-panel strong { display:block; font-size:13px; }.xyb-settings-panel p { color:var(--sub); font-size:11px; overflow-wrap:anywhere; }
      .xyb-preview-backdrop { position:fixed; inset:0; z-index:30; background:#25352f66; display:grid; place-items:center; padding:24px; }
      .xyb-preview-sheet { width:min(1120px,96vw); height:min(820px,92vh); background:#fbfaf7; border-radius:20px; padding:18px; display:flex; flex-direction:column; box-shadow:0 22px 70px #20352a40; }
      .xyb-settings-sheet { width:min(940px,96vw); height:min(900px,94vh); }.xyb-settings-scroll { overflow:auto; flex:1; min-height:0; padding-right:3px; }.xyb-settings-section { background:#fff; border:1px solid var(--line); border-radius:14px; padding:16px; margin:0 0 12px; }.xyb-settings-section h3 { margin:0 0 10px; font-size:14px; }.xyb-settings-section p { color:var(--sub); font-size:12px; }.xyb-settings-choice { display:flex; gap:10px; align-items:flex-start; padding:11px; margin:8px 0; border:1px solid var(--line); border-radius:12px; background:#fff; }.xyb-settings-choice input { margin-top:4px; accent-color:#e88755; }.xyb-settings-choice small { display:block; color:var(--sub); margin-top:4px; }.xyb-settings-state { color:#5b806b; font-size:11px; }.xyb-trial-match-layout { display:grid; gap:12px; }.xyb-trial-groups { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }.xyb-trial-group { border:1px solid var(--line); border-radius:12px; padding:12px; background:#fbfaf7; }.xyb-trial-group strong { font-size:12px; }.xyb-trial-group p { margin:5px 0 0; color:var(--sub); font-size:11px; }.xyb-follow-card { background:#fff; border:1px solid var(--line); border-radius:14px; padding:14px; margin:10px 0; }
      .xyb-preview-head { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px; }.xyb-preview-head h2 { font-size:16px; margin:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .xyb-preview-frame { flex:1; min-height:0; width:100%; background:#fff; border:1px solid var(--line); border-radius:12px; }
      .xyb-preview-body { display:grid; grid-template-columns:minmax(0,1.7fr) minmax(280px,.8fr); gap:14px; flex:1; min-height:0; }
      .xyb-preview-original { display:flex; min-height:0; }.xyb-preview-review { overflow:auto; border:1px solid var(--line); border-radius:14px; background:#fff; padding:16px; }.xyb-preview-review h3 { margin:0 0 8px; }
      .xyb-preview-candidate { display:grid; gap:7px; border-top:1px solid var(--line); padding:12px 0; }.xyb-preview-candidate strong { font-size:14px; }.xyb-preview-candidate small { color:var(--sub); }
      .xyb-record-molecular { margin-top:18px; border-top:1px solid var(--line); padding-top:14px; }.xyb-record-molecular h3 { margin-bottom:5px; }
      .xyb-resource-item { border-top:1px solid var(--line); padding:14px 0; }.xyb-resource-top,.xyb-resource-bottom { display:flex; align-items:start; justify-content:space-between; gap:12px; }.xyb-resource-top strong { display:block; }.xyb-resource-top small,.xyb-resource-bottom small { color:var(--sub); }.xyb-resource-item p { margin:8px 0; line-height:1.6; }.xyb-resource-list { padding-left:20px; margin:8px 0; }.xyb-resource-list li { padding:4px 0; }.xyb-resource-list small { display:block; color:var(--sub); }.xyb-resource-action { border-left:3px solid var(--mint); padding-left:10px; }
      @media (max-width:760px) { .xyb-preview-body { grid-template-columns:1fr; grid-template-rows:minmax(240px,1fr) minmax(220px,.8fr); }.xyb-preview-sheet { height:94vh; padding:12px; } }
      @media (max-width:760px) { .xyb-settings-sheet { height:96vh; }.xyb-trial-groups { grid-template-columns:1fr; } }
      .xyb-content { padding:30px clamp(20px,3vw,44px) 80px; max-width:1340px; margin:auto; }
      .xyb-intro { display:flex; justify-content:space-between; align-items:end; gap:18px; margin-bottom:24px; }
      .xyb-overline { color:var(--mint-deep); font-size:10px; font-weight:700; letter-spacing:.13em; margin-bottom:7px; }
      .xyb-intro h1 { font-size:clamp(26px,2.8vw,36px); line-height:1.2; letter-spacing:-.035em; font-weight:620; margin:0; }
      .xyb-intro p { margin:8px 0 0; color:var(--sub); font-size:13px; }
      .xyb-date { padding:8px 13px; background:#fff; border:1px solid var(--line); border-radius:100px; white-space:nowrap; color:var(--sub); font-size:12px; }
      .xyb-patient-bar { display:flex; align-items:center; justify-content:space-between; gap:12px; background:#fff; border:1px solid var(--line); border-radius:16px; padding:13px 16px; margin-bottom:16px; }
      .xyb-patient-id { display:flex; align-items:center; gap:10px; min-width:0; }
      .xyb-avatar { width:38px; height:38px; border-radius:50%; background:var(--pink); color:#b96e73; display:grid; place-items:center; font-weight:700; flex:none; }
      .xyb-patient-id strong { display:block; font-size:15px; }
      .xyb-patient-id small { display:block; color:var(--sub); font-size:11px; }
      .xyb-patient-bar select { border:1px solid var(--line); background:#fff; border-radius:100px; padding:8px 13px; max-width:42%; }
      .xyb-tabs { display:flex; gap:3px; overflow-x:auto; border-bottom:1px solid var(--line); margin-bottom:22px; position:sticky; top:62px; z-index:4; background:var(--paper); scrollbar-width:none; }
      .xyb-tabs button { background:transparent; border:0; color:var(--sub); white-space:nowrap; padding:12px 14px; font-size:12px; position:relative; }
      .xyb-tabs button[aria-selected=true] { color:var(--mint-deep); font-weight:700; }
      .xyb-tabs button[aria-selected=true]:after { content:''; position:absolute; height:2px; left:14px; right:14px; bottom:0; background:#5b9b81; border-radius:3px; }
      .xyb-grid { display:grid; gap:16px; }
      .xyb-hero-grid { grid-template-columns:minmax(0,1.45fr) minmax(240px,.75fr); }
      .xyb-hero { background:var(--mint); border-radius:22px; padding:25px 27px; min-height:205px; position:relative; overflow:hidden; }
      .xyb-hero h2 { font-size:clamp(22px,2vw,30px); line-height:1.28; margin:7px 0 10px; letter-spacing:-.035em; font-weight:620; max-width:500px; }
      .xyb-hero p { max-width:520px; font-size:12px; color:#5e776a; margin:0 0 19px; }
      .xyb-flower { position:absolute; right:-16px; bottom:-43px; font-size:120px; opacity:.13; pointer-events:none; }
      .xyb-action-row { display:flex; gap:8px; flex-wrap:wrap; }
      .xyb-btn { border:0; background:var(--orange); color:white; border-radius:100px; padding:9px 15px; font-weight:700; }
      .xyb-select { border:1px solid var(--line); border-radius:999px; background:#fff; color:var(--ink); padding:9px 12px; }
      .xyb-btn.secondary { background:#ffffffb8; color:var(--mint-deep); border:1px solid #c9e3d5; }
      .xyb-panel { background:#fff; border:1px solid var(--line); border-radius:18px; padding:19px; min-width:0; }
      .xyb-panel h3 { margin:0 0 8px; font-size:14px; }
      .xyb-panel p { color:var(--sub); font-size:12px; }
      .xyb-section-head { display:flex; align-items:end; justify-content:space-between; gap:12px; margin:25px 0 13px; }
      .xyb-section-head h2 { font-size:18px; margin:0; font-weight:630; }
      .xyb-section-head p { margin:3px 0 0; font-size:12px; color:var(--sub); }
      .xyb-link { border:0; background:none; color:var(--mint-deep); font-size:12px; padding:4px; }
      .xyb-status-grid { grid-template-columns:repeat(4,minmax(0,1fr)); }
      .xyb-status { border:1px solid var(--line); border-radius:16px; background:#fff; padding:16px; min-height:112px; }
      .xyb-status.mint { background:#f0f7f2; }.xyb-status.pink { background:#fbf2f1; }.xyb-status.blue { background:#f2f6f8; }.xyb-status.yellow { background:#faf8ec; }
      .xyb-status span { color:var(--sub); font-size:11px; }.xyb-status strong { display:block; font-size:16px; margin:9px 0 2px; line-height:1.3; }.xyb-status p { margin:0; font-size:11px; color:var(--sub); }
      .xyb-two { grid-template-columns:repeat(2,minmax(0,1fr)); }
      .xyb-list-row { display:flex; justify-content:space-between; align-items:center; gap:12px; border-bottom:1px solid #f0f0eb; padding:11px 0; font-size:12px; }
      .xyb-list-row:last-child { border-bottom:0; }.xyb-list-row small { color:var(--sub); display:block; }
      .xyb-module-head { display:flex; align-items:end; justify-content:space-between; gap:15px; margin:9px 0 18px; }
      .xyb-module-head h2 { font-size:23px; letter-spacing:-.03em; margin:0; font-weight:620; }.xyb-module-head p { color:var(--sub); font-size:12px; margin:5px 0 0; }
      .xyb-module-hero { border-radius:20px; padding:23px; margin-bottom:16px; background:#f0f7f2; }.xyb-module-hero.orange { background:#fff5ed; }.xyb-module-hero.pink { background:#fbf2f1; }
      .xyb-module-hero h3 { margin:0 0 7px; font-size:17px; }.xyb-module-hero p { margin:0; color:var(--sub); font-size:12px; max-width:720px; }
      .xyb-form { display:flex; align-items:end; flex-wrap:wrap; gap:10px; margin-top:15px; }.xyb-form label { font-size:12px; color:#52665a; }
      .xyb-empty { color:var(--sub); font-size:12px; padding:15px 0; }.xyb-note { font-size:11px; color:var(--sub); margin-top:10px; }
      .xyb-notice { background:#fff9ee; border:1px solid #f5e7cf; border-radius:12px; padding:10px 13px; color:#7e6545; font-size:12px; margin:0 0 16px; }
      .xyb-token-alert { background:#fff4f0; border-color:#f3d3c6; color:#8a4a33; }
      .xyb-token-alert strong { display:block; font-size:13px; margin-bottom:4px; }
      .xyb-token-alert p { margin:0 0 8px; }
      .xyb-token-alert .xyb-row-actions { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
      .xyb-token-alert a.xyb-link { font-weight:700; }
      .xyb-metric-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin:12px 0 22px; }
      .xyb-metric-card { display:block; min-height:176px; width:100%; border:1px solid var(--line); background:#fff; border-radius:16px; padding:0; text-align:left; color:var(--ink); transition:transform .25s,background .25s; perspective:1000px; -webkit-perspective:1000px; overflow:hidden; }
      .xyb-metric-card:hover { transform:translateY(-2px); background:#fbfdfb; }
      .xyb-metric-card[aria-pressed=true] { border-color:#b8d9c7; background:#f8fbf8; }
      .xyb-metric-inner { position:relative; min-height:176px; height:100%; display:block; transform:rotateY(0deg); transform-origin:center center; transform-style:preserve-3d; -webkit-transform-style:preserve-3d; transition:transform .68s cubic-bezier(.2,.7,.2,1); will-change:transform; }
      .xyb-metric-card[aria-pressed=true] .xyb-metric-inner { transform:rotateY(180deg); }
      .xyb-metric-face { position:absolute; inset:0; display:flex; flex-direction:column; justify-content:center; padding:14px; backface-visibility:hidden; -webkit-backface-visibility:hidden; }
      .xyb-metric-back { transform:rotateY(180deg); justify-content:flex-start; gap:5px; background:#f8fbf8; }
      .xyb-clinical-spark { display:block; width:min(100%,320px); height:62px; flex:0 0 62px; margin:2px 0 0; overflow:visible; }
      .xyb-clinical-spark-labels { display:flex; justify-content:space-between; gap:8px; width:min(100%,320px); color:var(--sub); font-size:10px; line-height:1.2; }
      .xyb-clinical-spark-labels small { font-size:10px; white-space:nowrap; }
      .xyb-clinical-group { margin-top:16px; }.xyb-clinical-group-head { display:flex; align-items:end; justify-content:space-between; gap:12px; margin-bottom:10px; }.xyb-clinical-group-head h3 { margin:0; }.xyb-clinical-group-head p { margin:4px 0 0; font-size:11px; color:var(--sub); }
      .xyb-clinical-table-head,.xyb-clinical-row { display:grid; grid-template-columns:minmax(90px,.68fr) minmax(135px,1.2fr) minmax(95px,.8fr) minmax(120px,1fr); gap:10px; align-items:center; }
      .xyb-clinical-table-head { padding:8px 11px; color:var(--sub); font-size:10px; border-bottom:1px solid var(--line); }.xyb-clinical-row { padding:11px; border-bottom:1px solid #f0f0eb; font-size:12px; }.xyb-clinical-row:last-child { border-bottom:0; }.xyb-clinical-row strong,.xyb-clinical-row small { display:block; overflow-wrap:anywhere; }.xyb-clinical-row small { margin-top:3px; color:var(--sub); font-size:10px; }.xyb-clinical-result { color:#315f4d; }.xyb-clinical-result.muted { color:#6e7772; }.xyb-clinical-source { color:#596960; }.xyb-clinical-state { display:inline-flex; margin-top:4px; border-radius:999px; padding:3px 8px; background:#e8f3ec; color:#3a7358; font-size:10px; }.xyb-clinical-state.negative { background:#f1f2ee; color:#6c766f; }.xyb-clinical-state.unknown { background:#fff5e7; color:#906d35; }
      .xyb-clinical-fold { margin-top:10px; border-top:1px solid #edf0eb; }.xyb-clinical-fold summary { padding:12px 4px 4px; color:var(--mint-deep); cursor:pointer; font-size:12px; }.xyb-clinical-note { padding:10px 12px; background:#f8faf7; border-radius:10px; color:var(--sub); font-size:11px; margin-top:10px; }
      .xyb-metric-card small { display:block; color:var(--sub); font-size:11px; }
      .xyb-metric-card strong { display:block; font-size:18px; margin:13px 0 4px; }
      .xyb-metric-delta { color:var(--mint-deep); font-size:12px; }.xyb-metric-delta.up { color:#c16b48; }
      .xyb-spark { width:100%; height:68px; display:block; margin:7px 0; }
      .xyb-metric-date { display:flex; justify-content:space-between; gap:8px; }
      .xyb-nutrition-flip { min-height:198px; }
      .xyb-nutrition-flip .xyb-metric-inner { min-height:198px; }
      .xyb-nutrition-flip .xyb-metric-back { justify-content:space-evenly; padding-top:10px; padding-bottom:10px; }
      .xyb-nutrition-line-chart { display:block; width:100%; height:86px; margin:3px 0; overflow:visible; }
      .xyb-nutrition-chart-dates { display:flex; justify-content:space-between; gap:5px; width:100%; color:var(--sub); font-size:9px; line-height:1.2; }
      .xyb-nutrition-chart-dates span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .xyb-overview-layout { display:grid; grid-template-columns:minmax(190px,230px) minmax(0,1fr); gap:14px; margin-top:14px; }
      .xyb-overview-selector { background:#fff; border:1px solid var(--line); border-radius:16px; padding:16px; align-self:start; }
      .xyb-overview-selector h3 { margin:0 0 9px; font-size:13px; }
      .xyb-overview-selector section+section { border-top:1px solid #f0f0eb; margin-top:14px; padding-top:14px; }
      .xyb-range-row { display:flex; flex-wrap:wrap; gap:6px; }
      .xyb-range-row .xyb-chart-pick { padding:6px 9px; }
      .xyb-overview-metric-list { display:grid; gap:5px; max-height:250px; overflow:auto; }
      .xyb-overview-metric-list label,.xyb-overview-toggle { display:flex; align-items:center; gap:8px; padding:5px 2px; color:#58675f; font-size:12px; }
      .xyb-overview-metric-list input,.xyb-overview-toggle input { accent-color:#5b9b81; }
      .xyb-overview-main { min-width:0; }
      .xyb-overview-main .xyb-timeline-chart { min-height:320px; }
      .xyb-zoom-control { display:grid; grid-template-columns:auto minmax(90px,1fr) auto; align-items:center; gap:9px; margin:8px 2px 0; color:var(--sub); font-size:11px; }
      .xyb-zoom-control input { width:100%; accent-color:#5b9b81; }
      .xyb-chart-tools { display:flex; flex-wrap:wrap; gap:8px; margin:14px 0; }
      .xyb-chart-pick { border:1px solid var(--line); background:#fff; border-radius:999px; padding:7px 11px; color:#52665a; font-size:12px; }
      .xyb-chart-pick[aria-pressed=true] { background:var(--mint); border-color:#b8d9c7; color:var(--mint-deep); font-weight:700; }
      .xyb-chart-pick[aria-selected=true] { background:var(--mint); border-color:#b8d9c7; color:var(--mint-deep); font-weight:700; }
      .xyb-timeline-chart { width:100%; height:clamp(240px,34vw,380px); display:block; background:#fff; border:1px solid #eef0e9; border-radius:14px; }
      .xyb-chart-point { cursor:pointer; }
      .xyb-chart-point:focus { outline:none; filter:drop-shadow(0 0 4px #e88755); }
      .xyb-chart-legend { display:flex; flex-wrap:wrap; gap:8px 16px; margin:10px 0; }
      .xyb-chart-legend span { display:inline-flex; align-items:center; gap:6px; font-size:12px; color:#52665a; }
      .xyb-chart-legend i { width:9px; height:9px; border-radius:50%; }
      .xyb-completion { position:relative; width:100%; display:flex; align-items:center; gap:15px; padding:14px 18px; border:1px solid #dcebe1; border-radius:16px; background:#f7fbf8; color:#526b5e; text-align:left; }
      .xyb-completion svg { width:86px; height:86px; }
      .xyb-completion > span { display:grid; gap:3px; }
      .xyb-completion strong { font-size:20px; line-height:1.15; }.xyb-completion span small,.xyb-completion-caption { font-size:11px; color:#668072; }
      .xyb-completion-caption { margin:0 0 0 auto; }
      .xyb-focus-head { display:flex; align-items:center; justify-content:space-between; gap:10px; }.xyb-focus-head h3 { margin:0; }
      .xyb-focus-item { border:0; border-bottom:1px solid #f0f0eb; padding:15px 0; width:100%; display:flex; align-items:center; gap:12px; background:transparent; text-align:left; color:var(--ink); }
      .xyb-focus-item:last-child { border-bottom:0; }.xyb-focus-item strong,.xyb-focus-item small { display:block; }.xyb-focus-item small { color:var(--sub); margin-top:2px; }
      .xyb-focus-icon { width:34px; height:34px; border-radius:12px; display:grid; place-items:center; flex:none; background:#fff0e7; color:#cb7448; font-size:18px; }.xyb-focus-icon.tint-1 { background:#f8e7e7; color:#b96e73; }.xyb-focus-icon.tint-2 { background:#eaf1f5; color:#718c99; }
      .xyb-status-top { display:flex; align-items:center; justify-content:space-between; }.xyb-status-dot { width:8px; height:8px; border-radius:50%; background:#73aa88; }.xyb-status-dot.unknown { background:#c8c9bd; }
      .xyb-care-grid { grid-template-columns:repeat(4,minmax(0,1fr)); }.xyb-care-tile { display:grid; grid-template-columns:32px 1fr; grid-template-rows:auto auto; gap:1px 10px; align-items:center; text-align:left; padding:15px; border:1px solid var(--line); background:#fff; border-radius:16px; color:var(--ink); }
      .xyb-care-tile > span { grid-row:1/3; width:30px; height:30px; border-radius:10px; display:grid; place-items:center; background:#eaf4ee; color:#4e876b; font-size:17px; }.xyb-care-tile small { color:var(--sub); }
      .xyb-step { width:100%; display:grid; grid-template-columns:26px 1fr auto; align-items:center; gap:8px; padding:11px 0; border:0; border-bottom:1px solid #f0f0eb; background:transparent; text-align:left; color:var(--ink); }.xyb-step:last-child { border-bottom:0; }.xyb-step small { color:var(--sub); }
      .xyb-step-check { width:22px; height:22px; border:1px solid #dfe7df; border-radius:50%; display:grid; place-items:center; color:#87928b; }.xyb-step-check.done { color:white; background:#5b9b81; border-color:#5b9b81; }
      .xyb-weight-chart { width:100%; height:130px; display:block; margin-top:14px; }.xyb-chart-label-row { display:flex; justify-content:space-between; gap:8px; color:var(--sub); }
      .xyb-dashboard-footer { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-top:18px; }
      .xyb-cycle-card { display:flex; align-items:center; gap:14px; padding:13px 0; border-bottom:1px solid #f0f0eb; }.xyb-cycle-card:last-child { border-bottom:0; }.xyb-cycle-card > div:last-child { display:grid; gap:3px; }.xyb-cycle-card small { color:var(--sub); }
      .xyb-countdown-ring { width:60px; height:60px; flex:none; border:4px solid #f3c29f; border-radius:50%; display:grid; place-content:center; text-align:center; color:#c96f43; }.xyb-countdown-ring strong { font-size:18px; line-height:1.1; }.xyb-countdown-ring small { font-size:9px; }
      .xyb-calendar-panel { min-width:0; }.xyb-calendar-head,.xyb-calendar-agenda-head { display:flex; justify-content:space-between; align-items:center; gap:12px; }.xyb-calendar-head p { margin-top:4px; font-size:11px; }.xyb-calendar-grid { display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); gap:7px; margin:14px 0; }.xyb-calendar-day { min-width:0; min-height:66px; padding:7px 3px; display:grid; justify-items:center; align-content:center; gap:3px; border:1px solid #eef0eb; border-radius:13px; background:#fff; color:var(--sub); cursor:pointer; }.xyb-calendar-day small { font-size:10px; }.xyb-calendar-day strong { color:var(--ink); font-size:16px; font-variant-numeric:tabular-nums; }.xyb-calendar-day.today { background:#f1f7f3; border-color:#c7ddce; }.xyb-calendar-day.selected { outline:2px solid #e88755; outline-offset:1px; }.xyb-calendar-dots { display:flex; gap:3px; height:5px; }.xyb-calendar-dots i { width:4px; height:4px; border-radius:50%; background:#e88755; }.xyb-calendar-agenda { border-top:1px solid #edf0eb; padding-top:11px; }.xyb-calendar-agenda-head { margin-bottom:5px; }.xyb-calendar-agenda-head span { color:var(--sub); font-size:11px; }.xyb-calendar-event { display:grid; grid-template-columns:9px minmax(0,1fr) auto; gap:9px; align-items:start; padding:9px 0; border-bottom:1px solid #f1f2ee; }.xyb-calendar-event-mark { width:7px; height:7px; border-radius:50%; background:#e88755; margin-top:5px; }.xyb-calendar-event strong { display:block; font-size:12px; }.xyb-calendar-event small { display:block; color:var(--sub); font-size:11px; margin-top:3px; }.xyb-calendar-event-actions { position:relative; }.xyb-calendar-event-actions summary { cursor:pointer; color:var(--sub); padding:0 5px; }.xyb-calendar-event-actions form,.xyb-calendar-form { display:grid; gap:9px; padding:12px; margin-top:8px; border:1px solid #f0e4db; border-radius:13px; background:#fffaf6; }.xyb-calendar-event-actions form { position:absolute; z-index:2; right:0; width:min(300px,72vw); box-shadow:0 8px 22px #26372b18; }.xyb-calendar-event-actions label,.xyb-calendar-form label { display:grid; gap:5px; font-size:11px; font-weight:600; }.xyb-calendar-event-actions input,.xyb-calendar-form input,.xyb-calendar-form select { width:100%; min-width:0; }.xyb-calendar-form > strong { font-size:13px; }
      .xyb-change-row { display:grid; grid-template-columns:minmax(180px,1fr) minmax(240px,1.25fr); gap:16px; padding:13px 0; border-bottom:1px solid #f0f0eb; }.xyb-change-row:last-child { border-bottom:0; }.xyb-change-row strong,.xyb-change-row small { display:block; }.xyb-change-row small { color:var(--sub); margin-top:3px; }.xyb-change-row.imaging { background:#fffaf6; margin:4px -8px 0; padding:13px 8px; border-radius:10px; }
      .xyb-row-actions { display:flex; align-items:center; gap:7px; flex-wrap:wrap; }.xyb-pill { display:inline-flex; align-items:center; border-radius:999px; padding:4px 9px; background:#eaf4ee; color:#4f8065; font-size:11px; white-space:nowrap; }.xyb-pill.orange { background:#fff0e7; color:#ad663f; }
      .xyb-record-summary,.xyb-match-overview,.xyb-source-card { background:#f8fbf8; border:1px solid #e8eee8; border-radius:14px; padding:15px; margin:12px 0; }.xyb-record-summary p,.xyb-match-overview p,.xyb-source-card p { color:var(--sub); margin:5px 0 0; font-size:12px; }
      .xyb-candidate-list { border-top:1px solid var(--line); margin-top:15px; padding-top:14px; }.xyb-candidate-list h3 { margin:0 0 8px; }
      .xyb-trial-search { display:flex; align-items:end; gap:10px; flex-wrap:wrap; margin-top:15px; }.xyb-trial-card { display:grid; grid-template-columns:38px 1fr; gap:12px; padding:15px 0; border-top:1px solid #edf0eb; }.xyb-trial-mark { width:36px; height:36px; display:grid; place-items:center; border-radius:13px; background:#eaf4ee; color:#4e876b; font-size:18px; }.xyb-trial-body h3 { margin:0 0 5px; font-size:15px; }.xyb-trial-body p { margin:3px 0; color:var(--sub); font-size:12px; }.xyb-trial-tags { display:flex; flex-wrap:wrap; gap:6px; margin:8px 0; }
      .xyb-nutrition-values { display:flex; justify-content:flex-end; gap:9px; flex-wrap:wrap; text-align:right; font-size:12px; }.xyb-nutrition-values > :empty { display:none; }

      .xyb-app.large-text { font-size:17px; }.xyb-app.large-text .xyb-content p,.xyb-app.large-text .xyb-status p,.xyb-app.large-text .xyb-panel p,.xyb-app.large-text .xyb-list-row,.xyb-app.large-text .xyb-tabs button,.xyb-app.large-text .xyb-patient-id small,.xyb-app.large-text .xyb-metric-card small { font-size:15px; }
      .xyb-app.large-text .xyb-status strong,.xyb-app.large-text .xyb-metric-card strong { font-size:21px; }
      @media (max-width:1050px) { .xyb-shell { grid-template-columns:150px minmax(0,1fr); }.xyb-status-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }.xyb-hero-grid { grid-template-columns:1fr; } }
      @media (max-width:1050px) { .xyb-metric-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
      @media (max-width:900px) { .xyb-overview-layout { grid-template-columns:1fr; }.xyb-overview-metric-list { grid-template-columns:repeat(2,minmax(0,1fr)); max-height:180px; }.xyb-clinical-table-head { display:none; }.xyb-clinical-row { grid-template-columns:minmax(0,1fr) minmax(0,1.25fr); gap:8px 12px; }.xyb-clinical-row > :nth-child(3) { grid-column:1; }.xyb-clinical-row > :nth-child(4) { grid-column:2; } }
      @media (max-width:720px) { .xyb-shell { display:block; }.xyb-rail { display:none; }.xyb-content { padding:22px 16px 70px; }.xyb-topbar { padding:0 16px; }.xyb-tabs { top:62px; }.xyb-intro { display:block; }.xyb-date { display:inline-block; margin-top:12px; }.xyb-two,.xyb-status-grid,.xyb-metric-grid { grid-template-columns:1fr; }.xyb-care-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }.xyb-module-head { align-items:start; }.xyb-patient-bar { flex-wrap:wrap; }.xyb-patient-bar select { max-width:100%; width:100%; }.xyb-completion { margin:0; }.xyb-completion svg { width:68px; height:68px; }.xyb-hero { padding-bottom:18px; }.xyb-change-row { grid-template-columns:1fr; gap:7px; } }
      @media (prefers-reduced-motion:reduce) { .xyb-app * { animation-duration:.01ms!important; transition-duration:.01ms!important; } }
    `

    async function request(path, options) {
      const response = await fetch(`${apiRoot}${path}`, options)
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || '请求失败')
      return body
    }
    const formField = (label, props) => h('label', { style: { display: 'grid', gap: 6, flex: 1, minWidth: 120, fontWeight: 650 } }, label, h('input', { ...props, style: inputStyle }))

    function Panel({ conversation } = {}) {
      const [ready, setReady] = React.useState(false)
      const [patients, setPatients] = React.useState([])
      const [selected, setSelected] = React.useState(null)
      const [dashboard, setDashboard] = React.useState(null)
      const [observationHistory, setObservationHistory] = React.useState([])
      const [documents, setDocuments] = React.useState([])
      const [previewDocument, setPreviewDocument] = React.useState(null)
      const [candidates, setCandidates] = React.useState([])
      const [nutrition, setNutrition] = React.useState(null)
      const [trials, setTrials] = React.useState([])
      const [bookmarks, setBookmarks] = React.useState([])
      const [reviewItems, setReviewItems] = React.useState({ tasks: [], artifacts: [] })
      const [subscriptions, setSubscriptions] = React.useState([])
      const [treatmentPlans, setTreatmentPlans] = React.useState([])
      const [molecularResults, setMolecularResults] = React.useState([])
      const [symptoms, setSymptoms] = React.useState([])
      const [moodCheckins, setMoodCheckins] = React.useState([])
      const [selectedMood, setSelectedMood] = React.useState('')
      const [trialMeta, setTrialMeta] = React.useState(null)
      const [activeTab, setActiveTab] = React.useState('dashboard')
      const [selectedNutritionMetrics, setSelectedNutritionMetrics] = React.useState(['weightKg', 'bmi', 'intakeKcal'])
      const [careRecords, setCareRecords] = React.useState({ comorbidities: [], toxicities: [], medications: [], catheters: [] })
      const [supportResources, setSupportResources] = React.useState([])
      const [careCategory, setCareCategory] = React.useState('治疗副作用')
      const [flippedMetrics, setFlippedMetrics] = React.useState([])
      const toggleMetric = (code) => setFlippedMetrics((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code])
      const [selectedTimelineMetrics, setSelectedTimelineMetrics] = React.useState([])
      const [selectedTimelinePoint, setSelectedTimelinePoint] = React.useState(null)
      const [timelineRange, setTimelineRange] = React.useState('all')
      const [timelineWindowPercent, setTimelineWindowPercent] = React.useState(100)
      const [timelineShowKeyPoints, setTimelineShowKeyPoints] = React.useState(true)
      const [timelineShowChanges, setTimelineShowChanges] = React.useState(false)
      const [timelineShowTreatment, setTimelineShowTreatment] = React.useState(true)
      const [recordFilter, setRecordFilter] = React.useState('全部资料')
      const [recordTopic, setRecordTopic] = React.useState('基本情况')
      const [trialSection, setTrialSection] = React.useState('入组档案')
      const [mindSection, setMindSection] = React.useState('情绪自评')
      const [largeText, setLargeText] = React.useState(false)
      const [notice, setNotice] = React.useState('正在连接本机服务…')
      const [busy, setBusy] = React.useState(false)
      const [dataRoot, setDataRoot] = React.useState(null)
      const [workbenchVersion, setWorkbenchVersion] = React.useState(null)
      const [selectedTrialDetail, setSelectedTrialDetail] = React.useState(null)
      const [recordSection, setRecordSection] = React.useState('资料库')
      const [careSection, setCareSection] = React.useState('毒性管理')
      const [trialFilters, setTrialFilters] = React.useState({ source: '', recruitment: '' })
      const [exportFormat, setExportFormat] = React.useState('pdf')
      const [calendarSelectedDate, setCalendarSelectedDate] = React.useState('')
      const [calendarAddOpen, setCalendarAddOpen] = React.useState(false)
      const [settingsOpen, setSettingsOpen] = React.useState(false)
      const [workspaceSettings, setWorkspaceSettings] = React.useState({ dataRoot: '', parseMode: 'local_mineru', mineruModel: 'pipeline', mineruCloudConsent: false, mineruTokenConfigured: false, mineruTokenSource: '', mineruTokenDraft: '' })
      const [analysisTrial, setAnalysisTrial] = React.useState(null)
      const [extractionResult, setExtractionResult] = React.useState(null)
      const [parseJob, setParseJob] = React.useState(null)
      const [agentOpen, setAgentOpen] = React.useState(false)
      const [agentWidth, setAgentWidth] = React.useState(() => { try { return Number(localStorage.getItem('xyb-agent-width')) || 35 } catch { return 35 } })
      // 解析失败如果是 Token 问题，就单独留一条提醒（不随 notice 被下一句话冲掉）：
      // 用户看到"解析失败"时最需要的不是原因归类，而是"怎么办 + 去哪办"。
      const [mineruAlert, setMineruAlert] = React.useState(null)
      const resizeAgent = React.useCallback((event) => {
        const startX = event.clientX
        const frame = event.currentTarget.parentElement
        const startWidth = frame.getBoundingClientRect().width * agentWidth / 100
        const move = (moveEvent) => {
          const bounds = frame.getBoundingClientRect()
          const next = Math.max(25, Math.min(45, Math.round((startWidth - (moveEvent.clientX - startX)) / bounds.width * 100)))
          setAgentWidth(next)
          try { localStorage.setItem('xyb-agent-width', String(next)) } catch {}
        }
        const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
        window.addEventListener('pointermove', move); window.addEventListener('pointerup', up, { once: true })
      }, [agentWidth])
      const adjustAgent = React.useCallback((event) => {
        let next = agentWidth
        if (event.key === 'ArrowLeft') next -= 2
        else if (event.key === 'ArrowRight') next += 2
        else if (event.key === 'Home') next = 25
        else if (event.key === 'End') next = 45
        else return
        event.preventDefault(); next = Math.max(25, Math.min(45, next)); setAgentWidth(next)
        try { localStorage.setItem('xyb-agent-width', String(next)) } catch {}
      }, [agentWidth])
      const todayLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)

      const loadPatient = React.useCallback(async (patient) => {
        if (!patient) return
        const [dashboardData, historyData, documentData, candidateData, nutritionData, bookmarkData, subscriptionData, treatmentPlanData, molecularData, symptomData, moodData, careData, resourceData, reviewData] = await Promise.all([
          request(`/dashboard?patientId=${encodeURIComponent(patient.id)}`),
          request(`/observations/history?patientId=${encodeURIComponent(patient.id)}`).catch(() => ({ observations: [] })),
          request(`/documents?patientId=${encodeURIComponent(patient.id)}`),
          request(`/candidates?patientId=${encodeURIComponent(patient.id)}`),
          request(`/nutrition?patientId=${encodeURIComponent(patient.id)}`),
          request(`/trial-bookmarks?patientId=${encodeURIComponent(patient.id)}`),
          request(`/trial-subscriptions?patientId=${encodeURIComponent(patient.id)}`),
          request(`/treatment-cycles?patientId=${encodeURIComponent(patient.id)}`),
          request(`/molecular-results?patientId=${encodeURIComponent(patient.id)}`).catch(() => ({ results: [] })),
          request(`/symptoms?patientId=${encodeURIComponent(patient.id)}`).catch(() => ({ symptoms: [] })),
          request(`/mood-checkins?patientId=${encodeURIComponent(patient.id)}`).catch(() => ({ checkins: [] })),
          request(`/care-records?patientId=${encodeURIComponent(patient.id)}`).catch(() => ({ records: { comorbidities: [], toxicities: [], medications: [], catheters: [] } })),
          request('/support-resources?domain=palliative_care').catch(() => ({ resources: [] })),
          request(`/review-items?patientId=${encodeURIComponent(patient.id)}`).catch(() => ({ tasks: [], artifacts: [] })),
        ])
        setSelected(patient)
        setDashboard(dashboardData.dashboard)
        setObservationHistory(historyData.observations)
        setDocuments(documentData.documents)
        setCandidates(candidateData.candidates)
        setNutrition(nutritionData.nutrition)
        setBookmarks(bookmarkData.bookmarks)
        setReviewItems(reviewData)
        setSubscriptions(subscriptionData.subscriptions)
        setTreatmentPlans(treatmentPlanData.plans)
        setMolecularResults(molecularData.results)
        setSymptoms(symptomData.symptoms)
        setMoodCheckins(moodData.checkins)
        setCareRecords(careData.records)
        setSupportResources(resourceData.resources)
        setSelectedMood('')
      }, [])
      const refresh = React.useCallback(async () => {
        try {
          const health = await request('/health')
          setWorkbenchVersion(health.version || null)
          setReady(health.storeConfigured)
          setDataRoot(health.dataRoot)
          if (!health.storeConfigured) { setNotice('请先选择存放患者资料的本机文件夹。'); return }
          const data = await request('/patients')
          setPatients(data.patients)
          setNotice(data.patients.length ? '资料会保存在你选择的本机文件夹。' : '可先建立一份患者资料，再导入报告或录入指标。')
          if (selected) await loadPatient(data.patients.find((patient) => patient.id === selected.id) || null)
        } catch (error) { setNotice(error.message) }
      }, [loadPatient, selected])
      React.useEffect(() => { void refresh() }, [])
      React.useEffect(() => { void request('/trials/meta').then((data) => setTrialMeta(data.metadata)).catch(() => {}) }, [])
      // Keep every hook before the readiness/patient early returns below. This
      // effect previously lived in the patient-only render path, so selecting
      // or creating the first patient changed the hook count and crashed the
      // DSH workbench error boundary.
      React.useEffect(() => {
        const availableMetrics = [...new Set(observationHistory.map((point) => point.metricCode))]
        setSelectedTimelineMetrics((current) => {
          const available = current.filter((code) => availableMetrics.includes(code))
          if (available.length) return available
          const preferred = ['CA19-9', 'CA199', 'ALB', 'WEIGHT', 'WEIGHTKG']
          const defaults = preferred.map((code) => availableMetrics.find((item) => item.toUpperCase().replace(/[-_\s]/g, '') === code.replace(/[-_\s]/g, ''))).filter(Boolean)
          return defaults.length ? defaults.slice(0, 3) : availableMetrics.slice(0, 3)
        })
      }, [observationHistory])

      const run = async (action) => {
        setBusy(true)
        try { await action() } catch (error) { setNotice(error.message) } finally { setBusy(false) }
      }
      // MinerU parses a 20-page scan in tens of seconds, so the request only
      // enqueues work; this polls the run until it settles and then reports.
      const waitForParseJob = async (runId, documentId) => {
        for (let attempt = 0; attempt < 300; attempt += 1) {
          const job = await request(`/documents/parse/job?runId=${encodeURIComponent(runId)}`).catch(() => null)
          if (job?.job) {
            setParseJob({ ...job.job, documentId })
            if (job.job.status === 'succeeded') {
              setNotice(`解析完成 · ${job.job.engine || '本机解析器'}${job.job.candidateCount ? ` · 已列出 ${job.job.candidateCount} 个待核对字段` : ' · 没有自动识别到指标，可直接查看解析文本'}`)
              setMineruAlert(null)
              setPreviewDocument((current) => current?.id === documentId ? { ...current, parseStatus: 'parsed' } : current)
              const extracted = await request(`/documents/extraction?documentId=${encodeURIComponent(documentId)}`).catch(() => null)
              if (extracted?.result) setExtractionResult(extracted.result)
              setParseJob(null)
              await loadPatient(selected)
              return
            }
            if (job.job.status === 'failed') {
              const failure = String(job.job.errorMessage || '未记录原因')
              setNotice(`解析失败：${failure}。原件仍保存在本机，可稍后重试。`)
              // 只认后端消息里的 Token 申请地址，不在前端重复猜"是不是 Token 过期"
              setMineruAlert(failure.includes(MINERU_TOKEN_URL) ? { message: failure } : null)
              setParseJob(null)
              await loadPatient(selected)
              return
            }
          }
          await new Promise((resolveStep) => setTimeout(resolveStep, 2000))
        }
        setNotice('解析仍在进行，稍后可在资料库中查看结果。')
        setParseJob(null)
      }
      const openSettings = () => run(async () => {
        const result = await request('/settings/config')
        setWorkspaceSettings({ ...result.settings, mineruTokenDraft: '' })
        setSettingsOpen(true)
      })
      const saveWorkspaceSettings = (event) => {
        event.preventDefault()
        const form = event.currentTarget
        return run(async () => {
          const values = new FormData(form)
          const result = await request('/settings/config', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ parseMode: values.get('parseMode'), mineruModel: values.get('mineruModel'), mineruCloudConsent: values.get('mineruCloudConsent') === 'true', mineruToken: values.get('mineruToken') || '' }) })
          setWorkspaceSettings({ ...result.settings, mineruTokenDraft: '' })
          setSettingsOpen(false)
          // 换了 Token 就不再挂着"Token 失效"的提醒；能不能用由下一次解析验证，不在这里先承诺
          setMineruAlert(null)
          setNotice('工作台设置已保存在本机。')
        })
      }
      const selectRoot = () => run(async () => {
        const dataRoot = await bridge.uiWorkspace.pickDirectory()
        if (!dataRoot) { setNotice('没有选择资料文件夹。'); return }
        await request('/settings/data-root', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ dataRoot }) })
        setWorkspaceSettings((current) => ({ ...current, dataRoot }))
        await refresh()
      })
      const createPatient = (event) => {
        event.preventDefault()
        const form = event.currentTarget
        return run(async () => {
        const name = new FormData(form).get('displayName')
        const data = await request('/patients', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ displayName: name }) })
        form.reset(); await refresh(); await loadPatient(data.patient)
      }) }
      const recordObservation = (event) => {
        event.preventDefault()
        const form = event.currentTarget
        return run(async () => {
        if (!selected) return
        const data = new FormData(form)
        await request('/observations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ patientId: selected.id, metricCode: data.get('metricCode'), valueNum: data.get('valueNum'), valueRaw: data.get('valueNum'), unitRaw: data.get('unitRaw'), occurredAt: data.get('occurredAt') }) })
        form.reset(); await loadPatient(selected)
      }) }
      const recordAppointment = (event) => {
        event.preventDefault()
        const form = event.currentTarget
        return run(async () => {
        if (!selected) return
        const data = new FormData(form)
        await request('/appointments', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ patientId: selected.id, kindCode: data.get('kindCode'), scheduledAt: data.get('scheduledAt'), organization: data.get('organization'), note: data.get('note') }) })
        form.reset(); await loadPatient(selected)
      }) }
      const recordCalendarAppointment = (event) => {
        event.preventDefault()
        const form = event.currentTarget
        return run(async () => {
          if (!selected) return
          const data = new FormData(form)
          await request('/appointments', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ patientId: selected.id, kindCode: data.get('kindCode'), scheduledAt: data.get('scheduledAt'), organization: data.get('organization'), note: data.get('note') }) })
          setCalendarAddOpen(false)
          await loadPatient(selected)
        })
      }
      const setAppointmentStatus = (appointmentId, status) => run(async () => {
        await request('/appointments', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ appointmentId, status }) })
        await loadPatient(selected)
      })
      const editAppointment = (appointmentId, event) => {
        event.preventDefault()
        const form = event.currentTarget
        return run(async () => {
          const data = new FormData(form)
          await request('/appointments', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ appointmentId, scheduledAt: data.get('scheduledAt'), note: data.get('note') }) })
          await loadPatient(selected)
        })
      }
      const editReminder = (reminderId, event) => {
        event.preventDefault()
        const form = event.currentTarget
        return run(async () => {
          const data = new FormData(form)
          await request('/reminders', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reminderId, dueAt: data.get('dueAt') }) })
          await loadPatient(selected)
        })
      }
      const createTreatmentPlan = (event) => {
        event.preventDefault()
        const form = event.currentTarget
        return run(async () => {
        if (!selected) return
        const data = new FormData(form)
        await request('/treatment-cycles', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ patientId: selected.id, regimen: data.get('regimen'), firstAt: data.get('firstAt'), cycleDays: data.get('cycleDays'), cycleCount: data.get('cycleCount'), bloodTestLeadDays: data.get('bloodTestLeadDays'), ctIntervalDays: data.get('ctIntervalDays'), ctCount: data.get('ctCount') }) })
        form.reset(); await loadPatient(selected)
      }) }
      const recordNutrition = (event) => {
        event.preventDefault()
        const form = event.currentTarget
        return run(async () => {
        if (!selected) return
        const data = new FormData(form)
        await request('/nutrition/entries', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ patientId: selected.id, occurredAt: data.get('occurredAt'), weightKg: data.get('weightKg'), intakeKcal: data.get('intakeKcal'), proteinG: data.get('proteinG'), note: data.get('note') }) })
        form.reset(); await loadPatient(selected)
      }) }
      const recordNutritionProduct = (event) => {
        event.preventDefault()
        const form = event.currentTarget
        return run(async () => {
        if (!selected) return
        const data = new FormData(form)
        await request('/nutrition/products', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ patientId: selected.id, occurredAt: data.get('occurredAt'), productName: data.get('productName'), productType: data.get('productType'), volumeMl: data.get('volumeMl'), energyKcal: data.get('energyKcal'), proteinG: data.get('proteinG'), note: data.get('note') }) })
        form.reset(); await loadPatient(selected)
      }) }
      const recordPei = (event) => {
        event.preventDefault()
        const form = event.currentTarget
        return run(async () => {
          if (!selected) return
          const data = new FormData(form)
          await request('/nutrition/pei', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ patientId: selected.id, occurredAt: data.get('occurredAt'), medicationRecordId: data.get('medicationRecordId'), withMeal: data.get('withMeal'), doseText: data.get('doseText'), stoolChangeCode: data.get('stoolChangeCode'), note: data.get('note') }) })
          form.reset(); await loadPatient(selected)
        })
      }
      const recordMoodCheckin = (event) => {
        event.preventDefault()
        const form = event.currentTarget
        return run(async () => {
          if (!selected || !selectedMood) throw new Error('请先选择今天最接近的一种感受')
          const data = new FormData(form)
          await request('/mood-checkins', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ patientId: selected.id, mood: selectedMood, occurredAt: data.get('occurredAt'), note: data.get('note') }) })
          form.reset(); await loadPatient(selected)
        })
      }
      const recordSymptom = (event) => {
        event.preventDefault()
        const form = event.currentTarget
        return run(async () => {
          if (!selected) return
          const data = new FormData(form)
          await request('/symptoms', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ patientId: selected.id, symptomCode: data.get('symptomCode'), severity: data.get('severity'), onsetAt: data.get('onsetAt'), note: data.get('note') }) })
          form.reset(); await loadPatient(selected)
        })
      }
      const recordCareEntry = (event) => {
        event.preventDefault()
        const form = event.currentTarget, data = new FormData(form), type = data.get('type')
        return run(async () => {
          if (!selected) return
          const payload = { patientId: selected.id, type }
          for (const [key, value] of data.entries()) if (key !== 'type') payload[key] = value
          await request('/care-records', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
          form.reset(); await loadPatient(selected)
        })
      }
      const updateMedicationStatus = (medicationId, status) => run(async () => {
        if (!selected) return
        await request('/care-records', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ patientId: selected.id, type: 'medication-status', medicationId, status }) })
        await loadPatient(selected)
      })
      const recordMolecularResult = (event) => {
        event.preventDefault()
        const form = event.currentTarget
        return run(async () => {
          if (!selected) return
          const data = new FormData(form)
          await request('/molecular-results', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
            patientId: selected.id, assayType: data.get('assayType'), markerCode: data.get('markerCode'), geneCode: data.get('geneCode'),
            resultType: data.get('resultType'), resultRaw: data.get('resultRaw'), variantHgvs: data.get('variantHgvs'), alterationCode: data.get('alterationCode'),
            vafPct: data.get('vafPct'), intensity: data.get('intensity'), positivePct: data.get('positivePct'), cps: data.get('cps'),
            classificationCode: data.get('classificationCode'), testMethod: data.get('testMethod'), occurredAt: data.get('occurredAt'),
            sourceDocumentId: data.get('sourceDocumentId'), sourceLocator: data.get('sourceLocator'),
          }) })
          form.reset(); await loadPatient(selected)
        })
      }
      const importDocument = (event) => {
        event.preventDefault()
        const form = event.currentTarget
        return run(async () => {
        if (!selected) return
        const file = form.elements.file.files[0]
        if (!file) throw new Error('请选择资料文件')
        const query = new URLSearchParams({ patientId: selected.id, title: file.name, kindCode: form.elements.kindCode.value || 'other', reportedAt: form.elements.reportedAt.value || '' })
        await request(`/documents?${query}`, { method: 'POST', headers: { 'x-xyb-file-name': encodeURIComponent(file.name) }, body: file })
        form.reset(); await loadPatient(selected)
      }) }
      // Only the enqueue runs under `busy`; the wait is a background poll so the
      // page stays usable while MinerU works through a long scan.
      const parseDocument = async (documentId) => {
        let queuedJob = null
        await run(async () => {
          const doc = documents.find((item) => item.id === documentId)
          const extension = doc?.title?.split('.').pop()?.toLowerCase()
          const currentSettings = (await request('/settings/config')).settings
          setWorkspaceSettings({ ...currentSettings, mineruTokenDraft: '' })
          if (!['txt', 'md', 'csv'].includes(extension) && currentSettings.parseMode === 'local_mineru' && !currentSettings.mineruCloudConsent) {
            setSettingsOpen(true)
            setNotice('首次使用 MinerU 前，请在设置弹窗中阅读说明并确认；CSV、TXT、MD 仍在本机解析。')
            return
          }
          const started = await request('/documents/parse', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ documentId }) })
          queuedJob = started.job
          setParseJob({ ...started.job, documentId })
          setNotice('解析已在后台开始，完成时这里会通知你；可以先继续查看其他资料。')
        })
        if (queuedJob) await waitForParseJob(queuedJob.runId, documentId)
      }
      const decideCandidate = (candidateId, accepted) => run(async () => {
        await request(`/candidates/${accepted ? 'confirm' : 'reject'}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ candidateId, confirmedBy: 'patient' }) })
        await loadPatient(selected)
      })
      // 把一段提示词交给右侧原生会话：先落一条本机 agent_task，再把文字放进输入框由患者自己按发送。
      // 不自动发送——工作台不替患者说话，这一点对所有入口一致。
      const mountAdvicePrompt = async (patientId, pageCode, agentRoleCode, promptRendered, snapshot) => {
        const created = await request('/agent-tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ patientId, pageCode, agentRoleCode, promptRendered, inputSnapshot: snapshot }) })
        try {
          if (typeof bridge.desktopWorkbenches?.ensureSession !== 'function') throw new Error('当前 Desktop 未提供工作台会话接口')
          const workspace = await request(`/agent-workspaces?patientId=${encodeURIComponent(patientId)}`)
          const savedSession = workspace.sessionRef && bridge.desktopWorkbenches.ownsSession?.(workspace.sessionRef) ? workspace.sessionRef : null
          const sessionId = await bridge.desktopWorkbenches.ensureSession(savedSession ? { sessionId: savedSession } : { folder: workspace.folder })
          const actx = bridge.sessions?.scope?.(sessionId)
          const conversation = actx?.get?.('conversation')
          const input = conversation?.input?.for?.(actx)
          if (!input?.setDraft) throw new Error('当前 Desktop 未提供原生输入框接口')
          input.setDraft(promptRendered)
          await request('/agent-tasks/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ taskId: created.task.id, sessionRef: sessionId }) })
          setNotice('已保存 Agent 任务，并把提示词放入右侧原生会话输入框；核对后可发送。')
          return true
        } catch (error) {
          setNotice(`建议任务已保存；当前尚不能自动打开原生对话：${error.message}`)
          return false
        }
      }
      const askAdvice = (pageCode = 'dashboard', agentRoleCode = 'pancreatic-care-manager', pageTitle = '病情看板', extra = {}) => run(async () => {
        if (!selected || !dashboard) throw new Error('请先选择患者并等待页面数据加载')
        const snapshot = { patient: dashboard.patient, latestObservations: dashboard.latestObservations, upcomingAppointments: dashboard.upcomingAppointments, generatedAt: dashboard.generatedAt, ...extra }
        const promptRendered = [
          `你是${agentRoleCode === 'nutrition-assistant' ? '肿瘤营养记录助手' : agentRoleCode === 'trial-search-assistant' ? '临床试验检索助手' : '胰腺癌病程管家'}。请基于以下已经确认的本机记录，帮助患者整理「${pageTitle}」页面的下一步讨论事项。`,
          agentRoleCode === 'trial-search-assistant' ? '请先区分登记原文、患者已确认资料和缺失信息；逐条引用数据来源，不推断符合入组、不承诺名额或招募状态，也不替代研究中心判断。' : '请按「已确认变化」「需要向医生核对」「未来两周可准备的事项」组织；不要作出诊断、疗效结论或入组承诺。',
          `页面摘要：${JSON.stringify(snapshot)}`,
          // 解析工具失效时，让 Agent 顺带提一句——患者不会主动去翻设置，
          // 但必须说清"这是工具问题，不是病情变化"。
          mineruAlert ? `本机提示：报告解析用的 MinerU Token 目前失效（申请 / 重置：${MINERU_TOKEN_URL}），扫描件与图片暂时无法自动识别，原件仍完好保存在本机，已确认的指标不受影响。请在回答末尾用一两句话提醒患者更新 Token 并说明入口，不要把它写成病情变化或治疗问题。` : null,
        ].filter(Boolean).join('\n\n')
        const mounted = await mountAdvicePrompt(selected.id, pageCode, agentRoleCode, promptRendered, snapshot)
        await loadPatient(selected)
        return mounted
      })
      // Token 过期后的"怎么办"：交给 Agent 说人话，比在界面上堆一段报错更接近患者的实际问法。
      const remindMineruToken = () => run(async () => {
        if (!selected) throw new Error('请先选择患者')
        const promptRendered = [
          '你是胰腺癌病程管家。患者本机的小胰宝在解析报告时提示 MinerU Token 已失效，需要换成有效的 Token 才能继续自动识别扫描件和图片。',
          '请用一段平实的话提醒患者处理，要求：',
          '1. 先说清影响范围：只影响 PDF、扫描件和照片的自动识别；原件已完整保存在本机，不会丢；已经核对确认过的指标也不受影响。',
          `2. 给出更新步骤：a) 打开 ${MINERU_TOKEN_URL} 登录；b) 复制页面上的 API Token；c) 回到小胰宝，打开右上角「工作台设置」；d) 粘贴到「MinerU API Token」输入框；e) 点「保存设置」（保存后弹窗会自动关闭）；f) 回到资料库，对那份资料点「解析文档」重试。`,
          '3. 提醒患者不要把 Token 发到这个对话里，也不要贴到病友群或截图分享——它是账号凭据。',
          '4. 如果患者觉得申请麻烦，可以说清备选：继续用 TXT / MD / CSV 本机解析，或先手工录入已核实的指标，不必为了这个 Token 耽误复诊。',
          '5. 不要把这些说成病情变化，不要给治疗建议，也不要替患者判断报告内容。',
        ].join('\n')
        const mounted = await mountAdvicePrompt(selected.id, 'records', 'pancreatic-care-manager', promptRendered, { tokenRenewal: { tokenUrl: MINERU_TOKEN_URL, reason: '解析时 Token 失效', reportedAt: new Date().toISOString() } })
        await loadPatient(selected)
        return mounted
      })
      const searchTrials = (event) => {
        event.preventDefault()
        const form = event.currentTarget
        return run(async () => {
        const formData = new FormData(form), query = formData.get('query') || ''
        const filters = { source: formData.get('source') || '', recruitment: formData.get('recruitment') || '' }
        setTrialFilters(filters)
        const params = new URLSearchParams({ q: query, ...filters })
        const result = await request(`/trials/search?${params}`)
        setTrials(result.trials)
      }) }
      const openTrialDetail = (trialKey) => run(async () => {
        const result = await request(`/trials/detail?trialKey=${encodeURIComponent(trialKey)}`)
        setSelectedTrialDetail(result.trial)
      })
      const openExtractionResult = (documentId) => run(async () => {
        const result = await request(`/documents/extraction?documentId=${encodeURIComponent(documentId)}`)
        setExtractionResult(result.result)
      })
      const saveTrial = (trialKey, trialSnapshot = trials.find((item) => item.trialKey === trialKey) || selectedTrialDetail, state = 'saved', note) => run(async () => {
        if (!selected) return
        let snapshot = trialSnapshot || {}
        if (!Object.hasOwn(snapshot, 'eligibilityText')) snapshot = (await request(`/trials/detail?trialKey=${encodeURIComponent(trialKey)}`)).trial
        await request('/trial-bookmarks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ patientId: selected.id, trialKey, state, note, snapshot }) })
        await loadPatient(selected)
      })
      const openSavedTrial = (item) => item.snapshot?.title ? setSelectedTrialDetail(item.snapshot) : openTrialDetail(item.trialKey)
      const askAboutTrial = (trial) => {
        const confirmedProfile = molecularResults.map(({ markerCode, geneCode, alterationCode, variantHgvs, resultRaw, vafPct, intensity, positivePct, testMethod, occurredAt, sourceDocumentTitle, sourceLocator }) => ({ markerCode, geneCode, alterationCode, variantHgvs, resultRaw, vafPct, intensity, positivePct, testMethod, occurredAt, sourceDocumentTitle, sourceLocator }))
        const documentsSummary = documents.map(({ title, kindCode, reportedAt, parseStatus }) => ({ title, kindCode, reportedAt, parseStatus }))
        return askAdvice('trials', 'trial-search-assistant', '临床匹配中的试验线索', { trial, confirmedMolecularProfile: confirmedProfile, documents: documentsSummary, treatmentPlans })
      }
      const subscribeTrials = (event) => {
        event.preventDefault()
        const form = event.currentTarget
        return run(async () => {
        if (!selected) return
        const data = new FormData(form), queryText = data.get('queryText')
        await request('/trial-subscriptions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ patientId: selected.id, queryText, targetTerms: String(queryText || '').split(/[,，\s]+/u) }) })
        form.reset(); await loadPatient(selected)
      }) }
      const exportReport = (format = exportFormat) => run(async () => {
        if (!selected) throw new Error('请先选择患者')
        setNotice(`正在生成 ${format.toUpperCase()} 病情报告…`)
        if (format === 'jpeg' || format === 'pdf') {
          const xmlEscape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char])
          const { dashboard } = await request(`/dashboard?patientId=${encodeURIComponent(selected.id)}`)
          const rows = dashboard.latestObservations.map((metric, index) => `<text x="72" y="${320 + index * 54}" font-size="25" fill="#34413c">${xmlEscape(metric.metricCode)}　${xmlEscape(metric.valueRaw)} ${xmlEscape(metric.unitRaw || '')}　${xmlEscape(metric.occurredAt)}</text>`).join('')
          const schedule = dashboard.upcomingAppointments.map((item, index) => `<text x="72" y="${370 + dashboard.latestObservations.length * 54 + index * 42}" font-size="22" fill="#52665a">${xmlEscape(item.kindCode)}　${xmlEscape(item.scheduledAt)}</text>`).join('')
          const height = Math.max(580, 400 + dashboard.latestObservations.length * 54 + dashboard.upcomingAppointments.length * 42)
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${height}" viewBox="0 0 1200 ${height}"><rect width="100%" height="100%" rx="30" fill="#fbfaf7"/><text x="72" y="105" font-size="42" font-weight="700" fill="#d86f3d">小胰宝 · 病情报告</text><text x="72" y="165" font-size="25" fill="#34413c">患者：${xmlEscape(dashboard.patient.displayName)}</text><text x="72" y="210" font-size="20" fill="#78847e">生成时间：${xmlEscape(dashboard.generatedAt.slice(0, 10))}　·　汇总已确认的本机记录，供整理和与医生讨论</text><text x="72" y="275" font-size="29" font-weight="700" fill="#34413c">当前指标</text>${rows}<text x="72" y="${340 + dashboard.latestObservations.length * 54}" font-size="29" font-weight="700" fill="#34413c">未来安排</text>${schedule}<text x="72" y="${height - 38}" font-size="18" fill="#78847e">此报告不包含诊断或治疗结论</text></svg>`
          const image = new Image()
          image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
          await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('生成 JPG 预览失败')) })
          const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = height
          canvas.getContext('2d').drawImage(image, 0, 0)
          const jpegData = canvas.toDataURL('image/jpeg', .94)
          const { artifact } = await request('/reports/visual', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ patientId: selected.id, imageData: jpegData, formatCode: format }) })
          const link = document.createElement('a'); link.href = `${apiRoot}/reports/artifact?artifactId=${encodeURIComponent(artifact.id)}`; link.download = `${selected.displayName}-病情报告.${format}`; document.body.append(link); link.click(); link.remove()
          setNotice(`已生成 ${format.toUpperCase()} 病情报告：${artifact.fileRelPath}`)
          await loadPatient(selected)
          return
        }
        const result = await request('/reports/export', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ patientId: selected.id, formatCode: format }) })
        const artifactUrl = `${apiRoot}/reports/artifact?artifactId=${encodeURIComponent(result.artifact.id)}`
        const link = document.createElement('a')
        link.href = artifactUrl
        link.download = `${selected.displayName}-病情报告.${format}`
        document.body.append(link); link.click(); link.remove()
        setNotice(`已生成 ${format.toUpperCase()} 病情报告：${result.artifact.fileRelPath}`)
        await loadPatient(selected)
      })
      const reopenAgentSession = (sessionRef) => run(async () => {
        if (!sessionRef || typeof bridge.desktopWorkbenches?.ensureSession !== 'function') throw new Error('该记录没有可恢复的原生会话引用')
        await bridge.desktopWorkbenches.ensureSession({ sessionId: sessionRef })
        setNotice('已打开该条记录对应的 Desktop 原生会话。')
      })

      const tabs = [
        ['dashboard', '看板'], ['records', '病情整理'], ['one-page', '病情一图秀'], ['trials', '临床匹配'], ['nutrition', '营养管理'], ['mind', '心理支持'], ['care', '全程管理'], ['review', '收藏与回顾'],
      ]
      const flowerMark = h('img', { className: 'xyb-brand-mark', src: brandLogo, alt: '小胰宝机器人' })
      const tabBar = h('nav', { className: 'xyb-tabs', 'aria-label': '工作台页面' }, ...tabs.map(([code, label]) => h('button', { key: code, type: 'button', 'aria-selected': activeTab === code, onClick: () => setActiveTab(code) }, label)))
      const layout = (body, showPatient = false) => h('div', { className: 'xyb-frame' },
        h('header', { className: 'xyb-topbar' }, h('span', { className: 'xyb-brandline' }, flowerMark, '小胰宝', h('span', { className: 'xyb-version-badge', 'aria-label': `工作台版本 ${workbenchVersion || '读取中'}` }, `v${workbenchVersion || '…'}`)), h('span', { className: 'xyb-top-hint' }, agentOpen ? '右侧为 DSH 原生会话；拖动分隔边调整宽度（25%–45%），收起不会结束会话。' : '需要时可打开右侧 DSH 原生 AI 会话。'), h('div', { className: 'xyb-agent-actions' }, h('button', { type: 'button', className: 'xyb-agent-toggle', 'aria-pressed': agentOpen, onClick: () => setAgentOpen(!agentOpen) }, agentOpen ? '收起 AI 对话' : '打开 AI 对话'), agentOpen ? h('button', { type: 'button', className: 'xyb-agent-hide', 'aria-label': '收起 AI 对话面板', onClick: () => setAgentOpen(false) }, '×') : null)),
        h('style', null, styleText),
        h('div', { className: 'xyb-workspace' }, h('main', { className: `xyb-app ${largeText ? 'large-text' : ''}`, style: baseStyle },
        h('div', { className: 'xyb-shell' },
          h('div', { className: 'xyb-main' },
            h('header', { className: 'xyb-topbar' }, h('span', { className: 'xyb-crumb' }, '小胰宝工作台 / 当前页面'), h('div', { className: 'xyb-top-actions' }, h('span', { className: 'xyb-local' }, ready ? '本机资料已保存' : '等待初始化'), h('button', { type: 'button', className: 'xyb-text-button', 'aria-pressed': largeText, onClick: () => setLargeText(!largeText) }, largeText ? '标准字' : '大字 Aa'), h('button', { type: 'button', className: 'xyb-text-button', 'aria-pressed': settingsOpen, onClick: openSettings }, '设置'))),
            h('div', { className: 'xyb-content' },
              h('div', { className: 'xyb-intro' }, h('div', null, h('div', { className: 'xyb-overline' }, 'CARE, AT YOUR PACE'), h('h1', null, 'AI成炬，照亮前路'), h('p', null, '病情资料、治疗记录和照护安排，都在这里查看。')), h('div', { className: 'xyb-date' }, new Intl.DateTimeFormat('zh-CN', { dateStyle: 'full' }).format(new Date()))),
              showPatient ? h('div', { className: 'xyb-patient-bar' }, h('div', { className: 'xyb-patient-id' }, h('span', { className: 'xyb-avatar' }, selected?.displayName?.slice(0, 1) || '患'), h('div', null, h('strong', null, selected?.displayName || '请选择患者'), h('small', null, '当前本机患者档案'))), h('select', { 'aria-label': '切换患者', value: selected?.id || '', onChange: (event) => { const patient = patients.find((entry) => entry.id === event.target.value); if (patient) void loadPatient(patient) } }, ...patients.map((patient) => h('option', { key: patient.id, value: patient.id }, patient.displayName)))) : null,
              body)))),
        h('div', { className: 'xyb-chat-splitter', style: { display: agentOpen ? 'block' : 'none' }, role: 'separator', tabIndex: agentOpen ? 0 : -1, 'aria-label': '调整 AI 对话宽度', 'aria-orientation': 'vertical', 'aria-valuemin': 25, 'aria-valuemax': 45, 'aria-valuenow': agentWidth, onPointerDown: resizeAgent, onKeyDown: adjustAgent }),
        h('aside', { className: 'xyb-chat-pane', style: { width: `${agentWidth}%`, display: agentOpen ? 'block' : 'none' }, 'aria-hidden': !agentOpen, 'aria-label': 'DSH 原生 AI 对话' }, h('div', { className: 'xyb-chat-content' }, conversation || h('div', { style: { padding: 24, color: '#78847e' } }, '当前没有可显示的原生会话。请先在 DSH 中新建或选择小胰宝会话。')))))

      if (!ready) return layout(h('section', { className: 'xyb-module-hero' }, h('h3', null, '资料库初始化'), h('p', null, notice), h('div', { className: 'xyb-action-row', style: { marginTop: 16 } }, h('button', { type: 'button', className: 'xyb-btn', disabled: busy, onClick: selectRoot }, busy ? '处理中…' : '选择资料文件夹'))))

      const patientList = h('section', { style: cardStyle },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 } }, h('h2', { style: { margin: 0 } }, '患者'), h('button', { type: 'button', style: subtleButton, onClick: () => void refresh() }, '刷新')),
        h('p', { style: { color: '#697a71' } }, notice),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } }, ...patients.map((patient) => h('button', { key: patient.id, type: 'button', onClick: () => void loadPatient(patient), style: selected?.id === patient.id ? orangeButton : subtleButton }, patient.displayName))),
        h('form', { onSubmit: createPatient, style: { display: 'flex', gap: 10, marginTop: 18, alignItems: 'end', flexWrap: 'wrap' } }, formField('显示名称', { name: 'displayName', required: true, maxLength: 80, placeholder: '例如：张阿姨' }), h('button', { type: 'submit', style: orangeButton, disabled: busy }, '建立患者资料')))

      if (!selected) return layout(patientList)
      const metrics = dashboard?.latestObservations || []
      const overview = h('section', { style: cardStyle }, h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' } }, h('h2', { style: { margin: 0 } }, `${selected.displayName} · 当前指标`), h('div', { style: { display: 'flex', gap: 8 } }, h('button', { type: 'button', style: subtleButton, disabled: busy, onClick: exportReport }, '导出 HTML 报告'), h('button', { type: 'button', style: orangeButton, disabled: busy, onClick: () => askAdvice() }, '给我建议'))),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10, marginTop: 14 } }, ...metrics.map((metric) => h('div', { key: metric.metricCode, style: { padding: 14, borderRadius: 14, background: '#f8fbf8', border: '1px solid #edf2ee' } }, h('strong', null, metric.metricCode), h('div', { style: { fontSize: 21, marginTop: 6 } }, `${metric.valueRaw} ${metric.unitRaw || ''}`), h('small', { style: { color: '#697a71' } }, metric.delta == null ? '首次记录' : `较前次 ${metric.delta > 0 ? '+' : ''}${metric.delta}`)))),
        h('form', { onSubmit: recordObservation, style: { display: 'flex', gap: 10, marginTop: 18, alignItems: 'end', flexWrap: 'wrap' } }, formField('检测项目', { name: 'metricCode', required: true, placeholder: '例如：CA19-9' }), formField('数值', { name: 'valueNum', type: 'number', step: 'any', required: true }), formField('单位', { name: 'unitRaw', placeholder: 'U/mL' }), formField('日期', { name: 'occurredAt', type: 'date', required: true }), h('button', { type: 'submit', style: orangeButton, disabled: busy }, '记录检测结果')))
      const schedulePanel = h('section', { style: cardStyle }, h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' } }, h('h2', { style: { margin: 0 } }, '未来安排'), h('button', { type: 'button', style: orangeButton, disabled: busy, onClick: () => askAdvice('care', 'pancreatic-care-manager', '全程管理') }, '给我建议')),
        h('p', { style: { color: '#697a71', marginTop: 6 } }, '把化疗、血常规、门诊、增强 CT 等安排放在这里，后续将由周期计划生成提醒。'),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 } }, ...(dashboard?.upcomingAppointments || []).map((item) => h('div', { key: item.id, style: { padding: 14, borderRadius: 14, background: '#fff8f2', border: '1px solid #f6dfd2' } }, h('strong', null, item.kindCode), h('div', { style: { marginTop: 5 } }, item.scheduledAt), item.organization ? h('small', { style: { display: 'block', color: '#697a71' } }, item.organization) : null, item.note ? h('small', { style: { display: 'block', color: '#697a71', marginTop: 4 } }, item.note) : null, h('details', { style: { marginTop: 10 } }, h('summary', { style: { cursor: 'pointer', color: '#567e70' } }, '修改时间或备注'), h('form', { onSubmit: (event) => editAppointment(item.id, event), style: { display: 'grid', gap: 8, marginTop: 8 } }, formField('计划时间', { name: 'scheduledAt', type: 'datetime-local', required: true, defaultValue: item.scheduledAt.slice(0, 16) }), formField('备注', { name: 'note', defaultValue: item.note || '' }), h('button', { type: 'submit', style: subtleButton, disabled: busy }, '保存修改'))), h('div', { style: { display: 'flex', gap: 8, marginTop: 10 } }, h('button', { type: 'button', style: subtleButton, disabled: busy, onClick: () => setAppointmentStatus(item.id, 'completed') }, '标记完成'), h('button', { type: 'button', style: subtleButton, disabled: busy, onClick: () => setAppointmentStatus(item.id, 'cancelled') }, '取消安排'))))),
        h('form', { onSubmit: recordAppointment, style: { display: 'flex', gap: 10, marginTop: 18, alignItems: 'end', flexWrap: 'wrap' } }, formField('事项类型', { name: 'kindCode', required: true, placeholder: '例如：chemotherapy' }), formField('计划时间', { name: 'scheduledAt', type: 'datetime-local', required: true }), formField('机构/科室', { name: 'organization', placeholder: '例如：肿瘤科' }), formField('备注', { name: 'note', placeholder: '例如：化疗前血常规' }), h('button', { type: 'submit', style: orangeButton, disabled: busy }, '添加安排')))
      const nutritionEntries = nutrition?.entries || []
      const hasNutritionDemo = nutritionEntries.some((entry) => entry.note?.startsWith('[UI DEMO] prototype-v3 模拟营养记录'))
      const nutritionMeasures = [
        ['体重', 'weightKg', 'kg'], ['BMI', 'bmi', ''], ['摄入能量', 'intakeKcal', 'kcal'],
      ]
      const nutritionPoints = (field) => nutritionEntries.map((entry) => ({
        occurredAt: entry.occurredAt,
        valueNum: field === 'bmi' ? (entry.weightKg && dashboard?.patient?.heightCm ? Number((entry.weightKg / ((dashboard.patient.heightCm / 100) ** 2)).toFixed(1)) : null) : entry[field],
      })).filter((entry) => entry.valueNum != null).slice(0, 5).reverse()
      const nutritionHistoryChart = (points, label, unit) => {
        const valid = points.filter((point) => Number.isFinite(Number(point.valueNum)) && Number.isFinite(Date.parse(point.occurredAt)))
        if (valid.length < 2) return h('p', { className: 'xyb-note' }, valid.length ? '已有 1 次记录；再记录一次后可查看折线趋势。' : '暂无可绘制的营养记录。')
        const values = valid.map((point) => Number(point.valueNum))
        const low = Math.min(...values), high = Math.max(...values), padding = Math.max((high - low) * .15, Math.abs(high) * .03, .5), min = low - padding, max = high + padding
        const coords = valid.map((point, index) => ({ x: 48 + index * 254 / (valid.length - 1), y: 66 - (Number(point.valueNum) - min) / (max - min) * 48, point }))
        return h(React.Fragment, null,
          h('svg', { className: 'xyb-nutrition-line-chart', viewBox: '0 0 320 88', preserveAspectRatio: 'none', role: 'img', 'aria-label': `${label}最近 ${valid.length} 次折线趋势，单位 ${unit || '无'}` },
            ...[18, 42, 66].map((y) => h('line', { key: y, x1: 44, x2: 312, y1: y, y2: y, stroke: '#e8eee8', strokeWidth: 1 })),
            h('text', { x: 1, y: 18, fill: '#78847e', fontSize: 9, dominantBaseline: 'middle' }, max.toLocaleString('zh-CN', { maximumFractionDigits: 1 })),
            h('text', { x: 1, y: 66, fill: '#78847e', fontSize: 9, dominantBaseline: 'middle' }, min.toLocaleString('zh-CN', { maximumFractionDigits: 1 })),
            h('polyline', { points: coords.map(({ x, y }) => `${x},${y}`).join(' '), fill: 'none', stroke: '#e88755', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }),
            ...coords.map(({ x, y, point }, index) => h('circle', { key: `${point.occurredAt}-${index}`, cx: x, cy: y, r: index === coords.length - 1 ? 4.5 : 3.5, fill: '#e88755', stroke: '#fff', strokeWidth: 1.5 }, h('title', null, `${point.occurredAt} · ${point.valueNum} ${unit}`)))),
          h('div', { className: 'xyb-nutrition-chart-dates' }, ...valid.map((point, index) => h('span', { key: `${point.occurredAt}-${index}` }, point.occurredAt))))
      }
      const nutritionPanel = h('section', { style: cardStyle }, h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' } }, h('h2', { style: { margin: 0 } }, '营养管理'), h('button', { type: 'button', style: orangeButton, disabled: busy, onClick: () => askAdvice('nutrition', 'nutrition-assistant', '营养管理', { nutrition }) }, '给我建议')),
        nutrition?.latest ? h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 } }, ...[['体重', nutrition.latest.weightKg, 'kg'], ['BMI', nutrition.latest.bmi, ''], ['能量', nutrition.latest.intakeKcal, 'kcal'], ['蛋白质', nutrition.latest.proteinG, 'g']].map(([label, value, unit]) => h('div', { key: label, style: { padding: 14, minWidth: 115, borderRadius: 14, background: '#f4f9f5', border: '1px solid #dcece1' } }, h('small', { style: { color: '#61756a' } }, label), h('div', { style: { fontSize: 20, marginTop: 5 } }, value == null ? '—' : `${value} ${unit}`)))) : h('p', { style: { color: '#697a71' } }, '尚无营养记录。'),
        h('form', { onSubmit: recordNutrition, style: { display: 'flex', gap: 10, marginTop: 18, alignItems: 'end', flexWrap: 'wrap' } }, formField('日期', { name: 'occurredAt', type: 'date', required: true }), formField('体重 kg', { name: 'weightKg', type: 'number', step: 'any' }), formField('能量 kcal', { name: 'intakeKcal', type: 'number', step: 'any' }), formField('蛋白质 g', { name: 'proteinG', type: 'number', step: 'any' }), h('button', { type: 'submit', style: orangeButton, disabled: busy }, '记录营养')),
        h('h3', { style: { marginTop: 24 } }, '营养制剂使用'),
        h('form', { onSubmit: recordNutritionProduct, style: { display: 'flex', gap: 10, marginTop: 10, alignItems: 'end', flexWrap: 'wrap' } }, formField('日期', { name: 'occurredAt', type: 'date', required: true }), formField('制剂名称', { name: 'productName', required: true, placeholder: '例如：肠内营养乳剂' }), formField('类型', { name: 'productType', placeholder: '例如：整蛋白型' }), formField('用量 mL', { name: 'volumeMl', type: 'number', step: 'any' }), formField('能量 kcal', { name: 'energyKcal', type: 'number', step: 'any' }), formField('蛋白质 g', { name: 'proteinG', type: 'number', step: 'any' }), h('button', { type: 'submit', style: orangeButton, disabled: busy }, '记录制剂')),
        h('h3', { style: { marginTop: 24 } }, '胰酶替代（PEI）记录'), h('p', { className: 'xyb-note' }, '记录实际用药与进餐情况，按处方填写；此处不计算或建议剂量。'),
        h('form', { onSubmit: recordPei, style: { display: 'flex', gap: 10, marginTop: 10, alignItems: 'end', flexWrap: 'wrap' } }, formField('日期', { name: 'occurredAt', type: 'date', required: true, defaultValue: todayLocal }), h('label', { style: { display: 'grid', gap: 6, flex: 1, minWidth: 160, fontWeight: 650 } }, '关联药物记录', h('select', { name: 'medicationRecordId', style: inputStyle }, h('option', { value: '' }, '暂不关联'), ...(careRecords.medications || []).map((medication) => h('option', { key: medication.id, value: medication.id }, `${medication.drugCode}${medication.doseText ? ` · ${medication.doseText}` : ''}`)))), h('label', { style: { display: 'grid', gap: 6, flex: 1, minWidth: 140, fontWeight: 650 } }, '与进餐关系', h('select', { name: 'withMeal', style: inputStyle }, h('option', { value: '' }, '未记录'), h('option', { value: 'yes' }, '随餐 / 按医嘱'), h('option', { value: 'no' }, '未随餐'))), formField('剂量原文', { name: 'doseText', placeholder: '照处方填写' }), formField('排便变化', { name: 'stoolChangeCode', placeholder: '按实际情况记录' }), formField('备注', { name: 'note', placeholder: '可选' }), h('button', { type: 'submit', style: orangeButton, disabled: busy }, '保存 PEI 记录')),
        h('div', { style: { marginTop: 14 } }, ...(nutrition?.products || []).slice(0, 5).map((usage) => h('div', { key: usage.id, style: { padding: '9px 0', borderTop: '1px solid #edf2ee' } }, h('strong', null, usage.productName), h('span', { style: { color: '#697a71', marginLeft: 8, fontSize: 13 } }, `${usage.occurredAt} · ${usage.volumeMl || '—'} mL · ${usage.energyKcal || '—'} kcal`)))) )
      const nutritionLogPanel = h('div', { className: 'xyb-grid xyb-two' },
        h('section', { className: 'xyb-panel' }, h('h3', null, '近期营养记录'), nutritionEntries.length ? nutritionEntries.slice(0, 8).map((entry) => h('div', { key: entry.occurredAt, className: 'xyb-list-row' }, h('span', null, h('strong', null, entry.occurredAt), h('small', null, entry.note || '')),
          h('span', { className: 'xyb-nutrition-values' }, entry.weightKg == null ? '' : `${entry.weightKg} kg`, entry.intakeKcal == null ? '' : `${entry.intakeKcal} kcal`, entry.proteinG == null ? '' : `${entry.proteinG} g`))) : h('p', { className: 'xyb-empty' }, '尚无体重或摄入记录。')),
        h('section', { className: 'xyb-panel' }, h('h3', null, '营养制剂使用记录'), nutrition?.products?.length ? nutrition.products.slice(0, 8).map((usage) => h('div', { key: usage.id, className: 'xyb-list-row' }, h('span', null, h('strong', null, usage.productName), h('small', null, `${usage.productType || '类型未注明'} · ${usage.note || ''}`)), h('span', { className: 'xyb-nutrition-values' }, `${usage.occurredAt}`, `${usage.volumeMl ?? '—'} mL`, `${usage.energyKcal ?? '—'} kcal`, `${usage.proteinG ?? '—'} g`))) : h('p', { className: 'xyb-empty' }, '尚无营养制剂使用记录。')),
        h('section', { className: 'xyb-panel' }, h('h3', null, '胰酶替代（PEI）记录'), nutrition?.peiRecords?.length ? nutrition.peiRecords.slice(0, 8).map((record) => h('div', { key: record.id, className: 'xyb-list-row' }, h('span', null, h('strong', null, `${record.occurredAt} · ${record.medicationName || '未关联药物'}`), h('small', null, [record.doseText, record.withMeal == null ? '进餐关系未记录' : record.withMeal ? '随餐' : '未随餐', record.stoolChangeCode, record.note].filter(Boolean).join(' · '))), h('span', { className: 'xyb-pill' }, '本人记录'))) : h('p', { className: 'xyb-empty' }, '尚无 PEI 记录。按处方记录用药和进餐情况即可。')))
      const pendingCandidates = candidates.filter((candidate) => candidate.status === 'candidate')
      const trialSections = ['入组档案', '试验检索', '匹配分析', '我的关注', '数据来源']
      const clinicalPanels = [
        ['基因检测（分子特征）', molecularResults.filter((item) => item.assayType !== 'IHC'), 'gene'],
        ['病理 / 免疫组化（IHC）', molecularResults.filter((item) => item.assayType === 'IHC'), 'ihc'],
      ].map(([title, rows, kind]) => {
        const hiddenRows = rows.filter((item) => ['negative', 'not_tested'].includes(item.resultType))
        const visibleRows = rows.filter((item) => !['negative', 'not_tested'].includes(item.resultType))
        const resultRow = (item) => {
          const measure = [item.vafPct != null ? `VAF ${item.vafPct}%` : null, item.intensity, item.positivePct != null ? `阳性 ${item.positivePct}%` : null, item.cps != null ? `CPS ${item.cps}` : null, item.scoreText].filter(Boolean).join(' · ')
          const method = [item.testMethod || item.assayType, item.occurredAt || '日期未记录'].filter(Boolean).join(' · ')
          const source = item.sourceDocumentTitle || (item.sourceLocator?.includes('模拟数据') ? '模拟档案记录' : '手动录入')
          const state = item.resultType === 'uncertain' || item.resultType === 'vus' ? '待核对' : item.resultType === 'score' || item.resultType === 'percentage' || item.resultType === 'protein_expression' ? '检测结果' : kind === 'ihc' ? '阳性表达' : '检出变异'
          return h('div', { className: 'xyb-clinical-row', key: item.id },
            h('div', null, h('strong', null, item.markerCode), h('small', null, [item.geneCode, method].filter(Boolean).join(' · '))),
            h('div', null, h('strong', { className: 'xyb-clinical-result' }, item.resultRaw || '结果未填写'), h('small', null, [item.alterationCode, item.variantHgvs].filter(Boolean).join(' · ') || '变异类型未注明')),
            h('div', null, h('strong', null, measure || '丰度 / 表达量未提供'), h('span', { className: 'xyb-clinical-state' }, state)),
            h('div', { className: 'xyb-clinical-source' }, h('strong', null, source), h('small', null, item.sourceLocator || '原文位置未关联')))
        }
        const resultList = (list) => list.length ? h('div', null, h('div', { className: 'xyb-clinical-table-head' }, ...['靶点 / 检测项', '检测结果 / 变异类型', '丰度 / 表达', '检测时间 / 来源'].map((label) => h('span', { key: label }, label))), ...list.map(resultRow)) : h('p', { className: 'xyb-empty' }, '暂无这类检测记录。')
        return h('section', { className: 'xyb-panel xyb-clinical-group', key: kind },
          h('div', { className: 'xyb-clinical-group-head' }, h('div', null, h('h3', null, title), h('p', null, '记录按原始检测结果整理；未检测、未检出与结果不确定分别保留。')), h('span', { className: 'xyb-pill' }, `${rows.length} 项`)),
          resultList(visibleRows),
          hiddenRows.length ? h('details', { className: 'xyb-clinical-fold' }, h('summary', null, `展开未检出 / 未检测（${hiddenRows.filter((item) => item.resultType === 'negative').length} 项未检出 · ${hiddenRows.filter((item) => item.resultType === 'not_tested').length} 项未检测）`), resultList(hiddenRows), h('p', { className: 'xyb-clinical-note' }, '未检出表示该项已检测且报告未检出；未检测表示尚无该项检测结果。两者含义不同。')) : null)
      })
      const trialProfilePanel = h(React.Fragment, null,
        h('div', { className: 'xyb-match-overview' }, h('h3', null, '已确认资料概览'), h('p', null, '按 v2 档案结构分组展示基因检测、免疫组化及来源信息。资料不完整时保留空缺，不推断是否符合入组条件。'), h('div', { className: 'xyb-grid xyb-status-grid' }, ...[
          ['分子检测', `${molecularResults.filter((item) => item.assayType !== 'IHC').length} 项`, '靶点、变异类型、VAF 与检测方法', 'mint'],
          ['病理免疫组化', `${molecularResults.filter((item) => item.assayType === 'IHC').length} 项`, '结果、强度、阳性比例与评分', 'pink'],
          ['相关原始报告', `${documents.filter((doc) => /病理|基因|ngs|ihc/i.test(`${doc.title} ${doc.kindCode}`)).length} 份`, '可在病情整理中查看原件和解析', 'blue'],
          ['待核对字段', `${pendingCandidates.length} 项`, '确认前不作为已确认资料', 'yellow'],
        ].map(([label, value, detail, tint]) => h('article', { className: `xyb-status ${tint}`, key: label }, h('span', null, label), h('strong', null, value), h('p', null, detail))))),
        ...clinicalPanels,
        h('div', { className: 'xyb-clinical-note' }, '来源与检测方法用于追溯记录，不代表疗效证据等级。缺失、未检测或未检出不等于符合或不符合试验条件；请由患者、主治医生和研究中心逐项核对。'))
      const trialCards = trials.map((trial) => {
        const saved = bookmarks.some((item) => item.trialKey === trial.trialKey && item.state !== 'archived')
        return h('article', { key: trial.trialKey, className: 'xyb-trial-card' }, h('div', { className: 'xyb-trial-mark' }, '⌕'), h('div', { className: 'xyb-trial-body' }, h('h3', null, trial.title), h('p', null, [trial.trialKey, trial.phase, trial.status, trial.sourceCode].filter(Boolean).join(' · ')), trial.indication ? h('p', null, trial.indication) : null, trial.drugs ? h('div', { className: 'xyb-trial-tags' }, ...String(trial.drugs).split(/[;,，、]/u).slice(0, 5).map((drug) => h('span', { key: drug, className: 'xyb-pill' }, drug.trim()))) : null, h('div', { className: 'xyb-row-actions' }, h('button', { type: 'button', className: 'xyb-btn secondary', disabled: busy, onClick: () => openTrialDetail(trial.trialKey) }, '打开详情'), h('button', { type: 'button', className: 'xyb-btn secondary', disabled: busy || saved, onClick: () => saveTrial(trial.trialKey, trial) }, saved ? '已在我的关注' : '加入我的关注'), h('button', { type: 'button', className: 'xyb-btn', disabled: busy, onClick: () => { setAnalysisTrial(trial); setTrialSection('匹配分析') } }, '查看条件对照'))))
      })
      const analysisTarget = analysisTrial || trials[0] || null
      const trialMatchPanel = h('div', { className: 'xyb-trial-match-layout' },
        analysisTarget ? h(React.Fragment, null,
          h('section', { className: 'xyb-panel' }, h('div', { className: 'xyb-section-head', style: { marginTop: 0 } }, h('div', null, h('h3', null, '当前对照对象'), h('p', null, [analysisTarget.trialKey, analysisTarget.phase, analysisTarget.status].filter(Boolean).join(' · '))), h('button', { type: 'button', className: 'xyb-btn secondary', onClick: () => openTrialDetail(analysisTarget.trialKey), disabled: busy }, '查看登记详情')), h('strong', null, analysisTarget.title), h('p', { className: 'xyb-note' }, analysisTarget.indication || '登记适应症未标注'), h('div', { className: 'xyb-list-row' }, h('span', null, '研究药物'), h('strong', null, analysisTarget.drugs || '登记未标注')), h('div', { className: 'xyb-list-row' }, h('span', null, '数据来源与更新时间'), h('strong', null, `${analysisTarget.sourceCode || '来源未标注'} · ${analysisTarget.updatedAt || '日期未标注'}`))),
          h('div', { className: 'xyb-grid xyb-two' },
            h('section', { className: 'xyb-panel' }, h('h3', null, '患者档案 · 已确认记录'), molecularResults.length ? molecularResults.slice(0, 8).map((item) => h('div', { className: 'xyb-list-row', key: item.id }, h('span', null, h('strong', null, `${item.markerCode} · ${item.resultRaw}`), h('small', null, `${item.testMethod || item.assayType} · ${item.occurredAt || '日期未记录'}`)), h('small', null, item.sourceDocumentTitle || '手动录入'))) : h('p', { className: 'xyb-empty' }, '暂无已确认的基因或 IHC 记录。可先在「入组档案」查看并补充。'), h('button', { type: 'button', className: 'xyb-link', onClick: () => setTrialSection('入组档案') }, '查看完整入组档案 →')),
            h('section', { className: 'xyb-panel' }, h('h3', null, '试验登记条件 · 原文'), h('p', { style: { whiteSpace: 'pre-wrap', maxHeight: 230, overflow: 'auto' } }, analysisTarget.eligibilityText || '当前检索结果未包含详细入排标准。打开登记详情或联系研究中心核对。'), h('p', { className: 'xyb-note' }, '本页不把关键词相似度转换成入组结论。每条标准需对照原始档案和正式登记信息。'))),
          h('section', { className: 'xyb-panel' }, h('div', { className: 'xyb-trial-groups' }, ...[
            ['已确认资料', '仅展示患者档案中已确认且可追溯来源的信息。'],
            ['可能冲突', '当前版本未对登记条件做规则化判定，不能把用药或检查信息自动标记为冲突。'],
            ['无法判定', '缺失、未检测或未导入不等于不符合；需补齐后逐项核对。'],
            ['待确认规则', '试验条件需依据登记原文及研究中心答复确认。'],
          ].map(([title, copy]) => h('div', { className: 'xyb-trial-group', key: title }, h('strong', null, title), h('p', null, copy)))), h('div', { className: 'xyb-row-actions' }, h('button', { type: 'button', className: 'xyb-btn secondary', disabled: busy, onClick: () => setActiveTab('records') }, '补充病情资料'), h('button', { type: 'button', className: 'xyb-btn secondary', disabled: busy, onClick: () => saveTrial(analysisTarget.trialKey, analysisTarget) }, bookmarks.some((item) => item.trialKey === analysisTarget.trialKey) ? '已在我的关注' : '加入我的关注'), h('button', { type: 'button', className: 'xyb-btn', disabled: busy, onClick: () => askAboutTrial(analysisTarget) }, '交给 Agent 核对')))
        ) : h('section', { className: 'xyb-panel' }, h('h3', null, '还没有选定试验'), h('p', null, '先在「试验检索」中查看候选记录，再回到这里整理原始条件与患者已确认资料。'), h('button', { type: 'button', className: 'xyb-btn', onClick: () => setTrialSection('试验检索') }, '去试验检索')))
      const bookmarkedTrialCards = bookmarks.map((item) => {
        const snapshot = item.snapshot || {}, stateLabels = { saved: '已关注', contacted: '已联系研究中心', archived: '已归档' }
        return h('article', { key: item.id, className: 'xyb-trial-card xyb-follow-card' }, h('div', { className: 'xyb-trial-mark' }, '♡'), h('div', { className: 'xyb-trial-body' }, h('h3', null, snapshot.title || item.trialKey), h('p', null, [item.trialKey, snapshot.phase, snapshot.status, snapshot.sourceCode].filter(Boolean).join(' · ')), h('p', { className: 'xyb-note' }, `收藏快照 · ${item.updatedAt || item.createdAt || '日期未记录'} · ${stateLabels[item.state] || item.state}`), item.note ? h('p', null, `我的备注：${item.note}`) : null, h('div', { className: 'xyb-row-actions' }, h('button', { type: 'button', className: 'xyb-btn secondary', onClick: () => openSavedTrial(item) }, '查看收藏详情'), h('button', { type: 'button', className: 'xyb-btn secondary', disabled: busy, onClick: () => askAboutTrial(snapshot.title ? snapshot : { trialKey: item.trialKey, title: item.trialKey }) }, '交给 Agent'), item.state !== 'contacted' ? h('button', { type: 'button', className: 'xyb-link', disabled: busy, onClick: () => saveTrial(item.trialKey, snapshot, 'contacted', item.note) }, '标记已联系') : null, item.state !== 'archived' ? h('button', { type: 'button', className: 'xyb-link', disabled: busy, onClick: () => saveTrial(item.trialKey, snapshot, 'archived', item.note) }, '归档关注') : null)))
      })
      const selectField = (label, name, options, required = false) => h('label', { style: { display: 'grid', gap: 6, flex: 1, minWidth: 130, fontWeight: 650 } }, label, h('select', { name, required, style: inputStyle }, ...options.map(([value, text]) => h('option', { key: value, value }, text))))
      const molecularPanel = h('section', { className: 'xyb-panel', style: { marginTop: 14 } },
        h('h3', null, '基因与免疫组化档案'), h('p', { className: 'xyb-note' }, '逐项录入靶点、突变/表达、丰度和报告来源。页面中的“证据来源”仅说明记录来自报告或手动填写，不代表临床试验证据等级。'),
        h('form', { onSubmit: recordMolecularResult, className: 'xyb-form' },
          selectField('检测类型', 'assayType', [['NGS', '基因测序 NGS'], ['PCR', 'PCR'], ['IHC', '免疫组化 IHC'], ['FISH', 'FISH'], ['other', '其他']], true),
          formField('靶点 / 标记', { name: 'markerCode', required: true, placeholder: '例如：KRAS、CLDN18.2、TROP2' }),
          formField('基因', { name: 'geneCode', placeholder: '例如：KRAS' }),
          selectField('结果类型', 'resultType', [['positive', '阳性'], ['negative', '阴性'], ['percentage', '百分比'], ['score', '评分'], ['cps', 'CPS'], ['protein_expression', '蛋白表达'], ['not_tested', '未检测'], ['unknown', '未知']], true),
          formField('报告结果', { name: 'resultRaw', required: true, placeholder: '例如：G12D、阳性 3+' }),
          formField('突变类型 / HGVS', { name: 'alterationCode', placeholder: '例如：错义突变' }), formField('HGVS 表达', { name: 'variantHgvs', placeholder: '报告原文' }),
          formField('丰度 VAF %', { name: 'vafPct', type: 'number', min: 0, max: 100, step: 'any' }), formField('IHC 强度', { name: 'intensity', placeholder: '例如：3+' }),
          formField('阳性比例 %', { name: 'positivePct', type: 'number', min: 0, max: 100, step: 'any' }), formField('CPS', { name: 'cps', type: 'number', min: 0, step: 'any' }),
          formField('检测方法', { name: 'testMethod', placeholder: '报告标注的方法' }), formField('分级/分类原文', { name: 'classificationCode', placeholder: '按报告填写' }),
          formField('检测日期', { name: 'occurredAt', type: 'date', required: true, defaultValue: todayLocal }),
          h('label', { style: { display: 'grid', gap: 6, flex: 1, minWidth: 180, fontWeight: 650 } }, '关联来源报告', h('select', { name: 'sourceDocumentId', style: inputStyle }, h('option', { value: '' }, '手动录入（需核对原件）'), ...documents.map((doc) => h('option', { key: doc.id, value: doc.id }, `${doc.title} · ${doc.reportedAt || '日期未填'}`)))),
          formField('页码 / 原文位置', { name: 'sourceLocator', placeholder: '例如：第 4 页，结果段' }),
          h('button', { type: 'submit', className: 'xyb-btn', disabled: busy }, '保存档案')),
        h('div', { className: 'xyb-molecular-table' }, h('div', { className: 'xyb-molecular-row header' }, ...['检测日期', '靶点/突变', '丰度/表达', '来源与证据'].map((label) => h('strong', { key: label }, label))),
          molecularResults.length ? molecularResults.map((item) => h('div', { className: 'xyb-molecular-row', key: item.id }, h('span', null, item.occurredAt), h('span', null, h('strong', null, item.markerCode), h('small', null, [item.geneCode, item.alterationCode, item.variantHgvs].filter(Boolean).join(' · ') || item.assayType)), h('span', null, [item.vafPct != null ? `VAF ${item.vafPct}%` : null, item.intensity, item.positivePct != null ? `阳性 ${item.positivePct}%` : null, item.cps != null ? `CPS ${item.cps}` : null, item.scoreText, item.resultRaw].filter(Boolean).join(' · ')), h('span', null, h('strong', null, item.sourceDocumentTitle || '手动录入'), h('small', null, item.sourceDocumentTitle ? `${item.sourceLocator || '报告来源已关联'} · 已确认` : '请回到报告原文核对')))) : h('p', { className: 'xyb-empty' }, '尚无结构化基因或 IHC 记录。录入时请逐字对照检测报告。')))
      const trialPanel = h('section', { className: 'xyb-panel' },
        h('div', { className: 'xyb-section-head', style: { marginTop: 0 } }, h('div', null, h('h2', null, '临床线索'), h('p', null, '检索、匹配、收藏和数据来源分别查看；结果不代表入组判断。')), h('button', { type: 'button', className: 'xyb-btn', disabled: busy, onClick: () => askAdvice('trials', 'trial-search-assistant', '临床匹配', { trialMeta, trials, bookmarks }) }, '给我建议')),
        h('div', { className: 'xyb-chart-tools', role: 'tablist', 'aria-label': '临床匹配页面' }, ...trialSections.map((section) => h('button', { key: section, type: 'button', role: 'tab', className: 'xyb-chart-pick', 'aria-selected': trialSection === section, onClick: () => setTrialSection(section) }, section))),
        trialSection === '入组档案' ? trialProfilePanel
          : trialSection === '试验检索' ? h(React.Fragment, null, h('form', { onSubmit: searchTrials, className: 'xyb-trial-search' }, formField('关键词', { name: 'query', placeholder: '输入药物、靶点、试验编号或疾病关键词' }), selectField('数据来源', 'source', [['', '全部本机来源'], ['cnctr', '中国药物临床试验登记']], false), selectField('招募状态', 'recruitment', [['', '全部状态'], ['recruiting', '招募中/进行中']], false), h('button', { type: 'submit', className: 'xyb-btn', disabled: busy }, '本机检索')), h('p', { className: 'xyb-note' }, trialMeta ? `本机试验快照 · ${trialMeta.record_count} 条 · 数据日期 ${trialMeta.built_at || '未记录'} · 当前筛选 ${trialFilters.source === 'cnctr' ? '中国登记' : '全部来源'}${trialFilters.recruitment ? ' · 招募/进行中' : ''}` : '正在读取本机试验快照。'), h('div', { className: 'xyb-list-row' }, h('strong', null, `检索结果 · ${trials.length} 条`), h('span', null, '每条结果可查看登记详情、整理条件或保存到「我的关注」')), trials.length ? trialCards : h('p', { className: 'xyb-empty' }, '没有匹配结果。可调整关键词或筛选条件后重试。'))
          : trialSection === '匹配分析' ? trialMatchPanel
            : trialSection === '我的关注' ? h(React.Fragment, null, h('h3', null, `我的关注 · ${bookmarks.filter((item) => item.state !== 'archived').length} 项`), bookmarks.length ? bookmarkedTrialCards : h('p', { className: 'xyb-empty' }, '还没有关注的试验。可以在试验检索结果中打开详情后加入关注。'), h('h3', { style: { marginTop: 24 } }, '关注条件'), h('p', { className: 'xyb-note' }, '关注词会保存在本机。当前版本记录关注条件；自动定时检索和日报生成尚未接通。'), h('form', { onSubmit: subscribeTrials, className: 'xyb-form' }, formField('关注靶点、药物或临床名称', { name: 'queryText', required: true, placeholder: '例如：KRAS G12D' }), h('button', { type: 'submit', className: 'xyb-btn', disabled: busy }, '保存关注条件')), subscriptions.length ? subscriptions.map((item) => h('div', { key: item.id, className: 'xyb-list-row' }, h('span', null, h('strong', null, item.queryText), h('small', null, `${item.scheduleCode} · ${item.status}`)), h('span', { className: 'xyb-pill' }, '本机订阅'))) : h('p', { className: 'xyb-empty' }, '尚无关注条件。'))
              : h(React.Fragment, null, h('div', { className: 'xyb-source-card' }, h('h3', null, '本机临床试验数据'), h('p', null, trialMeta ? `胰腺癌快照包含 ${trialMeta.record_count} 条记录。构建时间：${trialMeta.built_at || '未记录'}。` : '数据元信息读取中。'), h('p', null, '本页检索使用随工作台提供的离线快照；快照状态不等于研究中心实时招募状态。'), h('span', { className: 'xyb-pill' }, '离线数据 · 需向研究中心确认')),
                h('div', { className: 'xyb-source-card' }, h('h3', null, '更新与来源'), h('p', null, '数据来源、更新时间、字段覆盖范围和本机更新状态将随数据集 manifest 完成后逐项展示。当前来源级版本信息尚未写入 UI。'))))
      const reminderRows = dashboard?.reminders?.length ? dashboard.reminders.map((item) => h('div', { key: item.id, className: 'xyb-list-row' },
        h('span', null, h('strong', null, item.kindCode === 'blood-test' ? '化疗前血常规' : item.kindCode === 'contrast-ct' ? '增强 CT' : item.ruleCode), h('small', null, item.note || '按当前计划提醒')),
        h('span', null, h('small', null, item.dueAt), h('details', { style: { marginTop: 4 } }, h('summary', { style: { cursor: 'pointer', color: '#567e70' } }, '调整提醒时间'),
          h('form', { onSubmit: (event) => editReminder(item.id, event), style: { display: 'flex', gap: 6, marginTop: 6 } }, formField('提醒时间', { name: 'dueAt', type: 'datetime-local', required: true, defaultValue: item.dueAt.slice(0, 16) }), h('button', { type: 'submit', style: subtleButton, disabled: busy }, '保存'))))))
        : [h('p', { key: 'empty-reminders', className: 'xyb-empty' }, '暂无待处理提醒。')]
      const carePanel = h('section', { style: cardStyle }, h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' } }, h('h2', { style: { margin: 0 } }, '全程管理'), h('button', { type: 'button', style: orangeButton, disabled: busy, onClick: () => askAdvice('care', 'pancreatic-care-manager', '全程管理', { treatmentPlans }) }, '给我建议')),
        h('p', { style: { color: '#697a71', lineHeight: 1.65 } }, '建立计划后，会生成化疗、化疗前血常规及增强 CT 的日历条目。日期是待办安排，请与医疗团队确认后使用。'),
        h('form', { onSubmit: createTreatmentPlan, style: { display: 'flex', gap: 10, alignItems: 'end', flexWrap: 'wrap' } }, formField('化疗方案', { name: 'regimen', required: true, placeholder: '例如：mFOLFIRINOX' }), formField('首次化疗', { name: 'firstAt', type: 'datetime-local', required: true }), formField('周期天数', { name: 'cycleDays', type: 'number', min: 1, defaultValue: 14, required: true }), formField('计划次数', { name: 'cycleCount', type: 'number', min: 1, max: 24, defaultValue: 4, required: true }), formField('血常规提前天数', { name: 'bloodTestLeadDays', type: 'number', min: 0, max: 30, defaultValue: 3 }), formField('CT 间隔天数', { name: 'ctIntervalDays', type: 'number', min: 30, defaultValue: 90 }), formField('CT 计划次数', { name: 'ctCount', type: 'number', min: 0, max: 8, defaultValue: 1 }), h('button', { type: 'submit', style: orangeButton, disabled: busy }, '生成治疗日历')),
        h('section', { style: { marginTop: 18, borderTop: '1px solid #edf2ee', paddingTop: 14 } }, h('h3', { style: { margin: '0 0 8px' } }, '本机提醒'), h('p', { style: { color: '#697a71', fontSize: 13, margin: '0 0 8px' } }, '提醒保存在本机日历数据中；可调整到预约前的时间，目前在工作台内查看，不会发送系统通知。'), ...reminderRows),
        h('div', { style: { marginTop: 18 } }, ...(treatmentPlans.length ? treatmentPlans.map((plan) => h('div', { key: plan.id, style: { borderTop: '1px solid #edf2ee', padding: '12px 0' } }, h('strong', null, `${plan.regimen || '未命名方案'} · 第 ${plan.lineNo} 线`), h('div', { style: { color: '#697a71', fontSize: 13, marginTop: 4 } }, ...plan.events.map((event) => h('span', { key: event.id, style: { display: 'inline-block', marginRight: 10 } }, `第 ${event.cycleNo} 次 ${event.scheduledAt}`))))) : [h('p', { key: 'empty', style: { color: '#697a71' } }, '尚未建立治疗周期计划。')])))
      const documentFilters = [['全部资料', () => true], ['影像', (doc) => /ct|影像|imaging/i.test(`${doc.kindCode} ${doc.title}`)], ['病理', (doc) => /path|病理|基因|ihc|ngs/i.test(`${doc.kindCode} ${doc.title}`)], ['检验', (doc) => /lab|检验|血常规|生化/i.test(`${doc.kindCode} ${doc.title}`)], ['治疗记录', (doc) => /treatment|治疗|用药/i.test(`${doc.kindCode} ${doc.title}`)]]
      const visibleDocuments = documents.filter((doc) => (documentFilters.find(([label]) => label === recordFilter)?.[1] || (() => true))(doc))
      const recordTopics = [
        ['基本情况', '诊断、分期与就诊医院'], ['病理与基因', '病理结论、基因检测和免疫组化'], ['影像与检查', '影像、检验与关键时间'], ['治疗经过', '方案、疗程和治疗反应'],
      ]
      const topicDocuments = documents.filter((doc) => {
        const text = `${doc.kindCode} ${doc.title}`
        if (recordTopic === '病理与基因') return /path|病理|基因|ihc|ngs/i.test(text)
        if (recordTopic === '影像与检查') return /ct|影像|imaging|lab|检验|血常规|生化/i.test(text)
        if (recordTopic === '治疗经过') return /treatment|治疗|用药|chemotherapy/i.test(text)
        return /basic|诊断|分期/i.test(text)
      })
      const topicMolecularResults = recordTopic === '病理与基因' ? molecularResults : []
      const documentPanel = h(React.Fragment, null,
        h('div', { className: 'xyb-module-hero' }, h('h3', null, '从一份资料开始'), h('p', null, '添加报告后，先查看原文，再核对识别结果并确认保存。未经确认的内容不会作为患者记录。'), h('form', { onSubmit: importDocument, className: 'xyb-form' }, formField('选择本机资料', { name: 'file', type: 'file', required: true, accept: '.txt,.md,.csv,.pdf,.docx,image/*' }), formField('资料类别', { name: 'kindCode', placeholder: '例如：lab、pathology、imaging' }), formField('报告日期', { name: 'reportedAt', type: 'date' }), h('button', { type: 'submit', className: 'xyb-btn', disabled: busy }, '＋ 添加资料'))),
        h('div', { className: 'xyb-grid xyb-two' }, h('section', { className: 'xyb-panel' }, h('h3', null, '最近整理'), documents.length ? documents.slice(0, 3).map((doc) => h('div', { key: doc.id, className: 'xyb-list-row' }, h('span', null, h('strong', null, doc.title), h('small', null, `${doc.kindCode} · ${doc.reportedAt || '报告日期未填'}`)), h('span', { className: `xyb-pill ${doc.pendingCandidateCount ? 'orange' : ''}` }, doc.pendingCandidateCount ? '待核对' : doc.parseStatus === 'parsed' ? '已解析' : '已归档'))) : h('p', { className: 'xyb-empty' }, '尚无导入资料。')), h('section', { className: 'xyb-panel' }, h('h3', null, '整理进度'), h('div', { className: 'xyb-list-row' }, h('span', null, '资料库'), h('strong', null, `${documents.length} 份`)), h('div', { className: 'xyb-list-row' }, h('span', null, '已确认指标'), h('strong', null, `${metrics.length} 项`)), h('div', { className: 'xyb-list-row' }, h('span', null, '需要核对'), h('strong', null, `${pendingCandidates.length} 项`)), h('p', { className: 'xyb-note' }, '识别结果可能有误，请对照原报告确认。'))),
        h('section', { className: 'xyb-panel', style: { marginTop: 16 } }, h('div', { className: 'xyb-section-head', style: { marginTop: 0 } }, h('div', null, h('h2', null, '资料库'), h('p', null, '按类别筛选本机已导入的原始资料。')), h('button', { type: 'button', className: 'xyb-btn', disabled: busy, onClick: () => askAdvice('records', 'pancreatic-care-manager', '病情整理', { documents, candidates }) }, '给我建议')), h('div', { className: 'xyb-chart-tools', role: 'group', 'aria-label': '筛选资料类型' }, ...documentFilters.map(([label]) => h('button', { key: label, type: 'button', className: 'xyb-chart-pick', 'aria-pressed': recordFilter === label, onClick: () => setRecordFilter(label) }, label))), visibleDocuments.length ? visibleDocuments.map((document) => h('div', { key: document.id, className: 'xyb-list-row' }, h('div', null, h('strong', null, document.title), h('small', null, `${document.kindCode} · ${document.reportedAt || '报告日期未填'} · ${document.parseStatus} · ${document.pendingCandidateCount || 0} 项待核对`)), h('div', { className: 'xyb-row-actions' }, h('button', { type: 'button', className: 'xyb-btn secondary', onClick: () => setPreviewDocument(document) }, '查看原件'), h('button', { type: 'button', className: 'xyb-btn', disabled: busy || document.parseStatus === 'parsing', onClick: () => parseDocument(document.id) }, document.parseStatus === 'pending' ? '解析' : '重新解析')))) : h('p', { className: 'xyb-empty' }, '这个类别还没有资料。')),
        h('section', { className: 'xyb-panel', style: { marginTop: 16 } }, h('div', { className: 'xyb-section-head', style: { marginTop: 0 } }, h('div', null, h('h2', null, '按主题查看'), h('p', null, '选择主题查看已归档资料；尚未结构化的字段会明确标出。'))), h('div', { className: 'xyb-chart-tools', role: 'tablist', 'aria-label': '病情整理主题' }, ...recordTopics.map(([title]) => h('button', { key: title, type: 'button', role: 'tab', className: 'xyb-chart-pick', 'aria-selected': recordTopic === title, onClick: () => setRecordTopic(title) }, title)), h('button', { type: 'button', className: 'xyb-btn', disabled: busy, onClick: () => askAdvice('records', 'pancreatic-care-manager', '病情整理', { topic: recordTopic, documents: topicDocuments, candidates: pendingCandidates }) }, '请 Agent 整理')),
          h('div', { className: 'xyb-record-summary' }, h('strong', null, recordTopic), h('p', null, recordTopic === '病理与基因' ? '基因、变异丰度、病理和 IHC 应以报告原文为准；当前显示已导入相关报告及待核对字段。' : recordTopic === '影像与检查' ? '影像报告中的新增、增大、变小或消失等描述，需回到原文逐份核对。' : recordTopic === '治疗经过' ? '方案和日期按已导入资料整理，未确认内容不会当作治疗事实。' : '仅显示当前患者资料库中的信息，不用示例患者内容填充。')),
          topicDocuments.length ? topicDocuments.map((doc) => h('div', { key: doc.id, className: 'xyb-list-row' }, h('span', null, h('strong', null, doc.title), h('small', null, `${doc.reportedAt || '日期未填'} · ${doc.parseStatus}`)), h('button', { type: 'button', className: 'xyb-link', onClick: () => setPreviewDocument(doc) }, '查看原件 →'))) : h('p', { className: 'xyb-empty' }, '这个主题暂无相关报告；请导入资料后查看。'),
          recordTopic === '病理与基因' ? h('section', { className: 'xyb-record-molecular' }, h('h3', null, '已整理的基因与免疫组化'), h('p', { className: 'xyb-note' }, '只展示本机已保存的报告事实或手动记录；来源与分级以原报告为准。'), topicMolecularResults.length ? h('div', { className: 'xyb-molecular-table' }, h('div', { className: 'xyb-molecular-row header' }, ...['检测日期', '靶点 / 结果', '丰度 / 表达', '报告来源'].map((label) => h('strong', { key: label }, label))), ...topicMolecularResults.map((item) => h('div', { className: 'xyb-molecular-row', key: item.id }, h('span', null, item.occurredAt), h('span', null, h('strong', null, `${item.markerCode} · ${item.resultRaw}`), h('small', null, [item.geneCode, item.alterationCode, item.variantHgvs, item.assayType].filter(Boolean).join(' · '))), h('span', null, [item.vafPct != null ? `VAF ${item.vafPct}%` : null, item.intensity, item.positivePct != null ? `阳性 ${item.positivePct}%` : null, item.cps != null ? `CPS ${item.cps}` : null].filter(Boolean).join(' · ') || '报告未提供'), h('span', null, h('small', null, item.sourceDocumentTitle || '手动录入'), item.sourceLocator ? h('small', null, item.sourceLocator) : null)))) : h('p', { className: 'xyb-empty' }, '尚无基因或 IHC 结构化记录。可在临床匹配的入组档案中补录并关联原报告。')) : null,
          pendingCandidates.length ? h('div', { className: 'xyb-candidate-list' }, h('h3', null, `待核对字段 · ${pendingCandidates.length}`), ...pendingCandidates.map((candidate) => h('div', { key: candidate.id, className: 'xyb-list-row' }, h('span', null, h('strong', null, `${candidate.payload.metricCode || candidate.factType}　${candidate.payload.valueRaw || ''} ${candidate.payload.unitRaw || ''}`), h('small', null, `${candidate.documentTitle} · ${candidate.payload.sourceText || candidate.sourceLocator || '原文位置待确认'}`)), h('span', { className: 'xyb-row-actions' }, h('button', { type: 'button', className: 'xyb-btn', disabled: busy, onClick: () => decideCandidate(candidate.id, true) }, '确认'), h('button', { type: 'button', className: 'xyb-btn secondary', disabled: busy, onClick: () => decideCandidate(candidate.id, false) }, '排除'))))) : null,
          h('p', { className: 'xyb-note' }, '页码级解析、逐页核对与跨页比对目前受本地解析器能力限制；上传的 PDF、DOCX 可查看或归档，但不能将“已上传”显示为“已解析”。')),
        h('div', { className: 'xyb-dashboard-footer' }, h('button', { type: 'button', className: 'xyb-btn', disabled: busy, onClick: () => askAdvice('records', 'pancreatic-care-manager', '病情整理', { documents, candidates }) }, '给我建议')))
      const sectionHead = (title, subtitle, action, onClick) => h('div', { className: 'xyb-section-head' }, h('div', null, h('h2', null, title), h('p', null, subtitle)), action ? h('button', { type: 'button', className: 'xyb-link', onClick }, `${action} →`) : null)
      const upcoming = dashboard?.upcomingAppointments || []
      const now = Date.now()
      const markerLabels = { CA199: '糖类抗原 19-9', 'CA19-9': '糖类抗原 19-9', CEA: '癌胚抗原', CA125: '糖类抗原 125' }
      const categoryFor = (code) => {
        const normalized = String(code).toUpperCase().replace(/[\s_]/g, '')
        if (/^(CA|CEA|AFP)/.test(normalized) || /糖类抗原|癌胚抗原|甲胎蛋白/.test(code)) return '肿瘤标志物'
        if (/^(WBC|RBC|HGB|HB|PLT|NEU|LYM|MONO)/.test(normalized) || /白细胞|红细胞|血红蛋白|血小板|中性粒|淋巴细胞/.test(code)) return '血常规'
        if (/^(ALT|AST|ALP|GGT|TBIL|DBIL|ALB)/.test(normalized) || /胆红素|白蛋白|转氨酶|碱性磷酸酶/.test(code)) return '肝功能'
        if (/^(CRP|PCT|ESR)/.test(normalized) || /反应蛋白|降钙素原|血沉/.test(code)) return '感染与炎症'
        if (/^(CREA|CREAT|EGFR|BUN|UA)/.test(normalized) || /肌酐|尿素|尿酸|肾小球滤过/.test(code)) return '肾功能'
        if (/^(GLU|HBA1C|CHOL|TG|LDL|HDL|BMI)/.test(normalized) || /血糖|胆固醇|甘油三酯|体重|能量|蛋白质/.test(code)) return '代谢与营养'
        if (/^(PT|INR|APTT|FIB|DD)/.test(normalized) || /凝血|纤维蛋白原|D-二聚体/.test(code)) return '凝血功能'
        return '其他指标'
      }
      const metricCategories = ['肿瘤标志物', '血常规', '肝功能', '感染与炎症', '肾功能', '代谢与营养', '凝血功能', '其他指标']
      const formatDelta = (value) => Number.isInteger(Number(value)) ? String(Number(value)) : Number(value).toFixed(1)
      const changedGroups = metricCategories.map((name) => ({ name, items: metrics.filter((metric) => metric.delta != null && categoryFor(metric.metricCode) === name) })).filter((group) => group.items.length)
      const statusItems = [
        ['体能状态', '本机暂无记录', '可在病情整理中补充已确认的体能评估', 'records', 'mint'],
        ['治疗经过', treatmentPlans.length ? `${treatmentPlans.length} 个计划` : '本机暂无记录', treatmentPlans.length ? `${treatmentPlans.reduce((sum, plan) => sum + (plan.events?.length || 0), 0)} 个治疗/检查节点已建立` : '可在全程管理中记录方案和日期', 'care', 'pink'],
        ['临床试验', bookmarks.length ? `${bookmarks.length} 项已收藏` : '尚未进行匹配', trialMeta ? `本机快照 ${trialMeta.record_count} 条，可进一步检索` : '查看本机试验资料', 'trials', 'blue'],
        ['营养状态', nutrition?.latest?.weightKg != null ? `体重 ${nutrition.latest.weightKg} kg` : '本机暂无记录', nutrition?.latest?.bmi != null ? `BMI ${nutrition.latest.bmi}` : '可记录体重与摄入', 'nutrition', 'yellow'],
        ['心理感受', '本机暂无近期记录', '可以按自己的节奏记录感受', 'mind', ''],
        ['并发症', '本机暂无结构化记录', '可在全程管理中补充并发症信息', 'care', 'mint'],
        ['用药与不适', '本机暂无结构化记录', '可整理治疗期间的用药和感受', 'care', 'pink'],
        ['资料完整度', `${documents.length} 份资料 · ${metrics.length} 项指标`, `${candidates.filter((candidate) => candidate.status === 'candidate').length} 项待核对`, 'records', 'blue'],
      ]
      const dashboardSteps = [
        ['患者资料', Boolean(selected), 'records'], ['已导入资料', documents.length > 0, 'records'], ['已确认指标', metrics.length > 0, 'one-page'], ['治疗安排', treatmentPlans.length > 0, 'care'],
      ]
      const completedDashboardSteps = dashboardSteps.filter(([, done]) => done).length
      const weightEntries = (nutrition?.entries || []).filter((entry) => entry.weightKg != null).slice(0, 6).reverse()
      const weightValues = weightEntries.map((entry) => Number(entry.weightKg))
      const weightLow = weightValues.length ? Math.min(...weightValues) : 0
      const weightSpan = Math.max(1, (weightValues.length ? Math.max(...weightValues) : 1) - weightLow)
      const weightCoords = weightEntries.map((entry, index) => ({ x: weightEntries.length < 2 ? 250 : 20 + index * 460 / (weightEntries.length - 1), y: 98 - (Number(entry.weightKg) - weightLow) / weightSpan * 68, entry }))
      const weightLine = weightCoords.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ')
      const nextFocus = [
        candidates.filter((candidate) => candidate.status === 'candidate').length ? ['核对待确认的报告字段', `${candidates.filter((candidate) => candidate.status === 'candidate').length} 项待确认`, 'records', '↗'] : null,
        !nutrition?.latest ? ['记录一次近期体重', '营养管理 · 记录后可查看变化', 'nutrition', '✳'] : null,
        !treatmentPlans.length ? ['整理治疗方案与复诊安排', '全程管理 · 可建立周期计划', 'care', '＋'] : null,
        trialMeta ? ['查看本机临床试验信息', `${trialMeta.record_count} 条本机快照`, 'trials', '⌕'] : null,
      ].filter(Boolean).slice(0, 3)
      const appointmentLabels = { chemotherapy: '化疗', 'blood-test': '化疗前血常规', 'contrast-ct': '增强 CT', outpatient: '门诊预约', 'tumor-marker': '肿瘤标志物检查' }
      const dateCountdown = (date) => Math.max(0, Math.ceil((Date.parse(date) - now) / 86400000))
      const calendarStart = Date.parse(`${todayLocal}T00:00:00`)
      const fortnight = upcoming.filter((item) => { const time = Date.parse(item.scheduledAt); return Number.isFinite(time) && time >= calendarStart && time < calendarStart + 14 * 86400000 })
      const calendarDays = Array.from({ length: 14 }, (_, offset) => {
        const date = new Date(`${todayLocal}T12:00:00`)
        date.setDate(date.getDate() + offset)
        return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
      })
      const selectedCalendarDate = calendarDays.includes(calendarSelectedDate) ? calendarSelectedDate : todayLocal
      const selectedDateEvents = fortnight.filter((item) => item.scheduledAt.slice(0, 10) === selectedCalendarDate)
      const weekdayLabels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      const calendarDateLabel = (date) => `${weekdayLabels[new Date(date + 'T12:00:00').getDay()]} · ${date.slice(5).replace('-', '月')}日`
      const recentClinicalNotes = changedGroups.flatMap((group) => group.items.map((metric) => ({ group: group.name, metric }))).slice(0, 4)
      const dashboardProgressRing = h('div', { className: 'xyb-completion', 'aria-label': '资料整理进度' }, h('svg', { viewBox: '0 0 100 100', role: 'img', 'aria-label': `本机资料整理进度 ${completedDashboardSteps} / ${dashboardSteps.length}` }, h('circle', { cx: 50, cy: 50, r: 42, fill: 'none', stroke: '#e5eee8', strokeWidth: 8 }), h('circle', { cx: 50, cy: 50, r: 42, fill: 'none', stroke: '#4f8d6c', strokeWidth: 8, strokeDasharray: `${completedDashboardSteps / dashboardSteps.length * 264} 264`, transform: 'rotate(-90 50 50)', strokeLinecap: 'round' })), h('span', null, h('strong', null, `${Math.round(completedDashboardSteps / dashboardSteps.length * 100)}%`), h('small', null, '清单完成度')), h('small', { className: 'xyb-completion-caption' }, `${completedDashboardSteps} / ${dashboardSteps.length} 项有记录`))
      const dashboardPage = h(React.Fragment, null,
        h('div', { className: 'xyb-grid xyb-hero-grid' },
          h('section', { className: 'xyb-hero' }, h('div', { className: 'xyb-overline' }, '今天的病情概览'), h('h2', null, '资料在慢慢完整，', h('br'), '下一步从这里开始。'), h('p', null, '今天不用把所有事都做完。先处理一件最清楚、最容易开始的事；其余内容会留在这里，随时再看。'), h('div', { className: 'xyb-action-row' }, h('button', { type: 'button', className: 'xyb-btn', onClick: () => setActiveTab('records') }, '继续整理资料 →'), h('button', { type: 'button', className: 'xyb-btn secondary', onClick: () => setActiveTab('trials') }, '查看临床试验')), h('span', { className: 'xyb-flower', 'aria-hidden': 'true' }, '✿')),
          h('section', { className: 'xyb-panel xyb-focus-panel' }, h('div', { className: 'xyb-focus-head' }, h('h3', null, '最近需要留意'), h('button', { type: 'button', className: 'xyb-link', onClick: () => setActiveTab(nextFocus[0]?.[2] || 'records') }, '查看记录 →')), nextFocus.length ? nextFocus.map(([title, detail, target, icon], index) => h('button', { key: title, type: 'button', className: 'xyb-focus-item', onClick: () => setActiveTab(target) }, h('span', { className: `xyb-focus-icon tint-${index}` }, icon), h('span', null, h('strong', null, title), h('small', null, detail)))) : h('p', { className: 'xyb-empty' }, '暂时没有待核对事项。已有记录会继续保留在相应页面。'))),
        sectionHead('周期计划与未来两周', '提前查看已记录的安排；日期和检查项目请与医疗团队确认。', '打开全程管理', () => setActiveTab('care')),
        h('div', { className: 'xyb-grid xyb-two' },
          h('section', { className: 'xyb-panel' }, h('h3', null, '治疗周期'), treatmentPlans.length ? treatmentPlans.map((plan) => {
            const next = (plan.events || []).filter((event) => Date.parse(event.scheduledAt) >= now).sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))[0]
            return h('div', { className: 'xyb-cycle-card', key: plan.id }, h('div', { className: 'xyb-countdown-ring' }, h('strong', null, next ? `${dateCountdown(next.scheduledAt)}` : '—'), h('small', null, next ? '天后' : '待安排')), h('div', null, h('strong', null, plan.regimen || '治疗方案'), h('small', null, next ? `下一次治疗 · 第 ${next.cycleNo} 次` : '暂无未来治疗日期'), h('small', null, next?.scheduledAt || '可在全程管理中更新')))
          }) : h('p', { className: 'xyb-empty' }, '还没有建立治疗周期计划。')),
          h('section', { className: 'xyb-panel xyb-calendar-panel' },
            h('div', { className: 'xyb-calendar-head' }, h('div', null, h('h3', null, '未来两周 · 日历'), h('p', null, `${fortnight.length} 项已安排 · 日期与检查项目请和医疗团队确认`)), h('button', { type: 'button', className: 'xyb-btn secondary', disabled: busy, onClick: () => setCalendarAddOpen((open) => !open) }, calendarAddOpen ? '收起' : '＋ 添加事件')),
            h('div', { className: 'xyb-calendar-grid', role: 'group', 'aria-label': '未来两周日历' }, ...calendarDays.map((date) => {
              const dayEvents = fortnight.filter((item) => item.scheduledAt.slice(0, 10) === date)
              return h('button', { type: 'button', key: date, className: `xyb-calendar-day${date === todayLocal ? ' today' : ''}${date === selectedCalendarDate ? ' selected' : ''}${dayEvents.length ? ' has-events' : ''}`, 'aria-pressed': date === selectedCalendarDate, 'aria-label': `${calendarDateLabel(date)}，${dayEvents.length} 项安排`, onClick: () => { setCalendarSelectedDate(date); setCalendarAddOpen(false) } }, h('small', null, weekdayLabels[new Date(`${date}T12:00:00`).getDay()]), h('strong', null, String(Number(date.slice(-2)))), dayEvents.length ? h('span', { className: 'xyb-calendar-dots', 'aria-hidden': 'true' }, ...dayEvents.slice(0, 3).map((item) => h('i', { key: item.id }))) : null)
            })),
            h('div', { className: 'xyb-calendar-agenda' }, h('div', { className: 'xyb-calendar-agenda-head' }, h('strong', null, calendarDateLabel(selectedCalendarDate)), h('span', null, `${selectedDateEvents.length} 项`)), selectedDateEvents.length ? selectedDateEvents.map((item) => h('div', { className: 'xyb-calendar-event', key: item.id }, h('span', { className: 'xyb-calendar-event-mark' }), h('span', null, h('strong', null, appointmentLabels[item.kindCode] || item.kindCode), h('small', null, `${item.scheduledAt.slice(11, 16) || '时间待补充'} · ${item.note || item.organization || '已记录安排'}`)), h('details', { className: 'xyb-calendar-event-actions' }, h('summary', { 'aria-label': `编辑${appointmentLabels[item.kindCode] || item.kindCode}` }, '⋯'), h('form', { onSubmit: (event) => editAppointment(item.id, event) }, formField('计划时间', { name: 'scheduledAt', type: 'datetime-local', required: true, defaultValue: item.scheduledAt.slice(0, 16) }), formField('备注', { name: 'note', defaultValue: item.note || '' }), h('button', { type: 'submit', className: 'xyb-btn secondary', disabled: busy }, '保存修改')), h('button', { type: 'button', className: 'xyb-link', disabled: busy, onClick: () => setAppointmentStatus(item.id, 'completed') }, '标记完成'), h('button', { type: 'button', className: 'xyb-link', disabled: busy, onClick: () => setAppointmentStatus(item.id, 'cancelled') }, '取消安排')))) : h('p', { className: 'xyb-empty' }, '这一天还没有安排。可以选择日期后添加一项待办。')),
            calendarAddOpen ? h('form', { className: 'xyb-calendar-form', onSubmit: recordCalendarAppointment }, h('strong', null, `添加安排 · ${selectedCalendarDate}`), h('label', null, '事项类型', h('select', { name: 'kindCode', required: true, defaultValue: 'outpatient' }, ...[['outpatient', '门诊预约'], ['chemotherapy', '化疗'], ['blood-test', '化疗前血常规'], ['contrast-ct', '增强 CT'], ['tumor-marker', '肿瘤标志物检查'], ['other', '其他事项']].map(([value, label]) => h('option', { key: value, value }, label)))), formField('计划时间', { name: 'scheduledAt', type: 'datetime-local', required: true, defaultValue: `${selectedCalendarDate}T09:00` }), formField('医院/科室（可选）', { name: 'organization', placeholder: '例如：肿瘤科门诊' }), formField('备注（可选）', { name: 'note', placeholder: '记录准备事项或需要确认的问题' }), h('div', { className: 'xyb-row-actions' }, h('button', { type: 'button', className: 'xyb-btn secondary', onClick: () => setCalendarAddOpen(false) }, '取消'), h('button', { type: 'submit', className: 'xyb-btn', disabled: busy }, '保存到本机日历'))) : null,
            h('p', { className: 'xyb-note' }, '这里只整理你录入的计划，不代表医疗建议；调整化疗或检查时间前请先与医疗团队确认。'))),
        sectionHead('当前指标提醒', '左侧展示已确认的变化，右侧提供复诊时可核对的信息；不作诊断。', '查看指标趋势', () => setActiveTab('one-page')),
        h('section', { className: 'xyb-panel' }, recentClinicalNotes.length ? recentClinicalNotes.map(({ group, metric }) => h('div', { className: 'xyb-change-row', key: `${group}:${metric.metricCode}` }, h('div', null, h('strong', null, group), h('small', null, `${markerLabels[metric.metricCode] || metric.metricCode}　${metric.delta > 0 ? '↑' : metric.delta < 0 ? '↓' : '→'} ${formatDelta(Math.abs(metric.delta))} ${metric.unitRaw || ''} · ${metric.occurredAt || '日期未记录'}`)), h('div', null, h('strong', null, '复诊时可和医生一起核对'), h('small', null, '带上报告原文、日期、数值和检测方法；单次变化不能说明病情结论。')))) : h('p', { className: 'xyb-empty' }, '暂无可比较的已确认指标。'), documents.filter((doc) => /ct|影像|imaging/i.test(`${doc.title} ${doc.kindCode}`)).slice(0, 2).map((doc) => h('div', { className: 'xyb-change-row imaging', key: doc.id }, h('div', null, h('strong', null, '影像报告'), h('small', null, `${doc.title} · ${doc.reportedAt || '日期未记录'}`)), h('div', null, h('strong', null, '请核对影像描述变化'), h('small', null, '新增、增大、变小或消失等需对照两次报告原文确认。'))))),
        sectionHead('各方面的近况', '只展示本机已有记录；没有资料的项目会明确标出。', '查看资料', () => setActiveTab('records')),
        h('div', { className: 'xyb-grid xyb-status-grid' }, ...statusItems.map(([title, value, detail, target, tint]) => h('button', { type: 'button', key: title, className: `xyb-status ${tint}`, style: { textAlign: 'left', cursor: 'pointer' }, onClick: () => setActiveTab(target) }, h('span', { className: 'xyb-status-top' }, h('span', null, title), h('i', { className: value.includes('暂无') || value.includes('尚未') ? 'xyb-status-dot unknown' : 'xyb-status-dot' })), h('strong', null, value), h('p', null, detail)))),
        sectionHead('照护记录', '可以从体重、感受、症状或治疗安排开始。', '打开全程管理', () => setActiveTab('care')),
        h('div', { className: 'xyb-grid xyb-care-grid' }, ...[['营养管理', '体重、摄入与制剂记录', 'nutrition', '✳'], ['心理支持', '感受、自评与支持资源', 'mind', '☼'], ['症状与不适', '记录发生时间和变化', 'care', '⌁'], ['治疗计划', '方案、周期与复诊安排', 'care', '＋']].map(([title, subtitle, target, icon]) => h('button', { key: title, type: 'button', className: 'xyb-care-tile', onClick: () => setActiveTab(target) }, h('span', null, icon), h('strong', null, title), h('small', null, subtitle)))),
        h('div', { className: 'xyb-grid xyb-two' },
          h('section', { className: 'xyb-panel' }, h('h3', null, '资料整理进度'), h('p', null, '资料进入后，可先查看原文，再核对识别出的内容。'), dashboardProgressRing, ...dashboardSteps.map(([title, done, target]) => h('button', { key: title, type: 'button', className: 'xyb-step', onClick: () => setActiveTab(target) }, h('span', { className: done ? 'xyb-step-check done' : 'xyb-step-check' }, done ? '✓' : '·'), h('strong', null, title), h('small', null, done ? '已有记录' : '待补充')))),
          h('section', { className: 'xyb-panel' }, h('h3', null, '体重变化'), h('p', null, '最近记录 · 仅用于回顾，不作诊断'), weightCoords.length > 1 ? h(React.Fragment, null, h('svg', { className: 'xyb-weight-chart', viewBox: '0 0 500 130', preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': '最近体重记录趋势' }, ...[28, 63, 98].map((y) => h('line', { key: y, x1: 12, x2: 488, y1: y, y2: y, stroke: '#ecefe9' })), h('path', { d: weightLine, fill: 'none', stroke: '#e88755', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }), ...weightCoords.map(({ x, y, entry }) => h('circle', { key: entry.occurredAt, cx: x, cy: y, r: 4.5, fill: '#e88755', stroke: '#fff', strokeWidth: 2 }))), h('div', { className: 'xyb-chart-label-row' }, h('small', null, `${weightEntries[0].occurredAt} · ${weightEntries[0].weightKg} kg`), h('small', null, `${weightEntries.at(-1).occurredAt} · ${weightEntries.at(-1).weightKg} kg`))) : h('p', { className: 'xyb-empty' }, '至少有两次体重记录后显示趋势。'), h('button', { type: 'button', className: 'xyb-link', onClick: () => setActiveTab('nutrition') }, '打开营养管理 →'))),
        h('div', { className: 'xyb-dashboard-footer' }, h('div', { className: 'xyb-row-actions' }, h('select', { 'aria-label': '病情报告导出格式', value: exportFormat, onChange: (event) => setExportFormat(event.target.value), className: 'xyb-select' }, ...[['pdf','PDF（默认）'],['jpeg','JPEG'],['html','HTML'],['md','Markdown'],['docx','DOCX']].map(([value,label]) => h('option', { key: value, value }, label))), h('button', { type: 'button', className: 'xyb-btn', disabled: busy, onClick: () => exportReport(exportFormat) }, `导出病情报告 · ${exportFormat.toUpperCase()}`)), h('button', { type: 'button', className: 'xyb-btn', disabled: busy, onClick: () => askAdvice() }, '给我建议')))
      const modulePage = (title, subtitle, heroTitle, heroText, content, tone = '') => h(React.Fragment, null,
        h('div', { className: 'xyb-module-head' }, h('div', null, h('h2', null, title), h('p', null, subtitle))),
        h('div', { className: `xyb-module-hero ${tone}` }, h('h3', null, heroTitle), h('p', null, heroText)), content)
      const historyFor = (code) => observationHistory.filter((point) => point.metricCode === code).slice(-5)
      const timelineMetricCodes = [...new Set(observationHistory.map((point) => point.metricCode))]
      const sparkline = (points, code, color) => {
        const compatible = points.length > 1 && new Set(points.map((point) => point.unitRaw || '')).size === 1
        if (!compatible) return h('span', { className: 'xyb-note' }, points.length > 1 ? '检测单位不同，需核对后才能连成趋势。' : '至少两次确认记录后显示趋势。')
        const values = points.map((point) => Number(point.valueNum))
        if (!values.every(Number.isFinite)) return h('span', { className: 'xyb-note' }, '记录数值暂不可绘制趋势。')
        const low = Math.min(...values), high = Math.max(...values), rawSpan = high - low
        const span = rawSpan || Math.max(Math.abs(high) * .08, 1)
        const coords = values.map((value, index) => ({ x: 18 + index * (284 / Math.max(values.length - 1, 1)), y: 42 - ((value - low) / span) * 27 }))
        const path = coords.map(({ x, y }, index) => `${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
        const shortDate = (value) => String(value || '日期未记录').replace(/^\d{4}-/, '')
        return h(React.Fragment, null,
          h('svg', { className: 'xyb-clinical-spark', viewBox: '0 0 320 62', preserveAspectRatio: 'xMinYMid meet', role: 'img', 'aria-label': `${code}最近 ${points.length} 次已确认记录折线趋势` },
            h('path', { d: 'M18 49H302', stroke: '#e7ece7', strokeWidth: 1.5, fill: 'none', vectorEffect: 'non-scaling-stroke' }),
            h('path', { d: path, fill: 'none', stroke: color, strokeWidth: 3.2, strokeLinecap: 'round', strokeLinejoin: 'round', vectorEffect: 'non-scaling-stroke' }),
            ...coords.map(({ x, y }, index) => h('circle', { key: `${points[index].occurredAt}-${index}`, cx: x, cy: y, r: 4.2, fill: color, stroke: '#fff', strokeWidth: 2.4, vectorEffect: 'non-scaling-stroke' }))),
          h('div', { className: 'xyb-clinical-spark-labels' }, h('small', null, shortDate(points[0].occurredAt)), h('small', null, shortDate(points.at(-1).occurredAt))))
      }
      const metricCard = (metric) => {
        const flipped = flippedMetrics.includes(metric.metricCode)
        const points = historyFor(metric.metricCode)
        return h('button', { key: metric.metricCode, type: 'button', className: 'xyb-metric-card xyb-clinical-metric-card', 'aria-pressed': flipped, onClick: () => toggleMetric(metric.metricCode) },
          h('span', { className: 'xyb-metric-inner', style: { transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)', WebkitTransform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' } },
            h('span', { className: 'xyb-metric-face' }, h('small', null, markerLabels[metric.metricCode] || metric.metricCode), h('strong', null, `${metric.valueRaw} ${metric.unitRaw || ''}`), h('span', { className: `xyb-metric-delta ${metric.delta > 0 ? 'up' : ''}` }, metric.delta == null ? '首次记录' : `${metric.delta > 0 ? '↑' : metric.delta < 0 ? '↓' : '→'} ${formatDelta(Math.abs(metric.delta))} · 较前次`), h('small', { style: { marginTop: 8 } }, metric.occurredAt || '日期未记录')),
            h('span', { className: 'xyb-metric-face xyb-metric-back' }, h('small', null, markerLabels[metric.metricCode] || metric.metricCode), h('strong', null, `最近 ${points.length} 次`), sparkline(points, metric.metricCode, metric.delta > 0 ? '#e88755' : '#5b9b81'), h('small', null, '仅回顾已确认记录 · 点击返回'))))
      }
      const timelineColors = ['#e88755', '#5b9b81', '#7895aa', '#bd7c8a', '#a58a54', '#7a7db0']
      const treatmentEvents = treatmentPlans.flatMap((plan) => (plan.events || []).map((event) => ({ ...event, regimen: plan.regimen }))).filter((event) => Number.isFinite(Date.parse(event.scheduledAt)))
      const allTimelineDates = [
        ...observationHistory.map((point) => Date.parse(point.occurredAt)).filter(Number.isFinite),
        ...treatmentEvents.map((event) => Date.parse(event.scheduledAt)),
      ]
      const allTimelineMin = allTimelineDates.length ? Math.min(...allTimelineDates) : 0
      const allTimelineMax = allTimelineDates.length ? Math.max(...allTimelineDates) : allTimelineMin + 86400000
      const rangeMonths = { '3m': 3, '6m': 6, '12m': 12 }[timelineRange]
      const presetMin = rangeMonths ? Math.max(allTimelineMin, new Date(allTimelineMax).setMonth(new Date(allTimelineMax).getMonth() - rangeMonths)) : allTimelineMin
      const windowSpan = Math.max(86400000, (allTimelineMax - presetMin) * timelineWindowPercent / 100)
      const timelineMin = Math.max(presetMin, allTimelineMax - windowSpan)
      const timelineMax = Math.max(allTimelineMax, timelineMin + 86400000)
      const timelineSeries = selectedTimelineMetrics.map((code, index) => ({
        code,
        color: timelineColors[index % timelineColors.length],
        points: observationHistory.filter((point) => point.metricCode === code && Number.isFinite(Number(point.valueNum)) && Number.isFinite(Date.parse(point.occurredAt)) && Date.parse(point.occurredAt) >= timelineMin && Date.parse(point.occurredAt) <= timelineMax).sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt)),
      })).filter((series) => series.points.length)
      const timelineDatedPoints = timelineSeries.flatMap((series) => series.points)
      const timelineX = (date) => 66 + ((Date.parse(date) - timelineMin) / Math.max(1, timelineMax - timelineMin)) * 786
      const chartPointDetail = selectedTimelinePoint
        ? h('div', { className: 'xyb-list-row', style: { background: '#f8fbf8', padding: 12, borderRadius: 12, marginTop: 12 } }, h('div', null, h('strong', null, `${markerLabels[selectedTimelinePoint.metricCode] || selectedTimelinePoint.metricCode} · ${selectedTimelinePoint.valueRaw || selectedTimelinePoint.valueNum} ${selectedTimelinePoint.unitRaw || ''}`), h('small', null, `${selectedTimelinePoint.occurredAt} · ${selectedTimelinePoint.sourceText || selectedTimelinePoint.documentTitle || '已确认记录'}`)), h('button', { type: 'button', className: 'xyb-link', onClick: () => setSelectedTimelinePoint(null) }, '收起'))
        : h('p', { className: 'xyb-note' }, '点击曲线上的记录点，可查看检测日期、数值和来源。')
      const timelineChart = h('section', { className: 'xyb-panel' },
        h('div', { className: 'xyb-section-head', style: { margin: 0 } }, h('div', null, h('h2', null, '病程时间轴'), h('p', null, '选择指标并与治疗日期对照；这里只呈现已确认的记录。')), h('button', { type: 'button', className: 'xyb-btn', disabled: busy, onClick: () => askAdvice('one-page', 'pancreatic-care-manager', '病情一图秀', { observationHistory, treatmentPlans }) }, '给我建议')),
        h('div', { className: 'xyb-overview-layout' },
          h('aside', { className: 'xyb-overview-selector' },
            h('section', null, h('h3', null, '时间范围'), h('div', { className: 'xyb-range-row' }, ...[['3m','近3月'],['6m','近6月'],['12m','近12月'],['all','全部']].map(([key,label]) => h('button', { key, type: 'button', className: 'xyb-chart-pick', 'aria-pressed': timelineRange === key, onClick: () => { setTimelineRange(key); setTimelineWindowPercent(100) } }, label)))),
            h('section', null, h('h3', null, '选择指标'), timelineMetricCodes.length ? h('div', { className: 'xyb-overview-metric-list' }, ...timelineMetricCodes.map((code) => h('label', { key: code }, h('input', { type: 'checkbox', checked: selectedTimelineMetrics.includes(code), onChange: () => { setSelectedTimelineMetrics((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code]); setSelectedTimelinePoint(null) } }), markerLabels[code] || code))) : h('p', { className: 'xyb-empty' }, '暂无可选指标')),
            h('section', null, h('h3', null, '显示内容'), h('label', { className: 'xyb-overview-toggle' }, h('input', { type: 'checkbox', checked: timelineShowKeyPoints, onChange: (event) => setTimelineShowKeyPoints(event.target.checked) }), '关键点'), h('label', { className: 'xyb-overview-toggle' }, h('input', { type: 'checkbox', checked: timelineShowChanges, onChange: (event) => setTimelineShowChanges(event.target.checked) }), '标注较大变化（≥20%）'), h('label', { className: 'xyb-overview-toggle' }, h('input', { type: 'checkbox', checked: timelineShowTreatment, onChange: (event) => setTimelineShowTreatment(event.target.checked) }), '显示治疗节点')),
            h('label', { className: 'xyb-zoom-control' }, h('span', null, '缩放'), h('input', { type: 'range', min: 25, max: 100, step: 1, value: timelineWindowPercent, onChange: (event) => setTimelineWindowPercent(Number(event.target.value)), 'aria-label': '时间轴缩放' }), h('span', null, `${timelineWindowPercent}%`))),
          h('div', { className: 'xyb-overview-main' },
        timelineDatedPoints.length ? h(React.Fragment, null,
          h('div', { className: 'xyb-chart-legend' }, ...timelineSeries.map((series) => h('span', { key: series.code }, h('i', { style: { background: series.color } }), `${markerLabels[series.code] || series.code} · ${series.points[0].unitRaw || '单位未记录'}`)), treatmentEvents.length ? h('span', null, h('i', { style: { background: '#b9a66b' } }), '治疗日期') : null),
          h('svg', { className: 'xyb-timeline-chart', viewBox: '0 0 900 300', preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': '已确认指标与治疗事件时间轴' },
            ...[64, 106, 148, 190, 232].map((y) => h('line', { key: `grid-${y}`, x1: 66, x2: 852, y1: y, y2: y, stroke: '#edf0e9', strokeWidth: 1 })),
            h('line', { x1: 66, x2: 852, y1: 238, y2: 238, stroke: '#ccd5cd', strokeWidth: 1.2 }),
            ...(timelineShowTreatment ? treatmentEvents.filter((event) => Date.parse(event.scheduledAt) >= timelineMin && Date.parse(event.scheduledAt) <= timelineMax).map((event) => h('g', { key: event.id }, h('line', { x1: timelineX(event.scheduledAt), x2: timelineX(event.scheduledAt), y1: 42, y2: 238, stroke: '#b9a66b', strokeWidth: 1.2, strokeDasharray: '4 5' }), h('text', { x: timelineX(event.scheduledAt) + 4, y: 34, fill: '#8a7a4f', fontSize: 10 }, event.kindCode === 'chemotherapy' ? `化疗${event.cycleNo || ''}` : event.kindCode))) : []),
            ...timelineSeries.flatMap((series) => {
              const nums = series.points.map((point) => Number(point.valueNum)), low = Math.min(...nums), high = Math.max(...nums), span = Math.max(high - low, Math.abs(high) * .08, 1)
              const coords = series.points.map((point, index) => {
                const y = 214 - ((Number(point.valueNum) - low) / span) * 142
                const previous = series.points[index - 1]
                const change = previous && Number(previous.valueNum) !== 0 ? ((Number(point.valueNum) - Number(previous.valueNum)) / Math.abs(Number(previous.valueNum))) * 100 : 0
                return { x: timelineX(point.occurredAt), y, point, change, mark: timelineShowKeyPoints && (index === 0 || index === series.points.length - 1 || (timelineShowChanges && Math.abs(change) >= 20)) }
              })
              const d = coords.length ? `M ${coords[0].x} ${coords[0].y} ${coords.slice(1).map((point, index) => { const previous = coords[index], before = coords[index - 1] || previous, after = coords[index + 2] || point; const c1x = previous.x + (point.x - before.x) / 6, c1y = previous.y + (point.y - before.y) / 6, c2x = point.x - (after.x - previous.x) / 6, c2y = point.y - (after.y - previous.y) / 6; return `C ${c1x} ${c1y} ${c2x} ${c2y} ${point.x} ${point.y}` }).join(' ')}` : ''
              return [coords.length > 1 ? h('path', { key: `${series.code}-line`, d, fill: 'none', stroke: series.color, strokeWidth: 3.5, strokeLinecap: 'round', strokeLinejoin: 'round' }) : null, ...coords.map(({ x, y, point, change, mark }, index) => h('g', { key: `${series.code}-${index}` }, h('circle', { className: 'xyb-chart-point', cx: x, cy: y, r: selectedTimelinePoint === point ? 7 : mark ? 5 : 3.5, fill: series.color, stroke: '#fff', strokeWidth: mark ? 2 : 1, tabIndex: 0, role: 'button', 'aria-label': `${markerLabels[series.code] || series.code} ${point.valueRaw || point.valueNum} ${point.unitRaw || ''}，${point.occurredAt}`, onClick: () => setSelectedTimelinePoint(point), onKeyDown: (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedTimelinePoint(point) } } }), timelineShowChanges && Math.abs(change) >= 20 ? h('text', { x: x + 7, y: y - 8, fill: series.color, fontSize: 10 }, `${change > 0 ? '+' : ''}${Math.round(change)}%`) : null))]
            }),
            h('text', { x: 66, y: 270, fill: '#78847e', fontSize: 11 }, timelineDatedPoints.length ? new Date(timelineMin).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }) : ''),
            h('text', { x: 852, y: 270, fill: '#78847e', fontSize: 11, textAnchor: 'end' }, timelineDatedPoints.length ? new Date(timelineMax).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '')),
          h('p', { className: 'xyb-note' }, '为便于同时查看不同量纲，曲线按各指标自身范围绘制；线条仅用于回顾记录时间与方向，不代表指标间数值可比较，也不构成诊断。'), chartPointDetail)
          : h('div', { className: 'xyb-empty' }, timelineMetricCodes.length ? '所选指标缺少可用于时间轴的已确认日期记录。' : '尚无已确认指标记录。导入报告并确认后，时间轴会在这里呈现。'))))
      const onePage = h(React.Fragment, null,
        timelineChart,
        h('section', { className: 'xyb-panel' }, h('div', { className: 'xyb-section-head', style: { margin: 0 } }, h('div', null, h('h2', null, '指标趋势看板'), h('p', null, '按类别浏览最近一次检测结果；点选卡片翻转查看最近五次。')), h('button', { type: 'button', className: 'xyb-link', onClick: () => setActiveTab('records') }, '核对或补充资料 →')),
          metrics.length ? metricCategories.filter((category) => metrics.some((metric) => categoryFor(metric.metricCode) === category)).map((category) => h('section', { key: category }, sectionHead(category, `${metrics.filter((metric) => categoryFor(metric.metricCode) === category).length} 项已记录`), h('div', { className: 'xyb-metric-grid' }, ...metrics.filter((metric) => categoryFor(metric.metricCode) === category).map(metricCard)))) : h('p', { className: 'xyb-empty' }, '尚无已确认指标。')),
        h('section', { className: 'xyb-panel', style: { marginTop: 16 } }, h('div', { className: 'xyb-section-head', style: { margin: 0 } }, h('div', null, h('h2', null, '治疗时间线'), h('p', null, '治疗计划和检查日期与指标记录共用同一时间轴。')), h('button', { type: 'button', className: 'xyb-link', onClick: () => setActiveTab('care') }, '管理治疗安排 →')), treatmentEvents.length ? treatmentEvents.map((event) => h('div', { className: 'xyb-list-row', key: event.id }, h('span', null, h('strong', null, event.kindCode === 'chemotherapy' ? `${event.regimen || '化疗'} · 第 ${event.cycleNo || '—'} 次` : event.kindCode), h('small', null, event.note || '计划记录')), h('span', null, event.scheduledAt))) : h('p', { className: 'xyb-empty' }, '尚无治疗安排；可在全程管理中建立计划。')))
      const recordSections = ['资料库', '报告核对', '指标趋势', '病情评估', '病情汇总']
      const recordsPage = h(React.Fragment, null,
        h('nav', { className: 'xyb-chart-tools', role: 'tablist', 'aria-label': '病情整理页面' }, ...recordSections.map((section) => h('button', { key: section, type: 'button', role: 'tab', className: 'xyb-chart-pick', 'aria-selected': recordSection === section, onClick: () => setRecordSection(section) }, section))),
        recordSection === '资料库' ? documentPanel
          : recordSection === '报告核对' ? h('section', { className: 'xyb-panel' }, h('h3', null, '报告核对：文档 → 查看 → 解析'), h('p', { className: 'xyb-note' }, '识别结果作为草稿呈现，逐项对照报告原文后再确认保存。'), documents.length ? documents.map((doc) => h('div', { key: doc.id, className: 'xyb-list-row' }, h('span', null, h('strong', null, doc.title), h('small', null, `${doc.kindCode} · ${doc.reportedAt || '日期未填'} · ${doc.pendingCandidateCount || 0} 项待核对`)), h('div', { className: 'xyb-row-actions' }, h('button', { type: 'button', className: 'xyb-btn secondary', onClick: () => setPreviewDocument(doc) }, '查看原件'), h('button', { type: 'button', className: 'xyb-btn', disabled: busy || doc.parseStatus === 'parsing', onClick: () => parseDocument(doc.id) }, doc.parseStatus === 'pending' ? '解析文档' : '重新解析')))) : h('p', { className: 'xyb-empty' }, '资料库还没有报告。'))
          : recordSection === '指标趋势' ? h('section', { className: 'xyb-panel' }, h('h3', null, '指标趋势'), h('p', { className: 'xyb-note' }, '按指标分类展示最近确认结果。点击卡片可翻转查看最近五次记录。'), metrics.length ? metricCategories.filter((category) => metrics.some((metric) => categoryFor(metric.metricCode) === category)).map((category) => h('section', { key: category }, sectionHead(category, `${metrics.filter((metric) => categoryFor(metric.metricCode) === category).length} 项`), h('div', { className: 'xyb-metric-grid' }, ...metrics.filter((metric) => categoryFor(metric.metricCode) === category).map(metricCard)))) : h('p', { className: 'xyb-empty' }, '尚无已确认指标。'))
          : recordSection === '病情评估' ? h('section', { className: 'xyb-panel' },
            h('h3', null, '病情资料评估'),
            h('p', { className: 'xyb-note' }, '集中回顾已确认的基本信息、影像/检查、治疗经过和分子病理。资料不足时保留“未记录”，不推断结论。'),
            ...recordTopics.map(([title, description]) => h('button', { key: title, type: 'button', className: 'xyb-chart-pick', 'aria-pressed': recordTopic === title, onClick: () => setRecordTopic(title) }, `${title} · ${description}`)),
            topicDocuments.map((doc) => h('div', { key: doc.id, className: 'xyb-list-row' },
              h('span', null, h('strong', null, doc.title), h('small', null, `${doc.reportedAt || '日期未填'} · ${doc.parseStatus}`)),
              h('button', { type: 'button', className: 'xyb-btn secondary', onClick: () => setPreviewDocument(doc) }, '查看来源'))),
            recordTopic === '病理与基因' ? molecularResults.map((item) => h('div', { key: item.id, className: 'xyb-list-row' },
              h('span', null, h('strong', null, `${item.markerCode} · ${item.resultRaw}`), h('small', null, [item.geneCode, item.alterationCode, item.variantHgvs].filter(Boolean).join(' · '))),
              h('span', null, [item.vafPct != null ? `VAF ${item.vafPct}%` : null, item.intensity, item.positivePct != null ? `阳性 ${item.positivePct}%` : null, item.cps != null ? `CPS ${item.cps}` : null].filter(Boolean).join(' · ')))) : null)
          : h('section', { className: 'xyb-panel' }, h('h3', null, '病情汇总'), h('p', null, '按已确认的资料、指标和治疗安排生成本机病情报告；未记录信息会明确留空。'), h('div', { className: 'xyb-list-row' }, h('span', null, '资料 / 待核对'), h('strong', null, `${documents.length} 份 · ${pendingCandidates.length} 项`)), h('div', { className: 'xyb-list-row' }, h('span', null, '已确认指标'), h('strong', null, `${metrics.length} 项`)), h('button', { type: 'button', className: 'xyb-btn', disabled: busy, onClick: exportReport }, '生成并保存病情报告')))
      const nutritionChartColors = { weightKg: '#e88755', bmi: '#57977d', intakeKcal: '#7d82b7' }
      const nutritionChartSeries = nutritionMeasures.filter(([, field]) => selectedNutritionMetrics.includes(field)).map(([label, field, unit]) => {
        const points = nutritionPoints(field).filter((point) => Number.isFinite(Date.parse(point.occurredAt)))
        const values = points.map((point) => Number(point.valueNum)), low = values.length ? Math.min(...values) : 0, high = values.length ? Math.max(...values) : 0
        const span = Math.max(high - low, Math.abs(high) * .12, 1)
        return { label, field, unit, color: nutritionChartColors[field], points, low, span }
      }).filter((series) => series.points.length)
      const nutritionDates = nutritionChartSeries.flatMap((series) => series.points.map((point) => Date.parse(point.occurredAt)))
      const nutritionDateMin = nutritionDates.length ? Math.min(...nutritionDates) : 0, nutritionDateMax = nutritionDates.length ? Math.max(...nutritionDates) : nutritionDateMin + 86400000
      const nutritionX = (date) => 44 + (Date.parse(date) - nutritionDateMin) / Math.max(1, nutritionDateMax - nutritionDateMin) * 412
      const nutritionTrends = h('section', { className: 'xyb-panel' }, h('h3', null, '营养指标趋势'), h('p', null, '选择要查看的指标。每条线按自身数值范围呈现变化方向，不用于比较不同单位的绝对值。'),
        h('div', { className: 'xyb-chart-tools', role: 'group', 'aria-label': '选择营养趋势指标' }, ...nutritionMeasures.map(([label, field]) => h('button', { key: field, type: 'button', className: 'xyb-chart-pick', 'aria-pressed': selectedNutritionMetrics.includes(field), onClick: () => setSelectedNutritionMetrics((current) => current.includes(field) ? current.filter((item) => item !== field) : [...current, field]) }, `${selectedNutritionMetrics.includes(field) ? '✓ ' : ''}${label}`))),
        nutritionChartSeries.length ? h(React.Fragment, null, h('div', { className: 'xyb-chart-legend' }, ...nutritionChartSeries.map((series) => h('span', { key: series.field }, h('i', { style: { background: series.color } }), `${series.label} · ${series.unit || 'BMI'}`))), h('svg', { className: 'xyb-timeline-chart', viewBox: '0 0 500 190', preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': '已选营养指标趋势，按指标自身范围显示' }, ...[30, 66, 102, 138].map((y) => h('line', { key: y, x1: 42, x2: 458, y1: y, y2: y, stroke: '#edf0e9' })), ...nutritionChartSeries.flatMap((series) => {
          const coords = series.points.map((point) => ({ x: nutritionX(point.occurredAt), y: 142 - (Number(point.valueNum) - series.low) / series.span * 104, point }))
          return [coords.length > 1 ? h('polyline', { key: `${series.field}-line`, points: coords.map(({ x, y }) => `${x},${y}`).join(' '), fill: 'none', stroke: series.color, strokeWidth: 3.5, strokeLinecap: 'round', strokeLinejoin: 'round' }) : null, ...coords.map(({ x, y, point }, index) => h('circle', { key: `${series.field}-${index}`, cx: x, cy: y, r: 5, fill: series.color, stroke: '#fff', strokeWidth: 2, 'aria-label': `${series.label} ${point.valueNum} ${series.unit}，${point.occurredAt}` }))]
        }), h('text', { x: 42, y: 174, fill: '#78847e', fontSize: 11 }, new Date(nutritionDateMin).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit' })), h('text', { x: 458, y: 174, fill: '#78847e', fontSize: 11, textAnchor: 'end' }, new Date(nutritionDateMax).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit' }))), h('p', { className: 'xyb-note' }, '点选下方指标卡片可翻转查看该指标最近五次记录。')) : h('p', { className: 'xyb-empty' }, '所选指标暂无足够记录显示趋势；保存体重或能量记录后会逐步呈现。'),
        h('div', { className: 'xyb-metric-grid' }, ...nutritionMeasures.map(([label, field, unit]) => {
        const points = nutritionPoints(field), latest = points.at(-1), previous = points.at(-2), code = `nutrition:${field}`, flipped = flippedMetrics.includes(code)
        const delta = latest && previous ? Number((latest.valueNum - previous.valueNum).toFixed(1)) : null
        return h('button', { key: field, type: 'button', className: 'xyb-metric-card xyb-nutrition-flip', 'aria-pressed': flipped, 'aria-label': `${label}，${latest ? `${latest.valueNum} ${unit}` : '尚无记录'}；${flipped ? '点击返回最近结果' : `点击翻转查看最近 ${points.length} 次记录`}`, onClick: () => toggleMetric(code) },
          h('span', { className: 'xyb-metric-inner', style: { transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)', WebkitTransform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' } },
            h('span', { className: 'xyb-metric-face' }, h('small', null, label), h('strong', null, latest ? `${latest.valueNum} ${unit}` : '尚无记录'), h('span', { className: `xyb-metric-delta ${delta > 0 ? 'up' : ''}` }, delta == null ? '等待下一次记录' : `${delta > 0 ? '↑' : delta < 0 ? '↓' : '→'} ${formatDelta(Math.abs(delta))} · 较前次`), h('small', { style: { marginTop: 8 } }, latest?.occurredAt || '—')),
            h('span', { className: 'xyb-metric-face xyb-metric-back' }, h('small', null, label), h('strong', null, `最近 ${points.length} 次`), nutritionHistoryChart(points, label, unit), h('small', null, '点击返回最近结果'))))
      })))
      const nutritionSummaryMetrics = [
        { title: '最近体重', field: 'weightKg', value: nutrition?.latest?.weightKg == null ? '尚无记录' : `${nutrition.latest.weightKg} kg`, detail: nutrition?.latest?.occurredAt || '记录日期待补', tint: 'mint' },
        { title: 'BMI', field: 'bmi', value: nutrition?.latest?.bmi == null ? '暂不可计算' : String(nutrition.latest.bmi), detail: dashboard?.patient?.heightCm ? `按身高 ${dashboard.patient.heightCm} cm 计算` : '尚未录入身高', tint: 'yellow' },
        { title: '摄入能量', field: 'intakeKcal', value: nutrition?.latest?.intakeKcal == null ? '尚无记录' : `${nutrition.latest.intakeKcal} kcal`, detail: nutrition?.latest?.occurredAt || '记录日期待补', tint: 'pink' },
      ]
      const nutritionTopCards = h('div', { className: 'xyb-grid xyb-status-grid' },
        ...nutritionSummaryMetrics.map(({ title, field, value, detail, tint }) => {
          const points = nutritionPoints(field), code = `nutrition:${field}`, flipped = flippedMetrics.includes(code)
          return h('button', { key: field, type: 'button', className: `xyb-metric-card xyb-nutrition-flip xyb-status ${tint}`, 'aria-pressed': flipped, 'aria-label': `${title}，${value}；${flipped ? '点击返回摘要' : `点击翻转查看最近 ${points.length} 次记录`}`, onClick: () => toggleMetric(code) },
            h('span', { className: 'xyb-metric-inner', style: { transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)', WebkitTransform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' } },
              h('span', { className: 'xyb-metric-face' }, h('small', null, title), h('strong', null, value), h('small', { style: { marginTop: 8 } }, detail)),
              h('span', { className: 'xyb-metric-face xyb-metric-back' }, h('small', null, title), h('strong', null, `最近 ${points.length} 次`), nutritionHistoryChart(points, title, field === 'weightKg' ? 'kg' : field === 'intakeKcal' ? 'kcal' : ''), h('small', null, '点击返回摘要'))))
        }),
        h('article', { key: '营养制剂', className: 'xyb-status blue' }, h('span', null, '营养制剂'), h('strong', null, `${nutrition?.products?.length || 0} 条记录`), h('p', null, nutrition?.products?.[0]?.productName || '可记录名称、用量和营养成分')))
      const moodChoices = ['还不错', '有些担心', '很疲惫', '想找人聊聊']
      const supportResourceCards = supportResources.map((resource) => {
        const content = resource.content || {}
        const names = content.institutions || content.examples || []
        return h('article', { className: 'xyb-resource-item', key: resource.id }, h('div', { className: 'xyb-resource-top' }, h('div', null, h('strong', null, resource.title), h('small', null, [resource.regionCode, content.kind, content.publishedAt ? `发布 ${content.publishedAt}` : null].filter(Boolean).join(' · '))), h('span', { className: 'xyb-pill' }, '来源已记录')),
          content.summary ? h('p', null, content.summary) : null,
          names.length ? h('ul', { className: 'xyb-resource-list' }, ...names.map((item, index) => typeof item === 'string' ? h('li', { key: item }, item) : h('li', { key: `${item.city}-${item.name}-${index}` }, h('strong', null, `${item.city} · ${item.name}`), h('small', null, item.context)))) : null,
          content.howToStart ? h('p', { className: 'xyb-resource-action' }, content.howToStart) : null,
          content.caveat ? h('p', { className: 'xyb-note' }, content.caveat) : null,
          h('div', { className: 'xyb-resource-bottom' }, h('small', null, `来源核对 ${resource.verifiedAt || '日期未记录'}`), resource.sourceUrl ? h('a', { className: 'xyb-link', href: resource.sourceUrl, target: '_blank', rel: 'noreferrer' }, '查看原始来源 ↗') : null))
      })
      const mindSections = ['情绪自评', '心理缓解', '安宁疗护', '哀伤支持']
      const mindPage = h(React.Fragment, null,
        h('nav', { className: 'xyb-chart-tools', role: 'tablist', 'aria-label': '心理支持内容' }, ...mindSections.map((section) => h('button', { key: section, type: 'button', role: 'tab', className: 'xyb-chart-pick', 'aria-selected': mindSection === section, onClick: () => setMindSection(section) }, section)), h('button', { type: 'button', className: 'xyb-chart-pick', onClick: () => setMindSection('支持资源') }, '支持资源')),
        mindSection === '情绪自评' ? h('section', { className: 'xyb-module-hero pink' }, h('div', { className: 'xyb-section-head', style: { margin: 0 } }, h('div', null, h('h2', null, '今天的你，感觉怎么样？'), h('p', null, '没有标准答案。可以只选一个最接近的词，也可以暂时不记录。')), h('button', { type: 'button', className: 'xyb-btn', disabled: busy, onClick: () => askAdvice('mind', 'support-assistant', '心理支持', { moodCheckins: moodCheckins.slice(0, 5) }) }, '给我建议')),
          h('form', { onSubmit: recordMoodCheckin }, h('div', { className: 'xyb-chart-tools', role: 'group', 'aria-label': '选择当前感受' }, ...moodChoices.map((mood) => h('button', { key: mood, type: 'button', className: 'xyb-chart-pick', 'aria-pressed': selectedMood === mood, onClick: () => setSelectedMood(mood) }, mood))), h('div', { className: 'xyb-form' }, formField('日期', { name: 'occurredAt', type: 'date', defaultValue: todayLocal, required: true }), formField('想补充的话（选填）', { name: 'note', maxLength: 1000, placeholder: '只记录你愿意保存的内容' }), h('button', { type: 'submit', className: 'xyb-btn', disabled: busy || !selectedMood }, '保存感受'))),
          moodCheckins.length ? moodCheckins.slice(0, 8).map((item) => h('div', { key: item.id, className: 'xyb-list-row' }, h('span', null, h('strong', null, item.mood), item.note ? h('small', null, item.note) : null), h('small', null, item.occurredAt))) : h('p', { className: 'xyb-empty' }, '尚无感受记录。你可以选择是否开始记录。'))
        : mindSection === '心理缓解' ? h('div', { className: 'xyb-grid xyb-two' }, h('section', { className: 'xyb-panel' }, h('h3', null, '两分钟呼吸练习'), h('p', null, '如果愿意，可以找一个舒服的位置，慢慢呼吸；任何时候都可以停下。'), h('button', { type: 'button', className: 'xyb-btn secondary', onClick: () => setMindSection('情绪自评') }, '记录当下感受')), h('section', { className: 'xyb-panel' }, h('h3', null, '和照护者聊聊'), h('p', null, '从“今天最希望对方知道的一件事”开始，也可以只听一听。'), h('button', { type: 'button', className: 'xyb-btn', onClick: () => askAdvice('mind', 'support-assistant', '心理缓解', { moodCheckins: moodCheckins.slice(0, 5) }) }, '和 Agent 整理想讨论的内容')))
        : mindSection === '安宁疗护' ? h('section', { className: 'xyb-panel' }, h('h3', null, '安宁疗护与家属支持'), h('p', null, '可向所在社区卫生服务中心、家庭医生或主治团队询问本区服务方式。机构是否接诊、服务范围和预约方式请直接核实。'), supportResourceCards.length ? supportResourceCards : h('p', { className: 'xyb-empty' }, '本机资源尚未载入。'))
        : mindSection === '哀伤支持' ? h('section', { className: 'xyb-panel' }, h('h3', null, '哀伤支持'), h('p', null, '面对疾病带来的失落、担心或关系变化，每个人的感受和节奏都不同。可以向身边可信任的人、医院社工或专业支持机构寻求陪伴。'), h('div', { className: 'xyb-note' }, '如果你愿意，可以记录此刻最希望被理解的一件事，再决定是否带给家人或医疗团队讨论。'), h('h3', { style: { marginTop: 18 } }, '支持资源'), supportResourceCards.length ? supportResourceCards : h('p', { className: 'xyb-empty' }, '本机资源尚未载入。'))
        : h('section', { className: 'xyb-panel' }, h('h3', null, '支持资源'), supportResourceCards.length ? supportResourceCards : h('p', { className: 'xyb-empty' }, '本机资源尚未载入。'), h('p', { className: 'xyb-note' }, '资源信息用于查找线索，具体服务请与机构核实。')))
      const careSections = [['毒性管理', '治疗副作用'], ['并发症', '并发症'], ['带管管理', '管路照护'], ['血管通路', '管路照护']]
      const careCategoryOptions = ['全部', '症状与不适', '并发症', '治疗副作用', '管路照护', '用药']
      const careRecentItems = [
        ...symptoms.map((item) => ({ category: '症状与不适', title: item.symptomCode, detail: `${item.severity} · ${item.note || '无补充描述'}`, date: item.onsetAt, id: `symptom-${item.id}` })),
        ...(careRecords.comorbidities || []).map((item) => ({ category: '并发症', title: item.comorbidityCode, detail: `${item.state === 'active' ? '当前记录为存在' : item.state === 'past' ? '既往记录' : item.state === 'none' ? '记录为无' : '状态未注明'}${item.severity ? ` · ${item.severity}` : ''}`, date: item.occurredAt, id: `comorbidity-${item.id}` })),
        ...(careRecords.toxicities || []).map((item) => ({ category: '治疗副作用', title: item.toxicityCode, detail: `分级 ${item.ctcaeGrade || '未填写'} · ${item.status === 'active' ? '记录为持续中' : item.status === 'resolved' ? '记录为已缓解' : '状态待补'}`, date: item.onsetAt, id: `tox-${item.id}` })),
        ...(careRecords.catheters || []).flatMap((item) => [{ category: '管路照护', title: item.typeCode, detail: `${item.site || '位置未填写'} · ${item.status === 'in_place' ? '在位' : item.status === 'removed' ? '已移除' : '状态待补'}${item.hospital ? ` · ${item.hospital}` : ''}`, date: item.implantDate, id: `cat-${item.id}` }, ...(item.maintenance || []).map((maintenance) => ({ category: '管路照护', title: `${item.typeCode} · ${maintenance.action || '维护'}`, detail: `${maintenance.abnormal ? '记录有异常' : '记录无异常描述'}${maintenance.note ? ` · ${maintenance.note}` : ''}${maintenance.nextPlannedDate ? ` · 下次计划 ${maintenance.nextPlannedDate}` : ''}`, date: maintenance.date, id: `maintenance-${maintenance.id}` }))]),
        ...(careRecords.medications || []).map((item) => ({ category: '用药', title: item.drugCode, detail: [item.purposeCode, item.doseText, item.routeCode, item.status === 'active' ? '使用中' : item.status === 'stopped' ? '已停用' : '状态未知'].filter(Boolean).join(' · ') || '用途、剂量和途径未填写', date: item.startedAt, id: `med-${item.id}`, recordId: item.id, status: item.status })),
      ].filter((item) => careCategory === '全部' || item.category === careCategory).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
      const careEntryForm = careCategory === '并发症' ? h('form', { onSubmit: recordCareEntry, className: 'xyb-form' }, h('input', { type: 'hidden', name: 'type', value: 'comorbidity' }), formField('并发症情况', { name: 'comorbidityCode', required: true, placeholder: '按病历或医疗团队说明填写' }), formField('记录日期', { name: 'occurredAt', type: 'date', defaultValue: todayLocal }), formField('程度（如已记录）', { name: 'severity', placeholder: '不确定可留空' }), selectField('当前状态', 'state', [['unknown', '未注明'], ['active', '当前存在'], ['past', '既往情况'], ['none', '记录为无']]), h('button', { type: 'submit', className: 'xyb-btn', disabled: busy }, '保存并发症记录'))
        : careCategory === '治疗副作用' ? h('form', { onSubmit: recordCareEntry, className: 'xyb-form' }, h('input', { type: 'hidden', name: 'type', value: 'toxicity' }), formField('副作用 / 不适情况', { name: 'toxicityCode', required: true, placeholder: '按治疗记录或医疗团队说明填写' }), formField('发生日期', { name: 'onsetAt', type: 'date', defaultValue: todayLocal, required: true }), formField('分级（如报告有）', { name: 'ctcaeGrade', placeholder: '按报告原文，不确定可留空' }), selectField('当前状态', 'status', [['unknown', '未注明'], ['active', '持续中'], ['resolved', '已缓解']]), h('button', { type: 'submit', className: 'xyb-btn', disabled: busy }, '保存副作用记录'))
          : careCategory === '管路照护' ? h(React.Fragment, null, h('form', { onSubmit: recordCareEntry, className: 'xyb-form' }, h('input', { type: 'hidden', name: 'type', value: 'catheter' }), selectField('管路类型', 'typeCode', [['PTCD', 'PTCD'], ['surgical', '外科引流管'], ['Port', '输液港 Port'], ['PICC', 'PICC'], ['other', '其他']], true), formField('置入日期', { name: 'implantDate', type: 'date' }), formField('位置', { name: 'site', placeholder: '例如：左上臂' }), formField('医院', { name: 'hospital', placeholder: '可选' }), selectField('当前状态', 'status', [['unknown', '未注明'], ['in_place', '在位'], ['removed', '已移除']]), h('button', { type: 'submit', className: 'xyb-btn', disabled: busy }, '保存管路记录')), careRecords.catheters?.length ? h('form', { onSubmit: recordCareEntry, className: 'xyb-form', style: { marginTop: 12 } }, h('input', { type: 'hidden', name: 'type', value: 'catheter-maintenance' }), selectField('关联管路', 'catheterId', careRecords.catheters.map((item) => [item.id, `${item.typeCode}${item.site ? ` · ${item.site}` : ''}`]), true), formField('维护日期', { name: 'date', type: 'date', required: true, defaultValue: todayLocal }), formField('维护内容', { name: 'action', placeholder: '按实际护理记录填写' }), formField('下次计划日期', { name: 'nextPlannedDate', type: 'date' }), h('label', { style: { display: 'flex', gap: 8, alignItems: 'center' } }, h('input', { type: 'checkbox', name: 'abnormal', value: 'true' }), '本次维护记录有异常'), formField('备注', { name: 'note', placeholder: '可选' }), h('button', { type: 'submit', className: 'xyb-btn', disabled: busy }, '保存维护记录')) : h('p', { className: 'xyb-note' }, '先保存一条管路记录，再补充维护历史。'))
          : careCategory === '用药' ? h('form', { onSubmit: recordCareEntry, className: 'xyb-form' }, h('input', { type: 'hidden', name: 'type', value: 'medication' }), formField('药物名称', { name: 'drugCode', required: true, placeholder: '按处方/药盒填写' }), formField('用途', { name: 'purposeCode', placeholder: '按医嘱填写' }), formField('剂量', { name: 'doseText', placeholder: '按医嘱原文填写' }), formField('给药途径', { name: 'routeCode', placeholder: '口服 / 静脉等' }), formField('开始日期', { name: 'startedAt', type: 'date' }), selectField('状态', 'status', [['active', '使用中'], ['stopped', '已停用'], ['unknown', '未注明']]), h('button', { type: 'submit', className: 'xyb-btn', disabled: busy }, '保存用药记录')) : null
      const careRecordsPanel = h('section', { className: 'xyb-panel' }, h('div', { className: 'xyb-section-head', style: { marginTop: 0 } }, h('div', null, h('h2', null, '照护记录'), h('p', null, '按 V3 的管理主题分开展示和记录。'))), h('div', { className: 'xyb-chart-tools', role: 'tablist', 'aria-label': '全程管理主题' }, ...careSections.map(([section, category]) => h('button', { key: section, type: 'button', role: 'tab', className: 'xyb-chart-pick', 'aria-selected': careSection === section, onClick: () => { setCareSection(section); setCareCategory(category) } }, section))), careEntryForm, careRecentItems.length ? careRecentItems.slice(0, 12).map((item) => h('div', { className: 'xyb-list-row', key: item.id }, h('span', null, h('strong', null, item.title), h('small', null, `${item.category} · ${item.detail}`)), h('span', { className: 'xyb-row-actions' }, h('small', null, item.date || '日期未记录'), item.category === '用药' && item.recordId ? h('button', { type: 'button', className: 'xyb-btn secondary', disabled: busy, onClick: () => updateMedicationStatus(item.recordId, item.status === 'stopped' ? 'active' : 'stopped') }, item.status === 'stopped' ? '恢复使用状态' : '标记已停用') : null))) : h('p', { className: 'xyb-empty' }, `尚无${careCategory}记录。`))
      const symptomPanel = h('section', { className: 'xyb-panel' }, h('div', { className: 'xyb-section-head', style: { marginTop: 0 } }, h('div', null, h('h2', null, '症状与不适记录'), h('p', null, '记录发生时间、程度和描述，供之后与医疗团队核对。')), h('button', { type: 'button', className: 'xyb-btn', disabled: busy, onClick: () => askAdvice('care', 'pancreatic-care-manager', '全程管理', { symptoms }) }, '给我建议')),
        h('form', { onSubmit: recordSymptom, className: 'xyb-form' }, formField('症状/不适', { name: 'symptomCode', required: true, placeholder: '例如：腹胀、食欲下降' }), h('label', { style: { display: 'grid', gap: 6, flex: 1, minWidth: 120, fontWeight: 650 } }, '程度', h('select', { name: 'severity', required: true, style: inputStyle }, h('option', { value: '' }, '请选择'), ...['轻微', '中等', '明显', '未知'].map((value) => h('option', { key: value, value }, value)))), formField('发生日期', { name: 'onsetAt', type: 'date', required: true, defaultValue: todayLocal }), formField('补充描述', { name: 'note', maxLength: 1000, placeholder: '可填写发生情境或持续时间' }), h('button', { type: 'submit', className: 'xyb-btn', disabled: busy }, '保存记录')),
        symptoms.length ? symptoms.slice(0, 8).map((item) => h('div', { className: 'xyb-list-row', key: item.id }, h('span', null, h('strong', null, item.symptomCode), h('small', null, `${item.severity} · ${item.note || '无补充说明'}`)), h('small', null, item.onsetAt))) : h('p', { className: 'xyb-empty' }, '尚无症状记录。'))
      const previewExtension = previewDocument?.title?.split('.').pop()?.toLowerCase() || ''
      const previewCandidates = previewDocument ? candidates.filter((candidate) => candidate.documentId === previewDocument.id) : []
      const previewReview = h('aside', { className: 'xyb-preview-review' },
        h('h3', null, '识别与核对'), h('p', { className: 'xyb-note' }, '识别内容仅作为待核对草稿。请对照原件逐项确认后，才会写入患者记录。'),
        !['txt', 'md'].includes(previewExtension) && (previewDocument?.parseStatus === 'parsed' || (previewDocument?.parseStatus === 'partial' && previewExtension === 'csv')) ? h('button', { type: 'button', className: 'xyb-btn secondary', disabled: busy, onClick: () => openExtractionResult(previewDocument.id) }, previewExtension === 'csv' ? '查看 CSV 解析内容' : '查看解析文本') : null,
        extractionResult && extractionResult.documentId === previewDocument?.id ? h('details', { className: 'xyb-preview-candidate', open: true }, h('summary', { className: 'xyb-link' }, `解析文本 · ${extractionResult.engine === 'mineru-flash-fallback' ? 'MinerU Flash（公益 Token 失效后降级）' : extractionResult.engine === 'mineru-api-pipeline' ? 'MinerU API Pipeline' : extractionResult.engine === 'mineru-api-vlm' ? 'MinerU API VLM' : extractionResult.engine === 'mineru-flash' ? 'MinerU Flash' : extractionResult.engine}`), h('pre', { style: { maxHeight: 280, overflow: 'auto', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', padding: 10, background: '#f8fbf8', borderRadius: 9, fontSize: 11 } }, extractionResult.markdown || '（本次解析没有返回文本内容）')) : null,
        previewCandidates.length ? previewCandidates.map((candidate) => h('div', { className: 'xyb-preview-candidate', key: candidate.id },
          h('strong', null, `${candidate.payload.metricCode || candidate.factType}　${candidate.payload.valueRaw || ''} ${candidate.payload.unitRaw || ''}`),
          h('small', null, `${candidate.payload.occurredAt || '日期待核对'} · ${candidate.payload.sourceText || candidate.sourceLocator || '原文位置待补'}`),
          candidate.status === 'candidate' ? h('div', { className: 'xyb-row-actions' }, h('button', { type: 'button', className: 'xyb-btn', disabled: busy, onClick: () => decideCandidate(candidate.id, true) }, '核对并确认'), h('button', { type: 'button', className: 'xyb-btn secondary', disabled: busy, onClick: () => decideCandidate(candidate.id, false) }, '排除')) : h('small', { className: 'xyb-pill' }, candidate.status === 'confirmed' ? '已确认' : '已排除')))
          : h('p', { className: 'xyb-empty' }, previewDocument?.parseStatus === 'partial' ? '当前解析器不支持此文件格式的内容提取。可以查看原件并手动录入已核实的数据。' : '尚无识别字段。选择“解析文档”后，结果会先列在这里供核对。'))
      const documentPreview = previewDocument ? h('div', { className: 'xyb-preview-backdrop', role: 'presentation', onClick: (event) => { if (event.target === event.currentTarget) setPreviewDocument(null) } }, h('section', { className: 'xyb-preview-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': `查看原件：${previewDocument.title}` },
        h('header', { className: 'xyb-preview-head' }, h('div', null, h('h2', null, previewDocument.title), h('small', null, `${previewDocument.kindCode} · ${previewDocument.reportedAt || '报告日期未填写'} · ${previewDocument.parseStatus === 'parsed' ? '已解析' : previewDocument.parseStatus === 'partial' ? '部分解析' : '待解析'}`)), h('div', { className: 'xyb-row-actions' }, h('button', { type: 'button', className: 'xyb-btn', disabled: busy || previewDocument.parseStatus === 'parsing', onClick: () => parseDocument(previewDocument.id) }, previewDocument.parseStatus === 'pending' ? '解析文档' : '重新解析'), h('button', { type: 'button', className: 'xyb-btn secondary', onClick: () => setPreviewDocument(null) }, '关闭'))),
        h('div', { className: 'xyb-preview-body' },
          h('div', { className: 'xyb-preview-original' }, ['pdf', 'txt', 'md', 'csv', 'png', 'jpg', 'jpeg', 'webp'].includes(previewExtension) ? h('iframe', { className: 'xyb-preview-frame', title: `原件：${previewDocument.title}`, src: `${apiRoot}/documents/content?documentId=${encodeURIComponent(previewDocument.id)}` }) : h('div', { className: 'xyb-panel' }, h('h3', null, '原件预览'), h('p', null, '此文件已保存在本机资料库。当前内嵌预览支持 PDF、图片、TXT、MD 与 CSV；DOCX 可归档，但当前解析器尚不支持提取其内容。'))),
          previewReview))) : null
      const settingsSheet = settingsOpen ? h('div', { className: 'xyb-preview-backdrop', role: 'presentation', onClick: (event) => { if (event.target === event.currentTarget) setSettingsOpen(false) } }, h('section', { className: 'xyb-preview-sheet xyb-settings-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': '工作台设置' },
        h('header', { className: 'xyb-preview-head' }, h('div', null, h('h2', null, '工作台设置'), h('small', null, '配置对本机小胰宝工作区生效；密钥不会返回到界面或写入患者资料。')), h('button', { type: 'button', className: 'xyb-btn secondary', onClick: () => setSettingsOpen(false) }, '关闭')),
        h('form', { onSubmit: saveWorkspaceSettings, className: 'xyb-settings-scroll' },
          h('section', { className: 'xyb-settings-section' }, h('h3', null, '数据来源　·　影响临床匹配的检索范围'),
            h('div', { className: 'xyb-list-row' }, h('span', null, h('strong', null, 'ChiCTR 胰腺癌归档'), h('small', null, `随包本机数据 · ${trialMeta?.record_count || 0} 条记录`)), h('span', { className: 'xyb-pill' }, '本机可检索')),
            h('div', { className: 'xyb-list-row' }, h('span', null, h('strong', null, 'CDE 社区归档'), h('small', null, '数据覆盖范围以当前离线快照为准')), h('span', { className: 'xyb-pill' }, '本机可检索')),
            h('div', { className: 'xyb-list-row' }, h('span', null, h('strong', null, 'CTV / 在线来源'), h('small', null, '需配置服务或连接能力；未接入的来源不会伪装成零结果')), h('span', { className: 'xyb-pill' }, '按服务状态显示')),
            h('p', { className: 'xyb-note' }, '当前离线检索快照与研究中心实时招募状态不同；有需要时请向登记平台或研究中心确认。')),
          h('section', { className: 'xyb-settings-section' }, h('h3', null, '文档解析　·　决定扫描件和图片的处理方式'),
            h('label', { className: 'xyb-settings-choice' }, h('input', { type: 'radio', name: 'parseMode', value: 'local_mineru', checked: workspaceSettings.parseMode === 'local_mineru', onChange: () => setWorkspaceSettings((current) => ({ ...current, parseMode: 'local_mineru' })) }), h('span', null, h('strong', null, 'MinerU 解析（默认）'), h('small', null, '工作台内置公益 API Token，开箱即用；Token 失效时会在解析结果里说明原因与来源，不会静默换用另一套口径。仅在你确认后，选中的文件会发送到 MinerU 云端。'))),
            h('label', { className: 'xyb-settings-choice' }, h('input', { type: 'radio', name: 'parseMode', value: 'local', checked: workspaceSettings.parseMode === 'local', onChange: () => setWorkspaceSettings((current) => ({ ...current, parseMode: 'local' })) }), h('span', null, h('strong', null, '仅本地解析'), h('small', null, 'TXT、MD、CSV 使用本机规则提取；其他格式只归档，不做 OCR。'))),
            workspaceSettings.parseMode === 'local_mineru' ? h('div', { className: 'xyb-settings-choice', style: { display: 'block', borderColor: '#efc8ad', background: '#fff8f3' } }, h('label', { style: { display: 'flex', gap: 9, alignItems: 'flex-start' } }, h('input', { type: 'checkbox', name: 'mineruCloudConsent', value: 'true', checked: workspaceSettings.mineruCloudConsent, onChange: (event) => setWorkspaceSettings((current) => ({ ...current, mineruCloudConsent: event.target.checked })) }), h('span', null, h('strong', null, '我了解并同意将所选文件发送到 MinerU 云端解析'), h('small', null, '仅上传本次选择的文件。患者档案、基因结果、治疗记录、收藏和备注不会作为设置内容上传。可随时切回仅本地解析。')))) : null,
            h('label', { style: { display: 'grid', gap: 6, marginTop: 12, fontWeight: 650 } }, 'MinerU API Token（可选替换公益 Token）', h('input', { name: 'mineruToken', type: 'password', autoComplete: 'new-password', value: workspaceSettings.mineruTokenDraft || '', placeholder: workspaceSettings.mineruTokenConfigured ? '已配置 · 输入新 Token 可替换' : '粘贴 MinerU API Token', onChange: (event) => setWorkspaceSettings((current) => ({ ...current, mineruTokenDraft: event.target.value })) }), h('span', { className: 'xyb-settings-state' }, workspaceSettings.mineruTokenConfigured ? (workspaceSettings.mineruTokenSource === 'bundled-community' ? '内置公益 Token · 默认 API 可用' : `已配置${workspaceSettings.mineruTokenSource === 'environment' ? ' · 当前由 MINERU_TOKEN 环境变量覆盖' : ' · 来自 .secrets/mineru.json'}`) : '未配置')),
            h('p', { className: 'xyb-note' }, `当前生效：${workspaceSettings.mineruTokenSource === 'secret-file' ? '.secrets/mineru.json' : workspaceSettings.mineruTokenSource === 'environment' ? '环境变量 MINERU_TOKEN' : workspaceSettings.mineruTokenSource === 'bundled-community' ? '随包公益 Token' : '尚未配置'}`),
            h('a', { className: 'xyb-link', href: MINERU_TOKEN_URL, target: '_blank', rel: 'noreferrer' }, '申请 / 重置 MinerU Token ↗'),
            h('label', { style: { display: 'grid', gap: 6, marginTop: 10, fontWeight: 650 } }, '解析模型', h('select', { name: 'mineruModel', value: workspaceSettings.mineruModel || 'pipeline', onChange: (event) => setWorkspaceSettings((current) => ({ ...current, mineruModel: event.target.value })) }, h('option', { value: 'pipeline' }, 'pipeline（默认，跨工作台统一口径；空格分列的表容易串位，核对时留意）'), h('option', { value: 'vlm' }, 'vlm（表格还原更完整，适合化验单与病理表；可能生成原文没有的内容）'))),
            h('p', { className: 'xyb-note' }, 'Token 保存在本机 .secrets/mineru.json（唯一本地密钥文件，mode 600，已在 .gitignore）；环境变量 MINERU_TOKEN 只作临时覆盖。解析会把本次所选文件发送到 MinerU 云端；结果进入待核对列表，必须对照原件确认。')),
          h('section', { className: 'xyb-settings-section' }, h('h3', null, '存储与备份'), h('div', { className: 'xyb-list-row' }, h('span', null, h('strong', null, '业务资料根'), h('small', null, workspaceSettings.dataRoot || dataRoot || '尚未选择本机资料文件夹')), h('button', { type: 'button', className: 'xyb-btn secondary', disabled: busy, onClick: selectRoot }, '更改位置')),
            h('div', { className: 'xyb-list-row' }, h('span', null, h('strong', null, '本机备份'), h('small', null, '备份和恢复操作仍在开发清单中；当前不显示虚构的备份时间或文件数量。')), h('span', { className: 'xyb-pill' }, '待接入')),
            h('p', { className: 'xyb-note' }, '患者资料保存在你选择的本机目录。更换目录前请先妥善备份已有资料。')),
          h('section', { className: 'xyb-settings-section' }, h('h3', null, '工作台范围'), h('p', null, '患者档案、报告核对、试验关注和导出记录按患者隔离。DSH Desktop 负责模型、模式、工具权限和快捷键；此弹窗只管理小胰宝工作区设置。')),
          h('div', { className: 'xyb-row-actions', style: { justifyContent: 'flex-end', padding: '8px 0 16px' } }, h('button', { type: 'button', className: 'xyb-btn secondary', onClick: () => setSettingsOpen(false) }, '取消'), h('button', { type: 'submit', className: 'xyb-btn', disabled: busy }, '保存设置'))))) : null
      const trialDetailSheet = selectedTrialDetail ? h('div', { className: 'xyb-preview-backdrop', role: 'presentation', onClick: (event) => { if (event.target === event.currentTarget) setSelectedTrialDetail(null) } },
        h('section', { className: 'xyb-preview-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': `临床试验详情：${selectedTrialDetail.title}` },
          h('header', { className: 'xyb-preview-head' }, h('div', null, h('h2', null, selectedTrialDetail.title), h('small', null, [selectedTrialDetail.trialKey, selectedTrialDetail.phase, selectedTrialDetail.status, selectedTrialDetail.updatedAt].filter(Boolean).join(' · '))), h('button', { type: 'button', className: 'xyb-btn secondary', onClick: () => setSelectedTrialDetail(null) }, '关闭')),
          h('div', { className: 'xyb-preview-review', style: { flex: 1, overflow: 'auto' } },
            h('h3', null, '登记信息'), h('p', null, selectedTrialDetail.indication || '疾病/适应症未标注'),
            h('div', { className: 'xyb-list-row' }, h('span', null, '药物/干预'), h('strong', null, selectedTrialDetail.drugs || '未标注')),
            h('div', { className: 'xyb-list-row' }, h('span', null, '申办方'), h('strong', null, selectedTrialDetail.sponsor || '未标注')),
            h('h3', { style: { marginTop: 18 } }, '入选/排除信息'), h('p', { style: { whiteSpace: 'pre-wrap' } }, selectedTrialDetail.eligibilityText || '登记数据未提供详细标准。请联系研究中心核实.'),
            selectedTrialDetail.detailUrl ? h('a', { className: 'xyb-link', href: selectedTrialDetail.detailUrl, target: '_blank', rel: 'noreferrer' }, '查看登记来源 ↗') : null,
            h('p', { className: 'xyb-note' }, '本机记录用于寻找线索，不代表患者符合条件或当前仍在招募。'),
            h('div', { className: 'xyb-row-actions' },
              h('button', { type: 'button', className: 'xyb-btn secondary', disabled: busy || bookmarks.some((item) => item.trialKey === selectedTrialDetail.trialKey && item.state !== 'archived'), onClick: () => saveTrial(selectedTrialDetail.trialKey, selectedTrialDetail) }, bookmarks.some((item) => item.trialKey === selectedTrialDetail.trialKey && item.state !== 'archived') ? '已加入我的关注' : '加入我的关注'),
              h('button', { type: 'button', className: 'xyb-btn', disabled: busy, onClick: () => { const trial = selectedTrialDetail; setSelectedTrialDetail(null); void askAboutTrial(trial) } }, '交给 Agent 核对'))))) : null
      const page = activeTab === 'dashboard' ? dashboardPage
        : activeTab === 'records' ? h(React.Fragment, null, h('div', { className: 'xyb-module-head' }, h('div', null, h('h2', null, '病情整理'), h('p', null, '把散落的报告、检查和治疗信息放到一起。'))), recordsPage)
        : activeTab === 'one-page' ? h(React.Fragment, null, h('div', { className: 'xyb-module-head' }, h('div', null, h('h2', null, '病情一图秀'), h('p', null, '将已确认的指标与治疗时间放在同一条时间线上，帮助回顾病程。')), h('button', { type: 'button', className: 'xyb-btn secondary', onClick: () => setActiveTab('records') }, '导入数据')), onePage)
        : activeTab === 'trials' ? h(React.Fragment, null, h('div', { className: 'xyb-module-head' }, h('div', null, h('h2', null, '临床匹配'), h('p', null, '根据已整理的信息查找可能相关的试验，结果需要与研究中心进一步确认。'))), h('div', { className: 'xyb-module-hero orange' }, h('h3', null, '找到线索，再和医生一起确认'), h('p', null, '初筛线索不是入组结论。试验状态、入排标准和名额请以研究中心最新答复为准。')), trialPanel)
        : activeTab === 'nutrition' ? h(React.Fragment, null, h('div', { className: 'xyb-module-head' }, h('div', null, h('h2', null, '营养管理'), h('p', null, '记录体重、饮食和消化情况，回顾近期变化。')), h('button', { type: 'button', className: 'xyb-btn', onClick: () => document.querySelector('[name="weightKg"]')?.focus() }, '＋ 记录营养')), hasNutritionDemo ? h('p', { className: 'xyb-notice' }, '界面演示数据 · 非患者真实测量值；可用正式记录替换。') : null, nutritionTopCards, nutritionTrends, nutritionPanel, nutritionLogPanel, h('p', { className: 'xyb-note' }, '营养记录用于日常回顾。能量与蛋白质目标需结合个人情况由医生或营养专业人员评估；本工作台不自动给出处方。'))
        : activeTab === 'mind' ? h(React.Fragment, null, h('div', { className: 'xyb-module-head' }, h('div', null, h('h2', null, '心理支持'), h('p', null, '给感受一个被记录和被看见的地方，也可以看看可信的支持资源。'))), mindPage)
        : activeTab === 'review' ? h(React.Fragment, null,
          h('div', { className: 'xyb-module-head' }, h('div', null, h('h2', null, '收藏与回顾'), h('p', null, '集中查看已收藏试验、生成的报告和发起过的 Agent 任务。'))),
          parseJob ? h('p', { className: 'xyb-notice', 'aria-live': 'polite' }, `正在解析「${parseJob.title || '资料'}」…（${parseJob.status === 'queued' ? '排队中' : '解析中'}）`) : null,
          h('section', { className: 'xyb-panel' }, h('h3', null, `已收藏的临床试验 · ${bookmarks.length}`), bookmarks.length ? bookmarks.map((item) => h('div', { key: item.id, className: 'xyb-list-row' }, h('span', null, h('strong', null, item.trialKey), h('small', null, `${item.state || '已收藏'}${item.note ? ` · ${item.note}` : ''}`)), h('button', { type: 'button', className: 'xyb-btn secondary', onClick: () => setActiveTab('trials') }, '查看临床匹配'))) : h('p', { className: 'xyb-empty' }, '还没有收藏内容。')),
          h('section', { className: 'xyb-panel' }, h('h3', null, `报告与文件 · ${reviewItems.artifacts.length}`), reviewItems.artifacts.length ? reviewItems.artifacts.map((item) => h('div', { key: item.id, className: 'xyb-list-row' }, h('span', null, h('strong', null, `${item.scopeCode} · ${item.formatCode.toUpperCase()}`), h('small', null, item.fileRelPath)), h('a', { className: 'xyb-btn secondary', href: `${apiRoot}/reports/artifact?artifactId=${encodeURIComponent(item.id)}`, target: '_blank', rel: 'noreferrer' }, '打开文件'), h('small', null, item.createdAt))) : h('p', { className: 'xyb-empty' }, '生成的病情报告会记录在这里，并保存在本机 output/reports 目录。')),
          h('section', { className: 'xyb-panel' }, h('h3', null, `Agent 建议与重要对话 · ${reviewItems.tasks.length}`), reviewItems.tasks.length ? reviewItems.tasks.map((item) => h('article', { key: item.id, className: 'xyb-preview-candidate' }, h('strong', null, `${item.pageCode || '工作台'} · ${item.agentRoleCode || 'Agent'}`), h('small', null, `${item.createdAt} · ${item.status} · ${item.sessionRef ? '已关联原生会话' : '尚未关联会话'}`), item.relatedTrial ? h('div', { className: 'xyb-list-row' }, h('span', null, h('strong', null, item.relatedTrial.title || item.relatedTrial.trialKey), h('small', null, `临床试验 · ${item.relatedTrial.sourceCode || '来源未标注'}`)), h('button', { type: 'button', className: 'xyb-btn secondary', onClick: () => openTrialDetail(item.relatedTrial.trialKey) }, '查看试验详情')) : null, h('p', { className: 'xyb-note' }, item.promptRendered), item.sessionRef ? h('button', { type: 'button', className: 'xyb-btn secondary', onClick: () => reopenAgentSession(item.sessionRef) }, '打开原生会话') : null)) : h('p', { className: 'xyb-empty' }, '从任一页面使用“给我建议”后，任务摘要和会话入口会保存在这里。')))
        : activeTab === 'settings' ? h(React.Fragment, null,
          h('div', { className: 'xyb-module-head' }, h('div', null, h('h2', null, '工作台设置'), h('p', null, '管理本机资料、显示偏好和工作台信息。'))),
          h('section', { className: 'xyb-panel' }, h('h3', null, '本机资料库'), h('p', { className: 'xyb-note' }, '患者资料和工作台记录保存在此设备的本机目录。更换目录前，请确认已有资料已妥善备份。'), h('div', { className: 'xyb-list-row' }, h('span', null, '当前资料文件夹'), h('strong', null, dataRoot || '尚未选择')), h('button', { type: 'button', className: 'xyb-btn', disabled: busy, onClick: selectRoot }, '选择或更换资料文件夹')),
          h('section', { className: 'xyb-panel' }, h('h3', null, '显示与可访问性'), h('div', { className: 'xyb-list-row' }, h('span', null, '字体大小'), h('button', { type: 'button', className: 'xyb-btn secondary', 'aria-pressed': largeText, onClick: () => setLargeText(!largeText) }, largeText ? '当前：大字版 · 切换标准字' : '当前：标准字 · 切换大字版')), h('p', { className: 'xyb-note' }, '大字版适合需要更大字号的阅读场景。')),
          h('section', { className: 'xyb-panel' }, h('h3', null, '工作台信息'), h('div', { className: 'xyb-list-row' }, h('span', null, '版本'), h('strong', null, `v${workbenchVersion || '读取中'}`)), h('div', { className: 'xyb-list-row' }, h('span', null, '数据与会话'), h('strong', null, '本机 SQLite · Desktop 原生 Agent 会话')), h('p', { className: 'xyb-note' }, '工作台页面不替代 DSH Desktop 的设置、模式、模型和权限管理。')),
          h('section', { className: 'xyb-panel' }, h('h3', null, '离线数据与文档解析'), h('div', { className: 'xyb-list-row' }, h('span', null, '临床试验数据快照'), h('strong', null, trialMeta ? `${trialMeta.record_count || 0} 条 · ${trialMeta.built_at || '日期未记录'}` : '正在读取')), h('div', { className: 'xyb-list-row' }, h('span', null, '文档解析'), h('strong', null, '当前仅在本机处理；识别结果需人工核对')), h('p', { className: 'xyb-note' }, '在线查询能力需由 Desktop 原生工具或已配置服务提供；本机离线数据的更新状态以数据快照信息为准。')),
          h('section', { className: 'xyb-panel' }, h('h3', null, '备份与导出'), h('p', null, '患者资料位于当前本机资料文件夹。备份前请退出工作台，并将整个资料目录复制到你选择的安全位置；工作台不会在未确认时上传资料。'), h('button', { type: 'button', className: 'xyb-btn', disabled: busy, onClick: exportReport }, '生成病情汇总 HTML'), h('p', { className: 'xyb-note' }, '此操作只生成病情汇总文件，不等同于完整数据库备份。')))
        : h(React.Fragment, null, h('div', { className: 'xyb-module-head' }, h('div', null, h('h2', null, '全程管理'), h('p', null, '症状、并发症、管路和用药记录，方便复诊时一起回顾。'))), h('div', { className: 'xyb-module-hero pink' }, h('h3', null, '把治疗中的情况记下来'), h('p', null, '记录用于整理和沟通；用药信息请按处方填写，副作用分级不确定时可以留空并向医疗团队核实。')), careRecordsPanel, symptomPanel, h('div', { className: 'xyb-grid xyb-two', style: { marginTop: 16 } }, carePanel, schedulePanel), h('p', { className: 'xyb-note' }, '日期用于整理和提醒，请与医疗团队确认。记录不能替代诊断；如出现突然加重或紧急不适，请及时联系医疗机构。'))
      const parseProgress = parseJob ? h('p', { className: 'xyb-notice', role: 'status', 'aria-live': 'polite' }, `正在解析「${parseJob.title || '资料'}」…（${parseJob.status === 'queued' ? '排队中' : '解析中'}，可继续浏览其他页面）`) : null
      // Token 失效提醒：只说现在的状态、能做什么，不解释 HTTP 状态码
      const mineruAlertBanner = mineruAlert ? h('section', { className: 'xyb-notice xyb-token-alert', role: 'alert' }, 
        h('strong', null, 'MinerU Token 失效了，扫描件和照片暂时不能自动识别'),
        h('p', null, '原件已完整保存在本机，不会丢；已经核对确认过的指标也不受影响。换成有效 Token 后，对同一份资料点「解析文档」即可重试。'),
        h('div', { className: 'xyb-row-actions' },
          h('a', { className: 'xyb-link', href: MINERU_TOKEN_URL, target: '_blank', rel: 'noreferrer' }, '去 MinerU 申请 / 重置 Token ↗'),
          h('button', { type: 'button', className: 'xyb-btn', disabled: busy, onClick: openSettings }, '填入新 Token'),
          h('button', { type: 'button', className: 'xyb-btn secondary', disabled: busy, onClick: remindMineruToken }, '让 Agent 提醒我怎么更新'),
          h('button', { type: 'button', className: 'xyb-btn secondary', onClick: () => setMineruAlert(null) }, '稍后处理'))) : null
      return layout(h(React.Fragment, null, h('details', { style: { marginBottom: 12 } }, h('summary', { className: 'xyb-link', style: { cursor: 'pointer', display: 'inline-block' } }, '管理患者档案'), patientList), tabBar, h('p', { className: 'xyb-notice', role: 'status' }, notice), mineruAlertBanner, parseProgress, page, documentPreview, trialDetailSheet, settingsSheet), true)
    }

    function apply(ctx) {
      bridge = ctx
      ctx.effect(() => ctx.desktopWorkbenches.register({
        title: '小胰宝', repository: 'https://github.com/xyb-openharness-dsh-plugins/xyb-workbench',
        description: '本机优先的胰腺癌病程整理、照护计划与临床试验线索工作台',
        customFrame: true,
      }, Panel))
    }
    return { apply, inject: ['desktopWorkbenches', 'uiWorkspace', 'sessions', 'conversation'] }
  },
})
