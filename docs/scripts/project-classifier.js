/**
 * 项目类型分类器
 * 用于判断bug修复应该在前端还是后端项目中进行
 */

const fs = require('fs');
const path = require('path');

class ProjectClassifier {
  constructor() {
    this.frontendKeywords = [
      // UI相关
      '页面', '界面', '显示', '按钮', '表单', '弹窗', '对话框', '菜单', '导航',
      '布局', '样式', '颜色', '字体', '图标', '图片', '视频', '动画', '过渡',
      
      // 交互相关
      '点击', '双击', '滑动', '拖拽', '输入', '选择', '搜索', '筛选', '排序',
      '分页', '刷新', '加载', '滚动', '缩放', '旋转',
      
      // 前端技术
      'JavaScript', 'TypeScript', 'Vue', 'React', 'Angular', 'HTML', 'CSS',
      'SCSS', 'Less', 'Webpack', 'Vite', 'npm', 'yarn', 'DOM', 'BOM',
      
      // 前端概念
      '组件', '路由', '状态管理', '响应式', '移动端', 'H5', '小程序', 'PWA',
      '浏览器', '兼容性', '性能优化', '用户体验', 'UI', 'UX'
    ];

    this.backendKeywords = [
      // 服务端相关
      '接口', 'API', '服务', '后台', '服务器', '数据库', '缓存', '队列',
      '微服务', '中间件', '网关', '负载均衡', '集群', '分布式',
      
      // 数据相关
      'SQL', '查询', '事务', '索引', '表', '字段', '主键', '外键',
      '数据一致性', '并发', '锁', '死锁', '性能', '优化',
      
      // 后端技术
      'Java', 'Spring', 'MyBatis', 'Redis', 'MySQL', 'MongoDB',
      'Elasticsearch', 'RabbitMQ', 'Kafka', 'Docker', 'Kubernetes',
      
      // 业务逻辑
      '算法', '计算', '处理', '转换', '验证', '校验', '权限', '安全',
      '日志', '监控', '告警', '部署', '发布', '配置'
    ];

    this.ambiguousKeywords = [
      '数据', '请求', '响应', '错误', '异常', '问题', '功能', '模块',
      '系统', '平台', '应用', '用户', '管理', '操作', '流程'
    ];
  }

  /**
   * 分析bug应该在前端还是后端修复
   * @param {Object} bugInfo - bug信息
   * @param {Object} routeInfo - 路由信息
   * @param {Object} apiInfo - API信息
   * @param {string} projectPath - 项目路径
   * @returns {Promise<Object>} 分类结果
   */
  async classifyProject(bugInfo, routeInfo, apiInfo, projectPath) {
    try {
      const analysis = {
        projectType: 'unknown',
        confidence: 0,
        reasons: [],
        recommendations: [],
        relatedFiles: [],
        affectedComponents: []
      };

      // 1. 基于bug描述的关键词分析
      const keywordAnalysis = this.analyzeKeywords(bugInfo);
      
      // 2. 基于涉及的路由分析
      const routeAnalysis = this.analyzeRoutes(bugInfo, routeInfo);
      
      // 3. 基于涉及的API分析
      const apiAnalysis = this.analyzeApis(bugInfo, apiInfo);
      
      // 4. 基于项目结构分析
      const structureAnalysis = await this.analyzeProjectStructure(projectPath);
      
      // 5. 基于错误类型分析
      const errorTypeAnalysis = this.analyzeErrorType(bugInfo);
      
      // 综合分析结果
      const result = this.combineAnalysis(
        keywordAnalysis,
        routeAnalysis,
        apiAnalysis,
        structureAnalysis,
        errorTypeAnalysis
      );

      return result;
    } catch (error) {
      throw new Error(`项目分类分析失败: ${error.message}`);
    }
  }

  /**
   * 关键词分析
   */
  analyzeKeywords(bugInfo) {
    const text = `${bugInfo.title} ${bugInfo.description} ${bugInfo.expectedResult} ${bugInfo.actualResult}`.toLowerCase();
    
    let frontendScore = 0;
    let backendScore = 0;
    let frontendMatches = [];
    let backendMatches = [];

    // 检查前端关键词
    for (const keyword of this.frontendKeywords) {
      if (text.includes(keyword.toLowerCase())) {
        frontendScore += 1;
        frontendMatches.push(keyword);
      }
    }

    // 检查后端关键词
    for (const keyword of this.backendKeywords) {
      if (text.includes(keyword.toLowerCase())) {
        backendScore += 1;
        backendMatches.push(keyword);
      }
    }

    return {
      frontendScore,
      backendScore,
      frontendMatches,
      backendMatches,
      type: frontendScore > backendScore ? 'frontend' : 
            backendScore > frontendScore ? 'backend' : 'ambiguous',
      confidence: Math.abs(frontendScore - backendScore) / Math.max(frontendScore + backendScore, 1)
    };
  }

