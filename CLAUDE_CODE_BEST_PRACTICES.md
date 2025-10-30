# Claude Code 最佳实践需求分析

## 一、项目构建最佳实践

### 1.1 项目结构
- **CLAUDE.md 文件层级**
  - Enterprise policy: `/etc/claude-code/CLAUDE.md` (组织级)
  - Project memory: `./CLAUDE.md` 或 `./.claude/CLAUDE.md` (项目级)
  - User memory: `~/.claude/CLAUDE.md` (用户级)
  - Project memory (local): `./CLAUDE.local.md` (已弃用，建议使用 imports)

### 1.2 CLAUDE.md 最佳实践
- **内容组织**
  - 使用 Markdown 标题组织相关内容
  - 每条指令格式化为 bullet point
  - 具体明确：如 "使用 2 空格缩进" 而非 "正确格式化代码"

- **导入机制**
  - 使用 `@path/to/import` 语法导入其他文件
  - 支持相对路径和绝对路径
  - 最大递归深度：5 层
  - 示例：`@README` 或 `@~/.claude/my-project-instructions.md`

- **内容建议**
  - 常用命令（build, test, lint）
  - 代码风格偏好和命名约定
  - 项目特定的架构模式
  - 定期审查和更新

### 1.3 工作流程
- **Plan Mode（计划模式）**
  - 适用场景：
    - 多步骤实现（需要编辑多个文件）
    - 代码探索（在修改前彻底研究代码库）
    - 交互式开发（与 Claude 迭代方向）
  - 使用方式：
    - `Shift+Tab` 切换模式
    - `claude --permission-mode plan`
    - 配置默认：`.claude/settings.json` 中设置 `"defaultMode": "plan"`

- **Subagents（子代理）**
  - 查看可用子代理：`/agents`
  - 自动委派：Claude 会自动将任务委派给专门的子代理
  - 显式请求：`use the code-reviewer subagent to check the auth module`
  - 创建自定义子代理：在 `.claude/agents/` 中定义

### 1.4 常见工作流
- **理解新代码库**
  - 从宽泛问题开始，逐步深入
  - 询问架构模式、数据模型、认证处理

- **修复 Bug**
  - 分享错误信息和重现步骤
  - 让 Claude 提供修复建议
  - 应用修复并验证

- **重构代码**
  - 识别遗留代码
  - 获取重构建议
  - 小步骤、可测试的增量重构

## 二、上下文处理最佳实践

### 2.1 Memory Management（内存管理）

#### 内存类型层级
| 类型 | 位置 | 用途 | 共享范围 |
|------|------|------|----------|
| Enterprise policy | `/etc/claude-code/CLAUDE.md` | 组织级指令 | 组织所有用户 |
| Project memory | `./CLAUDE.md` | 团队共享指令 | 通过版本控制共享 |
| User memory | `~/.claude/CLAUDE.md` | 个人偏好 | 仅个人（所有项目） |
| Project memory (local) | `./CLAUDE.local.md` | 个人项目偏好（已弃用） | 仅个人（当前项目） |

#### 内存查找机制
- 从当前工作目录开始递归向上查找
- 读取所有 CLAUDE.md 和 CLAUDE.local.md 文件
- 子树中的 CLAUDE.md 仅在读取该子树文件时加载

#### 快速操作
- **快速添加内存**：以 `#` 开头输入
  ```
  # Always use descriptive variable names
  ```
- **编辑内存**：使用 `/memory` 命令
- **初始化项目内存**：使用 `/init` 命令

### 2.2 文件和目录引用
- **@ 语法引用**
  - 单个文件：`@src/utils/auth.js`
  - 目录：`@src/components`
  - MCP 资源：`@github:repos/owner/repo/issues`
  - 支持相对路径和绝对路径
  - 可在单条消息中引用多个文件

### 2.3 Extended Thinking（扩展思考）
- **适用场景**
  - 规划复杂架构变更
  - 调试复杂问题
  - 创建新功能实现计划
  - 理解复杂代码库
  - 评估不同方案的权衡

- **使用方式**
  - 使用 `Tab` 切换 Thinking 开关
  - 提示词：
    - "think" - 基础扩展思考
    - "think hard", "think more", "think longer" - 更深层次思考

