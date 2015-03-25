/**
 * 用于开发命令行工具的辅助工具. 仅应在启动时执行一次, 所以代码内使用同步操作.
 * 
 * @author wangsu
 */
var fs = require('fs');
var path = require('path');

var pwd = process.cwd();
var args = process.argv;

var isFullName = /^-{2}(.*)$/;
var isQuickName = /^-{1}(\w)$/;
var splitFullName = /^(\w+)=(.+)$/;

var configMap = null;

var loadedConfigFiles = {};

var readShellArgs = function (args,defOpts) {
    
    var map = {
        err : null,
        unregularize : [],
        options : {},
        contents : null,
    };
    
    var config = map.options;
    var confPath = null;
    var index = 0, len = args.length;
    var item = null;
    var param = null, key, value, tmp;

    while (index < len) {
        
        item = args[index];

        if (param = isFullName.exec(item)) {
            value = splitFullName.exec(param[1]);
            if (value === null) {
                config[param[1]] = true;
            } else if (value.length && value[2].length > 0) {
                config[value[1]] = value[2];
            } else {
                map.unregularize.push(item);
            }
        } else if (param = isQuickName.exec(item)) {
            var tmp = args[index+1];
            /**
             * 后续一项不以-号开头, 则认为是quit args的值. 否则认为是boolean值true.
             */ 
            if(tmp && tmp.indexOf('-') == 0){
                config[param[1]] = true;
            }else{
                config[param[1]] = tmp;
                index ++;
            }
            
        } else if (item.indexOf('-') == 0) {
            map.unregularize.push(item);
        } else {
            var next = index;
            
            if(map.contents == null){
                map.contents = item;
                next += 1;
            }
            
            // if the content not first param and have more params, all wrong.
            if(index > 0){
                map.unregularize = map.unregularize.concat(args.slice(next));
                break;
            }
        }
        
        index++;
    }
    
    return map;
};

var readConfigFile = function (fpath) {
    
    var content = {};
    
    fpath = path.resolve(fpath);
    
    if(!fs.existsSync(fpath)){
        return content;
    }
    
    if(loadedConfigFiles[fpath]){
        // 处理过的文件不再处理, 防止出现引用循环
        return;
    }
    
    loadedConfigFiles[fpath] = true;
    
    try {
        var contentOrigin = fs.readFileSync(fpath, {
            flag : 'r',
            encoding : 'utf-8'
        });
        var argsOrigin = contentOrigin.split(/\n/);
        
        // 格式化为全名参数, 直接在每行前面加 -- 并过滤掉等号前后的空白字符.
        var args = [];
        
        argsOrigin.forEach(function(line){
            line = line.trim();
            
            if(line.indexOf('#') === 0 || line.indexOf('//') === 0){
                // 忽略行注释.
                return;
            }
            
            //忽略等号左右的空格.
            line = line.replace(/\s*=\s*/,'=');
            
            // 检查是否为合法格式.
            if(splitFullName.test(line)){
                args.push('--' + line);
            }
        });
        
        content = readShellArgs(args);
        
    } catch (e) {
        content.err = e;
    }

    return content;
}

var Helper = module.exports = {
    init : function (opts, cb) {
        
        // only once;
        if (configMap !== null) {
            return;
        }

        cb = cb || opts;
        opts = (cb === opts || !!opts) ? {} : opts;
        
        var configs = [];
        
        if(opts.loadFiles){
            var configFiles = Array.isArray(opts.loadFiles) ? opts.loadFiles : [opts.loadFiles];
            configFiles.forEach(function(fpath){
                var config = readConfigFile(fpath);
                // push in 
                config && configs.push(config);
            });
        }
        
        // 大于2的情况下, 表示有命令行参数传入. 否则在当前目录下查找配置文件
        if (args.length > 2) {
            cmdArgv = readShellArgs(args.slice(2));
            
            configs.push(cmdArgv);
            
            // 加载命令行指定的配置
            if(fpath = cmdArgv.options['config']){
                config = readConfigFile(fpath);
                // 如果有, 应该是最后载入的, 优先级应当最高. 
                config && configs.push(config);
            }
        }
        
        configMap = {
            err : null,
            unregularize : [],
            options : {},
            contents : null,
        };
        
        if(configs.length > 0){
            configs.forEach(function(conf){
                if(conf.err){
                    configMap.err.push(err);
                    return;
                }
                
                if(conf.unregularize.length > 0){
                    configMap.unregularize =   configMap.unregularize.concat(conf.unregularize);
                }
                
                for(var key in conf.options){
                    configMap.options[key] = conf.options[key];
                }
                
                if(conf.contents){
                    // 唯一来源应该是命令行参数;
                    configMap.contents =  conf.contents;
                }
                
            });
        }
        
        this.__proto__ = configMap;
        
        cb && cb(this);
    },
    getMap : function () {
        return configMap;
    },
    toString : function () {
        return JSON.stringify(configMap);
    }
};
