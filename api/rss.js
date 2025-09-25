const fetch = require('node-fetch');

// 缓存变量
let cachedData = null;
let cacheTime = null;
const CACHE_DURATION = 30 * 60 * 1000; // 30分钟（由于需要获取全文，适当增加缓存时间）

// 获取项目页面的完整内容
const fetchProjectContent = async (projectUrl) => {
  try {
    console.log(`Fetching content for: ${projectUrl}`);
    
    const response = await fetch(projectUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RSS-Generator/1.0)'
      }
    });
    
    if (!response.ok) {
      console.log(`Failed to fetch ${projectUrl}: ${response.status}`);
      return null;
    }
    
    const html = await response.text();
    
    // 尝试从HTML中提取JSON数据URL
    const jsonUrlMatch = html.match(/"preload"[^>]*href="([^"]*\/_json\/[^"]*\.json)"/);
    
    if (!jsonUrlMatch) {
      console.log('No JSON URL found in project page');
      return null;
    }
    
    const jsonUrl = `https://jasonspielman.com${jsonUrlMatch[1]}`;
    console.log('Found project JSON URL:', jsonUrl);
    
    // 获取项目JSON数据
    const jsonResponse = await fetch(jsonUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RSS-Generator/1.0)'
      }
    });
    
    if (!jsonResponse.ok) {
      console.log(`Failed to fetch project JSON: ${jsonResponse.status}`);
      return null;
    }
    
    const jsonData = await jsonResponse.json();
    
    // 从JSON数据中提取文本内容
    let fullContent = '';
    const images = [];
    
    if (jsonData && jsonData.nodeById) {
      const nodes = jsonData.nodeById;
      
      Object.keys(nodes).forEach(nodeId => {
        const node = nodes[nodeId];
        
        // 提取文本内容
        if (node.type === 'TEXT' && node.characters) {
          const text = node.characters.trim();
          if (text.length > 10) { // 忽略很短的文本
            fullContent += `<p>${text.replace(/\n/g, '<br>')}</p>\n`;
          }
        }
        
        // 提取图片
        if (node.type === 'RECTANGLE' && node.fills && node.fills.length > 0) {
          const fill = node.fills[0];
          if (fill.type === 'IMAGE' && fill.imageRef) {
            images.push(`<img src="https://jasonspielman.com/_images/${fill.imageRef}" alt="Project Image" style="max-width: 100%; height: auto; margin: 10px 0;"/>`);
          }
        }
      });
    }
    
    // 组合完整内容
    let content = fullContent;
    if (images.length > 0) {
      content = images.join('\n') + '\n' + content;
    }
    
    return content || null;
    
  } catch (error) {
    console.error(`Error fetching project content from ${projectUrl}:`, error);
    return null;
  }
};

// RSS模板
const generateRSSXML = (items) => {
  const now = new Date().toUTCString();
  
  const rssItems = items.map(item => {
    // 如果有完整内容，使用content:encoded标签
    let contentSection = '';
    if (item.fullContent) {
      contentSection = `
      <content:encoded><![CDATA[${item.fullContent}]]></content:encoded>`;
    }
    
    return `
    <item>
      <title><![CDATA[${item.title}]]></title>
      <link>${item.link}</link>
      <description><![CDATA[${item.description}]]></description>${contentSection}
      <pubDate>${item.pubDate}</pubDate>
      <guid isPermaLink="false">${item.guid}</guid>
      <category>Design</category>
      <author>Jason Spielman</author>
    </item>
  `;
  }).join('');

  const rssUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}/api/rss` 
    : 'https://jasonspielman-rss.vercel.app/api/rss';

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Jason Spielman - Design Portfolio</title>
    <link>https://jasonspielman.com</link>
    <description>Latest projects and design work from Jason Spielman's portfolio - featuring UX design, brand identity, and innovative digital experiences</description>
    <language>en-us</language>
    <lastBuildDate>${now}</lastBuildDate>
    <managingEditor>jason@jasonspielman.com (Jason Spielman)</managingEditor>
    <webMaster>jason@jasonspielman.com (Jason Spielman)</webMaster>
    <category>Design</category>
    <category>UX</category>
    <category>Portfolio</category>
    <ttl>900</ttl>
    <atom:link href="${rssUrl}" rel="self" type="application/rss+xml"/>
    <image>
      <url>https://jasonspielman.com/favicon.ico</url>
      <title>Jason Spielman - Design Portfolio</title>
      <link>https://jasonspielman.com</link>
    </image>
    ${rssItems}
  </channel>
</rss>`;
};

