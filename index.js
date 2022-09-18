var express = require("express");
var app = express();
var http = require("http").Server(app);
var bodyParser = require("body-parser");
var io = require("socket.io")(http);
var message = require("./utils/message");
const multer = require('multer');
const path = require('path');


app.set("view engine", "ejs");
app.use( "/public", express.static('public'));
app.use(express.urlencoded({extended: true}));
app.use( bodyParser.json() );

/* group 이미지 업로드 */
const fileUpload = multer({
    storage: multer.diskStorage({
        destination(req, file, cb) {
            cb(null, 'public/file');
        },
        filename(req, file, cb) {
            const ext = path.extname(file.originalname);
            cb(null, Date.now() + ext );
        },
    }),
    limits: { fileSize: 5*1024*1024 },
});

/* route */
app.get("/", function(req, res){
    console.log("client");
    res.render("main");
});


var list = {};
app.post("/chat", function(req, res){
    console.log("req.body:", req.body);
    res.render("chat", req.body);
    
    /* socket.io */
    io.on("connection", function(socket){ 
        console.log("connected: ", socket.id);

        /* 입장 */
        list[socket.id] = {name:req.body.name, color:req.body.color};
        console.log("list: ", list);
    });
});



io.on("connection", function(socket){ 

    socket.on('info', function(data) {
        console.log("info-data:", data);
        io.emit('notice', data.nickname + "님이 입장하셨습니다.");
        io.emit('list', list);
    });

    /* message */
    socket.on("send", function(data) { //msg 받기
        console.log("client message: ", data.msg);
        data["is_dm"] = false;
        data["nickname"] = list[socket.id].name;
        console.log("data:", data);
        if ( data.to == "Team chat" || data.to == '') {
            io.emit("newMessage", data); //모든 클라이언트에게 data 보내기
            // io.emit("newMessage", message(data.to, data.msg)); //모든 클라이언트에게 data 보내기
        } else {
            data["is_dm"] = true;
            let socketID = Object.keys(list).find( (key) => {return list[key] === data.to}); //닉네임이 같을 때의 key(socket.id)
            io.to(socketID).emit("newMessage", data); // DM
            socket.emit("newMessage", data); // 나의 메세지
        }
    });

    /* 퇴장 */
    socket.on("disconnect", function(){
        console.log("list[socket.id].name:", list[socket.id].name);
        io.emit("notice", list[socket.id].name + "님이 퇴장하셨습니다."); //퇴장 notice
        delete list[socket.id]; // key,value 둘다 삭제
        io.emit('list', list);
    });
});


http.listen( 8000, function() {
    console.log("Server port :", 8000);
});