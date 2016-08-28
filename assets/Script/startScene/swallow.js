cc.Class({
    extends: cc.Component,

    properties: {
        historyPanel: cc.Node
    },

    // use this for initialization
    onLoad: function () {
        var self = this;
        // 阻滞点击事件向下传递
        let listenerObj = {
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            onTouchBegan: function (touch, event) {return true; /*这里必须要写 return true*/},
            
            onTouchEnded: function (touch, event) {
                // cc.eventManager.removeListener(self.swallowListener);
                event.stopPropagation();
                self.historyPanel.active = false;
            }
        };
        // 绑定单点触摸事件
        this.swallowListener = cc.eventManager.addListener(listenerObj, this.node);
    },

    // called every frame, uncomment this function to activate update callback
    // update: function (dt) {

    // },
});
