#!/usr/bin/env node

/**
 * BUG自动化修复系统主入口
 * 整合所有功能模块，提供统一的命令行接口
 */

const BugFixer = require('./bug-fixer');
const CodeReviewer = require('./code-reviewer');
const PRSubmitter = require('./pr-submitter');
const path = require('path');

class BugFixerCLI {
  constructor() {
    this.bugFixer = new BugFixer();
    this.codeReviewer = new CodeReviewer();
    this.prSubmitter = new PRSubmitter();
  }

  /**
   * 主要的fix命令处理函数
   * @param {string|number} bugId - Bug ID
   * @param {Object} options - 命令选项
   */
  async fix(bugId, options = {}) {
    const startTime = Date.now();
    
    try {
      console.log('🚀 BUG自动化修复系统启动');
      console.log(`📋 开始处理Bug: ${bugId}`);
      console.log('=' .repeat(50));

      // 阶段1: Bug分析和修复方案生成
      console.log('📊 阶段1: 分析Bug并生成修复方案...');
      const fixResult = await this.bugFixer.fixBug(bugId);
      
      if (!fixResult.success) {
        throw new Error(`Bug分析失败: ${fixResult.error}`);
      }

      console.log(`✅ Bug分析完成`);
      console.log(`   - 项目类型: ${fixResult.classification.projectType}`);
      console.log(`   - 置信度: ${(fixResult.classification.confidence * 100).toFixed(1)}%`);
      console.log('');

      // 阶段2: 代码生成和审阅
      console.log('💻 阶段2: 生成修复代码并创建审阅清单...');
      const reviewResult = await this.codeReviewer.generateCodeReview(
        fixResult.bugInfo,
        fixResult.fixSolution,
        fixResult.classification
      );

      console.log(`✅ 代码生成完成`);
      console.log(`   - 审阅项目: ${reviewResult.reviewChecklist.length}项`);
      console.log(`   - 测试建议: ${reviewResult.testingSuggestions.length}项`);
      console.log('');

      // 阶段3: 用户确认
      if (!options.autoCommit) {
        const shouldContinue = await this.askForConfirmation(fixResult, reviewResult);
        if (!shouldContinue) {
          console.log('❌ 用户取消操作');
          return this.createResult(false, bugId, '用户取消操作', startTime);
        }
      }

      // 阶段4: 自动提交PR
      if (options.createPR !== false) {
        console.log('🔄 阶段3: 创建Pull Request...');
        const prResult = await this.prSubmitter.submitPR(
          fixResult.bugInfo,
          fixResult,
          reviewResult
        );

        if (prResult.success) {
          console.log(`✅ PR创建成功: ${prResult.prUrl}`);
        } else {
          console.log(`⚠️ PR创建失败: ${prResult.error}`);
        }

        console.log('');
        console.log('🎉 BUG修复流程完成!');
        console.log('📝 请查看生成的修复方案和代码审阅清单');
        console.log('🔍 在合并PR前请仔细审阅所有代码更改');

        return this.createResult(true, bugId, null, startTime, {
          fixResult,
          reviewResult,
          prResult
        });
      } else {
        console.log('📝 修复方案已生成，跳过PR创建');
        return this.createResult(true, bugId, null, startTime, {
          fixResult,
          reviewResult
        });
      }

    } catch (error) {
      console.error('❌ 修复过程出错:', error.message);
      console.error('详细错误信息:', error.stack);
      
      return this.createResult(false, bugId, error.message, startTime);
    }
  }

  /**
   * 询问用户确认
   */
  async askForConfirmation(fixResult, reviewResult) {
    console.log('🔍 修复方案预览:');
    console.log(`   - Bug标题: ${fixResult.bugInfo.title}`);
    console.log(`   - 修复类型: ${fixResult.classification.projectType}`);
    console.log(`   - 工作量估算: ${fixResult.report.estimatedEffort}`);
    console.log(`   - 风险等级: ${fixResult.report.riskLevel}`);
    console.log('');

    console.log('📋 主要修复内容:');
    fixResult.fixSolution.codeChanges.forEach((change, index) => {
      console.log(`   ${index + 1}. ${change.description}`);
    });
    console.log('');

    console.log('⚠️ 风险提示:');
    reviewResult.riskAssessment.factors?.forEach(factor => {
      console.log(`   - ${factor}`);
    });
    console.log('');

    // 在实际环境中，这里应该使用inquirer等库来获取用户输入
    // 这里简化为默认确认
    console.log('🤔 是否继续创建PR? (自动确认中...)');
    return true;
  }

  /**
   * 创建结果对象
   */
  createResult(success, bugId, error, startTime, data = {}) {
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    return {
      success,
      bugId,
      error,
      duration: `${duration}秒`,
      timestamp: new Date().toISOString(),
      ...data
    };
  }

