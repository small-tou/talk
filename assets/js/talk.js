/**
var Notify = function(){}
//判断是否支持webkitNotifications
Notify.prototype.isSupport = function(){
    return !!window.webkitNotifications;
}
//需要向用户申请权限来确定是否支持webkitNotifications，如果得到权限，就会执行callback，参数为true.
Notify.prototype.getPermission = function(callback){
    try {
        window.webkitNotifications.requestPermission(function () {
            if (callback) {
                callback(this.checkPermission());
            }
        });
        Notification.requestPermission();
    }catch(e){

    }
}
//查看是否得到权限
Notify.prototype.checkPermission = function(){
    return !!(window.webkitNotifications.checkPermission() == 0);
}
//声明一个webkitNotifications实例，并且使用show方法触发桌面提示框
Notify.prototype.show = function(icon, title, body){
    //声明webkitNotifications实例
    try{

        var _notify = window.webkitNotifications.createNotification(icon, title, body);
        _notify.show();

    }catch(e){

    }
    try{
        var no = new Notification("前端乱炖通知", {
            title: title,
            body: body,
            tag:"m1",
            icon:"http://htmljs.b0.upaiyun.com//images/logo.png?123",
        });
        setTimeout(function(){
            no.close()
        },2500)
    }catch(e){

    }

}
var notify = new Notify();
if (notify.isSupport()) {
    notify.getPermission();
}
*/

var SocketController = function(){
    var socket;
    return {
        init: function (config) {
            socket = io.connect('/?id=' + config.id + '&nick=' + config.nick, {port: 6767});
            socket.on('connected', function (data) {
                console.log("connected");
                socket.emit('get-uuid', {id: "dd"});
                $(".status").html("连接成功，等待用户发起聊天")
            });
            socket.on("login_anywhere",function(){
                alert("账号在别处登录，自动退出。")
            })
            socket.on("new-message", function (data) {
                console.log(data)
                setTimeout(function () {
                    SoucheIMData.addMessage(data);
                })
            })
            socket.socket.on("error", function (data) {
                console.log("error:" + data)
                $(".status").html("连接失败")
            })
            socket.socket.on("connect", function (data) {
                $(".status").html("正在与客服建立连接")
            })
        },
        sendMessage: function (msg) {
            socket && socket.emit('new-message', msg);
        }
    }
}();




var SoucheIMUtil = function(){
    var souche_token = "ScM9Eno7f2dl0vz"
    var username_cache = {

    }
    return {
        /**
         * 获取最近联系人列表
         * @param user_id
         * @param callback
         */
        getRecentContacts:function(user_id,callback){
            $.ajax({
                url:contextPath+"/pages/app/thumbelina/messageAction/getChatList.json",
                data:{
                    token:souche_token,
                    user:user_id
                },
                dataType:"json",
                success:function(data){
                    if(data.code=="100000"){
                        data.data.chatList.forEach(function(c){
                            if(/^[0-9]*$/.test(c.friendId)){
                                c.friendId = "cn_"+ c.friendId
                            }
                        })
                        callback(data.data.chatList);
                    }
                }
            })
        },
        /**
         * 向网站同步一份消息，主要用来做最近联系人列表
         * @param toUserId
         * @param content
         */
        sendMessage:function(toUserId,content){
            $.ajax({
                url:contextPath+"/pages/app/thumbelina/messageAction/send.json",
                data:{
                    receiver:toUserId,
                    type:0,
                    content:content
                },
                dataType:"json",
                success:function(data){
                    console.log(data)
                }
            })
        },
        /**
         * 获取昵称，带缓存
         * @param user_id
         * @param callback
         */
        getUsername:function(user_id,callback){
            if(username_cache[user_id]){
                callback(username_cache[user_id])
                return;
            }
            $.ajax({
                url:contextPath+"/pages/app/thumbelina/easemobIMUsersAction/getChatUserInfo.json",
                data:{
                    id:user_id
                },
                dataType:"json",
                success:function(data){
                    if(data.code==100000){
                        username_cache[user_id] = data.data.userInfo.friendName;
                        callback(data.data.userInfo.friendName);
                    }
                }
            })
        },
        /**
         * 先去获取环信用户名和密码
         * @param phone
         * @param callback
         */
        getLoginInfo:function(phone,callback){
            $.ajax({
                url:contextPath+"/pages/app/thumbelina/chatIDMapAction/getMapChatID.json",
                data:{
                    userId:phone
                },
                dataType:"json",
                success:function(data){
                    if(data.code==100000){
                        callback(data.data.chatId,data.data.pwd);
                    }
                }
            })
        }
    }
}();

