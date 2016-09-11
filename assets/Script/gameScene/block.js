var Rson = require('Rson');

cc.Class({
    extends: cc.Component,

    properties: {
        // 激活状态表示目标棋子能够移动到这点
        canPass: false,
        posX:0,
        posY:0,

    },

    // use this for initialization
    onLoad: function () {
        
        cc.loader.loadRes("Prefab/GWall", (err, wall) => {
            this.GWall = cc.instantiate(wall);
        });
        cc.loader.loadRes("Prefab/BWall", (err, wall) => {
            this.BWall = cc.instantiate(wall);
        });
        cc.loader.loadRes("Prefab/shield", (err, shield) => {
            this.shield = cc.instantiate(shield);
        });
        this.main = cc.find('Canvas').getComponent('HelloWorld');
    	
    },
    // 设置该点是否能通过
    setCanPass: function(choose){
        if(choose && !this.canPass){

            this.canPass = true;
            // 加载 Prefab
            cc.loader.loadRes("Prefab/focus1", (err, prefab) => {
                this.focus = cc.instantiate(prefab);
                let colorAction2 = cc.tintTo(2, 255, 255, 155);
                let colorAction1 = cc.tintTo(2, 200, 100, 255);
                let seq = cc.sequence(colorAction1, colorAction2).repeatForever();

                this.node.addChild(this.focus);
                this.focus.runAction(seq);

                this.focus.on('touchend', (event) => {
                    // 选定棋子移动方向
                    this.sendData({'code':'72', 'name':'move', data:{'x':this.posX, 'y':this.posY}});
                    }, this.node);
            });
        }else if(!choose && this.canPass){

            this.canPass = false;
            this.node.removeChild(this.focus);
        }
    },

    // 设置/解除防火墙
    // @judge: 防火墙开关，true为开启， false为关闭
    // @group: 棋子阵营，'G'和'B'两种
    setFireWall: function(judge, group){
        if(judge && !this.hasLineBoost){
            this.hasFireWall = true;
            let fw = (group == 'G')?this.GWall : this.BWall;
            let shield = this.shield;
            let wallTag = (group == 'G')?7 : 2;
            fw.setTag(wallTag);
            this.node.addChild(fw);
            shield.setTag(11);
            this.node.addChild(shield);

        }else if(!judge && this.hasFireWall){
            this.hasFireWall = false;
            let wallTag = (group == 'G')?7 : 2;
            this.node.removeChildByTag(wallTag);
            this.node.removeChildByTag(11);
        }
    },

    // 发送消息给服务端
    sendData: function(cmd){
        this.main.sendData(cmd);
    }
});
