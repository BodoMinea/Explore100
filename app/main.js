const electron = require('electron'),
      app = electron.app,
      BrowserWindow = electron.BrowserWindow,
      path = require('path'),
      url = require('url');

let mainWindow

function createWindow () {
  mainWindow = new BrowserWindow({width: 1185, height: 745, title: "Explore¹⁰⁰", icon: __dirname + '/app/res/roflg.png'});

  mainWindow.loadURL(url.format({
    pathname: "localhost:8080",
    protocol: 'http:',
    slashes: true
  }))

  mainWindow.on('closed', function () {
    mainWindow = null
  })
}

app.on('ready', createWindow)

app.on('browser-window-created',function(e,window) {
    window.setMenu(null);
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
})

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
})