// 从JSON数据中提取项目信息
const extractProjectsFromJSON = (jsonData) => {
  const projects = [];
  
  try {
    if (!jsonData || !jsonData.nodeById) {
      console.log('Invalid JSON data structure');
      return projects;
    }

    const nodes = jsonData.nodeById;
    const processedItems = new Set(); // 避免重复项目
    
    // 查找包含项目信息的节点
    Object.keys(nodes).forEach(nodeId => {
      const node = nodes[nodeId];
      
      // 查找交互节点，可能包含项目链接
      if (node.interactions && Array.isArray(node.interactions)) {
        node.interactions.forEach(interaction => {
          if (interaction.actions && interaction.actions.length > 0) {
            const action = interaction.actions[0];
            if (action.connectionURL && action.connectionURL.startsWith('/') && 
                !action.connectionURL.includes('http') && action.connectionURL.length > 1) {
              // 这是一个内部项目页面链接
              const projectName = action.connectionURL.replace('/', '').replace('-', ' ');
              if (projectName && projectName.length > 0 && projectName.length < 30) {
                const projectKey = `project-${projectName}`;
                if (!processedItems.has(projectKey)) {
                  processedItems.add(projectKey);
                  const project = {
                    title: `${projectName.charAt(0).toUpperCase() + projectName.slice(1)} - New Project`,
                    link: `https://jasonspielman.com${action.connectionURL}`,
                    description: `Explore Jason Spielman's latest ${projectName} project - featuring innovative design work, UX research, and creative solutions.`,
                    pubDate: new Date().toUTCString(),
                    guid: `jasonspielman-project-${nodeId}-${Date.now()}`,
                    projectUrl: `https://jasonspielman.com${action.connectionURL}` // 保存项目URL用于获取全文
                  };
                  
                  projects.push(project);
                }
              }
            }
          }
        });
      }
      
      // 查找文本节点，特别是包含项目描述的节点
      if (node.type === 'TEXT' && node.characters) {
        const text = node.characters.toLowerCase();
        const chars = node.characters.trim();
        
        // 查找包含项目相关关键词的有意义文本
        if (chars.length > 30 && chars.length < 200 && 
            (text.includes('design') || text.includes('developed') || text.includes('led') ||
             text.includes('identity') || text.includes('brand') || text.includes('ux'))) {
          
          const textKey = `text-${chars.substring(0, 20)}`;
          if (!processedItems.has(textKey)) {
            processedItems.add(textKey);
            
            // 生成项目条目
            const title = chars.length > 80 
              ? chars.substring(0, 77) + '...'
              : chars;
            
            const project = {
              title: title.replace(/\n/g, ' ').trim(),
              link: 'https://jasonspielman.com',
              description: chars.replace(/\n/g, ' ').trim(),
              pubDate: new Date().toUTCString(),
              guid: `jasonspielman-text-${nodeId}-${Date.now()}`
            };
            
            projects.push(project);
          }
        }
      }
    });
    
    // 如果没有找到足够的项目，添加一些默认项目
    if (projects.length === 0) {
      projects.push({
        title: 'Jason Spielman - Design Portfolio',
        link: 'https://jasonspielman.com',
        description: 'Latest design work and projects from Jason Spielman. Check out the portfolio for UX design, brand identity, and digital experiences.',
        pubDate: new Date().toUTCString(),
        guid: `jasonspielman-default-${Date.now()}`
      });
    }
    
    // 限制结果数量并去重
    const uniqueProjects = projects
      .filter((project, index, self) => 
        index === self.findIndex(p => p.title === project.title)
      )
      .slice(0, 10);
    
    console.log(`Found ${uniqueProjects.length} projects`);
    
    // 临时禁用全文获取功能进行调试
    console.log('Skipping full content fetching for now - debugging');
    return uniqueProjects;
    
    /* TODO: 重新启用全文获取
    // 为前5个项目获取完整内容（避免过多请求）
    const projectsWithContent = await Promise.all(
      uniqueProjects.slice(0, 5).map(async (project, index) => {
        if (project.projectUrl) {
          console.log(`Fetching full content for project ${index + 1}/${Math.min(5, uniqueProjects.length)}`);
          const fullContent = await fetchProjectContent(project.projectUrl);
          return {
            ...project,
            fullContent: fullContent
          };
        }
        return project;
      })
    );
    
    // 结合有完整内容的项目和其余项目
    const finalProjects = [
      ...projectsWithContent,
      ...uniqueProjects.slice(5)
    ];
    
    console.log(`Processed ${finalProjects.length} projects, ${projectsWithContent.filter(p => p.fullContent).length} with full content`);
    return finalProjects;
    */
    
  } catch (error) {
    console.error('Error extracting projects from JSON:', error);
    
    // 返回默认项目
    return [{
      title: 'Jason Spielman - Design Portfolio',
      link: 'https://jasonspielman.com',
      description: 'Latest design work and projects from Jason Spielman. Visit the site to see UX design, brand identity, and digital experiences.',
      pubDate: new Date().toUTCString(),
      guid: `jasonspielman-fallback-${Date.now()}`
    }];
  }
};

