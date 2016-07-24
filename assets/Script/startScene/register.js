cc.Class({
    extends: cc.Component,

    properties: {
        
    },

    // use this for initialization
    onLoad: function () {
        this.node.on(cc.Node.EventType.TOUCH_START, (event)=>{
            cc.log('touch');
            event.stopPropagationImmediate ( );
        });
    },
});
