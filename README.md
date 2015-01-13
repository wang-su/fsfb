

# FSFB - (File System FeedBack)



使用nodejs开发的一个小工具, ***用于监测文件系统变化并执行一个指定的命令行命令***


> 在最初的开发过程中,本来的目的是想实现一个自动实时的文件同步工具. 将一些目录内容实时同步到远端的服务器和开发机上. 但考虑使用scp和rsync的条件下, 唯一需要的就是监测文件变化. 并产生一个通知. 于是便在设计上进行了终级简化. 最终变为现在这个小的命令行工具. 用于配合rsync,scp等标准命令行工具使用.

## Change log

* Version 0.0.1 ~ 0.0.6

  fix bug

* Version 0.0.7 
    
   添加 --target 参数用于明确指定需要监视的目录名.
   
   添加 --busy-ignore 参数用于解决一些文件变动间隔时间过短而处理时间较长而造成的处理堆叠问题.
   
   
----------


## Install
	
	npm install fsfb -g

## Usage

1. fsfb help - 显示帮助信息
	
	
2. fsfb "dirname" | --target="dirname" [ --exec="commend Tpl" | --exec-tpl-file="file path" [ --charset=utf-8 ]] [ --enable-log ] [ --version | version ] [ --help | help ]

		Params :

		dirname - 将进行监视的目录名,当第一个参数未指定参数名时, 认为是target,如果后面指定了--target将会被覆盖.
		
		--target - 将进行监视的目录名. (>= v_0.0.7)
		
		--busy-ignore - 当一次执行未完成时,忽略后续的执行请求. (>= v_0.0.7)
		
		--enable-log  显示一些调式信息.大部份情况下没用.
		
		--exec 指定命令行模版, 当文件系统产生变化时, 将替换变量值后产生的一个完整的命令行指令并直接执行.
		
		--exec-tpl-file 从文件读取命令行模版, *考虑性能问题, 在启动监视后,不再读取tpl-file文件变化.
		
		--charset 指定tpl-file的文件编码,默认为utf-8
		
		--version 显示版本信息


> ***Tips : 关于--busy-ignore , 在处理一些耗时操作时, 添加这个参数将后续请求忽略有可能是必要的. 但是也可能造成一些必要的操作被忽略,所以使用时应当小心评估使用场景. 在未来会添加执行周期限制用于解决这个问题***


### 支持的替换标记 : {xxx}

 
	{type} - change type of the file system, 
		possible value: "modify", "newfile", "rmfile", "mkdir", "rmdir" 
	
	{fname} - filename,
	
	{dirname} - relative path,
	
	{fulldir} - full path(AP),
	
	{fullname} - full path and file name.


## Demo

### Basic demo

	> fsfb ./target --exec="echo {type} : {dirname} {fname}, {fulldir}, {fullname}"
	

	 Welecom to use the fs_feedback. 
	 ------------------------------- 

	modify : ./target b.js, /Users/baidu/git/fsfb/target, /Users/baidu/git/fsfb/target/b.js
	mkdir : ./target qqq, /Users/baidu/git/fsfb/target, /Users/baidu/git/fsfb/target/qqq
	newfile : ./target/qqq asdf.js, /Users/baidu/git/fsfb/target/qqq, /Users/baidu/git/fsfb/target/qqq/asdf.js
	newfile : ./target/qqq asdf.js, /Users/baidu/git/fsfb/target/qqq, /Users/baidu/git/fsfb/target/qqq/asdf.js
	rmfile : ./target/qqq asdf.js, /Users/baidu/git/fsfb/target/qqq, /Users/baidu/git/fsfb/target/qqq/asdf.js

### Working with rsync

First all , configure your rsync server. you can google that 'how to configure rsync server'

And the second step , write a sample script to sync your documents to remote server with rsync commend , just like this : 	

	#!/bin/sh

	# format log
	logTpl="+[%H.%M.%S.%s] sync data to $hostname"
	
	hostname='you server address'
	rsyncUserName='youname'
	rsyncPort=portnumber
	
	# run the rsync. 
	rsync -vrtz --delete --progress --password-file=you_rsync_pwd_file workingdir rsync://$rsyncUserName@$hostname:$rsyncPort/remotedir/
	
	#log time
	date "$logTpl"
	
The last thing, run the scrip by fsfb. 
	
	>fsfb . --exec=upwww.sh
	
	Welecom to use the fs_feedback. 
	------------------------------- 


	sending incremental file list
	dev_depends/TestData.php
          9,297 100%    8.20MB/s    0:00:00 (xfr#1, to-chk=42/99)

	sent 2,353 bytes  received 238 bytes  1,727.33 bytes/sec
	total size is 5,512,520  speedup is 2,127.56
	[11.37.21.1419219441] sync data to remote.server.me
	
	......
	

----------------