// 获取网站数据
const fetchWebsiteData = async () => {
  try {
    console.log('Fetching website data...');
    
    // 首先获取主页HTML以找到JSON URL
    const htmlResponse = await fetch('https://jasonspielman.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RSS-Generator/1.0)'
      }
    });
    
    if (!htmlResponse.ok) {
      throw new Error(`Failed to fetch HTML: ${htmlResponse.status}`);
    }
    
    const html = await htmlResponse.text();
    
    // 从HTML中提取JSON URL
    const jsonUrlMatch = html.match(/"preload"[^>]*href="([^"]*\/_json\/[^"]*\.json)"/);
    
    if (!jsonUrlMatch) {
      console.log('JSON URL not found in HTML, using fallback data');
      return [{
        title: 'Jason Spielman - Design Portfolio',
        link: 'https://jasonspielman.com',
        description: 'Visit Jason Spielman\'s portfolio to see latest design work including UX design, brand identity, and digital experiences.',
        pubDate: new Date().toUTCString(),
        guid: `jasonspielman-html-fallback-${Date.now()}`
      }];
    }
    
    const jsonUrl = `https://jasonspielman.com${jsonUrlMatch[1]}`;
    console.log('Found JSON URL:', jsonUrl);
    
    // 获取JSON数据
    const jsonResponse = await fetch(jsonUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RSS-Generator/1.0)'
      }
    });
    
    if (!jsonResponse.ok) {
      throw new Error(`Failed to fetch JSON: ${jsonResponse.status}`);
    }
    
    const jsonData = await jsonResponse.json();
    console.log('JSON data fetched successfully');
    
    return extractProjectsFromJSON(jsonData);
    
  } catch (error) {
    console.error('Error fetching website data:', error);
    
    // 返回静态内容作为后备
    return [{
      title: 'Jason Spielman - Design Portfolio',
      link: 'https://jasonspielman.com',
      description: 'Jason Spielman is a designer focused on UX design, brand identity, and digital experiences. Visit the portfolio to see the latest work.',
      pubDate: new Date().toUTCString(),
      guid: `jasonspielman-error-fallback-${Date.now()}`
    }];
  }
};

// 主处理函数
export default async function handler(req, res) {
  try {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // 处理OPTIONS预检请求
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    // 只允许GET和HEAD请求
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
    // 检查缓存
    const now = Date.now();
    if (cachedData && cacheTime && (now - cacheTime < CACHE_DURATION)) {
      console.log('Using cached data');
      res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=900'); // 15分钟缓存
      res.setHeader('Content-Length', Buffer.byteLength(cachedData, 'utf-8'));
      
      // 对于HEAD请求，只返回头信息
      if (req.method === 'HEAD') {
        return res.status(200).end();
      }
      
      return res.status(200).send(cachedData);
    }
    
    console.log('Fetching fresh data...');
    const projects = await fetchWebsiteData();
    const rssXML = generateRSSXML(projects);
    
    // 更新缓存
    cachedData = rssXML;
    cacheTime = now;
    
    // 设置响应头
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=900'); // 15分钟缓存
    res.setHeader('Content-Length', Buffer.byteLength(rssXML, 'utf-8'));
    
    // 对于HEAD请求，只返回头信息
    if (req.method === 'HEAD') {
      return res.status(200).end();
    }
    
    return res.status(200).send(rssXML);
    
  } catch (error) {
    console.error('RSS generation error:', error);
    
    // 返回错误RSS
    const errorRSS = generateRSSXML([{
      title: 'RSS Service Error',
      link: 'https://jasonspielman.com',
      description: 'There was an error generating the RSS feed. Please try again later.',
      pubDate: new Date().toUTCString(),
      guid: `error-${Date.now()}`
    }]);
    
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Content-Length', Buffer.byteLength(errorRSS, 'utf-8'));
    
    // 对于HEAD请求，只返回头信息
    if (req.method === 'HEAD') {
      return res.status(500).end();
    }
    
    return res.status(500).send(errorRSS);
  }
}