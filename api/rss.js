const fetch = require('node-fetch');

// 缓存变量
let cachedData = null;
let cacheTime = null;
const CACHE_DURATION = 15 * 60 * 1000; // 15分钟

// RSS模板
const generateRSSXML = (items) => {
  const now = new Date().toUTCString();
  
  const rssItems = items.map(item => `
    <item>
      <title><![CDATA[${item.title}]]></title>
      <link>${item.link}</link>
      <description><![CDATA[${item.description}]]></description>
      <pubDate>${item.pubDate}</pubDate>
      <guid isPermaLink="false">${item.guid}</guid>
    </item>
  `).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Jason Spielman - Design Portfolio</title>
    <link>https://jasonspielman.com</link>
    <description>Latest projects and work from Jason Spielman's design portfolio</description>
    <language>en-us</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/rss" rel="self" type="application/rss+xml"/>
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
    
    // 查找包含项目信息的节点
    Object.keys(nodes).forEach(nodeId => {
      const node = nodes[nodeId];
      
      // 查找文本节点，特别是包含项目描述的节点
      if (node.type === 'TEXT' && node.characters) {
        const text = node.characters.toLowerCase();
        
        // 查找包含项目相关关键词的文本
        if (text.includes('design') || text.includes('project') || text.includes('led') || 
            text.includes('developed') || text.includes('identity') || text.includes('brand')) {
          
          // 生成项目条目
          const title = node.characters.length > 100 
            ? node.characters.substring(0, 97) + '...'
            : node.characters;
          
          const project = {
            title: title.replace(/\n/g, ' ').trim(),
            link: 'https://jasonspielman.com',
            description: node.characters.replace(/\n/g, ' ').trim(),
            pubDate: new Date().toUTCString(),
            guid: `jasonspielman-${nodeId}-${Date.now()}`
          };
          
          projects.push(project);
        }
      }
      
      // 查找交互节点，可能包含项目链接
      if (node.interactions && Array.isArray(node.interactions)) {
        node.interactions.forEach(interaction => {
          if (interaction.actions && interaction.actions.length > 0) {
            const action = interaction.actions[0];
            if (action.connectionURL && action.connectionURL.includes('/')) {
              // 这可能是一个项目页面链接
              const projectName = action.connectionURL.replace('/', '').replace('-', ' ');
              if (projectName && projectName.length > 0) {
                const project = {
                  title: `${projectName.charAt(0).toUpperCase() + projectName.slice(1)} Project`,
                  link: `https://jasonspielman.com${action.connectionURL}`,
                  description: `View the ${projectName} project details and case study.`,
                  pubDate: new Date().toUTCString(),
                  guid: `jasonspielman-link-${nodeId}-${Date.now()}`
                };
                
                projects.push(project);
              }
            }
          }
        });
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
    return uniqueProjects;
    
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
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // 只允许GET请求
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
    // 检查缓存
    const now = Date.now();
    if (cachedData && cacheTime && (now - cacheTime < CACHE_DURATION)) {
      console.log('Using cached data');
      res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=900'); // 15分钟缓存
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
    return res.status(500).send(errorRSS);
  }
}