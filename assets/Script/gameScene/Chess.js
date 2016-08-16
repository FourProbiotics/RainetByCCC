var Rson = require('Rson');

var Chess = cc.Class({
    extends: cc.Component,
    
    statics: {
        moveType: [[[0,70],[70,0],[0,-70],[-70,0]],[[0,140],[70,70],
        [140,0],[70,-70],[0,-140],[-70,-70],[-140,0],[-70,70]]],

        nf_no1: null,
        nf_no2: null
    },
    
    properties: {
        group: 'G',
        type: 'link',
        grpNum: 0,
        posX: 1,
        posY: 8,
        hasLineBoost: false,
        hasLocked: false,
        isSwitching: false,
        checked: false,
        lockOn: cc.Prefab,
        switchTag: cc.Prefab,
        lineBoost: cc.Prefab,
        checkTag: cc.Prefab,
    },

    // use this for initialization
    onLoad: function () {
        this.canvas = cc.find('Canvas').getComponent('HelloWorld');
        this.spriteComponent = this.getComponent(cc.Sprite); //精灵组件
    },
    
    // 实现棋子移动
    // @mode: 用于标识是否使用line boost，默认值为0，即不使用
    // @direct: 用于表示移动方向
    move: function(direct ,mode) {
        mode = arguments[2] ? arguments[2] : 0;
        
        var loc = this.getMoveLocation(direct, mode);
        
        cc.log(this.posX, this.posY);
        let moveAction = cc.moveTo(0.5, loc);
        moveAction.easing(cc.easeIn(0.5));
        this.node.runAction(moveAction);
    },

    // 指定棋子移动到棋盘某格
    // @x:　目标位置的ｘ坐标（棋盘）
    // @ｙ:　目标位置的ｙ坐标（棋盘）
    moveTo: function(x, y){
        let posx, posy;
        this.posX = x;
        this.posY = y;
        if(y == 0){
            if(posx<=2)
                posx = -316 + 80*x;
            else
                posx = 159.3 + 80*(x - 3);
            posy = 325.7;
        }else if(y == 9){
            if(posx<=2)
                posx = -316 + 80*x;
            else
                posx = 159.3 + 80*(x - 3);
            posy = -328;
        }else if(y == -1){
            this.node.setLocalZOrder(1);
            posx = -313 + 70*x;
            posy = 380;
        }else if(y == 10){
            this.node.setLocalZOrder(1);
            posx = -313 + 70*x;
            posy =  -385;
        }else{
            posx = -313 + 70*x;
            posy = 315 - 70*y;
        }
        let moveAction = cc.moveTo(0.5, cc.p(posx, posy));
        moveAction.easing(cc.easeIn(0.5));
        this.node.runAction(moveAction);
    },

    // 改变棋子类型
    // @type: 指定棋子类型，有'virus'，'link'和'bottom'三种类型
    changeType: function(type){

        if(this.type == type)
            return;
        this.type = type;
        let typeName = this.group + type;
        let rotate1 = cc.scaleTo(0.2, 0, 1);
        let call = ()=>{this.spriteComponent.spriteFrame = cc.Tex1.getSpriteFrame(typeName);};
        let rotate2 = cc.scaleTo(0.2, 1, 1);
        let seq = cc.sequence(rotate1, cc.callFunc(call), rotate2);

        this.node.runAction(seq);
    },

    // 改变棋子阵营/组
    // @group: 指定棋子组别， 有G、B两种类型。指定后会改变棋子纹理图片为对应组的背面（无身份）纹理
    changeGroup: function(group){
        this.group = group;
        this.spriteComponent.spriteFrame = cc.Tex1.getSpriteFrame(group+'bottom');
    },


    // 以贝赛尔曲线轨迹进行移动
    // @time: 动作持续时间，默认为两秒
    bezierMove: function(time){
        var time =  arguments[1] ? arguments[1] : 2;

        var x = this.node.x;
        var y = this.node.y;
        var lenB = Math.sqrt(Math.pow(x,2)+Math.pow(y,2));
        var lenC = Math.sqrt((Math.pow(x,2)+Math.pow(y,2))/3);
        var lenA = lenC * 2;
        var lenD = lenB * 4 / 3;
        var rotation = Math.atan2(-y, -x);
        var ptA = cc.p(lenA * Math.cos(rotation+6/Math.PI) + x, lenA * Math.sin(rotation+6/Math.PI) + y);
        var ptD = cc.p(lenD * Math.cos(rotation) + x, lenD * Math.sin(rotation) + y);

        var bezier = [ptA, ptD,  cc.p(0, 0)];
        var bezierTo = cc.bezierTo(time, bezier);

        return bezierTo;
    },

    // 添加LB选择侦听
    addLBEvent: function(){
        let lock = cc.instantiate(this.lockOn);
        lock.setTag(10);
        this.node.addChild(lock);

        this.node.on('touchend', function(event){
            this.node.takeOff(this);

            let cmd = Rson.encode({'code':'32', 'name':'LBChoose', data:{'no': this.grpNum}});
            cc.log(cmd);
            cc.webSocket.send(cmd);
        });
    },

    // 添加VC选择侦听
    addVCEvent: function(){
        let lock = cc.instantiate(this.lockOn);
        lock.setTag(10);
        this.node.addChild(lock);

        this.node.on('touchend', function(event){
            this.node.takeOff(this);

            let cmd = Rson.encode({'code':'52', 'name':'VCChoose', data:{'no': this.grpNum}});
            cc.log(cmd);
            cc.webSocket.send(cmd);
        }, this);
    },

    // 添加NF选择侦听
    addNFEvent: function(){
        let lock = cc.instantiate(this.lockOn);
        lock.setTag(10);
        this.node.addChild(lock);

        this.node.on('touchend', function(event){
            this.node.takeOff(this);
            this.node.removeChildByTag(10);
            this.setSwitchTag();

            if(!Chess.nf_no1)
                Chess.nf_no1 = this.grpNum;
            else if(!Chess.nf_no2)
                Chess.nf_no2 = this.grpNum;
            else{
                let main = cc.find('Canvas').getComponent('HelloWorld');
                main.showPop('switch');
            }
        }, this);
    },

    // 清除所有选中图标
    clearFocusTag: function(){
        this.node.removeChildByTag(10);
        this.node.removeChildByTag(404);
    },

    // 设置/解除加速回线
    // @judge: 加速回线的开关，true为开启， false为关闭
    // tag: 12
    setLineBoost: function(judge){
        if(judge && !this.hasLineBoost){
            this.hasLineBoost = true;
            let lb = cc.instantiate(this.lineBoost);
            lb.setTag(12);
            this.node.addChild(lb);

        }else if(!judge && this.hasLineBoost){
            this.hasLineBoost = false;
            this.node.removeChildByTag(12);
        }
    },

    // 设置/解除锁定状态
    // 锁定状态为对方棋子处于我方攻击范围内时的状态
    // @judge: 锁定开关，true为开启， false为关闭
    // tag: 10
    setLockTag: function(judge){
        if(judge && !this.hasLocked){
            this.hasLocked = true;
            let lock = cc.instantiate(this.lockOn);
            lock.setTag(10);
            this.node.addChild(lock);

        }else if(!judge && this.hasLocked){
            this.hasLocked = false;
            this.node.removeChildByTag(10);
        }
    },

    // 设置/解除待交换状态
    // 锁定状态为我方棋子处于交换模式被选择时的状态
    // @judge: 锁定开关，true为开启， false为关闭
    // tag: 404
    setSwitchTag: function(judge){
        if(judge && !this.isSwitching){
            this.isSwitching = true;
            let switchTag = cc.instantiate(this.switchTag);
            switchTag.setTag(404);
            this.node.addChild(switchTag);

        }else if(!judge && this.isSwitching){
            this.isSwitching = false;
            this.node.removeChildByTag(404);
        }
    },

    // 设置/解除查杀状态
    // 查杀状态为我方棋子处于被对方使用virus checker后的状态
    // @judge: 开关，true为开启， false为关闭
    // tag: 1
    setCheckTag: function(judge){
        if(!this.checked == judge)
            return;
        this.checked = judge;

        if(judge){
            let checkTag = cc.instantiate(this.checkTag);
            checkTag.setTag(1);
            this.node.addChild(checkTag);

        }else
            this.node.removeChildByTag(1);
        
    },

    // 获得棋子移动終点
    // @mode: 用于标识是否使用line boost
    // @direct: 用于表示移动方向
    getMoveLocation: function(direct, mode){
        direct = this.group==this.canvas.group?direct : (direct+3) % 8 + 1;
        var moveChange = Chess.moveType[mode][direct-1];
        this.posX += moveChange[0]/70;
        this.posY -= moveChange[1]/70;
        return cc.p(this.node.x+moveChange[0], this.node.y+moveChange[1]);
    }
});
