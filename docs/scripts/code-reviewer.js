/**
 * 代码审阅器
 * 用于生成修复代码并提供审阅流程
 */

const fs = require('fs');
const path = require('path');

class CodeReviewer {
  constructor(config = {}) {
    this.config = {
      templatePath: config.templatePath || './templates',
      outputPath: config.outputPath || './code-reviews',
      ...config
    };
  }

  /**
   * 生成修复代码并创建审阅文档
   * @param {Object} bugInfo - Bug信息
   * @param {Object} fixSolution - 修复方案
   * @param {Object} classification - 项目分类结果
   * @returns {Promise<Object>} 代码审阅结果
   */
  async generateCodeReview(bugInfo, fixSolution, classification) {
    try {
      const review = {
        bugId: bugInfo.id,
        generatedCode: {},
        reviewChecklist: [],
        testingSuggestions: [],
        riskAssessment: {},
        deploymentPlan: {},
        dataAssets: {}
      };

      // 1. 生成具体的修复代码
      review.generatedCode = await this.generateFixCode(bugInfo, fixSolution, classification);

      // 2. 创建代码审阅检查清单
      review.reviewChecklist = this.createReviewChecklist(classification.projectType, bugInfo);

      // 3. 生成测试建议
      review.testingSuggestions = this.generateTestingSuggestions(bugInfo, fixSolution);

      // 4. 风险评估
      review.riskAssessment = this.assessCodeRisks(bugInfo, fixSolution, review.generatedCode);

      // 5. 部署计划
      review.deploymentPlan = this.createDeploymentPlan(bugInfo, classification);

      // 6. 生成数据资产描述
      review.dataAssets = this.generateDataAssets(bugInfo, fixSolution, review.generatedCode);

      // 7. 保存审阅结果
      await this.saveReviewResults(review);

      return review;
    } catch (error) {
      throw new Error(`代码审阅生成失败: ${error.message}`);
    }
  }

  /**
   * 生成具体的修复代码
   */
  async generateFixCode(bugInfo, fixSolution, classification) {
    const generatedCode = {};

    for (const change of fixSolution.codeChanges) {
      switch (change.type) {
        case 'frontend':
          generatedCode.frontend = await this.generateFrontendCode(bugInfo, change);
          break;
        case 'backend':
          generatedCode.backend = await this.generateBackendCode(bugInfo, change);
          break;
        case 'both':
          generatedCode.frontend = await this.generateFrontendCode(bugInfo, change);
          generatedCode.backend = await this.generateBackendCode(bugInfo, change);
          break;
      }
    }

    return generatedCode;
  }

  /**
   * 生成前端修复代码
   */
  async generateFrontendCode(bugInfo, change) {
    const code = {
      components: [],
      routes: [],
      services: [],
      utils: []
    };

    // 基于bug类型生成对应的修复代码
    const description = bugInfo.description.toLowerCase();

    if (description.includes('点击') && description.includes('无效')) {
      code.components.push({
        filename: 'FixedComponent.vue',
        content: this.generateVueComponentFix(bugInfo),
        description: '修复点击事件无效问题'
      });
    }

    if (description.includes('页面') && description.includes('显示')) {
      code.components.push({
        filename: 'PageComponent.vue',
        content: this.generatePageDisplayFix(bugInfo),
        description: '修复页面显示问题'
      });
    }

    if (description.includes('数据') && description.includes('加载')) {
      code.services.push({
        filename: 'api-service.js',
        content: this.generateApiServiceFix(bugInfo),
        description: '修复数据加载问题'
      });
    }

    if (description.includes('路由') || description.includes('跳转')) {
      code.routes.push({
        filename: 'router-fix.js',
        content: this.generateRouterFix(bugInfo),
        description: '修复路由跳转问题'
      });
    }

    return code;
  }

