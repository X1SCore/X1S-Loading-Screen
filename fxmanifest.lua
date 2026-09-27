fx_version 'cerulean'
game 'gta5'
lua54 'yes'

author 'X1Studios'
description 'X1SCore Loading Screen'
version '1.0.0'

loadscreen 'html/index.html'
loadscreen_cursor 'yes'
loadscreen_manual_shutdown 'yes'

files {
    'html/index.html',
    'html/style.css',
    'html/script.js',
    'html/config.json',
    'html/img/*.png',
    'html/img/backgrounds/*.png',
    'html/img/songs/*.png',
    'html/img/staff/*.png',
    'html/audio/*.mp3'
}

client_script 'client.lua'
