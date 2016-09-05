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
        arrowCanPress: true,
        myServerSize: 0,
        enemyServerSize: 0,
        captureL: 0,
        captureV: 0,
    },

    // use this for initialization
    onLoad: function () {
        cc.log("回顾场景加载");
        
        this.plistUrl = 'Texture/Tex1'; //plist的url
        this.currentChess = null;
        this.tips = cc.find('Canvas/fitLayer/stateBar/tips').getComponent(cc.Label);
        this.stateBar = cc.find('Canvas/fitLayer/stateBar').getComponent(cc.Sprite);
        this.buttonBar = cc.find('Canvas/fitLayer/buttonBar').getComponent('buttonBar');
        //0.1s1次不断回滚的文字
        this.animeLabel = cc.find('Canvas/fitLayer/buttonBar/label').getComponent(cc.Label);
        let animeCount = 0;
        this.schedule(function(){
            let add = 'Reviewing';
            for(let i = 0;i < animeCount%10;i++)
            {
                if(i%2 == 0)
                    add += ' ';
                else
                    add += '.';
            }
            self.animeLabel.string = add;
            animeCount++;
        }, 0.1);

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
            // 准备完成后解析战报
            this.battleSteps = JSON.parse(cc.historyString);
            // 战报位置指针
            this.point = -1;//永远指向当前位置
            this.bottomPoint = 0;//指向战报读取的最低点，开始后当前位置永远在此之上
            // 已执行过的步骤数组
            this.doneTable = new Array();

            // 循环遍历battleSteps，去除中间的无效项
            let steps = this.battleSteps;
            for(let i = steps.length - 1;i >= 0;i--)
            {
                // 移除玩家请求命令
                if(steps[i].indexOf("\"name\":") > 0)
                    steps.splice(i,1);
                // 去除23、24、51、61、71、81命令
                else if(steps[i].indexOf("\"code\":\"51") > 0 || steps[i].indexOf("\"code\":\"61") > 0 || steps[i].indexOf("\"code\":\"71") > 0
                || steps[i].indexOf("\"code\":\"23") > 0 || steps[i].indexOf("\"code\":\"24") > 0 || steps[i].indexOf("\"code\":\"81") > 0)
                    steps.splice(i,1);
                // 获得最终全棋子身份
                else if(steps[i].indexOf("\"code\":\"91") > 0 && steps[i].indexOf("identify"))
                {
                    this.finalCode = Rson.decode(steps[i]).data;
                }
            }

            // 连续执行命令直到一方回合开始
            while(true){
                if(steps[this.point+1].indexOf("\"code\":\"21") <= 0)
                    break;
                this.onWSMsg(this.battleSteps[++this.point]);
                this.bottomPoint = this.point;
            }
            if(this.point < this.battleSteps.length - 1)
                this.onWSMsg(this.battleSteps[++this.point]);

        });

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

    // 运行或退回某一步骤
    // @isFoward : bool  若是前进一步则为true，后退为false
    runStep: function(isFoward){
        if(isFoward && this.point > this.bottomPoint && this.point < this.battleSteps.length - 1){
            this.onWSMsg(this.battleSteps[++this.point]);

        }else if(!isFoward && this.point > this.bottomPoint + 1 && this.point < this.battleSteps.length + 1){
            this.onBack(this.doneTable.pop());
            this.point--;
        }
    },

    // 给 返回ui 的回调函数
    onArrowBack: function(){
        if(self.arrowCanPress){
            // 点击前进/后退按钮后有0.5秒硬直
            self.arrowCanPress = false;
            self.runStep(false);
            self.schedule(function(){
                self.arrowCanPress = true;
            }, 0.5, 1);
        }
    },
    // 给 前进ui 的回调函数
    onArrowAhead: function(){
        if(self.arrowCanPress){
            // 点击前进/后退按钮后有0.5秒硬直
            self.arrowCanPress = false;
            self.runStep(true);
            self.schedule(function(){
                self.arrowCanPress = true;
            }, 0.5, 1);
        }
    },

    // 退出回放系统
    closePop: function(){
        var pop = this.pop.getComponent('Pop');
        pop.show('reviewClose');
    },

    // 模拟战斗时websocket回调
    onWSMsg: function(data){
        var data = Rson.decode(data);
        var msg = data.data;
        cc.log("Forward: code: ", data.code, ' data: ', msg, ' to: ', data.to);

        switch(data.code){
            case '21':
                //tips
                self.setTips('游戏开始');
                // 记录已执行命令
                self.doneTable.push({'code':data.code, 'to':data.to, 'room':msg.room, 'myName':msg.myName, 'enemyName':msg.enemyName, 'group':msg.group});

                // 游戏开始
                //检查当前信息是否发给自己，若两边都不是自己则直接开始
                if(data.to != cc.UID && !self.checkedUser){
                    self.checkedUser = 1;
                    return;
                }else if(data.to != cc.UID && self.checkedUser === 1){
                    self.checkedUser = 2;
                    self.UID = data.to;
                }else if(!self.checkedUser || self.checkedUser === 1){
                    self.UID = data.to;
                    self.checkedUser = 3;
                }else
                    return;
                cc.log('checkedUser: '+self.checkedUser);

                self.room = msg.room;
                self.setRoom(msg.room);
                self.myName = msg.myName;self.enemyName = msg.enemyName;
                self.setPlayerNames(msg.myName, msg.enemyName);
                self.group = msg.group;
                self.enemyGroup = msg.group=='G'?'B':(msg.group=='B'?'G':null);
                self.changeMap(msg.group);

                // 是否开局显示棋子身份?
                if(self.checkedUser == 3)
                {
                    self.checkedUser = true;
                    let idens = self.finalCode.identify;
                    for(let i = 0;i < idens.length;i++)
                    {
                        for(let k = 0;k < 8;k++)
                        {
                            let iden = idens[i];
                            if(iden['group'] == self.group){
                                let mc = self.myTeam[k].getComponent('Chess');
                                if(mc.grpNum == iden['no']){
                                    mc.changeType(iden['type']?iden['type']:'bottom');
                                    break;
                                }
                            }else{
                                let ec = self.enemyTeam[k].getComponent('Chess');
                                if(ec.grpNum == iden['no']){
                                    ec.changeType(iden['type']?iden['type']:'bottom');
                                    break;
                                }
                            }
                        }
                    }
                }else
                    self.checkedUser = false;

                // 计时器循环播放背景音乐
                self.bgmScheduleFunc = function(){
                    
                    if(!cc.audioEngine.isMusicPlaying())
                    {
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

            case '31':
                // 记录已执行命令
                self.doneTable.push({'code':data.code, 'to':data.to, 'test':msg.test, 'target':msg.target});

                // 超速回线 反馈
                if(data.to == self.UID)
                {
                    //己方
                    if(!msg.test){
                        //tips
                        self.setTips('取消Line Boost');
                        // 音效
                        self.playSound('line');
                        // 摘除已装备的超速回线
                        self.setLineBoost(self.group, msg.target, false);
                        // 回合结束
                        self.turnEnd();
                    }else
                        self.runStep(true);
                }else{
                    //敌方
                    if(!msg.test)
                    {
                        //tips
                        self.setTips('取消Line Boost');
                        // 音效
                        self.playSound('line');
                        // 摘除已装备的超速回线
                        self.setLineBoost(self.enemyGroup, msg.target, false);
                    }else
                        self.runStep(true);
                }
                
            break;

            case '33':
                //tips
                self.setTips('装备Line Boost');
                // 记录已执行命令
                self.doneTable.push({'code':data.code, 'to':data.to, 'test':msg.test, 'target':msg.target});

                // 音效
                self.playSound('line');
                self.playSound('lb');
                // 超速回线 确认
                if(data.to == self.UID)
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
                // 记录已执行命令
                self.doneTable.push({'code':data.code, 'to':data.to, 'test':msg.test, 'target':msg.target});

                // 防火墙 反馈
                if(data.to == self.UID){
                    if(!msg.test){
                        //tips
                        self.setTips('取消Fire Wall');
                        // 音效
                        self.playSound('wall');
                        // 移除己方现有防火墙
                        self.setFireWall(self.group, msg.target['x'], msg.target['y'], false);
                        // 回合结束
                        self.turnEnd();
                    }else
                        self.runStep(true);
                }else{
                    if(!msg.test)
                    {
                        //tips
                        self.setTips('取消Fire Wall');
                        // 音效
                        self.playSound('wall');
                        // 移除己方现有防火墙
                        self.setFireWall(self.enemyGroup, 9-msg.target['x'], 9-msg.target['y'], false);
                    }else
                        self.runStep(true);
                }
                
            break;

            case '43':
                //tips
                self.setTips('放置Fire Wall');
                // 记录已执行命令
                self.doneTable.push({'code':data.code, 'to':data.to, 'test':msg.test, 'target':msg.target});

                // 音效
                self.playSound('wall');
                self.playSound('fw');
                // 防火墙 确认
                if(data.to == self.UID)
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
                        // 添加wall
                        self.setFireWall(self.enemyGroup, 9-msg.target['x'], 9-msg.target['y'], true);
                }
                
            break;

            case '53':
                //tips
                self.setTips('发动Virus Checker');
                // 记录已执行命令
                self.doneTable.push({'code':data.code, 'to':data.to, 'test':msg.test, 'target':msg.target, 'result':msg.result});

                // 音效
                self.playSound('check');
                self.playSound('vc');
                // 探查 结束
                if(data.to == self.UID)
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

            case '63':
                //tips
                self.setTips('发动404 Not Found');
                // 音效
                self.playSound('exchange');
                self.playSound('nf');
                // 交换 确认
                if(data.to == self.UID)
                {
                    if(msg.test)
                    {
                        // 记录已执行命令
                        let c_no1 = self.myTeam[msg.no1-1].getComponent('Chess');
                        let c_no2 = self.myTeam[msg.no2-1].getComponent('Chess');
                        self.doneTable.push({'code':data.code, 'to':data.to, 'test':msg.test, 
                        'no1':msg.no1, 'no2':msg.no2, 'check':msg.check, 'checked1':c_no1.checked?c_no1.type:false, 'checked2':c_no2.checked?c_no2.type:false});
                        // 交换
                        self.switchChess(self.group, msg.no1, msg.no2, msg.check, null);
                        // 回合结束
                        self.turnEnd();
                    }else
                        cc.log(msg.error);
                }else{
                    if(msg.test){
                        // 记录已执行命令
                        let c_no1 = self.enemyTeam[msg.no1-1].getComponent('Chess');
                        let c_no2 = self.enemyTeam[msg.no2-1].getComponent('Chess');
                        self.doneTable.push({'code':data.code, 'to':data.to, 'test':msg.test, 
                        'no1':msg.no1, 'no2':msg.no2, 'check':msg.check, 'checked1':c_no1.checked?c_no1.type:false, 'checked2':c_no2.checked?c_no2.type:false});
                        // 交换
                        self.switchChess(self.enemyGroup, msg.no1, msg.no2, msg.check, null);
                    }
                }
            break;

            case '73':
                //tips
                self.setTips('移动棋子');
                // 记录已执行命令
                let myChess = self.myTeam[msg.target-1].getComponent('Chess');
                let enemyChess = self.enemyTeam[msg.target-1].getComponent('Chess');
                let eatenChess;
                
                let result = msg.result;
                if(msg.result['type'] == 1)
                    self.doneTable.push({'code':data.code, 'to':data.to, 'test':msg.test, 'target':msg.target, 'result':msg.result, 
                    'origin':{'x':(data.to==self.UID?myChess:enemyChess).posX, 'y':(data.to==self.UID?myChess:enemyChess).posY} });

                else if(msg.result['type'] == 2){
                    eatenChess = (data.to==self.UID?self.enemyTeam:self.myTeam)[msg.result['eno']-1].getComponent('Chess');
                    
                    self.doneTable.push({'code':data.code, 'to':data.to, 'test':msg.test, 'target':msg.target, 'result':msg.result, 
                    'origin':{'x':(data.to==self.UID?myChess:enemyChess).posX, 'y':(data.to==self.UID?myChess:enemyChess).posY, 
                    'echecked':eatenChess.checked, 'elb':result['moveLB'], 'captureL':self.captureL, 'captureV':self.captureV} });

                }else{
                    self.doneTable.push({'code':data.code, 'to':data.to, 'test':msg.test, 'target':msg.target, 'result':msg.result, 
                    'origin':{'x':(data.to==self.UID?myChess:enemyChess).posX, 'y':(data.to==self.UID?myChess:enemyChess).posY, 
                    'echecked':(data.to==self.UID?myChess:enemyChess).checked, 'lb':result['moveLB'], 'captureL':self.captureL, 'captureV':self.captureV} });
                }

                // 音效
                self.playSound('move');
                // 棋子移动 确认
                if(data.to == self.UID)
                {
                    if(msg.test)
                    {
                        let result = msg.result;
                        if(result['type'] != 3)
                            self.moveChess(self.group, msg.target, result['x'], result['y']);

                        // 若移动模式为进攻（吃了别的棋子）则移除掉对应棋子
                        if(result['type']==2){

                            let script = eatenChess;
                            script.clearAllTag();

                            if(self.checkedUser == false)
                                script.changeType(result['etype']);
                            
                            self.captureL = result['captureL'];
                            self.captureV = result['captureV'];
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
                                self.lbSwitch = false;

                            let script = myChess;
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
                            self.captureL = result['captureL'];
                            self.captureV = result['captureV'];
                            self.setCaptureState(self.enemyGroup, result['captureL'], result['captureV']);
                            self.moveChess(self.group, result['eno'], 9-result['ex'],9-result['ey']);

                            if(self.checkedUser == false)
                                eatenChess.changeType(result['etype']);
                            if(result['moveLB'])
                                self.lbSwitch = false;

                            // 显示吃子时的粒子特效
                            if(result['etype']=='link')
                                self.showEffect('honor', 9-result['x'], 9-result['y']);
                            else
                                self.showEffect('danger', 9-result['x'], 9-result['y']);

                        }else if(result['type']==3){
                            // 按server现存棋子数移动棋子位置
                            self.enemyServerSize++;
                            self.moveChess(self.enemyGroup, msg.target, self.enemyServerSize, 9-result['y']);

                            let script = enemyChess;
                            script.clearAllTag();
                        }
                    }
                }
            break;

            case '91':
                // 记录已执行命令
                self.doneTable.push({'code':data.code, 'to':data.to, 'winner':msg.winner});

                // 游戏结束
                // 停止bgm回调并静音
                // self.unschedule(self.bgmScheduleFunc);
                // cc.audioEngine.pauseMusic();

                // 结束演出
                if(msg.winner == self.UID)
                {
                    self.setTips("游戏结束，我方获胜");
                }else{
                    self.setTips('游戏结束，'+self.enemyName+'获胜');
                }
            break;
        }
    },

    // 回退函数
    onBack: function(data){
        var msg = data;
        cc.log("Back to: code: ", data.code, ' data: ', msg, ' to: ', data.to);

        switch(data.code){

            case '31':
                // 超速回线 反馈
                if(data.to == self.UID)
                {
                    //己方
                    if(!msg.test){
                        //tips
                        self.setTips('撤销 取消Line Boost');
                        // 摘除已装备的超速回线
                        self.setLineBoost(self.group, msg.target, true);
                    }else
                        self.runStep(false);
                }else{
                    //敌方
                    if(!msg.test){
                        //tips
                        self.setTips('撤销 取消Line Boost');
                        // 摘除已装备的超速回线
                        self.setLineBoost(self.enemyGroup, msg.target, true);
                    }else
                        self.runStep(false);
                }
                
            break;

            case '33':
                //tips
                self.setTips('撤销 使用Line Boost');
                // 超速回线 确认
                if(data.to == self.UID)
                {
                    if(msg.test)
                        // 装备超速回线
                        self.setLineBoost(self.group, msg.target, false);
                }else{
                    if(msg.test)
                        // 装备超速回线
                        self.setLineBoost(self.enemyGroup, msg.target, false);
                }
            break;

            case '41':
                // 防火墙 反馈
                if(data.to == self.UID){
                    if(!msg.test){
                        //tips
                        self.setTips('撤销 取消Fire Wall');
                        // 移除己方现有防火墙
                        self.setFireWall(self.group, msg.target['x'], msg.target['y'], true);
                    }else
                        self.runStep(false);
                }else{
                    if(!msg.test){
                        //tips
                        self.setTips('撤销 取消Fire Wall');
                        // 移除己方现有防火墙
                        self.setFireWall(self.enemyGroup, 9-msg.target['x'], 9-msg.target['y'], true);
                    }else
                        self.runStep(false);
                }
                
            break;

            case '43':
                //tips
                self.setTips('撤销 使用Fire Wall');
                // 防火墙 确认
                if(data.to == self.UID)
                {
                    if(msg.test)
                        // 添加wall
                        self.setFireWall(self.group, msg.target['x'], msg.target['y'], false);
                }else{
                    if(msg.test)
                        // 添加wall
                        self.setFireWall(self.enemyGroup, 9-msg.target['x'], 9-msg.target['y'], false);
                }
                
            break;

            case '53':
                //tips
                self.setTips('撤销 使用Virus Checker');
                // 探查 结束
                if(data.to == self.UID)
                {
                    if(msg.test)
                        self.unsetVirusChecker(self.enemyGroup, msg.target);
                }else{
                    if(msg.test)
                        self.unsetVirusChecker(self.group, msg.target);
                }
                
            break;

            case '63':
                //tips
                self.setTips('撤销 使用 404 Not Found');
                // 交换 确认
                if(data.to == self.UID)
                {
                    if(msg.test)
                        self.switchChess(self.group, msg.no1, msg.no2, msg.check, new Array(msg.checked1, msg.checked2));
                }else{
                    if(msg.test)
                        self.switchChess(self.enemyGroup, msg.no1, msg.no2, msg.check, new Array(msg.checked1, msg.checked2));
                }
            break;

            case '73':
                //tips
                self.setTips('撤销 移动棋子');
                // 棋子移动 确认
                if(data.to == self.UID)
                {
                    if(msg.test)
                    {
                        let result = msg.result;
                        let origin = msg.origin;
                        // 将棋子移回原位
                        self.moveChess(self.group, msg.target, origin['x'], origin['y']);

                        // 若移动模式为进攻（吃了别的棋子）则移除掉对应棋子
                        if(result['type']==2){

                            let script = self.enemyTeam[result['eno']-1].getComponent('Chess');

                            if(origin['elb'])
                                script.setLineBoost(true);
                            if(origin['checked'] && self.checkedUser)
                                script.setCheckTag(true);
                            else if(self.checkedUser == false && !origin['checked'])
                                script.changeType('bottom');
                            
                            self.myCaptureL = origin['captureL'];
                            self.myCaptureV = origin['captureV'];
                            self.setCaptureState(self.group, origin['captureL'], origin['captureV']);
                            
                            self.moveChess(self.enemyGroup, result['eno'], result['x'], result['y']);
                        }
                        // 若是移入database
                        if(result['type']==3){
                            // 按server现存棋子数移动棋子位置
                            self.myServerSize--;

                            let script = self.myTeam[msg.target-1].getComponent('Chess');

                            if(origin['lb']){
                                self.lbSwitch = true;
                                script.setLineBoost(true);
                            }

                            if(origin['checked']){
                                self.vcSwitch = true;
                                script.setCheckTag(true);
                            }
                        }
                    }
                }else{
                    if(msg.test)
                    {
                        let result = msg.result;
                        let origin = msg.origin;
                        self.moveChess(self.enemyGroup, msg.target, origin['x'], origin['y']);

                        // 若移动模式为进攻（吃了别的棋子）则移除掉对应棋子
                        if(result['type']==2){
                            self.enemyCaptureL = origin['captureL'];
                            self.enemyCaptureV = origin['captureV'];
                            self.setCaptureState(self.enemyGroup, result['captureL'], result['captureV']);
                            self.moveChess(self.group, result['eno'], 9-result['x'],9-result['y']);

                            let script = self.myTeam[result['eno']-1].getComponent('Chess');

                            if(origin['elb']){
                                self.lbSwitch = true;
                                script.setLineBoost(true);
                            }

                            if(origin['checked'] && self.checkedUser){
                                self.vcSwitch = true;
                                script.setCheckTag(true);
                            }else if(!origin['checked'] && self.checkedUser == false)
                                script.changeType('bottom');

                        }else if(result['type']==3){
                            // 按server现存棋子数移动棋子位置
                            self.enemyServerSize--;

                            let script = self.enemyTeam[msg.target-1].getComponent('Chess');
                            
                            if(origin['lb'])
                                script.setLineBoost(true);

                            if(origin['checked'] && self.checkedUser)
                                script.setCheckTag(true);
                        }
                    }
                }
            break;

            case '91':
                self.runStep(false);
            break;
        }
    },

    // 结束游戏演出
    showEndEffect: function(isWinner){
        if(isWinner)
        {
            // 音效
            self.playSound('win');
        }else{
            // 音效
            this.playSound('lose');
        }
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
    // @checkBack: 是否回退check状态 数组
    switchChess: function(group, c1, c2, isSwitch, checkBack){
        // 获得指定chess对象
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

            if(!checkBack || !checkBack[0]){
                if(!self.checkedUser)
                    c1Script.changeType('bottom');
                else
                    c1Script.setCheckTag(false);
            }else{
                if(!self.checkedUser)
                    c1Script.changeType(checkBack[0]);
                else
                    c1Script.setCheckTag(true);
            }
            
            c1Script.setLineBoost(lbSet1);
        }, this);
        func2 = cc.callFunc(()=>{
            c2Script.setSwitchTag(false);
            
            if(!checkBack || !checkBack[1]){
                if(!self.checkedUser)
                    c2Script.changeType('bottom');
                else
                    c2Script.setCheckTag(false);
            }else{
                if(!self.checkedUser)
                    c2Script.changeType(checkBack[1]);
                else
                    c2Script.setCheckTag(true);
            }

            c2Script.setLineBoost(lbSet2);
        }, this);

        if(isSwitch){
            seq1 = cc.sequence(c1Script.bezierMove(), func1, cc.moveTo(0.3, pos2));
            seq2 = cc.sequence(c2Script.bezierMove(), func2, cc.moveTo(0.3, pos1));
        }else{
            seq1 = cc.sequence(c1Script.bezierMove(), func1, cc.moveTo(0.3, pos1));
            seq2 = cc.sequence(c2Script.bezierMove(), func2, cc.moveTo(0.3, pos2));
        }
        // 开始演出
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
        
        if(group==this.group || self.checkedUser)
            chess.setCheckTag(true);
        else{
            chess.changeType(type);
            this.vcSwitch = true;
        }
    },

    // 取消探查器效果
    unsetVirusChecker: function(group, c){
        let team = group==this.group?this.myTeam:this.enemyTeam;
        var chess = team[c-1].node.getComponent('Chess');
        
        if(group==this.group || self.checkedUser)
            chess.setCheckTag(false);
        else{
            chess.changeType('bottom');
            this.vcSwitch = false;
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

    // 回合结束时处理所有侦听
    turnEnd:function(){
        cc.log('回合结束');
    }
});