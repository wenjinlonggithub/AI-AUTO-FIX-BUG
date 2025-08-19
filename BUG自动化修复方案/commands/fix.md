# Fix Bug Command

这是一个自动化BUG修复命令，根据禅道bug ID自动分析和修复问题。

## 使用方法

```bash
fix <bugid>
```

## 执行流程

1. **读取禅道bug信息** - 从禅道系统获取详细bug描述、复现步骤、期望结果等
2. **读取前端路由信息** - 分析前端路由配置，确定相关页面和组件
3. **读取接口信息** - 获取相关API接口文档和规范
4. **判断项目类型** - 自动识别需要修改前端还是后端项目
5. **执行修复逻辑** - 根据bug类型和项目结构生成修复代码
6. **代码审阅** - 生成修复方案供程序员审阅
7. **提交PR** - 自动创建Pull Request

## 命令实现

### 1. 禅道Bug信息读取

```javascript
// 从禅道API获取bug详情
async function getZentaoBugInfo(bugId) {
  const response = await fetch(`${ZENTAO_BASE_URL}/bug-${bugId}.json`, {
    headers: {
      'Token': process.env.ZENTAO_TOKEN
    }
  });
  
  const bugData = await response.json();
  
  return {
    id: bugData.id,
    title: bugData.title,
    description: bugData.steps,
    severity: bugData.severity,
    status: bugData.status,
    assignedTo: bugData.assignedTo,
    module: bugData.module,
    project: bugData.project,
    expectedResult: bugData.expectedResult,
    actualResult: bugData.actualResult
  };
}
```

### 2. 前端路由信息读取

```javascript
// 读取项目路由配置
async function getFrontendRoutes(projectPath) {
  const routeFiles = [
    `${projectPath}/src/router/index.js`,
    `${projectPath}/src/router/routes.js`,
    `${projectPath}/config/routes.js`
  ];
  
  const routes = [];
  for (const file of routeFiles) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      routes.push(...parseRoutes(content));
    }
  }
  
  return routes;
}
```

### 3. 接口信息读取

```javascript
// 读取API接口文档
async function getApiInfo(projectPath) {
  const apiFiles = await glob(`${projectPath}/**/接口文档.md`);
  const apiInfo = [];
  
  for (const file of apiFiles) {
    const content = fs.readFileSync(file, 'utf8');
    apiInfo.push(parseApiDoc(content));
  }
  
  return apiInfo;
}
```

### 4. 项目类型判断

```javascript
// 判断是前端还是后端项目
function determineProjectType(bugInfo, routes, apiInfo) {
  const { module, description } = bugInfo;
  
  // 检查是否涉及前端页面
  const frontendKeywords = ['页面', '按钮', '表单', '显示', '点击', 'UI', '界面'];
  const backendKeywords = ['接口', 'API', '数据库', '服务', '逻辑', '计算'];
  
  const frontendScore = frontendKeywords.filter(keyword => 
    description.includes(keyword)
  ).length;
  
  const backendScore = backendKeywords.filter(keyword => 
    description.includes(keyword)
  ).length;
  
  return frontendScore > backendScore ? 'frontend' : 'backend';
}
```

### 5. 核心修复逻辑

```javascript
// 主要修复逻辑
async function fixBug(bugInfo, projectType, context) {
  const prompt = generateFixPrompt(bugInfo, projectType, context);
  
  // 调用AI生成修复代码
  const fixSolution = await generateCodeFix(prompt);
  
  // 应用修复
  await applyFix(fixSolution);
  
  return {
    bugId: bugInfo.id,
    projectType,
    fixedFiles: fixSolution.modifiedFiles,
    solution: fixSolution.description
  };
}
```

### 6. 提示词模板

```markdown
# BUG修复提示词

## Bug信息
- ID: {{bugId}}
- 标题: {{title}}
- 描述: {{description}}
- 严重程度: {{severity}}
- 期望结果: {{expectedResult}}
- 实际结果: {{actualResult}}

## 项目信息
- 项目类型: {{projectType}}
- 相关模块: {{module}}
- 涉及路由: {{routes}}
- 相关接口: {{apiEndpoints}}

## 修复要求
1. 分析bug根本原因
2. 提供具体修复方案
3. 生成可直接应用的代码
4. 确保修复不影响其他功能
5. 遵循项目代码规范

## 输出格式
请按以下格式输出修复方案:

### 问题分析
[详细分析bug产生的原因]

### 修复方案
[具体的修复步骤和方法]

### 代码修改
[需要修改的文件和具体代码]

### 测试建议
[如何验证修复效果]
```

### 7. 自动提交流程

```javascript
// 自动提交PR
async function submitPR(fixResult) {
  const { bugId, fixedFiles, solution } = fixResult;
  
  // 创建分支
  await execCommand(`git checkout -b fix-bug-${bugId}`);
  
  // 提交修改
  await execCommand(`git add ${fixedFiles.join(' ')}`);
  await execCommand(`git commit -m "fix: 修复BUG-${bugId}"`);
  
  // 推送到远程
  await execCommand(`git push origin fix-bug-${bugId}`);
  
  // 创建PR
  const prUrl = await createPullRequest({
    title: `Fix: 修复BUG-${bugId}`,
    body: solution,
    head: `fix-bug-${bugId}`,
    base: 'main'
  });
  
  return prUrl;
}
```

## 配置要求

### 环境变量
- `ZENTAO_BASE_URL`: 禅道系统地址
- `ZENTAO_TOKEN`: 禅道API访问令牌
- `GITHUB_TOKEN`: GitHub访问令牌（用于创建PR）

### 项目结构要求
- 项目需要包含接口文档（markdown格式）
- 前端项目需要标准的路由配置文件
- 代码需要遵循统一的目录结构

## 使用示例

```bash
# 修复禅道中ID为12345的bug
fix 12345
```

执行后将自动：
1. 获取bug详情
2. 分析项目结构
3. 生成修复代码
4. 创建PR等待审阅