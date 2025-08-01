import Cap from '@cap.js/server';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    try {
      // Load state from KV storage
      const challengesData = await env.CAP_KV.get('challenges') || '{}';
      const tokensData = await env.CAP_KV.get('tokens') || '{}';
      
      const capState = {
        challengesList: JSON.parse(challengesData),
        tokensList: JSON.parse(tokensData)
      };

      // Initialize Cap with KV-backed state
      let cap;
      try {
        cap = new Cap({
          noFSState: true,
          state: capState,
        });
      } catch (capError) {
        console.error('Cap initialization error:', capError);
        throw capError;
      }

      // Clean expired challenges and tokens
      const cleanExpiredData = () => {
        const now = Date.now();
        
        // Clean expired challenges (delete immediately when expired)
        Object.keys(capState.challengesList).forEach(token => {
          const challenge = capState.challengesList[token];
          if (challenge && challenge.expires && now > challenge.expires) {
            delete capState.challengesList[token];
          }
        });
        
        // Clean expired tokens (delete immediately when expired for security)
        Object.keys(capState.tokensList).forEach(token => {
          const tokenData = capState.tokensList[token];
          if (tokenData && tokenData.expires && now > tokenData.expires) {
            delete capState.tokensList[token];
          }
        });
      };

      // Save state back to KV after each operation
      const saveState = async () => {
        // Clean expired data before saving
        cleanExpiredData();
        
        await Promise.all([
          env.CAP_KV.put('challenges', JSON.stringify(capState.challengesList)),
          env.CAP_KV.put('tokens', JSON.stringify(capState.tokensList))
        ]);
      };

      // Route handling
      switch (path) {
        case '/':
          return handleHome();
        case '/api/':
        case '/api/challenge':
          if (request.method === 'POST') {
            const result = await handleChallenge(request, cap, corsHeaders, env);
            await saveState();
            return result;
          }
          return handleHome();
        case '/api/redeem':
          const redeemResult = await handleRedeem(request, cap, corsHeaders, capState);
          await saveState();
          return redeemResult;
        case '/api/validate':
          const validateResult = await handleValidate(request, cap, corsHeaders);
          await saveState();
          return validateResult;
        case '/api/clear-all':
          const clearResult = await handleClearAll(request, corsHeaders, capState, env, cap);
          return clearResult;
        default:
          return new Response(JSON.stringify({ error: 'Not Found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
      }
    } catch (error) {
      console.error('Error:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};

// Home page with demo
function handleHome() {
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🛡️ Cloudflare Workers 上的 CAP 验证码服务</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.7;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1000px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
            animation: fadeInUp 0.8s ease-out;
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .header {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }
        
        h1 {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .subtitle {
            font-size: 1.1rem;
            opacity: 0.9;
            font-weight: 300;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 25px;
            margin: 40px 0;
        }
        
        .feature {
            text-align: center;
            padding: 30px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 15px;
            box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
            transform: translateY(0);
            transition: all 0.3s ease;
        }
        
        .feature:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 35px rgba(102, 126, 234, 0.4);
        }
        
        .feature h3 {
            font-size: 1.3rem;
            margin-bottom: 15px;
            font-weight: 600;
        }
        
        .feature p {
            opacity: 0.9;
            line-height: 1.6;
        }
        
        .demo {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            padding: 30px;
            border-radius: 15px;
            margin: 30px 0;
            text-align: center;
            box-shadow: 0 10px 25px rgba(240, 147, 251, 0.3);
        }
        
        .demo h3 {
            font-size: 1.5rem;
            margin-bottom: 15px;
            font-weight: 600;
        }
        
        .demo p {
            opacity: 0.9;
            margin-bottom: 20px;
        }
        
        #captcha-widget {
            background: rgba(255, 255, 255, 0.15);
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
            backdrop-filter: blur(5px);
        }
        
        button {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 1rem;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: 0 5px 15px rgba(79, 172, 254, 0.4);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        button:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(79, 172, 254, 0.6);
        }
        
        button:disabled {
            background: linear-gradient(135deg, #a0a0a0 0%, #808080 100%);
            cursor: not-allowed;
            box-shadow: none;
        }
        
        .api-doc {
            background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
            padding: 30px;
            border-radius: 15px;
            margin: 30px 0;
            box-shadow: 0 10px 25px rgba(168, 237, 234, 0.3);
        }
        
        .api-doc h3 {
            color: #2d3748;
            font-size: 1.8rem;
            margin-bottom: 25px;
            font-weight: 700;
            text-align: center;
        }
        
        .api-doc h4 {
            color: #2d3748;
            font-size: 1.3rem;
            margin: 25px 0 15px 0;
            font-weight: 600;
            border-left: 4px solid #4facfe;
            padding-left: 15px;
        }
        
        .api-doc p {
            color: #4a5568;
            margin-bottom: 10px;
        }
        
        .api-doc ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        
        .api-doc li {
            color: #4a5568;
            margin-bottom: 5px;
        }
        
        code {
            background: rgba(45, 55, 72, 0.1);
            padding: 3px 8px;
            border-radius: 6px;
            font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
            font-size: 0.9rem;
            color: #2d3748;
            border: 1px solid rgba(79, 172, 254, 0.2);
        }
        
        .api-doc code {
            display: block;
            background: rgba(45, 55, 72, 0.05);
            padding: 15px;
            border-radius: 10px;
            margin: 10px 0;
            white-space: pre-wrap;
            border: 1px solid rgba(79, 172, 254, 0.1);
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
        }
        
        /* 响应式设计 */
        @media (max-width: 768px) {
            body {
                padding: 10px;
            }
            
            .header {
                padding: 30px 20px;
            }
            
            h1 {
                font-size: 2rem;
            }
            
            .content {
                padding: 30px 20px;
            }
            
            .features {
                grid-template-columns: 1fr;
                gap: 20px;
            }
            
            .feature {
                padding: 25px 15px;
            }
        }
        
        /* 滚动条美化 */
        ::-webkit-scrollbar {
            width: 8px;
        }
        
        ::-webkit-scrollbar-track {
            background: #f1f1f1;
        }
        
        ::-webkit-scrollbar-thumb {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ CAP 验证码服务</h1>
            <p class="subtitle">基于 Cloudflare Workers 构建的现代化验证码解决方案</p>
        </div>
        <div class="content">
        

        <div class="demo">
            <h3>验证码演示</h3>
            <p>请完成下方验证码验证后点击登录</p>
            <div id="captcha-widget" style="margin: 20px 0;">
                <cap-widget id="cap" onsolve="handleSolve" data-cap-api-endpoint="/api/"></cap-widget>
            </div>
            <button id="login-btn" onclick="handleLogin()" disabled style="opacity: 0.5; cursor: not-allowed;">登录</button>
        </div>

        <div class="api-doc">
            <h3>📚 API 文档</h3>
            
            <h4>🚀 POST /api/challenge - 创建挑战</h4>
            <p><strong>功能：</strong>创建新的验证码挑战，返回挑战数据供客户端计算</p>
            <p><strong>请求：</strong></p>
            <code>
fetch('/api/challenge', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
            </code>
            <p><strong>响应示例：</strong></p>
            <code>
{
  "token": "abc123...",
  "challenge": [
    ["salt1", "target1"],
    ["salt2", "target2"],
    ...
  ],
  "expires": "2024-01-01T12:00:00.000Z",
  "challengeCount": 50,
  "challengeDifficulty": 4
}
            </code>
            
            <h4>🔍 POST /api/redeem - 提交解决方案</h4>
            <p><strong>功能：</strong>提交验证码计算结果，验证通过后返回验证令牌</p>
            <p><strong>请求参数：</strong></p>
            <ul>
                <li><code>token</code> - 挑战令牌</li>
                <li><code>solutions</code> - 计算结果数组</li>
            </ul>
            <code>
fetch('/api/redeem', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: "abc123...",
    solutions: [12345, 67890, ...]
  })
})
            </code>
            <p><strong>响应示例：</strong></p>
            <code>
{
  "success": true,
  "token": "verified_token_xyz",
  "expires": "2024-01-01T12:20:00.000Z"
}
            </code>
            
            <h4>✅ POST /api/validate - 验证令牌</h4>
            <p><strong>功能：</strong>验证已获得的令牌是否有效，用于实际业务逻辑验证</p>
            <p><strong>请求参数：</strong></p>
            <ul>
                <li><code>token</code> - 验证令牌</li>
                <li><code>keepToken</code> - 是否保留令牌（默认false，验证后删除）</li>
            </ul>
            <code>
fetch('/api/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: "verified_token_xyz",
    keepToken: false
  })
})
            </code>
            <p><strong>响应示例：</strong></p>
            <code>
{
  "success": true
}
            </code>
            
            <h4>🔧 集成示例</h4>
            <p><strong>JavaScript 完整集成：</strong></p>
            <code>
// 1. 创建挑战
const challenge = await fetch('/api/challenge', { method: 'POST' });
const challengeData = await challenge.json();

// 2. 使用 CAP Widget 自动处理验证
// &lt;cap-widget onsolve="handleSolve" data-cap-api-endpoint="/api/"&gt;&lt;/cap-widget&gt;

function handleSolve(event) {
  const verifiedToken = event.detail.token;
  
  // 3. 在业务逻辑中验证令牌
  fetch('/api/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: verifiedToken, keepToken: false })
  })
  .then(res => res.json())
  .then(result => {
    if (result.success) {
      console.log('用户验证通过，可以执行业务逻辑');
    }
  });
}
            </code>
            
            <h4>⚙️ 配置参数</h4>
            <ul>
                <li><strong>挑战数量：</strong>50个计算题</li>
                <li><strong>难度级别：</strong>4（需要4个前导零）</li>
                <li><strong>挑战过期：</strong>10分钟</li>
                <li><strong>令牌过期：</strong>20分钟</li>
                <li><strong>安全特性：</strong>令牌一次性使用，自动清理过期数据</li>
            </ul>
            
            <h4>🛡️ 安全特性</h4>
            <ul>
                <li><strong>防重放攻击：</strong>令牌验证后自动删除</li>
                <li><strong>自动清理：</strong>过期挑战和令牌自动清理</li>
                <li><strong>SHA-256 PoW：</strong>基于工作量证明的安全验证</li>
                <li><strong>全球分布：</strong>Cloudflare Workers 边缘计算</li>
            </ul>
        </div>
        
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/@cap.js/widget@latest"></script>
    <script>
        let verifiedToken = '';
        
        // 处理 CAP widget 解决事件
        function handleSolve(event) {
            const token = event.detail.token;
            if (token) {
                verifiedToken = token;
                // 启用登录按钮
                const loginBtn = document.getElementById('login-btn');
                loginBtn.disabled = false;
                loginBtn.style.opacity = '1';
                loginBtn.style.cursor = 'pointer';
                loginBtn.style.backgroundColor = '#28a745';
                loginBtn.textContent = '登录 (已验证)';
            }
        }
        
        async function handleLogin() {
            if (!verifiedToken) {
                alert('请先完成验证码验证！');
                return;
            }
            
            try {
                // 验证token是否仍然有效
                const response = await fetch('/api/validate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token: verifiedToken,
                        keepToken: false // 验证后删除token
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert('🎉 登录成功！\\n\\n欢迎使用我们的服务！');
                    
                    // 重置状态
                    verifiedToken = '';
                    const loginBtn = document.getElementById('login-btn');
                    loginBtn.disabled = true;
                    loginBtn.style.opacity = '0.5';
                    loginBtn.style.cursor = 'not-allowed';
                    loginBtn.style.backgroundColor = '';
                    loginBtn.textContent = '登录';
                    
                    // 重新加载验证码
                    const widget = document.getElementById('captcha-widget');
                    widget.innerHTML = '<cap-widget id="cap" onsolve="handleSolve" data-cap-api-endpoint="/api/"></cap-widget>';
                } else {
                    alert('❌ 登录失败！\\n\\n验证码已过期，请重新验证。');
                    // 重置状态
                    verifiedToken = '';
                    const loginBtn = document.getElementById('login-btn');
                    loginBtn.disabled = true;
                    loginBtn.style.opacity = '0.5';
                    loginBtn.style.cursor = 'not-allowed';
                    loginBtn.style.backgroundColor = '';
                    loginBtn.textContent = '登录';
                }
            } catch (error) {
                alert('登录过程中发生错误: ' + error.message);
            }
        }
    </script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// Handle POST /api/challenge
async function handleChallenge(request, cap, corsHeaders, env) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const challenge = await cap.createChallenge({
      challengeCount: 50, // Match reference APIs
      challengeSize: 32, // Default salt size
      challengeDifficulty: 5, // Number of leading zeros required (default)
      expiresMs: 600000, // 10 minutes (CAP.js default)
    });
    console.log('Created challenge:', challenge);
    console.log('Current time:', Date.now(), 'Challenge expires in:', challenge.expires - Date.now(), 'ms');
    
    // Convert expires to ISO string for widget compatibility
    const challengeResponse = {
      ...challenge,
      expires: new Date(challenge.expires).toISOString()
    };
    
    return new Response(JSON.stringify(challengeResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Challenge creation error:', error);
    return new Response(JSON.stringify({ error: 'Failed to create challenge' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Handle POST /api/redeem
async function handleRedeem(request, cap, corsHeaders, capState) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    console.log('Redeem request body:', body);
    
    const { token, solutions } = body;

    if (!token || !solutions) {
      return new Response(JSON.stringify({ error: 'Missing token or solutions' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Redeeming challenge for token:', token, 'with solutions:', solutions);
    
    // Get the challenge data to extract salt and target values
    const challengeData = capState.challengesList[token];
    if (!challengeData) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Challenge not found for token' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('Challenge data for token:', challengeData);
    
    // Transform solutions from [number1, number2, ...] to [[salt1, target1, solution1], [salt2, target2, solution2], ...]
    const transformedSolutions = [];
    if (challengeData.challenge && Array.isArray(solutions)) {
      challengeData.challenge.forEach((challenge, index) => {
        if (solutions[index] !== undefined) {
          const [salt, target] = challenge;
          transformedSolutions.push([salt, target, solutions[index]]);
        }
      });
    }
    
    console.log('Transformed solutions:', transformedSolutions);
    
    // Use the correct CAP API method: redeemChallenge with properly formatted solutions
    const result = await cap.redeemChallenge({ token, solutions: transformedSolutions });
    
    console.log('Verification result:', result);
    console.log('Current time:', Date.now(), 'Token expires in:', result.expires - Date.now(), 'ms');
    
    // Ensure response format matches what CAP widget expects
    if (result && result.success) {
      const redeemResponse = {
        success: true,
        token: result.token || token
      };
      
      // Convert expires to ISO string if present
      if (result.expires) {
        redeemResponse.expires = new Date(result.expires).toISOString();
      }
      
      return new Response(JSON.stringify(redeemResponse), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: result?.error || 'Invalid solution'
      }), {
        status: 200, // CAP widget may expect 200 even for failed validation
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Solution verification error:', error);
    console.error('Error stack:', error.stack);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Failed to verify solution',
      details: error.message 
    }), {
      status: 200, // Return 200 to avoid widget treating it as network error
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Handle POST /api/validate
async function handleValidate(request, cap, corsHeaders) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { token, keepToken = false } = body;

    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing token' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await cap.validateToken(token, { keepToken });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Token validation error:', error);
    return new Response(JSON.stringify({ error: 'Failed to validate token' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Handle POST /api/clear-all
async function handleClearAll(request, corsHeaders, capState, env, cap) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing token. Please complete a challenge first.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use CAP.js standard validation - this will automatically handle token validation and cleanup
    const validationResult = await cap.validateToken(token, { keepToken: false });
    
    if (!validationResult.success) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid or expired token. Please complete a challenge first.' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Token validated successfully via CAP.js, proceeding with clear-all');

    // Clear all data
    const challengesCount = Object.keys(capState.challengesList).length;
    const tokensCount = Object.keys(capState.tokensList).length;
    
    capState.challengesList = {};
    capState.tokensList = {};

    // Save cleared data to KV
    await Promise.all([
      env.CAP_KV.put('challenges', JSON.stringify({})),
      env.CAP_KV.put('tokens', JSON.stringify({}))
    ]);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'All data cleared successfully',
      cleared: {
        challenges: challengesCount,
        tokens: tokensCount
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Clear all data error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Failed to clear data' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}