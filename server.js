/**************************************/
/* Set up the static file server */

/* Include the static file webserver library */
var static = require('node-static');

/* Include the http server library */
var http = require('http');

/* Assume that we are running on Heroku */
var port = process.env.PORT;
var directory = __dirname + '/public';

/* If we aren't on Heroku, then we need to reudjust the port and directory */
if (typeof port == 'undefined' || !port) {
    directory = './public';
    port = 8080;
}

/* Set up a static web-server that will deliver files from the filesystem */
var file = new static.Server(directory);

/* Construct an http server that gets files from the file server */
var app = http.createServer(
    function (request, response) {
        request.addListener('end',
            function () {
                file.serve(request, response);
            }
        ).resume();
    }
).listen(port);

console.log('The server is running.')

/**************************************/
/* Set up the web socket server */

var io = require('socket.io')(app)

io.sockets.on('connection', function (socket) {
    function log() {
        var array = ['*** Server Log Message: '];
        for(var i = 0; i < arguments.length; i++) {
            array.push(arguments[i]);
            console.log(arguments[i]);
        }
        socket.emit('log', array);
        socket.broadcast.emit('log', array);
    }

    log('A website connected to the server');

    socket.on('disconnect', function(socket) {
        log('A website disconnected from the server');
    });

    /* join_room command */
    /* payload:
    {
        'room': room to join
        'username': username of person joining
    }
    join_room_response:
    {
        'result': 'success'
        'room': room joined,
        'username': username that joined,
        'membership': number of people in the room, including the one that joined
    }
    or
    {
        'result': 'fail'
        'message': failure message,
    }
    */

    socket.on('join_room', function(payload) {
        log('server received a command', 'join_room', payload);
        if(typeof payload == 'undefined' || !payload) {
            var error_message = 'join_room had no payload, command aborted';
            log(error_message);
            socket.emit('join_room_response', {
                result: 'fail',
                message: error_message
            });
            return;
        }
        var room = payload.room;
        if((typeof room == 'undefined') || !room) {
            var error_message = 'join_room didn\'t specify a room, command aborted';
            log(error_message);
            socket.emit('join_room_response', {
                result: 'fail',
                message: error_message
            });
            return;
        }
        var username = payload.username;
        if((typeof username == 'undefined') || !username) {
            var error_message = 'join_room didn\'t specify a username, command aborted';
            log(error_message);
            socket.emit('join_room_response', {
                result: 'fail',
                message: error_message
            });
            return;
        }
        socket.join(room);
        var roomObject = io.socket.adapter.room[room];
        if((typeof roomObject == 'undefined') || !roomObject) {
            var error_message = 'join_room couldn\'t crete a room (internal error), command aborted';
            log(error_message);
            socket.emit('join_room_response', {
                result: 'fail',
                message: error_message
            });
            return;
        }
        var numClients = roomObject.length;
        var success_data = {
            result: 'success',
            room: room,
            username: username,
            membership: (numClients + 1)
        }
        io.sockets.in(room).emit('join_room_response', success_data);
        log('Room ' + room + 'was just joined by ' + username + '.');
    });
});