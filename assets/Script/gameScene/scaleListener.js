cc.Class({
    extends: cc.Component,

    properties: {
        board: cc.Node,
        scrollContent: cc.Node
    },

    // use this for initialization
    onLoad: function () {
        var self = this, parent = this.node.parent;
        
        // 添加多点触摸事件监听器监听缩放事件
        // if(!cc.sys.isMobile)
        //     return;
        var listener = {
            event: cc.EventListener.TOUCH_ALL_AT_ONCE,
            onTouchesBegan: function (touches, event) {
                cc.log('touches');
                return true;
            },
            onTouchesMoved: function (touches, event) {
                if (touches.length >= 2) {
                    var touch1 = touches[0], touch2 = touches[1];
                    var delta1 = touch1.getDelta(), delta2 = touch2.getDelta();
                    var touchPoint1 = parent.convertToNodeSpaceAR(touch1.getLocation());
                    var touchPoint2 = parent.convertToNodeSpaceAR(touch2.getLocation());
                    //缩放
                    var distance = cc.pSub(touchPoint1, touchPoint2);
                    var delta = cc.pSub(delta1, delta2);
                    var scale = 1;
                    if (Math.abs(distance.x) > Math.abs(distance.y)) {
                        scale = (distance.x + delta.x) / distance.x * self.board.scale;
                    }
                    else {
                        scale = (distance.y + delta.y) / distance.y * self.board.scale;
                    }
                    scale = scale < 1 ? 1 : (scale > 2 ? 2 : scale);
                    self.scaleMap(scale);
                }
            }
        }
        // 添加单点触摸事件监听器
        // var listener = {
        //     event: cc.EventListener.TOUCH_ONE_BY_ONE,
        //     onTouchBegan: function (touch, event) {
        //         cc.log('Touch Began: ' + event);
        //         return true; //这里必须要写 return true
        //     },
        //     onTouchMoved: function (touch, event) {
        //         var touch1 = touch, touch2 = touch;
        //             var delta1 = touch1.getDelta(), delta2 = cc.p(-touch2.getDelta().x,-touch2.getDelta().y);
        //             var touchPoint1 = parent.convertToNodeSpaceAR(touch1.getLocation());
        //             var touchPoint2 = parent.convertToNodeSpaceAR(cc.p(-touch2.getLocationX(), -touch2.getLocationY()));
        //             //缩放
        //             var distance = cc.pSub(touchPoint1, touchPoint2);
        //             var delta = cc.pSub(delta1, delta2);
        //             var scale = 1;
        //             if (Math.abs(distance.x) > Math.abs(distance.y)) {
        //                 scale = (distance.x + delta.x) / distance.x * self.board.scale;
        //             }
        //             else {
        //                 scale = (distance.y + delta.y) / distance.y * self.board.scale;
        //             }
        //             scale = scale < 1 ? 1 : (scale > 2 ? 2 : scale);
        //             self.scaleMap(scale);
        //     },
        //     onTouchEnded: function (touch, event) {
        //     cc.log('Touch Ended: ' + event);
        //     },
        //     onTouchCancelled: function (touch, event) {
        //     cc.log('Touch Cancelled: ' + event);
        //     }
        // }
        // 绑定触摸事件
        cc.eventManager.addListener(listener, this.node);
    },

    // 对棋盘进行缩放
    // @scale: 缩放参数
    scaleMap: function(scale){
        cc.log('scale: ', scale);
        
        var content = this.scrollContent;
        var board = this.board;

        content.setContentSize(scale*615, scale*880);
        board.scale = scale;
    },
});
