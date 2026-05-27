/**
 * Token 同步诊断工具
 *
 * 使用方法：
 * 1. 在浏览器控制台粘贴执行
 * 2. 查看输出结果，对照预期值
 * 3. 将结果反馈给开发者
 */

(function() {
  console.log('\n========== Token 诊断报告 ==========\n');

  // 1. 检查所有可能的 Token 存储位置
  const storageKeys = [
    'access_token',                    // TokenManager 读取的位置
    'ua:http_client:access_token',     // storage 工具类的 HTTP 命名空间
    'ua:auth:token',                   // 加密存储位置
    'token',                           // 原生 key（无前缀）
  ];

  console.log('📦 Token 存储位置检查:');
  storageKeys.forEach(key => {
    const value = localStorage.getItem(key);
    const status = value ? '✅ 有值' : '❌ 空';
    const preview = value ? `${value.substring(0, 20)}... (${value.length}字符)` : '-';
    console.log(`  ${status} ${key}`);
    console.log(`       值预览: ${preview}\n`);
  });

  // 2. 检查 sessionStorage（某些实现可能用 session）
  console.log('📦 SessionStorage 检查:');
  const sessionToken = sessionStorage.getItem('access_token');
  console.log(`  ${sessionToken ? '✅' : '❌'} access_token: ${sessionToken ? '有值' : '空'}\n`);

  // 3. 模拟 TokenManager 的读取逻辑
  console.log('🔍 模拟 TokenManager.getToken():');
  try {
    const token = localStorage.getItem('access_token');
    if (token) {
      console.log(`  ✅ 能读取到 Token: ${token.substring(0, 30)}...`);
      console.log(`  📏 Token 长度: ${token.length} 字符`);

      // 检查是否是 JWT 格式
      if (token.split('.').length === 3) {
        console.log(`  ✅ 格式正确: JWT Token`);
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          console.log(`  👤 用户信息:`, {
            sub: payload.sub,
            username: payload.username,
            exp: new Date(payload.exp * 1000).toLocaleString(),
            iat: new Date(payload.iat * 1000).toLocaleString(),
          });

          // 检查是否过期
          const now = Math.floor(Date.now() / 1000);
          if (payload.exp < now) {
            console.error(`  ⚠️  Token 已过期! 过期时间: ${new Date(payload.exp * 1000).toLocaleString()}`);
          } else {
            const remaining = Math.floor((payload.exp - now) / 60);
            console.log(`  ⏰ 剩余有效时间: 约 ${remaining} 分钟`);
          }
        } catch (e) {
          console.log(`  ⚠️ 无法解析 JWT payload`);
        }
      } else {
        console.warn(`  ⚠️ 非 JWT 格式 Token`);
      }
    } else {
      console.error(`  ❌ 无法读取 Token! 这就是 menus 401 的原因!`);
    }
  } catch (e) {
    console.error(`  ❌ 读取失败:`, e);
  }

  // 4. 检查 Cookie（备用方案）
  console.log('\n🍪 Cookie 检查:');
  const cookies = document.cookie.split(';').filter(c => c.trim().startsWith('token='));
  if (cookies.length > 0) {
    console.log(`  找到 Token Cookie: ${cookies[0].substring(0, 30)}...`);
  } else {
    console.log(`  无 Token Cookie`);
  }

  // 5. 总结和建议
  console.log('\n========== 诊断结论 ==========');

  const hasNativeToken = !!localStorage.getItem('access_token');
  const hasEncryptedToken = !!localStorage.getItem('ua:auth:token');

  if (!hasNativeToken && hasEncryptedToken) {
    console.error('❌ 问题确认: Token 存在于加密存储，但未同步到原生 localStorage');
    console.error('   原因: syncTokenToHttpClient() 未执行或执行失败');
    console.error('   解决:');
    console.error('     1. 刷新页面触发路由守卫');
    console.error('     2. 检查 utils.ts 第 87-91 行代码是否存在');
    console.error('     3. 查看控制台是否有 [syncToken] 日志');
  } else if (hasNativeToken) {
    console.log('✅ Token 同步正常，问题可能在其他地方');
    console.log('   建议: 检查 Network 标签中 menus 请求的 Request Headers');
  } else {
    console.error('❌ 所有位置都没有 Token，请先登录');
  }

  console.log('\n====================================\n');
})();
