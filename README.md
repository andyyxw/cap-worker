# 🛡️ CAP 验证码服务 - Cloudflare Workers

基于 Cloudflare Workers 构建的高性能验证码服务，使用 CAP (Completely Automated Public) 验证码系统。

## ✨ 特性

- 🚀 **高性能**: 基于 Cloudflare Workers 构建，全球边缘部署
- 🔒 **安全可靠**: 使用 @cap.js/server 库提供企业级安全性
- 💾 **持久存储**: 基于 Cloudflare KV 的状态持久性
- 🎯 **易于集成**: 简单的 REST API 支持各种编程语言
- 🌍 **全球部署**: Cloudflare 全球 CDN 网络支持

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 Cloudflare KV

在 Cloudflare Dashboard 中创建 KV 命名空间，并更新 `wrangler.toml` 中的 KV 命名空间 ID。

### 3. 本地开发

```bash
npm run dev
```

### 4. 部署到 Cloudflare Workers

```bash
npm run deploy
```

## 📖 API 文档

### POST /api/challenge - 创建挑战

创建新的验证码挑战，返回挑战数据和令牌。

**请求示例:**
```javascript
fetch('/api/challenge', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
```

**响应示例:**
```json
{
  "token": "challenge_token_here",
  "challenge": "challenge_data_here"
}
```

### POST /api/redeem - 验证解决方案

提交验证码解决方案进行验证。

**请求参数:**
- `token` (string, required) - 挑战令牌
- `solutions` (number[], required) - 解决方案数组

**请求示例:**
```javascript
fetch('/api/redeem', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: 'challenge_token_here',
    solutions: [1, 2, 3]
  })
})
```

**响应示例:**
```json
{
  "success": true,
  "token": "validated_token_here"
}
```

### POST /api/validate - 验证令牌

验证以前验证的令牌是否仍然有效。

**请求参数:**
- `token` (string, required) - 要验证的令牌
- `keepToken` (boolean, optional) - 是否保留令牌，默认为 false

**请求示例:**
```javascript
fetch('/api/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: 'validated_token_here',
    keepToken: false
  })
})
```

**响应示例:**
```json
{
  "success": true,
  "valid": true
}
```

## 🔧 配置

### 环境变量

在 `wrangler.toml` 中可以配置以下变量：

- `DIFFICULTY`: 挑战难度 (默认: 10000)
- `TIMEOUT`: 挑战超时时间，毫秒 (默认: 300000)

### KV 命名空间

需要在 Cloudflare 中创建 KV 命名空间用于存储挑战数据：

1. 登录 Cloudflare Dashboard
2. 转到 Workers & Pages > KV
3. 创建新的命名空间
4. 更新 `wrangler.toml` 中的命名空间 ID

## 🛠️ 使用流程

1. **创建挑战**: 调用 `/api/challenge` 获取验证码挑战
2. **呈现给用户**: 在前端显示挑战内容，供用户完成
3. **提交解决方案**: 通过 `/api/redeem` 提交用户的答案进行验证
4. **验证令牌**: 使用返回的令牌通过 `/api/validate` 进行后续验证

## 🚨 错误处理

所有 API 在发生错误时会返回适当的 HTTP 状态代码和错误消息：

- `400 Bad Request`: 请求参数或格式无效
- `404 Not Found`: 请求的端点不存在
- `405 Method Not Allowed`: 不支持的请求方法
- `500 Internal Server Error`: 服务器内部错误

## 📝 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 支持

如有问题，请创建 Issue 或联系维护者。