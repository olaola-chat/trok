轻量的nodejs, bun, deno 项目打包工具

# Get Started:
新建一个目录如my-project，在目录下clone你要打包的项目所在的仓库, 然后在my-project目录下执行以下命令，以启动打包服务
```bash
npx deno serve -A jsr:@trok/trok/workspace
```
服务启动后, 在浏览器打开服务地址即可进行打包操作。


# 在服务器上运行打包服务
在服务器按上一步启动服务后，在nginx中配置反向代理，nginx参考配置如下：

```javascript
map $http_upgrade $connection_upgrade {
    	default upgrade;
        ''      close;
}

server {

	# ... ...

	location ^~ /trok/ {
		proxy_pass http://localhost:8000/;
 		proxy_http_version 1.1;
        	proxy_set_header Host $host;
   		proxy_set_header Upgrade $http_upgrade;
        	proxy_set_header Connection $connection_upgrade;
	}

	# ... ...

}
```

# github钩子触发打包:
在github仓库的settings->webhooks->add webhook，在payload URL中填写服务地址，在content type中选择application/json，在events中选择push，然后点击add webhook。webhook地址填写打包服务的/github路由，点击保存即可

# 部署
trok只执行打包任务，你需要自行编写部署脚本，将打包后的文件部署到目标位置

TODO: 
- Basic身份验证
- 内置企业微信, 飞书，钉钉通知