-- Publicly sourced hospice-care and family-support references. The entries
-- are directory leads, not clinical recommendations or appointment status.
INSERT OR IGNORE INTO support_resource (id, domain_code, title, content_json, source_url, region_code, verified_at, updated_at)
VALUES
('resource-rong-2025-report', 'palliative_care', '荣基金“安宁”项目 2025 年度总结报告',
 '{"kind":"项目年度报告","publishedAt":"2026-03-16","summary":"报告记载北京、上海等地的安宁疗护专业支持、基层协作和志愿服务项目。项目合作记录不等同于医疗服务目录。","institutions":[{"city":"北京","name":"北京医院（北京市安宁疗护指导中心）","context":"专业支持与行业协作"},{"city":"北京","name":"北京普仁医院","context":"报告记载志愿者病房陪伴服务"},{"city":"北京","name":"北京松堂关怀医院","context":"报告记载志愿者陪伴服务"},{"city":"上海","name":"上海市普陀区石泉街道社区卫生服务中心","context":"报告记载志愿者培育、病房陪伴与医护培训协作"},{"city":"上海","name":"豪斯达养老院","context":"报告记载志愿者陪伴活动；养老机构不等同于医疗机构"}],"caveat":"联系前请核实目前是否提供安宁疗护、服务对象、接诊区域和预约方式。"}',
 'https://www.rongfoundation.com/a/xinwen/xiangmubaogao/2026/0530/938.html', 'CN', '2026-10-15', '2026-10-15'),
('resource-beijing-palliative-list-2025', 'palliative_care', '北京安宁疗护中心名单（2022—2024 年转型建设）',
 '{"kind":"政府公开名单","publishedAt":"2025-03-04","institutions":["北京市鼓楼中医医院","北京市第六医院","北京市回民医院","北京市海淀医院","北京市通州区老年病医院","北京市丰台区蒲黄榆社区卫生服务中心","北京市昌平区沙河医院","北京中医医院平谷医院","北京中医医院延庆医院","北京市朝阳区孙河社区卫生服务中心","北京市大兴区西红门社区卫生服务中心","北京市密云区太师屯镇社区卫生服务中心","北京市朝阳区小红门社区卫生服务中心","北京老年医院","北京幸福颐养护理院","北京市门头沟区中医医院","北京市房山区长沟镇社区卫生服务中心","北京市大兴区心康医院","北京中医医院顺义医院","北京市怀柔区北房镇社区卫生服务中心"],"caveat":"名单说明为 2022—2024 年转型建设情况；请向机构核实当前服务、接诊区域和预约方式。"}',
 'https://wjw.beijing.gov.cn/wjwh/ztzl/lnr/lljkfw/202503/t20250307_4028561.html', '北京', '2026-10-15', '2026-10-15'),
('resource-shanghai-palliative-network-2026', 'palliative_care', '上海安宁疗护服务网络信息',
 '{"kind":"政府公开信息","publishedAt":"2026-04-03","summary":"上海市政府信息称全市 246 家社区卫生服务中心已覆盖安宁疗护服务，并介绍社区、居家、二三级医疗机构协同模式。该信息不是逐家机构的预约目录。","howToStart":"可先咨询居住地社区卫生服务中心或家庭医生，询问服务方式、适用条件、家庭病床和转诊安排。","caveat":"实际服务由机构评估并确认，请按所在区查询最新信息。"}',
 'https://www.shanghai.gov.cn/nw4411/20260403/e4d86e7673a84c78ba6ef96f68e7f5d2.html', '上海', '2026-10-15', '2026-10-15'),
('resource-rong-home-care-cases-2022', 'palliative_care', '荣基金转载：国内居家安宁疗护服务案例（历史资料）',
 '{"kind":"案例综述","publishedAt":"2022-06-17","examples":[{"city":"北京","name":"丰台区蒲黄榆社区卫生服务中心"},{"city":"北京","name":"西城区德胜社区卫生服务中心"},{"city":"上海","name":"普陀区利群医院及社区卫生服务中心"},{"city":"上海","name":"打浦桥街道社区卫生服务中心"}],"summary":"文章介绍多学科支持、家庭病床和家属哀伤辅导等服务案例。","caveat":"此为 2022 年编辑整理的历史案例，不代表这些机构目前仍提供相同服务；先致电所在区卫健部门或机构核实。"}',
 'https://rongfoundation.com/a/jianzhu/cishanwenhua/2022/0617/398.html', 'CN', '2026-10-15', '2026-10-15');

PRAGMA user_version = 7;
