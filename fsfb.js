#!/usr/bin/env node

console.log('\n  Welecom to use the fs_feedback. \n  ------------------------------- \n');

var path =require('path');
var childPorcess = require('child_process');
var exec = childPorcess.exec;
//
var Observer = require('./common/observer.js');
var joinPath = Observer.joinPath;
var args = process.argv;
var currentDirname = process.cwd();

var help = function(){
    console.log('\n  try is usage: fs_feedback dirname "echo {type} : {fullname}/{fname}"');
    console.log('\n  change the content of the director "dirname" to see it!!\n');
    console.log('\n  that {args} support : \n');
    console.log('\ttype - change type of the file system, \n\t\tpossible value: "modify", "newfile", "rmfile", "mkdir", "rmdir" \n' + 
            '\tfname - filename,\n'+
            '\tdirname - relative path,\n'+
            '\tfulldir - full path(AP),\n'+
            '\tfullname - full path and file name.\n');
};

if (args.length == 3 && args[2] == 'help') {
    help();
    process.exit();
}

if (args.length < 4) {
    help();
    console.error("need the feedback command template !!");
    process.exit();
}

//
var target = args[2];
var _callbackStr = args[3];
var enableLog = args[4] === '--enable-log';

var target = new Observer(target);
target.disableLog(enableLog);

var feedback = function (type, fname, dirname) {
    var callback = _callbackStr.replace(/\{(.*?)\}/g, function (match, p1, index) {
        
        //type, fname, dirname, fulldir, fullname 
        switch (p1) {
            case "type":
                return type;
            case "fname":
                return fname;
            case "dirname":
                return dirname;
            case "fulldir":
                return path.resolve(dirname);
            case "fullname":
                return joinPath(path.resolve(dirname), fname);
        }
    });
    
    enableLog && console.log("will to exec : %s ",callback);
    exec(callback, function (err, out, errout) {
        if (err) {
            console.errir(err.stack);
        }

        out && process.stdout.write(out);
        errout && process.stderr.write(errout);
    });
};

target.on("modify", function (fname, fullname) {
    enableLog && console.log('watch : modify %s on %s', fname, fullname);
    feedback('modify', fname, fullname);
});

target.on("mkdir", function (fname, fullname) {
    enableLog && console.log('watch : mkdir %s on %s', fname, fullname);
    feedback('mkdir', fname, fullname);
});

target.on("rmdir", function (fname, fullname) {
    enableLog && console.log('watch : rmdir %s on %s', fname, fullname);
    feedback('rmdir', fname, fullname);
});

target.on("newfile", function (fname, fullname) {
    enableLog && console.log('watch : newfile %s on %s', fname, fullname);
    feedback('newfile', fname, fullname);
});

target.on("rmfile", function (fname, fullname) {
    enableLog && console.log('watch : rmfile %s on %s', fname, fullname);
    feedback('rmfile', fname, fullname);
});

target.on("error", function (err) {
    console.error('error :  %s', err.stack);
//    process.exit()
});
