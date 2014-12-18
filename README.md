

# FSFB - (File System Feed Fack)


使用nodejs开发的一个小工具, 用于监测文件系统变化并执行一个命令行命令

> 在最初的开发过程中,本来的目的是想实现一个自动实时的文件同步工具. 将一些目录内容实时同步到远端的服务器和开发机上. 但考虑使用scp和rsync的条件下, 唯一需要的就是监测文件变化. 并产生一个通知. 于是便在设计上进行了终级简化. 最终变为现在这个小的命令行工具. 用于配合rsync,scp等标准命令行工具使用.


## Usage

1. fsfb help - 显示帮助信息
	
	
2. fsfb dirname commandTemplate [ --enable-log ]

		Params :

		dirname - 将进行监视的目录名

		commandTemplate - 包含替换标记的命令行模版, 当文件系统产生变化时, 将替换变量值后产生的一个完整的命令行指令并直接执行.

		--enable-log  显示一些调式信息.大部份情况下没用.

### 支持的替换标记 : {xxx}

 
	{type} - change type of the file system, 
		possible value: "modify", "newfile", "rmfile", "mkdir", "rmdir" 
	
	{fname} - filename,
	
	{dirname} - relative path,
	
	{fulldir} - full path(AP),
	
	{fullname} - full path and file name.


## Demo


	> fsfb ./target "echo {type} : {dirname} {fname}, {fulldir}, {fullname}"
	

	 Welecom to use the fs_feedback. 
	 ------------------------------- 

	modify : ./target b.js, /Users/baidu/git/fsfb/target, /Users/baidu/git/fsfb/target/b.js
	mkdir : ./target qqq, /Users/baidu/git/fsfb/target, /Users/baidu/git/fsfb/target/qqq
	newfile : ./target/qqq asdf.js, /Users/baidu/git/fsfb/target/qqq, /Users/baidu/git/fsfb/target/qqq/asdf.js
	newfile : ./target/qqq asdf.js, /Users/baidu/git/fsfb/target/qqq, /Users/baidu/git/fsfb/target/qqq/asdf.js
	rmfile : ./target/qqq asdf.js, /Users/baidu/git/fsfb/target/qqq, /Users/baidu/git/fsfb/target/qqq/asdf.js