var SoucheIMData = function(){
    var lastMessageTime = 0;
    var DB = SCDB;
    var souchedb = new DB("souche");
    return {
        contacts:[],
        now_chat_userid:"admin",
        my_userid:"",
        messages:{},
        switch_active:function(user_id){
            this.now_chat_userid = user_id;
            this.contacts.forEach(function(c){
                if(c.friendId==user_id){
                    c.unReadMsg = 0;
                }
            })
            SoucheIMRender.clearChatView();
        },
        /**
         * 添加一条最近联系人，如果已存在则忽略，但是未读会+1
         * @param user_id
         */
        addContact:function(user_id,user_nick){
            var is_in = false;
            var self = this;
            this.contacts.forEach(function(c,i){
                if(c.friendId==user_id){
                    is_in = true;
                    c.unReadMsg++;
                    self.contacts.unshift(self.contacts.splice(i,1)[0]);
                }
            })
            if(!is_in){
                this.contacts.unshift({
                    friendId:user_id,
                    friendName:user_nick,
                    unReadMsg:1
                })
            }
            SoucheIMRender.renderContacts()
        },
        /**
         * 添加一条对方发来的消息
         * @param from_user_id
         * @param content
         */
        addMessage:function(msg){
            var from_user_id = msg.from;
            var content = msg.content
            this.addContact(from_user_id,msg.from_nick)
            if(!this.messages[from_user_id]){
                this.messages[from_user_id] = [];
            }
            var self = this;
            var message = {
                user_id:from_user_id,
                user_name:msg.from_nick,
                content:content,
                is_me:false,
                ext:msg.ext,
                timestramp:new Date().getTime()+Math.random()
            }
            var nowTime = new Date().getTime()
            if(nowTime - lastMessageTime >1000*30){
                message.time = moment().format("hh:mm")
                lastMessageTime = nowTime;
            }
            self.messages[from_user_id].push(message)

        },
        /**
         * 添加一条我自己发的消息
         * @param content
         */
        addLocalMessage:function(msg){
            if(!this.messages[this.now_chat_userid]){
                this.messages[this.now_chat_userid] = [];
            }
            var message = {
                user_id:this.my_userid,
                user_name:"我",
                content:msg.content,
                is_me:true,
                timestramp:new Date().getTime()+Math.random(),
                ext:msg.ext
            }
            var nowTime = new Date().getTime()
            if(nowTime - lastMessageTime >1000*30){
                message.time = moment().format("hh:mm")
                lastMessageTime = nowTime;
            }

            this.messages[this.now_chat_userid].push(message)
        },
        /**
         * 备份聊天记录到本地
         */
        dumpMessages:function(){
            for(var i in this.messages){
                if(this.messages[i]&&this.messages[i].length){
                    if(this.messages[i]){

                    }
                }
            }
            souchedb.set("souche_talk_messages",this.messages)
        },
        /**
         * 从本地恢复聊天记录
         */
        restoreMessages:function(){
            var ms = souchedb.get("souche_talk_messages");
            if(ms){
                this.messages = ms;
            }
        }
    }

}();

