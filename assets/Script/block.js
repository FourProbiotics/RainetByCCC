<<<<<<< 4e2296c30ed5f09098bb0092dcaa77b43ee7abf4
cc.Class({
    extends: cc.Component,

    properties: {
        // 激活状态表示目标棋子能够移动到这点
        active: false,
        posX:0,
        posY:0

    },

    // use this for initialization
    onLoad: function () {
        
        var self = this;
        // 添加触摸事件监听器
        // this.node.on(cc.Node.EventType.TOUCH_START, (event) => {
            
        //     cc.log('Touch Began: ' + self.posX + ' ' + self.posY);
        //     return true;
        // });
        // this.node.on(cc.Node.EventType.TOUCH_MOVE, function (event) {
        //     cc.log('Touch Moved: ' + self.posX + ' ' + self.posY);
        // });
        // this.node.on(cc.Node.EventType.TOUCH_END, function (event) {
        //     cc.log('Touch Ended: ' + self.posX + ' ' + self.posY);
        // });
        // this.node.on(cc.Node.EventType.EventTouch, function (touch, event) {
        //     cc.log('Touch Cancelled: ' + self.posX + ' ' + self.posY);
        // });

    },

    setActive: function(choose){
        if(choose && !this.active){

            this.active = true;
            // 加载 Prefab
            cc.loader.loadRes("Prefab/focus1", (err, prefab) => {
                this.focus = cc.instantiate(prefab);
                let colorAction2 = cc.tintTo(2, 255, 255, 155);
                let colorAction1 = cc.tintTo(2, 200, 100, 255);
                let seq = cc.sequence(colorAction1, colorAction2).repeatForever();

                this.node.addChild(this.focus);
                this.focus.runAction(seq);
            });
        }else if(!choose && this.active){

            this.active = false;
            this.node.removeChild(this.focus);
        }
    }
});
=======
cc.Class({
    extends: cc.Component,

    properties: {
        // 激活状态表示目标棋子能够移动到这点
        active: false,
        posX:0,
        posY:0

    },

    // use this for initialization
    onLoad: function () {
        
        var self = this;
        // 添加触摸事件监听器
        // this.node.on(cc.Node.EventType.TOUCH_START, (event) => {
            
        //     cc.log('Touch Began: ' + self.posX + ' ' + self.posY);
        //     return true;
        // });
        // this.node.on(cc.Node.EventType.TOUCH_MOVE, function (event) {
        //     cc.log('Touch Moved: ' + self.posX + ' ' + self.posY);
        // });
        // this.node.on(cc.Node.EventType.TOUCH_END, function (event) {
        //     cc.log('Touch Ended: ' + self.posX + ' ' + self.posY);
        // });
        // this.node.on(cc.Node.EventType.EventTouch, function (touch, event) {
        //     cc.log('Touch Cancelled: ' + self.posX + ' ' + self.posY);
        // });

    },

    setActive: function(choose){
        if(choose && !this.active){

            this.active = true;
            // 加载 Prefab
            cc.loader.loadRes("Prefab/focus1", (err, prefab) => {
                this.focus = cc.instantiate(prefab);
                let colorAction2 = cc.tintTo(2, 255, 255, 155);
                let colorAction1 = cc.tintTo(2, 200, 100, 255);
                let seq = cc.sequence(colorAction1, colorAction2).repeatForever();

                this.node.addChild(this.focus);
                this.focus.runAction(seq);
            });
        }else if(!choose && this.active){

            this.active = false;
            this.node.removeChild(this.focus);
        }
    }
});
>>>>>>> origin
