/* 可心的小乐园 · 离线缓存 Service Worker
   - 页面/脚本/数据：stale-while-revalidate（先用缓存秒开，联网时后台静默更新）
   - 音频 mp3：缓存优先，点过一次就留在手机里，断网也能听
   - 云端同步（家长设置/时长）：跨域请求直接放行，cloud.js 自己有离线兜底 */
var VER='kx-pwa-v25';
var PAGES=VER+'-pages';
/* 音频池用固定名：一键下载的几百MB不随版本升级被清掉 */
var AUDIO='kexin-audio-v1';
var AUDIO_MAX=20000; /* 音频上限放宽到2万（远超全部5097个），不再淘汰已下载内容 */
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
        if(k===AUDIO) return;                       /* 音频池永久保留 */
        if(k.indexOf(VER)!==0) return caches.delete(k);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

function isAudio(url){ return /\.(mp3|mp4|m4a|ogg|wav)(\?|$)/.test(url.pathname); }

function trimAudio(c){
  c.keys().then(function(keys){
    if(keys.length>AUDIO_MAX){
      keys.slice(0,keys.length-AUDIO_MAX).forEach(function(k){ c.delete(k); });
    }
  });
}

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

function audioResp(req,url){
  /* 音频请求可能带 Range 头：一律换成不带 Range 的干净请求去命中/下载完整文件，
     返回完整 200，浏览器媒体元素同样能播 */
  var clean=new Request(url.href,{method:'GET'});
  return caches.open(AUDIO).then(function(c){
    return c.match(clean).then(function(hit){
      if(hit) return hit;
      return fetch(clean).then(function(resp){
        if(resp&&resp.status===200&&resp.type==='basic'){
          var copy=resp.clone();
          c.put(clean,copy).then(function(){ trimAudio(c); });
        }
        return resp;
      }).catch(function(){
        return new Response('',{status:504,statusText:'offline-audio'});
      });
    });
  });
}

self.addEventListener('fetch',function(e){
  var req=e.request;
  if(req.method!=='GET') return;
  var url=new URL(req.url);
  if(url.origin!==self.location.origin) return; /* 云端网关等跨域直接放行 */
  if(isAudio(url)){ e.respondWith(audioResp(req,url)); return; }
  if(req.mode==='navigate'){ e.respondWith(navFirst(req)); return; } /* 页面导航网络优先 */
  e.respondWith(swr(req));
});