var SoucheIMRender = function() {
    /**
     * 检查m是否存在于ms中，用message中得timestramp检查
     * @param m
     * @param ms
     */
    var checkInArray = function(m,ms){
        var is_in = false;
        ms.forEach(function(_m){
            if(_m.timestramp== m.timestramp){
                is_in = true;
            }
        })
        return is_in;
    }
    var lastRenderMessage = {};
    return {
        /**
         * 渲染最近联系人列表
         */
        renderContacts:function () {
            $(".contact-list .contacts").html(function () {
                var html = "";
                SoucheIMData.contacts.forEach(function (c) {
                    html += "<li class='contact-item "+(SoucheIMData.now_chat_userid==c.friendId?"active":"")+"' data-id='" + c.friendId + "'><span class='cont-name'>" + c.friendName + "</span>"+(c.unReadMsg?("<i class='info-num'>" + c.unReadMsg + "</i>"):"")+"</li>"
                })
                return html;
            }())
        },
        clearChatView:function(){
            $(".talk-histary").html("");
            lastRenderMessage = {};
        },
        /**
         * 渲染聊天窗口，根据now_user_id，不是全量渲染，使用message中得timestramp实现增量渲染。
         */
        renderChat:function () {
            var nowFromId = SoucheIMData.now_chat_userid;
            var messages = SoucheIMData.messages[nowFromId];
            if (!lastRenderMessage[nowFromId]) {
                lastRenderMessage[nowFromId] = [];
            }
            if (messages&&messages.length) {
                var this_time_render = 0;
                messages.forEach(function (message) {
                    if(!checkInArray(message,lastRenderMessage[nowFromId])){
                        this_time_render++;
                        var html = '<li class="' + (message.is_me ? "my" : "shop") + '-cont clearfix">' +
                            (message.time?('<div class="time">' + message.time + '</div>'):'') +
                            '<div class="figure">' + message.user_name + '</div>' +
                            '<div class="talk-content"><i class="cont-arrow"></i>';
                            html +='    <p>' + message.content + '</p>'


                        html +='</div>' +'</li>';
                        var liItem = $(html)
                        liItem.css({opacity:0})
                        $(".talk-histary").append(liItem)
                        setTimeout(function(){
                            liItem.animate({
                                opacity:1
                            },300,"swing")
                        },100)
                        lastRenderMessage[nowFromId].push(message);
                    }
                })
                if(this_time_render!=0){
                    $('.talk-wrap').animate({scrollTop:$('.talk-histary').height()},700);
                }

            } else {
                $(".talk-histary").html("")
            }
        }
    }
}();
var SoucheIM = function(){
    var config = {
        user_id:""
    }
    return {
        init:function(_config){
            $.extend(config,_config);
            SoucheIMData.my_userid = config.user_id;
            SoucheIMData.contacts = [];
            SoucheIMRender.renderContacts();
            SoucheIMRender.renderChat();
            setInterval(function(){
                SoucheIMRender.renderChat();
            },500)
            setInterval(function(){
                SoucheIMData.dumpMessages();
            },2000)
            SoucheIMData.restoreMessages();
            SocketController.init({
                id:config.user_id,
                nick:config.user_nick
            })
            this._bind();
        },
        _bind:function(){
            $("#talk_form").on("submit",function(e){
                e.preventDefault();
                var content = $("#talking-text").val();

                $("#talking-text").val("")

                var msg = {
                    to : SoucheIMData.now_chat_userid,
                    content :content
                }

                SocketController.sendMessage(msg);
                SoucheIMData.addLocalMessage(msg)
                SoucheIMUtil.sendMessage(SoucheIMData.now_chat_userid.replace(/[^0-9]/g,""),content);
            })
            $(".contacts").on("click",".contact-item",function(e){
                SoucheIMData.switch_active($(this).attr("data-id"))
                SoucheIMRender.renderContacts();
//                    $(".contact-item").removeClass("active")
//                    $(this).addClass("active")
            })
        }
    }
}();


SoucheIM.init({
    user_id:"123",
    user_nick:"芋头admin"
})