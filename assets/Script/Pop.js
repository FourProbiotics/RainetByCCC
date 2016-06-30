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
        switch(type){
            case 'close':
                this.label.string = '确定认输并退出游戏吗？';
                this.yesLabel.string = '确定';
                this.noLabel.string = '取消';
            break;
            case 'switch':
                this.label.string = '是否交换两枚棋子？';
                this.yesLabel.string = '交换';
                this.noLabel.string = '不交换';
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
