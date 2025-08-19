/**
 * 禅道Bug信息读取器
 * 用于从禅道系统获取bug详细信息
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class ZentaoReader {
  constructor(config) {
    this.baseUrl = config.baseUrl || process.env.ZENTAO_BASE_URL;
    this.token = config.token || process.env.ZENTAO_TOKEN;
    this.username = config.username || process.env.ZENTAO_USERNAME;
    this.password = config.password || process.env.ZENTAO_PASSWORD;
    
    if (!this.baseUrl) {
      throw new Error('禅道系统地址未配置');
    }
  }

  /**
   * 获取Bug详细信息
   * @param {string|number} bugId - Bug ID
   * @returns {Promise<Object>} Bug详情对象
   */
  async getBugInfo(bugId) {
    try {
      // 先尝试登录获取session
      await this.login();
      
      // 获取bug详情
      const response = await axios.get(`${this.baseUrl}/bug-view-${bugId}.json`, {
        headers: this.getHeaders(),
        timeout: 10000
      });

      const bugData = response.data;
      
      if (!bugData || bugData.status === 'fail') {
        throw new Error(`获取Bug ${bugId} 信息失败: ${bugData?.message || '未知错误'}`);
      }

      return this.parseBugData(bugData);
    } catch (error) {
      console.error(`读取禅道Bug ${bugId} 失败:`, error.message);
      
      // 如果API调用失败，尝试从本地文件读取
      return await this.readBugFromLocal(bugId);
    }
  }

  /**
   * 登录禅道系统
   */
  async login() {
    if (this.token) {
      // 使用Token方式
      return;
    }

    if (!this.username || !this.password) {
      throw new Error('禅道用户名或密码未配置');
    }

    try {
      const response = await axios.post(`${this.baseUrl}/user-login.json`, {
        account: this.username,
        password: this.password
      });

      if (response.data.status === 'success') {
        this.sessionId = response.data.sessionID;
      } else {
        throw new Error('登录失败');
      }
    } catch (error) {
      throw new Error(`禅道登录失败: ${error.message}`);
    }
  }

  /**
   * 获取请求头
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'AI4SE-BugFixer/1.0'
    };

    if (this.token) {
      headers['Token'] = this.token;
    } else if (this.sessionId) {
      headers['Cookie'] = `zentaosid=${this.sessionId}`;
    }

    return headers;
  }

  /**
   * 解析Bug数据
   */
  parseBugData(rawData) {
    const bug = rawData.bug || rawData;
    
    return {
      id: bug.id,
      title: bug.title || '',
      description: bug.steps || bug.description || '',
      severity: this.mapSeverity(bug.severity),
      priority: this.mapPriority(bug.pri),
      status: bug.status || 'active',
      assignedTo: bug.assignedTo || '',
      openedBy: bug.openedBy || '',
      openedDate: bug.openedDate || '',
      module: bug.module || '',
      project: bug.product || bug.project || '',
      expectedResult: bug.expect || '',
      actualResult: bug.reality || '',
      type: bug.type || 'codeerror',
      os: bug.os || '',
      browser: bug.browser || '',
      keywords: bug.keywords || '',
      reproductionSteps: this.parseSteps(bug.steps),
      files: bug.files || [],
      historyComments: bug.comments || []
    };
  }

  /**
   * 映射严重程度
   */
  mapSeverity(severity) {
    const severityMap = {
      '1': 'P1-致命',
      '2': 'P2-严重', 
      '3': 'P3-一般',
      '4': 'P4-轻微'
    };
    return severityMap[severity] || severity;
  }

  /**
   * 映射优先级
   */
  mapPriority(priority) {
    const priorityMap = {
      '1': '高',
      '2': '中',
      '3': '低',
      '4': '最低'
    };
    return priorityMap[priority] || priority;
  }

  /**
   * 解析复现步骤
   */
  parseSteps(stepsText) {
    if (!stepsText) return [];
    
    // 按行分割并清理空行
    const lines = stepsText.split('\n').filter(line => line.trim());
    const steps = [];
    
    lines.forEach(line => {
      // 识别步骤标记（数字、序号等）
      const stepMatch = line.match(/^(\d+[.\)、]|\*|\-)\s*(.+)/);
      if (stepMatch) {
        steps.push(stepMatch[2].trim());
      } else if (line.trim()) {
        steps.push(line.trim());
      }
    });
    
    return steps;
  }

  /**
   * 从本地文件读取Bug信息（兜底方案）
   */
  async readBugFromLocal(bugId) {
    try {
      // 在项目中查找对应的bug文档
      const bugFiles = [
        `prompts/bugs/**/BUG-${bugId}/*.md`,
        `prompts/bugs/**/bug-${bugId}/*.md`,
        `docs/**/BUG-${bugId}*.md`
      ];

      for (const pattern of bugFiles) {
        const files = await this.globFiles(pattern);
        if (files.length > 0) {
          return await this.parseBugFromFile(files[0], bugId);
        }
      }

      throw new Error(`本地未找到Bug ${bugId} 的相关文档`);
    } catch (error) {
      throw new Error(`读取本地Bug文档失败: ${error.message}`);
    }
  }

  /**
   * 从markdown文件解析bug信息
   */
  async parseBugFromFile(filePath, bugId) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 简单的markdown解析
    const sections = this.parseMarkdownSections(content);
    
    return {
      id: bugId,
      title: sections['标题'] || sections['问题'] || path.basename(filePath, '.md'),
      description: sections['问题描述'] || sections['描述'] || sections['bug描述'] || '',
      expectedResult: sections['期望结果'] || sections['预期结果'] || '',
      actualResult: sections['实际结果'] || sections['现象'] || '',
      reproductionSteps: this.parseStepsFromText(sections['复现步骤'] || sections['重现步骤'] || ''),
      severity: this.extractSeverity(content),
      module: sections['模块'] || sections['涉及模块'] || '',
      project: this.extractProjectFromPath(filePath),
      source: 'local',
      filePath: filePath
    };
  }

  /**
   * 解析Markdown章节
   */
  parseMarkdownSections(content) {
    const sections = {};
    const lines = content.split('\n');
    let currentSection = '';
    let currentContent = [];

    for (const line of lines) {
      const headerMatch = line.match(/^#{1,6}\s*(.+)/);
      if (headerMatch) {
        if (currentSection) {
          sections[currentSection] = currentContent.join('\n').trim();
        }
        currentSection = headerMatch[1].trim();
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }

    if (currentSection) {
      sections[currentSection] = currentContent.join('\n').trim();
    }

    return sections;
  }

  /**
   * 从文本提取复现步骤
   */
  parseStepsFromText(text) {
    return text.split('\n')
      .filter(line => line.trim())
      .map(line => line.replace(/^\d+[.\)、]\s*/, '').trim())
      .filter(step => step);
  }

  /**
   * 从内容提取严重程度
   */
  extractSeverity(content) {
    const severityPatterns = [
      /严重程度[：:]\s*(P[1-4]|[1-4])/i,
      /优先级[：:]\s*(高|中|低|P[1-4])/i,
      /priority[：:]\s*(high|medium|low|P[1-4])/i
    ];

    for (const pattern of severityPatterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return 'P3'; // 默认为一般级别
  }

  /**
   * 从文件路径提取项目名称
   */
  extractProjectFromPath(filePath) {
    const pathParts = filePath.split(path.sep);
    
    // 尝试从路径中识别项目名称
    const projectPatterns = ['京城皮肤', '易赋诊', '正生医生', '恒瑞'];
    
    for (const part of pathParts) {
      for (const pattern of projectPatterns) {
        if (part.includes(pattern)) {
          return pattern;
        }
      }
    }
    
    return pathParts[pathParts.length - 3] || 'unknown';
  }

  /**
   * 简单的glob文件查找（替代glob包）
   */
  async globFiles(pattern) {
    // 这里可以实现简单的文件查找逻辑
    // 或者使用现有的glob库
    return [];
  }
}

module.exports = ZentaoReader;