var sha1 = require('sha1');
var Rson = require('Rson');

var callbacks;
cc.Class({
    extends: cc.Component,

    properties: {
        historyItem: cc.Prefab
    },

    // use this for initialization
    onLoad: function () {
        callbacks = this;
        // 操作面板
        this.operatorLayer = cc.find('Canvas/operator');
        this.waitingPanel = cc.find('Canvas/waitingPanel');
        this.loginPanel = cc.find('Canvas/loginPanel');
        this.registerPanel = cc.find('Canvas/registerPanel');
        // 等待面板元素
        this.waitingIcon = cc.find('Canvas/waitingPanel/icon');
        this.closeRoomBt = cc.find('Canvas/waitingPanel/closeBt');
        this.waitingLabel = cc.find('Canvas/waitingPanel/Label').getComponent(cc.Label);
        // socket初始化脚本
        this.initJs = cc.find('Canvas').getComponent('init');
        // 登录信息
        this.choiceLayer = cc.find('Canvas/operator/choiceLayer');
        this.loginPanel = cc.find('Canvas/loginPanel');
        this.registerPanel = cc.find('Canvas/registerPanel');
        this.account = cc.find('Canvas/loginPanel/account').getComponent(cc.EditBox);
        this.password = cc.find('Canvas/loginPanel/password').getComponent(cc.EditBox);
        // 注册信息
        this.registerAccount = cc.find('Canvas/registerPanel/username').getComponent(cc.EditBox);
        this.registerPassword1 = cc.find('Canvas/registerPanel/password').getComponent(cc.EditBox);
        this.registerPassword2 = cc.find('Canvas/registerPanel/passwordAgain').getComponent(cc.EditBox);
        this.registerEmail = cc.find('Canvas/registerPanel/email').getComponent(cc.EditBox);


        // 创建房间 信息
        this.create_password = cc.find('Canvas/operator/choiceLayer/battleLayer/create/pass').getComponent(cc.EditBox);
        // 加入房间 信息
        this.join_password = cc.find('Canvas/operator/choiceLayer/battleLayer/join/pass').getComponent(cc.EditBox);
        this.join_room = cc.find('Canvas/operator/choiceLayer/battleLayer/join/room').getComponent(cc.EditBox);


        // 观战信息
        this.visit_password = cc.find('Canvas/operator/choiceLayer/visitLayer/visit/pass').getComponent(cc.EditBox);
        this.visit_room = cc.find('Canvas/operator/choiceLayer/visitLayer/visit/room').getComponent(cc.EditBox);
        // 历史对局面板
        this.historyPanel = cc.find('Canvas/historyPanel');
        // 历史列表
        this.historyList = cc.find('historyList/view/content', this.historyPanel);
        // 对局号
        this.stepsId = cc.find('Canvas/operator/choiceLayer/visitLayer/reviewMore/stepId').getComponent(cc.EditBox);
        

        // 玩家名
        this.sysName = cc.find('Canvas/operator/choiceLayer/sysLayer/playerInfo/playerName').getComponent(cc.Label);
        // id
        this.sysId = cc.find('Canvas/operator/choiceLayer/sysLayer/playerInfo/playerId').getComponent(cc.Label);
        // 积分
        this.sysScore = cc.find('Canvas/operator/choiceLayer/sysLayer/playerInfo/playerScore').getComponent(cc.Label);
        // 注册时间
        this.sysRegisterTime = cc.find('Canvas/operator/choiceLayer/sysLayer/playerInfo/registerTime').getComponent(cc.Label);
        // 特殊称号
        this.honor = cc.find('Canvas/operator/choiceLayer/sysLayer/playerInfo/honor').getComponent(cc.Label);

        // 预加载场景
        cc.director.preloadScene('gameScene', function () {
            cc.log('game scene preloaded');
        });
    },

    onWSOpen: function(event){
        cc.log('websocket connected');
        // 尝试自动登录
        let power = cc.sys.localStorage.getItem('power');
        // 当本地保存了用户名密码时尝试自动登录，否则需要手动登录
        if(power != null && power != 'null' && power != '')
        {
            callbacks.autoLogin(power);
        }else{
            callbacks.loginPanel.active = true;
        }
    },

    onWSMsg: function(event){
        var data = Rson.decode(event.data);
        var msg = data.data;
        var self = callbacks;
        cc.log("serversend: code: " + data.code + ' data: ' + JSON.stringify(msg) + ' to: ' + data.to);
            
        switch(data.code){
            case '11':
                // 登录反馈
                if(msg.test)
                {
                    // 保存新的登录验证信息
                    cc.sys.localStorage.setItem('power', msg.power);
                    // 保存uid
                    cc.UID = msg.uid;
                    // 显示操作界面
                    self.loginPanel.active = false;
                    self.operatorLayer.active = true;
                    // 显示玩家信息
                    self.showPlayerInfo(msg.username, msg.uid, msg.score, msg.registerTime, msg.remark);
                }else{
                    cc.log(msg.error);
                    self.operatorLayer.active = false;
                    // 初始化登录界面
                    self.loginPanel.active = true;
                    self.password.string = '';
                    // 清空自动登录缓存
                    cc.sys.localStorage.setItem('power', null);
                }
                    
            break;

            case '12':
                // 注册反馈
                if(msg.test)
                {
                    // 保存验证信息
                    cc.sys.localStorage.setItem('power', msg.power);
                    // 保存uid
                    cc.UID = msg.uid;
                    // 显示操作界面
                    self.registerPanel.active = false;
                    self.operatorLayer.active = true;
                    // 显示玩家信息
                    self.showPlayerInfo(msg.username, msg.uid, msg.score, msg.registerTime, msg.remark);
                }else{
                    cc.log(msg.error);
                    self.operatorLayer.active = false;
                    // 初始化注册界面
                    self.registerPanel.active = true;
                    self.registerPassword1.string = '';
                    self.registerPassword2.string = '';
                }
            break;

            case '13':
                // 建房反馈
                if(msg.test)
                {
                    self.showWaitingPanel('房间'+msg.room+'已创建，正在等待对手', 2);
                }else{
                    self.updateWaitingPanel(msg.error, 2);
                }
            break;

            case '14':
                // 匹配反馈
                if(msg.test)
                {
                    // 匹配成功，切换游戏场景
                    cc.director.loadScene('gameScene');
                }else{
                    self.updateWaitingPanel(msg.error, 2);
                }
            break;

            case '16':
                // 观战反馈
                if(msg.test)
                    cc.director.loadScene('visitScene');
                else
                    self.updateWaitingPanel(msg.error, 2);

            break;

            case '17':
                // 退出匹配反馈
                this.operatorLayer.active = true;
                this.hideWaitingPanel();
            break;

            case '101':
                // 获取历史列表
                if(!msg.test)
                    return;

                let hsArray = msg.list;
                // 翻转数组
                hsArray.reverse();

                for(let i in hsArray){
                    let item = hsArray[i];
                    let historyItem = cc.instantiate(self.historyItem);
                    historyItem.historyId = item['id'];
                    historyItem.enemyId = item['Uid_1'] == cc.UID ? item['Uid_2'] : item['Uid_1'];
                    historyItem.getComponent(cc.Label).string = '历史对局 '+ (Number(i)+1) +'\n对局id: '+historyItem.historyId
                    +'\n对手id: '+historyItem.enemyId+'\n结束时间: \n'+item['Date'];

                    historyItem.on(cc.Node.EventType.TOUCH_END, function(){
                        let cmd = Rson.encode({'code':'102', 'name':'start review', data:{'stepId':historyItem.historyId}});
                        cc.log(cmd);
                        cc.webSocket.send(cmd);
                        self.historyPanel.active = false;
                        // 清除所有historyItem
                        self.historyList.removeAllChildren();
                    });
                    
                    self.historyList.addChild(historyItem);
                }
                self.historyPanel.active = true;
            break;

            case '102':
                if(!msg.test){
                    self.stepsId.string = '';
                    return;
                }
                // 开始战局回顾
                cc.historyString = msg.steps;
                // 跳转到回顾场景
                self.switchReviewScene();
            break;
        }
    },

    onWSErr: function(event){
        cc.log('websocket error');
    },

    onWSClose: function(event){
        cc.log('websocket will close');
        if(cc.webSocket.readyState === WebSocket.OPEN)
        {
            let cmd = Rson.encode({'code':'09', 'name':'exit', data:{}});
            cc.log(cmd);
            cc.webSocket.send(cmd);
        }
    },

    onBattleButton: function(){
        var move = cc.moveTo(0.2, cc.p(0, 0));
        this.choiceLayer.runAction(move);
    },

    onVisitButton: function(){
        var move = cc.moveTo(0.2, cc.p(-615, 0));
        this.choiceLayer.runAction(move);
    },

    onSysButton: function(){
        var move = cc.moveTo(0.2, cc.p(-1230, 0));
        this.choiceLayer.runAction(move);
    },
    //退出登录
    onLogout: function(){
        cc.sys.localStorage.setItem('power', '');
        // 断开websocket连接
        cc.webSocket.close();

        this.loginPanel.active = true;
        this.operatorLayer.active = false;
    },

    // 退出游戏
    onExitButton: function(){
        cc.log('finished');
        cc.director.end();
    },

    // 自动登录
    autoLogin: function(power){
        let cmd = Rson.encode({'code':'01', 'name':'login', data:{'power':power}});
        cc.log(cmd);
        cc.webSocket.send(cmd);
    },

    // 创建房间
    onCreateRoom: function(){
        this.c_pas = this.create_password.string;
        let cmd = Rson.encode({'code':'03', data:{'name':'create', 'password':this.c_pas}});
        cc.log(cmd);
        cc.webSocket.send(cmd);
        this.operatorLayer.active = false;
    },

    // 退出匹配
    onCloseRoom: function(){
        let cmd = Rson.encode({'code':'07', 'name':'closeR', data:{}});
        cc.log(cmd);
        cc.webSocket.send(cmd);

        this.operatorLayer.active = true;
        this.hideWaitingPanel();
    },

    // 加入房间
    onJoinRoom: function(){
        this.j_room = this.join_room.string;
        this.j_pas = this.join_password.string;
        if(this.j_room != '')
        {
            let cmd = Rson.encode({'code':'04', 'name':'join', data:{'room':this.j_room, 'password':this.j_pas}});
            cc.log(cmd);
            cc.webSocket.send(cmd);
            this.showWaitingPanel('正在搜索房间，请稍后');
            this.operatorLayer.active = false;
        }else{
            cc.log('join room failed!');
            this.j_pas = '';
            this.join_password.string = '';
        }
    },

    // 随机加入房间
    onJoinRandomRoom: function(){
        let cmd = Rson.encode({'code':'05', 'name':'rand', data:{}});
        cc.log(cmd);
        cc.webSocket.send(cmd);
        this.showWaitingPanel('正在匹配房间，请稍后');
        this.operatorLayer.active = false;
    },

    // 参观房间
    onVisitRoom: function(){
        this.v_room = this.visit_room.string;
        this.v_pas = this.visit_password.string;
        if(this.v_room != '')
        {
            let cmd = Rson.encode({'code':'06', 'name':'visit', data:{'room':this.v_room, 'password':this.v_pas}});
            cc.log(cmd);
            cc.webSocket.send(cmd);
            this.showWaitingPanel('正在搜索房间，请稍后');
            this.operatorLayer.active = false;
        }else{
            cc.log('visit room failed!');
            this.v_pas = '';
            this.visit_password.string = '';
        }
    },

    // 登录面板-登录
    onLoginLogin: function(){
        this.acc = this.account.string;
        this.pas = this.password.string;
        // 密码长度10~18位，必须包含数字字母，允许数字大小写字母中、下划线
        var pass_reg = /^(?=.{10,18}$)(?![0-9-_]+$)(?![a-zA-Z-_]+$)[0-9a-zA-Z-_]+$/;
        if(this.acc != '' && pass_reg.test(this.pas))
        {
            this.pas = sha1.hex_sha1(this.pas);
            let cmd = Rson.encode({'code':'01', 'name':'login', data:{'username':this.acc, 'password':this.pas}});
            cc.log(cmd);
            if(cc.webSocket && cc.webSocket.readyState === WebSocket.OPEN)
                cc.webSocket.send(cmd);
            else{
                cc.webSocket = this.initJs.initWebSocket(SOCKET_ADDRESS, function(){ cc.webSocket.send(cmd); });
            }
        }else{
            cc.log('login failed!');
            this.pas = '';
            this.password.string = '';
        }
    },

    // 登录面板-注册
    onLoginRegister: function(){
        if(this.loginPanel.active)
        {
            this.loginPanel.active = false;
            this.registerPanel.active = true;
        }
    },

    // 注册面板-登录
    onRegisterLogin: function(){
        if(this.registerPanel.active)
        {
            this.loginPanel.active = true;
            this.registerPanel.active = false;
        }
    },

    // 注册面板-注册
    onRegisterRegister: function(){
        this.r_acc = this.registerAccount.string;
        this.r_pas1 = this.registerPassword1.string;
        this.r_pas2 = this.registerPassword2.string;
        this.r_email = this.registerEmail.string;
        // 正则表达式
        // 密码长度10~18位，必须包含数字字母，允许数字大小写字母中、下划线
        var pass_reg = /^(?=.{10,18}$)(?![0-9-_]+$)(?![a-zA-Z-_]+$)[0-9a-zA-Z-_]+$/;
        // 邮箱格式为xxx@xxx.xxx[.xxx]，可以是二级域名邮箱
        var email_reg = /^([a-zA-Z0-9_-])+@([a-zA-Z0-9_-])+((\.[a-zA-Z0-9_-]{2,3}){1,2})$/;

        if(this.r_acc != '' && this.r_acc.length < 15 && pass_reg.test(this.r_pas1) && this.r_pas2 === this.r_pas1 && email_reg.test(this.r_email))
        {
            this.r_pas1 = sha1.hex_sha1(this.r_pas1);
            let cmd = Rson.encode({'code':'02', 'name':'register', data:{'username':this.r_acc, 'password':this.r_pas1, 'email':this.r_email}});
            cc.log(cmd);
            cc.webSocket.send(cmd);
        }else{
            cc.log('register failed!');
            this.r_pas1 = '';
            this.r_pas2 = '';
            this.registerPassword1.string = '';
            this.registerPassword2.string = '';
        }
    },

    // 获取历史记录列表
    onFetchHistoryList: function(){
        let cmd = Rson.encode({'code':'101', 'name':'fetch historyList', data:{}});
        cc.log(cmd);
        cc.webSocket.send(cmd);
    },

    // 按对局id预览对局
    onSearchStepsById: function(){
        let id = this.stepsId.string;
        if(!id)
            return;

        let cmd = Rson.encode({'code':'102', 'name':'start review', data:{'stepId':id}});
        cc.log(cmd);
        cc.webSocket.send(cmd);
    },

    // 显示等待面板
    showWaitingPanel: function(str, mode){
        mode = mode?mode:1;
        if(!this.waitingPanel.active)
            this.waitingPanel.active = true;
        this.waitingLabel.string = str;
        if(mode == 1)
            this.waitingIcon.active = true;
        else
            this.closeRoomBt.active = true;
    },

    // 更新等待面板
    updateWaitingPanel: function(str, mode){
        if(!this.waitingPanel.active)
            return;
        mode = mode?mode:1;
        this.waitingLabel.string = str;
        if(mode == 1){
            this.waitingIcon.active = true;
            this.closeRoomBt.active = false;
        }
        else{
            this.closeRoomBt.active = true;
            this.waitingIcon.active = false;
        }
    },

    // 隐藏等待面板
    hideWaitingPanel: function(){
        if(!this.waitingPanel.active)
            return;
        this.waitingIcon.active = false;
        this.closeRoomBt.active = false;
        this.waitingPanel.active = false;
    },

    switchReviewScene: function(){
        cc.director.loadScene('reviewScene');
    },

    // 打开规则
    onOpenRule: function(){
        cc.sys.openURL('http://tieba.baidu.com/p/4773429215');
    },

    // 显示玩家个人信息
    showPlayerInfo: function(name, id, score, time, honor){
        // 用户名
        let sysName = this.sysName;
        // id
        let sysId = this.sysId;
        // 积分
        let sysScore = this.sysScore;
        // 注册时间
        let registerTime = this.sysRegisterTime;
        // 特殊称号
        let honorName = this.honor;

        sysName.string = name;
        sysId.string = id;
        sysScore.string = score;
        registerTime.string = time;
        honorName.string = honor?honor:'无';

        // 根据积分改变字体颜色
        let color;

        if(score < 10)
            color = cc.color(238, 238, 238);
        else if(score < 50)
            color = cc.color(107, 239, 105);
        else if(score < 150)
            color = cc.color(143, 255, 0);
        else if(score < 400)
            color = cc.color(186, 169, 255);
        else if(score < 1000)
            color = cc.color(89, 47, 255);
        else
            color = cc.color(255, 0, 0);

        // 设置颜色
        sysName.node.color = color;
        sysId.node.color = color;
        sysScore.node.color = color;
        registerTime.node.color = color;
        honorName.node.color = color;
    }

});
