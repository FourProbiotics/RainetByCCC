cc.Class({
    extends: cc.Component,

    properties: {
        pauseObj: cc.Node,
        pauseObj2: cc.Node
    },

    // use this for initialization
    onLoad: function () {
        this.operatorLayer = cc.find('Canvas/operator');
        this.loginPanel = cc.find('Canvas/loginPanel');
        this.callbacks = cc.find('callbacks_script').getComponent('callbacks');
        // 初始化websocket
        cc.webSocket = this.initWebSocket('ws://121.42.170.78:12345');
        // var sha1 = require('sha1');
        // var salt = this.randomString();
        // var pass = sha1.hex_sha1('password');
        // cc.sys.localStorage.setItem('username', 'FouProBiotics');
        // cc.sys.localStorage.setItem('salt', salt);
        // cc.sys.localStorage.setItem('password', pass);
        let username = cc.sys.localStorage.getItem('username');
        let password = cc.sys.localStorage.getItem('password');

        // 当本地保存了用户名密码时尝试自动登录，否则需要手动登录
        if(username != null && username != 'null' && password != null && password != 'null')
        {
            cc.log(username, password);
            // cc.sys.localStorage.setItem('username', null);
            // cc.sys.localStorage.setItem('salt', null);
            // cc.sys.localStorage.setItem('password', null);

            this.operatorLayer.active = true;
        }else{
            this.loginPanel.active = true;
        }
    },

    randomString: function(len) {
    　　len = len || 32;
    　　var $chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';    /****默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1****/
    　　var maxPos = $chars.length;
    　　var pwd = '';
    　　for (var i = 0; i < len; i++) {
    　　　　pwd += $chars.charAt(Math.floor(Math.random() * maxPos));
    　　}
    　　return pwd;
    },

    initWebSocket: function(host){
        var ws = new WebSocket(host);

        ws.onopen = this.callbacks.onWSOpen;

        ws.onmessage = this.callbacks.onWSMsg;

        ws.onerror = this.callbacks.onWSErr

        ws.onclose = this.callbacks.onWSClose;

        setTimeout(function () {
            if (ws.readyState === WebSocket.OPEN) {
                cc.log("WebSocket ready");
            }
            else {
                console.log("WebSocket instance wasn't ready...");
                ws.close();
            }
        }, 3000);
        return ws;
    }
});
