/**
 * 核心Bug修复器
 * 整合所有分析结果，生成具体的修复方案和代码
 */

const ZentaoReader = require('./zentao-reader');
const RouteAnalyzer = require('./route-analyzer');
const ApiAnalyzer = require('./api-analyzer');
const ProjectClassifier = require('./project-classifier');
const fs = require('fs');
const path = require('path');

class BugFixer {
  constructor(config = {}) {
    this.config = {
      zentaoUrl: config.zentaoUrl || process.env.ZENTAO_BASE_URL,
      zentaoToken: config.zentaoToken || process.env.ZENTAO_TOKEN,
      projectPath: config.projectPath || process.cwd(),
      outputPath: config.outputPath || './bug-fixes',
      ...config
    };

    this.zentaoReader = new ZentaoReader({
      baseUrl: this.config.zentaoUrl,
      token: this.config.zentaoToken
    });

    this.routeAnalyzer = new RouteAnalyzer(this.config.projectPath);
    this.apiAnalyzer = new ApiAnalyzer(this.config.projectPath);
    this.projectClassifier = new ProjectClassifier();
  }

  /**
   * 修复指定的bug
   * @param {string|number} bugId - Bug ID
   * @returns {Promise<Object>} 修复结果
   */
  async fixBug(bugId) {
    try {
      console.log(`开始分析Bug ${bugId}...`);
      
      // 1. 读取bug信息
      const bugInfo = await this.zentaoReader.getBugInfo(bugId);
      console.log(`Bug信息获取完成: ${bugInfo.title}`);

      // 2. 分析项目结构
      const routeInfo = await this.routeAnalyzer.analyzeRoutes();
      const apiInfo = await this.apiAnalyzer.analyzeApis();
      console.log(`项目结构分析完成: ${routeInfo.totalRoutes}个路由, ${apiInfo.totalEndpoints}个API`);

      // 3. 判断项目类型
      const classification = await this.projectClassifier.classifyProject(
        bugInfo, routeInfo, apiInfo, this.config.projectPath
      );
      console.log(`项目分类完成: ${classification.projectType} (置信度: ${classification.confidence.toFixed(2)})`);

      // 4. 生成修复方案
      const fixSolution = await this.generateFixSolution(
        bugInfo, routeInfo, apiInfo, classification
      );

      // 5. 创建修复报告
      const report = this.createFixReport(bugId, bugInfo, classification, fixSolution);

      // 6. 保存结果
      await this.saveFixResults(bugId, report, fixSolution);

      return {
        bugId,
        bugInfo,
        classification,
        fixSolution,
        report,
        success: true
      };

    } catch (error) {
      console.error(`Bug ${bugId} 修复失败:`, error.message);
      return {
        bugId,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 生成修复方案
   */
  async generateFixSolution(bugInfo, routeInfo, apiInfo, classification) {
    const solution = {
      analysisResult: classification,
      fixStrategy: this.determineFixStrategy(bugInfo, classification),
      codeChanges: [],
      testPlan: [],
      riskAssessment: [],
      implementationSteps: []
    };

    // 根据项目类型生成对应的修复方案
    switch (classification.projectType) {
      case 'frontend':
        await this.generateFrontendFix(solution, bugInfo, routeInfo, classification);
        break;
      case 'backend':
        await this.generateBackendFix(solution, bugInfo, apiInfo, classification);
        break;
      case 'both':
        await this.generateFullStackFix(solution, bugInfo, routeInfo, apiInfo, classification);
        break;
      default:
        await this.generateGenericFix(solution, bugInfo, classification);
    }

    return solution;
  }

  /**
   * 确定修复策略
   */
  determineFixStrategy(bugInfo, classification) {
    const strategies = [];

    // 基于严重程度确定策略
    if (bugInfo.severity && bugInfo.severity.includes('P1')) {
      strategies.push('紧急修复 - 优先级最高');
      strategies.push('需要立即修复并发布热修复');
    } else if (bugInfo.severity && bugInfo.severity.includes('P2')) {
      strategies.push('重要修复 - 纳入下个版本');
    } else {
      strategies.push('常规修复 - 计划修复');
    }

    // 基于分类结果确定策略
    if (classification.confidence > 0.8) {
      strategies.push(`高置信度${classification.projectType}问题 - 直接修复`);
    } else if (classification.confidence > 0.5) {
      strategies.push(`中等置信度${classification.projectType}问题 - 需要进一步调查`);
    } else {
      strategies.push('低置信度 - 需要详细分析和测试');
    }

    return strategies;
  }

  /**
   * 生成前端修复方案
   */
  async generateFrontendFix(solution, bugInfo, routeInfo, classification) {
    const analysis = classification.analysis;
    
    // 查找相关的路由和组件
    const relatedRoutes = analysis.route.relatedRoutes || [];
    const affectedComponents = this.findAffectedComponents(bugInfo, routeInfo);

    solution.codeChanges = [
      {
        type: 'frontend',
        category: 'component',
        description: '修复组件逻辑问题',
        files: affectedComponents.map(comp => comp.file || comp.component),
        changes: this.generateFrontendCodeChanges(bugInfo, affectedComponents)
      }
    ];

    solution.testPlan = [
      '在浏览器中手动测试修复的功能',
      '验证UI显示是否正常',
      '测试用户交互是否符合预期',
      '检查控制台是否有JavaScript错误',
      '在不同浏览器中进行兼容性测试'
    ];

    solution.implementationSteps = [
      '1. 定位相关的Vue/React组件文件',
      '2. 分析组件的数据流和状态管理',
      '3. 修复组件逻辑或样式问题',
      '4. 更新相关的路由配置（如需要）',
      '5. 进行单元测试和集成测试',
      '6. 在开发环境中验证修复效果'
    ];

    if (relatedRoutes.length > 0) {
      solution.implementationSteps.push(
        `7. 检查相关路由: ${relatedRoutes.map(r => r.path).join(', ')}`
      );
    }
  }

  /**
   * 生成后端修复方案
   */
  async generateBackendFix(solution, bugInfo, apiInfo, classification) {
    const analysis = classification.analysis;
    const relatedApis = analysis.api.relatedApis || [];

    solution.codeChanges = [
      {
        type: 'backend',
        category: 'api',
        description: '修复API接口问题',
        files: this.findAffectedBackendFiles(bugInfo, apiInfo),
        changes: this.generateBackendCodeChanges(bugInfo, relatedApis)
      }
    ];

    solution.testPlan = [
      '使用Postman或curl测试API接口',
      '验证数据库操作是否正确',
      '检查业务逻辑处理是否符合预期',
      '进行边界条件和异常情况测试',
      '验证接口性能是否满足要求'
    ];

    solution.implementationSteps = [
      '1. 定位相关的Controller/Service/DAO文件',
      '2. 分析业务逻辑和数据流',
      '3. 修复后端代码逻辑',
      '4. 更新相关的数据库操作（如需要）',
      '5. 编写或更新单元测试',
      '6. 在测试环境中验证修复效果'
    ];

    if (relatedApis.length > 0) {
      solution.implementationSteps.push(
        `7. 重点测试API: ${relatedApis.map(a => a.path).join(', ')}`
      );
    }
  }

  /**
   * 生成全栈修复方案
   */
  async generateFullStackFix(solution, bugInfo, routeInfo, apiInfo, classification) {
    // 综合前端和后端的修复方案
    await this.generateFrontendFix(solution, bugInfo, routeInfo, classification);
    const backendSolution = { codeChanges: [], testPlan: [], implementationSteps: [] };
    await this.generateBackendFix(backendSolution, bugInfo, apiInfo, classification);

    // 合并修复方案
    solution.codeChanges.push(...backendSolution.codeChanges);
    solution.testPlan.push('=== 前后端联调测试 ===', ...backendSolution.testPlan);
    solution.implementationSteps.push('=== 后端修复步骤 ===', ...backendSolution.implementationSteps);

    // 添加联调相关的步骤
    solution.implementationSteps.push(
      '=== 前后端联调 ===',
      '1. 确保前后端API调用格式一致',
      '2. 验证数据传输和响应格式',
      '3. 进行端到端的功能测试'
    );
  }

  /**
   * 生成通用修复方案
   */
  async generateGenericFix(solution, bugInfo, classification) {
    solution.codeChanges = [
      {
        type: 'generic',
        category: 'investigation',
        description: '需要进一步调查确定修复方案',
        files: [],
        changes: ['请手动分析bug原因并制定具体修复方案']
      }
    ];

    solution.testPlan = [
      '根据bug描述制定具体的测试计划',
      '复现bug现象',
      '验证修复效果'
    ];

    solution.implementationSteps = [
      '1. 详细分析bug复现步骤',
      '2. 定位问题所在的代码区域',
      '3. 制定具体的修复方案',
      '4. 实施修复并测试验证'
    ];
  }

  /**
   * 查找受影响的组件
   */
  findAffectedComponents(bugInfo, routeInfo) {
    const components = [];
    const text = `${bugInfo.title} ${bugInfo.description}`.toLowerCase();

    // 从路由信息中查找相关组件
    if (routeInfo && routeInfo.routes) {
      for (const route of routeInfo.routes) {
        if (route.path && text.includes(route.path.toLowerCase())) {
          components.push(route);
        }
        if (route.component && text.includes(route.component.toLowerCase())) {
          components.push(route);
        }
      }
    }

    return components;
  }

  /**
   * 查找受影响的后端文件
   */
  findAffectedBackendFiles(bugInfo, apiInfo) {
    const files = [];
    
    if (apiInfo && apiInfo.endpoints) {
      const text = `${bugInfo.title} ${bugInfo.description}`.toLowerCase();
      
      for (const api of apiInfo.endpoints) {
        if (api.path && text.includes(api.path.toLowerCase())) {
          if (api.sourceFile) {
            files.push(api.sourceFile);
          }
        }
      }
    }

    return [...new Set(files)]; // 去重
  }

  /**
   * 生成前端代码修改建议
   */
  generateFrontendCodeChanges(bugInfo, components) {
    const changes = [];
    
    // 基于bug描述生成修改建议
    const description = bugInfo.description.toLowerCase();
    
    if (description.includes('点击') && description.includes('无效')) {
      changes.push({
        type: '事件处理',
        suggestion: '检查点击事件绑定和处理函数',
        code: `
// 检查事件绑定
@click="handleClick"

// 检查处理函数
methods: {
  handleClick() {
    // 添加调试日志
    console.log('按钮被点击');
    // 处理逻辑
  }
}`
      });
    }

    if (description.includes('显示') && description.includes('异常')) {
      changes.push({
        type: '数据渲染',
        suggestion: '检查数据绑定和条件渲染',
        code: `
// 检查数据绑定
<template>
  <div v-if="data">{{ data.value }}</div>
  <div v-else>数据加载中...</div>
</template>

// 检查数据获取
async mounted() {
  try {
    this.data = await this.fetchData();
  } catch (error) {
    console.error('数据获取失败:', error);
  }
}`
      });
    }

    return changes;
  }

  /**
   * 生成后端代码修改建议
   */
  generateBackendCodeChanges(bugInfo, apis) {
    const changes = [];
    const description = bugInfo.description.toLowerCase();

    if (description.includes('接口') && description.includes('错误')) {
      changes.push({
        type: 'API修复',
        suggestion: '检查接口实现和异常处理',
        code: `
@RestController
@RequestMapping("/api")
public class ExampleController {
    
    @PostMapping("/example")
    public ResponseEntity<?> handleRequest(@RequestBody RequestDTO request) {
        try {
            // 添加参数验证
            if (request == null || StringUtils.isEmpty(request.getParam())) {
                return ResponseEntity.badRequest()
                    .body(new ErrorResponse("参数不能为空"));
            }
            
            // 业务逻辑处理
            ResponseDTO result = exampleService.process(request);
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("接口处理异常:", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("服务器内部错误"));
        }
    }
}`
      });
    }

    if (description.includes('数据库') || description.includes('数据')) {
      changes.push({
        type: '数据库修复',
        suggestion: '检查SQL查询和数据库操作',
        code: `
@Repository
public class ExampleMapper {
    
    @Select("SELECT * FROM table_name WHERE id = #{id}")
    public ExampleEntity findById(@Param("id") Long id);
    
    @Update("UPDATE table_name SET column = #{value} WHERE id = #{id}")
    public int updateById(@Param("id") Long id, @Param("value") String value);
}`
      });
    }

    return changes;
  }

  /**
   * 创建修复报告
   */
  createFixReport(bugId, bugInfo, classification, fixSolution) {
    const report = {
      bugId: bugId,
      title: bugInfo.title,
      severity: bugInfo.severity,
      analysisDate: new Date().toISOString(),
      classification: {
        projectType: classification.projectType,
        confidence: classification.confidence,
        reasons: classification.reasons
      },
      recommendations: classification.recommendations,
      fixStrategy: fixSolution.fixStrategy,
      estimatedEffort: this.estimateEffort(bugInfo, classification),
      riskLevel: this.assessRisk(bugInfo, classification)
    };

    return report;
  }

  /**
   * 估算修复工作量
   */
  estimateEffort(bugInfo, classification) {
    let effort = '1-2小时'; // 默认值

    // 基于严重程度调整
    if (bugInfo.severity && bugInfo.severity.includes('P1')) {
      effort = '0.5-1小时';
    } else if (bugInfo.severity && bugInfo.severity.includes('P4')) {
      effort = '2-4小时';
    }

    // 基于置信度调整
    if (classification.confidence < 0.5) {
      effort += ' (需额外调查时间 1-2小时)';
    }

    return effort;
  }

  /**
   * 评估修复风险
   */
  assessRisk(bugInfo, classification) {
    let risk = '低';

    if (bugInfo.severity && bugInfo.severity.includes('P1')) {
      risk = '高';
    } else if (bugInfo.severity && bugInfo.severity.includes('P2')) {
      risk = '中';
    }

    if (classification.projectType === 'both') {
      risk += ' (涉及前后端联调)';
    }

    return risk;
  }

  /**
   * 保存修复结果
   */
  async saveFixResults(bugId, report, solution) {
    const outputDir = path.join(this.config.outputPath, `BUG-${bugId}`);
    
    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 保存修复报告
    const reportPath = path.join(outputDir, 'fix-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // 保存详细方案
    const solutionPath = path.join(outputDir, 'fix-solution.json');
    fs.writeFileSync(solutionPath, JSON.stringify(solution, null, 2));

    // 生成Markdown格式的修复文档
    const markdownContent = this.generateMarkdownReport(bugId, report, solution);
    const markdownPath = path.join(outputDir, `BUG-${bugId}-修复方案.md`);
    fs.writeFileSync(markdownPath, markdownContent);

    console.log(`修复方案已保存到: ${outputDir}`);
  }

  /**
   * 生成Markdown格式的修复报告
   */
  generateMarkdownReport(bugId, report, solution) {
    return `# BUG-${bugId} 修复方案

## Bug信息
- **ID**: ${bugId}
- **标题**: ${report.title}
- **严重程度**: ${report.severity}
- **分析时间**: ${report.analysisDate}

## 分析结果
- **项目类型**: ${report.classification.projectType}
- **置信度**: ${(report.classification.confidence * 100).toFixed(1)}%
- **分析原因**: 
${report.classification.reasons.map(reason => `  - ${reason}`).join('\n')}

## 修复策略
${report.fixStrategy.map(strategy => `- ${strategy}`).join('\n')}

## 建议措施
${report.recommendations.map(rec => `- ${rec}`).join('\n')}

## 代码修改
${solution.codeChanges.map(change => `
### ${change.description}
- **类型**: ${change.type}
- **类别**: ${change.category}
- **文件**: ${change.files.join(', ')}

${change.changes.map(c => typeof c === 'string' ? c : `
**${c.type}**: ${c.suggestion}
\`\`\`javascript
${c.code}
\`\`\`
`).join('\n')}
`).join('\n')}

## 实施步骤
${solution.implementationSteps.map((step, index) => `${index + 1}. ${step}`).join('\n')}

## 测试计划
${solution.testPlan.map(test => `- ${test}`).join('\n')}

## 工作量评估
- **预计时间**: ${report.estimatedEffort}
- **风险等级**: ${report.riskLevel}

---
*此报告由AI自动生成，请人工review后执行修复*`;
  }
}

module.exports = BugFixer;