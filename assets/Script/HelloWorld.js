cc.Class({
    extends: cc.Component,

    properties: {
        
        group: 'G',
        checkboard: cc.Sprite,
        stateBar: cc.Sprite,
        pop: cc.Node,
        enemyTeam: [cc.Sprite],
        myTeam: [cc.Sprite],
        gamestart: false,
        vnum: 0,
        lnum: 0
    },

    // use this for initialization
    onLoad: function () {
        this.plistUrl = 'Texture/Tex1'; //plist的url
        this.currentChess = null;
        this.tips = cc.find('Canvas/fitLayer/stateBar/tips').getComponent(cc.Label);
        
        //先用loader加载plist和texture 再继续添加到spriteFrameCache
        cc.loader.loadRes(this.plistUrl, cc.SpriteAtlas,(err,atlas)=>{
            // 全局变量
            cc.Tex1 = atlas;
        });

        // 给所有己方棋子添加类型选择
        for(var key in this.myTeam)
        {
            let node = this.myTeam[key].node;
            let chess = node.getComponent('Chess');
            node.on(cc.Node.EventType.TOUCH_END, (event)=>{
                    if(chess.type != 'virus' && this.vnum < 4)   //换帧
                    {
                        if(chess.type == 'link')
                            this.lnum--;
                        chess.changeType('virus');
                        this.vnum++;
                    }
                    else if(chess.type != 'link' && this.lnum < 4)
                    {
                        if(chess.type == 'virus')
                            this.vnum--;
                        chess.changeType('link');
                        this.lnum++;
                    }

                    if(this.vnum+this.lnum == 8)
                    {
                        this.gamestart = true;
                        cc.log('gamestate', this.gamestart);
                    }
                }
            );
        }
        this.showPop('switch');
    },

    // 改变期盼样式。不同阵营有不同的棋盘样式
    // @type: 阵营类别
    changeMap: function(type){
        if(this.group == type)
            return;
        this.group = type;
        if(type == 'G'){
            this.checkboard.spriteFrame = cc.Tex1.getSpriteFrame('checkboard1');
            this.stateBar.spriteFrame = cc.Tex1.getSpriteFrame('stateBar1');
        }
        else{
            this.checkboard.spriteFrame = cc.Tex1.getSpriteFrame('checkboard2');
            this.stateBar.spriteFrame = cc.Tex1.getSpriteFrame('stateBar2');
        }
        // 给所有己方棋子改变类组别
        for(var key in this.myTeam)
        {
            let node = this.myTeam[key].node;
            let chess = node.getComponent('Chess');
            chess.changeGroup(type);
        }
        // 给所有对方棋子改变类组别
        for(var key in this.enemyTeam)
        {
            let node = this.enemyTeam[key].node;
            let chess = node.getComponent('Chess');
            chess.changeGroup(type=='G'?'B':'G');
        }
    },
    
    // 显示确认框
    // @type: 确认框种类
    showPop: function(type){
        var pop = this.pop.getComponent('Pop');
        pop.show(type);
    },

    // 设置提示信息
    // @str: 提示信息文本
    setTps: function(str){
        this.tips.string = str;
    }
});