  /**
   * 生成后端修复代码
   */
  async generateBackendCode(bugInfo, change) {
    const code = {
      controllers: [],
      services: [],
      repositories: [],
      entities: [],
      configurations: []
    };

    const description = bugInfo.description.toLowerCase();

    if (description.includes('接口') || description.includes('api')) {
      code.controllers.push({
        filename: 'FixedController.java',
        content: this.generateControllerFix(bugInfo),
        description: '修复API接口问题'
      });
    }

    if (description.includes('业务') || description.includes('逻辑')) {
      code.services.push({
        filename: 'FixedService.java',
        content: this.generateServiceFix(bugInfo),
        description: '修复业务逻辑问题'
      });
    }

    if (description.includes('数据库') || description.includes('查询')) {
      code.repositories.push({
        filename: 'FixedRepository.java',
        content: this.generateRepositoryFix(bugInfo),
        description: '修复数据库查询问题'
      });
    }

    return code;
  }

  /**
   * 生成Vue组件修复代码
   */
  generateVueComponentFix(bugInfo) {
    return `<template>
  <div class="fixed-component">
    <!-- 修复前的问题: ${bugInfo.title} -->
    <button 
      @click="handleClick" 
      :disabled="isLoading"
      class="fixed-button"
    >
      {{ buttonText }}
    </button>
    
    <!-- 添加加载状态提示 -->
    <div v-if="isLoading" class="loading-indicator">
      处理中...
    </div>
    
    <!-- 添加错误提示 -->
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script>
export default {
  name: 'FixedComponent',
  data() {
    return {
      isLoading: false,
      errorMessage: '',
      buttonText: '点击按钮'
    }
  },
  methods: {
    async handleClick() {
      // 防止重复点击
      if (this.isLoading) {
        return;
      }
      
      this.isLoading = true;
      this.errorMessage = '';
      
      try {
        // 添加调试日志
        console.log('按钮点击事件触发');
        
        // 执行实际的业务逻辑
        await this.performAction();
        
        // 成功提示
        this.$message.success('操作成功');
        
      } catch (error) {
        console.error('操作失败:', error);
        this.errorMessage = error.message || '操作失败，请重试';
        this.$message.error(this.errorMessage);
      } finally {
        this.isLoading = false;
      }
    },
    
    async performAction() {
      // 具体的业务逻辑实现
      // 根据实际需求替换这里的代码
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          // 模拟API调用
          resolve('操作完成');
        }, 1000);
      });
    }
  }
}
</script>

<style scoped>
.fixed-component {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fixed-button {
  padding: 8px 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #007bff;
  color: white;
  cursor: pointer;
  transition: background-color 0.3s;
}

.fixed-button:hover:not(:disabled) {
  background-color: #0056b3;
}

.fixed-button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.loading-indicator {
  color: #007bff;
  font-size: 14px;
}

.error-message {
  color: #dc3545;
  font-size: 14px;
  padding: 8px;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
}
</style>`;
  }

