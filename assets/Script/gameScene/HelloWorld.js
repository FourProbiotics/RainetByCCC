cc.Class({
    extends: cc.Component,

    properties: {
        
        group: 'G',
        checkboard: cc.Sprite,
        stateBar: cc.Sprite,
        pop: cc.Node,
        enemyTeam: [cc.Sprite],
        myTeam: [cc.Sprite],
        mass: cc.Prefab,
        bullet: cc.Prefab,
        gamestart: false,
        vnum: 0,
        lnum: 0
    },

    // use this for initialization
    onLoad: function () {
        cc.log("游戏场景加载");

        this.plistUrl = 'Texture/Tex1'; //plist的url
        this.currentChess = null;
        this.tips = cc.find('Canvas/fitLayer/stateBar/tips').getComponent(cc.Label);
        this.stateBar = cc.find('Canvas/fitLayer/stateBar');
        this.curTag = 0;
        
        //先用loader加载plist和texture 再继续添加到spriteFrameCache
        cc.loader.loadRes(this.plistUrl, cc.SpriteAtlas,(err,atlas)=>{
            // 全局变量
            cc.Tex1 = atlas;
            // 发送准备结束消息
            let cmd = Rson.encode({'code':'20', 'name':'prepared', data:{}});
            cc.log(cmd);
            cc.webSocket.send(cmd);
        });

        // 更改响应回调函数
        cc.webSocket.onmessage = this.onWSMsg;
    },

    // 战斗时websocket回调
    onWSMsg: function(event){
        var data = Rson.decode(event.data);
        var msg = data.data;
        var self = callbacks;
        cc.log("serversend: code: " + data.code + ' data: ' + msg + ' to: ' + data.to);

        switch(data.code){
            case '21':
                // 游戏开始
                switch(msg.startMode){
                    case 'battle':
                    this.addChessChangeEvent();
                    ;
                    break;

                    case 'visit':
                    break;
                }
            break;

            case '23':
                // 回合开始
                ;
            break;

            case '24':
                // 回合结束
                ;
            break;

            case '31':
                // 超速回线 反馈
                if(msg.test)
                {
                    ;
                }else
                    cc.log(msg.error);
            break;

            case '33':
                // 超速回线 确认
                if(msg.test)
                {
                    ;
                }else
                    cc.log(msg.error);
            break;

            case '21':
                // 防火墙 反馈
                if(msg.test)
                {
                    ;
                }else
                    cc.log(msg.error);
            break;

            case '21':
                // 防火墙 确认
                if(msg.test)
                {
                    ;
                }else
                    cc.log(msg.error);
            break;

            case '51':
                // 探查 反馈
                if(msg.test)
                {
                    ;
                }else
                    cc.log(msg.error);
            break;

            case '53':
                // 探查 结束
                if(msg.test)
                {
                    ;
                }else
                    cc.log(msg.error);
            break;

            case '61':
                // 交换 反馈
                if(msg.test)
                {
                    ;
                }else
                    cc.log(msg.error);
            break;

            case '63':
                // 交换 确认
                if(msg.test)
                {
                    ;
                }else
                    cc.log(msg.error);
            break;

            case '71':
                // 棋子选择 反馈
                if(msg.test)
                {
                    ;
                }else
                    cc.log(msg.error);
            break;

            case '73':
                // 棋子选择 确认
                if(msg.test)
                {
                    ;
                }else
                    cc.log(msg.error);
            break;

            case '81':
                // 玩家信息
                ;
            break;

            case '91':
                // 游戏结束
                ;
            break;
        }
    },

    // 给己方棋子添加身份变化事件
    addChessChangeEvent: function(){
        // 给所有己方棋子添加类型选择
        for(let key in this.myTeam)
        {
            let node = this.myTeam[key].node;
            let chess = node.getComponent('Chess');
            let idTable = [];//用来记录身份的数组
            let call = (event)=>{
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
                        cc.log('gamestart', this.gamestart);
                        this.setTps('请等待对手');
                        for(var key in this.myTeam){
                            let node = this.myTeam[key].node;
                            let chess = node.getComponent('Chess');

                            node.targetOff(this.node);

                            idTable.push(chess.type === 'link');
                        }
                        // 身份选择完毕后发送消息给服务器
                        let cmd = Rson.encode({'code':'22', 'name':'setted', data:{'idTable':idTable}});
                        cc.log(cmd);
                        cc.webSocket.send(cmd);
                    }
                }
            node.on(cc.Node.EventType.TOUCH_END, call, this.node);
        }
    },

    // 添加移动侦听事件
    addChessChooseEvent: function(){
        // 给所有己方棋子添加类型移动选择
        for(let key in this.myTeam)
        {
            let node = this.myTeam[key].node;
            let chess = node.getComponent('Chess');
            let call = (event)=>{
                for(var key in this.myTeam){
                    let node = this.myTeam[key].node;
                    node.targetOff(this.node);
                }
                // 身份选择完毕后发送消息给服务器
                let cmd = Rson.encode({'code':'22', 'name':'setted', data:{'curChess': chess.grpNum}});
                cc.log(cmd);
                cc.webSocket.send(cmd);
            }
            node.on(cc.Node.EventType.TOUCH_END, call, this.node);
        }
    },

    // 改变棋盘样式。不同阵营有不同的棋盘样式
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
    },

    // 设置房间号
    // @num: 房间号
    setRoom: function(num){
        var label = cc.find('room', this.stateBar).getComponent(cc.Label);
        label.string = num;
    },

    // 设置玩家名
    // @myName: 己方玩家名
    // @enemyName: 对方玩家名
    setPlayerNames: function(myName, enemyName){
        var label1 = cc.find('myName', this.stateBar).getComponent(cc.Label);
        var label2 = cc.find('enemyName', this.stateBar).getComponent(cc.Label);
        label1.string = myName;
        label2.string = enemyName;
    },

    // 设置玩家分数
    // @myName: 己方分数
    // @enemyName: 对方分数
    setScores: function(myScore, enemyScore){
        var label1 = cc.find('myScore', this.stateBar).getComponent(cc.Label);
        var label2 = cc.find('enemyScore', this.stateBar).getComponent(cc.Label);
        label1.string = myName;
        label2.string = enemyName;
    },

    // 设置玩家分数
    // @state: 终端卡字符串
    // @player: 指定我方或对方，我方为true，对方为false
    setTerminalState(state, player){
        var label;
        if(player)
            label = cc.find('myTerminalState', this.stateBar).getComponent(cc.Label);
        else
            label = cc.find('enemyTerminalState', this.stateBar).getComponent(cc.Label);
        label.string = state;
    },

    // 实现交换效果
    // @c1: 第一个指定棋子在数组中的下标+1
    // @c2: 第二个指定棋子在数组中的下标+1
    // @usedByMe: 使用者为我方或对方，我方为true, 对方为false
    // @isSwitch: 是否交换
    switchChess: function(c1, c2, usedByMe, isSwitch){
        // 获得指定chess对象
        var mass = cc.instantiate(this.mass);
        var chess1, chess2;
        if(usedByMe)
            {chess1 = this.myTeam[c1-1].node; chess2 = this.myTeam[c2-1].node;}
        else
            {chess1 = this.enemyTeam[c1-1].node; chess2 = this.enemyTeam[c2-1].node;}

        var c1Script = chess1.getComponent('Chess'), c2Script = chess2.getComponent('Chess');
        var pos1 = chess1.getPosition(), pos2 = chess2.getPosition();
        var seq1, seq2, func1, func2;
        // 回调函数用以去掉switch标记并重置敌方棋子至背面
        func1 = cc.callFunc(()=>{
            c1Script.setSwitchTag(false); 
            if(!usedByMe)
                c1Script.changeType('bottom');
        }, this);
        func2 = cc.callFunc(()=>{
            c2Script.setSwitchTag(false); 
            if(!usedByMe)
                c2Script.changeType('bottom');
        }, this);

        if(isSwitch){
            seq1 = cc.sequence(c1Script.bezierMove(), func1, cc.moveTo(0.3, pos2));
            seq2 = cc.sequence(c2Script.bezierMove(), func2, cc.moveTo(0.3, pos1));
        }else{
            seq1 = cc.sequence(c1Script.bezierMove(), func1, cc.moveTo(0.3, pos1));
            seq2 = cc.sequence(c2Script.bezierMove(), func2, cc.moveTo(0.3, pos2));
        }
        // 开始演出
        this.node.addChild(mass);
        mass.setPosition(0, 0);
        chess1.runAction(seq1);
        chess2.runAction(seq2);
    },

    // 实现棋子移动
    // @isMyTeam: 是否为我方棋子
    // @index: 棋子在数组中的下标
    // @x, y: 移动坐标
    moveChess: function(isMyTeam, index, x, y){
        var chess = isMyTeam?this.myTeam[index] : this.enemyTeam[index];
        chess.getComponent('Chess').moveTo(x, y);
    },

    // 加速回线效果
    // @c: 指定的我方棋子
    // @isSwitch: 开启还是关闭
    setLinBoost: function(c, isSwitch){
        var chess = this.myTeam[c].node.getComponent('Chess');
        chess.setLinBoost(isSwitch);
    },

    // 防火墙效果
    // @bx, by: 指定的空格位置坐标
    // @isSwitch: 开启还是关闭
    // @group: fireWall的种类
    setFireWall: function(bx, by, isSwitch, group){
        var board = this.checkboard;
        let block = cc.find('line'+bx+'/block'+by, board);
        block.getComponent('block').setFireWall(isSwitch, group);
    },

    // 探查器效果
    // @c: 指定的敌方显示身份的棋子
    // @type: 棋子的真实身份
    setVirusChecker: function(c){
        var chess = this.enemyTeam[c].node.getComponent('Chess');
        chess.changeType(type);
    },

    // 可通过效果
    // @bx, by: 指定的空格位置坐标
    // @isSwitch: 开启还是关闭
    setBlockCanPass: function(bx, by, isSwitch){
        var board = this.checkboard;
        let block = cc.find('line'+bx+'/block'+by, board).getComponent('block');
        block.setBlockCanPass(isSwitch);
    },

    // 设置选中棋子周围的可通过效果
    // @blocks: 记录可通过区域的数组
    setPasses: function(blocks){
        // 关闭所有通过效果
        for(var i = 1;i <= 8;i++)
        {
            for(var j = 1;j <= 8;j++)
            {
                let block = cc.find('line'+bx+'/block'+by, this.checkboard).getComponent('block');
                block.setCanPass(false);
            }
        }
        // 开启指定位置效果
        for(var i = 0;i < blocks.length;i++)
        {
            let pos = blocks[i];
            this.setBlockCanPass(pos[0], pos[1], true);
        }
    },

    // 发送弹幕
    // @str: 要发送的弹幕内容
    // @group: 弹幕发送方，分为'G''B''V'三种
    shotBullet: function(str, group){
        
        var bullet = cc.instantiate(this.bullet);
        var ran = Math.ceil(Math.random()*9) - 5;
        var scale = (Math.ceil(Math.random()*21) - 11) / 100 + 1;
        var winWidth = cc.winSize.width;
        var time = 3.5 + 0.1 * str.length + ran * 0.05;
        bullet.getComponent(cc.Label).string = str;
        bullet.width = str.length * 25 * scale;
        bullet.height = 40 * scale;
        bullet.setPosition(winWidth / 2 + bullet.width / 2, 40*ran);

        switch(group){
            case 'G':
                bullet.color = cc.color(255, 255, 0);
            break;
            case 'B':
                bullet.color = cc.color(0, 0, 255);
            break;
            case 'V':
            break;
        }
        var seq = cc.sequence(cc.moveBy(time, -winWidth - bullet.width, 0), cc.callFunc(()=>{bullet.removeFromParent();}));
        cc.log(str, time);
        this.node.addChild(bullet);
        bullet.runAction(seq);
    },
});
