---
title: sqlite 存储一对多、多对多关系
description: 用 SQLite 表达一对多与多对多关系的外键设计与联表查询
keywords: [Node.js, AST, 编译, SQLite]
category: Node.js
tags: [Node.js, 编译与底层原理]
---







# sqlite 存储一对多、多对多关系

上节学了 sqlite，做工具的时候需要存储复杂的关系数据，就可以用它。

不过上节只是做了单表的增删改查，比较简单。

一般用到 sqlite 的场景都是多表的关联，比如一对多、多对多的关系。

一对多关系在生活中随处可见：

一个作者可以写多篇文章，而每篇文章只属于一个作者。


一个订单有多个商品，而商品只属于一个订单。


一个部门有多个员工，员工只属于一个部门。


多对多的关系也是随处可见：

一篇文章可以有多个标签，一个标签可以多篇文章都有。


一个学生可以选修多门课程，一门课程可以被多个学生选修。


一个用户可以有多个角色，一个角色可能多个用户都有。


这种就叫做复杂的关系。

当然，如果只是两个表之间的关系，你可能觉得不复杂，如果是有多个表、每个表之间都是一对多、多对多的关系呢？

这种错综复杂的关系，再用 json 存储显然就不合适了。

那在数据库里如何存储这种关系呢？

分别来看一下：

一对多的关系，比如一个部门有多个员工。

会有一个部门表和一个员工表：


在员工表添加外键 department\_id 来表明这种多对一关系：


其实和一对一关系的数据表设计是一样的。

在 DB Browser 添加这两个表。

点击 create database，把数据存在 sqlite-test 的 1-many.db 文件里：


填入表名 department 和两个列 id、name

指定 id 是 INTEGER 类型，约束为 primary key（主键）、not null（非空）、 auto increment（自动递增）。

name 是 TEXT 类型。

点击 ok，可以看到表已经创建好了：


同样的方式创建 employee 表：


添加 id、name、department\_id 这 3 列。

然后添加一个外键约束，department\_id 列引用 department 的 id 列。


点击 ok。


employee 表也创建成功了。

点击 write changes 把改动写入文件。

然后在代码里跑下插入数据的 sql：

创建 src/1-many-insert.mjs

```javascript
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

async function main() {
    const db = await open({
        filename: '1-many.db',
        driver: sqlite3.Database
    });

    const insert = await db.prepare('INSERT INTO department (id, name) VALUES (?, ?)');
    insert.run(1, '人事部');
    insert.run(2, '财务部'),
    insert.run(3, '市场部'),
    insert.run(4, '技术部'),
    insert.run(5, '销售部'),
    insert.run(6, '客服部'),
    insert.run(7, '采购部'),
    insert.run(8, '行政部'),
    insert.run(9, '品控部'),
    insert.run(10, '研发部');
    insert.finalize()

    const insert2 = await db.prepare('INSERT INTO employee(id, name, department_id) VALUES (?, ?, ?)');
    insert2.run(1, '张三', 1);
    insert2.run(2, '李四', 2);
    insert2.run(3, '王五', 3);
    insert2.run(4, '赵六', 4);
    insert2.run(5, '钱七', 5);
    insert2.run(6, '孙八', 5);
    insert2.run(7, '周九', 5);
    insert2.run(8, '吴十', 8);
    insert2.run(9, '郑十一', 9);
    insert2.run(10, '王十二', 10);
    insert2.finalize();
}

main();
```

分别往 department 和 employee 表插入了一些数据。

跑一下：

```bash
node ./src/1-many-insert.mjs
```

之后去 DB Browser 里看下：


两个表的数据都插入成功了。

那如果要查询 id 为 5 的部门的所有员工呢？

这种就涉及到关联查询了：

用 JOIN ON 来关联查询下：

```sql
select * from department
    join employee on department.id = employee.department_id
    where department.id = 5
```

可以看到，正确查找出了销售部的 3 个员工：


这就是一对多。

当然，从创建表到执行这些 sql 都是可以在代码里做的，可以在这里复制建表语句：


接下来来看多对多。

比如文章和标签：


