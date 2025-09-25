# Jason Spielman RSS Generator

这是一个为 https://jasonspielman.com 生成RSS订阅的服务，可以轻松部署到 Vercel。

## 功能特点

- 🚀 **自动抓取** - 自动获取 jasonspielman.com 的最新内容
- 📝 **智能解析** - 从网站的JSON数据中提取项目和设计作品信息
- ⚡ **缓存机制** - 内置15分钟缓存，避免频繁请求原网站
- 🔧 **容错处理** - 完善的错误处理和后备机制
- 📱 **标准RSS** - 生成符合RSS 2.0标准的XML格式

## 快速部署到 Vercel

### 方法一：一键部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/你的用户名/jasonspielman-rss)

### 方法二：手动部署

1. **克隆项目**
   ```bash
   git clone https://github.com/你的用户名/jasonspielman-rss.git
   cd jasonspielman-rss
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **部署到Vercel**
   ```bash
   # 安装Vercel CLI（如果还没安装）
   npm i -g vercel
   
   # 登录Vercel
   vercel login
   
   # 部署项目
   vercel
   ```

4. **获取RSS链接**
   部署完成后，你的RSS链接将是：
   ```
   https://your-project-name.vercel.app/api/rss
   ```

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 `http://localhost:3000/api/rss` 查看RSS输出。

## 使用方法

部署成功后，你可以：

1. **在RSS阅读器中订阅**
   - 复制RSS链接：`https://your-project-name.vercel.app/api/rss`
   - 在你喜欢的RSS阅读器（如Feedly、Inoreader等）中添加此链接

2. **在浏览器中查看**
   - 直接访问RSS链接查看XML格式的内容

3. **集成到其他应用**
   - 可以通过HTTP GET请求获取RSS内容

## RSS内容说明

RSS订阅将包含：
- Jason Spielman设计作品集的最新项目
- 项目描述和详情
- 指向原始项目页面的链接
- 自动更新的发布时间

## 技术架构

- **Node.js** - 服务端运行环境
- **Vercel Serverless Functions** - 无服务器部署
- **缓存机制** - 15分钟内存缓存减少请求
- **错误处理** - 多层级后备方案确保服务稳定

## 缓存策略

- **内存缓存**：15分钟本地缓存
- **HTTP缓存**：15分钟浏览器缓存
- **自动更新**：缓存过期后自动获取最新内容

## API接口

### GET /api/rss

返回RSS XML格式的订阅内容。

**响应头：**
- `Content-Type: application/rss+xml; charset=utf-8`
- `Cache-Control: public, max-age=900`

**示例响应：**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Jason Spielman - Design Portfolio</title>
    <link>https://jasonspielman.com</link>
    <description>Latest projects and work from Jason Spielman's design portfolio</description>
    <!-- 项目条目 -->
  </channel>
</rss>
```

## 自定义配置

你可以通过修改代码来自定义：

1. **缓存时间** - 修改 `CACHE_DURATION` 变量
2. **RSS标题和描述** - 修改 `generateRSSXML` 函数中的metadata
3. **内容提取逻辑** - 修改 `extractProjectsFromJSON` 函数

## 常见问题

**Q: RSS为什么没有更新？**
A: 由于缓存机制，RSS内容每15分钟更新一次。

**Q: 可以修改更新频率吗？**
A: 可以，修改代码中的 `CACHE_DURATION` 变量（单位为毫秒）。

**Q: 部署失败怎么办？**
A: 确保已安装所有依赖，并检查Vercel账户配置是否正确。

## 许可证

MIT License

## 贡献

欢迎提交 Issues 和 Pull Requests！

---

**享受你的RSS订阅！** 🎉

现在你可以在任何RSS阅读器中跟踪Jason Spielman的最新设计作品了。