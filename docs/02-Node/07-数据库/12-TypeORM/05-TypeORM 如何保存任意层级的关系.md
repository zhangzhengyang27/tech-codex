---
title: TypeORM 如何保存任意层级的关系？
description: 用 TypeORM 的 Tree Entity（@Tree/@TreeParent/@TreeChildren，closure-table 或 materialized-path）存储与查询任意层级数据
keywords: [TypeORM, 如何保存任意层级的关系]
category: Node.js
tags: [Node.js, Express, Koa, 服务端]
---


# TypeORM 如何保存任意层级的关系？

经常会见到一些多级分类的场景。

比如京东的商品分类。

新闻网站的新闻分类。

这种多层级的数据怎么存储呢？

有同学会说，很简单啊，这不就是一对多么，二级分类就用两个表，三级分类就用三个表。

这样是可以，但是都是分类，表结构是一样的，分到多个表里是不是有点冗余。

更重要的是，如果层级关系经常调整呢？

比如有的时候会变成二级分类，有的时候会更多级分类呢？

这时候用普通的多表之间的一对多就不行了。

一般这种多级分类的业务，都会在一个表里存储，然后通过 parentId 进行子关联来实现。

在 TypeORM 里也对这种场景做了支持。

新建个项目：

```
nest new typeorm-tree-entity-test
```
进入项目目录，创建一个 CRUD 模块：

```
nest g resource city --no-spec
```
然后安装 TypeORM 的包：
```bash
npm install --save @nestjs/typeorm typeorm mysql2
```
在 app.module.ts 引入下 TypeOrmModule：

```javascript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CityModule } from './city/city.module';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    CityModule,
    TypeOrmModule.forRoot({
      type: "mysql",
      host: "localhost",
      port: 3306,
      username: "root",
      password: "guang",
      database: "tree_test",
      synchronize: true,
      logging: true,
      entities: [City],
      poolSize: 10,
      connectorPackage: 'mysql2',
      extra: {
          authPlugin: 'caching_sha2_password',
      }
    })
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```
在 mysql workbench 里创建这个 database。

指定字符集为 utf8mb4，点击 apply。

然后改下 city.entity.ts

```javascript
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Tree, TreeChildren, TreeParent, UpdateDateColumn } from "typeorm";

@Entity()
@Tree('closure-table')
export class City {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ default: 0 })
    status: number;

    @CreateDateColumn()
    createDate: Date;

    @UpdateDateColumn()
    updateDate: Date;

    @Column()
    name: string;

    @TreeChildren()
    children: City[];

    @TreeParent()
    parent: City;
}
```
把服务跑起来：

```
npm run start:dev
```
可以看到，自动创建了 2 个表。

在 mysql workbench 里看下。

可以看到 parentId 引用了自身的 id。

并且还有个 city_closure 表。

两个外键都引用了 city 表的 id。

先不着急解释为什么是这样的，插入一些数据试试。

在 CityService 的 findAll 方法里插入数据，然后再查出来。

```javascript
@InjectEntityManager()
entityManager: EntityManager;

async findAll() {
    const city = new City();
    city.name = '华北';
    await this.entityManager.save(city);

    const cityChild = new City()
    cityChild.name = '山东'
    const parent = await this.entityManager.findOne(City, {
      where: {
        name: '华北'
      }
    });
    if(parent){
      cityChild.parent = parent
    }
    await this.entityManager.save(City, cityChild)

    return this.entityManager.getTreeRepository(City).findTrees();
}
```
这里创建了两个 city 的 entity，第二个的 parent 指定为第一个。

用 save 保存。

然后再 getTreeRepository 调用 findTrees 把数据查出来。

浏览器访问下。

可以看到数据插入成功了，并且返回了树形结构的结果。

在 mysql workbench 里看下。

在 city 表里保存着 city 记录之间的父子关系，通过 parentId 关联。

在 city_closure 表里也记录了父子关系。

把插入数据的代码注释掉。


重新插入数据：