  /**
   * 路由分析
   */
  analyzeRoutes(bugInfo, routeInfo) {
    if (!routeInfo || !routeInfo.routes) {
      return { type: 'unknown', confidence: 0, relatedRoutes: [] };
    }

    const text = `${bugInfo.title} ${bugInfo.description}`.toLowerCase();
    const relatedRoutes = [];

    // 查找相关的路由
    for (const route of routeInfo.routes) {
      if (route.path && text.includes(route.path.toLowerCase())) {
        relatedRoutes.push(route);
      }
      
      // 检查路由名称
      if (route.name && text.includes(route.name.toLowerCase())) {
        relatedRoutes.push(route);
      }

      // 检查组件名称
      if (route.component && text.includes(route.component.toLowerCase())) {
        relatedRoutes.push(route);
      }
    }

    return {
      type: relatedRoutes.length > 0 ? 'frontend' : 'unknown',
      confidence: relatedRoutes.length > 0 ? 0.8 : 0,
      relatedRoutes: relatedRoutes,
      reasons: relatedRoutes.length > 0 ? 
        [`发现相关前端路由: ${relatedRoutes.map(r => r.path).join(', ')}`] : []
    };
  }

  /**
   * API分析
   */
  analyzeApis(bugInfo, apiInfo) {
    if (!apiInfo || !apiInfo.endpoints) {
      return { type: 'unknown', confidence: 0, relatedApis: [] };
    }

    const text = `${bugInfo.title} ${bugInfo.description}`.toLowerCase();
    const relatedApis = [];

    // 查找相关的API
    for (const api of apiInfo.endpoints) {
      if (api.path && text.includes(api.path.toLowerCase())) {
        relatedApis.push(api);
      }
      
      if (api.title && text.includes(api.title.toLowerCase())) {
        relatedApis.push(api);
      }
    }

    // 分析错误信息是否指向API问题
    const apiErrorPatterns = [
      /接口.*错误/,
      /api.*失败/,
      /服务.*异常/,
      /数据.*获取.*失败/,
      /请求.*超时/,
      /500.*错误/,
      /404.*错误/
    ];

    const hasApiError = apiErrorPatterns.some(pattern => 
      pattern.test(text)
    );

    return {
      type: hasApiError ? 'backend' : relatedApis.length > 0 ? 'both' : 'unknown',
      confidence: hasApiError ? 0.9 : relatedApis.length > 0 ? 0.6 : 0,
      relatedApis: relatedApis,
      hasApiError: hasApiError,
      reasons: hasApiError ? ['检测到API相关错误'] : 
               relatedApis.length > 0 ? [`发现相关API: ${relatedApis.map(a => a.path).join(', ')}`] : []
    };
  }

  /**
   * 项目结构分析
   */
  async analyzeProjectStructure(projectPath) {
    const structure = {
      hasFrontend: false,
      hasBackend: false,
      frontendTech: [],
      backendTech: [],
      confidence: 0
    };

    try {
      // 检查package.json
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        structure.hasFrontend = true;
        
        // 检查前端技术栈
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        
        if (deps.vue || deps['@vue/cli']) structure.frontendTech.push('Vue');
        if (deps.react || deps['react-dom']) structure.frontendTech.push('React');
        if (deps['@angular/core']) structure.frontendTech.push('Angular');
        if (deps.typescript) structure.frontendTech.push('TypeScript');
      }

      // 检查Java项目
      const pomPath = path.join(projectPath, 'pom.xml');
      const gradlePath = path.join(projectPath, 'build.gradle');
      if (fs.existsSync(pomPath) || fs.existsSync(gradlePath)) {
        structure.hasBackend = true;
        structure.backendTech.push('Java');
        
        if (fs.existsSync(pomPath)) {
          const pomContent = fs.readFileSync(pomPath, 'utf8');
          if (pomContent.includes('spring-boot')) structure.backendTech.push('Spring Boot');
          if (pomContent.includes('mybatis')) structure.backendTech.push('MyBatis');
        }
      }

      // 检查Node.js后端
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        
        if (deps.express || deps.koa || deps.fastify) {
          structure.hasBackend = true;
          structure.backendTech.push('Node.js');
        }
      }

      // 检查Python项目
      const requirementsPath = path.join(projectPath, 'requirements.txt');
      const pipfilePath = path.join(projectPath, 'Pipfile');
      if (fs.existsSync(requirementsPath) || fs.existsSync(pipfilePath)) {
        structure.hasBackend = true;
        structure.backendTech.push('Python');
      }

