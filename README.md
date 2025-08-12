# Easy Claude

一个美观、现代的Claude AI配置管理工具，支持明暗主题切换和多配置管理，并集成了Claude Code Router功能。

## 功能特点

- 🎨 现代化UI设计，支持明暗主题切换
- 🔄 多配置管理与切换
- 🚀 一键启动Claude并传递配置参数
- ⚙️ 灵活的配置编辑与管理
- 💾 自动保存配置信息
- 🌐 集成Claude Code Router，支持多种模型提供商

## Claude Code Router 功能

Easy Claude 现已集成 Claude Code Router 功能，让您能够：

- 使用OpenRouter、DeepSeek、Ollama等多种模型提供商替代Anthropic API
- 根据任务类型自动选择最佳模型（思考型任务、长上下文任务等）
- 通过统一的界面管理所有配置
- 自定义转换器和路由规则

### 支持的提供商

- OpenRouter
- DeepSeek
- Ollama
- Gemini
- Volcengine
- ModelScope
- DashScope
- 以及更多...

## 安装与使用

### 环境要求

- Node.js (建议 14.x 或更高版本)
- Electron
- Claude CLI (需要单独安装)
- Claude Code Router (可选，可通过应用内安装)

### 安装

```bash
# 克隆项目
git clone https://github.com/hzhongl/easy-claude.git
cd easy-claude

# 安装依赖
npm install

# 启动应用
npm start
```

### 配置管理

1. 点击"添加配置"创建新的API配置
2. 填写配置名称、别名、API Key等信息
3. 如需使用路由功能，开启"使用路由"选项并配置相关参数
4. 保存后，配置卡片将显示在主页
5. 点击配置卡片可选择工作目录并启动Claude

### 路由配置

1. 在应用中安装Claude Code Router
2. 编辑路由配置，添加所需的模型提供商
3. 设置默认模型、思考模型和长上下文模型
4. 启动路由服务
5. 在配置中启用路由功能

## 技术栈

- Electron
- TypeScript
- HTML/CSS/JavaScript

## 截图

<img width="1096" height="849" alt="image" src="https://github.com/user-attachments/assets/56b8a0f2-858f-4b01-9cc1-79c01aa774de" />

<img width="1100" height="858" alt="image" src="https://github.com/user-attachments/assets/b2240002-55d3-4a02-a5c0-134b19cc4963" />

## 许可证

MIT 
