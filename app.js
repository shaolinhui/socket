/**
 * Created by html5 on 2018/4/16.
 */
var express=require("express");
var app=express();
var http=require("http").Server(app);
var path=require("path");
var io=require("socket.io")(http);

//设置静态资源目录
app.use(express.static(path.join(__dirname,"public")));

app.get('/', function(req, res){
res.sendFile(__dirname + '/public/index.html');
});
//在线用户
var onlineUser={};

//查找id用户
function findUser(name){
    return onlineUser[name];
}
//移除下线用户
function setOfflineUser(name){
    delete onlineUser[name];
}


//客户端连接
io.on("connection",(socket)=>{
    console.log('客户端连接', socket.id);
    //广播用户在线列表
    function broadcastOnlineUsers(){
        var names=Object.keys(onlineUser);
        socket.broadcast.emit("online users",names);
        socket.emit("online users",names);
    }

    socket.on("disconnect",()=>{
        console.log('客户端断开链接', socket.id);
        if(socket.name){
            setOfflineUser(socket.name);
        }
        socket.broadcast.emit("system message",`用户${socket.name} 离开了`);
        broadcastOnlineUsers()
    });
    //收到客户端消息
    socket.on('chat message',function(msg){
        console.log(444+msg);
        //进行判断,如果发送的消息含有@(用正则的捕获)
        var info=msg.match(/^@(.*) (.*)$/);
       //如果有@ 则走发送私信  没有去else
        if(info){
            //发送私信  但是首先判断有没有这个id
            var id=findUser(info[1]);
            if(id){
                io.to(id).emit("chat message",{
                    name:socket.name,
                    message:info[2],
                    private:true
                })
            }
            else{
                socket.emit("system message",`用户${info[1]}好像不在线哦`);
            }
        }
        else{
            //向客户端广播消息
            //给别人看的  //用户名和信息都传出去
            socket.broadcast.emit('chat message',{
                name:socket.name,   //在聊天窗口显示谁发的信息
                message:msg
            });
            //自己可以收到的
            // socket.emit('chat message',msg);
            // //所有人都可以收到(一般发公告)
            // io.message("chat message",msg);
        }
    });

    socket.emit("prompt nockname","请输入你的昵称");


    //设置昵称
    socket.on('set nockname', function(name){
        if(findUser(name)){
            //用户名有冲突
            socket.emit("system message","用户昵称已有人使用,请重新设置");
            socket.emit("prompt nockname","请输入你的昵称");
        }
        else{
            //用户名没有冲突
            socket.name=name;
            //保存用户的id
            onlineUser[name]=socket.id;
            //欢迎某某进入聊天室广播
            socket.broadcast.emit("system message",`欢迎${name}加入聊天室`);
            //当前用户设置昵称成功后返回一个系统事件
            socket.emit("system message",`${name}你好`);
            broadcastOnlineUsers();
        }
    });
});

http.listen(3000, function(){
    console.log('listening on *:3000');
});