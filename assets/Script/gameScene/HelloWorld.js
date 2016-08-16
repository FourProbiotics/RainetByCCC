var sha1 = require('sha1');
var Rson = require('Rson');
var ChessClass = require('Chess');

var self;

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
        this.buttonBar = cc.find('Canvas/fitLayer/buttonBar').getComponent('buttonBar');
        this.curTag = 0;
        self = this;
        
        //先用loader加载plist和texture 再继续添加到spriteFrameCache
        cc.loader.loadRes(this.plistUrl, cc.SpriteAtlas,(err,atlas)=>{
            // 全局变量 图集
            cc.Tex1 = atlas;
            // 发送准备完成消息
            this.sendData({'code':'20', 'name':'prepared', data:{}});
        });

        // 更改响应回调函数
        cc.webSocket.onmessage = this.onWSMsg;
        
    },

    // 战斗时websocket回调
    onWSMsg: function(event){
        var data = Rson.decode(event.data);
        var msg = data.data;
        cc.log("serversend: code: " + data.code + ' data: ' + msg + ' to: ' + data.to);

        switch(data.code){
            case '21':
                // 游戏开始
                self.setRoom(msg.room);
                self.setPlayerNames(msg.myName, msg.enemyName);
                self.setScores(msg.myScore, msg.enemyScore);
                self.group = msg.group;
                self.enemyGroup = msg.group=='G'?'B':(msg.group=='B'?'G':null);
                self.changeMap(msg.group);

                switch(msg.group){
                    // 游客模式
                    case 'V':
                        self.initChessBoard(msg.mapData);
                    break;
                    //非游客模式
                    default:
                        self.addChessChangeEvent();
                    break;
                }
            break;

            case '23':
                if(data.to != cc.UID)
                    return;

                // 回合开始
                self.setTips('你的回合');
                // 移除现有棋子事件侦听
                self.removeMyChessEvent();
                // 添加侦听
                self.addChessChooseEvent();
                self.addTerminalChoose();
            break;

            case '24':
                if(data.to != cc.UID)
                    return;

                // 回合结束
                self.tuenEnd();
            break;

            case '31':

                // 超速回线 反馈
                if(data.to == cc.UID)
                {
                    //己方
                    if(msg.test)
                    {
                        // 先取消其他侦听
                        self.removeMyChessEvent();
                        self.unsetPasses();
                        self.removeEnemyChessEvent();
                        if(self.FWListener){
                            cc.eventManager.removeListener(self.FWListener);
                            self.FWListener = null;
                        }

                        let chesses = msg.target;
                        for(let key in chesses)
                        {
                            let target = self.myTeam[chesses[key]-1]
                            self.addLBEvent(target);
                        }
                    }else if(msg.turnFinish){
                        // 摘除已装备的超速回线
                        self.setLinBoost(self.group, msg.target, false);

                        // 回合结束
                        self.tuenEnd();
                    }
                }else{
                    //敌方
                    if(!msg.test)
                    {
                        // 摘除已装备的超速回线
                        self.setLinBoost(self.enemyGroup, msg.target, false);
                    }
                }
                
            break;

            case '33':

                // 超速回线 确认
                if(data.to == cc.UID)
                {
                    if(msg.test)
                    {
                        // 装备超速回线
                        self.setLinBoost(self.group, msg.target, true);
                        // 回合结束
                        self.tuenEnd();
                    }else
                        cc.log(msg.error);
                }else{
                    if(msg.test)
                    {
                        // 装备超速回线
                        self.setLinBoost(self.enemyGroup, msg.target, true);
                    }
                }
            break;

            case '41':

                // 防火墙 反馈
                if(data.to == cc.UID){
                    if(msg.test)
                    {
                        // 先取消其他侦听
                        self.removeMyChessEvent();
                        self.unsetPasses();
                        self.removeEnemyChessEvent();
                        if(self.FWListener){
                            cc.eventManager.removeListener(self.FWListener);
                            self.FWListener = null;
                        }

                        self.addFWEvent(msg.target);
                    }else{
                        // 移除己方现有防火墙
                        self.setFireWall(self.group, msg.target['x'], msg.target['y'], false);
                        // 回合结束
                        self.tuenEnd();
                    }
                }else{
                    if(!msg.test)
                    {
                        // 移除己方现有防火墙
                        self.setFireWall(self.enemyGroup, 9-msg.target['x'], 9-msg.target['y'], false);
                    }
                }
                
            break;

            case '43':

                // 防火墙 确认
                if(data.to == cc.UID)
                {
                    if(msg.test)
                    {
                        // 添加wall
                        self.setFireWall(self.group, msg.target['x'], msg.target['y'], true);
                        // 回合结束
                        self.tuenEnd();

                    }else
                        cc.log(msg.error);
                }else{
                    if(msg.test)
                    {
                        // 添加wall
                        self.setFireWall(self.enemyGroup, 9-msg.target['x'], 9-msg.target['y'], true);
                    }
                }
                
            break;

            case '51':
                if(data.to != cc.UID)
                    return;

                // 探查 反馈
                if(msg.test)
                {
                    // 先取消其他侦听
                    self.removeMyChessEvent();
                    self.unsetPasses();
                    self.removeEnemyChessEvent();
                    if(self.FWListener){
                        cc.eventManager.removeListener(self.FWListener);
                        self.FWListener = null;
                    }
                    
                    let chesses = msg.target;
                    for(let key in chesses)
                    {
                        let target = self.enemyTeam[chesses[key]-1];
                        self.addVCEvent(target);
                    }
                }else
                    cc.log(msg.error);
            break;

            case '53':

                // 探查 结束
                if(data.to == cc.UID)
                {
                    if(msg.test)
                    {
                        self.setVirusChecker(self.enemyGroup, msg.target, msg.result);
                        // 回合结束
                        self.tuenEnd();
                    }else
                        cc.log(msg.error);
                }else{
                    if(msg.test)
                        self.setVirusChecker(self.group, msg.target, msg.result);
                }
                
            break;

            case '61':
                if(data.to != cc.UID)
                    return;

                // 交换 反馈
                if(msg.test)
                {
                    // 先取消其他侦听
                    self.removeMyChessEvent();
                    self.unsetPasses();
                    self.removeEnemyChessEvent();
                    if(self.FWListener){
                        cc.eventManager.removeListener(self.FWListener);
                        self.FWListener = null;
                    }

                    // 清空记录notfound对象的静态变量
                    ChessClass.nf_no1 = null;
                    ChessClass.nf_no2 = null;
                        
                    let chesses = msg.target;
                    for(let key in chesses)
                    {
                        let target = self.enemyTeam[chesses[key]-1];
                        self.addNFEvent(target);
                    }
                }else
                    cc.log(msg.error);
            break;

            case '63':

                // 交换 确认
                if(data.to == cc.UID)
                {
                    if(msg.test)
                    {
                        self.switchChess(self.group, msg.no1, msg.no2, msg.check);
                        // 回合结束
                        self.tuenEnd();
                    }else
                        cc.log(msg.error);
                }else{
                    if(msg.test)
                        self.switchChess(self.enemyGroup, msg.no1, msg.no2, msg.check);
                }
            break;

            case '71':
                if(data.to != cc.UID)
                    return;

                // 棋子选择 反馈
                if(msg.test){
                    self.setPasses(msg.target);
                }
                else
                    cc.log(msg.error);
            break;

            case '73':

                // 棋子移动 确认
                if(data.to == cc.UID)
                {
                    if(msg.test)
                    {
                        let result = msg.result;
                        self.moveChess(self.group, msg.target, result['x'], result['y']);
                        // 若移动模式为进攻（吃了别的棋子）则移除掉对应棋子
                        if(result['type']==2)
                            self.moveChess(self.enemyGroup, result['eno'], result['ex'], result['ey']);
                        // 回合结束
                        self.tuenEnd();
                    }else
                        cc.log(msg.error);
                }else{
                    if(msg.test)
                    {
                        let result = msg.result;
                        self.moveChess(self.enemyGroup, msg.target, 9-result['x'], 9-result['y']);
                        // 若移动模式为进攻（吃了别的棋子）则移除掉对应棋子
                        if(result['type']==2)
                            self.moveChess(self.group, result['eno'], 9-result['ex'],9- result['ey']);
                    }
                }
            break;

            case '81':
                // 弹幕
                // 对战玩家看不到游客弹幕
                if(msg.sender != 'V' || self.group == 'V')
                    self.shotBullet(msg.string, msg.sender);
            break;

            case '91':
                // 游戏结束
                if(msg.winner == cc.UID)
                {
                    self.setTips('一切都是，\n命运石之门的选择！');
                }else{
                    self.setTips('失败了失败了失败了失败了失败了失败了失败了失败了失败了');
                }
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
                        this.setTips('请等待对手');
                        for(var key in this.myTeam){
                            let node = this.myTeam[key].node;
                            let chess = node.getComponent('Chess');

                            node.targetOff(this.node);

                            idTable.push(chess.type === 'link');
                        }
                        // 身份选择完毕后发送消息给服务器
                        this.sendData({'code':'22', 'name':'setted', data:{'idTable':idTable}});
                    }
            }
            node.on(cc.Node.EventType.TOUCH_END, call, this.node);
        }
    },

    // 添加己方棋子移动侦听事件
    addChessChooseEvent: function(){
        // 给所有己方棋子添加类型移动选择
        for(let key in this.myTeam)
        {
            let node = this.myTeam[key].node;
            let chess = node.getComponent('Chess');
            let call = (event)=>{
                // 目标选择完毕后发送消息给服务器
                this.sendData({'code':'70', 'name':'setted', data:{'no': chess.grpNum}});
            }
            node.on(cc.Node.EventType.TOUCH_END, call, this.node);
        }
    },

    // 添加终端卡使用权
    addTerminalChoose: function(){
        cc.log('启用终端卡');
        this.buttonBar.setTerminalPanelEnable(true);
    },

    // 移除终端卡使用权
    removeTerminalChoose: function(){
        cc.log('停用终端卡');
        this.buttonBar.setTerminalPanelEnable(false);
    },

    // 移除己方棋子上的侦听
    removeMyChessEvent: function(){
        for(let key in this.myTeam){
            let chess = this.myTeam[key].node;
            let script = chess.getComponent('Chess');

            chess.targetOff(this.node);
            script.clearFocusTag();
        }
    },

    // 移除敌方棋子上的侦听
    removeEnemyChessEvent: function(){
        for(let key in this.enemyTeam){
            let chess = this.myTeam[key].node;
            let script = chess.getComponent('Chess');

            chess.targetOff(this.node);
            script.clearFocusTag();
        }
    },

    // 给棋子加上lineboost选择事件
    addLBEvent: function(chess){
        let chessScript = chess.node.getComponent('Chess');
        chessScript.addLBEvent();
    },

    // 取消lineboost选择事件
    removeLBEvent: function(){
        // 取消所有棋子该类型侦听
        // 将棋子外貌恢复原样
        // 添加移动选择侦听
        this.removeEnemyChessEvent();
        this.removeMyChessEvent();
        this.addChessChooseEvent();
    },

    // 给棋子加上viruschecker选择事件
    addVCEvent: function(chess){
        let chessScript = chess.node.getComponent('Chess');
        chessScript.addVCEvent();
    },

    // 取消viruschecker选择事件
    removeVCEvent: function(){
        this.removeEnemyChessEvent();
        this.removeMyChessEvent();
        this.addChessChooseEvent();
    },

    // 给棋子加上404选择事件
    addNFEvent: function(chess){
        let chessScript = chess.node.getComponent('Chess');
        chessScript.addNFEvent();
    },

    // 取消404选择事件
    removeNFEvent: function(){
        this.removeEnemyChessEvent();
        this.removeMyChessEvent();
        this.addChessChooseEvent();
    },

    // 给棋盘加上firewall选择事件
    addFWEvent: function(limits){
        this.FWListener = {
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            onTouchBegan: function (touch, event) {
                return true; //这里必须要写 return true
            },
            onTouchEnded: function (touch, event) {
                let pos = self.getBoardXY(touch.getLocation());
                cc.log(pos);

                if(pos)
                {
                    for(let i in limits) {
                        let limitPos = limits[i];
                        let flag = true;
                        if(pos.x==limitPos['x'] && pos.y == limitPos['y'])
                        {
                            flag = false;
                            break;
                        }
                    };

                    if(flag){
                        // 建立wall
                        // 取消侦听
                        cc.eventManager.removeListener(this);
                        this.sendData({'code':'42', 'name':'fireWall', data:{'x':pos.x, 'y':pos.y}});
                    }
                }
            }
        }
        // 绑定单点触摸事件
        cc.eventManager.addListener(this.FWListener, this.node);
    },

    // 解除fire wall事件侦听
    removeFWEvent:function(){
        if(this.FWListener){
            cc.eventManager.removeListener(this.FWListener);
            this.FWListener = null;
        }
        this.removeEnemyChessEvent();
        this.removeMyChessEvent();
        this.addChessChooseEvent();
    },


    // 根据地图数组初始化棋盘
    initChessBoard: function(mapData){
        cc.log('init ChessBoard');
    },

    // 改变棋盘样式。不同阵营有不同的棋盘样式
    // @type: 阵营类别
    changeMap: function(type){
        
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
    setTips: function(str){
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
        label1.string = myScore;
        label2.string = enemyScore;
    },

    // 设置终端卡剩余状态显示
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
    // @isSwitch: 是否交换
    switchChess: function(group, c1, c2, isSwitch){
        // 获得指定chess对象
        var mass = cc.instantiate(this.mass);
        var chess1, chess2, team;
        team = this.group==group?this.myTeam:this.enemyTeam;
        
        chess1 = team[c1-1].node; chess2 = team[c2-1].node;

        var c1Script = chess1.getComponent('Chess'), c2Script = chess2.getComponent('Chess');
        var pos1 = chess1.getPosition(), pos2 = chess2.getPosition();
        var seq1, seq2, func1, func2;
        // 回调函数用以去掉switch标记并重置敌方棋子至背面
        func1 = cc.callFunc(()=>{
            c1Script.setSwitchTag(false); 
            if(this.group!=group)
                c1Script.changeType('bottom');
            else
                c1Script.setCheckTag(false);
        }, this);
        func2 = cc.callFunc(()=>{
            c2Script.setSwitchTag(false); 
            if(this.group!=group)
                c2Script.changeType('bottom');
            else
                c1Script.setCheckTag(false);
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
        // 若是我方触发则发送事件给服务端
        if(this.group==group)
        this.sendData({'code':'62', 'name':'404 not found', data:{'no1':ChessClass.nf_no1, 'no2':ChessClass.nf_no2, 'check':isSwitch}});
    },

    // 实现棋子移动
    // @group: 阵营/颜色
    // @c: 棋子在数组中的下标
    // @x, y: 移动坐标
    moveChess: function(group, c, x, y){
        cc.log('棋子移动', group, c, x, y);
        var chess = group==this.group?this.myTeam[c-1] : this.enemyTeam[c-1];
        chess.getComponent('Chess').moveTo(x, y);
    },

    // 加速回线效果
    // @group: 组别
    // @c: 指定的棋子
    // @isSwitch: 开启还是关闭
    setLinBoost: function(group, c, isSwitch){
        var chess;
        if(this.group == group)
            chess = this.myTeam[c-1].node.getComponent('Chess');
        else
            chess = this.enemyTeam[c-1].node.getComponent('Chess');
        chess.setLinBoost(isSwitch);
    },

    // 防火墙效果
    // @bx, by: 指定的空格位置坐标
    // @isSwitch: 开启还是关闭
    // @group: fireWall的种类
    setFireWall: function(group, bx, by, isSwitch){
        var board = this.checkboard.node;
        let block = cc.find('line'+by+'/block'+bx, board);
        block.getComponent('block').setFireWall(isSwitch, group);
    },

    // 探查器效果
    // @group: 棋子的种类
    // @c: 指定的显示身份的棋子
    // @type: 棋子的真实身份
    setVirusChecker: function(group, c, type){
        let team = group==this.group?this.myTeam:this.enemyTeam;
        var chess = team[c-1].node.getComponent('Chess');
        
        if(group==this.group)
            chess.setCheckTag(true);
        else
            chess.changeType(type);
    },

    // 可通过效果
    // @bx, by: 指定的空格位置坐标
    // @isSwitch: 开启还是关闭
    setBlockCanPass: function(bx, by, isSwitch){
        var board = this.checkboard.node;
        let block = cc.find('line'+by+'/block'+bx, board).getComponent('block');
        block.setCanPass(isSwitch);
    },

    // 设置选中棋子周围的可通过效果
    // @blocks: 记录可通过区域的数组
    setPasses: function(blocks){
        cc.log('关闭所有通过效果');
        this.unsetPasses();

        cc.log('开启指定位置效果');
        for(let key in blocks)
        {
            let pos = blocks[key];
            this.setBlockCanPass(pos['x'], pos['y'], true);
            cc.log('指定位置', pos['x'], pos['y']);
        }
    },

    unsetPasses: function(){
        // 关闭所有通过效果
        for(let i = 1;i <= 8;i++)
        {
            for(let j = 1;j <= 8;j++)
            {
                cc.log('关闭效果', 'line'+i+'/block'+j);
                let block = cc.find('line'+i+'/block'+j, this.checkboard.node).getComponent('block');
                block.setCanPass(false);
            }
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
                bullet.color = cc.color(220, 220, 220);
            break;
        }
        var seq = cc.sequence(cc.moveBy(time, -winWidth - bullet.width, 0), cc.callFunc(()=>{bullet.removeFromParent();}));
        cc.log(str, time);
        this.node.addChild(bullet);
        bullet.runAction(seq);
    },

    // 发送消息给服务端
    sendData: function(cmd){
        cmd = Rson.encode(cmd);
        cc.log(cmd);
        cc.webSocket.send(cmd);
    },

    // 将点击坐标转化为棋盘坐标
    getBoardXY: function(pos){
        let boardX=null, boardY=null;
        if(pos.y>=215 && pos.y<=775){
            boardX = Math.round((pos.x+7.5)/70);
            boardY = 9-Math.round((pos.y-180)/70);
        }

        if(boardX && boardY)
            return cc.p(boardX, boardY);
        else
            return null;
    },

    // 回合结束时处理所有侦听
    tuenEnd:function()
    {
        cc.log('回合结束');
        this.setTips('对手的回合');
        this.removeMyChessEvent();
        this.unsetPasses();
        this.removeEnemyChessEvent();
        this.removeTerminalChoose();
        if(this.FWListener){
            cc.eventManager.removeListener(this.FWListener);
            this.FWListener = null;
        }
        this.sendData({'code':'91', 'name':'turnEnd', data:{}});
    }
});