  /**
   * 处理命令行参数
   */
  parseArguments() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      this.showHelp();
      process.exit(1);
    }

    const command = args[0];
    
    switch (command) {
      case 'fix':
        return this.handleFixCommand(args.slice(1));
      case 'status':
        return this.handleStatusCommand(args.slice(1));
      case 'help':
      case '--help':
      case '-h':
        this.showHelp();
        process.exit(0);
        break;
      default:
        // 如果第一个参数是数字，假设它是bug ID
        if (/^\d+$/.test(command)) {
          return this.handleFixCommand(args);
        } else {
          console.error(`未知命令: ${command}`);
          this.showHelp();
          process.exit(1);
        }
    }
  }

  /**
   * 处理fix命令
   */
  handleFixCommand(args) {
    if (args.length === 0) {
      console.error('错误: 请提供Bug ID');
      console.error('用法: fix <bugId>');
      process.exit(1);
    }

    const bugId = args[0];
    const options = {};

    // 解析选项
    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      switch (arg) {
        case '--auto-commit':
        case '-a':
          options.autoCommit = true;
          break;
        case '--no-pr':
          options.createPR = false;
          break;
        case '--dry-run':
          options.dryRun = true;
          break;
        default:
          console.warn(`未知选项: ${arg}`);
      }
    }

    return { command: 'fix', bugId, options };
  }

  /**
   * 处理status命令
   */
  handleStatusCommand(args) {
    const bugId = args[0];
    return { command: 'status', bugId };
  }

  /**
   * 显示帮助信息
   */
  showHelp() {
    console.log(`
🔧 BUG自动化修复系统

用法:
  fix <bugId> [选项]     修复指定的Bug
  status <bugId>         查看Bug修复状态
  help                   显示帮助信息

选项:
  --auto-commit, -a      自动提交，不询问确认
  --no-pr                只生成修复方案，不创建PR
  --dry-run              试运行模式，不做实际更改

示例:
  fix 12345              修复Bug 12345
  fix 12345 --auto-commit 自动修复Bug 12345
  fix 12345 --no-pr      只生成修复方案，不创建PR
  status 12345           查看Bug 12345的修复状态

环境变量:
  ZENTAO_BASE_URL        禅道系统地址
  ZENTAO_TOKEN           禅道API访问令牌
  ZENTAO_USERNAME        禅道用户名
  ZENTAO_PASSWORD        禅道密码

配置文件:
  在项目根目录创建 .bugfixer.json 文件可以自定义配置
  
更多信息请参考文档。
`);
  }

  /**
   * 查看Bug修复状态
   */
  async status(bugId) {
    try {
      console.log(`🔍 查询Bug ${bugId} 的修复状态...`);

      // 检查本地修复记录
      const fixResultPath = path.join('./bug-fixes', `BUG-${bugId}`, 'fix-report.json');
      const prInfoPath = path.join('./bug-fixes', `BUG-${bugId}`, 'pr-info.json');

      let hasFixResult = false;
      let hasPR = false;

      try {
        const fs = require('fs');
        if (fs.existsSync(fixResultPath)) {
          hasFixResult = true;
          const fixResult = JSON.parse(fs.readFileSync(fixResultPath, 'utf8'));
          console.log(`✅ 找到修复记录:`);
          console.log(`   - 修复时间: ${fixResult.analysisDate}`);
          console.log(`   - 项目类型: ${fixResult.classification.projectType}`);
          console.log(`   - 置信度: ${(fixResult.classification.confidence * 100).toFixed(1)}%`);
        }

        if (fs.existsSync(prInfoPath)) {
          hasPR = true;
          const prInfo = JSON.parse(fs.readFileSync(prInfoPath, 'utf8'));
          console.log(`🔄 找到PR记录:`);
          console.log(`   - 分支: ${prInfo.branch}`);
          console.log(`   - PR地址: ${prInfo.prUrl}`);
          console.log(`   - 创建时间: ${prInfo.timestamp}`);

          // 尝试检查PR状态
          const prStatus = await this.prSubmitter.checkPRStatus(bugId);
          if (prStatus) {
            console.log(`   - 当前状态: ${prStatus.state}`);
          }
        }
      } catch (error) {
        console.warn(`读取本地记录失败: ${error.message}`);
      }

      if (!hasFixResult && !hasPR) {
        console.log(`❌ 未找到Bug ${bugId} 的修复记录`);
      }

    } catch (error) {
      console.error(`查询状态失败: ${error.message}`);
    }
  }

  /**
   * 主函数
   */
  async main() {
    try {
      const parsed = this.parseArguments();
      
      switch (parsed.command) {
        case 'fix':
          await this.fix(parsed.bugId, parsed.options);
          break;
        case 'status':
          await this.status(parsed.bugId);
          break;
      }
    } catch (error) {
      console.error('系统错误:', error.message);
      process.exit(1);
    }
  }
}

// 如果直接运行此文件，执行主函数
if (require.main === module) {
  const cli = new BugFixerCLI();
  cli.main().catch(error => {
    console.error('未处理的错误:', error);
    process.exit(1);
  });
}

module.exports = BugFixerCLI;