      structure.confidence = (structure.hasFrontend || structure.hasBackend) ? 0.7 : 0;

    } catch (error) {
      console.warn(`项目结构分析失败: ${error.message}`);
    }

    return structure;
  }

  /**
   * 错误类型分析
   */
  analyzeErrorType(bugInfo) {
    const text = `${bugInfo.title} ${bugInfo.description} ${bugInfo.actualResult}`.toLowerCase();
    
    const errorPatterns = {
      frontend: [
        /页面.*加载.*失败/,
        /页面.*显示.*异常/,
        /按钮.*点击.*无效/,
        /样式.*错乱/,
        /布局.*问题/,
        /兼容性.*问题/,
        /console.*error/,
        /javascript.*error/,
        /ui.*问题/
      ],
      backend: [
        /接口.*返回.*错误/,
        /数据库.*错误/,
        /服务.*异常/,
        /500.*错误/,
        /sql.*异常/,
        /连接.*超时/,
        /权限.*验证.*失败/,
        /业务.*逻辑.*错误/,
        /数据.*不一致/
      ]
    };

    let frontendMatches = 0;
    let backendMatches = 0;
    let matchedPatterns = [];

    // 检查前端错误模式
    for (const pattern of errorPatterns.frontend) {
      if (pattern.test(text)) {
        frontendMatches++;
        matchedPatterns.push({ type: 'frontend', pattern: pattern.source });
      }
    }

    // 检查后端错误模式
    for (const pattern of errorPatterns.backend) {
      if (pattern.test(text)) {
        backendMatches++;
        matchedPatterns.push({ type: 'backend', pattern: pattern.source });
      }
    }

    return {
      type: frontendMatches > backendMatches ? 'frontend' :
            backendMatches > frontendMatches ? 'backend' : 'unknown',
      confidence: Math.abs(frontendMatches - backendMatches) / 
                 Math.max(frontendMatches + backendMatches, 1),
      frontendMatches,
      backendMatches,
      matchedPatterns
    };
  }

  /**
   * 综合分析结果
   */
  combineAnalysis(keywordAnalysis, routeAnalysis, apiAnalysis, structureAnalysis, errorTypeAnalysis) {
    const scores = {
      frontend: 0,
      backend: 0
    };

    const reasons = [];
    const recommendations = [];

    // 关键词分析权重: 30%
    if (keywordAnalysis.type === 'frontend') {
      scores.frontend += 0.3 * keywordAnalysis.confidence;
      reasons.push(`关键词分析倾向前端 (匹配: ${keywordAnalysis.frontendMatches.slice(0, 3).join(', ')})`);
    } else if (keywordAnalysis.type === 'backend') {
      scores.backend += 0.3 * keywordAnalysis.confidence;
      reasons.push(`关键词分析倾向后端 (匹配: ${keywordAnalysis.backendMatches.slice(0, 3).join(', ')})`);
    }

    // 路由分析权重: 25%
    if (routeAnalysis.type === 'frontend') {
      scores.frontend += 0.25 * routeAnalysis.confidence;
      reasons.push(...routeAnalysis.reasons);
    }

    // API分析权重: 25%
    if (apiAnalysis.type === 'backend') {
      scores.backend += 0.25 * apiAnalysis.confidence;
      reasons.push(...apiAnalysis.reasons);
    } else if (apiAnalysis.type === 'both') {
      scores.frontend += 0.125 * apiAnalysis.confidence;
      scores.backend += 0.125 * apiAnalysis.confidence;
      reasons.push(...apiAnalysis.reasons);
    }

    // 错误类型分析权重: 20%
    if (errorTypeAnalysis.type === 'frontend') {
      scores.frontend += 0.2 * errorTypeAnalysis.confidence;
      reasons.push('错误类型分析倾向前端问题');
    } else if (errorTypeAnalysis.type === 'backend') {
      scores.backend += 0.2 * errorTypeAnalysis.confidence;
      reasons.push('错误类型分析倾向后端问题');
    }

    // 确定最终结果
    const finalType = scores.frontend > scores.backend ? 'frontend' : 
                     scores.backend > scores.frontend ? 'backend' : 'both';
    
    const confidence = Math.abs(scores.frontend - scores.backend);

    // 生成建议
    if (finalType === 'frontend') {
      recommendations.push('建议优先检查前端代码和组件');
      recommendations.push('检查页面交互逻辑和UI显示');
      if (routeAnalysis.relatedRoutes.length > 0) {
        recommendations.push(`重点关注路由: ${routeAnalysis.relatedRoutes.map(r => r.path).join(', ')}`);
      }
    } else if (finalType === 'backend') {
      recommendations.push('建议优先检查后端API和业务逻辑');
      recommendations.push('检查数据库操作和服务端处理');
      if (apiAnalysis.relatedApis.length > 0) {
        recommendations.push(`重点关注API: ${apiAnalysis.relatedApis.map(a => a.path).join(', ')}`);
      }
    } else {
      recommendations.push('该bug可能涉及前后端联调问题');
      recommendations.push('建议同时检查前端调用和后端响应');
    }

    return {
      projectType: finalType,
      confidence: confidence,
      scores: scores,
      reasons: reasons,
      recommendations: recommendations,
      analysis: {
        keyword: keywordAnalysis,
        route: routeAnalysis,
        api: apiAnalysis,
        structure: structureAnalysis,
        errorType: errorTypeAnalysis
      }
    };
  }
}

module.exports = ProjectClassifier;