const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron')
const apiCaller = require('axios').create({
  baseURL: 'https://openapi.naver.com/v1/'
})
const async = require('async')
const fs = require('fs')
const qs = require('querystring')
const path = require('path')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({
    width: 800,
    height: 600,
    center: true,
    title: 'me2.do API Caller'
  })

  //앱 메뉴 삭제
  Menu.setApplicationMenu(null)

  win.webContents.on('new-window', function(event, url){
    //웹브라우저에서 새창을 뛰우는 링크(<a target="_brank"> 태그)를 누르면 호출되는 콜백.

    //네이티브 새 창으로 뜨는것 막기
    event.preventDefault()

    //url을 기본 브라우저로 켜줍니다. 
    shell.openExternal(url)
 });

  ipcMain.on('shorten', (event, arg) => {
    const url = new URL(arg.url)
    if(!(url.protocol === 'http:' || url.protocol === 'https:')) {
      console.log('http랑 https만 가능 ', url.protocol)
      return
    }

    //me2.do api 요청
    apiCaller.post('util/shorturl', qs.stringify({url: url.toString()}), {
      headers: {
        'X-Naver-Client-Id': arg.clientId,
        'X-Naver-Client-Secret': arg.clientSecret
      }
    })
    .then((res) => {
      event.sender.send('shorten-done', {result: res.data.result})
    })
    .catch((err) => {
      console.log(err)
      event.sender.send('shorten-done', {err})
    })
  })

  ipcMain.on('saveList', (event, arg) => {
    if(!arg || arg.urls.length <= 0) {
      return
    }

    const stream = fs.createWriteStream(`${arg.filename}.txt`)
    stream.once('open', (fd) => {
      stream.write(`총 ${arg.urls.length}개\n\n`)
      async.forEach(arg.urls, (obj, cb) => {
        stream.write(`${obj.orgUrl} => ${obj.url}\n`)
        cb()
      }, (err)=> {
        event.sender.send('saveList-done', {err, filename: stream.path})
        stream.end()
      })
    })
  })

  // and load the index.html of the app.
  win.loadFile('index.html')

  // Open the DevTools.
  //win.webContents.openDevTools()

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.