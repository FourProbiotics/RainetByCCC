var ChessClass = require('Chess');

cc.Class({
    extends: cc.Component,

    properties: {
        label: cc.Label,
        popYes: cc.Node,
        yesLabel: cc.Label,
        popNo: cc.Node,
        noLabel: cc.Label
    },

    // use this for initialization
    onLoad: function () {
        this.canvas = cc.find('Canvas').getComponent('HelloWorld');
        // 事件拦截
        this.node.on(cc.Node.EventType.TOUCH_START, function(event){ event.stopPropagation(); }, this);
    },

    // 按不同模式显示弹窗
    show: function(type){
        this.popYes.targetOff(this);
        this.popNo.targetOff(this);
        switch(type){
            case 'loginFailed':
                this.label.string = '登录失败！请检查用户名密码';
                this.yesLabel.string = '确定';
                this.noLabel.string = '取消';
                this.popYes.on(cc.Node.EventType.TOUCH_END, this.onCloseNo, this);
                this.popNo.on(cc.Node.EventType.TOUCH_END, this.onCloseNo, this);
            break;

            case 'registerFailed':
                this.label.string = '注册失败！用户名不符合规范或用户名已存在';
                this.yesLabel.string = '确定';
                this.noLabel.string = '取消';
                this.popYes.on(cc.Node.EventType.TOUCH_END, this.onCloseNo, this);
                this.popNo.on(cc.Node.EventType.TOUCH_END, this.onCloseNo, this);
            break;

            case 'hotUpdate':
                this.label.string = '发现新版本，要现在更新吗？';
                this.yesLabel.string = '确定';
                this.noLabel.string = '取消';
                this.popYes.on(cc.Node.EventType.TOUCH_END, this.onUpdateYes, this);
                this.popNo.on(cc.Node.EventType.TOUCH_END, this.onCloseNo, this);
            break;

            case 'close':
                this.label.string = '确定认输并退出游戏吗？';
                this.yesLabel.string = '确定';
                this.noLabel.string = '取消';
                this.popYes.on(cc.Node.EventType.TOUCH_END, this.onCloseYes, this);
                this.popNo.on(cc.Node.EventType.TOUCH_END, this.onCloseNo, this);
            break;

            case 'switch':
                this.label.string = '是否交换选定棋子？';
                this.yesLabel.string = '交换';
                this.noLabel.string = '不交换';
                this.popYes.on(cc.Node.EventType.TOUCH_END, this.onSwitchYes, this);
                this.popNo.on(cc.Node.EventType.TOUCH_END, this.onSwitchNo, this);
            break;

            case 'wsclose':
                this.label.string = '与服务器断开连接，是否重连？';
                this.yesLabel.string = '重连';
                this.noLabel.string = '不重连';
                this.popYes.on(cc.Node.EventType.TOUCH_END, this.onConnectYes, this);
                this.popNo.on(cc.Node.EventType.TOUCH_END, this.onConnectNo, this);
            break;

            case 'reviewClose':
                this.label.string = '确定退出回放界面吗？';
                this.yesLabel.string = '确定';
                this.noLabel.string = '取消';
                this.popYes.on(cc.Node.EventType.TOUCH_END, this.switchToStartScene, this);
                this.popNo.on(cc.Node.EventType.TOUCH_END, this.onCloseNo, this);
            break;

            case 'visitClose':
                this.label.string = '确定退出观战界面吗？';
                this.yesLabel.string = '确定';
                this.noLabel.string = '取消';
                this.popYes.on(cc.Node.EventType.TOUCH_END, this.switchToStartScene, this);
                this.popNo.on(cc.Node.EventType.TOUCH_END, this.onCloseNo, this);
            break;
        }
        var node = this.node;
        if(node.active)
            return false;
        node.active = true;
        var act1=cc.fadeIn(0.15);
        node.runAction(act1);
        return true;
    },

    // 隐藏对象
    // @obj: 将隐藏的对象
    hide: function(){
        var obj = this.node;
        if(!obj.active)
            return false;
        var act1=cc.fadeOut(0.15);
        var callback = new cc.CallFunc(function(){
            obj.active = false;
        },this);
        var seq = cc.sequence(act1, callback);
        obj.runAction(seq);
        return true;
    },

    onCloseYes: function(){
        this.canvas.sendData({'code':'90', 'name':'change start', data:{}});
        this.hide();
    },

    onCloseNo: function(){
        this.hide();
    },

    onSwitchYes: function(){
        this.hide();
        this.canvas.removeNFEvent();
        this.canvas.sendData({'code':'62', 'name':'resign', data:{'no1':ChessClass.nf_no1, 'no2':ChessClass.nf_no2, 'check':true}});
    },

    onSwitchNo: function(){
        this.hide();
        this.canvas.sendData({'code':'62', 'name':'change start', data:{'no1':ChessClass.nf_no1, 'no2':ChessClass.nf_no2, 'check':false}});
    },

    onConnectYes: function(){
        this.hide();
        this.schedule(function() {
            // 这里的 this 指向 调用对象
            // this.doSomething();
        }, interval, repeat, delay);
    },

    onConnectNo: function(){
        this.hide();
    },

    switchToStartScene: function(){
        cc.audioEngine.stopMusic();
        cc.director.loadScene('startScene');
    },

    // 热更回调
    onUpdateYes: function(){
        let asset = cc.find('Canvas').getComponent('HotUpdate');
        asset.hotUpdate();
    }
});