  /**
   * 生成页面显示修复代码
   */
  generatePageDisplayFix(bugInfo) {
    return `<template>
  <div class="page-container">
    <!-- 页面加载状态 -->
    <div v-if="pageLoading" class="page-loading">
      <div class="spinner"></div>
      <p>页面加载中...</p>
    </div>
    
    <!-- 页面内容 -->
    <div v-else-if="pageData" class="page-content">
      <h1>{{ pageData.title }}</h1>
      
      <!-- 数据展示区域 -->
      <div class="data-section">
        <template v-if="pageData.items && pageData.items.length > 0">
          <div 
            v-for="item in pageData.items" 
            :key="item.id"
            class="data-item"
          >
            <h3>{{ item.title }}</h3>
            <p>{{ item.description }}</p>
          </div>
        </template>
        <div v-else class="empty-state">
          <p>暂无数据</p>
        </div>
      </div>
    </div>
    
    <!-- 错误状态 -->
    <div v-else class="error-state">
      <h2>页面加载失败</h2>
      <p>{{ errorMessage }}</p>
      <button @click="reloadPage" class="retry-button">
        重新加载
      </button>
    </div>
  </div>
</template>

<script>
import apiService from '@/services/api-service'

export default {
  name: 'FixedPage',
  data() {
    return {
      pageLoading: false,
      pageData: null,
      errorMessage: ''
    }
  },
  
  async created() {
    await this.loadPageData();
  },
  
  methods: {
    async loadPageData() {
      this.pageLoading = true;
      this.errorMessage = '';
      
      try {
        // 获取页面数据
        const response = await apiService.getPageData(this.$route.params.id);
        
        // 数据验证
        if (response && response.data) {
          this.pageData = response.data;
        } else {
          throw new Error('数据格式错误');
        }
        
      } catch (error) {
        console.error('页面数据加载失败:', error);
        this.errorMessage = error.message || '页面加载失败';
        this.pageData = null;
      } finally {
        this.pageLoading = false;
      }
    },
    
    async reloadPage() {
      await this.loadPageData();
    }
  }
}
</script>

<style scoped>
.page-container {
  min-height: 400px;
  padding: 20px;
}

.page-loading {
  text-align: center;
  padding: 50px;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.page-content {
  max-width: 800px;
  margin: 0 auto;
}

.data-section {
  margin-top: 30px;
}

.data-item {
  padding: 15px;
  margin-bottom: 15px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #fff;
}

.empty-state {
  text-align: center;
  padding: 50px;
  color: #666;
}

.error-state {
  text-align: center;
  padding: 50px;
}

.retry-button {
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 15px;
}

.retry-button:hover {
  background-color: #0056b3;
}
</style>`;
  }

  /**
   * 生成API服务修复代码
   */
  generateApiServiceFix(bugInfo) {
    return `/**
 * API服务修复 - ${bugInfo.title}
 * 修复数据加载和请求处理问题
 */

import axios from 'axios';

// 创建axios实例
const apiClient = axios.create({
  baseURL: process.env.VUE_APP_API_BASE_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
apiClient.interceptors.request.use(
  config => {
    // 添加认证token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = \`Bearer \${token}\`;
    }
    
    // 添加请求日志
    console.log('API请求:', config.method?.toUpperCase(), config.url, config.data);
    
    return config;
  },
  error => {
    console.error('请求拦截器错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  response => {
    // 添加响应日志
    console.log('API响应:', response.status, response.config.url, response.data);
    
    // 统一响应格式处理
    if (response.data && response.data.code !== undefined) {
      if (response.data.code === 200) {
        return response.data;
      } else {
        throw new Error(response.data.message || '请求失败');
      }
    }
    
    return response.data;
  },
  error => {
    console.error('API响应错误:', error);
    
    // 统一错误处理
    let errorMessage = '网络请求失败';
    
    if (error.response) {
      // 服务器响应了错误状态码
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          errorMessage = data.message || '请求参数错误';
          break;
        case 401:
          errorMessage = '用户未登录或登录已过期';
          // 清除token并跳转到登录页
          localStorage.removeItem('token');
          window.location.href = '/login';
          break;
        case 403:
          errorMessage = '没有访问权限';
          break;
        case 404:
          errorMessage = '请求的资源不存在';
          break;
        case 500:
          errorMessage = '服务器内部错误';
          break;
        default:
          errorMessage = data.message || \`请求失败 (状态码: \${status})\`;
      }
    } else if (error.request) {
      // 请求已发出但没有收到响应
      if (error.code === 'ECONNABORTED') {
        errorMessage = '请求超时，请检查网络连接';
      } else {
        errorMessage = '网络连接失败，请检查网络';
      }
    } else {
      // 请求配置错误
      errorMessage = error.message || '请求配置错误';
    }
    
    return Promise.reject(new Error(errorMessage));
  }
);

/**
 * API服务类
 */
class ApiService {
  /**
   * 获取页面数据
   */
  async getPageData(id) {
    try {
      const response = await apiClient.get(\`/page/\${id}\`);
      return response;
    } catch (error) {
      console.error('获取页面数据失败:', error);
      throw error;
    }
  }
  
  /**
   * 提交表单数据
   */
  async submitForm(data) {
    try {
      // 数据验证
      if (!data || Object.keys(data).length === 0) {
        throw new Error('提交数据不能为空');
      }
      
      const response = await apiClient.post('/form/submit', data);
      return response;
    } catch (error) {
      console.error('表单提交失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取列表数据（支持分页）
   */
  async getListData(params = {}) {
    try {
      const response = await apiClient.get('/list', { params });
      
      // 数据格式验证
      if (!response.data || !Array.isArray(response.data.items)) {
        throw new Error('列表数据格式错误');
      }
      
      return response.data;
    } catch (error) {
      console.error('获取列表数据失败:', error);
      throw error;
    }
  }
  
  /**
   * 文件上传
   */
  async uploadFile(file, onProgress) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiClient.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: progressEvent => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(progress);
          }
        }
      });
      
      return response;
    } catch (error) {
      console.error('文件上传失败:', error);
      throw error;
    }
  }
}

export default new ApiService();`;
  }

