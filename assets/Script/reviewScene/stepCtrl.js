var self;

cc.Class({
    extends: cc.Component,

    properties: {
    },

    // use this for initialization
    onLoad: function () {
        this.main = cc.find('Canvas').getComponent('ReviewMain');
        self = this;
    },

    onStepBack: function(){
        self.main.runStep(false);
    },
    
    onStepFoward: function(){
        self.main.runStep(true);
    },
});