之前一对多关系是通过在多的一方添加外键来引用一的一方的 id。


但是现在是多对多了，每一方都是多的一方。这时候是不是双方都要添加外键呢？

一般是这样设计：


文章一个表、标签一个表，这两个表都不保存外键，然后添加一个中间表来保存双方的外键。

这样文章和标签的关联关系就都被保存到了这个中间表里。

先创建文章表：


看下创建的表：


然后创建标签表：


之后加一个中间表：


这里同时指定这两列为 primary key，也就是复合主键。


添加 article\_id 和 tag\_id 的外键引用：

article\_id 引用 article 表的 id、tag\_id 引用 tag 表的 id。

点击 ok 创建表。


三个表都创建好了，可以插入数据了。

点击 write changes，把改动写入文件：


还是用代码来插入数据：

创建 src/many-many-insert.mjs

```javascript
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

async function main() {
    const db = await open({
        filename: '1-many.db',
        driver: sqlite3.Database
    });

    const insert = await db.prepare('INSERT INTO article (id, title, content) VALUES (?, ?, ?)');
    insert.run(1, '文章1', '这是文章1的内容。');
    insert.run(2, '文章2', '这是文章2的内容。');
    insert.run(3, '文章3', '这是文章3的内容。');
    insert.run(4, '文章4', '这是文章4的内容。');
    insert.run(5, '文章5', '这是文章5的内容。');
    insert.finalize();

    const insert2 = await db.prepare('INSERT INTO tag (id, name) VALUES (?, ?)');
    insert2.run(1, '标签一');
    insert2.run(2, '标签二'),
    insert2.run(3, '标签三'),
    insert2.run(4, '标签四'),
    insert2.run(5, '标签五'),
    insert2.finalize()

    const insert3 = await db.prepare('INSERT INTO article_tag(article_id, tag_id) VALUES (?, ?)');
    [
        [1,1], [1,2], [1,3],
        [2,2], [2,3], [2,4],
        [3,3], [3,4], [3,5],
        [4,4], [4,5], [4,1],
        [5,5], [5,1], [5,2]
    ].forEach(item => {
        insert3.run(item[0], item[1]);
    })
    insert3.finalize();
}

main();
```

跑一下：

```bash
node ./src/many-many-insert.mjs
```

在 DB Browser 里看下：


都插入成功了。

那现在有了 article、tag、article\_tag 3 个表了，怎么关联查询呢？

JOIN 3 个表呀！

```sql
SELECT * FROM article a
    JOIN article_tag at ON a.id = at.article_id
    JOIN tag t ON t.id = at.tag_id
    WHERE a.id = 1
```

这样查询出的就是 id 为 1 的 article 的所有标签。

创建 src/many-many-query.mjs

```javascript
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

async function main() {
    const db = await open({
        filename: '1-many.db',
        driver: sqlite3.Database
    });

    const allData = await db.all(`
    SELECT * FROM article a
    JOIN article_tag at ON a.id = at.article_id
    JOIN tag t ON t.id = at.tag_id
    WHERE a.id = 1
    `);
    console.log(allData);

}

main();
```

跑一下：

```bash
node ./src/many-many-query.mjs
```


这样，一对多、多对多这种复杂关系的保存、新增、查询就完成了。

修改、删除和上节的单表 CRUD 一样，就不测试了。

> 代码上传了[文档仓库](https://github.com/QuarkGluonPlasma/nodejs-course-code/tree/main/sqlite-test)

## 总结

这节学了用 sqlite 存储复杂关系，也就是一对多、多对多关系。

创建了部门、员工表，并在员工表添加了引用部门 id 的外键 department\_id 来保存这种一对多关系。

创建了文章表、标签表、文章标签表来保存多对多关系，多对多不需要在双方保存彼此的外键，只要在中间表里维护这种关系即可。

关联多个表的查询需要用 join on，多对多的 join 需要连接 3 个表来查询。

当你用 sqlite 存储复杂的关系数据的时候，就可以用 sql 来做 CRUD 了。

等之后 node:sqlite 这个内置模块稳定了，就可以不用三方包来写了，但用法一样。