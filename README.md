# 🛡️ CAP 验证码服务

基于 Cloudflare Workers 的现代化验证码服务，使用 SHA-256 工作量证明算法，提供无感知的人机验证体验。

## ✨ 特性

- 🚀 **边缘计算**: Cloudflare Workers 全球部署，毫秒级响应
- 🔒 **安全防护**: SHA-256 PoW 算法，防重放攻击，一次性令牌
- 💾 **自动清理**: 智能清理过期数据，KV 存储优化
- 🎯 **开箱即用**: 完整的 REST API，支持所有主流语言
- 🎨 **美观界面**: 响应式设计，现代化 UI 组件
- ⚡ **高性能**: 无服务器架构，自动扩缩容

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 KV 存储

创建 Cloudflare KV 命名空间：

```bash
# 创建 KV 命名空间
wrangler kv:namespace create "CAP_KV"

# 更新 wrangler.toml 中的 KV 命名空间 ID
```

### 3. 本地开发

```bash
# 启动本地开发服务器
wrangler dev

# 或使用 npm script
npm run dev
```

### 4. 部署上线

```bash
# 部署到 Cloudflare Workers
wrangler deploy

# 或使用 npm script  
npm run deploy
```

## 🔗 在线演示

访问部署的服务查看完整功能演示和API文档：
**https://your-worker.your-subdomain.workers.dev**

## 📖 API 接口

### 🚀 POST /api/challenge
创建验证挑战，返回50个SHA-256计算题

```javascript
const response = await fetch('/api/challenge', { method: 'POST' });
const { token, challenge, expires } = await response.json();
```

### 🔍 POST /api/redeem  
提交计算结果，获取验证令牌

```javascript
await fetch('/api/redeem', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token, solutions })
});
```

### ✅ POST /api/validate
验证令牌有效性（一次性使用）

```javascript  
const result = await fetch('/api/validate', {
  method: 'POST', 
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token, keepToken: false })
});
```

## ⚙️ 技术参数

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| 挑战数量 | 50 | 每次生成的计算题数量 |
| 难度级别 | 5 | SHA-256前导零个数 |
| 挑战过期 | 10分钟 | 挑战有效期 |
| 令牌过期 | 20分钟 | 验证令牌有效期 |
| 自动清理 | 实时 | 过期数据自动清理 |

## 🛠️ 集成指南

### 前端集成
```html
<!-- 引入 CAP Widget -->
<script src="https://cdn.jsdelivr.net/npm/@cap.js/widget@latest"></script>

<!-- 添加验证组件 -->
<cap-widget onsolve="handleSolve" data-cap-api-endpoint="/api/"></cap-widget>

<script>
function handleSolve(event) {
  const token = event.detail.token;
  // 使用 token 进行后续验证
  validateUser(token);
}
</script>
```

### 后端验证
```javascript
// 验证用户令牌
async function validateUser(token) {
  const response = await fetch('/api/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, keepToken: false })
  });
  
  const result = await response.json();
  if (result.success) {
    // 用户验证通过，执行业务逻辑
    return true;
  }
  return false;
}
```

## 🚀 项目亮点

- ✅ 无服务器架构，零运维成本
- ✅ 毫秒级响应，全球边缘计算  
- ✅ 企业级安全，防机器人攻击
- ✅ 现代化界面，用户体验优秀
- ✅ 完整文档，开箱即用

## 📄 开源协议

MIT License - 自由使用，商业友好

## 🤝 参与贡献

欢迎提交 Issue 和 Pull Request，一起完善项目！