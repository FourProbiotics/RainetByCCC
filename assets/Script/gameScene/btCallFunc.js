var ChessClass = require('Chess');

cc.Class({
    extends: cc.Component,

    properties: {
        lbOpen: false,
        fwOpen: false,
        vcOpen: false,
        nfOpen: false
    },

    // use this for initialization
    onLoad: function () {
        this.canvas = cc.find('Canvas').getComponent('HelloWorld');
        this.terminals = cc.find('Canvas/terminals');
        this.sysPanel = cc.find('Canvas/sysPanel');
        this.lb = cc.find('Canvas/terminals/lineBoost');
        this.fw = cc.find('Canvas/terminals/fireWall');
        this.vc = cc.find('Canvas/terminals/virusChecker');
        this.nf = cc.find('Canvas/terminals/404');
        this.talkInput = cc.find('Canvas/fitLayer/buttonBar/talkBox').getComponent(cc.EditBox);
    },

    onLineBoost: function(){
        this.hide(this.terminals);
        if(!this.lbOpen){
            this.sendData({'code':'30', 'name':'start LB', data:{}});
            this.lbOpen = true;
            this.lb.color = new cc.Color(198, 198, 198);
        }else{
            this.lbOpen = false;
            this.canvas.removeLBEvent();
            this.lb.color = new cc.Color(255, 255, 255);
        }
    },

    onFireWall: function(){
        this.hide(this.terminals);
        if(!this.fwOpen){
            this.sendData({'code':'40', 'name':'start FW', data:{}});
            this.fwOpen = true;
            this.fw.color = new cc.Color(198, 198, 198);
        }else{
            this.fwOpen = false;
            this.canvas.removeFWEvent();
            this.fw.color = new cc.Color(255, 255, 255);
        }
    },

    onVirusChecker: function(){
        this.hide(this.terminals);
        if(!this.vcOpen){
            this.sendData({'code':'50', 'name':'start VC', data:{}});
            this.vcOpen = true;
            this.vc.color = new cc.Color(198, 198, 198);
        }else{
            this.vcOpen = false;
            this.canvas.removeVCEvent();
            this.vc.color = new cc.Color(255, 255, 255);
        }
    },

    onNotFound: function(){
        this.hide(this.terminals);
        if(!this.nfOpen){
            this.sendData({'code':'60', 'name':'start NF', data:{}});
            this.nfOpen = true;
            this.nf.color = new cc.Color(198, 198, 198);
        }else{
            this.nfOpen = false;
            this.canvas.removeNFEvent();
            this.nf.color = new cc.Color(255, 255, 255);
        }
    },

    onSysClose: function(){
        this.hide(this.sysPanel);
        this.canvas.showPop('close');
    },

    onSendTalk: function(){
        let str = this.talkInput.string;
        this.talkInput.string = '';

        this.sendData({'code':'80', 'name':'sendTalk', data:{'str':str}});
    },

    // 显示需要出现的对象
    // @obj: 将出现的对象
    show: function(obj){
        if(obj.active)
            return false;
        obj.active = true;
        var act1=cc.fadeIn(0.15);
        obj.runAction(act1);
        return true;
    },

    // 隐藏对象
    // @obj: 将隐藏的对象
    hide: function(obj){
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

    // 发送消息给服务端
    sendData: function(cmd){
        cmd = Rson.encode(cmd);
        cc.log(cmd);
        cc.webSocket.send(cmd);
    },
});
