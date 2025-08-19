/**
 * API接口信息分析器
 * 用于读取和分析项目中的API接口文档和代码
 */

const fs = require('fs');
const path = require('path');

class ApiAnalyzer {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.apiDocs = [];
    this.apiEndpoints = [];
    this.serviceFiles = [];
  }

  /**
   * 分析项目API信息
   * @returns {Promise<Object>} API分析结果
   */
  async analyzeApis() {
    try {
      // 查找API文档文件
      await this.findApiDocuments();
      
      // 查找API服务文件
      await this.findServiceFiles();
      
      // 解析API文档
      await this.parseApiDocuments();
      
      // 解析服务代码
      await this.parseServiceFiles();
      
      return {
        totalEndpoints: this.apiEndpoints.length,
        documentFiles: this.apiDocs.length,
        serviceFiles: this.serviceFiles.length,
        endpoints: this.apiEndpoints,
        groupedApis: this.groupApisByModule(),
        analysis: this.analyzeApiStructure()
      };
    } catch (error) {
      throw new Error(`API分析失败: ${error.message}`);
    }
  }

  /**
   * 查找API文档文件
   */
  async findApiDocuments() {
    const docPatterns = [
      '接口文档.md',
      'API文档.md',
      'api.md',
      'interfaces.md',
      '接口设计文档.md'
    ];

    await this.findFilesRecursively(this.projectPath, (filePath) => {
      const fileName = path.basename(filePath);
      return docPatterns.some(pattern => 
        fileName.toLowerCase().includes(pattern.toLowerCase())
      );
    }, this.apiDocs);
  }

  /**
   * 查找API服务文件
   */
  async findServiceFiles() {
    const servicePatterns = [
      /service\.(js|ts)$/i,
      /api\.(js|ts)$/i,
      /request\.(js|ts)$/i,
      /http\.(js|ts)$/i,
      /controller\.(js|ts|java)$/i
    ];

    await this.findFilesRecursively(this.projectPath, (filePath) => {
      return servicePatterns.some(pattern => pattern.test(filePath));
    }, this.serviceFiles);
  }

  /**
   * 递归查找文件
   */
  async findFilesRecursively(dir, matcher, resultArray) {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // 跳过node_modules等目录
        if (!['node_modules', '.git', 'dist', 'build', 'target'].includes(file)) {
          await this.findFilesRecursively(filePath, matcher, resultArray);
        }
      } else if (matcher(filePath)) {
        resultArray.push(filePath);
      }
    }
  }

  /**
   * 解析API文档
   */
  async parseApiDocuments() {
    for (const docPath of this.apiDocs) {
      try {
        const content = fs.readFileSync(docPath, 'utf8');
        const apis = this.parseMarkdownApiDoc(content, docPath);
        this.apiEndpoints.push(...apis);
      } catch (error) {
        console.warn(`解析API文档失败 ${docPath}: ${error.message}`);
      }
    }
  }

  /**
   * 解析Markdown格式的API文档
   */
  parseMarkdownApiDoc(content, filePath) {
    const apis = [];
    const lines = content.split('\n');
    let currentApi = null;
    let currentSection = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 检测API接口标题
      if (this.isApiHeader(line)) {
        if (currentApi) {
          apis.push(currentApi);
        }
        currentApi = this.parseApiHeader(line);
        currentApi.sourceFile = filePath;
        currentApi.lineNumber = i + 1;
        continue;
      }

      if (!currentApi) continue;

      // 解析各个部分
      const sectionMatch = line.match(/^#{2,4}\s*(.+)/);
      if (sectionMatch) {
        currentSection = sectionMatch[1].toLowerCase();
        continue;
      }

      // 根据section类型解析内容
      this.parseApiSection(currentApi, currentSection, line);
    }

    if (currentApi) {
      apis.push(currentApi);
    }

    return apis;
  }

  /**
   * 判断是否为API接口标题
   */
  isApiHeader(line) {
    const apiPatterns = [
      /^#{1,3}\s*.*(?:POST|GET|PUT|DELETE|PATCH)\s+/i,
      /^#{1,3}\s*.*\/api\//i,
      /^#{1,3}\s*.*接口/i,
      /^#{1,3}\s*.*API/i
    ];

    return apiPatterns.some(pattern => pattern.test(line));
  }

  /**
   * 解析API标题
   */
  parseApiHeader(headerLine) {
    const api = {
      title: '',
      method: '',
      path: '',
      description: '',
      parameters: [],
      responses: [],
      requestBody: null,
      headers: []
    };

    // 提取标题
    const titleMatch = headerLine.match(/^#{1,3}\s*(.+)/);
    if (titleMatch) {
      api.title = titleMatch[1].trim();
    }

    // 提取HTTP方法
    const methodMatch = headerLine.match(/(POST|GET|PUT|DELETE|PATCH)/i);
    if (methodMatch) {
      api.method = methodMatch[1].toUpperCase();
    }

    // 提取路径
    const pathMatch = headerLine.match(/(?:POST|GET|PUT|DELETE|PATCH)\s+(\/[^\s]*)/i);
    if (pathMatch) {
      api.path = pathMatch[1];
    } else {
      // 尝试其他路径匹配
      const altPathMatch = headerLine.match(/(\/[^\s\)]*)/);
      if (altPathMatch) {
        api.path = altPathMatch[1];
      }
    }

    return api;
  }

  /**
   * 解析API文档的各个部分
   */
  parseApiSection(api, section, line) {
    if (!line) return;

    switch (section) {
      case '请求参数':
      case '参数':
      case 'parameters':
        this.parseParameter(api, line);
        break;
      case '请求体':
      case '请求数据':
      case 'request body':
        this.parseRequestBody(api, line);
        break;
      case '响应':
      case '返回':
      case 'response':
        this.parseResponse(api, line);
        break;
      case '请求头':
      case 'headers':
        this.parseHeader(api, line);
        break;
      case '描述':
      case 'description':
        if (!api.description) {
          api.description = line;
        }
        break;
    }
  }

  /**
   * 解析参数
   */
  parseParameter(api, line) {
    // 匹配表格格式参数
    const tableMatch = line.match(/\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]*)\s*\|/);
    if (tableMatch) {
      api.parameters.push({
        name: tableMatch[1].trim(),
        type: tableMatch[2].trim(),
        required: tableMatch[3].trim().toLowerCase().includes('是'),
        description: tableMatch[4].trim()
      });
      return;
    }

    // 匹配其他格式
    const paramMatch = line.match(/[-*]\s*(\w+)\s*[:：]\s*(.+)/);
    if (paramMatch) {
      api.parameters.push({
        name: paramMatch[1],
        description: paramMatch[2]
      });
    }
  }

  /**
   * 解析请求体
   */
  parseRequestBody(api, line) {
    if (line.startsWith('```')) {
      // JSON代码块开始或结束
      return;
    }
    
    if (line.startsWith('{') || api.requestBody) {
      if (!api.requestBody) {
        api.requestBody = '';
      }
      api.requestBody += line + '\n';
    }
  }

  /**
   * 解析响应
   */
  parseResponse(api, line) {
    if (line.includes('200') || line.includes('成功')) {
      api.responses.push({
        status: 200,
        description: line
      });
    } else if (line.includes('400') || line.includes('失败')) {
      api.responses.push({
        status: 400,
        description: line
      });
    }
  }

  /**
   * 解析请求头
   */
  parseHeader(api, line) {
    const headerMatch = line.match(/[-*]\s*(\w+):\s*(.+)/);
    if (headerMatch) {
      api.headers.push({
        name: headerMatch[1],
        value: headerMatch[2]
      });
    }
  }

  /**
   * 解析服务文件
   */
  async parseServiceFiles() {
    for (const servicePath of this.serviceFiles) {
      try {
        const content = fs.readFileSync(servicePath, 'utf8');
        const apis = this.parseServiceCode(content, servicePath);
        this.apiEndpoints.push(...apis);
      } catch (error) {
        console.warn(`解析服务文件失败 ${servicePath}: ${error.message}`);
      }
    }
  }

  /**
   * 解析服务代码
   */
  parseServiceCode(content, filePath) {
    const apis = [];
    
    // JavaScript/TypeScript API调用模式
    const jsPatterns = [
      // axios.post('/api/xxx', data)
      /(?:axios|request|http)\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
      // fetch('/api/xxx', {method: 'POST'})
      /fetch\s*\(\s*['"`]([^'"`]+)['"`][^}]*method:\s*['"`](\w+)['"`]/g,
      // @PostMapping("/api/xxx") (Spring Boot)
      /@(Get|Post|Put|Delete|Patch)Mapping\s*\(\s*['"`]([^'"`]+)['"`]/g
    ];

    for (const pattern of jsPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        apis.push({
          method: (match[1] || match[2]).toUpperCase(),
          path: match[2] || match[1],
          sourceFile: filePath,
          type: 'code',
          title: `${match[1] || match[2]} ${match[2] || match[1]}`
        });
      }
    }

    return apis;
  }

  /**
   * 按模块分组API
   */
  groupApisByModule() {
    const grouped = {};
    
    for (const api of this.apiEndpoints) {
      // 从路径或文件路径提取模块名
      const module = this.extractModuleName(api);
      
      if (!grouped[module]) {
        grouped[module] = [];
      }
      
      grouped[module].push(api);
    }
    
    return grouped;
  }

  /**
   * 提取模块名称
   */
  extractModuleName(api) {
    // 从API路径提取模块
    if (api.path) {
      const pathParts = api.path.split('/').filter(part => part);
      if (pathParts.length > 1) {
        return pathParts[1]; // 通常第二部分是模块名
      }
    }
    
    // 从文件路径提取模块
    if (api.sourceFile) {
      const pathParts = api.sourceFile.split(path.sep);
      for (let i = pathParts.length - 1; i >= 0; i--) {
        const part = pathParts[i];
        if (!part.includes('.') && part !== 'src') {
          return part;
        }
      }
    }
    
    return 'default';
  }

  /**
   * 分析API结构
   */
  analyzeApiStructure() {
    const analysis = {
      totalEndpoints: this.apiEndpoints.length,
      methodDistribution: {},
      moduleCount: 0,
      documentedApis: 0,
      codeApis: 0,
      pathPatterns: []
    };

    const modules = new Set();
    
    for (const api of this.apiEndpoints) {
      // 统计HTTP方法分布
      if (api.method) {
        analysis.methodDistribution[api.method] = 
          (analysis.methodDistribution[api.method] || 0) + 1;
      }
      
      // 统计模块
      const module = this.extractModuleName(api);
      modules.add(module);
      
      // 统计API来源
      if (api.type === 'code') {
        analysis.codeApis++;
      } else {
        analysis.documentedApis++;
      }
      
      // 收集路径模式
      if (api.path) {
        analysis.pathPatterns.push(api.path);
      }
    }
    
    analysis.moduleCount = modules.size;
    
    return analysis;
  }

  /**
   * 根据路径查找API
   */
  findApiByPath(path) {
    return this.apiEndpoints.filter(api => 
      api.path && (api.path === path || api.path.includes(path))
    );
  }

  /**
   * 根据模块查找API
   */
  findApiByModule(moduleName) {
    return this.apiEndpoints.filter(api => 
      this.extractModuleName(api) === moduleName
    );
  }
}

module.exports = ApiAnalyzer;