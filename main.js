
var config = require("./config.js")
var express = require("express")
var app = express()
var uuid = require ("node-uuid")
var moment = require ("moment")
moment.lang('zh-cn');

server = require('http').createServer(app)
io = require('socket.io').listen(server);
app.use("/assets", express.static(__dirname+"/assets"))
server.listen(config.socket_port);
//维护所有的客户端连接和用户数据
var clients = {

}
var onlines = {


}
//每个客户端连接时进行根据cookie进行认证，成功后分配一个随机的id给客户端，之后客户端带着id来请求，错误的id不予回应和操作数据。
io.sockets.on('connection', function (socket) {
    socket.on('new-message', function (data) {
        var user = socket.handshake.user
        if(user.to&&onlines[user.to]){
            var seller_id = onlines[user.to].client_id
            io.sockets.sockets[seller_id].emit('new-message',{content:data.content,from:user.id,from_nick:user.nick});
        }else if(data.to&&onlines[data.to]){
            var seller_id = onlines[data.to].client_id
            io.sockets.sockets[seller_id].emit('new-message',{content:data.content,from:user.id,from_nick:user.nick});
        }

    });
    socket.on("disconnect",function(){
        var user = socket.handshake.user
//        var talk = {
//            user_id:0,
//            user_nick:"系统消息",
//            user_headpic:"",
//            md:user.nick+" 离开了聊天",
//            html:"<a href=/user/"+user.id+">"+user.nick+"</a> 离开了聊天",
//            time:moment().format("MM-DD hh:mm"),
//            client_id:socket.id
//        }
        delete onlines[user.id]
        socket.broadcast.emit('offline',user);
    })
    var user = socket.handshake.user
    if(onlines[user.id]){
        io.sockets.sockets[seller_id].emit('login_anywhere',{})
    }
    onlines[user.id] = {
        user_id:user.id,
        user_nick:user.nick,
        client_id:socket.id
    }
    if(user.to&&onlines[user.to]){
        socket.emit("connect_to_seller",{
            id:onlines[user.to].user_id,
            nick:onlines[user.to].user_nick
        })
    }
});
io.configure(function (){
    io.set('authorization', function (handshakeData, callback) {
        handshakeData.user = handshakeData.query
        callback(null,true)
    });
});