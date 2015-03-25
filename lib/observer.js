/**
 * @file
 *      用于发一个目录及子目录下的内容变更. 并将变化内容以事件的方式进行通知
 * @author wangsu01@baidu.com
 */

// match到的内容将被忽略
var COMMON_IGNORE  =  /^([\.\_])(svn|git|bak|tmp)$/i;
// 文件状态缓存名称
var CACHE_SYNC_STAT_FILES = "_syncFs_stats.json";

// ======== CONFIGURE START ========== //

var basePath = "./target/";     // target dirname;

/**
 * 忽略列表, 如果内容为字符串,则进行全字匹配, 如果为正则,则进行test操作.
 */
var ignores  = [COMMON_IGNORE,CACHE_SYNC_STAT_FILES];

// ======== CONFIGURE END ========== //

var fs = require("fs");
var path = require('path');
var EventEmitter = require('events').EventEmitter;
var sep = path.sep;

var joinPath = function(){
    var rs = arguments[0];
    // this RegExp more like  /\/+/mg; //
    var reg = new RegExp( '\\' + sep + '+' ,'g');
    
    if(arguments.length > 1){
        rs = Array.prototype.join.call(arguments,sep);
    }
    
    rs = rs.replace(reg,sep);
    
    return rs;
};

var checkIgnore = function(fname){
    return ignores.some(function(item){
            return ('string' === typeof item && item == fname) || (item.test && item.test(fname));
    });
};

/*
 * 代码内约定四个名称;
 *  fname 表示独立文件名称
 *  dirname 表示独立文件夹名称
 *  fullpath 表示完整目录及目录名称
 *  fullname 表示完整文件及目录名称
 *  
 *  在文件对像内部, 始使使用短的独立(文件|目录)名称即可, 
 *  对外层传递时, 传出完整路径名称
 */

/**
 * 监视器对像.
 * @class
 * @extends EventEmitter
 * @param fullpath 目标目录路径.
 */
function Observer(fullpath,parent){
    
    var me = this;
    
    EventEmitter.call(me);
    
    me.fullpath = fullpath;   //自己所监视的目录;
    me.parent = parent || null;     //自己所属的上级监视对像
    
    me.subdirs = {};
    me.files = {};
    me.watcher = null;
    
    me.checking = 0;        //异步check中的对像
    
    me.on("error",function(err){
        // 添加当前错误发生的pathName
        err.path = me.fullpath;
    });
    
    me.on("_add",function(fname){
        // 将识别 newfile 和 mkdir
        var fullpath = joinPath(me.fullpath,fname);
        fs.stat(fullpath,function(err,stat){
            
            if(err){
                me.emit('error',err);
                return;
            }
            
            // 普通文件, 加入文件树
            if(stat.isFile()){
                me._addTofilelist(fname,stat);
                me.emit("newfile",fname, me.fullpath);
                return;
            }
            
            // 如果是目录,则直接添加子目录
            if(stat.isDirectory()){
                me._addSubDir(fname, fullpath);
                me.emit("mkdir",fname, me.fullpath);
                return;
            }
        });
    });
    
    me.on("_remove",function(fname){
        // 将识别 rmdir 和 rmfile
        
        var target = null;
        if(target = me.files[fname]){
            me.emit('rmfile',fname, me.fullpath);
            return;
        }
        
        if(target = me.subdirs[fname]){
            me.emit('rmdir',fname, me.fullpath);
            target.destroy();
            return;
        }
        
    });
    
    // 开始检查自己
    me._checkContents();
}

/**
 * @lends Observer
 */
