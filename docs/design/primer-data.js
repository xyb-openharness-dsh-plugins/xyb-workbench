/* 36 号 · 疾病概要数据（小胰宝 · 胰腺癌）
 * 四段固定：definition → evidence → landscape → trend（顺序不可变，缺段不合格）。
 * 口径：只整理公开信息与已发生事实，不写个人判断、不复制指南条文、不写推荐。
 * 原件状态照实写：NCCN / WHO 分类 / 《中国肿瘤营养治疗指南》均未取得原件；
 * 可点的只有公开页面（NCCN 官网指南详情页、IARC 出版方页面），其余写 nolink + note。
 * 规范：docs/36-DISEASE-PRIMER.md；本仓实例说明：docs/DISEASE-PRIMER.md。
 */
window.DISEASE_PRIMER = {
  brand: '小胰宝工作台',
  name: '胰腺癌',
  en: 'Pancreatic Cancer（默认指 PDAC）',
  updated: '2026-10-27',
  sections: [
    {
      id: 'definition',
      title: '定义',
      intro: '胰腺癌通常指起源于胰腺外分泌腺上皮的恶性肿瘤，最常见的是胰腺导管腺癌（PDAC）。'
        + '胰腺还有起源于内分泌细胞的神经内分泌肿瘤等类型，与导管腺癌不是同一种病——本项目不把它们混在同一套路径里叙述。',
      points: [
        '部位上分胰头、胰体、胰尾。胰头部位的病变更常牵涉胆道梗阻，这是本台把黄疸、胆道处理与胰酶替代单列记录的原因。',
        '可切除性评估（可切除 / 交界可切除 / 不可切除）是影像（如增强 CT）结果加上血管受累情况做出的判断。这是医生的判断：本台只记录医生原话与评估日期，不自己判，也不根据肿瘤大小、标志物数值或症状去推。',
        '诊断链条上本台只做一件事：把病理、影像、分子检测的原文抄录并标注「未核对 / 已核对」，不解释报告含义、不给出分期结论。'
      ],
      sources: [
        {
          org: 'WHO',
          doc: 'Classification of Tumours: Digestive System Tumours, 5th ed.',
          version: '2019',
          original: false,
          secondaryUrl: 'https://publications.iarc.fr/Book-And-Report-Series/Who-Classification-Of-Tumours/Digestive-System-Tumours-2019',
          page: '页码待核',
          note: '未取得全书，据 IARC 出版方页面'
        },
        {
          org: '本项目',
          doc: 'docs/design/TARGET-PANEL-SPEC.md',
          version: '2026-10-13 设计建议稿',
          nolink: true,
          note: '项目内文件，无公开链接'
        }
      ]
    },
    {
      id: 'evidence',
      title: '医学资料规范和指南情况',
      intro: '这个工作台里出现的每一条「该查什么、该怎么分期」，都应能追到下面某一份文件。'
        + '原件未取得的，在表里如实标出来，不假装看过。',
      table: {
        head: ['机构', '文件', '版本 / 年份', '原件', '本台的用途'],
        rows: [
          [
            'NCCN',
            'NCCN Guidelines · Pancreatic Adenocarcinoma',
            '2025.V1（据项目二次引用；更新日与生效日待核）',
            {
              text: '未取得原件（据 NCCN 官网指南详情页）',
              url: 'https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1455'
            },
            '靶点面板清单与治疗路径的版本依据；不引具体条目'
          ],
          [
            '中国抗癌协会等（编发机构待核）',
            '《中国肿瘤营养治疗指南》胰腺癌章节',
            '2020 版',
            {
              text: '未取得原件',
              nolink: true,
              note: '仅有图书/阅读平台条目，无公开 PDF；项目内为二次引用'
            },
            '能量与营养目标公式的依据（docs/design/CARE-MANAGEMENT-SPEC.md）'
          ],
          [
            'CSCO',
            '胰腺癌诊疗指南',
            '版本未核实（项目 docs 未记录）',
            {
              text: '未取得原件',
              nolink: true,
              note: '指南经官网订购页/官方 App 发布，需登录；未取得公开 PDF'
            },
            '国内可及性与实践差异；核实前不作引用依据'
          ],
          [
            'WHO',
            '消化系统肿瘤分类（Digestive System Tumours）',
            '第 5 版（2019）',
            {
              text: '未取得全书（出版方页面）',
              url: 'https://publications.iarc.fr/Book-And-Report-Series/Who-Classification-Of-Tumours/Digestive-System-Tumours-2019'
            },
            '病理命名口径（导管腺癌与神经内分泌肿瘤的区分）'
          ]
        ]
      },
      points: [
        '指南给的是「通常怎么做」，不是「你该怎么做」。版本号必须写清：同一份指南隔一年，条目会变。',
        '本台对未取得原件的文件只记「存在」与「大致讲什么」，不引用其具体条文、推荐等级或剂量。'
      ],
      sources: [
        {
          org: 'NCCN',
          doc: 'NCCN Guidelines · Pancreatic Adenocarcinoma',
          version: '2025.V1',
          original: false,
          secondaryUrl: 'https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1455',
          page: '页码待核',
          note: '未取得原件，据 NCCN 官网指南详情页'
        },
        {
          org: 'WHO',
          doc: 'Classification of Tumours: Digestive System Tumours, 5th ed.',
          version: '2019',
          original: false,
          secondaryUrl: 'https://publications.iarc.fr/Book-And-Report-Series/Who-Classification-Of-Tumours/Digestive-System-Tumours-2019',
          page: '页码待核',
          note: '未取得全书，据 IARC 出版方页面'
        },
        {
          org: '中国抗癌协会等（编发机构待核）',
          doc: '《中国肿瘤营养治疗指南》胰腺癌章节',
          version: '2020 版',
          nolink: true,
          note: '无公开 PDF，项目内为二次引用'
        },
        {
          org: 'CSCO',
          doc: '胰腺癌诊疗指南',
          version: '版本未核实',
          nolink: true,
          note: '官网订购页/官方 App 发布，需登录'
        }
      ]
    },
    {
      id: 'landscape',
      title: '目前治疗全景概要',
      intro: '按期别与治疗目的分组，只列指南里出现过的手段类别，不含剂量、疗程与选择条件。'
        + '这是「世界上大致有哪些办法」的地图，不是给你排的先后顺序。',
      groups: [
        {
          label: '可切除',
          points: [
            '手术：胰头部位多为胰十二指肠切除，胰体尾为远端胰腺切除。',
            '术后辅助化疗类别。',
            '新辅助治疗在部分情形下被讨论。'
          ]
        },
        {
          label: '交界可切除',
          points: [
            '先做新辅助治疗（化疗或放化疗类别），之后重新评估能否手术——评估结论仍由医生下。'
          ]
        },
        {
          label: '局部进展、不可切除',
          points: [
            '系统治疗类别。',
            '放化疗类别。',
            '针对梗阻的处理：胆道引流或支架、胃肠吻合等。'
          ]
        },
        {
          label: '转移性',
          points: [
            '联合化疗方案类别。',
            '特定分子背景下被列出的靶向类别（如 BRCA1/2 或 HRD 相关）。',
            'MSI-H / dMMR 情形下的免疫治疗类别。',
            '国内获批状态与可及性需单独核实。'
          ]
        },
        {
          label: '贯穿全程',
          points: [
            '疼痛管理、营养与体重、胆道梗阻处理、胰腺外分泌功能不足的胰酶替代。',
            '本台只记医嘱原文与实际执行情况，不给建议、不调整方案。'
          ]
        }
      ],
      points: [
        '以上是文献与指南里列出的手段，按病期与线序排列，不代表任何一项适合你。选哪一个，这一句需要问你的医生。'
      ],
      sources: [
        {
          org: 'NCCN',
          doc: 'NCCN Guidelines · Pancreatic Adenocarcinoma',
          version: '2025.V1',
          original: false,
          secondaryUrl: 'https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1455',
          page: '页码待核',
          note: '未取得原件，据 NCCN 官网指南详情页'
        },
        {
          org: 'CSCO',
          doc: '胰腺癌诊疗指南',
          version: '版本未核实',
          nolink: true,
          note: '官网订购页/官方 App 发布，需登录'
        }
      ]
    },
    {
      id: 'trend',
      title: '发展趋势',
      intro: '这一段只写已经发生的事：哪份文件换了版本、哪一天生效、分类体系改了什么、登记平台上多了多少条。'
        + '不写预测，不做评价，也不给任何倾向。',
      points: [
        '2025 年：NCCN 胰腺癌指南版本记录为 2025.V1（据本项目 docs/design/TARGET-PANEL-SPEC.md，2026-10-13 记录；更新日与生效日待核，原件未取得）。',
        '2020 年：《中国肿瘤营养治疗指南》2020 版发布，其中胰腺癌章节被本项目用作能量与营养目标的依据（据 docs/design/CARE-MANAGEMENT-SPEC.md；出版信息待核，原件未取得）。',
        '临床研究登记的数量与阶段分布、国内监管批件：本台尚未整理——项目 docs 里没有检索日期与检索式，不填数字、不写批件号。'
      ],
      sources: [
        {
          org: 'WHO',
          doc: 'Classification of Tumours: Digestive System Tumours, 5th ed.',
          version: '2019',
          original: false,
          secondaryUrl: 'https://publications.iarc.fr/Book-And-Report-Series/Who-Classification-Of-Tumours/Digestive-System-Tumours-2019',
          page: '页码待核',
          note: '未取得全书，据 IARC 出版方页面'
        },
        {
          org: '本项目',
          doc: 'docs/design/TARGET-PANEL-SPEC.md 与 docs/design/CARE-MANAGEMENT-SPEC.md',
          version: '2026-10-13',
          nolink: true,
          note: '项目内文件，无公开链接'
        }
      ]
    }
  ]
}