  /**
   * 生成Java Controller修复代码
   */
  generateControllerFix(bugInfo) {
    return `package com.example.controller;

import com.example.dto.RequestDTO;
import com.example.dto.ResponseDTO;
import com.example.service.ExampleService;
import com.example.common.Result;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import javax.validation.constraints.NotNull;

/**
 * 修复Controller - ${bugInfo.title}
 * 修复API接口相关问题
 */
@Slf4j
@RestController
@RequestMapping("/api/example")
@Validated
public class FixedController {

    @Autowired
    private ExampleService exampleService;

    /**
     * 获取数据接口
     * 修复: 添加参数验证和异常处理
     */
    @GetMapping("/{id}")
    public Result<ResponseDTO> getData(@PathVariable @NotNull Long id) {
        try {
            log.info("获取数据请求, id: {}", id);
            
            // 参数验证
            if (id <= 0) {
                return Result.error("ID参数无效");
            }
            
            ResponseDTO data = exampleService.getById(id);
            
            if (data == null) {
                return Result.error("数据不存在");
            }
            
            log.info("获取数据成功, id: {}", id);
            return Result.success(data);
            
        } catch (Exception e) {
            log.error("获取数据失败, id: {}, error: {}", id, e.getMessage(), e);
            return Result.error("获取数据失败: " + e.getMessage());
        }
    }

    /**
     * 提交数据接口
     * 修复: 添加数据验证和事务处理
     */
    @PostMapping("/submit")
    public Result<String> submitData(@RequestBody @Valid RequestDTO request) {
        try {
            log.info("提交数据请求: {}", request);
            
            // 业务数据验证
            String validationResult = validateBusinessData(request);
            if (validationResult != null) {
                return Result.error(validationResult);
            }
            
            // 执行业务逻辑
            String result = exampleService.processData(request);
            
            log.info("数据提交成功: {}", result);
            return Result.success(result);
            
        } catch (IllegalArgumentException e) {
            log.warn("数据提交参数错误: {}", e.getMessage());
            return Result.error("参数错误: " + e.getMessage());
        } catch (Exception e) {
            log.error("数据提交失败: {}", e.getMessage(), e);
            return Result.error("提交失败: " + e.getMessage());
        }
    }

    /**
     * 分页查询接口
     * 修复: 添加分页参数验证和SQL注入防护
     */
    @GetMapping("/list")
    public Result<PageDTO<ResponseDTO>> getList(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String keyword) {
        try {
            log.info("分页查询请求, page: {}, size: {}, keyword: {}", page, size, keyword);
            
            // 分页参数验证
            if (page < 1) {
                page = 1;
            }
            if (size < 1 || size > 100) {
                size = 10;
            }
            
            // 关键词安全检查
            if (keyword != null) {
                keyword = keyword.trim();
                if (keyword.length() > 50) {
                    return Result.error("搜索关键词过长");
                }
            }
            
            PageDTO<ResponseDTO> result = exampleService.getPageList(page, size, keyword);
            
            log.info("分页查询成功, 总数: {}", result.getTotal());
            return Result.success(result);
            
        } catch (Exception e) {
            log.error("分页查询失败: {}", e.getMessage(), e);
            return Result.error("查询失败: " + e.getMessage());
        }
    }

    /**
     * 业务数据验证
     */
    private String validateBusinessData(RequestDTO request) {
        if (request == null) {
            return "请求数据不能为空";
        }
        
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            return "名称不能为空";
        }
        
        if (request.getName().length() > 100) {
            return "名称长度不能超过100个字符";
        }
        
        if (request.getType() == null) {
            return "类型不能为空";
        }
        
        // 其他业务验证逻辑...
        
        return null; // 验证通过
    }

    /**
     * 异常处理
     */
    @ExceptionHandler(Exception.class)
    public Result<String> handleException(Exception e) {
        log.error("Controller异常: {}", e.getMessage(), e);
        return Result.error("系统异常: " + e.getMessage());
    }
}`;
  }

