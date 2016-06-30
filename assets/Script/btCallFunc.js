cc.Class({
    extends: cc.Component,

    properties: {
    },

    // use this for initialization
    onLoad: function () {
        this.canvas = cc.find('Canvas').getComponent('HelloWorld');
        this.terminals = cc.find('Canvas/terminals');
        this.sysPanel = cc.find('Canvas/sysPanel');
    },

    onLineBoost: function(){
        this.hide(this.terminals);
    },

    onFireWall: function(){
        this.hide(this.terminals);
    },

    onVirusChecker: function(){
        this.hide(this.terminals);
    },

    onNotFound: function(){
        this.hide(this.terminals);
        this.canvas.showPop('switch');
    },

    onSysClose: function(){
        this.hide(this.sysPanel);
        this.canvas.showPop('close');
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
    }
});