### 2.4 会话管理
- **继续最近会话**：`claude --continue`
- **选择历史会话**：`claude --resume`
- **非交互模式继续**：`claude --continue --print "Continue with my task"`

## 三、文本索引最佳实践

### 3.1 代码搜索和导航
- **查找相关代码**
  - 使用具体的功能描述
  - 使用项目领域语言
  - 示例：`find the files that handle user authentication`

- **理解执行流程**
  - 追踪流程：`trace the login process from front-end to database`
  - 组件交互：`how do these authentication files work together?`

### 3.2 文档处理
- **识别未文档化代码**
  ```
  find functions without proper JSDoc comments in the auth module
  ```

- **生成文档**
  ```
  add JSDoc comments to the undocumented functions in auth.js
  ```

- **文档标准**
  - 指定文档风格（JSDoc, docstrings 等）
  - 要求示例
  - 为公共 API、接口和复杂逻辑添加文档

### 3.3 图像处理
- **添加图像**
  - 拖放到 Claude Code 窗口
  - Ctrl+V 粘贴（不要用 Cmd+V）
  - 提供图像路径

- **使用场景**
  - 错误截图分析
  - UI 设计实现
  - 数据库架构图
  - 从视觉内容生成代码

## 四、MCP 最佳实践

### 4.1 MCP 概述
MCP（Model Context Protocol）是 AI 应用的标准化协议，类似于 USB-C 端口，提供标准化方式连接 AI 模型到不同数据源和工具。

### 4.2 MCP 功能
- **实现功能**：从 issue tracker 实现功能并创建 PR
- **分析监控数据**：检查 Sentry 和 Statsig 使用情况
- **查询数据库**：基于 Postgres 数据库查找用户
- **集成设计**：基于 Figma 设计更新模板
- **自动化工作流**：创建 Gmail 草稿邀请用户

### 4.3 MCP 服务器安装

#### 三种传输方式
1. **HTTP 服务器（推荐）**
   ```bash
   claude mcp add --transport http notion https://mcp.notion.com/mcp
   ```

2. **SSE 服务器（已弃用）**
   ```bash
   claude mcp add --transport sse asana https://mcp.asana.com/sse
   ```

3. **本地 stdio 服务器**
   ```bash
   claude mcp add --transport stdio airtable --env AIRTABLE_API_KEY=YOUR_KEY -- npx -y airtable-mcp-server
   ```

#### 理解 `--` 参数
- `--` 前面是 Claude 的 CLI 标志（如 `--env`, `--scope`）
- `--` 后面是运行 MCP 服务器的实际命令

### 4.4 MCP 作用域

| 作用域 | 配置位置 | 可见性 | 适用场景 |
|--------|----------|--------|----------|
| local（默认） | 项目特定用户设置 | 仅当前项目个人 | 个人开发服务器、实验配置、敏感凭证 |
| project | `.mcp.json` 文件 | 团队共享（版本控制） | 团队共享服务器、项目特定工具 |
| user | 用户全局设置 | 个人所有项目 | 个人工具、跨项目开发工具 |

#### 作用域优先级
local > project > user

### 4.5 环境变量扩展
在 `.mcp.json` 中支持环境变量：
- `${VAR}` - 扩展为环境变量 VAR 的值
- `${VAR:-default}` - 如果 VAR 未设置则使用默认值

示例：
```json
{
  "mcpServers": {
    "api-server": {
      "type": "http",
      "url": "${API_BASE_URL:-https://api.example.com}/mcp",
      "headers": {
        "Authorization": "Bearer ${API_KEY}"
      }
    }
  }
}
```

### 4.6 常用 MCP 服务器

#### 开发和测试工具
- **Sentry**: 错误监控、生产问题调试
- **Socket**: 依赖安全分析
- **Hugging Face**: 访问 Hugging Face Hub
- **Jam**: 访问 Jam 录制（视频、日志、网络请求）

#### 项目管理和文档
- **Asana**: 工作区项目管理
- **Atlassian**: Jira 票据和 Confluence 文档
- **Linear**: 问题跟踪和项目管理
- **Notion**: 读取文档、更新页面、管理任务

#### 数据库和数据管理
- **Airtable**: 读写记录、管理 bases 和 tables
- **HubSpot**: 访问和管理 CRM 数据