  /**
   * 创建代码审阅检查清单
   */
  createReviewChecklist(projectType, bugInfo) {
    const checklist = [
      // 通用检查项
      '代码是否解决了bug描述中的核心问题',
      '代码逻辑是否清晰且符合业务需求',
      '是否添加了适当的错误处理和异常捕获',
      '是否添加了必要的日志记录',
      '代码注释是否充分且准确',
      '变量和方法命名是否符合规范',
      '是否遵循了项目的代码风格指南'
    ];

    if (projectType === 'frontend' || projectType === 'both') {
      checklist.push(
        '前端UI交互是否符合用户体验标准',
        '是否处理了加载状态和错误状态',
        '组件是否具有良好的可复用性',
        '是否添加了适当的输入验证',
        '样式是否响应式且兼容不同浏览器',
        '是否添加了无障碍访问支持'
      );
    }

    if (projectType === 'backend' || projectType === 'both') {
      checklist.push(
        'API接口是否符合RESTful设计原则',
        '是否添加了输入参数验证',
        '数据库操作是否安全且高效',
        '是否考虑了并发处理和事务管理',
        '安全性考虑是否充分（SQL注入、XSS等）',
        '性能是否满足要求',
        '是否添加了适当的缓存策略'
      );
    }

    // 基于bug严重程度添加特殊检查项
    if (bugInfo.severity && bugInfo.severity.includes('P1')) {
      checklist.push(
        '修复方案是否经过充分测试',
        '是否有回滚计划',
        '是否影响其他功能模块'
      );
    }

    return checklist;
  }

  /**
   * 生成测试建议
   */
  generateTestingSuggestions(bugInfo, fixSolution) {
    const suggestions = [
      '在开发环境中复现原始bug',
      '验证修复代码确实解决了报告的问题',
      '测试相关功能是否受到影响',
      '进行边界条件和异常情况测试'
    ];

    // 基于修复类型添加特定测试建议
    if (fixSolution.codeChanges.some(change => change.type === 'frontend')) {
      suggestions.push(
        '在不同浏览器中测试UI表现',
        '测试响应式布局在不同屏幕尺寸下的表现',
        '验证用户交互流程的完整性',
        '检查控制台是否有JavaScript错误'
      );
    }

    if (fixSolution.codeChanges.some(change => change.type === 'backend')) {
      suggestions.push(
        '使用Postman或curl测试API接口',
        '验证数据库操作的正确性',
        '进行压力测试确保性能不受影响',
        '测试异常情况下的错误处理'
      );
    }

    return suggestions;
  }

