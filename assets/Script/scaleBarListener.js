cc.Class({
    extends: cc.Component,

    properties: {
        board: cc.Node,
        scrollContent: cc.Node
    },

    // use this for initialization
    onLoad: function () {

    },


    scrolled: function(){
        var x = this.node.parent.x;
        this.scaleMap((855+x)/570);
    },

    // 对棋盘进行缩放
    // @scale: 缩放参数
    scaleMap: function(scale){

        scale = scale < 1 ? 1 : (scale > 2 ? 2 : scale);
        
        var content = this.scrollContent;
        var board = this.board;

        board.scale = scale;
        let targetW = scale*615, targetH = scale*747;
        content.setContentSize(targetW, targetH);
        if(content.x < (615-targetW)/2)
            content.x = (615-targetW)/2;
        if(content.x > (targetW-615)/2)
            content.x = (targetW-615)/2;
        if(content.y < (747-targetH)/2)
            content.y = (747-targetH)/2;
        if(content.y > (targetH-747)/2)
            content.y = (targetH-747)/2;
    },
});
