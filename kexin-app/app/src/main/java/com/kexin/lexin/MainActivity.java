package com.kexin.lexin;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.media.MediaPlayer;
import android.media.MediaRecorder;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.speech.tts.TextToSpeech;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.File;
import java.util.Locale;

public class MainActivity extends Activity {
    private WebView web;
    private TextToSpeech tts;
    private boolean ttsReady = false;

    private MediaRecorder recorder = null;
    private MediaPlayer player = null;
    private File recDir = null;
    private String pendingRecId = null;

    private static final String HOME_URL =
        "https://western-hoverfly-d2e1rst4e6d0a01-1468714906.tcloudbaseapp.com/";
    private static final int REQ_MIC = 7;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window w = getWindow();
        if (Build.VERSION.SDK_INT >= 21) {
            w.setStatusBarColor(Color.parseColor("#FBF6EA"));
            w.setNavigationBarColor(Color.parseColor("#FBF6EA"));
        }
        if (Build.VERSION.SDK_INT >= 23) {
            w.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        }

        // 录音存放目录（App 私有，外部访问不到）
        recDir = new File(getFilesDir(), "recite");
        if (!recDir.exists()) recDir.mkdirs();

        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setUserAgentString(s.getUserAgentString() + " KexinApp/1.0");

        web.setWebViewClient(new WebViewClient() {
            private boolean cleaned = false;
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (!cleaned) {
                    cleaned = true;
                    view.evaluateJavascript(
                        "(function(){"
                        + "try{navigator.serviceWorker&&navigator.serviceWorker.getRegistrations&&"
                        + "navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){r.unregister();});});}catch(e){}"
                        + "try{if(window.caches){caches.keys().then(function(ks){ks.forEach(function(k){if(k.indexOf('kexin-audio')<0)caches.delete(k);});});}}catch(e){}"
                        + "})();", null);
                    view.reload();
                }
            }
        });
        web.addJavascriptInterface(new TtsBridge(), "KexinTTS");
        web.addJavascriptInterface(new RecBridge(), "KexinRec");

        tts = new TextToSpeech(this, new TextToSpeech.OnInitListener() {
            @Override
            public void onInit(int status) {
                if (status == TextToSpeech.SUCCESS) {
                    int r = tts.setLanguage(Locale.CHINESE);
                    if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) {
                        r = tts.setLanguage(Locale.US);
                    }
                    ttsReady = (r != TextToSpeech.LANG_MISSING_DATA
                             && r != TextToSpeech.LANG_NOT_SUPPORTED);
                    tts.setSpeechRate(0.85f);
                    tts.setPitch(1.05f);
                }
            }
        });

        web.loadUrl(HOME_URL);

        // 提前申请麦克风权限，避免录音时才弹窗打断
        if (Build.VERSION.SDK_INT >= 23
                && checkSelfPermission(Manifest.permission.RECORD_AUDIO)!=PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MIC);
        }
    }

    public class TtsBridge {
        @JavascriptInterface
        public void speak(final String text) {
            runOnUiThread(new Runnable() {
                @Override public void run() {
                    if (tts != null && ttsReady && text != null && text.length() > 0) {
                        tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "kexin");
                    }
                }
            });
        }
        @JavascriptInterface
        public void stop() {
            runOnUiThread(new Runnable() {
                @Override public void run() { if (tts != null) tts.stop(); }
            });
        }
        @JavascriptInterface
        public boolean available() { return ttsReady; }
    }

    /** 背诵录音桥接 */
    public class RecBridge {
        private File recFile(String id){
            if(id==null || id.length()==0) id="x";
            // 只允许安全字符，避免路径穿越
            id=id.replaceAll("[^a-zA-Z0-9_-]","_");
            return new File(recDir, "rec_"+id+".m4a");
        }
        private boolean hasMic(){
            return checkSelfPermission(Manifest.permission.RECORD_AUDIO)==PackageManager.PERMISSION_GRANTED;
        }
        @JavascriptInterface
        public boolean has(String id){ return recFile(id).exists(); }

        @JavascriptInterface
        public boolean start(final String id){
            if(!hasMic()){ pendingRecId=id; requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MIC); return false; }
            return doStart(id);
        }
        private boolean doStart(String id){
            try{
                stopPlay();
                if(recorder!=null){ try{ recorder.stop(); }catch(Exception e){} recorder.release(); recorder=null; }
                File f=recFile(id);
                recorder=new MediaRecorder();
                recorder.setAudioSource(MediaRecorder.AudioSource.MIC);
                recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
                recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
                recorder.setAudioEncodingBitRate(64000);
                recorder.setAudioSamplingRate(44100);
                recorder.setOutputFile(f.getAbsolutePath());
                recorder.prepare();
                recorder.start();
                return true;
            }catch(Exception e){ recorder=null; return false; }
        }
        @JavascriptInterface
        public int stop(){
            int secs=0;
            if(recorder!=null){
                try{ recorder.stop(); }catch(Exception e){}
                try{ recorder.release(); }catch(Exception e){}
                recorder=null;
            }
            return secs;
        }
        @JavascriptInterface
        public boolean play(final String id){
            stopPlay();
            File f=recFile(id);
            if(!f.exists()) return false;
            try{
                player=new MediaPlayer();
                player.setDataSource(f.getAbsolutePath());
                player.prepare();
                player.start();
                player.setOnCompletionListener(new MediaPlayer.OnCompletionListener(){
                    @Override public void onCompletion(MediaPlayer mp){ stopPlay(); }
                });
                return true;
            }catch(Exception e){ stopPlay(); return false; }
        }
        private void stopPlay(){
            if(player!=null){ try{ if(player.isPlaying()) player.stop(); }catch(Exception e){} try{ player.release(); }catch(Exception e){} player=null; }
        }
        @JavascriptInterface
        public boolean delete(String id){ File f=recFile(id); return f.exists() && f.delete(); }
        @JavascriptInterface
        public boolean available(){ return true; }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults){
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if(requestCode==REQ_MIC && grantResults.length>0 && grantResults[0]==PackageManager.PERMISSION_GRANTED){
            if(pendingRecId!=null){
                final String id=pendingRecId; pendingRecId=null;
                new RecBridge().doStart(id);   // 授权后直接开始录音
            }
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && web != null && web.canGoBack()) {
            if (tts != null) tts.stop();
            web.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onDestroy() {
        if (tts != null) { tts.stop(); tts.shutdown(); }
        if (recorder != null) { try{ recorder.stop(); }catch(Exception e){} try{ recorder.release(); }catch(Exception e){} }
        if (player != null) { try{ player.release(); }catch(Exception e){} }
        super.onDestroy();
    }
}
