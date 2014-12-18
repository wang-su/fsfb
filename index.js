/**
 * 命令行实现
 * 
 * @file index.js
 * @author wangsu01@baidu.com
 */

var path =require('path');
var fs =require('fs');
var childPorcess = require('child_process');
var exec = childPorcess.exec;
//
var Observer = require('./common/observer.js');
var joinPath = Observer.joinPath;
var args = process.argv;
var currentDirname = process.cwd();
var packageInfo = require("./package.json");


// ignore node or npm and the script name;
args = args.slice(2);

//
var dirname = null;

if(args.length >= 2){
    //取目标目录, 否则为单参数
    dirname = args.shift();     
}

var enableLog = false;
var charset = 'utf-8';
var execTpl = '';
var execTplFile = '';

var shellTpl = "echo {type}:{fullname}";

// split command parameters
var paramItem = null;
var key,value;

while(paramItem = args.pop()){
    paramItem = paramItem.split('=');
    
    key = paramItem[0] || "";
    value = paramItem[1];
    
    key = key.toLowerCase();
    
    switch(key){
        case '--enable-log':
            // 启用log
            enableLog = true;
            break;
        case '--charset':
            charset = value || "utf-8";
        case '--exec':
            // 直接替换执行的字符串
            execTpl = value;
            break;
        case '--exec-tpl-file':
            execTplFile = value; 
            break;
        case 'version':
        case '--version':
            version();
            return process.exit();
        case '--help':
        case 'help':
        default:
            help();
            return process.exit();
    }
}

if(!dirname){
    help();
    console.log('missing "dirname".\n');
    process.exit();
}

if(execTplFile){
    var opt = {
        encoding:charset,
    };

    fs.readFile(execTplFile, opt, function (err, content) {
        
        if(err){
            console.error(err);
            return;
        }

        enableLog && console.log("read tplContent as : %s ",callback);
        
        start(content);
    });
    
}else if(execTpl){
    
    start(execTpl);
    
}else{
    help();
    console.log('required one of --exec or --exec-tpl-file !');
}


/**
 * show help information
 */
function help () {

    var info = '\nUsage : fsfb dirname [ --exec="commend Tpl" | --exec-tpl-file="file path" [ --charset=utf-8 ]] [ --enable-log ] [ --version | version ] [ --help | help ]';
    info += '\n\nParams :';
    info += '\n\tdirname - 将进行监视的目录名';
    info += '\n\t--enable-log - 显示一些调式信息.大部份情况下没用.';
    info += '\n\t--exec - 指定命令行模版, 当文件系统产生变化时, 将替换变量值后产生的一个完整的命令行指令并直接执行.';
    info += '\n\t--exec-tpl-file - 从文件读取命令行模版, *考虑性能问题, 在启动监视后,不再读取tpl-file文件变化.';
    info += '\n\t--charset - 指定tpl-file的文件编码,默认为utf-8';
    info += '\n\t--version - 显示版本信息';
    
    info += '\n\nsupport args : {xxx}';
    info += '\n\t{type} - change type of the file system,';
    info += '\n\t\tpossible value: "modify", "newfile", "rmfile", "mkdir", "rmdir"';
    info += '\n\t{fname} - filename,';
    info += '\n\t{dirname} - relative path,';
    info += '\n\t{fulldir} - full path(AP),';
    info += '\n\t{fullname} - full path and file name.\n';
    info += '\nmore info \n\t ' + packageInfo.homepage;
    info += '\n';

    console.log(info);
};

/**
 * show version info
 */
function version () {
    
    var versionInfo = "%s version : %s [%s]\n -- %s\n" + 
    "------------------------------------------\n" + 
    "Author : %s,\nWebSite : %s\n";
    
    console.log(versionInfo, packageInfo.name, packageInfo.version, 
            packageInfo.license, packageInfo.description, packageInfo.author, 
            packageInfo.homepage);
}

/**
 * start watching
 */
function start(tplContent){
    
    console.log('\n  Welecom to use the fs_feedback. \n  ------------------------------- \n');
    
    var target = new Observer(dirname);
    target.disableLog(enableLog);
    
    var feedback = function (type, fname, dirname) {
        
        var callback = tplContent.replace(/\{(.*?)\}/g, function (match, p1, index) {
            
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
                console.error(err.stack);
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
}