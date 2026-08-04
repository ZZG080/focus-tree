# FocusTree — 系统架构

## 技术选型

| 层级 | 技术 | 理由 |
|------|------|------|
| 框架 | React 18.3 | 组件化、生态成熟、稳定兼容 |
| 构建 | Vite 6 | 秒级热更新、零配置、现代标准 |
| 语言 | TypeScript | 类型安全，长期可维护 |
| 样式 | 原生 CSS + CSS Variables | 轻量，手绘风格无需框架 |
| 动画 | SVG + CSS transitions | 手绘树形用 SVG path 最自然，GPU 加速流畅 |
| 存储 | localStorage | 纯前端 MVP，无需后端 |
| AI | 服务层抽象 + Fetch 调用 | 支持配置 API key 启用真 AI，无 key 时内置模板兜底 |

## 系统结构

```
用户
 ↓
React 组件树 (View)
 ├── SetupView     （设置时长）
 ├── FocusView     （专注中：种子+树生长动画）
 └── HistoryView   （专注记录）
 ↓
业务逻辑层 (Hooks/Services)
 ├── useFocusTimer    （计时状态机）
 ├── useGrowthCurve   （时间→生长阶段映射）
 ├── treeService      （SVG 树形生成）
 ├── aiService        （鼓励语，可配置）
 └── storageService   （localStorage 读写）
 ↓
数据存储
 └── localStorage（专注记录、设置、当前进度）
```

## 模块设计

### 1. FocusTimer（计时核心）
- **职责**：管理专注会话生命周期（idle → running → paused → finished）
- **输入**：时长设置、用户操作（开始/暂停/结束）
- **输出**：当前会话状态、已过时间（基于时间戳计算，可断点恢复）
- **依赖**：无（纯逻辑 hook）

### 2. GrowthCurve（生长曲线）
- **职责**：把已过时间映射为生长进度 0~1
- **输入**：elapsed minutes、总时长
- **输出**：生长阶段 + 进度值
- **规则**（按需求文档）：
  - 0-15min：根系生长（占泥土一半）
  - 15-25min：发芽破土（25min 时舒展枝叶）
  - 25min-1.5h：树干长粗长高至天空 1/2
  - 大树长成后：新种子落下，循环
- **依赖**：无

### 3. TreeRenderer（SVG 树形）
- **职责**：根据生长进度渲染手绘风树木（种子→根→芽→苗→大树）
- **输入**：progress 0~1、阶段标识
- **输出**：SVG 图层
- **依赖**：GrowthCurve

### 4. AIService（鼓励语）
- **职责**：专注结束时生成鼓励语
- **输入**：本次专注时长、是否完成
- **输出**：鼓励语文本
- **实现**：有 API key → 调 LLM API；无 key → 内置模板随机
- **依赖**：环境变量/设置

### 5. StorageService（持久化）
- **职责**：读写 localStorage
- **输入**：key + value
- **输出**：读到的数据
- **数据**：focus-records[]、settings、session-snapshot（断点恢复）

## 文件结构

```
FocusTree/
├── index.html
├── vite.config.ts
├── package.json
├── tsconfig.json
├── src/
│   ├── main.tsx              # 入口
│   ├── App.tsx               # 视图路由（3个视图切换）
│   ├── styles/
│   │   ├── global.css        # CSS 变量 + 重置
│   │   └── scene.css         # 场景（天空/地面/树）样式
│   ├── components/
│   │   ├── SetupView.tsx     # 时长设置
│   │   ├── FocusView.tsx     # 专注主场景
│   │   ├── TreeScene.tsx     # SVG 树场景容器
│   │   ├── TreeLayers.tsx    # 根/干/冠 图层
│   │   ├── Sky.tsx           # 云朵
│   │   ├── Ground.tsx        # 草地+泥土
│   │   └── HistoryView.tsx   # 记录列表
│   ├── hooks/
│   │   ├── useFocusTimer.ts
│   │   └── useGrowthCurve.ts
│   ├── services/
│   │   ├── storageService.ts
│   │   └── aiService.ts
│   └── types.ts              # 类型定义
├── tests/
│   └── growthCurve.test.ts   # 生长曲线单元测试
└── docs/
```

## 数据流

1. 用户设置时长 → `useFocusTimer.start(duration)` → 记录 `startedAt` 时间戳 + 快照
2. 每秒 tick：`elapsed = now - startedAt` → `GrowthCurve(elapsed)` → 进度值 → `TreeLayers` 更新 SVG
3. 专注结束 → `StorageService.addRecord()` → `AIService.generate()` → 显示鼓励语
4. 大树长成 → 自动在随机 x 位置落新种子 → 循环

## 生长时间轴（与真实时间同步）

| 时间 | 生长事件 |
|------|---------|
| 0-15min | 种子入土 1/3，根系生长至泥土一半 |
| 15-25min | 种子萌发，25min 破土舒展枝叶，根系超出画面 |
| 25min-1.5h | 树干长粗长高至天空 1/2 |
| 完成后 | 新种子从旁落下，循环 |

> 注：生长进度 = min(elapsed / 90min, 1) 分段映射，支持任意自定义时长（>90min 时大树长成后循环；<90min 时长则按比例压缩各阶段）。
