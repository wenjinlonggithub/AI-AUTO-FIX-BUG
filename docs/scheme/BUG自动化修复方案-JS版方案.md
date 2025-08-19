# BUG自动化修复方案

## 概述

这是一个基于AI的BUG自动化修复系统，能够根据禅道中的BUG ID，自动分析问题、生成修复代码并创建Pull Request。

## 系统架构

### 架构图

```mermaid
graph TB
    A[用户输入: fix &lt;bugid&gt;] --> B[fix命令入口]
    B --> C[禅道信息读取器]
    
    C --> D[项目结构分析]
    D --> E[路由分析器]
    D --> F[API分析器]
    
    E --> G[项目分类器]
    F --> G
    
    G --> H{项目类型判断}
    H -->|前端| I[前端修复器]
    H -->|后端| J[后端修复器]
    
    I --> K[核心修复器]
    J --> K
    
    K --> L[代码审阅器]
    L --> M[PR提交器]
    
    M --> N[生成修复分支]
    M --> O[创建Pull Request]
    M --> P[生成报告]
    
    subgraph "数据存储"
        Q[bug-fixes/BUG-XXXXX/]
        R[fix-report.json]
        S[fix-solution.json]
        T[code-review.json]
        U[生成的代码文件]
    end
    
    P --> Q
    Q --> R
    Q --> S
    Q --> T
    Q --> U
    
    subgraph "外部系统"
        V[禅道系统]
        W[GitHub/GitLab]
        X[项目代码仓库]
    end
    
    C -.-> V
    M -.-> W
    B -.-> X
    
    style A fill:#e1f5fe
    style H fill:#fff3e0
    style P fill:#e8f5e8
    style V fill:#fce4ec
    style W fill:#fce4ec
    style X fill:#fce4ec
```

### 数据流架构

```mermaid
sequenceDiagram
    participant U as 用户
    participant C as fix命令
    participant Z as 禅道读取器
    participant A as 分析器组合
    participant F as 修复器
    participant R as 审阅器
    participant P as PR提交器
    participant G as Git仓库
    
    U->>C: fix <bugid>
    C->>Z: 读取Bug信息
    Z-->>C: Bug详情数据
    
    C->>A: 分析项目结构
    A->>A: 路由分析
    A->>A: API分析
    A->>A: 项目分类
    A-->>C: 分析结果
    
    C->>F: 生成修复方案
    F->>F: 选择修复模板
    F->>F: 生成修复代码
    F-->>C: 修复代码&方案
    
    C->>R: 代码审阅
    R-->>C: 审阅清单
    
    C->>P: 提交PR
    P->>G: 创建分支
    P->>G: 提交代码
    P->>G: 创建PR
    P-->>C: PR信息
    
    C-->>U: 修复完成报告
```

### 核心组件

1. **fix命令入口** (`commands/fix.md`) - 用户命令接口
2. **禅道信息读取器** (`scripts/zentao-reader.js`) - 获取bug详情
3. **路由分析器** (`scripts/route-analyzer.js`) - 分析前端路由结构
4. **API分析器** (`scripts/api-analyzer.js`) - 分析接口文档
5. **项目分类器** (`scripts/project-classifier.js`) - 判断前端/后端项目
6. **核心修复器** (`scripts/bug-fixer.js`) - 生成修复方案
7. **代码审阅器** (`scripts/code-reviewer.js`) - 生成审阅清单
8. **PR提交器** (`scripts/pr-submitter.js`) - 自动创建Pull Request

### 工作流程

```
用户输入: fix <bugid>
    ↓
1. 读取禅道bug信息
    ↓
2. 分析项目结构(路由/API)
    ↓
3. 判断项目类型(前端/后端)
    ↓
4. 生成修复方案和代码
    ↓
5. 创建代码审阅清单
    ↓
6. 提交PR并生成报告
```

## 安装和使用

### 安装依赖

```bash
npm install
```

### 环境配置

创建 `.env` 文件：

```env
ZENTAO_BASE_URL=https://your-zentao.com
ZENTAO_TOKEN=your-api-token
# 或者使用用户名密码
ZENTAO_USERNAME=your-username
ZENTAO_PASSWORD=your-password
```

### 使用方法

```bash
# 修复指定Bug
node scripts/main.js fix 12345

# 或者使用npm脚本
npm run fix 12345

# 自动提交模式
node scripts/main.js fix 12345 --auto-commit

# 只生成方案，不创建PR
node scripts/main.js fix 12345 --no-pr

# 查看修复状态
node scripts/main.js status 12345
```

## 功能特性

### 1. 智能项目类型识别

- 基于关键词分析判断前端/后端问题
- 路由匹配识别前端相关问题
- API错误模式识别后端问题
- 多维度综合评分，提供置信度

### 2. 自动代码生成

**前端修复代码:**
- Vue组件修复模板
- 事件处理和状态管理
- API调用和错误处理
- 路由配置修复

**后端修复代码:**
- Spring Boot Controller
- Service层业务逻辑
- 数据库操作修复
- 异常处理增强

### 3. 代码审阅流程

- 自动生成审阅检查清单
- 风险评估和缓解建议
- 测试计划生成
- 部署建议

### 4. 自动化部署

- 创建修复分支
- 自动提交代码更改
- 生成规范的PR描述
- 集成GitHub CLI

## 输出文件结构

```
bug-fixes/
└── BUG-12345/
    ├── fix-report.json          # 修复报告
    ├── fix-solution.json        # 详细修复方案
    ├── code-review.json         # 审阅结果
    ├── pr-info.json            # PR信息
    ├── BUG-12345-修复方案.md    # Markdown报告
    ├── 代码审阅检查清单.md        # 审阅清单
    ├── PR跟踪.md               # PR跟踪文档
    └── generated-code/         # 生成的代码
        ├── frontend/
        └── backend/
```

## 配置选项

可以创建 `.bugfixer.json` 配置文件:

```json
{
  "zentaoUrl": "https://your-zentao.com",
  "projectPath": "./",
  "outputPath": "./bug-fixes",
  "gitRemote": "origin",
  "baseBranch": "main",
  "branchPrefix": "fix-bug-",
  "autoMerge": false
}
```

## 系统要求

- Node.js >= 14.0.0
- Git >= 2.0
- GitHub CLI (可选，用于自动创建PR)

## 扩展性

### 添加新的修复模式

1. 在 `code-reviewer.js` 中添加新的代码生成模板
2. 在 `project-classifier.js` 中添加新的识别规则
3. 在 `bug-fixer.js` 中添加新的修复策略

### 支持新的项目管理系统

1. 创建新的信息读取器 (如 `jira-reader.js`)
2. 在 `main.js` 中集成新的读取器
3. 适配统一的数据格式

### 支持新的代码托管平台

1. 创建新的PR提交器 (如 `gitlab-submitter.js`)
2. 实现统一的PR接口
3. 添加平台检测逻辑

## 数据资产

系统会自动生成以下数据资产：

1. **问题分类模型** - 基于历史数据训练的问题分类
2. **修复模式库** - 常见问题的修复模板
3. **代码质量规则** - 自动审阅的最佳实践
4. **部署经验** - 成功部署的经验总结

## 监控和优化

- 修复成功率统计
- 代码质量评分
- 用户满意度反馈
- 持续优化建议

## 安全考虑

- API密钥安全存储
- 代码注入防护
- 权限验证
- 审计日志记录

---

此系统旨在提高开发效率，减少重复性工作，但不能完全替代人工审阅和测试。请在部署前仔细验证所有生成的代码。