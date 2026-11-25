/* 可心的小乐园 · 离线缓存 Service Worker
   - 页面/脚本/数据：stale-while-revalidate（先用缓存秒开，联网时后台静默更新）
   - 全站朗读用系统 TTS，不再缓存音频
   - 云端同步（家长设置/时长）：跨域请求直接放行，cloud.js 自己有离线兜底 */
var VER='kx-pwa-v25';
var PAGES=VER+'-pages';
var PRECACHE=['/','/cloud.js','/fun.js','/admin-panel.js','/manifest.json',
  '/poems/','/english/','/quiz/','/racing/','/nursery/','/math/','/story/',
  '/icons/icon-192.png','/icons/icon-512.png'];

self.addEventListener('install',function(e){
  e.waitUntil(
    caches.open(PAGES).then(function(c){
      return Promise.all(PRECACHE.map(function(u){
        return c.add(new Request(u,{cache:'reload'})).catch(function(){});
      }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate',function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        if(k===PAGES) return;
        /* 旧版页面缓存与历史音频池一并清除：音频已改用系统朗读 */
        return caches.delete(k);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

function swr(req){
  var fetching=fetch(req).then(function(resp){
    if(resp&&resp.status===200&&resp.type==='basic'){
      var copy=resp.clone();
      caches.open(PAGES).then(function(c){ c.put(req,copy); });
    }
    return resp;
  }).catch(function(){ return null; });
  return caches.match(req).then(function(hit){
    return hit||fetching.then(function(resp){
      return resp||new Response('离线且未缓存',{status:503,statusText:'offline'});
    });
  });
}
/* 页面导航：网络优先，联网时永远拿最新页面，断网才用缓存。
   避免旧缓存的页面配上新数据格式导致白屏/错乱。 */
function navFirst(req){
  return fetch(req).then(function(resp){
    if(resp&&resp.status===200&&resp.type==='basic'){
      var copy=resp.clone();
      caches.open(PAGES).then(function(c){ c.put(req,copy); });
    }
    return resp;
  }).catch(function(){
    return caches.match(req).then(function(hit){
      return hit||caches.match('/').then(function(h2){
        return h2||new Response('离线且未缓存',{status:503,statusText:'offline'});
      });
    });
  });
}

self.addEventListener('fetch',function(e){
  var req=e.request;
  if(req.method!=='GET') return;
  var url=new URL(req.url);
  if(url.origin!==self.location.origin) return; /* 云端网关等跨域直接放行 */
  if(req.mode==='navigate'){ e.respondWith(navFirst(req)); return; } /* 页面导航网络优先 */
  e.respondWith(swr(req));
});