#### 支付和商务
- **Stripe**: 支付处理、订阅管理
- **PayPal**: 支付处理、交易管理

#### 设计和媒体
- **Figma**: 生成更好的代码（完整 Figma 上下文）
- **Canva**: 浏览、总结、自动填充 Canva 设计

#### 基础设施和 DevOps
- **Cloudflare**: 构建应用、分析流量、监控性能
- **Netlify**: 创建、部署和管理网站
- **Vercel**: 管理项目和部署、分析日志

### 4.7 MCP 管理命令
```bash
# 列出所有配置的服务器
claude mcp list

# 获取特定服务器详情
claude mcp get github

# 移除服务器
claude mcp remove github

# 在 Claude Code 中检查服务器状态
/mcp
```

### 4.8 MCP 认证
- 支持 OAuth 2.0
- 使用 `/mcp` 命令在浏览器中登录
- 认证令牌安全存储并自动刷新

### 4.9 MCP 资源和提示
- **引用 MCP 资源**：`@server:resource`
- **MCP 提示作为 slash 命令**：自动可用
- **执行 MCP 提示**：直接调用

### 4.10 企业 MCP 配置
- 设置企业级 MCP 配置
- 使用白名单和黑名单限制 MCP 服务器
- 通过配置管理系统（MDM、Group Policy、Ansible）部署

## 五、其他最佳实践

### 5.1 Unix 风格使用
- **管道集成**
  ```bash
  cat build-error.txt | claude -p 'concisely explain the root cause of this build error' > output.txt
  ```

- **输出格式控制**
  - `--output-format text`（默认）
  - `--output-format json`
  - `--output-format stream-json`

### 5.2 自定义 Slash 命令
- **项目级命令**：`.claude/commands/optimize.md`
- **个人命令**：`~/.claude/commands/review.md`
- 命令名称来自文件名
- 支持子目录组织

### 5.3 Git Worktrees 并行会话
- 创建 worktree：`git worktree add ../project-feature-a -b feature-a`
- 在每个 worktree 中运行独立的 Claude Code 会话
- 完全隔离的文件状态
- 共享 Git 历史和远程连接

### 5.4 测试工作流
- 识别未测试代码
- 生成测试脚手架
- 添加边界条件测试用例
- 运行并验证测试

### 5.5 Pull Request 创建
- 总结变更
- 生成 PR：`create a pr`
- 审查和完善描述
- 添加测试详情

## 六、应用建议

### 6.1 当前项目改进方向
基于以上最佳实践，建议在当前 scripts 项目中：

1. **完善 CLAUDE.md**
   - 添加项目常用命令
   - 定义代码风格规范
   - 记录架构模式

2. **优化上下文管理**
   - 使用 @ 语法引用关键文件
   - 合理使用 Plan Mode 进行复杂任务规划
   - 利用 Extended Thinking 处理复杂决策

3. **集成 MCP 服务器**
   - 考虑集成 GitHub MCP（代码审查、PR 管理）
   - 集成 Notion MCP（文档管理）
   - 根据需要添加其他工具集成

4. **建立工作流规范**
   - 创建项目特定的 slash 命令
   - 定义 subagents 用于特定任务
   - 使用 hooks 自动化常见操作

5. **文档和索引优化**
   - 为关键模块添加完整文档
   - 使用图像辅助说明复杂逻辑
   - 建立清晰的代码导航路径

### 6.2 提示词风格建议
- **明确具体**：避免模糊指令
- **结构化组织**：使用 Markdown 标题和列表
- **上下文丰富**：提供足够背景信息
- **迭代优化**：从宽泛到具体逐步深入
- **利用工具**：充分使用 @引用、Plan Mode、Extended Thinking

## 七、总结

Claude Code 提供了强大的项目构建、上下文管理和工具集成能力。通过合理使用：
- **CLAUDE.md 层级系统**管理项目知识
- **Plan Mode 和 Subagents** 处理复杂任务
- **MCP 协议**集成外部工具和数据源
- **@ 语法和 Extended Thinking** 优化上下文处理

可以显著提升开发效率和代码质量。关键是根据项目实际需求，选择合适的工具和工作流程，并持续优化和迭代。
