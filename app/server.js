var express = require('express'),
  	app = express(),
  	http = require('http').Server(app),
    fs = require('fs'),
  	io = require('socket.io')(http),
    global_data;

const { exec } = require('child_process'); // pentru executare wrapper

fs.readFile('./main.json', "UTF8", function(err, data) {
      if (err) { throw err }; // se opreste la eroare fisier
      global_data = JSON.parse(data);
}); 

app.use('/static', express.static('app/assets')); // resurse statice

app.get('/init/:uid*', function(req, res){ // raspuns pentru user
    gotid = req.params['uid'];
    for (var i = global_data.users.length - 1; i >= 0; i--) {
      if(global_data.users[i].id==gotid) gotid=global_data.users[i].points;
    }
    res.send(JSON.stringify({"list":global_data.list, "points": gotid, "length":global_data.list.length}).normalize('NFD').replace(/[\u0300-\u036f]/g, ""));
    
});

app.get('/', function(req, res){ // interfata
    res.sendFile(__dirname + '/app/view/dash.html');
});

function findUser(index) { // cauta dupa ID
  for (var i = global_data.users.length - 1; i >= 0; i--) {
      if(global_data.users[i].id==index) return i;
    }
}

function isInArray(value, array) { // se afla sau nu in array
  return array.indexOf(value) > -1;
}

function Deg2Rad(deg) {
  return deg * Math.PI / 180;
}

function PythagorasEquirectangular(lat1, lon1, lat2, lon2) { // distanta
  lat1 = Deg2Rad(lat1);
  lat2 = Deg2Rad(lat2);
  lon1 = Deg2Rad(lon1);
  lon2 = Deg2Rad(lon2);
  var R = 6371; // km
  var x = (lon2 - lon1) * Math.cos((lat1 + lat2) / 2);
  var y = (lat2 - lat1);
  var d = Math.sqrt(x * x + y * y) * R;
  return d;
}

function NearestLoc(latitude, longitude,res,uid) { // returneaza cea mai apropiata locatie fata de un punct si verifica daca este nou pentru utilizatorul curent
  var cities = [];
  for (var i = global_data.list.length - 1; i >= 0; i--) {
    cities.push([global_data.list[i].id,global_data.list[i].lat,global_data.list[i].long]);
  }
  var mindif = 99999;
  var closest;

  for (index = 0; index < cities.length; ++index) {
    var dif = PythagorasEquirectangular(latitude, longitude, cities[index][1], cities[index][2]);
    if (dif < mindif) {
      closest = index;
      mindif = dif;
    }
  }

  if(isInArray(cities[closest][0],global_data.users[findUser(uid)].visited)) {  } else { console.log('New visitor in town!'); global_data.users[findUser(uid)].visited.push(cities[closest][0]); global_data.users[findUser(uid)].points+=10; io.emit('start', global_data); io.emit('device'); }
  
  res.send(cities[closest][0].toString()+','+global_data.users[findUser(uid)].points);
}

app.get('/closest/:lat/:long/:uid*', function(req, res){ // raspunde pentru afisarea celei mai apropiate locatii de interes
    lat = req.params['lat'];long = req.params['long'];uid = req.params['uid'];
    NearestLoc(lat,long,res,uid);
});

io.on('connection', function(socket){ // conexiune socket

  socket.on('load', function(msg){
      io.emit('start', global_data); // trimite spre client datele initiale
  });

  socket.on('save', function(msg){ //salvare in fisier JSON pentru portabilitate, se poate migra usor pe MongoDB
      global_data=JSON.parse(msg);
    fs.truncate('./main.json', 0, function() {
    fs.writeFile('./main.json', msg, function (err) {
        if (err) {
            return console.log("Error writing file: " + err); // break on file error
        }
    });
   });
  });

});

http.listen(8080, function(){
  console.log('HTTP API server active *:8080 ' + Date()); // log pornire
  exec('electron main.js', (err, stdout, stderr) => { // executa lansare GUI
    
  });
});