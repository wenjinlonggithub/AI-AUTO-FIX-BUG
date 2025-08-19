/**
 * Pull Request 自动提交器
 * 用于自动创建git分支、提交代码并创建PR
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class PRSubmitter {
  constructor(config = {}) {
    this.config = {
      gitRemote: config.gitRemote || 'origin',
      baseBranch: config.baseBranch || 'main',
      branchPrefix: config.branchPrefix || 'fix-bug-',
      commitMessageTemplate: config.commitMessageTemplate || 'fix: 修复BUG-{bugId} - {title}',
      prTitle: config.prTitle || 'Fix: 修复BUG-{bugId} - {title}',
      autoMerge: config.autoMerge || false,
      ...config
    };
  }

  /**
   * 自动提交修复代码并创建PR
   * @param {Object} bugInfo - Bug信息
   * @param {Object} fixResult - 修复结果
   * @param {Object} reviewResult - 审阅结果
   * @returns {Promise<Object>} PR创建结果
   */
  async submitPR(bugInfo, fixResult, reviewResult) {
    try {
      console.log(`开始为Bug ${bugInfo.id} 创建PR...`);

      // 1. 检查git状态
      await this.checkGitStatus();

      // 2. 创建修复分支
      const branchName = await this.createFixBranch(bugInfo.id);

      // 3. 应用修复代码
      await this.applyCodeChanges(reviewResult.generatedCode);

      // 4. 提交更改
      const commitHash = await this.commitChanges(bugInfo, fixResult);

      // 5. 推送到远程
      await this.pushToRemote(branchName);

      // 6. 创建Pull Request
      const prUrl = await this.createPullRequest(bugInfo, fixResult, reviewResult, branchName);

      const result = {
        success: true,
        bugId: bugInfo.id,
        branch: branchName,
        commitHash: commitHash,
        prUrl: prUrl,
        timestamp: new Date().toISOString()
      };

      // 7. 保存PR信息
      await this.savePRInfo(result);

      console.log(`PR创建成功: ${prUrl}`);
      return result;

    } catch (error) {
      console.error(`PR创建失败:`, error.message);
      
      // 尝试清理
      await this.cleanup(bugInfo.id);
      
      return {
        success: false,
        bugId: bugInfo.id,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 检查git状态
   */
  async checkGitStatus() {
    try {
      // 检查是否在git仓库中
      execSync('git rev-parse --git-dir', { stdio: 'pipe' });

      // 检查工作区是否干净
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      if (status.trim()) {
        throw new Error('工作区有未提交的更改，请先处理现有更改');
      }

      // 获取当前分支
      const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      
      // 确保在主分支上
      if (currentBranch !== this.config.baseBranch) {
        console.log(`切换到基础分支 ${this.config.baseBranch}`);
        execSync(`git checkout ${this.config.baseBranch}`);
      }

      // 拉取最新代码
      console.log('拉取最新代码...');
      execSync(`git pull ${this.config.gitRemote} ${this.config.baseBranch}`);

    } catch (error) {
      throw new Error(`Git状态检查失败: ${error.message}`);
    }
  }

  /**
   * 创建修复分支
   */
  async createFixBranch(bugId) {
    const branchName = `${this.config.branchPrefix}${bugId}`;
    
    try {
      // 检查分支是否已存在
      try {
        execSync(`git show-ref --verify --quiet refs/heads/${branchName}`);
        console.log(`分支 ${branchName} 已存在，将删除并重新创建`);
        execSync(`git branch -D ${branchName}`);
      } catch (e) {
        // 分支不存在，继续
      }

      // 创建新分支
      console.log(`创建修复分支: ${branchName}`);
      execSync(`git checkout -b ${branchName}`);

      return branchName;
    } catch (error) {
      throw new Error(`创建分支失败: ${error.message}`);
    }
  }

  /**
   * 应用代码更改
   */
  async applyCodeChanges(generatedCode) {
    try {
      console.log('应用代码更改...');

      // 应用前端代码更改
      if (generatedCode.frontend) {
        await this.applyFrontendChanges(generatedCode.frontend);
      }

      // 应用后端代码更改  
      if (generatedCode.backend) {
        await this.applyBackendChanges(generatedCode.backend);
      }

    } catch (error) {
      throw new Error(`应用代码更改失败: ${error.message}`);
    }
  }

  /**
   * 应用前端代码更改
   */
  async applyFrontendChanges(frontendCode) {
    for (const [category, files] of Object.entries(frontendCode)) {
      if (!Array.isArray(files)) continue;

      for (const file of files) {
        const targetPath = this.determineFrontendPath(file.filename, category);
        
        if (targetPath) {
          // 确保目录存在
          const dir = path.dirname(targetPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }

          // 写入文件
          fs.writeFileSync(targetPath, file.content);
          console.log(`已更新前端文件: ${targetPath}`);
        }
      }
    }
  }

  /**
   * 应用后端代码更改
   */
  async applyBackendChanges(backendCode) {
    for (const [category, files] of Object.entries(backendCode)) {
      if (!Array.isArray(files)) continue;

      for (const file of files) {
        const targetPath = this.determineBackendPath(file.filename, category);
        
        if (targetPath) {
          // 确保目录存在
          const dir = path.dirname(targetPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }

          // 写入文件
          fs.writeFileSync(targetPath, file.content);
          console.log(`已更新后端文件: ${targetPath}`);
        }
      }
    }
  }

  /**
   * 确定前端文件路径
   */
  determineFrontendPath(filename, category) {
    const frontendDirs = ['src/components', 'src/views', 'src/pages', 'src'];
    
    // 根据文件类型确定目录
    let targetDir = 'src';
    
    switch (category) {
      case 'components':
        targetDir = 'src/components';
        break;
      case 'routes':
        targetDir = 'src/router';
        break;
      case 'services':
        targetDir = 'src/services';
        break;
      case 'utils':
        targetDir = 'src/utils';
        break;
    }

    // 检查目录是否存在
    if (fs.existsSync(targetDir)) {
      return path.join(targetDir, filename);
    }

    // 尝试其他可能的目录
    for (const dir of frontendDirs) {
      if (fs.existsSync(dir)) {
        return path.join(dir, filename);
      }
    }

    // 如果都不存在，创建在src目录下
    return path.join('src', filename);
  }

  /**
   * 确定后端文件路径
   */
  determineBackendPath(filename, category) {
    const backendDirs = [
      'src/main/java',
      'src/java',
      'backend/src/main/java',
      'server/src/main/java'
    ];

    // 根据文件类型确定目录
    let targetSubDir = '';
    
    switch (category) {
      case 'controllers':
        targetSubDir = 'controller';
        break;
      case 'services':
        targetSubDir = 'service';
        break;
      case 'repositories':
        targetSubDir = 'repository';
        break;
      case 'entities':
        targetSubDir = 'entity';
        break;
      case 'configurations':
        targetSubDir = 'config';
        break;
    }

    // 查找合适的后端目录
    for (const baseDir of backendDirs) {
      if (fs.existsSync(baseDir)) {
        // 查找包结构
        const packageDirs = this.findPackageStructure(baseDir);
        if (packageDirs.length > 0) {
          const packageDir = packageDirs[0]; // 使用第一个找到的包
          return path.join(packageDir, targetSubDir, filename);
        } else {
          return path.join(baseDir, 'com/example', targetSubDir, filename);
        }
      }
    }

    // 如果都不存在，创建默认结构
    return path.join('src/main/java/com/example', targetSubDir, filename);
  }

  /**
   * 查找Java包结构
   */
  findPackageStructure(baseDir) {
    const packages = [];
    
    try {
      const entries = fs.readdirSync(baseDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subDir = path.join(baseDir, entry.name);
          const subEntries = fs.readdirSync(subDir, { withFileTypes: true });
          
          // 检查是否包含Java包结构
          if (subEntries.some(e => e.isDirectory() || e.name.endsWith('.java'))) {
            packages.push(subDir);
          }
        }
      }
    } catch (error) {
      console.warn(`扫描包结构失败: ${error.message}`);
    }
    
    return packages;
  }

  /**
   * 提交更改
   */
  async commitChanges(bugInfo, fixResult) {
    try {
      // 添加所有更改的文件
      execSync('git add .');

      // 检查是否有更改
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      if (!status.trim()) {
        throw new Error('没有检测到代码更改');
      }

      // 生成提交信息
      const commitMessage = this.generateCommitMessage(bugInfo, fixResult);

      // 提交更改
      console.log('提交代码更改...');
      execSync(`git commit -m "${commitMessage}"`);

      // 获取提交哈希
      const commitHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();

      return commitHash;
    } catch (error) {
      throw new Error(`提交更改失败: ${error.message}`);
    }
  }

  /**
   * 生成提交信息
   */
  generateCommitMessage(bugInfo, fixResult) {
    let message = this.config.commitMessageTemplate
      .replace('{bugId}', bugInfo.id)
      .replace('{title}', bugInfo.title);

    // 添加详细描述
    const details = [
      '',
      `修复类型: ${fixResult.classification.projectType}`,
      `置信度: ${(fixResult.classification.confidence * 100).toFixed(1)}%`,
      '',
      '修复内容:',
      ...fixResult.fixSolution.implementationSteps.slice(0, 3).map(step => `- ${step}`)
    ];

    if (bugInfo.severity) {
      details.splice(1, 0, `严重程度: ${bugInfo.severity}`);
    }

    return message + '\n' + details.join('\n');
  }

  /**
   * 推送到远程仓库
   */
  async pushToRemote(branchName) {
    try {
      console.log(`推送分支到远程仓库: ${branchName}`);
      execSync(`git push -u ${this.config.gitRemote} ${branchName}`);
    } catch (error) {
      throw new Error(`推送失败: ${error.message}`);
    }
  }

  /**
   * 创建Pull Request
   */
  async createPullRequest(bugInfo, fixResult, reviewResult, branchName) {
    try {
      // 生成PR标题和描述
      const title = this.config.prTitle
        .replace('{bugId}', bugInfo.id)
        .replace('{title}', bugInfo.title);

      const body = this.generatePRDescription(bugInfo, fixResult, reviewResult);

      // 尝试使用GitHub CLI创建PR
      const prUrl = await this.createGitHubPR(title, body, branchName);
      
      return prUrl;
    } catch (error) {
      console.warn('使用GitHub CLI创建PR失败，将返回手动创建链接');
      
      // 生成手动创建PR的链接
      const repoUrl = this.getRepositoryUrl();
      const compareUrl = `${repoUrl}/compare/${this.config.baseBranch}...${branchName}`;
      
      console.log(`请手动创建PR: ${compareUrl}`);
      return compareUrl;
    }
  }

  /**
   * 使用GitHub CLI创建PR
   */
  async createGitHubPR(title, body, branchName) {
    try {
      // 检查gh CLI是否可用
      execSync('gh --version', { stdio: 'pipe' });

      // 创建PR
      const result = execSync(
        `gh pr create --title "${title}" --body "${body}" --base ${this.config.baseBranch} --head ${branchName}`,
        { encoding: 'utf8' }
      );

      // 提取PR URL
      const prUrl = result.trim();
      return prUrl;
    } catch (error) {
      throw new Error(`GitHub CLI创建PR失败: ${error.message}`);
    }
  }

  /**
   * 生成PR描述
   */
  generatePRDescription(bugInfo, fixResult, reviewResult) {
    const description = `## Bug修复说明

### Bug信息
- **Bug ID**: ${bugInfo.id}
- **标题**: ${bugInfo.title}
- **严重程度**: ${bugInfo.severity || '未知'}
- **修复类型**: ${fixResult.classification.projectType}
- **置信度**: ${(fixResult.classification.confidence * 100).toFixed(1)}%

### 问题描述
${bugInfo.description}

### 期望结果
${bugInfo.expectedResult || '详见禅道bug描述'}

### 修复方案
${fixResult.classification.reasons.map(reason => `- ${reason}`).join('\n')}

### 主要更改
${fixResult.fixSolution.codeChanges.map(change => `- ${change.description}`).join('\n')}

### 测试建议
${reviewResult.testingSuggestions.map(suggestion => `- [ ] ${suggestion}`).join('\n')}

### 代码审阅清单
${reviewResult.reviewChecklist.slice(0, 5).map(item => `- [ ] ${item}`).join('\n')}

### 风险评估
- **风险等级**: ${reviewResult.riskAssessment.level}
${reviewResult.riskAssessment.factors?.map(factor => `- ${factor}`).join('\n') || ''}

### 部署计划
${reviewResult.deploymentPlan.steps?.slice(0, 3).map(step => `- ${step}`).join('\n') || ''}

---
*此PR由BUG自动化修复系统生成，请仔细review代码后再合并*`;

    return description;
  }

  /**
   * 获取仓库URL
   */
  getRepositoryUrl() {
    try {
      const remoteUrl = execSync(`git remote get-url ${this.config.gitRemote}`, { encoding: 'utf8' }).trim();
      
      // 转换SSH URL为HTTPS URL
      if (remoteUrl.startsWith('git@github.com:')) {
        return remoteUrl.replace('git@github.com:', 'https://github.com/').replace('.git', '');
      } else if (remoteUrl.startsWith('https://github.com/')) {
        return remoteUrl.replace('.git', '');
      }
      
      return remoteUrl;
    } catch (error) {
      return 'https://github.com/your-repo';
    }
  }

  /**
   * 保存PR信息
   */
  async savePRInfo(prResult) {
    const prInfoPath = path.join('./bug-fixes', `BUG-${prResult.bugId}`, 'pr-info.json');
    
    try {
      // 确保目录存在
      const dir = path.dirname(prInfoPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // 保存PR信息
      fs.writeFileSync(prInfoPath, JSON.stringify(prResult, null, 2));
      
      // 生成PR跟踪文档
      const prDoc = this.generatePRTrackingDoc(prResult);
      const docPath = path.join(path.dirname(prInfoPath), 'PR跟踪.md');
      fs.writeFileSync(docPath, prDoc);

    } catch (error) {
      console.warn(`保存PR信息失败: ${error.message}`);
    }
  }

  /**
   * 生成PR跟踪文档
   */
  generatePRTrackingDoc(prResult) {
    return `# BUG-${prResult.bugId} PR跟踪

## PR信息
- **分支**: ${prResult.branch}
- **提交哈希**: ${prResult.commitHash}
- **PR地址**: ${prResult.prUrl}
- **创建时间**: ${prResult.timestamp}

## 状态跟踪
- [ ] 代码审阅完成
- [ ] 测试验证通过
- [ ] 部署到测试环境
- [ ] 用户验收测试
- [ ] 合并到主分支
- [ ] 发布到生产环境

## 注意事项
- 请确保所有审阅清单项目都已完成
- 在合并前进行充分的测试
- 密切关注发布后的系统状态

---
*更新时间: ${new Date().toISOString()}*`;
  }

  /**
   * 清理失败的操作
   */
  async cleanup(bugId) {
    try {
      const branchName = `${this.config.branchPrefix}${bugId}`;
      
      // 切回主分支
      execSync(`git checkout ${this.config.baseBranch}`, { stdio: 'pipe' });
      
      // 删除创建的分支
      try {
        execSync(`git branch -D ${branchName}`, { stdio: 'pipe' });
      } catch (e) {
        // 分支可能不存在，忽略错误
      }
      
      console.log(`已清理分支: ${branchName}`);
    } catch (error) {
      console.warn(`清理操作失败: ${error.message}`);
    }
  }

  /**
   * 检查PR状态
   */
  async checkPRStatus(bugId) {
    try {
      const branchName = `${this.config.branchPrefix}${bugId}`;
      
      // 使用GitHub CLI检查PR状态
      const result = execSync(
        `gh pr list --head ${branchName} --json url,state,title`,
        { encoding: 'utf8' }
      );
      
      const prs = JSON.parse(result);
      return prs.length > 0 ? prs[0] : null;
    } catch (error) {
      console.warn(`检查PR状态失败: ${error.message}`);
      return null;
    }
  }
}

module.exports = PRSubmitter;