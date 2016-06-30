<<<<<<< 4e2296c30ed5f09098bb0092dcaa77b43ee7abf4
cc.Class({
    extends: cc.Component,

    properties: {
    },

    // use this for initialization
    onLoad: function () {
        var self = this;
        var particle = self.getComponent(cc.ParticleSystem);
        particle.startColor = cc.Color(255,0,0);
        
        this.node.opacity = 0;
        var func = new cc.CallFunc(
            function(){
                particle.stopSystem();
            }
        ,this);
        var seq = cc.sequence(cc.delayTime(3), func);
        this.node.runAction(seq);
    },

    // called every frame, uncomment this function to activate update callback
    // update: function (dt) {

    // },
});
=======
cc.Class({
    extends: cc.Component,

    properties: {
    },

    // use this for initialization
    onLoad: function () {
        var self = this;
        var particle = self.getComponent(cc.ParticleSystem);
        particle.startColor = cc.Color(255,0,0);
        
        this.node.opacity = 0;
        var func = new cc.CallFunc(
            function(){
                particle.stopSystem();
            }
        ,this);
        var seq = cc.sequence(cc.delayTime(3), func);
        this.node.runAction(seq);
    },

    // called every frame, uncomment this function to activate update callback
    // update: function (dt) {

    // },
});
>>>>>>> origin
