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
    },

    // 按不同模式显示弹窗
    show: function(type){
        this.popYes.targetOff(this);
        this.popNo.targetOff(this);
        switch(type){
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
        cc.director.end();
    },

    onCloseNo: function(){
        this.hide();
    },

    onSwitchYes: function(){
        this.hide();
    },

    onSwitchNo: function(){
        this.hide();
    }
});
