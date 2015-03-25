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
var Observer = require('./lib/observer.js');
var Helper = require('./lib/shell_argv_helper.js');
var joinPath = Observer.joinPath;
var args = process.argv;
var currentDirname = process.cwd();
var packageInfo = require("./package.json");

var dirname = null;
var enableLog = false;
var charset = 'utf-8';
var execTpl = '';
var execTplFile = '';
var busyIgnore = false;

// 是否正在执行中
var working = false;    

var shellTpl = "echo {type}:{fullname}";

// split command parameters

Helper.init();

var params = Helper.getMap();

var key,value;
for(key in params.options){
    
    key = key.toLowerCase();
    value = params.options[key];
    
    switch(key){
        case 't':
        case 'target':
            dirname = value || false;
            break;
        case 'ignore':
        case 'config':
        case 'busy-ignore':
            busyIgnore = true;
            break;
        case 'enable-log':
            // 启用log
            enableLog = true;
            break;
        case 'charset':
            charset = value || "utf-8";
            break;
        case 'r':
        case 'exec':
            // 直接替换执行的字符串
            execTpl = value;
            break;
        case 'exec-tpl-file':
            execTplFile = value; 
            break;
        case 'version':
            version();
            return process.exit();
        case 'help':
        default:
            help();
            return process.exit();
    }
}

if (!dirname) {
    if (params.contents) {
        dirname = params.contents;
    } else {
        help();
        console.log('missing "dirname".\n');
        process.exit();
    }
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
    console.log('required one of [-r ,--exec , --exec-tpl-file]!');
}


/**
 * show help information
 */
function help () {

    var info = '\nUsage : fsfb [dirname|--target="dirname"] [ --exec="commend Tpl" | --exec-tpl-file="file path" [ --charset=utf-8 ]] [ --enable-log ] [ --version | version ] [ --help | help ]';
    info += '\n\nParams :';
    info += '\n\tdirname - 将进行监视的目录名';
    info += '\n\t--enable-log - 显示一些调式信息.大部份情况下没用.';
    info += '\n\t--target - 将进行监视的目录名';
    info += '\n\t--busy-ignore - 当一次执行未完成时,忽略后续的执行请求.';
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
    
    var versionInfo = "%s [%s] version : %s \n -- %s\n" + 
    "------------------------------------------\n" + 
    "Author : %s,\nWebSite : %s\n";
    
    var author = packageInfo.author;
    
    if(typeof(author) == 'object'){
        author = author.name;
    }
    
    console.log(versionInfo, packageInfo.name,  packageInfo.license, packageInfo.version, 
            packageInfo.description, author, packageInfo.homepage);
}

/**
 * start watching
 */
function start(tplContent){
    
    console.log('\n  Welecom to use the fs_feedback. \n  ------------------------------- \n');
    
    var target = new Observer(dirname);
    target.disableLog(enableLog);
    
    var feedback = function (type, fname, dirname) {
        
        if(busyIgnore === true && working !== false){
            enableLog && console.log("ignore execute at : %s, the last execution at: $s;",Date.now(),  working);
            return false;
        }
        
        working = Date.now();
        
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
            try{
                if (err) {
                    console.error(err.stack);
                }
                
                out && process.stdout.write(out);
                errout && process.stderr.write(errout);
            }finally{
                // 只有当--busy-ignore打开时,才有可能统计执行时间, 否则working有可能被反复覆盖.
                enableLog && busyIgnore && console.log("cost time : %s ms. ", Date.now() - working);
                working = false;
            }
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
