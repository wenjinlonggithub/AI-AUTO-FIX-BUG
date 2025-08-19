/**
 * 前端路由分析器
 * 用于读取和分析前端项目的路由配置信息
 */

const fs = require('fs');
const path = require('path');

class RouteAnalyzer {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.routes = [];
    this.routeFiles = [];
  }

  /**
   * 分析项目路由配置
   * @returns {Promise<Object>} 路由分析结果
   */
  async analyzeRoutes() {
    try {
      // 查找路由配置文件
      await this.findRouteFiles();
      
      // 解析路由配置
      await this.parseRouteFiles();
      
      // 构建路由映射
      const routeMap = this.buildRouteMap();
      
      return {
        totalRoutes: this.routes.length,
        routeFiles: this.routeFiles,
        routes: this.routes,
        routeMap: routeMap,
        analysis: this.analyzeRouteStructure()
      };
    } catch (error) {
      throw new Error(`路由分析失败: ${error.message}`);
    }
  }

  /**
   * 查找项目中的路由配置文件
   */
  async findRouteFiles() {
    const possibleRouteFiles = [
      // Vue Router 常见路径
      'src/router/index.js',
      'src/router/index.ts',
      'src/router/routes.js',
      'src/router/routes.ts',
      'src/routes/index.js',
      'src/routes/index.ts',
      
      // React Router 常见路径
      'src/App.js',
      'src/App.tsx',
      'src/routes.js',
      'src/routes.tsx',
      'src/router.js',
      'src/router.tsx',
      
      // Angular Router
      'src/app/app-routing.module.ts',
      'src/app/app.module.ts',
      
      // Next.js
      'pages/_app.js',
      'pages/_app.tsx',
      
      // 其他可能的路由文件
      'config/routes.js',
      'config/router.js'
    ];

    for (const filePath of possibleRouteFiles) {
      const fullPath = path.join(this.projectPath, filePath);
      if (fs.existsSync(fullPath)) {
        this.routeFiles.push(fullPath);
      }
    }

    // 递归查找包含路由定义的文件
    await this.findRouteFilesRecursively(path.join(this.projectPath, 'src'));
  }

  /**
   * 递归查找路由文件
   */
  async findRouteFilesRecursively(dir) {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // 跳过node_modules等目录
        if (!['node_modules', '.git', 'dist', 'build'].includes(file)) {
          await this.findRouteFilesRecursively(filePath);
        }
      } else if (this.isRouteFile(filePath)) {
        if (!this.routeFiles.includes(filePath)) {
          this.routeFiles.push(filePath);
        }
      }
    }
  }

  /**
   * 判断是否为路由配置文件
   */
  isRouteFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 检查是否包含路由相关关键词
    const routeKeywords = [
      'createRouter',
      'Router',
      'Route',
      'useRoutes',
      'Routes',
      'BrowserRouter',
      'HashRouter',
      'MemoryRouter',
      'RouterModule',
      'path:',
      'component:',
      'redirect:'
    ];

    return routeKeywords.some(keyword => content.includes(keyword));
  }

  /**
   * 解析路由配置文件
   */
  async parseRouteFiles() {
    for (const filePath of this.routeFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const routes = this.parseRouteContent(content, filePath);
        this.routes.push(...routes);
      } catch (error) {
        console.warn(`解析路由文件失败 ${filePath}: ${error.message}`);
      }
    }
  }

  /**
   * 解析路由文件内容
   */
  parseRouteContent(content, filePath) {
    const routes = [];
    
    // 检测框架类型
    const framework = this.detectFramework(content);
    
    switch (framework) {
      case 'vue':
        return this.parseVueRoutes(content, filePath);
      case 'react':
        return this.parseReactRoutes(content, filePath);
      case 'angular':
        return this.parseAngularRoutes(content, filePath);
      default:
        return this.parseGenericRoutes(content, filePath);
    }
  }

  /**
   * 检测前端框架类型
   */
  detectFramework(content) {
    if (content.includes('createRouter') || content.includes('Vue')) {
      return 'vue';
    } else if (content.includes('React') || content.includes('Routes') || content.includes('BrowserRouter')) {
      return 'react';
    } else if (content.includes('RouterModule') || content.includes('@angular')) {
      return 'angular';
    }
    return 'generic';
  }

  /**
   * 解析Vue路由
   */
  parseVueRoutes(content, filePath) {
    const routes = [];
    
    // 匹配路由对象定义
    const routePattern = /{[^}]*path:\s*['"`]([^'"`]+)['"`][^}]*}/g;
    let match;
    
    while ((match = routePattern.exec(content)) !== null) {
      const routeObj = match[0];
      const path = match[1];
      
      // 提取组件信息
      const componentMatch = routeObj.match(/component:\s*([^,}]+)/);
      const nameMatch = routeObj.match(/name:\s*['"`]([^'"`]+)['"`]/);
      const metaMatch = routeObj.match(/meta:\s*{([^}]*)}/);
      
      routes.push({
        path: path,
        component: componentMatch ? componentMatch[1].trim() : null,
        name: nameMatch ? nameMatch[1] : null,
        meta: metaMatch ? this.parseMeta(metaMatch[1]) : {},
        framework: 'vue',
        file: filePath,
        raw: routeObj
      });
    }
    
    return routes;
  }

  /**
   * 解析React路由
   */
  parseReactRoutes(content, filePath) {
    const routes = [];
    
    // 匹配<Route>组件
    const routePattern = /<Route[^>]*path=['"`]([^'"`]+)['"`][^>]*>/g;
    let match;
    
    while ((match = routePattern.exec(content)) !== null) {
      const routeTag = match[0];
      const path = match[1];
      
      // 提取组件信息
      const componentMatch = routeTag.match(/(?:component|element)={([^}]+)}/);
      
      routes.push({
        path: path,
        component: componentMatch ? componentMatch[1] : null,
        framework: 'react',
        file: filePath,
        raw: routeTag
      });
    }
    
    return routes;
  }

  /**
   * 解析Angular路由
   */
  parseAngularRoutes(content, filePath) {
    const routes = [];
    
    // 匹配路由配置对象
    const routePattern = /{[^}]*path:\s*['"`]([^'"`]+)['"`][^}]*}/g;
    let match;
    
    while ((match = routePattern.exec(content)) !== null) {
      const routeObj = match[0];
      const path = match[1];
      
      const componentMatch = routeObj.match(/component:\s*([^,}]+)/);
      const loadChildrenMatch = routeObj.match(/loadChildren:\s*([^,}]+)/);
      
      routes.push({
        path: path,
        component: componentMatch ? componentMatch[1].trim() : null,
        loadChildren: loadChildrenMatch ? loadChildrenMatch[1].trim() : null,
        framework: 'angular',
        file: filePath,
        raw: routeObj
      });
    }
    
    return routes;
  }

  /**
   * 通用路由解析
   */
  parseGenericRoutes(content, filePath) {
    const routes = [];
    
    // 简单的路径匹配
    const pathPatterns = [
      /['"`]\/[^'"`\s]*['"`]/g,  // 匹配路径字符串
      /path:\s*['"`]([^'"`]+)['"`]/g  // 匹配path属性
    ];
    
    for (const pattern of pathPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const path = match[1] || match[0].replace(/['"`]/g, '');
        if (path.startsWith('/') && !routes.find(r => r.path === path)) {
          routes.push({
            path: path,
            framework: 'generic',
            file: filePath
          });
        }
      }
    }
    
    return routes;
  }

  /**
   * 解析meta信息
   */
  parseMeta(metaString) {
    const meta = {};
    
    // 简单解析meta对象
    const keyValuePattern = /(\w+):\s*(['"`]?)([^,}]+)\2/g;
    let match;
    
    while ((match = keyValuePattern.exec(metaString)) !== null) {
      meta[match[1]] = match[3];
    }
    
    return meta;
  }

  /**
   * 构建路由映射表
   */
  buildRouteMap() {
    const routeMap = new Map();
    
    for (const route of this.routes) {
      routeMap.set(route.path, route);
    }
    
    return Object.fromEntries(routeMap);
  }

  /**
   * 分析路由结构
   */
  analyzeRouteStructure() {
    const analysis = {
      frameworks: new Set(),
      totalPaths: this.routes.length,
      dynamicRoutes: 0,
      nestedRoutes: 0,
      components: new Set(),
      pathDepths: []
    };

    for (const route of this.routes) {
      analysis.frameworks.add(route.framework);
      
      if (route.component) {
        analysis.components.add(route.component);
      }
      
      // 检查动态路由
      if (route.path.includes(':') || route.path.includes('*')) {
        analysis.dynamicRoutes++;
      }
      
      // 检查嵌套路由
      const depth = route.path.split('/').length - 1;
      analysis.pathDepths.push(depth);
      if (depth > 2) {
        analysis.nestedRoutes++;
      }
    }

    analysis.frameworks = Array.from(analysis.frameworks);
    analysis.components = Array.from(analysis.components);
    analysis.averageDepth = analysis.pathDepths.reduce((a, b) => a + b, 0) / analysis.pathDepths.length || 0;
    
    return analysis;
  }

  /**
   * 根据URL路径查找对应的路由配置
   */
  findRouteByPath(urlPath) {
    // 精确匹配
    const exactMatch = this.routes.find(route => route.path === urlPath);
    if (exactMatch) return exactMatch;
    
    // 动态路由匹配
    for (const route of this.routes) {
      if (this.matchDynamicRoute(route.path, urlPath)) {
        return route;
      }
    }
    
    return null;
  }

  /**
   * 匹配动态路由
   */
  matchDynamicRoute(routePath, urlPath) {
    const routeParts = routePath.split('/');
    const urlParts = urlPath.split('/');
    
    if (routeParts.length !== urlParts.length) {
      return false;
    }
    
    for (let i = 0; i < routeParts.length; i++) {
      const routePart = routeParts[i];
      const urlPart = urlParts[i];
      
      // 动态参数匹配
      if (routePart.startsWith(':')) {
        continue;
      }
      
      // 通配符匹配
      if (routePart === '*') {
        return true;
      }
      
      // 精确匹配
      if (routePart !== urlPart) {
        return false;
      }
    }
    
    return true;
  }
}

module.exports = RouteAnalyzer;