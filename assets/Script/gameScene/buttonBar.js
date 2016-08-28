cc.Class({
    extends: cc.Component,

    properties: {
        terminals: cc.Node,
        tmBt: cc.Button,
        sys: cc.Node,
        sysBt: cc.Button,
        input: cc.EditBox
    },

    // use this for initialization
    onLoad: function () {
        var self = this;
        this.myTerm = false;
        var listener = {
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            onTouchBegan: function (touch, event) {
                return true;
            },
            onTouchEnded: function (touch, event) {
                // 用户点击空白区域时隐藏快捷弹出框
                self.hide(self.terminals);
                self.hide(self.sys);
            }
        };
        cc.eventManager.addListener(listener, this.node);
    },

    showTerminals: function(){
        this.hide(this.sys);
        if(!this.myTerm)
        {
            this.hide(this.terminals);
            return;
        }
        let shown = this.show(this.terminals);
        if(!shown){
            this.hide(this.terminals);
        }
    },

    showSys: function(){
        this.hide(this.terminals);
        let shown = this.show(this.sys);
        if(!shown){
            this.hide(this.sys);
        }
    },

    leaveButton: function(){
        this.hide(this.terminals);
        this.hide(this.sys);
    },

    // 启用/禁用终端卡面板
    setTerminalPanelEnable: function(enable){
        this.myTerm = enable;
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
