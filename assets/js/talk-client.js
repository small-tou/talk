

var SocketController = function(){
    var socket;
    return {
        init: function (config) {
            socket = io.connect('/?id=' + config.id + '&nick=' + config.nick+'&to='+config.to, {port: 6767});
            socket.on('connected', function (data) {
                $(".status").html("已经建立连接，开始聊天吧")
            });
            socket.on("new-message", function (data) {
                console.log(data)
                setTimeout(function () {
                    SoucheIMData.addMessage(data);
                })
            })
            socket.socket.on("error", function (data) {
                $(".status").html("连接失败")
            })
            socket.socket.on("connect", function (data) {
                $(".status").html("正在与客服建立连接")
            })
            socket.on("connect_to_seller",function(data){
                SoucheIMData.seller_nick = data.nick;
                $(".status").html("与客服：【"+data.nick+"】聊天中")
            })
        },
        sendMessage: function (msg) {
            socket && socket.emit('new-message', msg);
        }
    }
}();


var SoucheIMData = function(){
    var lastMessageTime = 0;
    return {
        seller_id:"",
        seller_nick:'',
        messages:[],
        /**
         * 添加一条对方发来的消息
         * @param from_user_id
         * @param content
         */
        addMessage:function(msg){
            var from_user_id = msg.from;
            var content = msg.content
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
            self.messages.push(message)
        },
        /**
         * 添加一条我自己发的消息
         * @param content
         */
        addLocalMessage:function(msg){
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

            this.messages.push(message)
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

        clearChatView:function(){
            $(".talk-histary").html("");
            lastRenderMessage = {};
        },
        /**
         * 渲染聊天窗口，根据now_user_id，不是全量渲染，使用message中得timestramp实现增量渲染。
         */
        renderChat:function () {
            var nowFromId = SoucheIMData.now_chat_userid;
            var messages = SoucheIMData.messages;
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
            SoucheIMRender.renderChat();
            setInterval(function(){
                SoucheIMRender.renderChat();
            },500)
            SocketController.init({
                id:config.user_id,
                nick:config.user_nick,
                to:config.to
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
            })

        }
    }
}();

var num = Math.round(Math.random()*1000);
SoucheIM.init({
    user_id:num,
    user_nick:"客户端"+num,
    to:"123"
})