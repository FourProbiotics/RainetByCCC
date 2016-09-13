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
        eventLayer: cc.Node,
        pop: cc.Node,
        enemyTeam: [cc.Sprite],
        myTeam: [cc.Sprite],

        p_mass: cc.Prefab,
        p_click_b: cc.Prefab,
        p_click_g: cc.Prefab,
        p_fire: cc.Prefab,
        p_danger: cc.Prefab,
        p_honor: cc.Prefab,
        P_winback: cc.Prefab,

        bullet: cc.Prefab,
        gamestart: false,
        vnum: 0,
        lnum: 0,
        lbSwitch: false,
        nfSwitch: false,
        fwSwitch: false,
        vcSwitch: false,
        reConnect: false,
        myServerSize: 0,
        enemyServerSize: 0,
    },

    // use this for initialization
    onLoad: function () {
        cc.log("游戏场景加载");
        
        this.plistUrl = 'Texture/Tex1'; //plist的url
        this.currentChess = null;
        this.tips = cc.find('Canvas/fitLayer/stateBar/tips').getComponent(cc.Label);
        this.stateBar = cc.find('Canvas/fitLayer/stateBar').getComponent(cc.Sprite);
        this.buttonBar = cc.find('Canvas/fitLayer/buttonBar').getComponent('buttonBar');

        // sound
        this.sound = this.node.getComponent('Sound');
        this.curTag = 0;
        this.curBgm = 0;
        this.bgm = [this.sound.bgm01, this.sound.bgm02, this.sound.bgm03, 
            this.sound.bgm04, this.sound.bgm05, this.sound.bgm06];

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
        cc.webSocket.onclose = this.onWSClose;

        // 调度计时器每2秒检测一次websocket连接情况
        self.schedule(function(){
            if (cc.webSocket.readyState !== WebSocket.OPEN)
                self.sendData({'code':'1000', 'name':'reConnect', data:{}});
        }, 2);

        // 添加场景点击反馈侦听
        let listenerObj = {
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            onTouchBegan: function (touch, event) {
                let pos = self.node.convertToNodeSpaceAR(touch.getLocation());
                self.showEffect('click'+self.group, pos.x, pos.y);
                return true; /*这里必须要写 return true*/
            },

            onTouchMoved: function (touch, event) {
                let pos = self.node.convertToNodeSpaceAR(touch.getLocation());
                self.showEffect('click'+self.group, pos.x, pos.y);
            }
        };
        // 绑定单点触摸事件
        this.clickListener = cc.eventManager.addListener(listenerObj, this.eventLayer);
    },

    // 战斗时websocket回调
    onWSMsg: function(event){
        var data = Rson.decode(event.data);
        var msg = data.data;
        cc.log("serversend: code: " + data.code + ' data: ' + msg + ' to: ' + data.to);

        switch(data.code){
            case '21':
                // 游戏开始
                self.room = msg.room;
                self.setRoom(msg.room);
                self.myName = msg.myName;self.enemyName = msg.enemyName;
                self.setPlayerNames(msg.myName, msg.enemyName);
                // self.setScores(msg.myScore, msg.enemyScore);
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

                // 计时器循环播放背景音乐
                cc.audioEngine.stopMusic();
                self.bgmScheduleFunc = function(){
                    
                    if(!cc.audioEngine.isMusicPlaying())
                    {
                        cc.log('bgm播放', self.bgm.length);
                        if(self.bgm.length > self.curBgm)
                            cc.audioEngine.playMusic(self.bgm[self.curBgm++], false);
                        else{
                            self.curBgm = 0;
                            cc.audioEngine.playMusic(self.bgm[self.curBgm++], false);
                        }
                    }
                };
                self.schedule(self.bgmScheduleFunc, 5);

                self.playSound('begin');

            break;

            case '23':
                if(data.to != cc.UID)
                    return;

                // 回合开始
                self.setTips('你的回合，现在可以进行棋子移动');
                // 移除现有事件侦听
                self.removeAllBoardEvent();
                self.removeTerminalChoose();
                // 添加侦听
                self.addChessChooseEvent();
                self.addTerminalChoose();
            break;

            case '24':
                if(data.to != cc.UID)
                    return;

                // 回合结束
                self.turnEnd();
            break;

            case '31':

                // 超速回线 反馈
                if(data.to == cc.UID)
                {
                    //己方
                    if(msg.test)
                    {
                        self.setTips('选择 Line Boost 对象\n再次点击终端卡 取消');
                        // 先取消其他侦听
                        self.removeAllBoardEvent();

                        let chesses = msg.target;
                        for(let key in chesses)
                        {
                            let target = self.myTeam[chesses[key]-1];
                            self.addLBEvent(target);
                        }
                    }else{
                        // 音效
                        self.playSound('line');cc.log('unsetLB : ', msg.target);
                        // 摘除已装备的超速回线
                        self.setLineBoost(self.group, msg.target, false);
                        // 回合结束
                        self.turnEnd();
                    }
                }else{
                    //敌方
                    if(!msg.test)
                    {
                        // 音效
                        self.playSound('line');
                        // 摘除已装备的超速回线
                        self.setLineBoost(self.enemyGroup, msg.target, false);
                    }
                }
                
            break;

            case '33':
                // 音效
                self.playSound('line');
                self.playSound('lb');
                // 超速回线 确认
                if(data.to == cc.UID)
                {
                    if(msg.test)
                    {
                        // 装备超速回线
                        self.setLineBoost(self.group, msg.target, true);
                        // 回合结束
                        self.turnEnd();
                    }else
                        cc.log(msg.error);
                }else{
                    if(msg.test)
                    {
                        // 装备超速回线
                        self.setLineBoost(self.enemyGroup, msg.target, true);
                    }
                }
            break;

            case '41':

                // 防火墙 反馈
                if(data.to == cc.UID){
                    if(msg.test)
                    {
                        self.setTips('选择 Fire Wall 对象\n再次点击终端卡 取消');
                        // 先取消其他侦听
                        self.removeAllBoardEvent();

                        self.addFWEvent(msg.target);
                    }else{
                        // 音效
                        self.playSound('wall');
                        // 移除己方现有防火墙
                        self.setFireWall(self.group, msg.target['x'], msg.target['y'], false);
                        // 回合结束
                        self.turnEnd();
                    }
                }else{
                    if(!msg.test)
                    {
                        // 音效
                        self.playSound('wall');
                        // 移除己方现有防火墙
                        self.setFireWall(self.enemyGroup, 9-msg.target['x'], 9-msg.target['y'], false);
                    }
                }
                
            break;

            case '43':
                // 音效
                self.playSound('wall');
                self.playSound('fw');
                // 防火墙 确认
                if(data.to == cc.UID)
                {
                    if(msg.test)
                    {
                        // 添加wall
                        self.setFireWall(self.group, msg.target['x'], msg.target['y'], true);
                        // 回合结束
                        self.turnEnd();

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
                    self.setTips('选择 Virus Checker 对象\n再次点击终端卡 取消');
                    // 先取消其他侦听
                    self.removeAllBoardEvent();
                    
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
                // 音效
                self.playSound('check');
                self.playSound('vc');
                // 探查 结束
                if(data.to == cc.UID)
                {
                    if(msg.test)
                    {
                        self.setVirusChecker(self.enemyGroup, msg.target, msg.result);
                        // 回合结束
                        self.turnEnd();
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
                    self.setTips('选择 两枚 404 Not Found 对象\n再次点击终端卡 取消');
                    // 先取消其他侦听
                    self.removeAllBoardEvent();

                    // 清空记录notfound对象的静态变量
                    ChessClass.nf_no1 = null;
                    ChessClass.nf_no2 = null;
                        
                    let chesses = msg.target;
                    for(let key in chesses)
                    {
                        let target = self.myTeam[chesses[key]-1];
                        self.addNFEvent(target);
                    }
                }else
                    cc.log(msg.error);
            break;

            case '63':
                // 音效
                self.playSound('exchange');
                self.playSound('nf');
                // 交换 确认
                if(data.to == cc.UID)
                {
                    if(msg.test)
                    {
                        self.switchChess(self.group, msg.no1, msg.no2, msg.check);
                        // 回合结束
                        self.turnEnd();
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
                    self.setTips('选择 棋子移动目标');
                    self.setPasses(msg.target);
                }
                else
                    cc.log(msg.error);
            break;

            case '73':
                // 音效
                self.playSound('move');
                // 棋子移动 确认
                if(data.to == cc.UID)
                {
                    if(msg.test)
                    {
                        let result = msg.result;
                        if(result['type'] != 3)
                            self.moveChess(self.group, msg.target, result['x'], result['y']);

                        // 若移动模式为进攻（吃了别的棋子）则移除掉对应棋子
                        if(result['type']==2){

                            let script = self.enemyTeam[result['eno']-1].getComponent('Chess');
                            script.clearAllTag();
                            script.changeType(result['etype']);
                            self.setCaptureState(self.group, result['captureL'], result['captureV']);
                            
                            self.moveChess(self.enemyGroup, result['eno'], result['ex'], result['ey']);
                            // 显示吃子时的粒子特效
                            if(result['etype']=='link')
                                self.showEffect('honor', result['x'], result['y']);
                            else
                                self.showEffect('danger', result['x'], result['y']);
                        }
                        // 若是移入database
                        if(result['type']==3){
                            // 按server现存棋子数移动棋子位置
                            self.myServerSize++;
                            self.moveChess(self.group, msg.target, self.myServerSize, result['y']);

                            if(result['moveLB'])
                            {
                                self.lbSwitch = false;
                                
                                let btCallFunc = cc.find('Canvas').getComponent('btCallFunc');
                                btCallFunc.lbOpen = false;
                                btCallFunc.lb.color = new cc.Color(255, 255, 255);
                            }

                            let script = self.myTeam[msg.target-1].getComponent('Chess');
                            script.clearAllTag();
                        }
                        // 回合结束
                        self.turnEnd();
                    }else
                        cc.log(msg.error);
                }else{
                    if(msg.test)
                    {
                        let result = msg.result;
                        if(result['type'] != 3)
                            self.moveChess(self.enemyGroup, msg.target, 9-result['x'], 9-result['y']);

                        // 若移动模式为进攻（吃了别的棋子）则移除掉对应棋子
                        if(result['type']==2){
                            self.setCaptureState(self.enemyGroup, result['captureL'], result['captureV']);
                            self.moveChess(self.group, result['eno'], 9-result['ex'],9-result['ey']);
                            if(result['moveLB'])
                            {
                                self.lbSwitch = false;

                                let btCallFunc = cc.find('Canvas').getComponent('btCallFunc');
                                btCallFunc.lbOpen = false;
                                btCallFunc.lb.color = new cc.Color(255, 255, 255);
                            }
                            // 显示吃子时的粒子特效
                            if(result['etype']=='link')
                                self.showEffect('honor', 9-result['x'], 9-result['y']);
                            else
                                self.showEffect('danger', 9-result['x'], 9-result['y']);

                        }else if(result['type']==3){
                            // 按server现存棋子数移动棋子位置
                            self.enemyServerSize++;
                            self.moveChess(self.enemyGroup, msg.target, self.enemyServerSize, 9-result['y']);

                            let script = self.enemyTeam[msg.target-1].getComponent('Chess');
                            script.clearAllTag();
                        }
                    }
                }
            break;

            case '81':
                // 弹幕
                // 对战玩家看不到游客弹幕
                if(msg.sender != 'V' || self.group == 'V')
                    self.shotBullet(msg.str, msg.sender);
            break;

            case '91':
                // 游戏结束
                // 停止bgm回调并静音
                self.unschedule(self.bgmScheduleFunc);
                cc.audioEngine.stopMusic();

                // 结束演出
                if(msg.winner == cc.UID)
                {
                    self.setTips("游戏结束，我方获胜");
                    // 展示胜利演出
                    self.showEndEffect(msg.identify, true);
                }else{
                    self.setTips('游戏结束，'+self.enemyName+'获胜');
                    // 展示失败演出
                    self.showEndEffect(msg.identify, false);
                }

                // 9秒后返回开始场景
                self.schedule(function() {
                    cc.director.loadScene('startScene');
                }, 9, 1);
            break;
            
            case '106':
            // 接收地图信息

                // 解析地图
                let map = JSON.parse(msg.map).map;
                for(let i in map)
                {
                    let obj = map[i];
                    if(self.group == 'B'){
                        obj.x = 9-obj.x;
                        obj.y = 9-obj.y;
                    }
                    //对方棋子
                    if(obj.group === self.enemyGroup){
                        if(obj.no){
                            self.moveChess(obj.group, obj.no, obj.x, obj.y);
                            if(obj.show)
                                self.enemyTeam.getComponent("Chess").changeType(obj.type);
                            if(obj.lineBoost)
                                self.setLineBoost(obj.group, obj.no, true);
                        }
                        //墙
                        else
                            self.setFireWall(obj.group, obj.x, obj.y, true);
                    }else{
                        if(obj.no && obj.show)
                            self.myTeam.getComponent("Chess").setCheckTag(true);
                    }

                }
            break;
        }
    },

    // 战斗场景ws关闭回调
    onWSClose: function(event){
        ;
    },

    // 结束游戏演出
    showEndEffect: function(identify, isWinner){
        // 翻开全部对方棋子
        for(let i = 0;i < identify.length;i++)
        {
            for(let k = 0;k < 8;k++)
            {
                let iden = identify[i];
                if(iden['group'] == self.enemyGroup){
                    let ec = self.enemyTeam[k].getComponent('Chess');
                    if(ec.grpNum == iden['no']){
                        ec.changeType(iden['type']);
                        break;
                    }
                }
            }
        }

        if(isWinner)
        {
            // 音效
            self.playSound('win');
        }else{
            // 音效
            this.playSound('lose');
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
                this.sendData({'code':'70', 'name':'get move target', data:{'no': chess.grpNum}});
            }
            node.on(cc.Node.EventType.TOUCH_END, call, node);
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

            chess.targetOff(chess);
            script.clearFocusTag();
        }
    },

    // 移除敌方棋子上的侦听
    removeEnemyChessEvent: function(){
        for(let key in this.enemyTeam){
            let chess = this.enemyTeam[key].node;
            let script = chess.getComponent('Chess');

            chess.targetOff(chess);
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
        this.setTips('选择要移动的棋子');
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
        this.setTips('选择要移动的棋子');
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
        this.setTips('选择要移动的棋子');
    },

    // 给棋盘加上firewall选择事件
    addFWEvent: function(limits){
        cc.log('添加fw选择事件');

        let listenerObj = {
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            onTouchBegan: function (touch, event) {return true; /*这里必须要写 return true*/},

            onTouchEnded: function (touch, event) {
                let pos = self.getBoardXY(touch.getLocation());
                cc.log('addFWEvent pos: ', pos);

                if(pos)
                {
                    let flag = true;
                    for(let i in limits) {
                        let limitPos = limits[i];
                        if(pos.x==limitPos['x'] && pos.y == limitPos['y'])
                        {
                            flag = false;
                            break;
                        }
                    };

                    if(flag){
                        // 建立wall
                        // 取消侦听
                        cc.log('移除fw侦听1', self.FWListener);
                        cc.eventManager.removeListener(self.FWListener);
                        self.FWListener = null;
                        self.sendData({'code':'42', 'name':'fireWall', data:{'x':pos.x, 'y':pos.y}});
                    }
                }
            }
        };
        // 绑定单点触摸事件
        this.FWListener = cc.eventManager.addListener(listenerObj, this.checkboard.node);
    },

    // 解除fire wall事件侦听
    removeFWEvent:function(){
        if(this.FWListener){
            cc.log('移除fw侦听2', this.FWListener);
            cc.eventManager.removeListener(this.FWListener);
            this.FWListener = null;
        }
        this.removeEnemyChessEvent();
        this.removeMyChessEvent();
        this.addChessChooseEvent();
        this.setTips('选择要移动的棋子');
    },

    // 移除当前棋盘所有侦听
    removeAllBoardEvent: function(){
        cc.log('移除当前棋盘所有侦听');

        if(this.FWListener){
            cc.log('移除fw侦听3', this.FWListener);
            cc.eventManager.removeListener(this.FWListener);
            this.FWListener = null;
        }
        this.removeEnemyChessEvent();
        this.removeMyChessEvent();
        this.unsetPasses();
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
        }else{
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
        var label = cc.find('room', this.stateBar.node).getComponent(cc.Label);
        label.string = num;
    },

    // 设置玩家名
    // @myName: 己方玩家名
    // @enemyName: 对方玩家名
    setPlayerNames: function(myName, enemyName){
        var label1 = cc.find('myName', this.stateBar.node).getComponent(cc.Label);
        var label2 = cc.find('enemyName', this.stateBar.node).getComponent(cc.Label);
        label1.string = myName;
        label2.string = enemyName;
    },

    // 设置玩家分数
    // @myName: 己方分数
    // @enemyName: 对方分数
    /*setScores: function(myScore, enemyScore){
        var label1 = cc.find('myScore', this.stateBar.node).getComponent(cc.Label);
        var label2 = cc.find('enemyScore', this.stateBar.node).getComponent(cc.Label);
        label1.string = myScore;
        label2.string = enemyScore;
    },*/

    // 设置终端卡剩余状态显示
    // @group: 组别
    // @cl: 捕获的link数
    // @cv: 捕获的virus数
    setCaptureState(group, cl, cv){
        var label;
        if(this.group == group)
            label = cc.find('myTerminalState', this.stateBar.node).getComponent(cc.Label);
        else
            label = cc.find('enemyTerminalState', this.stateBar.node).getComponent(cc.Label);
        label.string = 'Link: '+cl+' Virus: '+cv;
    },

    // 实现交换效果
    // @c1: 第一个指定棋子在数组中的下标+1
    // @c2: 第二个指定棋子在数组中的下标+1
    // @isSwitch: 是否交换
    switchChess: function(group, c1, c2, isSwitch){
        // 获得指定chess对象
        var mass = cc.instantiate(this.p_mass);
        var chess1, chess2, team;
        team = this.group==group?this.myTeam:this.enemyTeam;
        
        chess1 = team[c1-1].node; chess2 = team[c2-1].node;

        var c1Script = chess1.getComponent('Chess'), c2Script = chess2.getComponent('Chess');
        var pos1 = chess1.getPosition(), pos2 = chess2.getPosition();
        var seq1, seq2, func1, func2, lbSet1=false, lbSet2=false;

        // 记录两枚棋子装备lineboost的状况
        if(isSwitch)
        {
            if(c1Script.hasLineBoost)
                lbSet2=true;
            else if(c2Script.hasLineBoost)
                lbSet1=true;
        }

        // 回调函数用以去掉switch、check标记并重置敌方棋子至背面并设置line boost交换情况
        func1 = cc.callFunc(()=>{
            c1Script.setSwitchTag(false);

            if(this.group!=group)
                c1Script.changeType('bottom');
            else
                c1Script.setCheckTag(false);
            
            if(isSwitch){
                this.setLineBoost(group, c1, lbSet1);
            }
        }, this);
        func2 = cc.callFunc(()=>{
            c2Script.setSwitchTag(false);
            
            if(this.group!=group)
                c2Script.changeType('bottom');
            else
                c2Script.setCheckTag(false);

            if(isSwitch){
                this.setLineBoost(group, c2, lbSet2);
            }
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
        
        if(this.group==group)
        {
            // 若是我方则设置nfSwitch为true
            this.nfSwitch = true;
        }

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
    setLineBoost: function(group, c, isSwitch){
        var chess;
        if(this.group == group)
            chess = this.myTeam[c-1].node.getComponent('Chess');
        else
            chess = this.enemyTeam[c-1].node.getComponent('Chess');
        if(group == this.group)
            this.lbSwitch = isSwitch;
        chess.setLineBoost(isSwitch);
    },

    // 防火墙效果
    // @bx, by: 指定的空格位置坐标
    // @isSwitch: 开启还是关闭
    // @group: fireWall的种类
    setFireWall: function(group, bx, by, isSwitch){
        var board = this.checkboard.node;
        let block = cc.find('line'+by+'/block'+bx, board);

        if(group == this.group)
            this.fwSwitch = isSwitch;
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
        else{
            chess.changeType(type);
            this.vcSwitch = true;
        }
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
        for(let key in this.myTeam){
            let script = this.enemyTeam[key].getComponent('Chess');
            script.clearFocusTag();
        }
        this.unsetPasses();

        cc.log('开启指定位置效果');
        for(let key in blocks)
        {
            let pos = blocks[key];
            this.setBlockCanPass(pos['x'], pos['y'], true);
            cc.log('指定位置', pos['x'], pos['y']);

            if(pos['chess'])
                this.enemyTeam[pos['chess']-1].getComponent('Chess').setLockTag(true);
        }
    },

    unsetPasses: function(){
        // 关闭所有通过效果
        for(let i = 1;i <= 8;i++)
        {
            for(let j = 1;j <= 8;j++)
            {
                let block = cc.find('line'+i+'/block'+j, this.checkboard.node).getComponent('block');
                block.setCanPass(false);
            }
        }
        for(let k = 1;k<=2;k++)
        {
            let block0 = cc.find('line0/block'+k, this.checkboard.node).getComponent('block');
            block0.setCanPass(false);
            let block9 = cc.find('line9/block'+k, this.checkboard.node).getComponent('block');
            block9.setCanPass(false);
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
                bullet.color = cc.color(168, 168, 168);
            break;
        }
        var seq = cc.sequence(cc.moveBy(time, -winWidth - bullet.width, 0), cc.callFunc(()=>{bullet.removeFromParent();}));
        cc.log(str, time);
        this.node.addChild(bullet);
        bullet.runAction(seq);
    },

    // 发送消息给服务端
    sendData: function(cmd){

        // 若连接中断则重连后再发送消息
        if (cc.webSocket.readyState !== WebSocket.OPEN) {
            // 记录当前待发送信息
            this.toSendData = cmd;
            // 断开重连
            cc.webSocket.close();
            this.initWebSocket();
            setTimeout(function() {
                self.sendData(cmd);
            }, 500);
        } else {
            if(this.reConnect)
            {
                this.reConnect = false;
                // 将验证信息与原本要发送的数据打包传给服务器
                let rcmd = {'code':'120', 'name':'reconnect', 
                data:{'power':cc.sys.localStorage.getItem('power'), 'room':this.room, 'send':Rson.encode(this.toSendData)}};
                this.toSendData = null;
                cc.log(rcmd);
                rcmd = Rson.encode(rcmd);
                cc.webSocket.send(rcmd);
                return;
            }
            cmd = Rson.encode(cmd);
            cc.log(cmd);
            cc.webSocket.send(cmd);
        };
    },

    showEffect: function(type, x, y){
        let p;
        switch(type){
            case 'honor':
                p = cc.instantiate(this.p_honor);
                this.checkboard.node.addChild(p);
                p.setPosition(this.convertBoardToNodeXY(x,y));

                this.playSound('link');
            break;

            case 'danger':
                p = cc.instantiate(this.p_danger);
                this.checkboard.node.addChild(p);
                p.setPosition(this.convertBoardToNodeXY(x,y));

                this.playSound('virus');
            break;

            case 'clickB':
                p = cc.instantiate(this.p_click_b);
                this.node.addChild(p);
                p.setPosition(x, y);

                this.playSound('click');
            break;

            case 'clickG':
                p = cc.instantiate(this.p_click_g);
                this.node.addChild(p);
                p.setPosition(x, y);

                this.playSound('click');
            break;

            case 'fire':
                p = cc.instantiate(this.p_fire);
                this.node.addChild(p);

                p.setPosition(x, y);
            break;
            
        }
    },

    // 播放音效
    playSound: function(effect){
        switch(effect){
            case 'link':
                cc.audioEngine.playEffect(this.sound.e_link);
            break;

            case 'virus':
                cc.audioEngine.playEffect(this.sound.e_virus);
            break;

            case 'line':
                cc.audioEngine.playEffect(this.sound.e_line);
            break;

            case 'wall':
                cc.audioEngine.playEffect(this.sound.e_wall);
            break;

            case 'check':
                cc.audioEngine.playEffect(this.sound.e_check);
            break;

            case 'exchange':
                cc.audioEngine.playEffect(this.sound.e_exchange);
            break;

            case 'begin':
                cc.audioEngine.playEffect(this.sound.e_begin);
            break;

            case 'move':
                cc.audioEngine.playEffect(this.sound.e_move);
            break;

            case 'click':
                cc.audioEngine.playEffect(this.sound.e_click);
            break;

            case 'lose':
                cc.audioEngine.playEffect(this.sound.e_lose);
            break;

            case 'win':
                cc.audioEngine.playEffect(this.sound.voice_win);
            break;

            case 'lb':
                cc.audioEngine.playEffect(this.sound.voice_lb);
            break;

            case 'fw':
                cc.audioEngine.playEffect(this.sound.voice_fw);
            break;

            case 'vc':
                cc.audioEngine.playEffect(this.sound.voice_vc);
            break;

            case 'nf':
                cc.audioEngine.playEffect(this.sound.voice_nf);
            break;
        }
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

    convertBoardToNodeXY: function(x, y){
        let nodeX=null, nodeY=null;
        if(y>=1 && y<=8){
            nodeX = -313 + 70*x;
            nodeY = 315 - 70*y;
        }

        if(nodeX && nodeY)
            return cc.p(nodeX, nodeY);
        else
            return null;
    },

    // 重新初始化websocket
    initWebSocket: function() {
        cc.log('重新连接服务器');
        this.reConnect = true;
        if (cc.webSocket) {
            cc.webSocket = new WebSocket(SOCKET_ADDRESS);
            cc.webSocket.onmessage = this.onWSMsg;
        }
    },

    // 回合结束时处理所有侦听
    turnEnd:function()
    {
        cc.log('回合结束');
        this.setTips('对手的回合');
        this.removeAllBoardEvent();
        this.removeTerminalChoose();

        this.sendData({'code':'91', 'name':'turnEnd', data:{}});
    }
});