Observer.prototype = {
    __proto__ : EventEmitter.prototype,
    _addTofilelist:function(fname,stat){
        var me = this;
        var oldInfo = me.files[fname];
        
        if(!oldInfo || oldInfo.mtime != stat.mtime){
            me. _isDisable && console.log("scan the file change on %s!",fname);
        }

        me.files[fname] = {
            fname : fname,
            size : stat.size,
            mtime : stat.mtime
        };
    },
    _checkStat:function(fname){
        
        var me = this;

        var fullName = joinPath(me.fullpath, fname);
        
        if(checkIgnore(fullName)){
            return;
        }
        
        me.checking ++;
        
        fs.stat(fullName,checkStat);
        
        function checkStat(err,stat){
            try{
                
                if(err){
                    me.emit('error',err);
                    return;
                }
                
                // 普通文件, 加入文件树
                if(stat.isFile()){
                    me._addTofilelist(fname,stat);
                    return;
                }
                
                // 如果是目录,则直接添加子目录
                if(stat.isDirectory()){
                    me._addSubDir(fname,fullName);
                    return;
                }
                
                // 其它情况可能是设备文件如socket或连接.. 暂时不支持处理
                return -1;
                
            }catch(e){
                me.emit('error',e);
            }finally{
                if( 0 === --me.checking){
                    me.watch();
                }
            }
        }
    },
    /**
     * 检查自己下面的内容
     */
    _checkContents:function(){
        var me = this;
        var fullpath = me.fullpath;
        
        fs.readdir(fullpath,checkContent);
        
        function checkContent(err,files){
            
            if(err){
                me.emit('error',err);
                return;
            }
            
            var flistLen = files.length;
            
            me.contentLength = flistLen;
            
            // 空目录
            if(flistLen === 0 ){
                me.watch();
                // empty directory;
                return;
            }
            
            files.forEach(function(fname){
                me._checkStat(fname);
            });
         };
    },
    _checkAddOrRemove:function(fname){
        var me = this;
        var fullname = joinPath(me.fullpath, fname);
        fs.exists(fullname, function (isExists) {
            debugger;
            me._isDisable && console.log("check the [%s] is %s", fullname, isExists);
            me.emit(isExists ? '_add' : "_remove", fname);
        });
    },
    /**
     * 开始监视
     */
    watch:function(){
        var me = this;
        
        if(me.watcher){
            return;
        }
        
        me._isDisable && console.log("start watch [%s]", me.fullpath);
        
        var watcher = me.watcher = fs.watch(me.fullpath);
        
        watcher.on('change',function(type,fname){
            var fullname =  joinPath(me.fullpath , fname);
            switch(type){
                case 'change':
                    me.emit('modify',fname, me.fullpath);
                    break;
                case 'rename':
                default:
                    // rename拆分成mkdir,rmdir,addfile或rmfile.
                    me._checkAddOrRemove(fname);
            }
        });
        
        watcher.on("error",function(err){
            me.emit('error',err);
        });
        
    },
    _addSubDir : function (dirname, fullpath) {
        var me = this;
        me._isDisable && console.log("add sub directory %s", fullpath);

        var subdir = me.subdirs[dirname] = new Observer(fullpath, me);

        // 子目录事件冒泡
        subdir.on('error', function (err) {
            me.emit('error', err);
        });

        subdir.on("modify", function (file, fullpath) {
            me.emit('modify', file, fullpath);
        });

        subdir.on("mkdir", function (file, fullpath) {
            me.emit('mkdir', file, fullpath);
        });
        
        subdir.on("rmdir", function (file, fullpath) {
            me.emit('rmdir', file, fullpath);
        });
        
        subdir.on("newfile", function (file, fullpath) {
            me.emit('newfile', file, fullpath);
        });

        subdir.on("rmfile", function (file, fullpath) {
            me.emit('rmfile', file, fullpath);
        });
    },
    /**
     * 停止监视行为并执行清理动作
     */
    destroy : function(){
        var me = this;
        
        me._isDisable && console.log('destroy [%s]', me.fullpath);
        
        me.watcher.close();
        me.watcher.removeAllListeners();
        me.removeAllListeners();
        me.files = null;
        var subdir = Object.keys(me.subdirs);
        subdir.forEach(function(dirname){
            me.subdirs[dirname].destroy();
        });
    },
    disableLog:function(isdisable){
        this._isDisable = isdisable;
    }
}
Observer.joinPath = joinPath;

module.exports = Observer;