  /**
   * 评估代码风险
   */
  assessCodeRisks(bugInfo, fixSolution, generatedCode) {
    const risks = {
      level: 'medium',
      factors: [],
      mitigation: []
    };

    // 基于bug严重程度评估风险
    if (bugInfo.severity && bugInfo.severity.includes('P1')) {
      risks.level = 'high';
      risks.factors.push('P1级别bug，影响关键功能');
      risks.mitigation.push('需要在生产环境部署前进行充分测试');
    }

    // 基于修改范围评估风险
    const totalFiles = fixSolution.codeChanges.reduce((count, change) => 
      count + (change.files ? change.files.length : 0), 0
    );

    if (totalFiles > 5) {
      risks.level = 'high';
      risks.factors.push('修改文件数量较多，可能影响多个模块');
      risks.mitigation.push('需要进行全面的回归测试');
    }

    // 基于代码复杂度评估风险
    if (fixSolution.codeChanges.some(change => change.type === 'both')) {
      risks.factors.push('涉及前后端联调，集成复杂度较高');
      risks.mitigation.push('需要确保前后端接口格式一致性');
    }

    return risks;
  }

  /**
   * 创建部署计划
   */
  createDeploymentPlan(bugInfo, classification) {
    const plan = {
      environment: ['development', 'testing', 'staging', 'production'],
      steps: [],
      rollbackPlan: [],
      monitoring: []
    };

    // 基于bug严重程度制定部署策略
    if (bugInfo.severity && bugInfo.severity.includes('P1')) {
      plan.steps = [
        '1. 在开发环境验证修复效果',
        '2. 部署到测试环境进行功能测试',
        '3. 在预发布环境进行最终验证',
        '4. 准备生产环境热修复发布',
        '5. 监控发布后的系统状态'
      ];
    } else {
      plan.steps = [
        '1. 开发环境测试',
        '2. 测试环境验证',
        '3. 预发布环境确认',
        '4. 计划时间发布到生产环境',
        '5. 发布后监控'
      ];
    }

    plan.rollbackPlan = [
      '保留修复前的代码版本',
      '准备快速回滚脚本',
      '监控关键业务指标',
      '如出现问题立即回滚并分析原因'
    ];

    plan.monitoring = [
      '监控应用错误日志',
      '关注业务功能正常性',
      '监控系统性能指标',
      '收集用户反馈'
    ];

    return plan;
  }

  /**
   * 生成数据资产描述
   */
  generateDataAssets(bugInfo, fixSolution, generatedCode) {
    const assets = {
      bugDescription: {
        id: bugInfo.id,
        title: bugInfo.title,
        severity: bugInfo.severity,
        module: bugInfo.module,
        project: bugInfo.project
      },
      solutionSummary: {
        approach: fixSolution.fixStrategy.join('; '),
        filesModified: this.countModifiedFiles(fixSolution),
        estimatedEffort: this.estimateEffort(bugInfo, fixSolution),
        riskLevel: this.assessRiskLevel(bugInfo, fixSolution)
      },
      technicalDetails: {
        framework: this.detectFramework(generatedCode),
        components: this.extractComponents(generatedCode),
        patterns: this.identifyPatterns(generatedCode)
      },
      knowledgeBase: {
        problemType: this.categorizeProblemmm(bugInfo),
        solutionPattern: this.identifySolutionPattern(fixSolution),
        bestPractices: this.extractBestPractices(generatedCode)
      }
    };

    return assets;
  }

  /**
   * 辅助方法：统计修改文件数
   */
  countModifiedFiles(fixSolution) {
    return fixSolution.codeChanges.reduce((count, change) => 
      count + (change.files ? change.files.length : 0), 0
    );
  }

  /**
   * 辅助方法：评估工作量
   */
  estimateEffort(bugInfo, fixSolution) {
    const baseEffort = bugInfo.severity && bugInfo.severity.includes('P1') ? 2 : 4;
    const fileCount = this.countModifiedFiles(fixSolution);
    return `${baseEffort + Math.floor(fileCount / 3)}小时`;
  }

  /**
   * 辅助方法：评估风险级别
   */
  assessRiskLevel(bugInfo, fixSolution) {
    if (bugInfo.severity && bugInfo.severity.includes('P1')) return '高';
    if (this.countModifiedFiles(fixSolution) > 3) return '中';
    return '低';
  }

