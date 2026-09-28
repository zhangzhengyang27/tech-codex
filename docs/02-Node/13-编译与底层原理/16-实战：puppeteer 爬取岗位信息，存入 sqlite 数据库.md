---
title: 实战：puppeteer 爬取岗位信息，存入 sqlite 数据库
description: 用 Puppeteer 无头浏览器爬取招聘数据并持久化到 SQLite 的完整链路
keywords: [Node.js, AST, 编译, Puppeteer]
category: Node.js
tags: [Node.js, 编译与底层原理]
---







# 实战：puppeteer 爬取岗位信息，存入 sqlite 数据库

在找工作的时候，都会用 boss 直聘、拉钩之类的 APP 投简历。

根据职位描述筛选出适合自己的来投。

此外，职位描述也是简历优化的方向，甚至是平时学习的方向。


所以我觉得招聘网站的职位描述还是挺有价值的，就想把它们都爬取下来存到数据库里。

本文一起来实现下。

爬取数据使用 Puppeteer 来做，然后把爬到的数据存到 sqlite 表里。

创建个项目：

```bash
mkdir jd-spider
cd jd-spider
npm init -y
```

进入项目，安装 puppeteer：

```bash
npm install --save puppeteer
```

要爬取的是 boss 直聘的网站数据。

首先，进入[搜索页面](https://www.zhipin.com/web/geek/job?query=%E5%89%8D%E7%AB%AF&city=100010000)，选择全国范围，搜索前端：


然后职位列表的每个点进去查看描述，把这个岗位的信息和描述抓取下来：


创建 test.js

```javascript
import puppeteer from "puppeteer"

const browser = await puppeteer.launch({
  headless: false,
  defaultViewport: {
    width: 0,
    height: 0
  }
})

const page = await browser.newPage()

await page.goto("https://www.zhipin.com/web/geek/job")

await page.waitForSelector(".job-list-box")

await page.click(".city-label", {
  delay: 500
})

await page.click(".city-list-hot li:first-child", {
  delay: 500
})

await page.focus(".search-input-box input")

await page.keyboard.type("前端", {
  delay: 200
})

await page.click(".search-btn", {
  delay: 1000
})
```

调用 launch 跑一个浏览器实例，指定 headless 为 false 也就是有界面。

defaultViewport 设置 width、height 为 0 是网页内容充满整个窗口。

然后就是自动化的流程了：

首先进入职位搜索页面，等 job-list-box 这个元素出现之后，也就是列表加载完成了。

就点击城市选择按钮，选择全国。

然后在输入框输入前端，点击搜索。

然后跑一下。

跑之前在 package.json 设置 type 为 module，也就是支持 es module 的 import：


```bash
node ./test.js
```

它会自动打开一个浏览器窗口：


然后会执行自动化脚本：


这样，下面的列表数据就是可以抓取的了。

不过这里其实没必要这么麻烦，因为只要你 url 里带了 city 和 query 的参数，会自动设置为搜索参数：


所以直接打开这个 url 就可以：

```javascript
import puppeteer from "puppeteer"

const browser = await puppeteer.launch({
  headless: false,
  defaultViewport: {
    width: 0,
    height: 0
  }
})

const page = await browser.newPage()

await page.goto("https://www.zhipin.com/web/geek/job?query=前端&city=100010000")

await page.waitForSelector(".job-list-box")
```

然后要拿到页数，用来访问列表的每页数据。

怎么拿到页数呢？

其实就是拿 options-pages 的倒数第二个 a 标签的内容：


```javascript
import puppeteer from "puppeteer"

const browser = await puppeteer.launch({
  headless: false,
  defaultViewport: {
    width: 0,
    height: 0
  }
})

const page = await browser.newPage()

await page.goto("https://www.zhipin.com/web/geek/job?query=前端&city=100010000")

await page.waitForSelector(".job-list-box")

const res = await page.$eval(".options-pages a:nth-last-child(2)", (el) => {
  return parseInt(el.textContent)
})

console.log(res)
```

$eval 第一个参数是选择器，第二个参数是对选择出的元素做一些处理后返回。

跑一下：


页数没问题。

然后接下来就是访问每页的列表数据了。

就是在 url 后再带一个 page 的参数：


然后，遍历访问每页数据，拿到每个职位的信息：

```javascript
import puppeteer from "puppeteer"

const browser = await puppeteer.launch({
  headless: false,
  defaultViewport: {
    width: 0,
    height: 0
  }
})

const page = await browser.newPage()

await page.goto("https://www.zhipin.com/web/geek/job?query=前端&city=100010000")

await page.waitForSelector(".job-list-box")

const totalPage = await page.$eval(".options-pages a:nth-last-child(2)", (e) => {
  return parseInt(e.textContent)
})

const allJobs = []
for (let i = 1; i <= totalPage; i++) {
  await page.goto(
    "https://www.zhipin.com/web/geek/job?query=前端&city=100010000&page=" + i
  )

  await page.waitForSelector(".job-list-box")

  const jobs = await page.$eval(".job-list-box", (el) => {
    return [...el.querySelectorAll(".job-card-wrapper")].map((item) => {
      return {
        job: {
          name: item.querySelector(".job-name").textContent,
          area: item.querySelector(".job-area").textContent,
          salary: item.querySelector(".salary").textContent
        },
        link: item.querySelector("a").href,
        company: {
          name: item.querySelector(".company-name").textContent
        }
      }
    })
  })
  allJobs.push(...jobs)
}

console.log(allJobs)
```


具体的信息都是从 dom 去拿的：


跑一下试试：


可以看到，它会依次打开每一页，然后把职位数据爬取下来。

做到这一步还不够，要点进去这个链接，拿到 jd 的描述。

```javascript
for (let i = 0; i < allJobs.length; i++) {
  await page.goto(allJobs[i].link)

  try {
    await page.waitForSelector(".job-sec-text")

    const jd = await page.$eval(".job-sec-text", (el) => {
      return el.textContent
    })
    allJobs[i].desc = jd

    console.log(allJobs[i])
  } catch (e) {}
}
```

try catch 是因为有的页面可能打开会超时导致中止，这种就直接跳过好了。

跑一下：


它同样会自动打开每个岗位详情页，拿到职位描述的内容，并打印在控制台。


接下来只要把这些存入数据库就好了。

安装 sqlite：

```css
npm install sqlite sqlite3 --save
```

在 DB Browser 创建个数据库文件：

点击 New Database，在目标位置创建 data.db 文件：


然后填入表结构：


把这个 sql 复制出来：


点击 cancel，用代码创建表：

```sql
CREATE TABLE "job" (
	"id"	INTEGER,
	"name"	TEXT,
	"area"	TEXT,
	"salary"	TEXT,
	"link"	TEXT,
	"company"	TEXT,
	"desc"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT)
);
```

创建 create-table.js

```javascript
import sqlite3 from "sqlite3"
import { open } from "sqlite"

async function main() {
  const db = await open({
    filename: "data.db",
    driver: sqlite3.Database
  })

  await db.exec(`
    CREATE TABLE "job" (
        "id"	INTEGER,
        "name"	TEXT,
        "area"	TEXT,
        "salary"	TEXT,
        "link"	TEXT,
        "company"	TEXT,
        "desc"	TEXT,
        PRIMARY KEY("id" AUTOINCREMENT)
    );
    `)
}

main()
```

跑一下:

```bash
node ./create-table.js
```

在 DB Browser 点击 open database，就可以看到这个 job 表：


然后把数据存到数据库里：


```javascript
import sqlite3 from "sqlite3"
import { open } from "sqlite"
```

```javascript
const db = await open({
  filename: "data.db",
  driver: sqlite3.Database
})

const insert = await db.prepare(
  "INSERT INTO job (name, area, salary,link,company,desc) VALUES (?, ?, ?,?,?,?)"
)

for (let i = 0; i < allJobs.length; i++) {
  await page.goto(allJobs[i].link)

  try {
    await page.waitForSelector(".job-sec-text")

    const jd = await page.$eval(".job-sec-text", (el) => {
      return el.textContent
    })
    allJobs[i].desc = jd

    console.log(allJobs[i])
    insert.run(
      allJobs[i].job.name,
      allJobs[i].job.area,
      allJobs[i].job.salary,
      allJobs[i].link,
      allJobs[i].company.name,
      allJobs[i].desc
    )
  } catch (e) {}
}
```

再跑下：

```bash
node ./test.js
```


去数据库里看下：


这样，你就可以对这些职位描述做一些搜索，分析之类的了。

比如搜索职位描述中包含 react 的岗位：

```sql
SELECT * FROM `boss-spider`.job where `desc` like "%React%";
```


这样，爬虫就做完了。

不过这个过程中 boss 可能会检测到你访问频率过高，会让你做下是不是真人的验证：


这个就是验证码点点就好了。

> 代码上传了[文档仓库](https://github.com/QuarkGluonPlasma/nodejs-course-code/tree/main/jd-spider)

## 总结

通过 puppeteer 实现了对 BOSS 直聘网站的前端职位的爬取，并用 sqlite 把数据保存到了数据库里。

当你想做爬虫或者自动化工具的时候，都可以用 puppeteer 来做。

结合 sqlite 来存储结构化的数据。

可以结合起来做一些工具。
