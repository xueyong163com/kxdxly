# 可心小乐园

给学龄前孩子做的中文学习网站，手机上用为主。8 个模块，点字就能听，能背诗、唱儿歌、讲故事、读绘本，全部内容可离线缓存。

线上地址：https://western-hoverfly-d2e1rst4e6d0a01-1468714906.tcloudbaseapp.com/

## 八个模块

| 目录 | 内容 |
|------|------|
| `index.html` | 首页，含一键离线下载 |
| `poems/` | 303 首古诗，带「我来背」录音 |
| `english/` | 英语：拼读、绘本、场景对话、班尼 |
| `nursery/` | 儿歌，带「我来唱」录音 |
| `story/` | 8 个童话故事，逐句朗读，带「我来讲」录音 |
| `math/` | 330 道数学题，23 种题型 |
| `quiz/` | 知识问答 |
| `racing/` | 赛车识物、认时间 |

## 几个公共文件

- `sw.js`：Service Worker，负责离线缓存。改了页面内容要升 `VER`（现在 v25），否则手机上不更新。
- `recite.js`：录音浮层，诗词/儿歌/故事/英语共用。引用带版本号 `?v=22`，改完要同步升号，否则 App 里还是旧版。
- `tapread.js`：APK 里点字朗读，带小喇叭标识。
- `usage.js`：使用时长统计，存本机 localStorage。
- `fun.js`：每日惊喜小动物、连对彩蛋。
- `all-audio.json`：全部音频清单，一键下载用。音频池固定名 `kexin-audio-v1`，升级不丢。

音频共 5271 个 mp3，各模块放在自己的 `audio/` 目录，由 `build_audio.py` 等脚本用 edge-tts 生成。

## 安卓 APK

`kexin-app/` 是 WebView 壳，核心是 `MainActivity.java`：原生朗读桥 `KexinTTS` + 录音桥 `KexinRec`。版本 1.2（versionCode 3），签名文件 `kexin.jks` 不入库、密码见本地记录，成品 `kexin-xiaoleyuan.apk`。

APK 每次冷启动会清 WebView 缓存并重加载，所以内容更新不用重装 App。

**打包环境**（不在仓库里，在 `C:/Users/xueyo/kexin/`）：
- 项目：`C:/wxy/github/kxdxly/kexin-app`
- JDK 17：`C:/Users/xueyo/kexin/kexin-build/jdk-17.0.2`（Java 22 不兼容 AGP 8.5.2）
- Gradle 8.7：`C:/Users/xueyo/kexin/kexin-build/gradle-8.7`
- Android SDK：`C:/Users/xueyo/kexin/android-sdk`
- Maven 用阿里云镜像，Google Maven 太慢

打包完记得删 `kexin-app/.gradle/` 和 `kexin-app/app/build/`，已在 `.gitignore` 排除。

## 改动流程

1. 改源码（页面、数据、音频生成脚本）
2. 改了 `sw.js` 之外的内容也要升 `sw.js` 里的 `VER`，改了公共 js 要升引用版本号
3. 部署到 CloudBase：
   ```
   MSYS_NO_PATHCONV=1 cloudbase hosting deploy <本地文件> /<远程路径> -e western-hoverfly-d2e1rst4e6d0a01
   ```
   加 `MSYS_NO_PATHCONV=1` 是因为 Git Bash 会把 `/poems/index.html` 这种路径转错。
4. 手机上彻底关掉 App 重开（不是切后台）

## 题库生成

`math/build_data.py` 生成 330 道题到 `data.js`，脚本末尾有自检断言。之前出过两次错题（比一比的答案存在 `big` 字段但代码读 `ans`、图形规律答案写死），修完已加断言防止回归。改题库记得同步升 `data.js?v=` 的版本号。