  /**
   * 保存审阅结果
   */
  async saveReviewResults(review) {
    const outputDir = path.join(this.config.outputPath, `BUG-${review.bugId}`);
    
    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 保存完整的审阅结果
    const reviewPath = path.join(outputDir, 'code-review.json');
    fs.writeFileSync(reviewPath, JSON.stringify(review, null, 2));

    // 生成人工审阅文档
    const reviewDoc = this.generateReviewDocument(review);
    const docPath = path.join(outputDir, '代码审阅检查清单.md');
    fs.writeFileSync(docPath, reviewDoc);

    // 保存生成的代码文件
    await this.saveGeneratedCode(review.generatedCode, outputDir);

    console.log(`代码审阅结果已保存到: ${outputDir}`);
  }

  /**
   * 生成审阅文档
   */
  generateReviewDocument(review) {
    return `# BUG-${review.bugId} 代码审阅检查清单

## 代码审阅清单

${review.reviewChecklist.map((item, index) => `${index + 1}. [ ] ${item}`).join('\n')}

## 测试建议

${review.testingSuggestions.map(suggestion => `- ${suggestion}`).join('\n')}

## 风险评估

**风险等级**: ${review.riskAssessment.level}

**风险因素**:
${review.riskAssessment.factors?.map(factor => `- ${factor}`).join('\n') || '无'}

**缓解措施**:
${review.riskAssessment.mitigation?.map(measure => `- ${measure}`).join('\n') || '无'}

## 部署计划

**部署步骤**:
${review.deploymentPlan.steps?.map(step => `- ${step}`).join('\n') || '无'}

**回滚计划**:
${review.deploymentPlan.rollbackPlan?.map(plan => `- ${plan}`).join('\n') || '无'}

## 数据资产记录

**问题类型**: ${review.dataAssets?.knowledgeBase?.problemType || '未分类'}
**解决方案模式**: ${review.dataAssets?.knowledgeBase?.solutionPattern || '未识别'}
**预计工作量**: ${review.dataAssets?.solutionSummary?.estimatedEffort || '待评估'}

---
*请在完成审阅后勾选相应的检查项，确保代码质量和系统稳定性*`;
  }

  /**
   * 保存生成的代码文件
   */
  async saveGeneratedCode(generatedCode, outputDir) {
    const codeDir = path.join(outputDir, 'generated-code');
    
    if (!fs.existsSync(codeDir)) {
      fs.mkdirSync(codeDir, { recursive: true });
    }

    // 保存前端代码
    if (generatedCode.frontend) {
      const frontendDir = path.join(codeDir, 'frontend');
      if (!fs.existsSync(frontendDir)) {
        fs.mkdirSync(frontendDir, { recursive: true });
      }

      for (const [category, files] of Object.entries(generatedCode.frontend)) {
        if (Array.isArray(files)) {
          for (const file of files) {
            const filePath = path.join(frontendDir, file.filename);
            fs.writeFileSync(filePath, file.content);
          }
        }
      }
    }

    // 保存后端代码
    if (generatedCode.backend) {
      const backendDir = path.join(codeDir, 'backend');
      if (!fs.existsSync(backendDir)) {
        fs.mkdirSync(backendDir, { recursive: true });
      }

      for (const [category, files] of Object.entries(generatedCode.backend)) {
        if (Array.isArray(files)) {
          for (const file of files) {
            const filePath = path.join(backendDir, file.filename);
            fs.writeFileSync(filePath, file.content);
          }
        }
      }
    }
  }

  // 辅助方法的简单实现
  detectFramework(generatedCode) { return 'Vue/Spring Boot'; }
  extractComponents(generatedCode) { return []; }
  identifyPatterns(generatedCode) { return []; }
  categorizeProblemmm(bugInfo) { return '功能异常'; }
  identifySolutionPattern(fixSolution) { return '异常处理增强'; }
  extractBestPractices(generatedCode) { return []; }
}

module.exports = CodeReviewer;