```javascript
async findAll() {
    const city = new City();
    city.name = '华南';
    await this.entityManager.save(city);

    const cityChild1 = new City()
    cityChild1.name = '云南'
    const parent = await this.entityManager.findOne(City, {
      where: {
        name: '华南'
      }
    });
    if(parent){
      cityChild1.parent = parent
    }
    await this.entityManager.save(City, cityChild1)

    const cityChild2 = new City()
    cityChild2.name = '昆明'

    const parent2 = await this.entityManager.findOne(City, {
      where: {
        name: '云南'
      }
    });
    if(parent2){
      cityChild2.parent = parent2
    }
    await this.entityManager.save(City, cityChild2)

return this.entityManager.getTreeRepository(City).findTrees();
}
```

跑一下。

可以看到，二层和三层的关系都可以正常的存储和查询。

把插入数据的代码注释掉，测试下其他方法。

findRoots 查询的是所有根节点：

```javascript
async findAll() {
    return this.entityManager.getTreeRepository(City).findRoots()
}
```
```javascript
async findAll() {
    const parent = await this.entityManager.findOne(City, {
      where: {
        name: '云南'
      }
    });
    return this.entityManager.getTreeRepository(City).findDescendantsTree(parent)
}
```

findDescendantsTree 是查询某个节点的所有后代节点。

```javascript
async findAll() {
    const parent = await this.entityManager.findOne(City, {
      where: {
        name: '云南'
      }
    });
    return this.entityManager.getTreeRepository(City).findAncestorsTree(parent)
}
```

findAncestorsTree 是查询某个节点的所有祖先节点。

这里换成 findAncestors、findDescendants 就是用扁平结构返回。
把 findTrees 换成 find 也是会返回扁平的结构。

还可以调用 countAncestors 和 countDescendants 来计数：

```javascript
async findAll() {
    const parent = await this.entityManager.findOne(City, {
      where: {
        name: '云南'
      }
    });
    return this.entityManager.getTreeRepository(City).countAncestors(parent)
}
```
这些 api 都是很实用的。

回过头来，再看下 @Tree 的 entity。

通过 @TreeChildren 声明的属性里存储着它的 children 节点，通过 @TreeParent 声明的属性里存储着它的 parent 节点。

并且这个 entity 要用 @Tree 声明。

参数可以指定 4 种存储模式。

一般都是用 closure-table，或者 materialized-path。

其余两种有点问题。

把两个表删掉。

改成 materialized-path 重新跑。

可以看到，现在只生成了一个表。

只是这个表多了一个 mpath 字段。

添加点数据：

```javascript
async findAll() {
    const city = new City();
    city.name = '华北';
    await this.entityManager.save(city);

    const cityChild = new City()
    cityChild.name = '山东'
    const parent = await this.entityManager.findOne(City, {
      where: {
        name: '华北'
      }
    });
    if(parent){
      cityChild.parent = parent
    }
    await this.entityManager.save(City, cityChild)

    return this.entityManager.getTreeRepository(City).findTrees();
}
```
可以看到，它通过 mpath 路径存储了当前节点的访问路径，从而实现了父子关系的记录。

其实这些存储细节不用关心，不管是 closure-table 用两个表存储也好，或者 materialized-path 用一个表多加一个 mpath 字段存储也好，都能完成同样的功能。

## 总结

这节基于 TypeORM 实现了任意层级的关系的存储。

在 entity 上使用 @Tree 标识，然后通过 @TreeParent 和 @TreeChildren 标识存储父子节点的属性。

之后可以用 getTreeRepository 的 find、findTrees、findRoots、findAncestorsTree、findAncestors、findDescendantsTree、findDescendants、countDescendants、countAncestors 等 api 来实现各种关系的查询。

存储方式可以指定 closure-table 或者 materialized-path，这两种方式一个用单表存储，一个用两个表，但实现的效果是一样的。

以后遇到任意层级的数据的存储，就是用 Tree Entity 吧。
